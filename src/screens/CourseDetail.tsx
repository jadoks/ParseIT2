import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { Image as ExpoImage } from 'expo-image'; // class banner photo — same caching/fade-in as CourseCard; RN's Image below is left untouched for everything else in this file
// Same cache-first signed URL lookup CourseCard uses for its banner — skips
// the network call on a cache hit, and lets a stable cached URL survive the
// silentRefresh poll below instead of being replaced by a freshly-signed
// (but functionally identical) URL every cycle, which was what caused the
// banner to visibly reload every few seconds.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from "react-native-responsive-screen";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getCachedBannerUrl, setCachedBannerUrl } from '../components/Bannerurlcache'; // adjust path if your folder layout differs
import {
  AssignmentComment,
  AssignmentCourse,
  AssignmentFileUpload,
  AssignmentItem,
} from "./Assignments";

// ✅ Reuses the same Toast component used across the app (SignIn, Community,
// Dashboard, ClassesScreen) instead of native Alert.alert, so feedback here
// looks and behaves consistently everywhere.
import Toast from '../Final_Admin_Components/Toast'; // adjust path if your folder layout differs
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';

type ToastType = 'success' | 'error' | 'info';

// Same school-wide letterhead fallbacks used in the teacher's Lesson Preview
// / Grades' Official Grade Report, shown until an admin/teacher uploads a
// custom header/footer via "Manage Template".
const DefaultTemplateHeader = require('../../assets/images/myjourney-header-template-1.png');
const DefaultTemplateFooter = require('../../assets/images/footer.png');

let WebView: any = null;
try {
  WebView = require("react-native-webview").WebView;
} catch (_) {}

type CurrentStudent = {
  studentId: string;
  authUid?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function getApiBaseUrl() {
  // Prefer the deployed backend URL on every platform — including native /
  // Expo Go — since EXPO_PUBLIC_ vars are inlined for native builds too, not
  // just web. Only fall back to guessing a local dev server's LAN IP when
  // no URL has been configured (e.g. testing against a backend running on
  // your own machine during local dev).
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    console.warn('EXPO_PUBLIC_API_URL is not set; API calls will fail.');
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';

  const host = possibleHost.split(':')[0];

  if (host) {
    return `http://${host}:5000`;
  }

  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, { credentials: "include", ...options });

// Mirrors parseDueDateTime in TeacherCourseDetail2.tsx / Assignments.tsx so
// "past due" reads exactly the same way everywhere: accepts a
// "YYYY-MM-DDTHH:MM" (or space-separated) datetime string, or falls back to
// end-of-day (23:59) for a date-only "YYYY-MM-DD" string.
const parseDueDateTime = (value?: string) => {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      23,
      59
    );
  }
  return null;
};

// Null due date (or one that fails to parse) is treated as "no deadline" —
// same permissive fallback the create/edit form uses — rather than
// silently blocking play with an unparsable date.
const isPastDueDate = (dueDate?: string) => {
  const parsed = parseDueDateTime(dueDate);
  if (!parsed) return false;
  return parsed.getTime() < Date.now();
};

// Display-only: renders the fetched dueDate ("YYYY-MM-DD HH:MM" 24-hour, as
// stored/sent by the teacher side) as "YYYY-MM-DD hh:mm AM/PM" for students —
// matches the 12-hour format shown in the Teacher's due date/time picker.
// Falls back to the raw string if it can't be parsed, so nothing breaks on
// an unexpected format.
const formatDueDateForDisplay = (dueDate?: string) => {
  if (!dueDate?.trim()) return "";
  const parsed = parseDueDateTime(dueDate);
  if (!parsed) return dueDate;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const datePart = `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  const hour24 = parsed.getHours();
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const timePart = `${pad2(hour12)}:${pad2(parsed.getMinutes())} ${meridiem}`;
  return `${datePart} ${timePart}`;
};

// ✅ NEW: Mirrors Assignments.tsx — "Disable repository after due"
// (repositoryDisabledAfterDue) closes submissions entirely once the due
// date passes. Being past due alone still allows a late submission; this
// additionally requires the teacher to have enabled the setting.
const isSubmissionLocked = (
  assignment?: { dueDate?: string; repositoryDisabledAfterDue?: boolean } | null
) => {
  if (!assignment?.repositoryDisabledAfterDue) return false;
  return isPastDueDate(assignment.dueDate);
};

// ✅ NEW: "missing" is a purely client-side, derived display status — it is
// never written back to the backend/AssignmentItem["status"] field. An
// assignment that is still "pending" (i.e. the student never played the
// game or submitted work — playing/submitting flips the real status to
// "submitted" or "graded" server-side) and whose due date has passed reads
// as "missing" instead of "pending" everywhere it's shown.
type DisplayStatus = "pending" | "submitted" | "graded" | "late" | "missing";

const getDisplayStatus = (assignment: {
  status: "pending" | "submitted" | "graded" | "late";
  dueDate: string;
}): DisplayStatus => {
  if (assignment.status === "pending" && isPastDueDate(assignment.dueDate)) {
    return "missing";
  }
  return assignment.status;
};

// ── Assignment card helpers ─────────────────────────────────────────────
// Accent colour per display status — drives the card's left edge + icon tile.
const STATUS_ACCENT: Record<DisplayStatus, string> = {
  pending: "#F9A825",
  submitted: "#1976D2",
  late: "#E64A19",
  graded: "#2E7D32",
  missing: "#C62828",
};

const STATUS_ICON: Record<DisplayStatus, string> = {
  pending: "time-outline",
  submitted: "checkmark-done-outline",
  late: "alert-circle-outline",
  graded: "ribbon-outline",
  missing: "close-circle-outline",
};

// "Due in 5 hr" / "Overdue by 8 days". `soon` = under 48 hours left.
const formatRelativeDue = (dueDate?: string) => {
  const parsed = parseDueDateTime(dueDate);
  if (!parsed) return null;
  const diff = parsed.getTime() - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.max(1, Math.round(abs / 60000));
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const span =
    mins < 60 ? `${mins} min` : hrs < 24 ? `${hrs} hr` : `${days} day${days === 1 ? "" : "s"}`;
  return {
    label: diff < 0 ? `Overdue by ${span}` : `Due in ${span}`,
    overdue: diff < 0,
    soon: diff >= 0 && diff < 48 * 3600000,
  };
};

// Pressable that swaps in `hoverStyle` while the pointer is over it (web) or
// while it is pressed (native). Owns its hover state so hovering a card never
// re-renders the whole screen.
const HoverPressable = ({ style, hoverStyle, children, ...rest }: any) => {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      {...rest}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }: any) => [
        style,
        (hovered || pressed) && hoverStyle,
        Platform.OS === "web" &&
          ({
            cursor: "pointer",
            transitionProperty: "background-color",
            transitionDuration: "150ms",
          } as any),
      ]}
    >
      {children}
    </Pressable>
  );
};

const getDisplayFileSize = (bytes?: number | null) => {
  if (!bytes || !Number.isFinite(bytes)) return "Uploaded file";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

async function readPickedFileBase64(asset: any): Promise<string | null> {
  if (Platform.OS === "web") {
    if (asset?.base64) return asset.base64;
    if (asset?.file) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === "string") {
            resolve(result.includes(",") ? result.split(",")[1] : result);
          } else {
            reject(new Error("Failed to read selected file."));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read selected file."));
        reader.readAsDataURL(asset.file as File);
      });
    }
  }
  if (asset?.uri) {
    return await FileSystem.readAsStringAsync(asset.uri, {
      encoding: "base64" as any,
    });
  }
  return null;
}

function getMimeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
    json: "application/json",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
    svg: "image/svg+xml",
  };
  return map[ext] || "application/octet-stream";
}

function isPresentationFile(
  fileName?: string | null,
  fileType?: string | null
): boolean {
  const ext = (fileName || "").split(".").pop()?.toLowerCase() || "";
  const mime = (fileType || "").toLowerCase();
  return (
    ext === "ppt" ||
    ext === "pptx" ||
    mime === "application/vnd.ms-powerpoint" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );
}

// ✅ HELPER: Check if file is an image
function isImageFile(fileName?: string, fileType?: string): boolean {
  if (!fileName && !fileType) return false;
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  const mime = (fileType || '').toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ||
    mime.startsWith('image/');
}

// ✅ HELPER: Get Viewer URL for Documents
function getViewerUrl(fileUrl: string, fileName?: string, fileType?: string,  pdfUrl?: string | null): string {
  // For images, return direct URL
  if (isImageFile(fileName, fileType)) return fileUrl;
  // For documents, use Google Docs Viewer
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}

function getGoogleDocsViewerUrl(fileUrl: string) {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}

// ─── Microsoft Office viewer + download helpers (mirrors TeacherCourseDetail2) ───
function getMicrosoftOfficeViewerUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

// Starts a download for a signed "attachment" URL: hidden <a> on web, system browser on native.
async function openDownloadUrl(url: string) {
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    await Linking.openURL(url);
  }
}

// Full-page Word viewer (not the embed) — used by "Print to PDF" on mobile so
// the user lands on Microsoft's own print/PDF tools.
function getMicrosoftOfficeFullViewerUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
}

// ✅ NEW: Best-effort storagePath resolver from a Firebase/GCS download URL.
function resolveStoragePathFromUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  try {
    const url = new URL(fileUrl);
    if (url.hostname === "firebasestorage.googleapis.com") {
      const match = url.pathname.match(/\/o\/(.+)$/);
      return match ? decodeURIComponent(match[1]) : null;
    }
    if (url.hostname === "storage.googleapis.com") {
      const parts = url.pathname.split("/").slice(2);
      return parts.join("/") || null;
    }
  } catch {
    return null;
  }
  return null;
}

// ✅ UPDATED: InlineMaterialViewer
function InlineMaterialViewer({
  fileUrl,
  height,
  fileName,
  fileType,
  storagePath,
  bucketPath,
  classId,
  viewerUrl,
}: {
  fileUrl: string;
  height: number;
  fileName?: string;
  fileType?: string;
  storagePath?: string | null;
  bucketPath?: string | null;
  classId?: string;
  // Optional ready-made embed URL (e.g. the Microsoft Office viewer for the
  // filled SAS .docx). When set it is used instead of the Google Docs viewer.
  viewerUrl?: string;
}) {
  const [resolvedUrl, setResolvedUrl] = useState(fileUrl);
  const [hasError, setHasError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasAutoRefreshed, setHasAutoRefreshed] = useState(false);
  const canRefresh = !!(storagePath || bucketPath);
  const identity = `${fileName || ""}|${storagePath || bucketPath || ""}`;

  useEffect(() => {
    setResolvedUrl(fileUrl);
    setHasError(false);
    setHasAutoRefreshed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, fileUrl]);

  const tryRefreshUrl = async (silent = false) => {
    const path = storagePath || bucketPath;
    if (!path) {
      if (!silent) setHasError(true);
      return;
    }
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: path,
          classId,
        }),
      });
      const data = await response.json();
      if (response.ok && data?.url) {
        setResolvedUrl(data.url);
        setHasError(false);
      } else {
        if (!silent) setHasError(true);
      }
    } catch (err) {
      if (!silent) setHasError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (canRefresh && !hasAutoRefreshed) {
      setHasAutoRefreshed(true);
      void tryRefreshUrl(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, hasAutoRefreshed, canRefresh]);

  const displayUrl = viewerUrl || getViewerUrl(resolvedUrl, fileName, fileType);
  const RefreshBar = () =>
    canRefresh ? (
      <TouchableOpacity
        onPress={() => tryRefreshUrl(false)}
        disabled={isRefreshing}
        style={inlineViewerStyles.refreshBar}
        activeOpacity={0.8}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#8B0000" />
        ) : (
          <MaterialCommunityIcons name="refresh" size={16} color="#8B0000" />
        )}
        <Text style={inlineViewerStyles.refreshBarText}>
          {isRefreshing ? "Refreshing link..." : "Preview looks broken? Tap to refresh"}
        </Text>
      </TouchableOpacity>
    ) : null;

  // --- IMAGE HANDLING ---
  if (fileName && isImageFile(fileName, fileType)) {
    if (isRefreshing) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={{ marginTop: 10, color: '#666' }}>Refreshing link...</Text>
        </View>
      );
    }
    if (hasError || !resolvedUrl) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#f0f0f0' }}>
          <MaterialCommunityIcons name="image-off-outline" size={48} color="#CCC" />
          <Text style={{ color: '#888', textAlign: 'center', marginTop: 10 }}>
            This image couldn't be loaded. It may have expired.
          </Text>
          <TouchableOpacity 
            onPress={() => tryRefreshUrl(false)} 
            style={{ marginTop: 10, padding: 8, backgroundColor: '#8B0000', borderRadius: 4 }}
          >
            <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (Platform.OS === 'web') {
      return (
        <View style={{ flex: 1, width: '100%', height, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
          {/* @ts-ignore */}
          <img
            src={resolvedUrl}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onError={() => {
              if (!isRefreshing && !hasError) tryRefreshUrl(false);
            }}
          />
        </View>
      );
    }
    return (
      <View style={{ flex: 1, width: '100%', height, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
        <Image
          source={{ uri: resolvedUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="contain"
          onError={() => {
             if (!isRefreshing && !hasError) tryRefreshUrl(false);
          }}
        />
      </View>
    );
  }

  // --- DOCUMENT HANDLING ---
  if (isRefreshing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
        <ActivityIndicator size="large" color="#8B0000" />
        <Text style={{ marginTop: 10, color: '#666' }}>Refreshing link...</Text>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, width: "100%", height }}>
        <RefreshBar />
        {/* @ts-ignore */}
        <iframe
          key={resolvedUrl}
          src={displayUrl}
          style={{ width: "100%", height: canRefresh ? height - 34 : "100%", border: "none" }}
          allow="autoplay"
          title="Document Viewer"
        />
      </View>
    );
  }

  if (WebView) {
    return (
      <View style={{ flex: 1, width: "100%", height }}>
        <RefreshBar />
        <WebView
          key={resolvedUrl}
          source={{ uri: displayUrl }}
          style={{ flex: 1, width: "100%", height: canRefresh ? height - 34 : height }}
          startInLoadingState
          renderLoading={() => (
            <View style={inlineViewerStyles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8B0000" />
              <Text style={inlineViewerStyles.loadingText}>Loading document...</Text>
            </View>
          )}
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={["*"]}
          mixedContentMode="always"
        />
      </View>
    );
  }

  return (
    <View style={inlineViewerStyles.noWebViewFallback}>
      <Ionicons name="document-text-outline" size={48} color="#CCC" />
      <Text style={inlineViewerStyles.noWebViewText}>
        Install react-native-webview to preview files inline.
      </Text>
      {canRefresh && (
        <TouchableOpacity
          onPress={() => tryRefreshUrl(false)}
          style={{ marginTop: 6, padding: 8, backgroundColor: '#8B0000', borderRadius: 4 }}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
            {isRefreshing ? 'Refreshing...' : 'Refresh Link'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const inlineViewerStyles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  loadingText: { fontFamily: FONT_BODY, marginTop: 12, color: "#666", fontSize: 14 },
  noWebViewFallback: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 24, gap: 12,
  },
  noWebViewText: { fontFamily: FONT_BODY, color: "#888", textAlign: "center", fontSize: 13, lineHeight: 20 },
  refreshBar: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F8F0F0",
    borderBottomWidth: 1,
    borderBottomColor: "#EBD4D4",
  },
  refreshBarText: { fontFamily: FONT_BODY,
    fontSize: 12,
    fontWeight: WEIGHT_EMPHASIS,
    color: "#8B0000",
  },
});

export interface Material {
  id: string;
  title: string;
  type: "pdf" | "video" | "document" | "link";
  uploadedDate: string;
  content?: string;
  fileName?: string;
  fileUrl?: string;
  fileUri?: string;
  fileType?: string;
  storagePath?: string | null;
  bucketPath?: string | null;
  pdfUrl?: string | null;
  pdfStoragePath?: string | null;
}

export interface AssignmentFile {
  id: string;
  name: string;
  uploadedAt: string;
  fileSize?: string;
  uri?: string;
  fileUrl?: string;
  fileType?: string;
}

export interface CourseAssignmentComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isInstructor: boolean;
}

export interface CourseAssignment {
  id: string;
  title: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded" | "late";
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
  fileName?: string | null;
  fileUrl?: string | null;
  fileUri?: string | null;
  fileType?: string | null;
  storagePath?: string | null;
  bucketPath?: string | null;
  files?: AssignmentFile[];
  comments?: CourseAssignmentComment[];
  assignmentType?: "regular" | "game_based";
  gameType?: string;
  repositoryDisabledAfterDue?: boolean;
}

export type ClassScheduleEntry = {
  days: string[];
  startTime: string;
  endTime: string;
  room?: string;
};

export interface CourseDetailData {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  semester: string;
  schoolYear: string;
  section: string;
  materials: Material[];
  assignments: CourseAssignment[];
  schedule?: ClassScheduleEntry[];
}

interface CourseDetailProps {
  course?: AssignmentCourse | null;
  onBack?: () => void;
  initialTab?: "materials" | "assignments" | "modules";
  autoOpenAssignmentId?: string | null;
  onConsumedAutoOpenAssignment?: () => void;
  // ✅ NEW: allows a parent (e.g. Assignments screen's "View" on a Related
  // Course Resource) to request that a specific Module Lesson's detail
  // modal be auto-opened as soon as this course is displayed.
  autoOpenLessonId?: string | null;
  // ✅ NEW: called once the auto-open request above has been handled, so
  // the parent can clear its state and avoid re-triggering on re-render.
  onConsumedAutoOpenLesson?: () => void;
  onGenerateActivity?: (assignment: AssignmentItem) => void;
  onUpdateAssignmentStatus?: (assignmentId: string, status: AssignmentItem["status"]) => void;
  onRefreshSubmissions?: () => Promise<void> | void;
  assignmentComments: Record<string, AssignmentComment[]>;
  assignmentFiles: Record<string, AssignmentFileUpload[]>;
  onAddComment: (assignmentId: string, content: string) => void;
  onAddFile: (assignmentId: string, file: AssignmentFileUpload) => void;
  onRemoveFile: (assignmentId: string, fileId: string) => void;
  currentStudent?: CurrentStudent;
  isGeneratingActivity?: boolean;
  completedActivityScores?: Record<
    string,
    {
      scorePercent: number | null;
      completed: boolean;
      mastered: boolean;
      activityId?: string;
      completedAt?: string | null;
    }
  >;
  onPlayGame?: (assignment: AssignmentItem) => void;
  // ✅ NEW: mirrors Assignments.tsx — lets the student jump straight to the
  // attempt-selection screen for a game-based assignment they've already
  // played, to choose (or change) which completed attempt counts as their
  // official final score, without starting a new attempt.
  onViewGameAttempts?: (assignment: AssignmentItem) => void;
  onEditComment?: (assignmentId: string, commentId: string, newContent: string) => Promise<void>;
  onDeleteComment?: (assignmentId: string, commentId: string) => Promise<void>;
  // ✅ NEW: refetches comments for ONE assignment (mirrors Assignments.tsx /
  // TeacherSubmissionsSection's fetchComments). Called when an assignment's
  // detail modal is opened, on the poll interval, and on pull-to-refresh.
  onRefreshComments?: (assignmentId: string) => Promise<void> | void;
  // ✅ NEW: refetches the underlying course/assignment CONTENT (title, due
  // date, description, points, and the teacher-uploaded assignment file/
  // storagePath) in case the teacher edited or replaced the assignment
  // while the student had it open.
  onRefreshCourseContent?: () => Promise<void> | void;
  // ✅ NEW: how often (ms) to silently poll for new grades/comments/content
  // while this screen — or an assignment's detail modal — is open. 0 disables.
   onLoadClassComments?: (courseId: string) => Promise<void> | void;
  autoRefreshIntervalMs?: number;
}

const EMPTY_COURSE: AssignmentCourse = {
  id: "",
  name: "No Course Selected",
  code: "",
  instructor: "",
  description: "No course data available.",
  semester: "",
  schoolYear: "",
  section: "",
  materials: [],
  assignments: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// RICH TEXT RENDERER HELPER
// ─────────────────────────────────────────────────────────────────────────────
const renderFormattedText = (text: string, baseStyle: any) => {
  if (!text) return null;
  const lines = text.split("\n");
  const justifiedBaseStyle = [
    baseStyle,
    {
      textAlign: "justify",
      lineHeight: 16,
      letterSpacing: 0.3,
      fontSize: 16,
    },
  ];
  return lines.map((line, lineIndex) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      return <View key={lineIndex} style={{ height: 8 }} />;
    }
    const isBullet =
      trimmedLine.startsWith("* ") ||
      trimmedLine.startsWith("- ") ||
      trimmedLine.startsWith("• ");
    let contentToParse = trimmedLine;
    if (trimmedLine.startsWith("* ")) {
      contentToParse = trimmedLine.substring(2).trim();
    } else if (trimmedLine.startsWith("- ")) {
      contentToParse = trimmedLine.substring(2).trim();
    } else if (trimmedLine.startsWith("• ")) {
      contentToParse = trimmedLine.substring(2).trim();
    }
    const boldMarkers = contentToParse.match(/\*\*/g) || [];
    const boldCount = boldMarkers.length;
    const hasInvalidBold =
      boldCount % 2 !== 0 ||
      /^\*\*\s/.test(contentToParse) ||
      /\*\*$/.test(contentToParse);
    if (hasInvalidBold) {
      const cleanedText = contentToParse.replace(/\*\*/g, "");
      return (
        <View key={lineIndex} style={{ flexDirection: "row", marginBottom: 6 }}>
          {isBullet && (
            <Text style={[justifiedBaseStyle, { marginRight: 10, fontWeight: "bold" }]}>•</Text>
          )}
          <Text style={justifiedBaseStyle}>{cleanedText}</Text>
        </View>
      );
    }
    const boldRegex = /(\*\*[^*]+\*\*)/g;
    const parts = contentToParse.split(boldRegex);
    return (
      <View key={lineIndex} style={{ flexDirection: "row", marginBottom: 6 }}>
        {isBullet && (
          <Text style={[justifiedBaseStyle, { marginRight: 10, fontWeight: "bold" }]}>•</Text>
        )}
        <Text style={{ flex: 1 }}>
          {parts.map((part, partIndex) => {
            const isBold = part.startsWith("**") && part.endsWith("**") && part.length > 4;
            return (
              <Text key={`${lineIndex}-${partIndex}`} style={[justifiedBaseStyle, isBold && { fontWeight: "bold" }]}>
                {isBold ? part.slice(2, -2) : part}
              </Text>
            );
          })}
        </Text>
      </View>
    );
  });
};

// ─── Gmail-style selection toolbar for a module's lessons ────────────────────
// [☐ ▾] checkbox + All/None menu, then a labelled Download button. The rows
// themselves carry the per-lesson checkboxes. Selected lessons are downloaded as
// their Student Activity Sheet (.docx) — one file, or a .zip when several are picked.
function LessonSelectToolbar({
  lessonIds,
  selected,
  onSelectAll,
  onDownload,
  downloading,
}: {
  lessonIds: string[];
  selected: Record<string, boolean>;
  onSelectAll: (value: boolean) => void;
  onDownload: (ids: string[]) => void;
  downloading: boolean;
}) {
  const { width: winW } = useWindowDimensions();
  const boxRef = useRef<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 60, left: 12 });
  const selectedIds = lessonIds.filter((id) => selected[id]);
  const allSelected = lessonIds.length > 0 && selectedIds.length === lessonIds.length;
  const someSelected = selectedIds.length > 0 && !allSelected;
  const canDownload = selectedIds.length > 0 && !downloading;

  const openMenu = () => {
    if (boxRef.current?.measureInWindow) {
      boxRef.current.measureInWindow((x: number, y: number, _w: number, h: number) => {
        setMenuPos({ top: y + h + 4, left: Math.min(Math.max(8, x), Math.max(8, winW - 150)) });
        setMenuOpen(true);
      });
    } else {
      setMenuOpen(true);
    }
  };

  return (
    <View style={styles.lessonSelectBar}>
      <View ref={boxRef} collapsable={false} style={styles.lessonSelectBox}>
        <TouchableOpacity
          onPress={() => onSelectAll(!(allSelected || someSelected))}
          accessibilityLabel="Select all lessons"
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 2 }}
          style={styles.lessonSelectBoxBtn}
        >
          {allSelected ? (
            <Ionicons name="checkbox" size={22} color="#8B0000" />
          ) : someSelected ? (
            <View style={styles.lessonSelectIndeterminate}>
              <View style={styles.lessonSelectIndeterminateBar} />
            </View>
          ) : (
            <Ionicons name="square-outline" size={22} color="#666" />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openMenu}
          accessibilityLabel="Selection options"
          hitSlop={{ top: 8, bottom: 8, left: 2, right: 6 }}
          style={styles.lessonSelectCaretBtn}
        >
          <Ionicons name="caret-down" size={11} color="#555" />
        </TouchableOpacity>
      </View>

      <View style={styles.lessonSelectDivider} />

      <TouchableOpacity
        onPress={() => onDownload(selectedIds)}
        disabled={!canDownload}
        activeOpacity={0.8}
        style={[styles.lessonSelectDownloadBtn, !canDownload && { opacity: 0.45 }]}
      >
        {downloading ? (
          <ActivityIndicator size="small" color="#8B0000" />
        ) : (
          <Ionicons name="download-outline" size={18} color="#8B0000" />
        )}
        <Text style={styles.lessonSelectDownloadText}>
          {downloading ? 'Preparing…' : selectedIds.length > 1 ? `Download ${selectedIds.length} lessons` : 'Download'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.lessonSelectCount} numberOfLines={1}>
        {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select lessons to download'}
      </Text>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setMenuOpen(false)}>
          <View style={[styles.sasDocMenuCard, { top: menuPos.top, left: menuPos.left, minWidth: 130 }]}>
            <TouchableOpacity
              style={styles.sasDocMenuItem}
              onPress={() => { setMenuOpen(false); onSelectAll(true); }}
              activeOpacity={0.7}
            >
              <Text style={styles.sasDocMenuText}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sasDocMenuItem}
              onPress={() => { setMenuOpen(false); onSelectAll(false); }}
              activeOpacity={0.7}
            >
              <Text style={styles.sasDocMenuText}>None</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Browser print (web only, no server) ─────────────────────────────────────
// Downloads the filled SAS .docx, renders it into a hidden same-origin iframe
// with `docx-preview`, and opens the browser's own print dialog ("Save as PDF").
// Needs: npm i docx-preview. Throws if the file can't be fetched (e.g. storage
// CORS) or rendered, so the caller can fall back to the Word viewer tab.
async function printDocxInBrowser(docUrl: string, title: string | null | undefined, onReady: () => void) {
  const response = await fetch(docUrl);
  if (!response.ok) throw new Error(`Could not fetch the document (${response.status}).`);
  const buffer = await response.arrayBuffer();
  const { renderAsync } = await import('docx-preview');

  const iframe: any = (document as any).createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  (document as any).body.appendChild(iframe);
  const parentTitle = (document as any).title;
  let restored = false;
  const restore = () => {
    if (restored) return;
    restored = true;
    (document as any).title = parentTitle;
    iframe.remove();
  };

  try {
    const doc: any = iframe.contentDocument;
    const win: any = iframe.contentWindow;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title></title></head><body></body></html>');
    doc.close();

    await renderAsync(buffer, doc.body, doc.head, {
      className: 'docx',
      inWrapper: false,
      breakPages: true,
      useBase64URL: true,
      renderHeaders: true,
      renderFooters: true,
      renderFootnotes: true,
    } as any);

    // Match the printed page to the document's own page size.
    const firstPage: any = doc.querySelector('section.docx');
    const pageSize = firstPage?.style?.width && firstPage?.style?.minHeight
      ? `${firstPage.style.width} ${firstPage.style.minHeight}`
      : 'auto';
    const style = doc.createElement('style');
    style.textContent = `
      @page { size: ${pageSize}; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      section.docx { box-shadow: none !important; margin: 0 !important; break-after: page; page-break-after: always; }
      section.docx:last-of-type { break-after: auto; page-break-after: auto; }
    `;
    doc.head.appendChild(style);

    // Wait for images/fonts so nothing prints blank.
    await Promise.all(
      Array.from(doc.images as ArrayLike<any>).map((img: any) =>
        img.complete ? null : new Promise<void>((resolve) => { img.onload = img.onerror = () => resolve(); })
      )
    );
    await doc.fonts?.ready;

    // The browser uses the document title as the default "Save as PDF" file name.
    if (title) {
      doc.title = title;
      (document as any).title = title;
    }

    win.addEventListener('afterprint', restore);
    setTimeout(restore, 5 * 60 * 1000); // safety net for browsers that never fire afterprint
    onReady();
    win.focus();
    win.print();
  } catch (err) {
    restore();
    throw err;
  }
}

// ─── Top-bar document menu (Download a Copy / Print to PDF) ──────────────────
// Print to PDF:
//  • Web    → opens the browser's print dialog for the filled document
//             (Save as PDF), no server involved. If that fails, it falls back
//             to the Word viewer in a new tab.
//  • Mobile → opens the document in the Word viewer in the browser.
function SasDocMenuButton({
  docUrl,
  downloadUrl,
  title,
}: {
  docUrl: string | null;
  downloadUrl: string | null;
  title?: string | null;
}) {
  const { width: winW } = useWindowDimensions();
  const btnRef = useRef<any>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 64, right: 12 });
  const [preparingPrint, setPreparingPrint] = useState(false);
  const ready = !!(docUrl || downloadUrl);

  const openMenu = () => {
    if (!ready) return;
    if (btnRef.current?.measureInWindow) {
      btnRef.current.measureInWindow((x: number, y: number, w: number, h: number) => {
        setPos({ top: y + h + 6, right: Math.max(8, winW - (x + w)) });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  const download = async () => {
    setOpen(false);
    const url = downloadUrl || docUrl;
    if (!url) return;
    try {
      await openDownloadUrl(url);
    } catch (err) {
      console.warn('Could not download the document:', err);
    }
  };

  const printToPdf = async () => {
    setOpen(false);
    if (!docUrl || preparingPrint) return;

    // Mobile: open the Word viewer (its own Print / PDF tools).
    if (Platform.OS !== 'web') {
      try {
        await Linking.openURL(getMicrosoftOfficeFullViewerUrl(docUrl));
      } catch (err) {
        console.warn('Could not open the Word viewer:', err);
      }
      return;
    }

    // Web: browser print dialog.
    setPreparingPrint(true);
    try {
      await printDocxInBrowser(docUrl, title, () => setPreparingPrint(false));
    } catch (err) {
      console.warn('Browser print failed, opening the Word viewer instead:', err);
      try {
        (window as any).open(getMicrosoftOfficeFullViewerUrl(docUrl), '_blank', 'noopener');
      } catch {}
    } finally {
      setPreparingPrint(false);
    }
  };

  return (
    <>
      <View ref={btnRef} collapsable={false}>
        <TouchableOpacity
          onPress={openMenu}
          disabled={!ready}
          activeOpacity={0.8}
          accessibilityLabel="Document options"
          style={[styles.sasDocMenuBtn, !ready && { opacity: 0.45 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="document-text-outline" size={19} color="#444" />
          <Ionicons name="chevron-down" size={13} color="#444" />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={[styles.sasDocMenuCard, { top: pos.top, right: pos.right }]}>
            <TouchableOpacity style={styles.sasDocMenuItem} onPress={download} activeOpacity={0.7}>
              <Ionicons name="download-outline" size={18} color="#222" />
              <Text style={styles.sasDocMenuText}>Download a Copy</Text>
            </TouchableOpacity>
            <View style={styles.sasDocMenuDivider} />
            <TouchableOpacity style={styles.sasDocMenuItem} onPress={printToPdf} activeOpacity={0.7}>
              <Ionicons name="print-outline" size={18} color="#222" />
              <View>
                <Text style={styles.sasDocMenuText}>Print to PDF</Text>
                <Text style={styles.sasDocMenuHint}>
                  {Platform.OS === 'web' ? 'Opens the print dialog' : 'Opens in the Word viewer'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Shown only while the document is being prepared for the browser print dialog */}
      <Modal visible={preparingPrint} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.printPrepBackdrop}>
          <View style={styles.printPrepCard}>
            <ActivityIndicator size="small" color="#8B0000" />
            <Text style={styles.printPrepText}>Preparing print preview…</Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── SAS Docx Preview (mirrors TeacherCourseDetail2) ─────────────────────────
// Shows the real CTU SAS Word template, filled in by the server, inline in the
// Microsoft Office viewer. GET /course-lessons/:id/sas-preview returns a signed
// URL to the filled .docx — no PDF conversion. Calls onUnavailable() once if
// the render fails so the caller can fall back to the plain lesson view.
function SASTemplatePreview({
  lessonId,
  isMobile,
  onUnavailable,
  onLinksChange,
}: {
  lessonId: string;
  isMobile: boolean;
  onUnavailable: () => void;
  // Reports the filled .docx links so the top bar can offer Download / Print.
  onLinksChange?: (links: { url: string | null; downloadUrl: string | null }) => void;
}) {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const linksCbRef = useRef(onLinksChange);
  linksCbRef.current = onLinksChange;
  useEffect(() => {
    linksCbRef.current?.({ url: docUrl, downloadUrl });
  }, [docUrl, downloadUrl]);
  useEffect(() => () => linksCbRef.current?.({ url: null, downloadUrl: null }), []);
  const [loading, setLoading] = useState(true);
  const [containerHeight, setContainerHeight] = useState(0);
  const reportedFailureRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    reportedFailureRef.current = false;
    setDocUrl(null);
    setDownloadUrl(null);
    setLoading(true);

    const fail = () => {
      if (!cancelled && !reportedFailureRef.current) {
        reportedFailureRef.current = true;
        onUnavailable();
      }
    };

    (async () => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/course-lessons/${lessonId}/sas-preview`);
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        if (response.ok && data?.url) {
          setDocUrl(data.url);
          setDownloadUrl(data.downloadUrl || null);
        } else fail();
      } catch (err) {
        console.warn('SAS docx preview failed to load:', err);
        fail();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const fileName = `SAS-${lessonId}.docx`;
  const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  return (
    <View
      style={{ flex: 1, backgroundColor: '#ECECEC' }}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#8B0000" />
          <Text style={[styles.lessonPreviewSectionText, { marginTop: 12 }]}>Preparing Student Activity Sheet…</Text>
        </View>
      ) : docUrl && containerHeight > 0 ? (
        <InlineMaterialViewer
          fileUrl={docUrl}
          viewerUrl={getMicrosoftOfficeViewerUrl(docUrl)}
          height={containerHeight}
          fileName={fileName}
          fileType={DOCX_MIME}
        />
      ) : null}
    </View>
  );
}

const CourseDetail = ({
  course,
  initialTab = "materials",
  onBack,
  autoOpenAssignmentId = null,
  onConsumedAutoOpenAssignment,
  autoOpenLessonId = null,
  onConsumedAutoOpenLesson,
  onGenerateActivity,
  onUpdateAssignmentStatus,
  onRefreshSubmissions,
  assignmentComments,
  assignmentFiles,
  onAddComment,
  onAddFile,
  onRemoveFile,
  currentStudent,
  isGeneratingActivity = false,
  completedActivityScores = {},
  onPlayGame,
  onViewGameAttempts,
  onEditComment,
  onDeleteComment,
  // ✅ NEW
  onRefreshComments,
  onRefreshCourseContent,
  onLoadClassComments,
  autoRefreshIntervalMs = 15000,
}: CourseDetailProps) => {
  const formatSafeDate = (value: any) => {
    if (!value) return 'Recently';
    if (typeof value?.toDate === 'function') {
      return value.toDate().toLocaleDateString();
    }
    if (typeof value?._seconds === 'number') {
      return new Date(value._seconds * 1000).toLocaleDateString();
    }
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d.toLocaleDateString();
    } catch {}
    return 'Recently';
  };

  const { width, height } = useWindowDimensions();
  const windowHeight = height;
  const isSmallPhone = width < 360;
  const isLargeScreen = width >= 768;
  const safeCourse = course ?? EMPTY_COURSE;
  // ── Banner (same cache-first pattern as CourseCard) ──────────────────
  // Seed straight from cache so the very first frame already has the right
  // image with no blank/fallback flash.
  const bannerStoragePath = (safeCourse as any).bannerStoragePath || null;
  const initialCachedBannerUrl = bannerStoragePath
    ? getCachedBannerUrl(safeCourse.id, bannerStoragePath)
    : null;
  const [signedBannerUrl, setSignedBannerUrl] = useState<string | null>(initialCachedBannerUrl);
  const [bannerLoadFailed, setBannerLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const refreshSignedBannerUrl = async () => {
      if (!bannerStoragePath) {
        setSignedBannerUrl(null);
        setBannerLoadFailed(false);
        return;
      }

      // Cache hit: reuse it, skip the network call entirely. This is what
      // keeps the banner stable across the 5s silentRefresh poll instead of
      // fetching (and rendering) a brand new signed URL every cycle.
      const cached = getCachedBannerUrl(safeCourse.id, bannerStoragePath);
      if (cached) {
        if (isMounted) {
          setSignedBannerUrl(cached);
          setBannerLoadFailed(false);
        }
        return;
      }

      // Cache miss (first time this session, or the cached entry expired):
      // fetch a fresh signed URL and store it for next time.
      try {
        const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storagePath: bannerStoragePath, classId: safeCourse.id }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Unable to refresh class banner.');
        if (isMounted && data?.url) {
          setCachedBannerUrl(safeCourse.id, bannerStoragePath, data.url);
          setSignedBannerUrl(data.url);
          setBannerLoadFailed(false);
        }
      } catch {
        if (isMounted) setBannerLoadFailed(true);
      }
    };

    refreshSignedBannerUrl();

    return () => {
      isMounted = false;
    };
  }, [safeCourse.id, bannerStoragePath]);

  const [activeTab, setActiveTab] = useState<"materials" | "assignments" | "modules">('modules');
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | DisplayStatus>("all");
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  // Real rendered width of the assignments grid (measured via onLayout) so the
  // columns fill the space next to the sidebar instead of guessing from the
  // window width.
  const [assignmentGridWidth, setAssignmentGridWidth] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<
    AssignmentCourse["materials"][number] | null
  >(null);
  const [newComment, setNewComment] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);

  // ── Comment edit / delete state ──
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const buttonRefs = useState<{ [key: string]: any }>({});

  // ── Delete confirmation modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  // ── "Turn in assignment?" confirmation modal (Google Classroom style),
  // shown before the actual submit request fires.
  const [submitConfirmVisible, setSubmitConfirmVisible] = useState(false);

  // ✅ NEW: Inline Preview State
  const [previewFile, setPreviewFile] = useState<AssignmentFileUpload | null>(null);
  const [gameAttempts, setGameAttempts] = useState<Record<string, number>>({});
  const [isLoadingAttempts, setIsLoadingAttempts] = useState<Record<string, boolean>>({});
  // ✅ NEW: mirrors Assignments.tsx — tracks which completed attempt (if any)
  // is currently saved as the assignment's official final score, and
  // whether that pick was made automatically (attempts ran out) vs by the
  // student, so the button label can reflect it.
  const [selectedGameAttemptIds, setSelectedGameAttemptIds] = useState<Record<string, string | null>>({});
  const [autoFinalizedGameAssignments, setAutoFinalizedGameAssignments] = useState<Record<string, boolean>>({});

  // ── Modules state
  const [modules, setModules] = useState<any[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // ── Syllabus state
  const [currentSyllabus, setCurrentSyllabus] = useState<any>(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  const [syllabusViewerUrl, setSyllabusViewerUrl] = useState<string | null>(null);

  // ── Lesson Detail State
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [lessonDetailModalVisible, setLessonDetailModalVisible] = useState(false);
  // Set when the filled-.docx render fails so the modal falls back to the plain lesson view.
  const [sasPreviewFailedFor, setSasPreviewFailedFor] = useState<string | null>(null);
  // Links to the filled SAS .docx currently shown full-screen (feeds the top-bar Download / Print menu).
  const [sasDocLinks, setSasDocLinks] = useState<{ url: string | null; downloadUrl: string | null }>({ url: null, downloadUrl: null });
  // Lessons ticked in the Gmail-style selection bar (by lesson id) + which module is preparing a download.
  const [selectedLessonIds, setSelectedLessonIds] = useState<Record<string, boolean>>({});
  const [downloadingLessonsModuleId, setDownloadingLessonsModuleId] = useState<string | null>(null);

  // ── Course Template (school-wide letterhead header/footer) — read-only
  // here; mirrors the teacher's Lesson Preview so the Lesson Detail modal
  // frames content with the same letterhead used across the app.
  const [courseTemplate, setCourseTemplate] = useState<{ headerUrl: string | null; footerUrl: string | null }>({
    headerUrl: null,
    footerUrl: null,
  });

  // ✅ NEW: Refresh state — drives pull-to-refresh on the main screen scroll
  // and the assignment detail modal, and the silent background poller below.
  const [isRefreshing, setIsRefreshing] = useState(false);
  // ✅ NEW: Tracks a one-off "just opened this assignment" fetch, so a tiny
  // inline indicator can show inside the modal without the big spinner.
  const [isRefreshingOpenedAssignment, setIsRefreshingOpenedAssignment] = useState(false);

  // ✅ Toast state — same shape/usage as SignIn, Community, Dashboard, ClassesScreen.
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  // Thin wrapper matching SignIn.tsx's showFeedback signature, so every
  // existing "Alert.alert(title, message)" call site below can be swapped
  // to "showFeedback(type, title, message)" with minimal changes.
  const showFeedback = (type: ToastType, title: string, message: string) => {
    showToast(`${title}: ${message}`, type);
  };

  const insets = useSafeAreaInsets();
  const autoHandledRef = useRef<string | null>(null);
  // ✅ NEW: guards autoOpenLessonId the same way autoHandledRef guards
  // autoOpenAssignmentId — prevents re-triggering the lesson modal on every
  // re-render once a given id has already been auto-opened.
  const autoLessonHandledRef = useRef<string | null>(null);
  // ✅ NEW: tracks which autoOpenAssignmentId we've already kicked off an
  // immediate refresh for, so the "assignment not found yet" branch below
  // fires onRefreshCourseContent() once per id instead of on every render
  // while we wait for it to show up.
  const autoOpenRefreshRequestedRef = useRef<string | null>(null);

  // ✅ NEW: true while the student is mid-interaction — typing an edit, has a
// comment dropdown open, is deleting, or is mid-upload/submit. Background
// polling checks this before touching state so nothing shifts or resets
// under an in-progress tap/keystroke. Read from a ref (not state) so the
// polling interval always sees the latest value without re-subscribing.
const isOverlayOpenRef = useRef(false);
useEffect(() => {
  isOverlayOpenRef.current =
    !!openMenuCommentId ||
    !!editingCommentId ||
    deleteModalVisible ||
    isUploadingFile ||
    isSubmittingAssignment ||
    isDeletingComment ||
    savingEdit;
}); 

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // ✅ NEW: silent=true skips the loading spinner/list-clearing so a background
// poll never flashes the "Loading resources..." state or wipes the list on
// a transient error — it just quietly swaps in fresh data when it succeeds.
const fetchModules = useCallback(async (silent = false) => {
    if (!course?.id) {
      if (!silent) setModules([]);
      return;
    }
    if (!silent) setIsLoadingModules(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/course-modules/${course.id}`);
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setModules(data);
      } else if (!silent) {
        setModules([]);
      }
    } catch (error) {
      console.error("Error fetching modules:", error);
      if (!silent) setModules([]);
    } finally {
      if (!silent) setIsLoadingModules(false);
    }
  }, [course?.id]);

  useEffect(() => {
    fetchModules(false);
  }, [course?.id, fetchModules]);

  const fetchSyllabus = useCallback(async (silent = false) => {
    if (!course?.id) {
      if (!silent) setCurrentSyllabus(null);
      return;
    }
    if (!silent) setIsLoadingSyllabus(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/course-syllabus/${course.id}`);
      const data = await response.json();
      if (response.ok && data) {
        setCurrentSyllabus(data);
      } else if (!silent) {
        setCurrentSyllabus(null);
      }
    } catch (error) {
      console.error("Error fetching syllabus:", error);
      if (!silent) setCurrentSyllabus(null);
    } finally {
      if (!silent) setIsLoadingSyllabus(false);
    }
  }, [course?.id]);

  useEffect(() => {
    fetchSyllabus(false);
  }, [course?.id, fetchSyllabus]);

  // Course template is global/school-wide (set by admins/teachers via
  // "Manage Template"), so it only needs to be fetched once — it isn't tied
  // to this particular course. Read-only here; students never edit it.
  useEffect(() => {
    (async () => {
      try {
        const response = await apiFetch(`${API_BASE_URL}/course-template`);
        const data = await response.json();
        if (response.ok && data?.success) {
          setCourseTemplate({
            headerUrl: data.data?.headerUrl || null,
            footerUrl: data.data?.footerUrl || null,
          });
        }
      } catch (error) {
        console.error('Failed to load course template:', error);
      }
    })();
  }, []);

  // ─── Course Template header/footer frame ───────────────────────────────────
  // Wraps the Lesson Detail content with the same school-wide letterhead
  // banner used in the teacher's Lesson Preview / Grades' Official Grade
  // Report. Falls back to the default CTU Argao letterhead until an
  // admin/teacher uploads a custom header/footer via "Manage Template".
  const renderTemplateHeaderBanner = () => {
    const source = courseTemplate.headerUrl ? { uri: courseTemplate.headerUrl } : DefaultTemplateHeader;
    return (
      <ExpoImage
        source={source}
        style={styles.templateHeaderImage}
        contentFit="contain"
      />
    );
  };

  const renderTemplateFooterBanner = () => {
    const source = courseTemplate.footerUrl ? { uri: courseTemplate.footerUrl } : DefaultTemplateFooter;
    return (
      <ExpoImage
        source={source}
        style={styles.templateFooterImage}
        contentFit="contain"
      />
    );
  };

  const getScorePercent = (assignment: AssignmentItem) => {
    if (
      assignment.status !== "graded" ||
      assignment.points === undefined ||
      assignment.maxPoints === undefined ||
      assignment.maxPoints === 0
    ) return null;
    return Math.round((assignment.points / assignment.maxPoints) * 100);
  };

  const getRecommendationType = (assignment: AssignmentItem): "review" | "practice" | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return "review";
    if (percent < 75) return "practice";
    return null;
  };

  const getRecommendationLabel = (assignment: AssignmentItem) => {
    const r = getRecommendationType(assignment);
    if (r === "review") return "Review Activity";
    if (r === "practice") return "Practice Quiz";
    return null;
  };

  const getRecommendationColor = (assignment: AssignmentItem) => {
    const r = getRecommendationType(assignment);
    if (r === "review") return "#8B0000";
    if (r === "practice") return "#F57C00";
    return "#999";
  };

  const getStatusColor = (status: DisplayStatus) => {
    switch (status) {
      case "pending": return "#FFE082";
      case "submitted": return "#BBDEFB";
      case "late": return "#FFCCBC";
      case "graded": return "#A5D6A7";
      case "missing": return "#FFCDD2";
      default: return "#DDD";
    }
  };

  const getStatusTextColor = (status: DisplayStatus) => {
    switch (status) {
      case "pending": return "#7A5600";
      case "submitted": return "#0D47A1";
      case "late": return "#BF360C";
      case "graded": return "#1B5E20";
      case "missing": return "#B71C1C";
      default: return "#555";
    }
  };

  const getMaterialIconName = (type: string) => {
    switch (type) {
      case "pdf": return "document-text-outline";
      case "video": return "videocam-outline";
      case "document": return "document-outline";
      case "link": return "link-outline";
      default: return "attach-outline";
    }
  };

  const getRelatedMaterials = (assignment: AssignmentItem) => {
    if (!assignment.materialIds?.length) return [];
    return safeCourse.materials.filter((m) =>
      assignment.materialIds?.includes(m.id)
    );
  };

  const getCompletedActivityScore = (assignment: AssignmentItem) =>
    completedActivityScores[assignment.id] || null;

  const hasMasteredGeneratedActivity = (assignment: AssignmentItem) => {
    const activityScore = getCompletedActivityScore(assignment);
    return (
      !!activityScore?.completed &&
      activityScore.scorePercent !== null &&
      activityScore.scorePercent >= 75
    );
  };

  const canGenerateActivity = (assignment: AssignmentItem) => {
    const score = getScorePercent(assignment);
    return (
      score !== null &&
      score < 75 &&
      getRelatedMaterials(assignment).length > 0 &&
      !hasMasteredGeneratedActivity(assignment)
    );
  };

  const canManageComment = (comment: AssignmentComment) => {
    if (!currentStudent) return false;
    const studentName = `${currentStudent.firstName || ''} ${currentStudent.lastName || ''}`.trim();
    return comment.author === studentName || comment.author === currentStudent.email;
  };

  const handleMenuPress = (commentId: string, event: any) => {
    event.persist?.();
    if (openMenuCommentId === commentId) {
      setOpenMenuCommentId(null);
      setMenuPosition(null);
      return;
    }
    if (event.nativeEvent?.layout) {
      const { x, y, width: btnWidth, height: btnHeight } = event.nativeEvent.layout;
      setMenuPosition({ x: x + btnWidth, y: y + btnHeight });
    } else {
      const buttonRef = buttonRefs[0]?.[commentId];
      if (buttonRef) {
        buttonRef.measureInWindow((x: number, y: number, btnWidth: number, btnHeight: number) => {
          setMenuPosition({ x: x + btnWidth, y: y + btnHeight });
        });
      }
    }
    setOpenMenuCommentId(commentId);
  };

  const closeMenu = () => {
    setOpenMenuCommentId(null);
    setMenuPosition(null);
  };

  const getMaterialUrl = (
    material: AssignmentCourse["materials"][number] | null
  ): string | null => {
    if (!material) return null;
    const raw = material.fileUri || material.fileUrl || (material as any).uri || null;
    if (!raw || typeof raw !== "string") return null;
    return raw.trim() || null;
  };

  const getMaterialPdfPreviewUrl = (
    material: AssignmentCourse["materials"][number] | null
  ): string | null => {
    if (!material) return null;
    const pdfUrl = (material as any).pdfUrl;
    if (!pdfUrl || typeof pdfUrl !== "string") return null;
    return pdfUrl.trim() || null;
  };

  const shouldUseInlineViewer = (
    material: AssignmentCourse["materials"][number] | null
  ): boolean => {
    if (!material) return false;
    if (material.type === "video") return false;
    const url = getMaterialUrl(material);
    if (!url) return false;
    return true;
  };

  const getAssignmentFileUrl = (assignment?: AssignmentItem | null) => {
    const raw =
      assignment?.fileUrl ||
      assignment?.fileUri ||
      (assignment as any)?.downloadUrl ||
      (assignment as any)?.attachmentUrl ||
      null;
    if (!raw || typeof raw !== "string") return null;
    return raw.trim() || null;
  };

  const getAssignmentFileName = (assignment?: AssignmentItem | null) =>
    assignment?.fileName ||
    (assignment as any)?.name ||
    (assignment as any)?.attachmentName ||
    "Assignment attachment";

  const handleOpenMaterialPreview = (
    material: AssignmentCourse["materials"][number]
  ) => setSelectedMaterial(material);

  const closeMaterialModal = () => setSelectedMaterial(null);

  const handleOpenUploadedFile = async (fileUri?: string | null) => {
    const url = fileUri?.trim();
    if (!url) {
      showFeedback('error', 'No File', 'This file has no URL yet.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      showFeedback('error', 'Open Failed', 'Unable to open this file.');
    }
  };

  // ✅ UPDATED: Handle opening files/links with PREVIEW support
  const handleOpenSubmittedFile = async (
    file: AssignmentFileUpload,
    emptyMessage = 'This file has no URL yet.'
  ) => {
    // 1. CHECK IF IT'S A LINK -> DIRECT NAVIGATION
    if (file.fileType === 'text/uri-list' || !!file.linkUrl) {
      const url = file.linkUrl?.trim();
      if (!url) {
        showFeedback('error', 'Invalid Link', 'No URL found for this submission.');
        return;
      }
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported && Platform.OS !== 'web') throw new Error('Unsupported URL.');
        await Linking.openURL(url);
      } catch {
        showFeedback('error', 'Open Failed', 'Unable to open this link.');
      }
      return;
    }
    // 2. CHECK IF IT'S A FILE -> INLINE PREVIEW
    if (!file.fileUrl && !file.storagePath && !file.bucketPath) {
      showFeedback('error', 'No File', emptyMessage);
      return;
    }
    // Set preview state to open the modal
    setPreviewFile(file);
  };

  // ✅ Shared download implementation (used by both the Course Material
  // viewer and the submitted/lesson-file Inline Preview modal below).
  // ✅ CHANGED: on web, force a real "Save As" download instead of just
  // navigating the anchor's href. A plain `<a download>` only forces a
  // download when the browser treats it as same-origin (or the response has
  // a Content-Disposition: attachment header) — for a cross-origin storage
  // URL without that header, Chrome/Firefox just open the file in a viewer
  // tab instead (which is what was happening for the Syllabus preview,
  // since that signed URL doesn't set the header, unlike the material one).
  // Fetching the bytes ourselves and downloading from a same-origin blob:
  // URL sidesteps that entirely, so every download button (Syllabus,
  // Module Lesson material, submitted file) behaves identically regardless
  // of what headers the underlying storage URL happens to return.
  const downloadFromUrl = async (
    downloadUrl: string,
    fileName: string,
    mimeType: string,
    webFetchOptions?: RequestInit
  ) => {
    // ── WEB: trigger a real browser download (not just opening a tab) ──
    if (Platform.OS === "web") {
      try {
        const response = await fetch(downloadUrl, webFetchOptions);
        if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Give the browser a moment to pick up the download before revoking.
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        console.error("Web download failed, falling back to direct link:", err);
        // Fallback: some storage URLs block cross-origin fetch (CORS) even
        // though the browser can still navigate to them directly, so try
        // the old direct-link approach rather than failing outright.
        try {
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = fileName;
          link.rel = "noopener";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch (fallbackErr) {
          console.error("Fallback web download failed:", fallbackErr);
          showFeedback('error', 'Download Failed', 'Unable to download this file.');
        }
      }
      return;
    }

    // ── NATIVE (iOS / Android): download to cache, then share/save ──
    try {
      const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const localUri = `${FileSystem.cacheDirectory}${safeFileName}`;

      const downloadResult = await FileSystem.downloadAsync(downloadUrl, localUri);

      if (downloadResult.status !== 200) {
        throw new Error(`Download failed with status ${downloadResult.status}`);
      }

      let Sharing: any = null;
      try {
        Sharing = require("expo-sharing");
      } catch (_) {}

      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType,
          dialogTitle: fileName,
          UTI: mimeType,
        });
      } else {
        await Linking.openURL(downloadUrl);
      }
    } catch (err) {
      console.error("Native download failed:", err);
      showFeedback('error', 'Download Failed', 'Unable to download this file. Opening it instead.');
      try {
        await Linking.openURL(downloadUrl);
      } catch {
        showFeedback('error', 'Open Failed', 'Unable to open this file.');
      }
    }
  };

  const handleDownloadMaterial = async () => {
    const storagePath = (selectedMaterial as any)?.storagePath;
    const firebaseUrl = getMaterialUrl(selectedMaterial);
    const resolvedStoragePath = storagePath || resolveStoragePathFromUrl(firebaseUrl);

    if (!resolvedStoragePath && !firebaseUrl) {
      showFeedback('error', 'No file', 'This material has no file to download.');
      return;
    }

    const fileName = selectedMaterial?.fileName || selectedMaterial?.title || "material";
    const mimeType = (selectedMaterial as any)?.fileType || getMimeFromFileName(fileName);

    // ✅ Resolve the freshest possible URL first (avoids expired-token 403s),
    // falling back to whatever URL we already have on the material.
    let downloadUrl = firebaseUrl;
    if (resolvedStoragePath) {
      try {
        const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath: resolvedStoragePath,
            classId: course?.id,
          }),
        });
        const data = await response.json();
        if (response.ok && data?.url) {
          downloadUrl = data.url;
        }
      } catch (err) {
        console.warn("Failed to refresh signed URL before download, using existing URL:", err);
      }
    }

    if (!downloadUrl) {
      showFeedback('error', 'Download Failed', 'Could not resolve a valid file URL.');
      return;
    }

    await downloadFromUrl(downloadUrl, fileName, mimeType);
  };

  // ✅ NEW: Download handler for the "Preview Inline" modal used for
  // submitted assignment files AND lesson/material files opened via the
  // Lesson Detail modal. Mirrors handleDownloadMaterial's signed-URL
  // refresh logic so downloads don't fail on expired tokens.
  const handleDownloadSubmittedFile = async (file: AssignmentFileUpload | null) => {
    if (!file) {
      showFeedback('error', 'No file', 'This file has no URL to download.');
      return;
    }
    const storagePath = file.storagePath || resolveStoragePathFromUrl(file.fileUrl);
    const bucketPath = (file as any).bucketPath;
    const fileName = file.fileName || "file";
    const mimeType = file.fileType || getMimeFromFileName(fileName);

    let downloadUrl = file.fileUrl || null;

    if (storagePath || bucketPath) {
      try {
        const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath: storagePath || bucketPath,
            classId: course?.id,
          }),
        });
        const data = await response.json();
        if (response.ok && data?.url) {
          downloadUrl = data.url;
        }
      } catch (err) {
        console.warn("Failed to refresh signed URL before download, using existing URL:", err);
      }
    }

    if (!downloadUrl) {
      showFeedback('error', 'Download Failed', 'Could not resolve a valid file URL.');
      return;
    }

    await downloadFromUrl(downloadUrl, fileName, mimeType);
  };

  const handleGenerateActivity = (assignment: AssignmentItem, silent = false) => {
    if (isGeneratingActivity) return;
    if (!canGenerateActivity(assignment)) {
      if (!silent) {
        const score = getScorePercent(assignment);
        if (score !== null && score >= 75) {
          showFeedback('error', 'Not available', 'Generate Activity is only available for graded assignments below 75%.');
        } else if (hasMasteredGeneratedActivity(assignment)) {
          const activityScore = getCompletedActivityScore(assignment);
          showFeedback('info', 'Already mastered', `You already scored ${activityScore?.scorePercent ?? 75}% or above on the generated follow-up activity for this assignment.`);
        } else {
          showFeedback('error', 'Not available', 'This assignment needs at least one teacher-selected related material.');
        }
      }
      return;
    }
    const relatedMaterials = getRelatedMaterials(assignment);
    setSelectedAssignment(null);
    onGenerateActivity?.({
      ...assignment,
      relatedMaterials,
      materialIds: relatedMaterials.map((m) => m.id),
    } as any);
    if (!silent) {
      showFeedback('success', 'Activity Generated', 'The activity will be generated from the related materials selected by the teacher.');
    }
  };

  // ✅ NEW: Fires once right when an assignment is opened (auto-open, card
  // tap, or notification click) so the student immediately sees the latest
  // teacher comments AND the latest assignment content (in case it was
  // edited/replaced while they weren't looking), instead of waiting up to
  // `autoRefreshIntervalMs` for the next poll. Mirrors Assignments.tsx.
  const refreshOnOpen = async (assignmentId: string) => {
    setIsRefreshingOpenedAssignment(true);
    try {
      await Promise.all([
        onRefreshComments?.(assignmentId),
        onRefreshCourseContent?.(),
      ]);
    } catch (error) {
      console.error('Refresh-on-open error:', error);
    } finally {
      setIsRefreshingOpenedAssignment(false);
    }
  };

  useEffect(() => {
    if (!autoOpenAssignmentId) return;
    if (autoHandledRef.current === autoOpenAssignmentId) return;
    const targetAssignment = safeCourse.assignments.find(
      (a) => a.id === autoOpenAssignmentId
    );
    if (!targetAssignment) {
      // ✅ FIXED: this used to call onConsumedAutoOpenAssignment?.() here
      // too, immediately discarding the auto-open request the moment the
      // assignment wasn't found — which, for a notification about a
      // brand-new assignment, was almost always the very first render
      // (the assignment hasn't landed in safeCourse.assignments yet). That
      // raced against every refresh mechanism below and meant clicking an
      // assignment notification would silently fail to open the modal.
      // Now we just wait: `safeCourse.assignments` is already a dependency
      // of this effect, so it re-runs and finds the assignment as soon as
      // a refresh brings it in (kicked off immediately below, then backed
      // up by the `autoRefreshIntervalMs` poll further down and by
      // StudentApp's own polling) — only actually consuming the request
      // once the assignment is truly found and opened.
      if (autoOpenRefreshRequestedRef.current !== autoOpenAssignmentId) {
        autoOpenRefreshRequestedRef.current = autoOpenAssignmentId;
        void onRefreshCourseContent?.();
      }
      return;
    }
    autoHandledRef.current = autoOpenAssignmentId;
    autoOpenRefreshRequestedRef.current = null;
    setActiveTab("assignments");
    setSelectedAssignment(targetAssignment as any);
    void refreshOnOpen(targetAssignment.id);
    onConsumedAutoOpenAssignment?.();
  }, [autoOpenAssignmentId, safeCourse.assignments, completedActivityScores]);

  // ✅ FIX (Assignment File flicker): the server re-signs every file URL on
  // each poll, so comparing `fileUrl` / JSON.stringify(files) made the sync
  // effect below think the assignment changed every few seconds and replace
  // selectedAssignment, re-rendering the Assignment File section. Compare
  // files by stable identity instead. When a storagePath/bucketPath exists the
  // URL is ignored on purpose — the viewer re-signs from that path when the
  // file is opened, so a stale URL is safe.
  const fileIdentity = (f: any) =>
    f?.storagePath || f?.bucketPath
      ? [f.id, f.fileName || f.name, f.fileType, f.storagePath || '', f.bucketPath || ''].join('|')
      : [f?.id, f?.fileName || f?.name, f?.fileType, f?.fileUrl || f?.fileUri || f?.uri || ''].join('|');
  const sameFileList = (a?: any[], b?: any[]) => {
    const x = (a || []).map(fileIdentity);
    const y = (b || []).map(fileIdentity);
    return x.length === y.length && x.every((v, i) => v === y[i]);
  };

  // ✅ NEW: Whenever `course` (the source of truth from StudentApp) changes —
  // which happens after onRefreshCourseContent() re-fetches joined classes —
  // keep the currently-OPEN selectedAssignment's fields (title, dueDate,
  // description, points, teacher file, etc.) in sync with the fresh data.
  // Without this, the modal would keep showing the stale snapshot it was
  // opened with even after a newer version loads in the background.
  useEffect(() => {
    if (!selectedAssignment) return;
    const freshMatch = safeCourse.assignments.find((a) => a.id === selectedAssignment.id);
    if (!freshMatch) return;
    setSelectedAssignment((prev) => {
      if (!prev) return prev;
      const sameContent =
        prev.title === (freshMatch as any).title &&
        prev.dueDate === (freshMatch as any).dueDate &&
        (prev as any).description === (freshMatch as any).description &&
        prev.points === (freshMatch as any).points &&
        prev.maxPoints === (freshMatch as any).maxPoints &&
        ((freshMatch as any).storagePath ? true : prev.fileUrl === (freshMatch as any).fileUrl) &&
        prev.storagePath === (freshMatch as any).storagePath &&
        prev.numberOfAttempts === (freshMatch as any).numberOfAttempts &&
        // ✅ FIX: without this, a teacher flipping "Disable repository after
        // due" WHILE a student already has the assignment open would never
        // reach selectedAssignment — every other field is unchanged, so the
        // old (unlocked) value stuck around and the lock silently never
        // applied for that open session.
        !!(prev as any).repositoryDisabledAfterDue === !!(freshMatch as any).repositoryDisabledAfterDue &&
        JSON.stringify(prev.materialIds || []) === JSON.stringify((freshMatch as any).materialIds || []) &&
        sameFileList((prev as any).files, (freshMatch as any).files);
      if (sameContent) return prev;
      return { ...(freshMatch as any) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeCourse.assignments]);

  // ✅ NEW: Freeze the Related Course Resources list for the OPEN assignment
  // modal to a memoized snapshot, keyed off the assignment's id + materialIds
  // — NOT off `safeCourse.materials` directly. `onRefreshCourseContent()`
  // (fired every `autoRefreshIntervalMs`, plus alongside fetchModules/
  // fetchSyllabus) hands back a brand-new `materials` array each poll even
  // when nothing actually changed, which made this section recompute and
  // visibly flash/reshuffle on every background refresh. Mirrors how
  // Assignments.tsx sources this list from the already-guarded
  // `selectedAssignment` snapshot instead of the live course data.
  //
  // ✅ FIX: the previous version keyed this memo ONLY off
  // `selectedAssignment?.id` + `materialIds`, so if the modal happened to be
  // opened (or the id/materialIds happened to change) while
  // `safeCourse.materials` was still empty/loading — e.g. right after
  // StudentApp's loadJoinedClasses() had reset it during a background
  // refresh — the section would freeze on an EMPTY result and never
  // recover, even once the real materials arrived a moment later. This is
  // the same "Related Course Resources disappears" bug reported for
  // Assignments.tsx, just manifesting as "gets stuck empty" here instead of
  // "flickers empty". A lightweight content fingerprint (ids/titles/URLs of
  // just the materials that actually match this assignment) lets the memo
  // recompute whenever the MATCHED materials truly change — appearing once
  // loaded, updating if the teacher edits one — while still ignoring the
  // no-op new-array-reference churn from every polling refresh.
  const relatedMaterialsContentKey = useMemo(() => {
    if (!selectedAssignment?.materialIds?.length) return "";
    return safeCourse.materials
      .filter((m) => selectedAssignment.materialIds?.includes(m.id))
      .map((m) => `${m.id}:${m.title}:${m.fileUrl || m.fileUri || ""}`)
      .join("|");
  }, [selectedAssignment?.materialIds, safeCourse.materials]);

  const selectedAssignmentRelatedMaterials = useMemo(() => {
    if (!selectedAssignment) return [];
    return getRelatedMaterials(selectedAssignment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignment?.id, relatedMaterialsContentKey]);

  // ✅ NEW: Same "freeze it to the open assignment" fix as
  // `selectedAssignmentRelatedMaterials` above, applied to the Follow-Up
  // Activity button's enabled/disabled state. `canGenerateActivity()` calls
  // `getRelatedMaterials()`, which filters the ever-changing `safeCourse.materials`
  // reference handed back by every `autoRefreshIntervalMs` poll — recomputing
  // that live on every render made the button (and its "must link related
  // materials" warning) flicker on/off every few seconds even when the
  // related materials hadn't actually changed. Deriving it from the already-
  // stable `selectedAssignmentRelatedMaterials` snapshot instead keeps it
  // steady, matching Assignments.tsx (which reads related materials off a
  // frozen per-assignment snapshot rather than the live course object).
  const canGenerateSelectedActivity = useMemo(() => {
    if (!selectedAssignment) return false;
    const score = getScorePercent(selectedAssignment);
    return (
      score !== null &&
      score < 75 &&
      selectedAssignmentRelatedMaterials.length > 0 &&
      !hasMasteredGeneratedActivity(selectedAssignment)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignment, selectedAssignmentRelatedMaterials]);

  // ✅ NEW: Silent background refresh — refetches submissions, comments for
  // the currently-open assignment, AND the underlying course/assignment
  // content (title, due date, description, points, teacher file) so a
  // teacher editing the assignment while the student has it open is
  // reflected automatically.
  const silentRefresh = async () => {
    try {
      await Promise.all([
        onRefreshSubmissions?.(),
        onRefreshCourseContent?.(),
        selectedAssignment ? onRefreshComments?.(selectedAssignment.id) : Promise.resolve(),
        // ✅ NEW: these two were previously fetched only once on mount, so a
        // teacher adding/editing a module, lesson, or syllabus never showed
        // up for a student who already had the screen open.
        fetchModules(true),
        fetchSyllabus(true),
      ]);
    } catch (error) {
      console.error('Auto-refresh error:', error);
    }
  };
  useEffect(() => {
    if (!autoRefreshIntervalMs || autoRefreshIntervalMs <= 0) return;
    const intervalId = setInterval(() => {
      if (isOverlayOpenRef.current) return; // paused — mid-interaction
      silentRefresh();
    }, autoRefreshIntervalMs);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignment?.id, autoRefreshIntervalMs]);


  // ✅ NEW: Manual pull-to-refresh handler shown on the main screen scroll
  // and the assignment detail modal's ScrollView.
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      await silentRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddComment = () => {
    if (!selectedAssignment || !newComment.trim()) return;
    onAddComment(selectedAssignment.id, newComment);
    setNewComment("");
  };

  const handleEditComment = async (commentId: string) => {
    if (!selectedAssignment || !editText.trim() || savingEdit) return;
    if (!onEditComment) {
      showFeedback('error', 'Not Available', 'Edit functionality is not available.');
      return;
    }
    try {
      setSavingEdit(true);
      await onEditComment(selectedAssignment.id, commentId, editText);
      setEditingCommentId(null);
      setEditText('');
    } catch (error: any) {
      showFeedback('error', 'Edit Failed', error?.message || 'Unable to update comment.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!selectedAssignment) return;
    if (!onDeleteComment) {
      showFeedback('error', 'Not Available', 'Delete functionality is not available.');
      return;
    }
    setCommentToDeleteId(commentId);
    setDeleteModalVisible(true);
    closeMenu();
  };

  const confirmDeleteComment = async () => {
    if (!selectedAssignment || !commentToDeleteId || !onDeleteComment) return;
    try {
      setIsDeletingComment(true);
      await onDeleteComment(selectedAssignment.id, commentToDeleteId);
    } catch (error: any) {
      showFeedback('error', 'Delete Failed', error?.message || 'Unable to delete comment.');
    } finally {
      setIsDeletingComment(false);
      setDeleteModalVisible(false);
      setCommentToDeleteId(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;
    if (!course?.id) {
      showFeedback('error', 'No class', 'This assignment is not connected to a class.');
      return;
    }
    try {
      setIsUploadingFile(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        base64: Platform.OS === "web",
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const fileBase64 = await readPickedFileBase64(file);
        if (!fileBase64) throw new Error("Unable to read selected file.");
        const uploadResponse = await apiFetch(`${API_BASE_URL}/upload-class-file`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            classId: course.id,
            fileBase64,
            fileName: file.name || "submission-file",
            fileType: file.mimeType || "application/octet-stream",
            kind: "submission",
          }),
        });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) throw new Error(uploadData?.error || "Failed to upload file.");
        onAddFile(selectedAssignment.id, {
          id: `f${Date.now()}`,
          fileName: uploadData?.data?.fileName || file.name || "file",
          fileSize: getDisplayFileSize(file.size),
          uploadedDate: new Date().toLocaleString(),
          fileUrl: uploadData?.data?.fileUrl,
          fileType: uploadData?.data?.fileType || file.mimeType,
          storagePath: uploadData?.data?.storagePath,
          bucketPath: uploadData?.data?.bucketPath,
          isSubmitted: false,
          source: "student",
        });
      }
    } catch (error: any) {
      showFeedback('error', 'Upload failed', error?.message || 'Could not upload the selected file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const normalizeSubmissionLink = (value: string) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleAddLinkSubmission = () => {
    if (!selectedAssignment) return;
    const linkUrl = normalizeSubmissionLink(submissionLink);
    if (!linkUrl) {
      showFeedback('error', 'Missing link', 'Please paste a submission link first.');
      return;
    }
    onAddFile(selectedAssignment.id, {
      id: `link-${Date.now()}`,
      fileName: "Submitted link",
      fileSize: "Link submission",
      uploadedDate: new Date().toLocaleString(),
      fileUrl: undefined,
      linkUrl: linkUrl,
      fileType: "text/uri-list",
      isSubmitted: false,
      source: "student",
    });
    setSubmissionLink("");
  };

  const closeAssignmentModal = () => {
    setSelectedAssignment(null);
    setNewComment("");
    setSubmissionLink("");
    setEditingCommentId(null);
    setEditText("");
    setOpenMenuCommentId(null);
    setMenuPosition(null);
    setDeleteModalVisible(false);
    setCommentToDeleteId(null);
    setIsDeletingComment(false);
    setSubmitConfirmVisible(false);
  };

  const isAssignmentSubmitted = (assignment?: AssignmentItem | null) =>
    assignment?.status === "submitted" || assignment?.status === "graded" || assignment?.status === "late";

  const isAssignmentGraded = (assignment?: AssignmentItem | null) =>
    assignment?.status === "graded";

  // Single source of truth for "the student's own items" (files + links).
  // Used for the Your Uploads list, the submit-confirmation count, and the
  // actual submit, so they can never disagree.
  const isTeacherFile = (file: AssignmentFileUpload) =>
    (file as any)?.source === "teacher" || !!(file.id && file.id.startsWith("teacher-file-"));

  const getSubmittedFiles = (assignment?: AssignmentItem | null) => {
    if (!assignment) return [];
    return (assignmentFiles[assignment.id] || []).filter((file) => !isTeacherFile(file));
  };

  const getTeacherAssignmentFiles = (assignment?: AssignmentItem | null) => {
    if (!assignment) return [];
    const mappedFiles = (assignment.files || [])
      .filter((file: any) => {
        const isStudentSubmission =
          file.source === 'student' ||
          file.submissionId ||
          file.isSubmitted === true ||
          (file.id && file.id.startsWith('f'));
        return !isStudentSubmission;
      })
      .map((file: any, index) => ({
        id: file.id || `teacher-file-${assignment.id}-${index}`,
        fileName: file.fileName || file.name || "Assignment attachment",
        fileSize: file.fileSize || "Teacher file",
        uploadedDate: file.uploadedDate || file.uploadedAt || "Attached by teacher",
        fileUrl: file.fileUrl || file.fileUri || file.uri || file.downloadUrl || null,
        fileType: file.fileType,
        storagePath: file.storagePath || null,
        bucketPath: file.bucketPath || null,
        source: "teacher" as const,
      }));
    const topLevelUrl = getAssignmentFileUrl(assignment);
    if (topLevelUrl) {
      // ✅ FIX: dedupe by storagePath / file name too. Signed URLs differ on
      // every fetch, so a URL-only match made the "main" card randomly
      // appear/disappear (or duplicate) between polls.
      const topStoragePath = (assignment as any)?.storagePath || (assignment as any)?.bucketPath || null;
      const topFileName = getAssignmentFileName(assignment);
      const alreadyIncluded = mappedFiles.some(
        (f) =>
          f.fileUrl === topLevelUrl ||
          (!!topStoragePath && (f.storagePath === topStoragePath || f.bucketPath === topStoragePath)) ||
          (!!topFileName && f.fileName === topFileName)
      );
      if (!alreadyIncluded) {
        mappedFiles.unshift({
          id: `teacher-file-${assignment.id}-main`,
          fileName: getAssignmentFileName(assignment),
          fileSize: "Teacher file",
          uploadedDate: "Attached by teacher",
          fileUrl: topLevelUrl,
          fileType: (assignment as any)?.fileType || (assignment as any)?.attachmentType,
          storagePath: (assignment as any)?.storagePath || null,
          bucketPath: (assignment as any)?.bucketPath || null,
          source: "teacher" as const,
        });
      }
    }
    return mappedFiles;
  };

  // ✅ FIX (Assignment File flicker): freeze the "Assignment File" list to a
  // memoized snapshot keyed by stable file identity (ids/paths/names — NOT
  // re-signed URLs), the same way `selectedAssignmentRelatedMaterials` is
  // frozen above. Every 5s poll hands back new assignment/file object
  // references; rebuilding this list from them on each render made the section
  // re-map (and remount) even though nothing about the files had changed.
  const teacherFilesContentKey = useMemo(() => {
    if (!selectedAssignment) return "";
    const list = ((selectedAssignment as any).files || []) as any[];
    return [
      list.map(fileIdentity).join(","),
      (selectedAssignment as any).storagePath || (selectedAssignment as any).bucketPath || selectedAssignment.fileUrl || "",
      (selectedAssignment as any).fileName || "",
    ].join("#");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignment]);

  const selectedAssignmentTeacherFiles = useMemo(() => {
    if (!selectedAssignment) return [];
    return getTeacherAssignmentFiles(selectedAssignment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAssignment?.id, teacherFilesContentKey]);

  const syncSelectedAssignmentStatus = (status: AssignmentItem["status"]) => {
    if (!selectedAssignment) return;
    setSelectedAssignment((prev) => (prev ? { ...prev, status } : prev));
    onUpdateAssignmentStatus?.(selectedAssignment.id, status);
  };

  // ✅ UPDATED: Multi-file submission logic matching Assignments.tsx
  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !course?.id) return;
    if (isAssignmentSubmitted(selectedAssignment)) return;
    if (isSubmissionLocked(selectedAssignment)) {
      showFeedback(
        'error',
        'Submission Closed',
        'The due date for this assignment has passed and your teacher has turned off late submissions. This assignment can no longer accept work.'
      );
      return;
    }
    if (!currentStudent?.studentId) {
      showFeedback('error', 'Missing student', 'Student account information is missing. Please sign in again.');
      return;
    }
    // ✅ FIX (mirrors Assignments.tsx): Only ever submit the student's OWN
    // items. `assignmentFiles` should already contain just student-added
    // files/links, but if a teacher-attached file ever ends up mixed into
    // this array (e.g. across an unsubmit -> edit -> resubmit cycle), it
    // must not slip through here — otherwise it gets duplicated and
    // re-uploaded as if it were a new student submission item. This mirrors
    // the same `source !== 'teacher'` guard that getSubmittedFiles() already
    // applies for display, plus an id-prefix check as a second safety net
    // since teacher files are also stamped with a `teacher-file-...` id.
    const files = getSubmittedFiles(selectedAssignment);
    if (files.length === 0) {
      showFeedback('error', 'No files', 'Please upload at least one file or link before submitting.');
      return;
    }
    try {
      setIsSubmittingAssignment(true);
      const studentName = `${currentStudent.firstName || ""} ${currentStudent.lastName || ""}`.trim();
      const regularFiles = files.filter(file => {
        const isLink = file.fileType === 'text/uri-list' || !!file.linkUrl;
        return !isLink && (!!file.fileUrl || !!file.storagePath);
      });
      const linkItems = files
        .filter(file => (file.fileType === 'text/uri-list' || !!file.linkUrl) && !!file.linkUrl)
        .map(file => ({
          // Reuse the server's own id for an already-confirmed link so it
          // keeps the exact same identity on resubmit; a brand-new link
          // falls back to its local id, which the server treats as the seed
          // for a new persistent id. See Assignments.tsx for the full
          // explanation of why links need a stable id the same way files do.
          id: file.linkId || file.id,
          url: file.linkUrl!.trim(),
        }));
      if (regularFiles.length === 0 && linkItems.length === 0) {
        throw new Error('No valid items were found. Please check your uploads.');
      }
      const submissionItems = regularFiles.map(file => ({
        id: file.id,
        fileName: file.fileName,
        fileUrl: file.fileUrl || null,
        linkUrl: null,
        fileType: file.fileType || 'application/octet-stream',
        storagePath: file.storagePath || null,
        bucketPath: file.bucketPath || null,
      }));
      const response = await apiFetch(`${API_BASE_URL}/create-submission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: course.id,
          assignmentId: selectedAssignment.id,
          studentUid: currentStudent.authUid || null,
          studentId: currentStudent.studentId,
          studentName,
          status: "submitted",
          score: null,
          feedback: null,
          submissions: submissionItems,
          linkUrls: linkItems.length > 0 ? linkItems : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to submit assignment.");
      syncSelectedAssignmentStatus(isPastDueDate(selectedAssignment.dueDate) ? "late" : "submitted");
      await onRefreshSubmissions?.();
      const totalItems = submissionItems.length + linkItems.length;
      showFeedback('success', 'Success', `Submitted ${totalItems} item(s) successfully.`);
    } catch (error: any) {
      showFeedback('error', 'Submit Failed', error?.message || 'Unable to submit assignment.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleUnsubmitAssignment = async () => {
    if (!selectedAssignment || !course?.id) return;
    if (selectedAssignment.status === "graded") {
      showFeedback('error', 'Already graded', 'This assignment has already been graded and cannot be unsubmitted.');
      return;
    }
    if (!currentStudent?.studentId) {
      showFeedback('error', 'Missing student', 'Student account information is missing. Please sign in again.');
      return;
    }
    try {
      setIsSubmittingAssignment(true);
      const response = await apiFetch(`${API_BASE_URL}/unsubmit-assignment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: course.id,
          assignmentId: selectedAssignment.id,
          studentUid: currentStudent.authUid || null,
          studentId: currentStudent.studentId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to unsubmit assignment.");
      syncSelectedAssignmentStatus("pending");
      await onRefreshSubmissions?.();
      showFeedback('success', 'Unsubmitted', 'Your file is still attached. You can edit it and submit again.');
    } catch (error: any) {
      showFeedback('error', 'Unsubmit Failed', error?.message || 'Unable to unsubmit assignment.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  // 🌟 UPDATED: was previously counting `classSubmissions` docs via
  // /student-submissions/:studentId, but a student only ever has ONE
  // submission doc per assignment (it gets upserted), so that count could
  // only ever read 0 or 1 — it never reflected how many times the game had
  // actually been played. Now reads from the real per-attempt record
  // instead (mirrors Assignments.tsx's fetchGameAttempts), which also
  // tells us whether a final score has already been chosen for this
  // assignment, and whether that pick was automatic.
  const fetchGameAttempts = async (assignmentId: string) => {
    if (!currentStudent?.studentId) return;
    setIsLoadingAttempts((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      const response = await apiFetch(`${API_BASE_URL}/game-ai/attempts/${assignmentId}`);
      const data = await response.json();
      if (response.ok) {
        const attempts = Array.isArray(data.attempts) ? data.attempts : [];
        setGameAttempts((prev) => ({ ...prev, [assignmentId]: attempts.length }));
        setSelectedGameAttemptIds((prev) => ({ ...prev, [assignmentId]: data.selectedAttemptId || null }));
        setAutoFinalizedGameAssignments((prev) => ({ ...prev, [assignmentId]: !!data.selectedAutomatically }));
      }
    } catch (error) {
      console.error("Error fetching game attempts:", error);
    } finally {
      setIsLoadingAttempts((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  const getRemainingAttempts = (assignment: AssignmentItem) => {
    const used = gameAttempts[assignment.id] || 0;
    const max =
      assignment.numberOfAttempts === "unlimited"
        ? Infinity
        : parseInt(assignment.numberOfAttempts || "1");
    return max - used;
  };

  const canPlayGame = (assignment: AssignmentItem) => {
    if (isPastDueDate(assignment.dueDate)) return false;
    return getRemainingAttempts(assignment) > 0;
  };

  // Distinguishes *why* play is blocked so the feedback/button can say the
  // right thing — "past due" vs "no attempts left" — instead of always
  // reporting the same generic reason.
  const getPlayGameBlockedReason = (assignment: AssignmentItem): 'past_due' | 'no_attempts' | null => {
    if (isPastDueDate(assignment.dueDate)) return 'past_due';
    if (getRemainingAttempts(assignment) <= 0) return 'no_attempts';
    return null;
  };

  const handlePlayGameWithAttemptCheck = (assignment: AssignmentItem) => {
    const blockedReason = getPlayGameBlockedReason(assignment);
    if (blockedReason === 'past_due') {
      showFeedback('error', 'Assignment Past Due', 'This game-based assignment is past its due date and can no longer be played.');
      return;
    }
    if (blockedReason === 'no_attempts') {
      showFeedback('error', 'No Attempts Remaining', 'You have used all your attempts for this game-based assignment.');
      return;
    }
    onPlayGame?.(assignment);
  };

  const handleViewSyllabus = async () => {
    if (!currentSyllabus?.id) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/course-syllabus/view/${currentSyllabus.id}`);
      const data = await res.json();
      if (res.ok && data.url) {
        setSyllabusViewerUrl(data.url);
      } else {
        showFeedback('error', 'Error', 'Failed to load syllabus preview.');
      }
    } catch (e) {
      showFeedback('error', 'Error', 'Failed to load syllabus preview.');
    }
  };

  // ✅ CHANGED: on web, download the syllabus through our own
  // "/course-syllabus/download/:id" endpoint (same origin as the rest of the
  // API) instead of fetching the raw Firebase/GCS signed URL directly. A GCS
  // signed URL has no Content-Disposition: attachment header and needs the
  // bucket's CORS config to allow a cross-origin fetch(); when that fetch
  // failed, the code fell back to a plain link click, and the browser opened
  // the file (leaving the app) instead of downloading it. The new endpoint
  // is same-origin to the API and always sets the attachment header, so the
  // browser saves the file instead — same in-app result as Lesson/Module
  // Inline Preview downloads.
  // Native keeps using a signed URL (FileSystem.downloadAsync can't carry
  // the session cookie our "requireAuth" endpoint needs) + expo-sharing,
  // which already behaves like an in-app download/share.
  const handleDownloadSyllabus = async () => {
    if (!currentSyllabus?.id) {
      showFeedback('error', 'No file', 'This course has no syllabus to download.');
      return;
    }

    const fileName = currentSyllabus?.fileName || 'Course Syllabus';
    const mimeType = currentSyllabus?.fileType || getMimeFromFileName(fileName);

    if (Platform.OS === 'web') {
      await downloadFromUrl(
        `${API_BASE_URL}/course-syllabus/download/${currentSyllabus.id}`,
        fileName,
        mimeType,
        { credentials: 'include' }
      );
      return;
    }

    const storagePath =
      currentSyllabus?.storagePath ||
      currentSyllabus?.bucketPath ||
      resolveStoragePathFromUrl(syllabusViewerUrl || currentSyllabus?.fileUrl);

    let downloadUrl: string | null = syllabusViewerUrl || currentSyllabus?.fileUrl || null;

    if (storagePath) {
      try {
        const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storagePath,
            classId: course?.id,
          }),
        });
        const data = await response.json();
        if (response.ok && data?.url) {
          downloadUrl = data.url;
        }
      } catch (err) {
        console.warn("Failed to refresh signed URL before download, using existing URL:", err);
      }
    }

    // Fallback: same endpoint the preview uses, in case we still don't have
    // a usable URL (e.g. no storagePath on record and nothing cached yet).
    if (!downloadUrl) {
      try {
        const res = await apiFetch(`${API_BASE_URL}/course-syllabus/view/${currentSyllabus.id}`);
        const data = await res.json();
        if (res.ok && data?.url) {
          downloadUrl = data.url;
        }
      } catch (err) {
        console.warn("Fallback syllabus URL fetch failed:", err);
      }
    }

    if (!downloadUrl) {
      showFeedback('error', 'Download Failed', 'Could not resolve a valid file URL.');
      return;
    }

    await downloadFromUrl(downloadUrl, fileName, mimeType);
  };

  const toggleLessonSelected = (lessonId: string) =>
    setSelectedLessonIds((prev) => ({ ...prev, [lessonId]: !prev[lessonId] }));

  const setLessonsSelected = (lessonIds: string[], value: boolean) =>
    setSelectedLessonIds((prev) => {
      const next = { ...prev };
      lessonIds.forEach((id) => { next[id] = value; });
      return next;
    });

  // Downloads the ticked lessons of one module: a single .docx, or a .zip for several.
  const handleDownloadSelectedLessons = async (mod: any, lessonIds: string[]) => {
    if (lessonIds.length === 0 || downloadingLessonsModuleId) return;
    setDownloadingLessonsModuleId(mod.id);
    try {
      const response = await apiFetch(`${API_BASE_URL}/course-lessons/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonIds, zipName: `Module ${mod.moduleNumber} - Lessons` }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) {
        showFeedback('error', 'Download failed', data?.error || 'Could not prepare the download. Please try again.');
        return;
      }
      await openDownloadUrl(data.url);
      const skipped: string[] = Array.isArray(data.skipped) ? data.skipped : [];
      if (skipped.length > 0) {
        showFeedback('info', 'Some lessons were skipped', `Not included: ${skipped.join(', ')}`);
      } else {
        showFeedback('success', 'Download started', data.count > 1 ? `${data.count} lessons downloaded as a .zip.` : 'Lesson downloaded.');
      }
    } catch (err) {
      console.warn('Lesson download failed:', err);
      showFeedback('error', 'Download failed', 'Could not prepare the download. Please try again.');
    } finally {
      setDownloadingLessonsModuleId(null);
    }
  };

  const handleOpenLessonDetail = async (lesson: any) => {
    setSasPreviewFailedFor(null);
    setSelectedLesson(lesson);
    setLessonDetailModalVisible(true);
    setIsLessonLoading(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/course-lessons/${lesson.id}`);
      if (response.ok) {
        const result = await response.json();
        const freshData = result.data;
        setSelectedLesson({
          ...freshData,
          fileUrl: freshData.fileUrl || lesson.fileUrl
        });
      } else {
        console.warn("Failed to fetch fresh lesson details, using cached data.");
      }
    } catch (error) {
      console.error("Failed to load lesson details:", error);
    } finally {
      setIsLessonLoading(false);
    }
  };

  useEffect(() => {
    if (!autoOpenLessonId) return;
    if (autoLessonHandledRef.current === autoOpenLessonId) return;

    const targetMaterial = safeCourse.materials.find((m) => m.id === autoOpenLessonId);

    if (targetMaterial) {
      autoLessonHandledRef.current = autoOpenLessonId;
      setActiveTab("modules");
      handleOpenLessonDetail(targetMaterial);
      onConsumedAutoOpenLesson?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenLessonId, safeCourse.materials]);

  const renderMaterialItem = ({
    item,
  }: {
    item: AssignmentCourse["materials"][number];
  }) => (
    <TouchableOpacity
      style={styles.materialCard}
      activeOpacity={0.85}
      onPress={() => handleOpenMaterialPreview(item)}
    >
      <View style={styles.materialIcon}>
        <Ionicons name={getMaterialIconName(item.type)} size={24} color="#8B0000" />
      </View>
      <View style={styles.materialInfo}>
        <Text style={styles.materialTitle}>{item.title}</Text>
        <Text style={styles.materialType}>
          {item.type.charAt(0).toUpperCase() + item.type.slice(1)} • {item.uploadedDate}
        </Text>
        {!!item.fileName && (
          <Text style={styles.materialFileName} numberOfLines={1}>
            {item.fileName}
          </Text>
        )}
        {isPresentationFile(item.fileName, (item as any).fileType) &&
          !!(item as any).pdfUrl && (
            <View style={styles.pdfPreviewBadge}>
              <Ionicons name="eye-outline" size={11} color="#1565C0" />
              <Text style={styles.pdfPreviewBadgeText}>Preview available</Text>
            </View>
          )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#BBB" />
    </TouchableOpacity>
  );

  // ── Assignments layout ────────────────────────────────────────────────
  // Same grid math as Assignments.tsx (min card width 320, up to 3 columns,
  // 14px gap) — with one difference in how the numbers are rounded.
  //
  // `contentContainer` is `width: 94%`, so the measured grid width is very
  // often fractional (e.g. 1353.6px). Assignments.tsx never hits this because
  // its width is (window width − fixed padding), i.e. a whole number. If the
  // width is ROUNDED UP (1353.6 → 1354) and the cells are sized off that
  // number, 3 cells + 2 gaps end up a fraction of a pixel wider than the real
  // row, so the 3rd card wraps and the grid drops to 2 columns. So both the
  // measured width and each cell width are floored: the row can then never be
  // wider than its container.
  const ASSIGNMENT_GAP = 14;
  const ASSIGNMENT_MIN_CARD_WIDTH = 320;
  const assignmentAvailableWidth =
    assignmentGridWidth > 0 ? assignmentGridWidth : Math.floor(Math.min(width * 0.94, 1600));
  const assignmentColumns = Math.max(
    1,
    Math.min(3, Math.floor((assignmentAvailableWidth + ASSIGNMENT_GAP) / (ASSIGNMENT_MIN_CARD_WIDTH + ASSIGNMENT_GAP)))
  );
  const assignmentCellWidth =
    assignmentColumns === 1
      ? "100%"
      : Math.floor((assignmentAvailableWidth - ASSIGNMENT_GAP * (assignmentColumns - 1)) / assignmentColumns);

  // On web the browser can work out the columns itself, so nothing has to be
  // measured (measuring is what left the first render stuck on 2 columns until
  // the filter forced a re-layout). CSS grid: as many columns as fit at >=320px,
  // capped at 3 — the `- 1px` keeps the 3-column case off the exact rounding
  // boundary. Native (no CSS grid) keeps the measured flex-wrap layout above.
  const useCssGrid = Platform.OS === "web";
  const assignmentGridStyle: any = useCssGrid
    ? {
        display: "grid",
        gap: ASSIGNMENT_GAP,
        gridTemplateColumns: `repeat(auto-fill, minmax(max(${ASSIGNMENT_MIN_CARD_WIDTH}px, calc((100% - ${ASSIGNMENT_GAP * 2}px) / 3 - 1px)), 1fr))`,
      }
    : { flexDirection: "row", flexWrap: "wrap", gap: ASSIGNMENT_GAP };

  const allAssignments = safeCourse.assignments as any[];
  const assignmentCounts = allAssignments.reduce(
    (acc: Record<string, number>, a) => {
      const st = getDisplayStatus(a);
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    },
    {}
  );
  const filteredAssignments =
    assignmentFilter === "all"
      ? allAssignments
      : allAssignments.filter((a) => getDisplayStatus(a) === assignmentFilter);
  // Same option order as Assignments.tsx
  const ASSIGNMENT_FILTERS: ("all" | DisplayStatus)[] = ["all", "pending", "submitted", "late", "graded", "missing"];
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  const renderAssignmentItem = ({ item }: { item: AssignmentItem }) => {
    const percent = getScorePercent(item);
    const recommendationLabel = getRecommendationLabel(item);
    const displayStatus = getDisplayStatus(item);
    const accent = STATUS_ACCENT[displayStatus] || "#999";
    const isGame = item.assignmentType === "game_based";
    const closed = isSubmissionLocked(item) && !isAssignmentSubmitted(item);
    const relDue =
      displayStatus === "pending" || displayStatus === "missing"
        ? formatRelativeDue(item.dueDate)
        : null;
    const relColor = relDue ? (relDue.overdue ? "#C62828" : relDue.soon ? "#E65100" : "#666") : "#666";
    const pointsLabel =
      percent !== null
        ? `${item.points}/${item.maxPoints} pts · ${percent}%`
        : item.maxPoints
        ? `${item.maxPoints} pts`
        : null;
    const scoreColor = percent === null ? "#999" : percent >= 75 ? "#2E7D32" : percent >= 60 ? "#F57C00" : "#C62828";
    const instruction = (item as any).description || item.topic;

    return (
      <HoverPressable
        style={[styles.assignmentCard, { borderLeftColor: accent }]}
        hoverStyle={styles.assignmentCardHover}
        onPress={() => {
          setSelectedAssignment(item);
          if (item.assignmentType === "game_based") fetchGameAttempts(item.id);
          // ✅ NEW: immediately pull the latest comments + assignment
          // content the moment the student opens this assignment.
          void refreshOnOpen(item.id);
        }}
      >
        <View style={styles.assignmentHeader}>
          <View style={[styles.assignmentIconTile, { backgroundColor: `${accent}1F` }]}>
            <Ionicons name={STATUS_ICON[displayStatus] as any} size={20} color={accent} />
          </View>
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentTitle} numberOfLines={2}>{item.title}</Text>
            {!!instruction && (
              <Text style={styles.assignmentTopicText} numberOfLines={2}>
                Instruction: {instruction}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(displayStatus) }]}>
            <Text style={[styles.statusText, { color: getStatusTextColor(displayStatus) }]}>
              {displayStatus}
            </Text>
          </View>
        </View>

        <View style={styles.assignmentPillRow}>
          {!!item.dueDate && (
            <View style={styles.assignmentPill}>
              <Ionicons name="calendar-outline" size={12} color="#666" />
              <Text style={styles.assignmentPillText}>{formatDueDateForDisplay(item.dueDate)}</Text>
            </View>
          )}
          {!!pointsLabel && (
            <View style={styles.assignmentPill}>
              <Ionicons name="star-outline" size={12} color="#666" />
              <Text style={styles.assignmentPillText}>{pointsLabel}</Text>
            </View>
          )}
          {isGame && (
            <View style={styles.assignmentPill}>
              <Ionicons name="game-controller-outline" size={12} color="#666" />
              <Text style={styles.assignmentPillText}>Game-based</Text>
            </View>
          )}
          {closed && (
            <View style={[styles.assignmentPill, { backgroundColor: "#FDECEA" }]}>
              <Ionicons name="lock-closed-outline" size={12} color="#B71C1C" />
              <Text style={[styles.assignmentPillText, { color: "#B71C1C" }]}>Submissions closed</Text>
            </View>
          )}
        </View>

        {percent !== null && (
          <View style={styles.scoreTrack}>
            <View
              style={[
                styles.scoreFill,
                { width: `${Math.max(0, Math.min(100, percent))}%`, backgroundColor: scoreColor },
              ]}
            />
          </View>
        )}

        {hasMasteredGeneratedActivity(item) ? (
          <View style={styles.masteredActivityBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#2E7D32" />
            <Text style={styles.masteredActivityText}>
              Follow-up mastered ({getCompletedActivityScore(item)?.scorePercent}%)
            </Text>
          </View>
        ) : recommendationLabel ? (
          <View
            style={[
              styles.recommendationBadge,
              { backgroundColor: `${getRecommendationColor(item)}18` },
            ]}
          >
            <Text style={[styles.recommendationText, { color: getRecommendationColor(item) }]}>
              {recommendationLabel}
            </Text>
          </View>
        ) : null}

        <View style={styles.assignmentFooter}>
          {relDue ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}>
              <Ionicons name="time-outline" size={13} color={relColor} />
              <Text style={[styles.assignmentRelDue, { color: relColor }]} numberOfLines={1}>
                {relDue.label}
              </Text>
            </View>
          ) : (
            <View />
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Text style={styles.assignmentViewText}>View details</Text>
            <Ionicons name="chevron-forward" size={14} color="#8B0000" />
          </View>
        </View>
      </HoverPressable>
    );
  };

  const courseYear = (safeCourse as any).year || (safeCourse as any).yearLevel || (safeCourse as any).level || "";
  const courseSection = safeCourse.section || "";
  const courseSemester = safeCourse.semester || "";
  const courseSchoolYear = safeCourse.schoolYear || "";
  const courseCode = safeCourse.code || (safeCourse as any).courseCode || "";
  const courseBannerUri =
    !bannerLoadFailed
      ? signedBannerUrl || (safeCourse as any).bannerUrl || (safeCourse as any).bannerUri || null
      : null;
  const courseSchedule: ClassScheduleEntry[] = Array.isArray((safeCourse as any).schedule)
    ? (safeCourse as any).schedule
    : [];

  const pad = (n: number) => String(n).padStart(2, "0");

  const formatScheduleTime = (time: string) => {
    if (!time) return "";
    const [hourStr, minuteStr] = time.split(":");
    let hour = parseInt(hourStr, 10);
    if (Number.isNaN(hour)) return time;
    const period = hour >= 12 ? "PM" : "AM";
    hour = hour % 12 || 12;
    return `${hour}:${pad(parseInt(minuteStr, 10) || 0)} ${period}`;
  };

  const DAY_ABBREVIATIONS: Record<string, string> = {
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
    Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
  };

  const formatScheduleBlock = (entry: ClassScheduleEntry) => {
    const days = (entry.days || []).map((d) => DAY_ABBREVIATIONS[d] || d).join(", ");
    const time = `${formatScheduleTime(entry.startTime)} - ${formatScheduleTime(entry.endTime)}`;
    return { days, time, room: entry.room || "" };
  };
  const selectedMaterialUrl = getMaterialUrl(selectedMaterial);
  const selectedMaterialPdfUrl = getMaterialPdfPreviewUrl(selectedMaterial);
  const useInlineViewer = shouldUseInlineViewer(selectedMaterial);
  const isPresentation = isPresentationFile(
    selectedMaterial?.fileName,
    (selectedMaterial as any)?.fileType
  );
  const isShowingPdfPreview = isPresentation && !!selectedMaterialPdfUrl;

  if (!course) {
    return (
      <View style={styles.emptyScreen}>
        <Text style={styles.emptyScreenTitle}>No course selected</Text>
        <Text style={styles.emptyScreenText}>
          Open a class from Dashboard or Classes to view its details.
        </Text>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.emptyBackButton}>
            <Text style={styles.emptyBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Comments block is rendered once and placed by the layout below:
  // inside the left column on large screens, under "Your work" on mobile.
  const gcCommentsBlock = selectedAssignment ? (
    <>
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Comments</Text>
                      {(assignmentComments[selectedAssignment.id] || []).length > 0 ? (
                        <View>
                          {(assignmentComments[selectedAssignment.id] || []).map((comment) => {
                            const isEditing = editingCommentId === comment.id;
                            const canManage = canManageComment(comment);
                            return (
                              <View
                                key={comment.id}
                                style={[
                                  styles.commentItem,
                                  comment.isInstructor && styles.instructorComment,
                                ]}
                              >
                                <View style={styles.commentHeader}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'space-between' }}>
                                    <Text style={styles.commentAuthor}>{comment.author}</Text>
                                    {comment.isInstructor && (
                                      <Text style={styles.teacherBadge}>Instructor</Text>
                                    )}
                                  </View>
                                  {canManage && (
                                    <View
                                      ref={(ref: any) => {
                                        if (ref) buttonRefs[0] = { ...buttonRefs[0], [comment.id]: ref };
                                      }}
                                    >
                                      <TouchableOpacity
                                        onPress={(e) => handleMenuPress(comment.id, e)}
                                        style={styles.commentMenuBtn}
                                      >
                                        <MaterialCommunityIcons name="dots-vertical" size={20} color="#606060" />
                                      </TouchableOpacity>
                                    </View>
                                  )}
                                </View>
                                {isEditing ? (
                                  <View style={styles.editRow}>
                                    <TextInput
                                      value={editText}
                                      onChangeText={setEditText}
                                      style={styles.editInput}
                                      placeholderTextColor="#888"
                                      autoFocus
                                      multiline
                                    />
                                    <View style={styles.editActionsRow}>
                                      <TouchableOpacity
                                        onPress={() => { setEditingCommentId(null); setEditText(''); }}
                                        style={styles.editCancelBtn}
                                      >
                                        <Text style={styles.editCancelText}>Cancel</Text>
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => handleEditComment(comment.id)}
                                        style={[styles.editSaveBtn, savingEdit && styles.commentPostBtnDisabled]}
                                        disabled={savingEdit}
                                      >
                                        <Text style={styles.editSaveText}>{savingEdit ? 'Saving...' : 'Save'}</Text>
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                ) : (
                                  <Text style={styles.commentContent}>{comment.content}</Text>
                                )}
                                <Text style={styles.commentTime}>{comment.timestamp}</Text>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No comments yet</Text>
                      )}
                      <View style={styles.commentInputContainer}>
                        <TextInput
                          style={styles.commentInput}
                          placeholder="Add a comment..."
                          placeholderTextColor="#999"
                          value={newComment}
                          onChangeText={setNewComment}
                          multiline
                        />
                        <TouchableOpacity
                          style={[
                            styles.sendButton,
                            !newComment.trim() && styles.sendButtonDisabled,
                          ]}
                          disabled={!newComment.trim()}
                          onPress={handleAddComment}
                        >
                          <Text style={styles.sendButtonText}>Send</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
    </>
  ) : null;

  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.screenScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={['#8B0000']} tintColor="#8B0000" />
      }
    >
      {/* ── Course Header (Google Classroom–style banner) ── */}
      <View style={styles.courseHeaderWrap}>
        <View style={[styles.bannerBox, { height: isLargeScreen ? 224 : 168 }]}>
          {courseBannerUri ? (
            <ExpoImage
              source={{ uri: courseBannerUri }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              transition={200}
              onError={() => setBannerLoadFailed(true)}
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.bannerFallback]} />
          )}
          <View style={styles.bannerScrim} />

          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButtonOnBanner}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
          )}

          <View style={[styles.bannerTextBlock, { paddingHorizontal: isLargeScreen ? 60 : 16 }]}>
            <Text
              style={[styles.courseNameOnBanner, { fontSize: isSmallPhone ? 22 : 30 }]}
              numberOfLines={2}
            >
              {safeCourse.name}
            </Text>
            <Text style={styles.courseInstructorOnBanner} numberOfLines={1}>
              {safeCourse.instructor || "No Instructor"}
            </Text>
          </View>
        </View>

        {/* Thin meta strip directly under the banner, Classroom-style */}
        <View style={[styles.metaStrip, { paddingHorizontal: isLargeScreen ? 60 : 16 }]}>
          <View style={styles.metaChipsRow}>
            {!!courseYear && (
              <View style={styles.metaChip}>
                <Ionicons name="school-outline" size={13} color="#5F6368" />
                <Text style={styles.metaChipText} numberOfLines={1}>{courseYear}</Text>
              </View>
            )}
            {!!courseSection && (
              <View style={styles.metaChip}>
                <Ionicons name="people-outline" size={13} color="#5F6368" />
                <Text style={styles.metaChipText} numberOfLines={1}>{courseSection}</Text>
              </View>
            )}
            {!!courseSemester && (
              <View style={styles.metaChip}>
                <Ionicons name="calendar-outline" size={13} color="#5F6368" />
                <Text style={styles.metaChipText} numberOfLines={1}>{courseSemester}</Text>
              </View>
            )}
            {!!courseSchoolYear && (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={13} color="#5F6368" />
                <Text style={styles.metaChipText} numberOfLines={1}>S.Y. {courseSchoolYear}</Text>
              </View>
            )}
          </View>
        </View>

        {courseSchedule.length > 0 && (
          <View style={[styles.scheduleStripWrap, { paddingHorizontal: isLargeScreen ? 60 : 16 }]}>
            <View style={styles.scheduleStripCard}>
              <Ionicons name="calendar-outline" size={15} color="#5F6368" />
              <View style={styles.scheduleStripTextWrap}>
                {courseSchedule.map((entry, index) => {
                  const { days, time, room } = formatScheduleBlock(entry);
                  return (
                    <View key={`schedule-${index}`} style={styles.scheduleStripRow}>
                      <Text style={styles.scheduleStripDays}>{days}</Text>
                      <Text style={styles.scheduleStripTime}>{time}</Text>
                      {!!room && <Text style={styles.scheduleStripRoom}>{room}</Text>}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Divider before the Modules/Assignments tabs */}
        <View style={[styles.headerBottomDivider, { marginHorizontal: isLargeScreen ? 60 : 16 }]} />
      </View>

      {/* ── Tabs ── */}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab("modules")}
          style={[styles.tab, activeTab === "modules" && styles.tabActive]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="layers-outline"
              size={16}
              color={activeTab === "modules" ? "#8B0000" : "#999"}
            />
            <Text style={[styles.tabText, activeTab === "modules" && styles.tabTextActive]}>
              Course Resources ({modules.length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            const wasOnAssignments = activeTab === "assignments";
            setActiveTab("assignments");
            // ✅ NEW: only the tab press touches this path — pulling this
            // trigger here closes the gap where switching tabs internally
            // never loaded comments.
            if (!wasOnAssignments && course?.id) {
              void onLoadClassComments?.(course.id);
            }
          }}
          style={[styles.tab, activeTab === "assignments" && styles.tabActive]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={activeTab === "assignments" ? "#8B0000" : "#999"}
            />
            <Text style={[styles.tabText, activeTab === "assignments" && styles.tabTextActive]}>
              Assignments ({safeCourse.assignments.length})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      <View style={[styles.contentContainer]}>
        {activeTab === "materials" ? (
          safeCourse.materials.length > 0 ? (
            <FlatList
              data={safeCourse.materials}
              renderItem={renderMaterialItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          ) : (
            <Text style={styles.emptyText}>No materials available yet</Text>
          )
        ) : activeTab === "assignments" ? (
            safeCourse.assignments.length > 0 ? (
              <View>
                {/* Filter dropdown — same style/layout as Assignments.tsx:
                    inline menu on large screens, bottom-sheet Modal on small. */}
                <View
                  style={[
                    styles.filterDropdownContainer,
                    isLargeScreen && styles.filterDropdownContainerLarge,
                  ]}
                >
                  <TouchableOpacity
                    style={styles.filterDropdownButton}
                    onPress={() => setFilterDropdownVisible((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.filterDropdownButtonLeft}>
                      {assignmentFilter !== "all" && (
                        <View
                          style={[
                            styles.filterDropdownDot,
                            { backgroundColor: getStatusTextColor(assignmentFilter) },
                          ]}
                        />
                      )}
                      <Text style={styles.filterDropdownButtonText} numberOfLines={1}>
                        {cap(assignmentFilter)}
                      </Text>
                    </View>
                    <Ionicons
                      name={filterDropdownVisible ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#000"
                    />
                  </TouchableOpacity>

                  {!isLargeScreen ? (
                    <Modal
                      visible={filterDropdownVisible}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setFilterDropdownVisible(false)}
                      statusBarTranslucent
                    >
                      <TouchableOpacity
                        style={styles.filterDropdownModalOverlay}
                        activeOpacity={1}
                        onPress={() => setFilterDropdownVisible(false)}
                      >
                        <TouchableOpacity
                          style={styles.filterDropdownModalSheet}
                          activeOpacity={1}
                          onPress={() => {}}
                        >
                          <View style={styles.filterDropdownModalHandle} />
                          <View style={styles.filterDropdownModalHeader}>
                            <Text style={styles.filterDropdownModalTitle}>Filter Assignments</Text>
                            <TouchableOpacity onPress={() => setFilterDropdownVisible(false)} hitSlop={8}>
                              <Ionicons name="close" size={22} color="#3B332E" />
                            </TouchableOpacity>
                          </View>
                          <ScrollView style={styles.filterDropdownModalScroll} showsVerticalScrollIndicator={false}>
                            {ASSIGNMENT_FILTERS.map((item) => {
                              const isSelected = item === assignmentFilter;
                              return (
                                <TouchableOpacity
                                  key={item}
                                  style={[
                                    styles.filterDropdownModalItem,
                                    isSelected && styles.filterDropdownModalItemSelected,
                                  ]}
                                  onPress={() => {
                                    setAssignmentFilter(item);
                                    setFilterDropdownVisible(false);
                                  }}
                                  activeOpacity={0.8}
                                >
                                  <View style={styles.filterDropdownButtonLeft}>
                                    {item !== "all" && (
                                      <View
                                        style={[
                                          styles.filterDropdownDot,
                                          { backgroundColor: getStatusTextColor(item) },
                                        ]}
                                      />
                                    )}
                                    <Text
                                      style={[
                                        styles.filterDropdownModalItemText,
                                        isSelected && styles.filterDropdownModalItemTextSelected,
                                      ]}
                                    >
                                      {cap(item)}
                                    </Text>
                                  </View>
                                  {isSelected ? <Ionicons name="checkmark" size={18} color="#6B0000" /> : null}
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </Modal>
                  ) : filterDropdownVisible ? (
                    <View style={styles.filterInlineDropdownMenu}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                        {ASSIGNMENT_FILTERS.map((item) => (
                          <TouchableOpacity
                            key={item}
                            style={styles.filterDropdownItem}
                            onPress={() => {
                              setAssignmentFilter(item);
                              setFilterDropdownVisible(false);
                            }}
                            activeOpacity={0.8}
                          >
                            {item !== "all" && (
                              <View
                                style={[
                                  styles.filterDropdownDot,
                                  { backgroundColor: getStatusTextColor(item) },
                                ]}
                              />
                            )}
                            <Text style={styles.filterDropdownItemText}>{cap(item)}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </View>
                {filteredAssignments.length > 0 ? (
                  <View
                    onLayout={
                      useCssGrid
                        ? undefined
                        : (e) => {
                            // floor (not round) so cells never add up to more than the real row width
                            const w = Math.floor(e.nativeEvent.layout.width);
                            if (w && w !== assignmentGridWidth) setAssignmentGridWidth(w);
                          }
                    }
                    style={assignmentGridStyle}
                  >
                    {filteredAssignments.map((item) => (
                      <View
                        key={item.id}
                        style={useCssGrid ? { minWidth: 0 } : { width: assignmentCellWidth as any }}
                      >
                        {renderAssignmentItem({ item })}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No {assignmentFilter} assignments</Text>
                )}
              </View>
            ) : (
              <Text style={styles.emptyText}>No assignments yet</Text>
            )
          ) : activeTab === "modules" ? (
          <View>
            {/* Course Resources Container */}
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 12 }}>Course Resources</Text>
              {!currentSyllabus ? (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: '#888', fontSize: 13 }}>No syllabus uploaded for this course.</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#F9F9F9', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EEE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Ionicons name="document-text-outline" size={24} color="#8B0000" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }} numberOfLines={1}>
                        {currentSyllabus.fileName || 'Syllabus Document'}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Uploaded {formatSafeDate(currentSyllabus.uploadedAt)}
                      </Text>
                    </View>
                  </View>
                  {currentSyllabus.status === 'generating' && (
                    <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FFF8E1', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#F57C00" />
                      <Text style={{ color: '#F57C00', fontWeight: '600', fontSize: 13 }}>AI is analyzing your syllabus...</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {/* ✅ CHANGED: syllabus now follows the exact same
                        pattern as a Module Lesson's attached file — tapping
                        opens the full inline preview, and downloading only
                        happens from the download icon inside that preview's
                        top bar (see the SYLLABUS VIEWER MODAL below, which
                        mirrors the FULLSCREEN INLINE MATERIAL VIEWER used by
                        Module Lesson attachments). The separate standalone
                        "Download" button that used to sit here has been
                        removed so there's one consistent entry point instead
                        of two different download behaviors. */}
                    <TouchableOpacity
                      onPress={handleViewSyllabus}
                      disabled={currentSyllabus.status === 'generating'}
                      style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Ionicons name="eye-outline" size={14} color="#1565C0" />
                      <Text style={{ color: '#1565C0', fontWeight: '700', fontSize: 12 }}>View Syllabus</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            {/* Modules List */}
            {isLoadingModules ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#8B0000" />
                <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>Loading resources...</Text>
              </View>
            ) : modules.length > 0 ? (
              <View>
                {modules.map((mod) => {
                  // ✅ Keyed by mod.id (not moduleNumber) — a teacher
                  // deleting a module renumbers every later module (see
                  // TeacherCourseDetail2), so a number-keyed expand state
                  // would point at the wrong row on the next poll. Keying
                  // by id keeps "which module is expanded" stable across
                  // a renumber.
                  const isExpanded = expandedModules[mod.id] || false;
                  return (
                    <View key={mod.id} style={{
                      backgroundColor: '#FFF',
                      borderRadius: 16,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: '#EEE',
                      overflow: 'hidden'
                    }}>
                      <TouchableOpacity
                        onPress={() => setExpandedModules(p => ({ ...p, [mod.id]: !isExpanded }))}
                        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isExpanded ? '#FAF5F5' : '#FFF' }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#8B0000', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="layers-outline" size={20} color="#FFF" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#111' }}>
                                {/* ✅ NEW: show the teacher's custom display title when
                                    set (edited via "Edit Module Title"), falling back
                                    to the original title otherwise. Picked up
                                    automatically by the existing fetchModules(true)
                                    silent poll below — no extra polling needed. */}
                                Module {mod.moduleNumber}: {(mod.displayTitle || '').trim() || mod.title}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="#8B0000" />
                      </TouchableOpacity>
                      {isExpanded && (
                        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#EEE', backgroundColor: '#FAFAFA' }}>
                          {mod.lessons && mod.lessons.length > 0 ? (
                            (() => {
                              const sortedLessons = [...mod.lessons].sort((a: any, b: any) =>
                                (Number(a.lessonNumber) || 0) - (Number(b.lessonNumber) || 0)
                              );
                              const moduleLessonIds: string[] = sortedLessons.map((l: any) => l.id).filter(Boolean);
                              return (
                              <>
                              <LessonSelectToolbar
                                lessonIds={moduleLessonIds}
                                selected={selectedLessonIds}
                                onSelectAll={(value) => setLessonsSelected(moduleLessonIds, value)}
                                onDownload={(ids) => handleDownloadSelectedLessons(mod, ids)}
                                downloading={downloadingLessonsModuleId === mod.id}
                              />
                              {sortedLessons.map((lesson: any, li: number) => {
                                const isTicked = !!(lesson.id && selectedLessonIds[lesson.id]);
                                return (
                                <TouchableOpacity
                                  key={lesson.id || li}
                                  onPress={() => handleOpenLessonDetail(lesson)}
                                  style={[
                                    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#DDD', borderLeftWidth: 3, borderLeftColor: '#1976D2' },
                                    isTicked && { backgroundColor: '#EAF1FB', borderColor: '#B9D0F2' },
                                  ]}
                                >
                                  {!!lesson.id && (
                                    <TouchableOpacity
                                      onPress={() => toggleLessonSelected(lesson.id)}
                                      accessibilityLabel={`Select lesson ${lesson.title}`}
                                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                                      style={{ paddingRight: 10 }}
                                    >
                                      <Ionicons name={isTicked ? 'checkbox' : 'square-outline'} size={22} color={isTicked ? '#8B0000' : '#777'} />
                                    </TouchableOpacity>
                                  )}
                                  <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1976D2', marginBottom: 4 }}>
                                      Lesson {lesson.lessonNumber || (li + 1)}: {lesson.title}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color="#999" />
                                  </View>
                                  {!!lesson.description && (
                                    <Text
                                      style={{ fontSize: 12, color: '#555', lineHeight: 18 }}
                                      numberOfLines={1}
                                      ellipsizeMode="tail"
                                    >
                                      {lesson.description}
                                    </Text>
                                  )}
                                  </View>
                                </TouchableOpacity>
                                );
                              })}
                              </>
                              );
                            })()
                          ) : (
                            <Text style={{ textAlign: 'center', color: '#999', padding: 12 }}>No lessons added yet.</Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>No modules available yet.</Text>
            )}
          </View>
        ) : null}
      </View>

      {/* ══════════════════════════════════════════════════════════════════
          FULLSCREEN INLINE MATERIAL VIEWER MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedMaterial}
        transparent={false}
        animationType="slide"
        onRequestClose={closeMaterialModal}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.viewerModal} edges={["top", "bottom"]}>
          <View style={styles.viewerTopBar}>
            <TouchableOpacity
              onPress={closeMaterialModal}
              style={styles.viewerBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.viewerTitleBlock}>
              <Text style={styles.viewerTitle} numberOfLines={1}>
                {selectedMaterial?.title ?? ""}
              </Text>
              <View style={styles.viewerTypeBadgeRow}>
                <View style={styles.viewerTypeBadge}>
                  <Ionicons
                    name={
                      isPresentation
                        ? "easel-outline"
                        : getMaterialIconName(selectedMaterial?.type ?? "document")
                    }
                    size={11}
                    color="#8B0000"
                  />
                  <Text style={styles.viewerTypeText}>
                    {isPresentation
                      ? "SLIDES"
                      : (selectedMaterial?.type ?? "").toUpperCase()}
                  </Text>
                </View>
                {isShowingPdfPreview && (
                  <View style={styles.viewerPdfPreviewBadge}>
                    <Ionicons name="document-text-outline" size={11} color="#1565C0" />
                    <Text style={styles.viewerPdfPreviewText}>PDF Preview</Text>
                  </View>
                )}
              </View>
            </View>
            {!!selectedMaterialUrl && selectedMaterial?.type !== "video" && (
              <TouchableOpacity
                onPress={handleDownloadMaterial}
                style={[styles.viewerOpenExtBtn]}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                 <Ionicons name="download-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
          {useInlineViewer && selectedMaterialUrl ? (
            <InlineMaterialViewer
              fileUrl={selectedMaterialUrl}
              height={windowHeight - 62}
              fileName={selectedMaterial?.fileName}
              fileType={(selectedMaterial as any)?.fileType}
              storagePath={
                (selectedMaterial as any)?.storagePath ||
                resolveStoragePathFromUrl(selectedMaterialUrl)
              }
              bucketPath={(selectedMaterial as any)?.bucketPath}
              classId={course?.id}
            />
          ) : selectedMaterial?.type === "video" && selectedMaterialUrl ? (
            <View style={styles.viewerExternalPrompt}>
              <Ionicons name="videocam-outline" size={56} color="#8B0000" />
              <Text style={styles.viewerExternalTitle}>Video Material</Text>
              <Text style={styles.viewerExternalText}>
                Videos open in your device's media player or browser.
              </Text>
              <TouchableOpacity
                style={styles.viewerExternalButton}
                onPress={() => handleOpenUploadedFile(selectedMaterialUrl)}
              >
                <Ionicons name="play-circle-outline" size={18} color="#FFF" />
                <Text style={styles.viewerExternalButtonText}>Play Video</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.viewerExternalPrompt}>
              <Ionicons name="document-outline" size={56} color="#CCC" />
              <Text style={styles.viewerExternalTitle}>No File Attached</Text>
              <Text style={styles.viewerExternalText}>
                This material has no uploaded file yet.
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* SYLLABUS VIEWER MODAL */}
      <Modal
        visible={!!syllabusViewerUrl}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSyllabusViewerUrl(null)}
      >
        <SafeAreaView style={styles.viewerModal} edges={["top", "bottom"]}>
          <View style={styles.viewerTopBar}>
            <TouchableOpacity
              onPress={() => setSyllabusViewerUrl(null)}
              style={styles.viewerBackBtn}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.viewerTitleBlock}>
              <Text style={styles.viewerTitle} numberOfLines={1}>
                {currentSyllabus?.fileName || 'Course Syllabus'}
              </Text>
            </View>
            {/* 👇 ADDED: same icon-only download affordance already used in
                the material viewer's top bar (handleDownloadMaterial),
                applied here so the syllabus viewer isn't view-only. */}
            {!!syllabusViewerUrl && (
              <TouchableOpacity
                onPress={handleDownloadSyllabus}
                style={styles.viewerOpenExtBtn}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <Ionicons name="download-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
          {syllabusViewerUrl && (
            <InlineMaterialViewer
              fileUrl={syllabusViewerUrl}
              height={windowHeight - 62}
              fileName={currentSyllabus?.fileName}
              fileType={currentSyllabus?.fileType}
              storagePath={
                currentSyllabus?.storagePath ||
                resolveStoragePathFromUrl(syllabusViewerUrl)
              }
              bucketPath={currentSyllabus?.bucketPath}
              classId={course?.id}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ═════════════════════════════════════════════════════════════════════
          LESSON DETAIL MODAL — full-screen "Google Classroom" document
          viewer, matching the teacher's Lesson Preview: fixed top bar
          (title/back), a scrollable letterhead "page" using the same
          school-wide header/footer banner as Grades' Official Grade Report,
          like opening a Doc/PDF attachment. Read-only here — no edit/delete
          actions, since students don't manage lesson content.
      ═════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={lessonDetailModalVisible}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
        onRequestClose={() => setLessonDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.lessonPreviewScreen} edges={['top', 'left', 'right']}>
          {/* Fixed top bar */}
          <View style={styles.lessonPreviewTopBar}>
            <TouchableOpacity
              onPress={() => setLessonDetailModalVisible(false)}
              style={styles.lessonPreviewBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={Platform.OS === 'web' ? 'close' : 'arrow-back'} size={22} color="#111" />
            </TouchableOpacity>
            <View style={styles.lessonPreviewTopBarTextWrap}>
              <Text style={styles.lessonPreviewTopBarTitle} numberOfLines={1}>
                {selectedLesson?.title || 'Lesson Details'}
              </Text>
              <Text style={styles.lessonPreviewTopBarSubtitle} numberOfLines={1}>
                Module Content &amp; Activities
              </Text>
            </View>
            {selectedLesson && selectedLesson.type !== 'manual_file' && sasPreviewFailedFor !== selectedLesson.id ? (
              <SasDocMenuButton docUrl={sasDocLinks.url} downloadUrl={sasDocLinks.downloadUrl} title={selectedLesson.title} />
            ) : null}
          </View>

          {/* Docx preview — full screen, inline, under the same top bar (mirrors the
              teacher's Lesson Preview). Shown for every text lesson; the plain page
              view below is only used for uploaded-file lessons, while loading, or
              if the docx render fails. */}
          {selectedLesson && !isLessonLoading && selectedLesson.type !== 'manual_file' && sasPreviewFailedFor !== selectedLesson.id ? (
            <SASTemplatePreview
              key={selectedLesson.id}
              lessonId={selectedLesson.id}
              isMobile={!isLargeScreen}
              onLinksChange={setSasDocLinks}
              onUnavailable={() => {
                setSasPreviewFailedFor(selectedLesson.id);
                showFeedback('info', 'Preview unavailable', 'Showing the plain lesson view instead.');
              }}
            />
          ) : (
          <ScrollView
            style={styles.flexOne}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.lessonPreviewScrollContent}
          >
            {isLessonLoading ? (
              <ActivityIndicator size="large" color="#8B0000" style={{ marginVertical: 40 }} />
            ) : selectedLesson ? (
              <View style={styles.lessonPreviewPageWrap}>
                <View style={[styles.lessonPreviewPage, isLargeScreen && styles.lessonPreviewPageWeb]}>
                  {renderTemplateHeaderBanner()}

                  <View style={styles.lessonPreviewTitleBlock}>
                    <View style={styles.docPageBadge}>
                      <Ionicons
                        name={selectedLesson.isGenerated ? 'sparkles-outline' : 'create-outline'}
                        size={11}
                        color="#8B0000"
                      />
                      <Text style={styles.docPageBadgeText}>
                        {selectedLesson.isGenerated
                          ? 'AI Generated'
                          : (selectedLesson.type === 'manual_file' || selectedLesson.type === 'manual'
                              ? 'Manually Created'
                              : 'Lesson Preview')}
                      </Text>
                    </View>
                    <Text style={styles.lessonPreviewPageTitle}>{selectedLesson.title}</Text>
                  </View>

                  {selectedLesson.type === 'manual_file' && selectedLesson.fileUrl ? (
                    <TouchableOpacity
                      onPress={() => {
                        const materialViewData: any = {
                          id: selectedLesson.id,
                          title: selectedLesson.title,
                          type: selectedLesson.fileType?.startsWith('video/') ? 'video' : (selectedLesson.pdfUrl ? 'pdf' : 'document'),
                          uploadedDate: new Date().toLocaleDateString(),
                          fileName: selectedLesson.fileName,
                          fileUrl: selectedLesson.fileUrl,
                          fileType: selectedLesson.fileType,
                          storagePath: selectedLesson.storagePath,
                          bucketPath: selectedLesson.bucketPath,
                          pdfUrl: selectedLesson.pdfUrl,
                          pdfStoragePath: selectedLesson.pdfStoragePath,
                          content: selectedLesson.discussion || selectedLesson.description
                        };
                        setLessonDetailModalVisible(false);
                        setSelectedMaterial(materialViewData);
                      }}
                      style={{
                        backgroundColor: '#FAF5F5',
                        borderWidth: 2,
                        borderColor: '#8B0000',
                        borderStyle: 'dashed',
                        borderRadius: 16,
                        padding: 24,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                        gap: 12,
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="document-text-outline" size={48} color="#8B0000" />
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#8B0000' }}>
                        {selectedLesson.fileName || 'View Attached File'}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#666' }}>
                        Tap to open preview • {selectedLesson.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Description</Text>
                    <Text style={styles.lessonPreviewSectionText}>
                      {selectedLesson.description || 'No description available.'}
                    </Text>
                  </View>

                  {Array.isArray(selectedLesson.objectives) && selectedLesson.objectives.length > 0 ? (
                    <View style={styles.sasCard}>
                      <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Intended Learning Outcomes</Text>
                      <Text style={[styles.lessonPreviewSectionText, { marginBottom: 4 }]}>At the end of the lesson, you should be able to:</Text>
                      {selectedLesson.objectives.map((o: string, i: number) => (
                        <Text key={i} style={styles.sasBulletText}>{'\u2022 '}{o}</Text>
                      ))}
                    </View>
                  ) : null}

                  {(Array.isArray(selectedLesson.materials) && selectedLesson.materials.length > 0) ||
                   (Array.isArray(selectedLesson.references) && selectedLesson.references.length > 0) ? (
                    <View style={styles.sasCard}>
                      {Array.isArray(selectedLesson.materials) && selectedLesson.materials.length > 0 ? (
                        <>
                          <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Materials</Text>
                          <Text style={[styles.lessonPreviewSectionText, { marginBottom: 10 }]}>{selectedLesson.materials.join(', ')}</Text>
                        </>
                      ) : null}
                      {Array.isArray(selectedLesson.references) && selectedLesson.references.length > 0 ? (
                        <>
                          <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>References</Text>
                          {selectedLesson.references.map((r: string, i: number) => (
                            <Text key={i} style={styles.sasBulletText}>{'\u2022 '}{r}</Text>
                          ))}
                        </>
                      ) : null}
                    </View>
                  ) : null}

                  {Array.isArray(selectedLesson.sdgIntegration) && selectedLesson.sdgIntegration.length > 0 ? (
                    <View style={styles.sasCard}>
                      <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>SDG Integration</Text>
                      {selectedLesson.sdgIntegration.map((s: any, i: number) => (
                        <Text key={i} style={[styles.lessonPreviewSectionText, { marginBottom: 6 }]}>
                          <Text style={[styles.lessonPreviewSectionText, { fontWeight: '700' }]}>{s.sdg}</Text>{s.description ? ` — ${s.description}` : ''}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {selectedLesson.lessonPrep ? (
                    <View style={styles.sasCard}>
                      <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Lesson Preparation / Review / Preview</Text>
                      {Array.isArray(selectedLesson.lessonPrep.resources) && selectedLesson.lessonPrep.resources.length > 0 ? (
                        <View style={{ marginBottom: 8 }}>
                          {selectedLesson.lessonPrep.resources.map((r: any, i: number) => (
                            <Text key={i} style={[styles.lessonPreviewSectionText, { color: '#1976D2' }]}>{r.label}{r.url ? `: ${r.url}` : ''}</Text>
                          ))}
                        </View>
                      ) : null}
                      {selectedLesson.lessonPrep.activityTitle ? (
                        <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge, { color: '#000' }]}>Activity: "{selectedLesson.lessonPrep.activityTitle}"</Text>
                      ) : null}
                      {selectedLesson.lessonPrep.instructions ? (
                        <Text style={[styles.lessonPreviewSectionText, { color: '#000', marginBottom: 8 }]}>
                          {renderFormattedText(selectedLesson.lessonPrep.instructions, { color: '#000' })}
                        </Text>
                      ) : null}
                      {Array.isArray(selectedLesson.lessonPrep.guideQuestions) && selectedLesson.lessonPrep.guideQuestions.length > 0 ? (
                        <View style={{ marginBottom: 8 }}>
                          <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge, { color: '#000' }]}>Guide Questions</Text>
                          {selectedLesson.lessonPrep.guideQuestions.map((q: string, i: number) => (
                            <Text key={i} style={styles.sasBulletText}>{i + 1}. {q}</Text>
                          ))}
                        </View>
                      ) : null}
                      {selectedLesson.lessonPrep.transition ? (
                        <Text style={[styles.lessonPreviewSectionText, { color: '#444', fontStyle: 'italic' }]}>{selectedLesson.lessonPrep.transition}</Text>
                      ) : null}
                    </View>
                  ) : null}

                  {selectedLesson.discussion ? (
                    <View style={styles.sasCard}>
                      <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Concept Notes / Discussion</Text>
                      <Text style={[styles.lessonPreviewSectionText, { color: '#000' }]}>
                        {renderFormattedText(selectedLesson.discussion, { color: '#000' })}
                      </Text>
                    </View>
                  ) : null}

                  {Array.isArray(selectedLesson.keyTerms) && selectedLesson.keyTerms.length > 0 ? (
                    <View style={styles.sasCard}>
                      <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Key Terms to Remember</Text>
                      {selectedLesson.keyTerms.map((k: any, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 6 }}>
                          <Text style={[styles.lessonPreviewSectionText, { width: 110, fontWeight: '700', color: '#000' }]}>{k.term}</Text>
                          <Text style={[styles.lessonPreviewSectionText, { flex: 1 }]}>{k.meaning}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {Array.isArray(selectedLesson.takeaways) && selectedLesson.takeaways.length > 0 ? (
                    <View style={styles.sasCard}>
                      <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Take Aways</Text>
                      {selectedLesson.takeaways.map((t: string, i: number) => (
                        <Text key={i} style={styles.sasBulletText}>{'\u2022 '}{t}</Text>
                      ))}
                    </View>
                  ) : null}

                  {selectedLesson.guidedPractice ? (
                    <View style={styles.sasCard}>
                      <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Guided Practice</Text>
                      <Text style={[styles.lessonPreviewSectionText, { color: '#000' }]}>
                        {renderFormattedText(selectedLesson.guidedPractice, { color: '#000' })}
                      </Text>
                    </View>
                  ) : null}

                  {selectedLesson.activity ? (
                    <View style={styles.sasCard}>
                      <Text style={[styles.lessonPreviewSectionTitle, isLargeScreen && styles.lessonPreviewSectionTitleLarge]}>Compu-Skill / Performance Task</Text>
                      <Text style={[styles.lessonPreviewSectionText, { color: '#000' }]}>
                        {renderFormattedText(selectedLesson.activity, { color: '#000' })}
                      </Text>
                    </View>
                  ) : null}

                  {renderTemplateFooterBanner()}
                </View>
              </View>
            ) : (
              <Text style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>
                Could not load lesson details.
              </Text>
            )}
          </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          ASSIGNMENT DETAIL MODAL (UPDATED WITH MULTI-FILE LOGIC)
      ═══════════════════════════════════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════════════════════════
          ASSIGNMENT DETAIL — full-screen, Google Classroom style layout.
          Top bar (close + title) / left column: title, instructions,
          attachments, related resources, comments / right column: the
          sticky "Your work" card. Collapses to one column on mobile.
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedAssignment}
        animationType="slide"
        transparent={false}
        statusBarTranslucent
        onRequestClose={closeAssignmentModal}
      >
        <View style={styles.gcRoot}>
          <SafeAreaView style={styles.gcScreen} edges={["top", "bottom"]}>
            <View style={styles.gcTopBar}>
              <TouchableOpacity
                onPress={closeAssignmentModal}
                style={styles.gcCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Close assignment"
              >
                <Ionicons name="close" size={24} color="#5F6368" />
              </TouchableOpacity>
              <View style={styles.gcTopIcon}>
                <MaterialCommunityIcons name="clipboard-text-outline" size={17} color="#FFF" />
              </View>
              <Text style={styles.gcTopTitle} numberOfLines={1}>
                {selectedAssignment?.title ?? "Assignment"}
              </Text>
              {isRefreshingOpenedAssignment && (
                <View style={styles.gcSyncBadge}>
                  <ActivityIndicator size="small" color="#8B0000" />
                  <Text style={styles.openRefreshBadgeText}>Syncing latest...</Text>
                </View>
              )}
            </View>

            <ScrollView
              style={{ flex: 1, width: "100%" }}
              contentContainerStyle={styles.gcScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={["#8B0000"]} tintColor="#8B0000" />
              }
            >
              {selectedAssignment && (
                <View style={[styles.gcBody, isLargeScreen ? styles.gcBodyLarge : styles.gcBodyMobile]}>
                  {/* ───────────── LEFT / MAIN COLUMN ───────────── */}
                  <View style={[styles.gcMainCol, isLargeScreen && styles.gcMainColLarge]}>
                    <View style={styles.gcHeader}>
                      <View style={styles.gcHeaderIcon}>
                        <MaterialCommunityIcons name="clipboard-text-outline" size={isLargeScreen ? 26 : 22} color="#FFF" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.gcTitle, !isLargeScreen && styles.gcTitleMobile]}>
                          {selectedAssignment.title}
                        </Text>
                        <Text style={styles.gcSubtitle} numberOfLines={2}>
                          {safeCourse.instructor} • {safeCourse.name}
                        </Text>
                        <Text style={styles.gcSubtitleMuted}>
                          {safeCourse.semester} • {safeCourse.schoolYear}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.gcStatsRow}>
                      <View>
                        <Text style={styles.gcStatLabel}>Due</Text>
                        <Text style={[styles.gcStatValue, { color: "#8B0000" }]}>
                          {formatDueDateForDisplay(selectedAssignment.dueDate) || "No due date"}
                        </Text>
                      </View>
                      {selectedAssignment.maxPoints !== undefined && (
                        <View>
                          <Text style={styles.gcStatLabel}>Points</Text>
                          <Text style={styles.gcStatValue}>
                            {typeof selectedAssignment.points === "number"
                              ? `${selectedAssignment.points}/${selectedAssignment.maxPoints}`
                              : `${selectedAssignment.maxPoints}`}
                          </Text>
                        </View>
                      )}
                      {getScorePercent(selectedAssignment) !== null && (
                        <View>
                          <Text style={styles.gcStatLabel}>Score</Text>
                          <Text style={[styles.gcStatValue, { color: "#1B5E20" }]}>
                            {getScorePercent(selectedAssignment)}%
                          </Text>
                        </View>
                      )}
                      {selectedAssignment.assignmentType === "game_based" && !!selectedAssignment.numberOfAttempts && (
                        <View>
                          <Text style={styles.gcStatLabel}>Max attempts</Text>
                          <Text style={styles.gcStatValue}>
                            {selectedAssignment.numberOfAttempts === "unlimited"
                              ? "Unlimited"
                              : selectedAssignment.numberOfAttempts}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.gcDivider} />

                    <Text style={styles.gcInstructionText}>
                      {(selectedAssignment as any).description || "No instruction provided."}
                    </Text>
                    {getRecommendationLabel(selectedAssignment) && (
                      <View
                        style={[
                          styles.recommendationBadge,
                          {
                            backgroundColor: `${getRecommendationColor(selectedAssignment)}18`,
                            alignSelf: "flex-start",
                            marginTop: 12,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.recommendationText,
                            { color: getRecommendationColor(selectedAssignment) },
                          ]}
                        >
                          {getRecommendationLabel(selectedAssignment)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.gcDivider} />

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Assignment File</Text>
                      {selectedAssignmentTeacherFiles.length > 0 ? (
                        <View>
                          {selectedAssignmentTeacherFiles.map((file) => (
                            <View key={file.id} style={styles.attachmentFileCard}>
                              <Ionicons name="attach-outline" size={20} color="#8B0000" />
                              <View style={styles.fileInfo}>
                                <Text style={styles.fileName}>{file.fileName}</Text>
                                <Text style={styles.fileDetails}>
                                  Uploaded by your teacher for this assignment
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={[
                                  styles.fileOpenButton,
                                  !file.fileUrl && !file.storagePath && !file.bucketPath && styles.fileOpenButtonDisabled,
                                ]}
                                disabled={!file.fileUrl && !file.storagePath && !file.bucketPath}
                                activeOpacity={0.85}
                                onPress={() => handleOpenSubmittedFile(file as any, 'This assignment has no attached file yet.')}
                              >
                                <Ionicons name="open-outline" size={15} color="#FFF" />
                                <Text style={styles.fileOpenButtonText}>Open</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No assignment file attached.</Text>
                      )}
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Related Course Resources</Text>
                      {selectedAssignmentRelatedMaterials.length > 0 ? (
                        selectedAssignmentRelatedMaterials.map((material) => (
                          <TouchableOpacity
                            key={material.id}
                            style={styles.relatedMaterialItem}
                            activeOpacity={0.85}
                            onPress={() => {
                              closeAssignmentModal();
                              setTimeout(() => handleOpenLessonDetail(material), 300);
                            }}
                          >
                            <View style={styles.relatedMaterialRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.relatedMaterialTitle}>{material.title}</Text>
                                <Text style={styles.relatedMaterialMeta}>
                                  {material.type} • {material.uploadedDate}
                                </Text>
                                {!!material.fileName && (
                                  <Text style={styles.relatedMaterialFileName}>
                                    {material.fileName}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.relatedMaterialOpenBadge}>
                                <Ionicons name="eye-outline" size={13} color="#8B0000" />
                                <Text style={styles.relatedMaterialOpenText}>View</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>No linked materials.</Text>
                      )}
                    </View>

                    {getRecommendationType(selectedAssignment) && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Follow-Up Activity</Text>
                        {!canGenerateSelectedActivity && (
                          <Text style={styles.materialWarningText}>
                            The teacher must link related materials first. AI will generate this activity from those related materials only.
                          </Text>
                        )}
                        <TouchableOpacity
                          onPress={() => handleGenerateActivity(selectedAssignment)}
                          disabled={!canGenerateSelectedActivity || isGeneratingActivity}
                          style={[
                            styles.uploadButtonWide,
                            {
                              backgroundColor: canGenerateSelectedActivity
                                ? getRecommendationColor(selectedAssignment)
                                : "#CCC",
                              opacity: isGeneratingActivity ? 0.75 : 1,
                            },
                          ]}
                        >
                          {isGeneratingActivity ? (
                            <View style={styles.loadingButtonContent}>
                              <ActivityIndicator size="small" color="#FFFFFF" />
                              <Text style={styles.uploadButtonText}>Generating...</Text>
                            </View>
                          ) : (
                            <Text style={styles.uploadButtonText}>Generate Follow-Up Activity</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}

                    {isLargeScreen && gcCommentsBlock}
                  </View>

                  {/* ───────────── RIGHT COLUMN: YOUR WORK ───────────── */}
                  <View style={[styles.gcSideCol, isLargeScreen && styles.gcSideColLarge]}>
                    <View style={styles.gcWorkCard}>
                      {(() => {
                        const graded = isAssignmentGraded(selectedAssignment);
                        const submitted = isAssignmentSubmitted(selectedAssignment);
                        const display = getDisplayStatus(selectedAssignment);
                        let label = "Assigned";
                        let color = "#5F6368";
                        if (graded) {
                          label = "Graded";
                          color = "#2E7D32";
                        } else if (selectedAssignment.status === "late") {
                          label = "Turned in late";
                          color = "#E64A19";
                        } else if (submitted) {
                          label = "Turned in";
                          color = "#188038";
                        } else if (display === "missing") {
                          label = "Missing";
                          color = "#C62828";
                        }
                        return (
                          <>
                            <View style={styles.gcWorkHeader}>
                              <Text style={styles.gcWorkTitle}>Your work</Text>
                              <Text style={[styles.gcWorkStatus, { color }]}>{label}</Text>
                            </View>
                            {graded &&
                              selectedAssignment.maxPoints !== undefined &&
                              typeof selectedAssignment.points === "number" && (
                                <View style={styles.gcGradeRow}>
                                  <Text style={styles.gcGradeLabel}>Grade</Text>
                                  <Text style={styles.gcGradeValue}>
                                    {selectedAssignment.points}/{selectedAssignment.maxPoints}
                                  </Text>
                                </View>
                              )}
                          </>
                        );
                      })()}

                    {selectedAssignment.assignmentType === "game_based" && (
                      <View style={styles.section}>
                        <View style={styles.sectionTitleRow}>
                          <Ionicons name="game-controller-outline" size={16} color="#000" />
                          <Text style={styles.sectionTitle}>Game-Based Assignment</Text>
                        </View>
                        <Text style={{ color: "#666", marginBottom: 10, fontSize: 13 }}>
                          This is an interactive game assignment. Click below to start playing!
                        </Text>
                        {isLoadingAttempts[selectedAssignment.id] ? (
                          <View style={[styles.uploadButtonWide, { backgroundColor: "#CCC" }]}>
                            <ActivityIndicator size="small" color="#666" />
                            <Text style={[styles.uploadButtonText, { color: "#666" }]}>
                              Checking attempts...
                            </Text>
                          </View>
                        ) : (
                          <>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <Text style={{ fontSize: 13, fontWeight: "600", color: "#333" }}>
                                {selectedAssignment.numberOfAttempts === "unlimited"
                                  ? "Attempt: Unlimited"
                                  : `Attempt: ${getRemainingAttempts(selectedAssignment)}`}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[
                                styles.uploadButtonWide,
                                { backgroundColor: canPlayGame(selectedAssignment) ? "#4CAF50" : "#CCC" },
                              ]}
                              onPress={() => handlePlayGameWithAttemptCheck(selectedAssignment)}
                              disabled={!canPlayGame(selectedAssignment)}
                            >
                              <Text style={styles.uploadButtonText}>
                                {canPlayGame(selectedAssignment)
                                  ? "Start Game"
                                  : getPlayGameBlockedReason(selectedAssignment) === "past_due"
                                    ? "Past Due"
                                    : "No Attempts Remaining"}
                              </Text>
                            </TouchableOpacity>

                            {/* ✅ Once the student has completed at least one
                                attempt, let them jump to the attempt-selection
                                screen to choose their final score. Once a
                                final score has been manually submitted (i.e.
                                they tapped "Submit as Final Score" in
                                GameAttemptSelection), this button hides so the
                                decision is locked in. It still shows when the
                                score was auto-finalized (they ran out of
                                attempts without choosing), so they can pick a
                                different attempt in that case, and while no
                                final score has been chosen yet ("Select Final
                                Score"). */}
                            {(gameAttempts[selectedAssignment.id] || 0) > 0 &&
                              (!selectedGameAttemptIds[selectedAssignment.id] ||
                                autoFinalizedGameAssignments[selectedAssignment.id]) && (
                              <TouchableOpacity
                                style={[styles.uploadButtonWide, { backgroundColor: "#2196F3", marginTop: 10 }]}
                                onPress={() => onViewGameAttempts?.(selectedAssignment)}
                              >
                                <Text style={styles.uploadButtonText}>
                                  {!selectedGameAttemptIds[selectedAssignment.id]
                                    ? "Select Final Score"
                                    : "Auto-Submitted — Change Final Score"}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </>
                        )}
                      </View>
                    )}

                    <View style={styles.section}>
                      {getSubmittedFiles(selectedAssignment).length > 0 ? (
                        <View>
                          {getSubmittedFiles(selectedAssignment).map((file) => {
                             const isLink = file.fileType === 'text/uri-list';
                             if (isLink && file.linkUrl) {
                               return (
                                 <TouchableOpacity 
                                   key={file.id} 
                                   style={styles.fileItem}
                                   onPress={() => handleOpenSubmittedFile(file, 'Invalid link URL')}
                                   activeOpacity={0.7}
                                 >
                                   <Ionicons name="link-outline" size={20} color="#1a73e8" />
                                   <View style={styles.fileInfo}>
                                     <Text style={[styles.fileName, { color: '#1a73e8', textDecorationLine: 'underline' }]}>
                                       {file.linkUrl}
                                     </Text>
                                     <Text style={styles.fileDetails}>
                                       Link submission • {file.uploadedDate}
                                     </Text>
                                   </View>
                                   {!isAssignmentSubmitted(selectedAssignment) && (
                                     <TouchableOpacity
                                       onPress={(e) => {
                                         e.stopPropagation();
                                         onRemoveFile(selectedAssignment.id, file.id);
                                       }}
                                       style={{ marginLeft: 8 }}
                                     >
                                       <Ionicons name="close" size={16} color="#8B0000" />
                                     </TouchableOpacity>
                                   )}
                                 </TouchableOpacity>
                               );
                             }
                             return (
                              <View key={file.id} style={styles.fileItem}>
                                <Ionicons
                                  name="document-text-outline"
                                  size={20}
                                  color="#8B0000"
                                />
                                <View style={styles.fileInfo}>
                                  <Text style={styles.fileName}>{file.fileName}</Text>
                                  <Text style={styles.fileDetails}>
                                    {file.fileSize} • {file.uploadedDate}
                                  </Text>
                                </View>
                                <View style={styles.fileActionsRow}>
                                  <TouchableOpacity
                                    style={[
                                      styles.fileOpenButton,
                                      !file.fileUrl && !file.storagePath && !file.bucketPath && styles.fileOpenButtonDisabled,
                                    ]}
                                    disabled={!file.fileUrl && !file.storagePath && !file.bucketPath}
                                    activeOpacity={0.85}
                                    onPress={() => handleOpenSubmittedFile(file, 'This submitted file has no URL yet.')}
                                  >
                                    <Ionicons name="open-outline" size={15} color="#FFF" />
                                    <Text style={styles.fileOpenButtonText}>Preview</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    disabled={isAssignmentSubmitted(selectedAssignment)}
                                    onPress={() => onRemoveFile(selectedAssignment.id, file.id)}
                                  >
                                    <Ionicons
                                      name="close"
                                      size={20}
                                      color={
                                        isAssignmentSubmitted(selectedAssignment)
                                          ? "#C57F7F"
                                          : "#8B0000"
                                      }
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No student submission added yet</Text>
                      )}
                      {(() => {
                        const uploadedFiles = getSubmittedFiles(selectedAssignment);
                        const hasFiles = uploadedFiles.length > 0;
                        const isSubmitted = isAssignmentSubmitted(selectedAssignment);
                        const isGraded = isAssignmentGraded(selectedAssignment);
                        const canEditFiles = !isSubmitted && !isGraded;
                        if (isGraded) {
                          return (
                            <View style={styles.uploadActionsRow}>
                              <View style={styles.lockedSubmissionBox}>
                                <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.lockedSubmissionTitle}>
                                    Assignment already graded
                                  </Text>
                                  <Text style={styles.lockedSubmissionText}>
                                    Your submission is locked. You can no longer upload, remove,
                                    submit, or unsubmit files.
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        }
                        const locked = isSubmissionLocked(selectedAssignment);

                        if (isSubmitted) {
                          return (
                            <View style={styles.uploadActionsRow}>
                              <View style={styles.lockedSubmissionBox}>
                                <Ionicons name="cloud-done-outline" size={18} color="#1565C0" />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.lockedSubmissionTitle}>
                                    Already submitted
                                  </Text>
                                  <Text style={styles.lockedSubmissionText}>
                                    {locked
                                      ? "Your teacher has received this assignment. Submissions are now closed, so this can no longer be changed."
                                      : "Your teacher has received this assignment. Unsubmit only if you need to change your file before grading."}
                                  </Text>
                                </View>
                              </View>
                              {!locked && (
                                <TouchableOpacity
                                  onPress={handleUnsubmitAssignment}
                                  disabled={isSubmittingAssignment}
                                  style={[
                                    styles.uploadButtonWide,
                                    { backgroundColor: "#8B0000" },
                                    isSubmittingAssignment && styles.sendButtonDisabled,
                                  ]}
                                >
                                  <Text style={styles.uploadButtonText}>
                                    {isSubmittingAssignment ? "UNSUBMITTING..." : "UNSUBMIT"}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        }

                        // ✅ NEW: Past due + "Disable repository after due" enabled, and
                        // the student never submitted in time — submission is fully closed.
                        if (locked) {
                          return (
                            <View style={styles.uploadActionsRow}>
                              <View style={styles.lockedSubmissionBox}>
                                <Ionicons name="lock-closed-outline" size={18} color="#8B0000" />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.lockedSubmissionTitle}>
                                    Submission closed
                                  </Text>
                                  <Text style={styles.lockedSubmissionText}>
                                    The due date has passed and your teacher has turned off
                                    submissions after the deadline. This assignment can no longer
                                    accept work.
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        }
                        return (
                          <View style={styles.uploadActionsRow}>
                            {canEditFiles && (
                              <View style={styles.linkSubmitBox}>
                                <TextInput
                                  style={styles.linkInput}
                                  value={submissionLink}
                                  onChangeText={setSubmissionLink}
                                  placeholder="Paste submission link here"
                                  placeholderTextColor="#999"
                                  autoCapitalize="none"
                                  autoCorrect={false}
                                  keyboardType="url"
                                />
                                <TouchableOpacity
                                  style={styles.secondaryButton}
                                  onPress={handleAddLinkSubmission}
                                  activeOpacity={0.85}
                                >
                                  <Text style={styles.secondaryButtonText}>+ Add Link</Text>
                                </TouchableOpacity>
                              </View>
                            )}
                            {!hasFiles ? (
                              <TouchableOpacity
                                style={[
                                  styles.uploadButtonWide,
                                  isUploadingFile && styles.sendButtonDisabled,
                                ]}
                                disabled={isUploadingFile}
                                onPress={handleFileUpload}
                              >
                                <Text style={styles.uploadButtonText}>
                                  {isUploadingFile ? "Uploading..." : "+ Upload File"}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <>
                                {canEditFiles && (
                                  <TouchableOpacity
                                    onPress={handleFileUpload}
                                    disabled={isUploadingFile}
                                    style={[
                                      styles.secondaryButton,
                                      isUploadingFile && styles.sendButtonDisabled,
                                    ]}
                                  >
                                    <Text style={styles.secondaryButtonText}>
                                      {isUploadingFile ? "Uploading..." : "+ Add Another File"}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  onPress={() => setSubmitConfirmVisible(true)}
                                  disabled={isSubmittingAssignment}
                                  style={[
                                    styles.uploadButtonWide,
                                    { backgroundColor: "#308C5D" },
                                    isSubmittingAssignment && styles.sendButtonDisabled,
                                  ]}
                                >
                                  <Text style={styles.uploadButtonText}>
                                    {isSubmittingAssignment ? "SUBMITTING..." : "SUBMIT"}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                    </View>
                  </View>

                  {!isLargeScreen && gcCommentsBlock}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>

        {/* DROPDOWN MENU FOR COMMENT ACTIONS */}
        {openMenuCommentId && menuPosition && (
          <>
            <Pressable
              style={styles.menuBackdrop}
              onPress={closeMenu}
            />
            <View
              style={[
                styles.dropdownMenu,
                {
                  left: Math.min(menuPosition.x - 140, width - 160),
                  top: menuPosition.y,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  const comment = (assignmentComments[selectedAssignment?.id || ''] || []).find(
                    (c) => c.id === openMenuCommentId
                  );
                  if (comment) {
                    setEditingCommentId(comment.id);
                    setEditText(comment.content);
                    closeMenu();
                  }
                }}
              >
                <MaterialCommunityIcons name="pencil-outline" size={18} color="#111" />
                <Text style={styles.dropdownOptionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => handleDeleteComment(openMenuCommentId)}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#D32F2F" />
                <Text style={[styles.dropdownOptionText, styles.dropdownOptionDangerText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL — kept as a custom confirm modal (not a toast),
          since it needs the user's explicit Cancel/Delete choice. */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeletingComment) {
            setDeleteModalVisible(false);
          }
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIconContainer}>
              <MaterialCommunityIcons name="trash-can-outline" size={48} color="#D32F2F" />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Comment</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeletingComment}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalConfirmBtn, isDeletingComment && { opacity: 0.7 }]}
                onPress={confirmDeleteComment}
                disabled={isDeletingComment}
              >
                {isDeletingComment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* "TURN IN ASSIGNMENT?" CONFIRMATION MODAL — Google Classroom style,
          shown when the student taps SUBMIT, before the request actually fires. */}
      <Modal
        visible={submitConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSubmittingAssignment) {
            setSubmitConfirmVisible(false);
          }
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={[styles.deleteModalIconContainer, styles.turnInIconContainer]}>
              <MaterialCommunityIcons name="check-circle-outline" size={48} color="#308C5D" />
            </View>
            <Text style={styles.deleteModalTitle}>Submit assignment?</Text>
            <Text style={styles.deleteModalMessage}>
              {(() => {
                const itemCount = getSubmittedFiles(selectedAssignment).length;
                const itemLabel = `${itemCount} item${itemCount === 1 ? "" : "s"}`;
                const pastDue = isPastDueDate(selectedAssignment?.dueDate);
                return `You're about to submit ${itemLabel} for "${selectedAssignment?.title ?? "this assignment"
                  }". ${pastDue ? "This assignment is past due. " : ""}You can unsubmit to make changes until your teacher grades it.`;
              })()}
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setSubmitConfirmVisible(false)}
                disabled={isSubmittingAssignment}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteModalConfirmBtn,
                  styles.turnInConfirmBtn,
                  isSubmittingAssignment && { opacity: 0.7 },
                ]}
                onPress={async () => {
                  setSubmitConfirmVisible(false);
                  await handleSubmitAssignment();
                }}
                disabled={isSubmittingAssignment}
              >
                {isSubmittingAssignment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ✅ NEW: INLINE PREVIEW MODAL FOR SUBMITTED FILES */}
      <Modal
        visible={!!previewFile}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setPreviewFile(null)}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.previewModalContainer} edges={['top', 'bottom']}>
          <View style={styles.previewTopBar}>
            <TouchableOpacity
              onPress={() => setPreviewFile(null)}
              style={styles.previewBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.previewTitleBlock}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewFile?.fileName || 'Preview'}
              </Text>
              <View style={styles.previewTypeBadge}>
                <MaterialCommunityIcons
                  name={previewFile?.fileType === 'text/uri-list' ? "link-variant" : "file-document-outline"}
                  size={11}
                  color="#8B0000"
                />
                <Text style={styles.previewTypeText}>
                  {previewFile?.fileType === 'text/uri-list' ? "LINK" : "FILE"}
                </Text>
              </View>
            </View>
            {/* ✅ FIX: Download button now wired to handleDownloadSubmittedFile,
                which resolves a fresh signed URL (if needed) then downloads
                via browser download (web) or Share sheet (native) — matching
                the working logic already used by handleDownloadMaterial. */}
            {!!previewFile?.fileUrl && previewFile?.fileType !== 'text/uri-list' && (
              <TouchableOpacity
                onPress={() => handleDownloadSubmittedFile(previewFile)}
                style={styles.previewOpenExtBtn}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <MaterialCommunityIcons name="download" size={20} color="#FFF" />
              </TouchableOpacity>
            )}
          </View>
          {previewFile && (
            <InlineMaterialViewer 
              fileUrl={previewFile.fileUrl || ''}
              height={height - 62}
              fileName={previewFile.fileName}
              fileType={previewFile.fileType}
              storagePath={previewFile.storagePath}
              bucketPath={previewFile.bucketPath}
              classId={course?.id}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* ✅ Toast — same portal-based pattern as SignIn/Community/Dashboard/ClassesScreen */}
      <Modal
        visible={toast.visible}
        transparent
        animationType="fade"
        onRequestClose={hideToast}
        statusBarTranslucent
      >
        <View style={styles.toastPortal} pointerEvents="box-none">
          <Toast
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onHide={hideToast}
          />
        </View>
      </Modal>
    </ScrollView>
  );
};

export default CourseDetail;

const styles = StyleSheet.create({
  loadingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  screenScroll: { flex: 1, backgroundColor: "#FFFFFF" },
  screenScrollContent: { paddingBottom: 40 },
  emptyScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 24,
  },
  emptyScreenTitle: { fontFamily: FONT_TITLE, fontSize: 20, fontWeight: WEIGHT_TITLE, color: "#222", marginBottom: 8 },
  emptyScreenText: { fontFamily: FONT_BODY, fontSize: 14, color: "#777", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  emptyBackButton: {
    backgroundColor: "#8B0000",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
  },
  emptyBackButtonText: { fontFamily: FONT_BODY, color: "#FFF", fontWeight: WEIGHT_EMPHASIS, fontSize: 13 },
  courseHeader: {
    backgroundColor: "#8B0000",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  // ── Google Classroom–style banner header ──
  courseHeaderWrap: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  bannerBox: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#8B0000",
  },
  bannerFallback: {
    backgroundColor: "#8B0000",
  },
  bannerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  backButtonOnBanner: {
    position: "absolute",
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTextBlock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
  },
  courseNameOnBanner: { fontFamily: FONT_BODY,
    color: "#FFFFFF",
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  courseInstructorOnBanner: { fontFamily: FONT_BODY,
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    marginTop: 4,
  },
  metaStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 14,
    paddingBottom: 12,
  },
  metaChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    flexShrink: 1,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F3F4",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaChipText: { fontFamily: FONT_BODY, color: "#3C4043", fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  scheduleStripWrap: { paddingBottom: 14 },
  scheduleStripCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scheduleStripTextWrap: { flex: 1, gap: 3 },
  scheduleStripRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  scheduleStripDays: { fontFamily: FONT_BODY, color: "#202124", fontSize: 12, fontWeight: WEIGHT_EMPHASIS, minWidth: 80 },
  scheduleStripTime: { fontFamily: FONT_BODY, color: "#5F6368", fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  scheduleStripRoom: { fontFamily: FONT_BODY, color: "#80868B", fontSize: 12, fontStyle: "italic" },
  headerBottomDivider: {
    height: 1,
    backgroundColor: "#E8EAED",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  courseCode: { fontFamily: FONT_BODY,
    fontWeight: WEIGHT_EMPHASIS,
    color: "rgba(255,255,255,0.74)",
    marginBottom: 4,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  courseName: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: "#FFF", marginBottom: 10, letterSpacing: 0.2 },
  scheduleDisplayCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  scheduleDisplayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  scheduleDisplayTitle: { fontFamily: FONT_TITLE,
    color: "#FFF",
    fontSize: 13,
    fontWeight: WEIGHT_TITLE,
  },
  scheduleDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 4,
  },
  scheduleDisplayDays: { fontFamily: FONT_BODY,
    color: "#FFF",
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    minWidth: 90,
  },
  scheduleDisplayTime: { fontFamily: FONT_BODY,
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
  },
  scheduleDisplayRoom: { fontFamily: FONT_BODY,
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontStyle: "italic",
  },
  instructor: { fontFamily: FONT_BODY, color: "rgba(255,255,255,0.92)", marginBottom: 6, fontWeight: WEIGHT_EMPHASIS },
  metaText: { fontFamily: FONT_BODY, color: "rgba(255,255,255,0.88)", marginBottom: 4, fontWeight: "500" },
  description: { fontFamily: FONT_BODY, color: "#5F6368", lineHeight: 20, marginBottom: 14, fontWeight: "500" },
  headerInfoCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    padding: 14,
  },
  headerInfoRow: { marginBottom: 12 },
  headerInfoLabel: { fontFamily: FONT_BODY,
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerInfoValue: { fontFamily: FONT_BODY, color: "#FFF", fontSize: 14, fontWeight: WEIGHT_EMPHASIS },
  headerDetailsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headerDetailsGridDesktop: { flexWrap: "nowrap", alignItems: "stretch" },
  headerDetailItemDesktop: { flexBasis: 0, flexGrow: 1, minWidth: 0 },
  academicInfoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: "100%",
  },
  academicInfoTextWrap: { flex: 1 },
  academicInfoLabel: { fontFamily: FONT_BODY,
    color: "#8A8A8A",
    fontSize: 10,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  academicInfoValue: { fontFamily: FONT_BODY, color: "#202124", fontSize: 12, fontWeight: WEIGHT_EMPHASIS, marginTop: 2 },
  classCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  classCodeStandalone: {
    flexGrow: 0,
    flexBasis: "auto",
    alignSelf: "flex-start",
    minWidth: 0,
    marginTop: 14,
  },
  classCodeIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 16,
    backgroundColor: "#F5E9E9",
    alignItems: "center",
    justifyContent: "center",
  },
  classCodeTextWrap: { flex: 1 },
  classCodeLabel: { fontFamily: FONT_BODY, color: "#9AA0A6", fontSize: 10, fontWeight: WEIGHT_EMPHASIS, letterSpacing: 0.8 },
  classCodeValue: {
    color: "#202124",
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    marginTop: 2,
    letterSpacing: 1.2,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingHorizontal: wp("2"),
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    paddingVertical: 14,
  },
  tabActive: { borderBottomColor: "#8B0000" },
  tabContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  tabText: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: "#999" },
  tabTextActive: { color: "#8B0000" },
  contentContainer: {
    paddingVertical: hp("2"),
    backgroundColor: "#FFFFFF",
    width: '94%',
    maxWidth: 1600,
    alignSelf: 'center',
    
  },
  materialCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: hp("1.5"),
    alignItems: "center",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  materialIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#F7EDED",
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp("3"),
  },
  materialInfo: { flex: 1 },
  materialTitle: { fontFamily: FONT_TITLE, fontSize: 14, fontWeight: WEIGHT_TITLE, color: "#000", marginBottom: 4 },
  materialType: { fontFamily: FONT_BODY, fontSize: 12, color: "#999" },
  materialFileName: { fontFamily: FONT_BODY, fontSize: 12, color: "#8B0000", marginTop: 4, fontWeight: WEIGHT_EMPHASIS },
  pdfPreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#E3F2FD",
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pdfPreviewBadgeText: { fontFamily: FONT_BODY, fontSize: 10, fontWeight: WEIGHT_EMPHASIS, color: "#1565C0" },
  // Card chrome mirrors the Module cards (radius 16, 1px #EEE border, 16px
  // padding, 14px gaps) so the two tabs read as one system.
  assignmentCard: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#EEE",
    borderLeftWidth: 4,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  assignmentCardHover: { backgroundColor: "#F7EDED" },
  assignmentHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  assignmentIconTile: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  assignmentInfo: { flex: 1 },
  assignmentTitle: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: WEIGHT_TITLE, color: "#000", marginBottom: 2 },
  assignmentTopicText: { fontFamily: FONT_BODY, color: "#555", fontSize: 12, fontWeight: WEIGHT_EMPHASIS, marginTop: 2, lineHeight: 17 },
  assignmentPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 4 },
  assignmentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F3F3",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  assignmentPillText: { fontFamily: FONT_BODY, fontSize: 11, color: "#444", fontWeight: WEIGHT_EMPHASIS },
  scoreTrack: { height: 6, borderRadius: 3, backgroundColor: "#EEE", overflow: "hidden", marginTop: 8 },
  scoreFill: { height: 6, borderRadius: 3 },
  assignmentFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingTop: 10,
    marginTop: 12,
  },
  assignmentRelDue: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  assignmentViewText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS, color: "#8B0000" },
  // Filter dropdown — copied from Assignments.tsx so both screens match.
  filterDropdownContainer: { position: "relative", width: "100%", zIndex: 4000, marginBottom: 16 },
  filterDropdownContainerLarge: { width: "15%", minWidth: 160 },
  filterDropdownButton: {
    width: "100%",
    height: 46,
    borderWidth: 1,
    borderColor: "#B8AFA7",
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    zIndex: 4001,
  },
  filterDropdownButtonLeft: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
  filterDropdownDot: { width: 8, height: 8, borderRadius: 4 },
  filterDropdownButtonText: {
    fontFamily: FONT_BODY,
    fontSize: 14,
    color: "#111",
    fontWeight: WEIGHT_EMPHASIS,
    flexShrink: 1,
    marginRight: 8,
  },
  filterInlineDropdownMenu: {
    position: "absolute",
    top: 50,
    left: 0,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#CFCFCF",
    overflow: "hidden",
    zIndex: 5000,
    maxHeight: 260,
  },
  filterDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterDropdownItemText: { fontFamily: FONT_BODY, fontSize: 13, color: "#000" },
  filterDropdownModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  filterDropdownModalSheet: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  filterDropdownModalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 14,
    backgroundColor: "#DDD6CE",
    marginBottom: 12,
  },
  filterDropdownModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EBE4",
  },
  filterDropdownModalTitle: { fontFamily: FONT_TITLE, fontSize: 15, fontWeight: WEIGHT_TITLE, color: "#3B332E" },
  filterDropdownModalScroll: { maxHeight: 320 },
  filterDropdownModalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  filterDropdownModalItemSelected: { backgroundColor: "#F7EDED" },
  filterDropdownModalItemText: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, color: "#111" },
  filterDropdownModalItemTextSelected: { fontFamily: FONT_BODY, color: "#6B0000", fontWeight: WEIGHT_EMPHASIS },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  statusText: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, textTransform: "capitalize", fontSize: 12 },
  dueDateText: { fontFamily: FONT_BODY, color: "#8B0000", fontWeight: WEIGHT_EMPHASIS, fontSize: 13, marginBottom: 4 },
  pointsText: { fontFamily: FONT_BODY, fontSize: 12, color: "#666", fontWeight: WEIGHT_EMPHASIS },
  relatedPreviewText: { fontFamily: FONT_BODY, fontSize: 12, color: "#666", marginTop: 8, lineHeight: 18 },
  masteredActivityBadge: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
  },
  masteredActivityText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS, color: "#2E7D32" },
  masteredActivityNotice: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#B7E0BC",
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  masteredActivityNoticeTitle: { fontFamily: FONT_TITLE, color: "#1B5E20", fontSize: 13, fontWeight: WEIGHT_TITLE, marginBottom: 3 },
  masteredActivityNoticeText: { fontFamily: FONT_BODY, color: "#2E7D32", fontSize: 12, lineHeight: 18, fontWeight: WEIGHT_EMPHASIS },
  recommendationBadge: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  recommendationText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  emptyText: { fontFamily: FONT_BODY, textAlign: "center", color: "#777", marginTop: 20, fontSize: 14 },
  viewerModal: { flex: 1, backgroundColor: "#3c3c3c87" },
  viewerTopBar: {
    height: 62,
    backgroundColor: "#8B0000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: Platform.OS === "android" ? 8 : 0,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  viewerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  viewerTitleBlock: { flex: 1, gap: 3 },
  viewerTitle: { fontFamily: FONT_TITLE, color: "#FFF", fontSize: 15, fontWeight: WEIGHT_TITLE, letterSpacing: 0.1 },
  viewerTypeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  viewerTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  viewerTypeText: { fontFamily: FONT_BODY, color: "#8B0000", fontSize: 10, fontWeight: WEIGHT_EMPHASIS, letterSpacing: 0.5 },
  viewerPdfPreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E3F2FD",
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  viewerPdfPreviewText: { fontFamily: FONT_BODY, color: "#1565C0", fontSize: 10, fontWeight: WEIGHT_EMPHASIS, letterSpacing: 0.4 },
  viewerOpenExtBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  viewerExternalPrompt: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
    backgroundColor: "#FFF",
  },
  viewerExternalTitle: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: WEIGHT_TITLE, color: "#111", textAlign: "center" },
  viewerExternalText: { fontFamily: FONT_BODY, fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22 },
  viewerExternalButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#8B0000",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  viewerExternalButtonText: { fontFamily: FONT_BODY, color: "#FFF", fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
  // ═══════════════════════════════════════════════════════════════════
  // FULL-SCREEN ASSIGNMENT DETAIL (Google Classroom style layout)
  // ═══════════════════════════════════════════════════════════════════
  gcRoot: { flex: 1, backgroundColor: "#FFFFFF" },
  gcScreen: { flex: 1, backgroundColor: "#FFFFFF" },
  gcTopBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#DADCE0",
  },
  gcCloseBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  gcTopIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#8B0000", alignItems: "center", justifyContent: "center" },
  gcTopTitle: { flex: 1, fontFamily: FONT_TITLE, fontSize: 17, fontWeight: WEIGHT_TITLE, color: "#3C4043" },
  gcSyncBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#F8F0F0", marginRight: 8 },
  gcScrollContent: { flexGrow: 1, paddingBottom: 48 },
  gcBody: { width: "100%", maxWidth: 1120, alignSelf: "center" },
  gcBodyLarge: { flexDirection: "row", alignItems: "flex-start", gap: 32, paddingHorizontal: 32, paddingTop: 28 },
  gcBodyMobile: { paddingHorizontal: 16, paddingTop: 18 },
  gcMainCol: { minWidth: 0 },
  gcMainColLarge: { flex: 1 },
  gcSideCol: { marginTop: 4, marginBottom: 8 },
  gcSideColLarge: {
    width: 330,
    flexShrink: 0,
    marginTop: 0,
    ...(Platform.OS === "web" ? ({ position: "sticky", top: 16 } as any) : null),
  },
  gcHeader: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 14 },
  gcHeaderIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#8B0000", alignItems: "center", justifyContent: "center" },
  gcTitle: { fontFamily: FONT_TITLE, fontSize: 30, lineHeight: 38, fontWeight: WEIGHT_TITLE, color: "#8B0000" },
  gcTitleMobile: { fontSize: 22, lineHeight: 30 },
  gcSubtitle: { fontFamily: FONT_BODY, fontSize: 14, color: "#5F6368", marginTop: 4, fontWeight: WEIGHT_EMPHASIS },
  gcSubtitleMuted: { fontFamily: FONT_BODY, fontSize: 12, color: "#80868B", marginTop: 2 },
  gcStatsRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 28, rowGap: 10 },
  gcStatLabel: { fontFamily: FONT_BODY, fontSize: 11, color: "#80868B", fontWeight: WEIGHT_EMPHASIS, textTransform: "uppercase", letterSpacing: 0.4 },
  gcStatValue: { fontFamily: FONT_BODY, fontSize: 14, color: "#3C4043", fontWeight: WEIGHT_EMPHASIS, marginTop: 2 },
  gcDivider: { height: 1, backgroundColor: "#DADCE0", marginVertical: 16 },
  gcInstructionText: { fontFamily: FONT_BODY, fontSize: 14, lineHeight: 22, color: "#3C4043" },
  gcWorkCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DADCE0", borderRadius: 12, padding: 16, paddingBottom: 0 },
  gcWorkHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  gcWorkTitle: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: WEIGHT_TITLE, color: "#3C4043" },
  gcWorkStatus: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  gcGradeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 },
  gcGradeLabel: { fontFamily: FONT_BODY, fontSize: 13, color: "#5F6368", fontWeight: WEIGHT_EMPHASIS },
  gcGradeValue: { fontFamily: FONT_BODY, fontSize: 15, color: "#2E7D32", fontWeight: WEIGHT_EMPHASIS },

  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.18)" },
  modalOverlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalWrapper: {
    maxHeight: "92%",
    maxWidth: 1180,
    backgroundColor: "#FFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalWrapperMobile: { maxHeight: "94%", borderRadius: 14, overflow: "hidden" },
  detailContainer: { padding: 16, paddingBottom: 40, backgroundColor: "#FFF" },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  closeButton: { fontFamily: FONT_BODY, fontSize: 20, color: "#666" },
  modalCloseFloating: {
    position: "absolute",
    top: -10,
    left: -10,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  // ✅ NEW: small "Syncing latest..." badge shown while refreshOnOpen runs
  openRefreshBadge: {
    position: 'absolute',
    top: -10,
    right: 6,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  openRefreshBadgeText: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: WEIGHT_EMPHASIS, color: '#8B0000' },
  infoCardMobile: { padding: 16, paddingTop: 28 },
  assignmentModalTitle: { fontFamily: FONT_TITLE,
    fontSize: 18,
    fontWeight: WEIGHT_TITLE,
    color: "#000",
    textAlign: "center",
    marginBottom: 16,
    paddingLeft: 24,
    paddingRight: 8,
  },
  assignmentModalTitleMobile: { fontFamily: FONT_TITLE,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 14,
    paddingLeft: 24,
    paddingRight: 4,
  },
  infoMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    paddingTop: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  infoMetaCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoMetaCardLabel: { fontFamily: FONT_BODY,
    fontSize: 12,
    color: '#777',
    fontWeight: WEIGHT_EMPHASIS,
    marginBottom: 6,
  },
  infoMetaCardValue: { fontFamily: FONT_BODY,
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#222',
  },
  infoMetaBlock: {
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    paddingTop: 12,
    marginBottom: 4,
    gap: 8,
  },
  infoMetaRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  infoMetaLabel: { fontFamily: FONT_BODY,
    width: 90,
    flexShrink: 0,
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    color: "#000",
    lineHeight: 20,
  },
  infoMetaValue: { fontFamily: FONT_BODY, flex: 1, fontSize: 13, fontWeight: "500", color: "#333", lineHeight: 20 },
  infoMetaValueDue: { fontFamily: FONT_BODY, color: "#8B0000", fontWeight: WEIGHT_EMPHASIS },
  infoInstructionBlock: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    paddingTop: 12,
    gap: 4,
  },
  infoInstructionText: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: "400", color: "#444", lineHeight: 20 },
  detailTitle: { fontFamily: FONT_TITLE,
    fontSize: 18,
    fontWeight: WEIGHT_TITLE,
    color: "#000",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  detailContent: {},
  infoCard: {
    position: "relative",
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    padding: 22,
    paddingTop: 28,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#8B0000",
  },
  detailCourseName: { fontFamily: FONT_BODY, color: "#666", fontWeight: WEIGHT_EMPHASIS, fontSize: 13 },
  detailMetaText: { fontFamily: FONT_BODY, color: "#555", fontSize: 12, fontWeight: WEIGHT_EMPHASIS, marginTop: 4 },
  detailTopicText: { fontFamily: FONT_BODY, color: "#444", fontSize: 12, fontWeight: WEIGHT_EMPHASIS, marginTop: 8 },
  detailDescription: { fontFamily: FONT_BODY, color: "#666", marginVertical: 8, lineHeight: 20, fontSize: 13 },
  infoRow: { flexDirection: "row", alignItems: "center", marginVertical: 6, flexWrap: "wrap" },
  infoLabel: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: "#666", fontSize: 13 },
  infoValue: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: "#000", fontSize: 13, marginLeft: 10 },
  materialWarningText: { fontFamily: FONT_BODY,
    marginTop: 12,
    fontSize: 12,
    color: "#B26A00",
    lineHeight: 18,
    fontWeight: WEIGHT_EMPHASIS,
  },
  section: { marginBottom: 18 },
  sasCard: {
    marginBottom: 22,
  },
  sasBulletText: { fontFamily: FONT_BODY, fontSize: 16, lineHeight: 16, color: '#333', marginBottom: 3 },
  // ─── Lesson Preview (read-only lesson detail view) ─────────────────────────
  // Every section title uses the same size/weight, and every section's
  // content is intentionally LARGER than its title (content is what the
  // student actually reads). Line height equals font size (1.0, no extra
  // leading) and there is no border/background decoration — plain text
  // laid out on the page, not boxed "cards". Mirrors TeacherCourseDetail2's
  // Lesson Preview.
  lessonPreviewSectionTitle: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginTop: 4,
    marginBottom: 6,
  },
  // Applied alongside lessonPreviewSectionTitle (via `isLargeScreen &&`) to
  // bump the section title up further on large/tablet/web-width screens.
  lessonPreviewSectionTitleLarge: {
    fontSize: 20,
  },
  lessonPreviewSectionText: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    lineHeight: 16,
    color: '#333',
  },
  sectionLabel: { fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#222',
    marginBottom: 8,
    marginTop: 10,
  },
  sectionTitle: { fontFamily: FONT_TITLE,
    fontSize: 16,
    fontWeight: WEIGHT_TITLE,
    color: '#000',
    marginBottom: 10,
  },
  // 🔥 NEW: icon + title row used wherever a section heading previously had
  // an emoji glyph in front of it (now an Ionicons icon).
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  relatedMaterialItem: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
  },
  relatedMaterialRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  relatedMaterialTitle: { fontFamily: FONT_TITLE, fontWeight: WEIGHT_EMPHASIS, color: "#111", marginBottom: 4 },
  relatedMaterialMeta: { fontFamily: FONT_BODY, color: "#777", fontSize: 12, textTransform: "capitalize" },
  relatedMaterialFileName: { fontFamily: FONT_BODY, fontSize: 12, color: "#8B0000", marginTop: 4, fontWeight: WEIGHT_EMPHASIS },
  relatedMaterialOpenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F7EDED",
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#EBD4D4",
  },
  relatedMaterialOpenText: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: WEIGHT_EMPHASIS, color: "#8B0000" },
  attachmentFileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAF5F5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBD4D4",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 10,
    marginBottom: 8,
  },
  fileInfo: { flex: 1, marginLeft: 8 },
  fileName: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: "#000", marginBottom: 4, fontSize: 13 },
  fileDetails: { fontFamily: FONT_BODY, color: "#888", fontSize: 12 },
  fileActionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 8 },
  fileOpenButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#8B0000",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  fileOpenButtonDisabled: { backgroundColor: "#C57F7F" },
  fileOpenButtonText: { fontFamily: FONT_BODY, color: "#FFF", fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  uploadActionsRow: { gap: 10, marginTop: 8 },
  linkSubmitBox: { gap: 8, marginTop: 8 },
  linkInput: { fontFamily: FONT_BODY,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#000",
  },
  lockedSubmissionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F5F7FA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  lockedSubmissionTitle: { fontFamily: FONT_BODY, color: "#111", fontWeight: WEIGHT_TITLE, fontSize: 13, marginBottom: 3 },
  lockedSubmissionText: { fontFamily: FONT_BODY, color: "#666", fontSize: 12, lineHeight: 18 },
  commentItem: {
    backgroundColor: "#F9F9F9",
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#2196F3",
  },
  instructorComment: { backgroundColor: "#FFF9C4", borderLeftColor: "#FBC02D" },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAuthor: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: "#000", fontSize: 13 },
  teacherBadge: { fontFamily: FONT_BODY,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#251c0099',
    backgroundColor: '#fbc12d99',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    fontSize: 11,
    marginLeft: 8,
  },
  commentContent: { fontFamily: FONT_BODY, fontSize: 13, color: "#333", lineHeight: 18, marginBottom: 6 },
  commentTime: { fontFamily: FONT_BODY, fontSize: 11, color: "#888", fontWeight: "500" },
  commentInputContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 12,
  },
  commentInput: { fontFamily: FONT_BODY,
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    padding: 10,
    minHeight: 60,
    fontSize: 13,
    color: "#000",
    marginBottom: 8,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#8B0000",
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#CCC" },
  sendButtonText: { fontFamily: FONT_BODY, color: "#FFF", fontWeight: WEIGHT_EMPHASIS, fontSize: 13 },
  secondaryButton: {
    backgroundColor: "#EFEFEF",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { fontFamily: FONT_BODY, color: "#444", fontWeight: WEIGHT_EMPHASIS, fontSize: 13 },
  uploadButtonWide: {
    backgroundColor: "#8B0000",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 8,
  },
  uploadButtonText: { fontFamily: FONT_BODY, color: "#FFF", fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
  commentMenuBtn: { padding: 4, marginLeft: 8 },
  editRow: { marginTop: 4 },
  editInput: { fontFamily: FONT_BODY,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#111',
    backgroundColor: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  editActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  editCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#f2f2f2' },
  editCancelText: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: '#111', fontSize: 13 },
  editSaveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#8B0000' },
  editSaveText: { fontFamily: FONT_BODY, fontWeight: WEIGHT_EMPHASIS, color: '#fff', fontSize: 13 },
  commentPostBtnDisabled: { opacity: 0.6 },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 101,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#e5e5e5',
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownOptionText: { fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#111',
    flex: 1,
  },
  dropdownOptionDangerText: {
    color: '#D32F2F',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  deleteModalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: { fontFamily: FONT_TITLE,
    fontSize: 18,
    fontWeight: WEIGHT_TITLE,
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalMessage: { fontFamily: FONT_BODY,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  deleteModalCancelText: { fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#444',
  },
  deleteModalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalConfirmText: { fontFamily: FONT_BODY,
    fontSize: 14,
    fontWeight: WEIGHT_EMPHASIS,
    color: '#FFF',
  },

  // ── Green "Turn in assignment?" variant of the delete-confirm modal —
  // reuses its layout/shape, swaps the red trash accent for the same green
  // used on the SUBMIT button.
  turnInIconContainer: { backgroundColor: '#E6F4EC' },
  turnInConfirmBtn: { backgroundColor: '#308C5D' },
  moduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moduleTitle: { fontFamily: FONT_TITLE,
    fontSize: 16,
    fontWeight: WEIGHT_TITLE,
    color: '#111',
    marginBottom: 8,
  },
  moduleDescription: { fontFamily: FONT_BODY,
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 12,
  },
  moduleSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  moduleSectionTitle: { fontFamily: FONT_TITLE,
    fontSize: 14,
    fontWeight: WEIGHT_TITLE,
    color: '#8B0000',
    marginBottom: 8,
  },
  moduleSectionText: { fontFamily: FONT_BODY,
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  moduleBulletText: { fontFamily: FONT_BODY,
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  moduleSubTitle: { fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: WEIGHT_TITLE,
    color: '#333',
    marginBottom: 4,
    marginTop: 4,
  },
  lessonItem: {
    backgroundColor: '#FAF5F5',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8CCCC',
  },
  lessonTitle: { fontFamily: FONT_TITLE,
    fontSize: 13,
    fontWeight: WEIGHT_TITLE,
    color: '#8B0000',
    marginBottom: 4,
  },
  lessonDescription: { fontFamily: FONT_BODY,
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  modalOverlayCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 12,
  },
  modalCardElevated: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  moduleContentWrapper: {
    paddingHorizontal: wp('4'),
    paddingVertical: 16,
  },
  createHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalHeaderTextWrap: { flex: 1, paddingRight: 12 },
  createTitle: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: WEIGHT_TITLE, color: '#111' },
  modalSubtitle: { fontFamily: FONT_BODY, fontSize: 13, color: '#666', lineHeight: 19, marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#8B0000',
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: WEIGHT_EMPHASIS, textAlign: 'center'},
  removeButton: { fontFamily: FONT_BODY, color: '#8B0000', fontWeight: WEIGHT_EMPHASIS, paddingLeft: 8 },
  previewModalContainer: { flex: 1, backgroundColor: '#3c3c3c87' },
  previewTopBar: {
    height: 62,
    backgroundColor: '#8B0000',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  previewBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewTitleBlock: { flex: 1, gap: 3 },
  previewTitle: { fontFamily: FONT_TITLE, color: '#FFF', fontSize: 15, fontWeight: WEIGHT_TITLE, letterSpacing: 0.1 },
  previewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  previewTypeText: { fontFamily: FONT_BODY, color: '#8B0000', fontSize: 10, fontWeight: WEIGHT_EMPHASIS, letterSpacing: 0.5 },
  previewOpenExtBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  // ✅ Toast portal — matches SignIn/Community/Dashboard/ClassesScreen; lets
  // touches pass through to whatever's behind, except the toast itself.
  toastPortal: {
    ...StyleSheet.absoluteFillObject,
  },

  // ── Course Template (school-wide header/footer) ──
  templateHeaderImage: {
    width: '100%',
    height: 90,
    marginBottom: 14,
  },
  templateFooterImage: {
    width: '100%',
    height: 70,
    marginTop: 18,
  },
  docPageBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5E9E9',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  docPageBadgeText: { fontFamily: FONT_BODY,
    color: '#8B0000',
    fontWeight: WEIGHT_EMPHASIS,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  // ── Lesson Preview — full-screen "Google Classroom" document viewer,
  // matching TeacherCourseDetail2's Lesson Preview. Outer screen behind the
  // "page" is a soft neutral gray so the white letterhead page reads as a
  // sheet of paper, mirroring the Official Grade Report look used in Grades.
  lessonPreviewScreen: {
    flex: 1,
    backgroundColor: '#ECECEC',
  },
  lessonSelectBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  lessonSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F3F3F3',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  lessonSelectBoxBtn: { padding: 3 },
  lessonSelectCaretBtn: { paddingHorizontal: 5, paddingVertical: 6 },
  lessonSelectIndeterminate: {
    width: 18,
    height: 18,
    margin: 2,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: '#8B0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonSelectIndeterminateBar: { width: 8, height: 2.5, borderRadius: 1, backgroundColor: '#8B0000' },
  lessonSelectDivider: { width: 1, height: 22, backgroundColor: '#E2E2E2' },
  lessonSelectDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FAF5F5',
  },
  lessonSelectDownloadText: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: '700', color: '#8B0000' },
  lessonSelectCount: { flex: 1, textAlign: 'right', fontFamily: FONT_BODY, fontSize: 12, color: '#777' },
  sasDocMenuBtn: {
    height: 36,
    paddingHorizontal: 11,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    backgroundColor: '#F5F5F5',
  },
  sasDocMenuCard: {
    position: 'absolute',
    minWidth: 200,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  sasDocMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  sasDocMenuText: { fontFamily: FONT_BODY, fontSize: 14, color: '#222' },
  sasDocMenuHint: { fontFamily: FONT_BODY, fontSize: 11, color: '#888', marginTop: 1 },
  sasDocMenuDivider: { height: 1, backgroundColor: '#EEE', marginHorizontal: 12 },
  printPrepBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  printPrepCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderRadius: 12, backgroundColor: '#FFF', elevation: 8 },
  printPrepText: { fontFamily: FONT_BODY, fontSize: 14, color: '#222' },
  lessonPreviewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 5,
  },
  lessonPreviewBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  lessonPreviewTopBarTextWrap: { flex: 1 },
  lessonPreviewTopBarTitle: { fontFamily: FONT_TITLE, fontSize: 16, fontWeight: WEIGHT_TITLE, color: '#111' },
  lessonPreviewTopBarSubtitle: { fontFamily: FONT_BODY, fontSize: 12, color: '#777', marginTop: 1 },
  lessonPreviewScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  flexOne: {
    flex: 1,
  },
  lessonPreviewPageWrap: {
    width: '100%',
    alignItems: 'center',
  },
  // The "page" itself — same letterhead-card treatment (white sheet, subtle
  // border + shadow, rounded corners) as Grades' reportCard.
  lessonPreviewPage: {
    width: '100%',
    maxWidth: 900,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  lessonPreviewPageWeb: {
    padding: 40,
  },
  lessonPreviewTitleBlock: {
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  lessonPreviewPageTitle: { fontFamily: FONT_TITLE,
    fontSize: 22,
    fontWeight: WEIGHT_TITLE,
    color: '#111',
    marginTop: 6,
  },
});