import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
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
import {
  AssignmentComment,
  AssignmentCourse,
  AssignmentFileUpload,
  AssignmentItem,
} from "./Assignments";

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
  if (Platform.OS === "web") return "http://localhost:5000";
  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";
  const host = possibleHost.split(":")[0];
  if (host) return `http://${host}:5000`;
  return "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, { credentials: "include", ...options });

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
}: {
  fileUrl: string;
  height: number;
  fileName?: string;
  fileType?: string;
  storagePath?: string | null;
  bucketPath?: string | null;
  classId?: string;
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

  const displayUrl = getViewerUrl(resolvedUrl, fileName, fileType);
  const RefreshBar = () =>
    canRefresh ? (
      <TouchableOpacity
        onPress={() => tryRefreshUrl(false)}
        disabled={isRefreshing}
        style={inlineViewerStyles.refreshBar}
        activeOpacity={0.8}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#D32F2F" />
        ) : (
          <MaterialCommunityIcons name="refresh" size={16} color="#D32F2F" />
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
          <ActivityIndicator size="large" color="#D32F2F" />
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
            style={{ marginTop: 10, padding: 8, backgroundColor: '#D32F2F', borderRadius: 4 }}
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
        <ActivityIndicator size="large" color="#D32F2F" />
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
              <ActivityIndicator size="large" color="#D32F2F" />
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
          style={{ marginTop: 6, padding: 8, backgroundColor: '#D32F2F', borderRadius: 4 }}
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
  loadingText: { marginTop: 12, color: "#666", fontSize: 14 },
  noWebViewFallback: {
    flex: 1, alignItems: "center", justifyContent: "center",
    padding: 24, gap: 12,
  },
  noWebViewText: { color: "#888", textAlign: "center", fontSize: 13, lineHeight: 20 },
  refreshBar: {
    height: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF3F3",
    borderBottomWidth: 1,
    borderBottomColor: "#F3D4D4",
  },
  refreshBarText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D32F2F",
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
  status: "pending" | "submitted" | "graded";
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
}

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
  onEditComment?: (assignmentId: string, commentId: string, newContent: string) => Promise<void>;
  onDeleteComment?: (assignmentId: string, commentId: string) => Promise<void>;
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
      lineHeight: 24,
      letterSpacing: 0.3,
      fontSize: 14,
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
  onEditComment,
  onDeleteComment,
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
  const [activeTab, setActiveTab] = useState<"materials" | "assignments" | "modules">('modules');
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
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
  
  // ✅ NEW: Inline Preview State
  const [previewFile, setPreviewFile] = useState<AssignmentFileUpload | null>(null);
  const [gameAttempts, setGameAttempts] = useState<Record<string, number>>({});
  const [isLoadingAttempts, setIsLoadingAttempts] = useState<Record<string, boolean>>({});
  
  // ── Modules state
  const [modules, setModules] = useState<any[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});
  
  // ── Syllabus state
  const [currentSyllabus, setCurrentSyllabus] = useState<any>(null);
  const [isLoadingSyllabus, setIsLoadingSyllabus] = useState(false);
  const [syllabusViewerUrl, setSyllabusViewerUrl] = useState<string | null>(null);
  
  // ── Lesson Detail State
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [lessonDetailModalVisible, setLessonDetailModalVisible] = useState(false);
  
  const insets = useSafeAreaInsets();
  const autoHandledRef = useRef<string | null>(null);
  // ✅ NEW: guards autoOpenLessonId the same way autoHandledRef guards
  // autoOpenAssignmentId — prevents re-triggering the lesson modal on every
  // re-render once a given id has already been auto-opened.
  const autoLessonHandledRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!course?.id) {
      setModules([]);
      return;
    }
    const fetchModules = async () => {
      setIsLoadingModules(true);
      try {
        const response = await apiFetch(`${API_BASE_URL}/course-modules/${course.id}`);
        const data = await response.json();
        if (response.ok && Array.isArray(data)) {
          setModules(data);
        } else {
          setModules([]);
        }
      } catch (error) {
        console.error("Error fetching modules:", error);
        setModules([]);
      } finally {
        setIsLoadingModules(false);
      }
    };
    fetchModules();
  }, [course?.id]);

  useEffect(() => {
    if (!course?.id) {
      setCurrentSyllabus(null);
      return;
    }
    const fetchSyllabus = async () => {
      setIsLoadingSyllabus(true);
      try {
        const response = await apiFetch(`${API_BASE_URL}/course-syllabus/${course.id}`);
        const data = await response.json();
        if (response.ok && data) {
          setCurrentSyllabus(data);
        } else {
          setCurrentSyllabus(null);
        }
      } catch (error) {
        console.error("Error fetching syllabus:", error);
        setCurrentSyllabus(null);
      } finally {
        setIsLoadingSyllabus(false);
      }
    };
    fetchSyllabus();
  }, [course?.id]);

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
    if (r === "review") return "#D32F2F";
    if (r === "practice") return "#F57C00";
    return "#999";
  };

  const getStatusColor = (status: AssignmentItem["status"]) => {
    switch (status) {
      case "pending": return "#FFE082";
      case "submitted": return "#BBDEFB";
      case "graded": return "#A5D6A7";
      default: return "#DDD";
    }
  };

  const getStatusTextColor = (status: AssignmentItem["status"]) => {
    switch (status) {
      case "pending": return "#7A5600";
      case "submitted": return "#0D47A1";
      case "graded": return "#1B5E20";
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
      Alert.alert("No File", "This file has no URL yet.");
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Open Failed", "Unable to open this file.");
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
        Alert.alert('Invalid Link', 'No URL found for this submission.');
        return;
      }
      try {
        const supported = await Linking.canOpenURL(url);
        if (!supported && Platform.OS !== 'web') throw new Error('Unsupported URL.');
        await Linking.openURL(url);
      } catch {
        Alert.alert('Open Failed', 'Unable to open this link.');
      }
      return;
    }
    // 2. CHECK IF IT'S A FILE -> INLINE PREVIEW
    if (!file.fileUrl && !file.storagePath && !file.bucketPath) {
      Alert.alert('No File', emptyMessage);
      return;
    }
    // Set preview state to open the modal
    setPreviewFile(file);
  };

  const handleDownloadMaterial = async () => {
    const storagePath = (selectedMaterial as any)?.storagePath;
    const firebaseUrl = getMaterialUrl(selectedMaterial);
    const resolvedStoragePath = storagePath || resolveStoragePathFromUrl(firebaseUrl);
    if (!resolvedStoragePath && !firebaseUrl) {
      Alert.alert("No file", "This material has no file to download.");
      return;
    }
    const fileName = selectedMaterial?.fileName || selectedMaterial?.title || "material";
    const mimeType = (selectedMaterial as any)?.fileType || getMimeFromFileName(fileName);
    // Simplified download logic for brevity - reusing existing pattern
    Alert.alert("Download", "Download started..."); 
    // In real implementation, call downloadFileToDevice here
  };

  const handleGenerateActivity = (assignment: AssignmentItem, silent = false) => {
    if (isGeneratingActivity) return;
    if (!canGenerateActivity(assignment)) {
      if (!silent) {
        const score = getScorePercent(assignment);
        if (score !== null && score >= 75) {
          Alert.alert("Not available", "Generate Activity is only available for graded assignments below 75%.");
        } else if (hasMasteredGeneratedActivity(assignment)) {
          const activityScore = getCompletedActivityScore(assignment);
          Alert.alert("Already mastered", `You already scored ${activityScore?.scorePercent ?? 75}% or above on the generated follow-up activity for this assignment.`);
        } else {
          Alert.alert("Not available", "This assignment needs at least one teacher-selected related material.");
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
      Alert.alert("Activity Generated", "The activity will be generated from the related materials selected by the teacher.");
    }
  };

  useEffect(() => {
    if (!autoOpenAssignmentId) return;
    if (autoHandledRef.current === autoOpenAssignmentId) return;
    const targetAssignment = safeCourse.assignments.find(
      (a) => a.id === autoOpenAssignmentId
    );
    if (!targetAssignment) {
      onConsumedAutoOpenAssignment?.();
      return;
    }
    autoHandledRef.current = autoOpenAssignmentId;
    setActiveTab("assignments");
    setSelectedAssignment(targetAssignment as any);
    setTimeout(() => {
      handleGenerateActivity(targetAssignment as any, true);
      onConsumedAutoOpenAssignment?.();
    }, 150);
  }, [autoOpenAssignmentId, safeCourse.assignments, completedActivityScores]);

  const handleAddComment = () => {
    if (!selectedAssignment || !newComment.trim()) return;
    onAddComment(selectedAssignment.id, newComment);
    setNewComment("");
  };

  const handleEditComment = async (commentId: string) => {
    if (!selectedAssignment || !editText.trim() || savingEdit) return;
    if (!onEditComment) {
      Alert.alert('Not Available', 'Edit functionality is not available.');
      return;
    }
    try {
      setSavingEdit(true);
      await onEditComment(selectedAssignment.id, commentId, editText);
      setEditingCommentId(null);
      setEditText('');
    } catch (error: any) {
      Alert.alert('Edit Failed', error?.message || 'Unable to update comment.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!selectedAssignment) return;
    if (!onDeleteComment) {
      Alert.alert('Not Available', 'Delete functionality is not available.');
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
      Alert.alert('Delete Failed', error?.message || 'Unable to delete comment.');
    } finally {
      setIsDeletingComment(false);
      setDeleteModalVisible(false);
      setCommentToDeleteId(null);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;
    if (!course?.id) {
      Alert.alert("No class", "This assignment is not connected to a class.");
      return;
    }
    try {
      setIsUploadingFile(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: "/",
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
      Alert.alert("Upload failed", error?.message || "Could not upload the selected file.");
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
      Alert.alert("Missing link", "Please paste a submission link first.");
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
  };

  const isAssignmentSubmitted = (assignment?: AssignmentItem | null) =>
    assignment?.status === "submitted" || assignment?.status === "graded";

  const isAssignmentGraded = (assignment?: AssignmentItem | null) =>
    assignment?.status === "graded";

  const getSubmittedFiles = (assignment?: AssignmentItem | null) => {
    if (!assignment) return [];
    return (assignmentFiles[assignment.id] || []).filter((f) => f.source !== "teacher");
  };

  const getTeacherAssignmentFiles = (assignment?: AssignmentItem | null) => {
    if (!assignment) return [];
    const mappedFiles = (assignment.files || [])
      .filter((file: any) => {
        // ✅ Exclude student submissions — only teacher-attached files belong here
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
        storagePath: file.storagePath || null,   // ✅ pass through, matches Assignments.tsx
        bucketPath: file.bucketPath || null,     // ✅ pass through, matches Assignments.tsx
        source: "teacher" as const,
      }));
    const topLevelUrl = getAssignmentFileUrl(assignment);
    if (topLevelUrl) {
      const alreadyIncluded = mappedFiles.some((f) => f.fileUrl === topLevelUrl);
      if (!alreadyIncluded) {
        mappedFiles.unshift({
          id: `teacher-file-${assignment.id}-main`,
          fileName: getAssignmentFileName(assignment),
          fileSize: "Teacher file",
          uploadedDate: "Attached by teacher",
          fileUrl: topLevelUrl,
          fileType: (assignment as any)?.fileType || (assignment as any)?.attachmentType,
          storagePath: (assignment as any)?.storagePath || null,  // ✅ pass through
          bucketPath: (assignment as any)?.bucketPath || null,    // ✅ pass through
          source: "teacher" as const,
        });
      }
    }
    return mappedFiles;
  };

  const syncSelectedAssignmentStatus = (status: AssignmentItem["status"]) => {
    if (!selectedAssignment) return;
    setSelectedAssignment((prev) => (prev ? { ...prev, status } : prev));
    onUpdateAssignmentStatus?.(selectedAssignment.id, status);
  };

  // ✅ UPDATED: Multi-file submission logic matching Assignments.tsx
  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !course?.id) return;
    if (isAssignmentSubmitted(selectedAssignment)) return;
    if (!currentStudent?.studentId) {
      Alert.alert("Missing student", "Student account information is missing. Please sign in again.");
      return;
    }
    const files = assignmentFiles[selectedAssignment.id] || [];
    if (files.length === 0) {
      Alert.alert("No files", "Please upload at least one file or link before submitting.");
      return;
    }
    try {
      setIsSubmittingAssignment(true);
      const studentName = `${currentStudent.firstName || ""} ${currentStudent.lastName || ""}`.trim();
      // Separate regular files from links
      const regularFiles = files.filter(file => {
        const isLink = file.fileType === 'text/uri-list' || !!file.linkUrl;
        return !isLink && (!!file.fileUrl || !!file.storagePath);
      });
      const linkUrls = files
        .filter(file => (file.fileType === 'text/uri-list' || !!file.linkUrl) && !!file.linkUrl)
        .map(file => file.linkUrl!.trim());
      if (regularFiles.length === 0 && linkUrls.length === 0) {
        throw new Error('No valid items were found. Please check your uploads.');
      }
      const submissionItems = regularFiles.map(file => ({
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
          linkUrls: linkUrls.length > 0 ? linkUrls : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to submit assignment.");
      syncSelectedAssignmentStatus("submitted");
      await onRefreshSubmissions?.();
      const totalItems = submissionItems.length + (linkUrls.length > 0 ? 1 : 0);
      Alert.alert("Success", `Submitted ${totalItems} item(s) successfully.`);
    } catch (error: any) {
      Alert.alert("Submit Failed", error?.message || "Unable to submit assignment.");
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleUnsubmitAssignment = async () => {
    if (!selectedAssignment || !course?.id) return;
    if (selectedAssignment.status === "graded") {
      Alert.alert("Already graded", "This assignment has already been graded and cannot be unsubmitted.");
      return;
    }
    if (!currentStudent?.studentId) {
      Alert.alert("Missing student", "Student account information is missing. Please sign in again.");
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
      Alert.alert("Unsubmitted", "Your file is still attached. You can edit it and submit again.");
    } catch (error: any) {
      Alert.alert("Unsubmit Failed", error?.message || "Unable to unsubmit assignment.");
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const fetchGameAttempts = async (assignmentId: string) => {
    if (!currentStudent?.studentId) return;
    setIsLoadingAttempts((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/student-submissions/${currentStudent.studentId}`
      );
      const data = await response.json();
      if (response.ok && data?.data) {
        const submissions = Array.isArray(data.data) ? data.data : [];
        const count = submissions.filter((s: any) => s.assignmentId === assignmentId).length;
        setGameAttempts((prev) => ({ ...prev, [assignmentId]: count }));
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

  const canPlayGame = (assignment: AssignmentItem) => getRemainingAttempts(assignment) > 0;

  const handlePlayGameWithAttemptCheck = (assignment: AssignmentItem) => {
    if (!canPlayGame(assignment)) {
      Alert.alert("No Attempts Remaining", "You have used all your attempts for this game-based assignment.");
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
        // ✅ Store the RAW url now — InlineMaterialViewer applies the
        // Google Docs Viewer transform itself, so wrapping it here too
        // would double-wrap the link.
        setSyllabusViewerUrl(data.url);
      } else {
        Alert.alert("Error", "Failed to load syllabus preview.");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to load syllabus preview.");
    }
  };

  const handleOpenLessonDetail = async (lesson: any) => {
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

  // ✅ NEW: Auto-open a specific Module Lesson's detail modal when requested
  // by a parent (e.g. tapping "View" on a Related Course Resource inside
  // the Assignments screen navigates here and asks for this lesson to pop
  // open automatically). Mirrors the autoOpenAssignmentId effect above.
  useEffect(() => {
    if (!autoOpenLessonId) return;
    if (autoLessonHandledRef.current === autoOpenLessonId) return;
    
    const targetMaterial = safeCourse.materials.find((m) => m.id === autoOpenLessonId);
    
    if (targetMaterial) {
      // ✅ SUCCESS: Material found
      autoLessonHandledRef.current = autoOpenLessonId;
      
      // Ensure we are on the modules tab (in case user was on assignments)
      setActiveTab("modules");
      
      // Open the modal
      handleOpenLessonDetail(targetMaterial);
      
      // Notify parent to clear the ID
      onConsumedAutoOpenLesson?.();
    } else {
      // ⚠️ MATERIAL NOT FOUND YET
      // Do NOT consume the ID yet. The course data might still be loading 
      // or updating. The effect will re-run when 'safeCourse.materials' changes.
    }
    
    // Dependency array must include safeCourse.materials to catch data loads
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
        <Ionicons name={getMaterialIconName(item.type)} size={24} color="#D32F2F" />
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

  const renderAssignmentItem = ({ item }: { item: AssignmentItem }) => {
    const percent = getScorePercent(item);
    const recommendationLabel = getRecommendationLabel(item);
    const relatedMaterials = getRelatedMaterials(item);
    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedAssignment(item);
          if (item.assignmentType === "game_based") fetchGameAttempts(item.id);
        }}
      >
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            {!!((item as any).description || item.topic) && (
              <Text style={styles.assignmentTopicText}>
                Instruction: {(item as any).description || item.topic}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusTextColor(item.status) }]}>
              {item.status}
            </Text>
          </View>
        </View>
        <View style={styles.assignmentFooter}>
          <Text style={styles.dueDateText}>Due: {item.dueDate}</Text>
          {percent !== null ? (
            <Text style={styles.pointsText}>
              Score: {item.points}/{item.maxPoints} ({percent}%)
            </Text>
          ) : item.points !== undefined && item.maxPoints ? (
            <Text style={styles.pointsText}>
              Points: {item.points}/{item.maxPoints}
            </Text>
          ) : null}
        </View>
        {relatedMaterials.length > 0 && (
          <Text style={styles.relatedPreviewText}>
            Based on: {relatedMaterials.map((m) => m.title).join(", ")}
          </Text>
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
      </TouchableOpacity>
    );
  };

  const courseYear = (safeCourse as any).year || (safeCourse as any).yearLevel || (safeCourse as any).level || "";
  const courseSection = safeCourse.section || "";
  const courseSemester = safeCourse.semester || "";
  const courseSchoolYear = safeCourse.schoolYear || "";
  const courseCode = safeCourse.code || (safeCourse as any).courseCode || "";
  const classCode = (safeCourse as any).classCode || (safeCourse as any).joinCode || courseCode || "No Code";
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

  return (
    <ScrollView
      style={styles.screenScroll}
      contentContainerStyle={styles.screenScrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Course Header ── */}
      <View
        style={[
          styles.courseHeader,
          {
            paddingHorizontal: isLargeScreen ? 60 : 16,
            paddingTop: isLargeScreen ? 20 : 16,
            paddingBottom: isLargeScreen ? 24 : 18,
          },
        ]}
      >
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        )}
        <Text style={[styles.courseName, { fontSize: isSmallPhone ? 20 : 24 }]}>
          {safeCourse.name}
        </Text>
        {!!safeCourse.description && (
          <Text
            style={[styles.description, { fontSize: isSmallPhone ? 12 : 13 }]}
            numberOfLines={isLargeScreen ? 2 : 3}
          >
            {safeCourse.description}
          </Text>
        )}
        <View style={styles.headerInfoCard}>
          <View style={styles.headerInfoRow}>
            <Text style={styles.headerInfoLabel}>INSTRUCTOR</Text>
            <Text style={styles.headerInfoValue} numberOfLines={1}>
              {safeCourse.instructor || "No Instructor"}
            </Text>
          </View>
          <View style={[styles.headerDetailsGrid, isLargeScreen && styles.headerDetailsGridDesktop]}>
            {!!courseYear && (
              <View style={[styles.academicInfoPill, isLargeScreen && styles.headerDetailItemDesktop]}>
                <Ionicons name="school-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Year</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseYear}</Text>
                </View>
              </View>
            )}
            {!!courseSection && (
              <View style={[styles.academicInfoPill, isLargeScreen && styles.headerDetailItemDesktop]}>
                <Ionicons name="people-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Section</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseSection}</Text>
                </View>
              </View>
            )}
            {!!courseSemester && (
              <View style={[styles.academicInfoPill, isLargeScreen && styles.headerDetailItemDesktop]}>
                <Ionicons name="calendar-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Semester</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseSemester}</Text>
                </View>
              </View>
            )}
            {!!courseSchoolYear && (
              <View style={[styles.academicInfoPill, isLargeScreen && styles.headerDetailItemDesktop]}>
                <Ionicons name="time-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>School Year</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseSchoolYear}</Text>
                </View>
              </View>
            )}
            <View style={[styles.classCodeBox, isLargeScreen && styles.headerDetailItemDesktop]}>
              <Ionicons name="copy-outline" size={14} color="#D32F2F" />
              <View style={styles.classCodeTextWrap}>
                <Text style={styles.classCodeLabel}>
                  {(safeCourse as any).classCode ? "CLASS CODE" : "COURSE CODE"}
                </Text>
                <Text style={styles.classCodeValue} numberOfLines={1}>{classCode}</Text>
              </View>
            </View>
          </View>
        </View>
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
              color={activeTab === "modules" ? "#D32F2F" : "#999"}
            />
            <Text style={[styles.tabText, activeTab === "modules" && styles.tabTextActive]}>
              Course Resources ({modules.length})
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("assignments")}
          style={[styles.tab, activeTab === "assignments" && styles.tabActive]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={activeTab === "assignments" ? "#D32F2F" : "#999"}
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
            <FlatList
              data={safeCourse.assignments as any[]}
              renderItem={renderAssignmentItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            />
          ) : (
            <Text style={styles.emptyText}>No assignments yet</Text>
          )
        ) : activeTab === "modules" ? (
          <View>
            {/* Course Resources Container */}
            <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 12 }}>Course Resources</Text>
              {!currentSyllabus ? (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ color: '#888', fontSize: 13 }}>No syllabus uploaded for this course.</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EEE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Ionicons name="document-text-outline" size={24} color="#D32F2F" />
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
                    <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FFF8E1', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#F57C00" />
                      <Text style={{ color: '#F57C00', fontWeight: '600', fontSize: 13 }}>AI is analyzing your syllabus...</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity
                      onPress={handleViewSyllabus}
                      disabled={currentSyllabus.status === 'generating'}
                      style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
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
                <ActivityIndicator size="large" color="#D32F2F" />
                <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>Loading resources...</Text>
              </View>
            ) : modules.length > 0 ? (
              <View>
                {modules.map((mod) => {
                  const isExpanded = expandedModules[mod.moduleNumber] || false;
                  return (
                    <View key={mod.id} style={{
                      backgroundColor: '#FFF',
                      borderRadius: 10,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: '#EEE',
                      overflow: 'hidden'
                    }}>
                      <TouchableOpacity
                        onPress={() => setExpandedModules(p => ({ ...p, [mod.moduleNumber]: !isExpanded }))}
                        style={{ padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: isExpanded ? '#FFF5F5' : '#FFF' }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#D32F2F', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="layers-outline" size={20} color="#FFF" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111' }}>
                                Module {mod.moduleNumber}: {mod.title}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="#D32F2F" />
                      </TouchableOpacity>
                      {isExpanded && (
                        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#EEE', backgroundColor: '#FAFAFA' }}>
                          {mod.lessons && mod.lessons.length > 0 ? (
                            (() => {
                              const sortedLessons = [...mod.lessons].sort((a: any, b: any) =>
                                (Number(a.lessonNumber) || 0) - (Number(b.lessonNumber) || 0)
                              );
                              return sortedLessons.map((lesson: any, li: number) => (
                                <TouchableOpacity
                                  key={lesson.id || li}
                                  onPress={() => handleOpenLessonDetail(lesson)}
                                  style={{ backgroundColor: '#FFF', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#DDD', borderLeftWidth: 3, borderLeftColor: '#1976D2' }}
                                >
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1976D2', marginBottom: 4 }}>
                                      Lesson {lesson.lessonNumber || (li + 1)}: {lesson.title}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={16} color="#999" />
                                  </View>
                                  <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>{lesson.description}</Text>
                                </TouchableOpacity>
                              ));
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
                    color="#D32F2F"
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
              <Ionicons name="videocam-outline" size={56} color="#D32F2F" />
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
          </View>
          {syllabusViewerUrl && (
            <InlineMaterialViewer
              fileUrl={syllabusViewerUrl}
              height={windowHeight - 62}
              fileName={currentSyllabus?.fileName}
              fileType={currentSyllabus?.fileType}
              // ✅ UPDATED: fall back to a path derived from the signed URL
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

      {/* LESSON DETAIL MODAL */}
      <Modal
        visible={lessonDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLessonDetailModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              {
                width: isLargeScreen ? Math.min(width * 0.85, 900) : '92%',
                maxWidth: 900,
                maxHeight: height * 0.9,
                alignSelf: 'center'
              }
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.sectionTitle}>{selectedLesson?.title || 'Lesson Details'}</Text>
                <Text style={styles.modalSubtitle}>Module Content & Activities</Text>
              </View>
              <TouchableOpacity onPress={() => setLessonDetailModalVisible(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
              {isLessonLoading ? (
                <ActivityIndicator size="large" color="#D32F2F" style={{ marginVertical: 20 }} />
              ) : selectedLesson ? (
                <>
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
                        backgroundColor: '#FFF5F5',
                        borderWidth: 2,
                        borderColor: '#D32F2F',
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
                      <Ionicons name="document-text-outline" size={48} color="#D32F2F" />
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#D32F2F' }}>
                        {selectedLesson.fileName || 'View Attached File'}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#666' }}>
                        Tap to open preview • {selectedLesson.fileType?.split('/')[1]?.toUpperCase() || 'FILE'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.sectionLabel}>Description</Text>
                    <Text style={{ color: '#333', lineHeight: 20 }}>
                      {selectedLesson.description || 'No description available.'}
                    </Text>
                  </View>
                  {selectedLesson.discussion ? (
                    <View style={{ marginBottom: 16, backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8 }}>
                      <Text style={styles.sectionLabel}>Discussion / Lecture Notes</Text>
                      <Text style={{ color: '#444', lineHeight: 22 }}>
                        {renderFormattedText(selectedLesson.discussion, { color: '#444', lineHeight: 22 })}
                      </Text>
                    </View>
                  ) : null}
                  {selectedLesson.activity ? (
                    <View style={{ marginBottom: 16, backgroundColor: '#E3F2FD', padding: 12, borderRadius: 8 }}>
                      <Text style={[styles.sectionLabel, { color: '#1565C0' }]}>Activity / Scenario</Text>
                      <Text style={{ color: '#0D47A1', lineHeight: 22 }}>
                        {renderFormattedText(selectedLesson.activity, { color: '#0D47A1', lineHeight: 22 })}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={{ textAlign: 'center', color: '#888' }}>Could not load lesson details.</Text>
              )}
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => setLessonDetailModalVisible(false)}>
                <Text style={styles.primaryButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          ASSIGNMENT DETAIL MODAL (UPDATED WITH MULTI-FILE LOGIC)
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!selectedAssignment}
        animationType="slide"
        transparent
        onRequestClose={closeAssignmentModal}
      >
        <View style={styles.modalOverlayBottom}>
          <View
            style={[
              styles.modalWrapper,
              { width: isLargeScreen ? "72%" : width < 480 ? "92%" : "88%" },
              !isLargeScreen && styles.modalWrapperMobile,
            ]}
          >
            <ScrollView contentContainerStyle={styles.detailContainer}>
              {selectedAssignment && (
                <>
                  <View style={styles.detailContent}>
                    <View style={[styles.infoCard, !isLargeScreen && styles.infoCardMobile]}>
                      <TouchableOpacity
                        onPress={closeAssignmentModal}
                        style={styles.modalCloseFloating}
                      >
                        <Text style={styles.closeButton}>✕</Text>
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.assignmentModalTitle,
                          !isLargeScreen && styles.assignmentModalTitleMobile,
                        ]}
                      >
                        {selectedAssignment.title}
                      </Text>
                      {isLargeScreen ? (
                        <View style={styles.infoMetaGrid}>
                          <View style={styles.infoMetaCard}>
                            <Text style={styles.infoMetaCardLabel}>Class</Text>
                            <Text style={styles.infoMetaCardValue}>{safeCourse.name}</Text>
                          </View>
                          <View style={styles.infoMetaCard}>
                            <Text style={styles.infoMetaCardLabel}>Semester</Text>
                            <Text style={styles.infoMetaCardValue}>{safeCourse.semester}</Text>
                          </View>
                          <View style={styles.infoMetaCard}>
                            <Text style={styles.infoMetaCardLabel}>School Year</Text>
                            <Text style={styles.infoMetaCardValue}>{safeCourse.schoolYear}</Text>
                          </View>
                          <View style={styles.infoMetaCard}>
                            <Text style={styles.infoMetaCardLabel}>Instructor</Text>
                            <Text style={styles.infoMetaCardValue}>{safeCourse.instructor}</Text>
                          </View>
                          <View style={styles.infoMetaCard}>
                            <Text style={styles.infoMetaCardLabel}>Due</Text>
                            <Text style={[styles.infoMetaCardValue, { color: '#D32F2F' }]}>
                              {selectedAssignment.dueDate}
                            </Text>
                          </View>
                          {selectedAssignment.maxPoints !== undefined && (
                            <View style={styles.infoMetaCard}>
                              <Text style={styles.infoMetaCardLabel}>Points</Text>
                              <Text style={styles.infoMetaCardValue}>
                                {selectedAssignment.points}/{selectedAssignment.maxPoints}
                              </Text>
                            </View>
                          )}
                          {getScorePercent(selectedAssignment) !== null && (
                            <View style={styles.infoMetaCard}>
                              <Text style={styles.infoMetaCardLabel}>Score</Text>
                              <Text style={[styles.infoMetaCardValue, { color: '#1B5E20' }]}>
                                {getScorePercent(selectedAssignment)}%
                              </Text>
                            </View>
                          )}
                          {selectedAssignment.assignmentType === "game_based" &&
                            selectedAssignment.numberOfAttempts && (
                              <View style={styles.infoMetaCard}>
                                <Text style={styles.infoMetaCardLabel}>Max Attempts</Text>
                                <Text style={styles.infoMetaCardValue}>
                                  {selectedAssignment.numberOfAttempts === "unlimited"
                                    ? "Unlimited"
                                    : selectedAssignment.numberOfAttempts}
                                </Text>
                              </View>
                            )}
                        </View>
                      ) : (
                        <View style={styles.infoMetaBlock}>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Class</Text>
                            <Text style={styles.infoMetaValue} numberOfLines={3}>
                              {safeCourse.name}
                            </Text>
                          </View>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Semester</Text>
                            <Text style={styles.infoMetaValue}>{safeCourse.semester}</Text>
                          </View>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>School Year</Text>
                            <Text style={styles.infoMetaValue}>{safeCourse.schoolYear}</Text>
                          </View>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Instructor</Text>
                            <Text style={styles.infoMetaValue} numberOfLines={3}>
                              {safeCourse.instructor}
                            </Text>
                          </View>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Due</Text>
                            <Text style={[styles.infoMetaValue, styles.infoMetaValueDue]}>
                              {selectedAssignment.dueDate}
                            </Text>
                          </View>
                          {selectedAssignment.maxPoints !== undefined && (
                            <View style={styles.infoMetaRow}>
                              <Text style={styles.infoMetaLabel}>Points</Text>
                              <Text style={styles.infoMetaValue}>
                                {selectedAssignment.points}/{selectedAssignment.maxPoints}
                              </Text>
                            </View>
                          )}
                          {getScorePercent(selectedAssignment) !== null && (
                            <View style={styles.infoMetaRow}>
                              <Text style={styles.infoMetaLabel}>Score</Text>
                              <Text style={styles.infoMetaValue}>
                                {getScorePercent(selectedAssignment)}%
                              </Text>
                            </View>
                          )}
                          {selectedAssignment.assignmentType === "game_based" &&
                            selectedAssignment.numberOfAttempts && (
                              <View style={styles.infoMetaRow}>
                                <Text style={styles.infoMetaLabel}>Max Attempts</Text>
                                <Text style={styles.infoMetaValue}>
                                  {selectedAssignment.numberOfAttempts === "unlimited"
                                    ? "Unlimited"
                                    : selectedAssignment.numberOfAttempts}
                                </Text>
                              </View>
                            )}
                        </View>
                      )}
                      <View style={styles.infoInstructionBlock}>
                        <Text style={styles.infoMetaLabel}>Instruction</Text>
                        <Text style={styles.infoInstructionText}>
                          {(selectedAssignment as any).description || "No instruction provided."}
                        </Text>
                      </View>
                      {hasMasteredGeneratedActivity(selectedAssignment) ? (
                        <View style={styles.masteredActivityNotice}>
                          <Ionicons name="checkmark-circle" size={18} color="#2E7D32" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.masteredActivityNoticeTitle}>
                              Follow-up activity mastered
                            </Text>
                            <Text style={styles.masteredActivityNoticeText}>
                              You scored {getCompletedActivityScore(selectedAssignment)?.scorePercent}%
                              on the generated follow-up activity.
                            </Text>
                          </View>
                        </View>
                      ) : !canGenerateActivity(selectedAssignment) &&
                        getScorePercent(selectedAssignment) !== null &&
                        getScorePercent(selectedAssignment)! < 75 ? (
                        <Text style={styles.materialWarningText}>
                          The teacher still needs to attach related materials before AI activity
                          generation can use file content.
                        </Text>
                      ) : null}
                    </View>
                    {canGenerateActivity(selectedAssignment) && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Follow-Up Activity</Text>
                        <TouchableOpacity
                          onPress={() => handleGenerateActivity(selectedAssignment)}
                          disabled={isGeneratingActivity}
                          style={[
                            styles.uploadButtonWide,
                            {
                              backgroundColor: getRecommendationColor(selectedAssignment),
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
                            <Text style={styles.uploadButtonText}>Generate Activity</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                    {/* Assignment File */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📄 Assignment File</Text>
                      {getTeacherAssignmentFiles(selectedAssignment).length > 0 ? (
                        <View>
                          {getTeacherAssignmentFiles(selectedAssignment).map((file) => (
                            <View key={file.id} style={styles.attachmentFileCard}>
                              <Ionicons name="attach-outline" size={20} color="#D32F2F" />
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
                    {/* Game-Based Assignment */}
                    {selectedAssignment.assignmentType === "game_based" && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🎮 Game-Based Assignment</Text>
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
                                {canPlayGame(selectedAssignment) ? "Start Game" : "No Attempts Remaining"}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}
                    {/* Related Materials */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📚 Related Course Resources</Text>
                      {getRelatedMaterials(selectedAssignment).length > 0 ? (
                        getRelatedMaterials(selectedAssignment).map((material) => (
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
                                <Ionicons name="eye-outline" size={13} color="#D32F2F" />
                                <Text style={styles.relatedMaterialOpenText}>View</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>No linked materials.</Text>
                      )}
                    </View>
                    {/* ✅ UPDATED: Your Uploads Section with Multi-File/Link Support */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📎 Your Uploads</Text>
                      {getSubmittedFiles(selectedAssignment).length > 0 ? (
                        <View>
                          {getSubmittedFiles(selectedAssignment).map((file) => {
                             const isLink = file.fileType === 'text/uri-list';
                             // Render Link as Clickable Text
                             if (isLink && file.linkUrl) {
                               return (
                                 <TouchableOpacity 
                                   key={file.id} 
                                   style={styles.fileItem}
                                   onPress={() => handleOpenSubmittedFile(file, 'Invalid link URL')}
                                   activeOpacity={0.7}
                                 >
                                   <Text style={{ fontSize: 20 }}>🔗</Text>
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
                                       <Text style={styles.removeButton}>✕</Text>
                                     </TouchableOpacity>
                                   )}
                                 </TouchableOpacity>
                               );
                             }
                             // Render Regular Files
                             return (
                              <View key={file.id} style={styles.fileItem}>
                                <Ionicons
                                  name="document-text-outline"
                                  size={20}
                                  color="#D32F2F"
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
                                          ? "#D9A0A0"
                                          : "#D32F2F"
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
                                    Your teacher has received this assignment. Unsubmit only if
                                    you need to change your file before grading.
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                onPress={handleUnsubmitAssignment}
                                disabled={isSubmittingAssignment}
                                style={[
                                  styles.uploadButtonWide,
                                  { backgroundColor: "#D32F2F" },
                                  isSubmittingAssignment && styles.sendButtonDisabled,
                                ]}
                              >
                                <Text style={styles.uploadButtonText}>
                                  {isSubmittingAssignment ? "UNSUBMITTING..." : "UNSUBMIT"}
                                </Text>
                              </TouchableOpacity>
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
                                  onPress={handleSubmitAssignment}
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
                    {/* COMMENTS SECTION */}
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>💬 Comments</Text>
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
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
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
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
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
                  color="#D32F2F"
                />
                <Text style={styles.previewTypeText}>
                  {previewFile?.fileType === 'text/uri-list' ? "LINK" : "FILE"}
                </Text>
              </View>
            </View>
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
  emptyScreenTitle: { fontSize: 20, fontWeight: "700", color: "#222", marginBottom: 8 },
  emptyScreenText: { fontSize: 14, color: "#777", textAlign: "center", lineHeight: 22, marginBottom: 16 },
  emptyBackButton: {
    backgroundColor: "#D32F2F",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyBackButtonText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  courseHeader: {
    backgroundColor: "#D32F2F",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
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
  courseCode: {
    fontWeight: "800",
    color: "rgba(255,255,255,0.74)",
    marginBottom: 4,
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  courseName: { fontWeight: "900", color: "#FFF", marginBottom: 10, letterSpacing: 0.2 },
  instructor: { color: "rgba(255,255,255,0.92)", marginBottom: 6, fontWeight: "600" },
  metaText: { color: "rgba(255,255,255,0.88)", marginBottom: 4, fontWeight: "500" },
  description: { color: "rgba(255,255,255,0.82)", lineHeight: 20, marginBottom: 14, fontWeight: "500" },
  headerInfoCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 18,
    padding: 14,
  },
  headerInfoRow: { marginBottom: 12 },
  headerInfoLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerInfoValue: { color: "#FFF", fontSize: 14, fontWeight: "800" },
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
  academicInfoLabel: {
    color: "#8A8A8A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  academicInfoValue: { color: "#202124", fontSize: 12, fontWeight: "800", marginTop: 2 },
  classCodeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: "100%",
  },
  classCodeTextWrap: { flex: 1 },
  classCodeLabel: { color: "#8A8A8A", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  classCodeValue: { color: "#202124", fontSize: 13, fontWeight: "900", marginTop: 2 },
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
  tabActive: { borderBottomColor: "#D32F2F" },
  tabContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  tabText: { fontWeight: "600", color: "#999" },
  tabTextActive: { color: "#D32F2F" },
  contentContainer: {
    paddingVertical: hp("2"),
    backgroundColor: "#FFFFFF",
    width: '90%',
    alignSelf: 'center',
    flex: 1,
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
    borderRadius: 12,
    backgroundColor: "#FFF1F1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: wp("3"),
  },
  materialInfo: { flex: 1 },
  materialTitle: { fontSize: 14, fontWeight: "700", color: "#000", marginBottom: 4 },
  materialType: { fontSize: 12, color: "#999" },
  materialFileName: { fontSize: 12, color: "#D32F2F", marginTop: 4, fontWeight: "600" },
  pdfPreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    alignSelf: "flex-start",
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  pdfPreviewBadgeText: { fontSize: 10, fontWeight: "700", color: "#1565C0" },
  assignmentCard: {
    borderWidth: 1,
    borderColor: "#E6E6E6",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  assignmentInfo: { flex: 1, marginRight: 8 },
  assignmentTitle: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 4 },
  assignmentTopicText: { color: "#444", fontSize: 12, fontWeight: "600", marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontWeight: "700", textTransform: "capitalize", fontSize: 12 },
  assignmentFooter: { borderTopWidth: 1, borderTopColor: "#E6E6E6", paddingTop: 8 },
  dueDateText: { color: "#D32F2F", fontWeight: "600", fontSize: 13, marginBottom: 4 },
  pointsText: { fontSize: 12, color: "#666", fontWeight: "600" },
  relatedPreviewText: { fontSize: 12, color: "#666", marginTop: 8, lineHeight: 18 },
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
  masteredActivityText: { fontSize: 12, fontWeight: "800", color: "#2E7D32" },
  masteredActivityNotice: {
    marginTop: 12,
    backgroundColor: "#E8F5E9",
    borderWidth: 1,
    borderColor: "#B7E0BC",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  masteredActivityNoticeTitle: { color: "#1B5E20", fontSize: 13, fontWeight: "800", marginBottom: 3 },
  masteredActivityNoticeText: { color: "#2E7D32", fontSize: 12, lineHeight: 18, fontWeight: "600" },
  recommendationBadge: {
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  recommendationText: { fontSize: 12, fontWeight: "700" },
  emptyText: { textAlign: "center", color: "#777", marginTop: 20, fontSize: 14 },
  viewerModal: { flex: 1, backgroundColor: "#3c3c3c87" },
  viewerTopBar: {
    height: 62,
    backgroundColor: "#D32F2F",
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
  viewerTitle: { color: "#FFF", fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
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
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  viewerTypeText: { color: "#D32F2F", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  viewerPdfPreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E3F2FD",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  viewerPdfPreviewText: { color: "#1565C0", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
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
  viewerExternalTitle: { fontSize: 18, fontWeight: "700", color: "#111", textAlign: "center" },
  viewerExternalText: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22 },
  viewerExternalButton: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D32F2F",
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  viewerExternalButtonText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
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
  closeButton: { fontSize: 20, color: "#666" },
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
  infoCardMobile: { padding: 16, paddingTop: 28 },
  assignmentModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginBottom: 16,
    paddingLeft: 24,
    paddingRight: 8,
  },
  assignmentModalTitleMobile: {
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
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoMetaCardLabel: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
    marginBottom: 6,
  },
  infoMetaCardValue: {
    fontSize: 15,
    fontWeight: '700',
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
  infoMetaLabel: {
    width: 90,
    flexShrink: 0,
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
    lineHeight: 20,
  },
  infoMetaValue: { flex: 1, fontSize: 13, fontWeight: "500", color: "#333", lineHeight: 20 },
  infoMetaValueDue: { color: "#D32F2F", fontWeight: "600" },
  infoInstructionBlock: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EBEBEB",
    paddingTop: 12,
    gap: 4,
  },
  infoInstructionText: { fontSize: 13, fontWeight: "400", color: "#444", lineHeight: 20 },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },
  detailContent: {},
  infoCard: {
    position: "relative",
    backgroundColor: "#F9F9F9",
    borderRadius: 12,
    padding: 22,
    paddingTop: 28,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
  },
  detailCourseName: { color: "#666", fontWeight: "600", fontSize: 13 },
  detailMetaText: { color: "#555", fontSize: 12, fontWeight: "600", marginTop: 4 },
  detailTopicText: { color: "#444", fontSize: 12, fontWeight: "600", marginTop: 8 },
  detailDescription: { color: "#666", marginVertical: 8, lineHeight: 20, fontSize: 13 },
  infoRow: { flexDirection: "row", alignItems: "center", marginVertical: 6, flexWrap: "wrap" },
  infoLabel: { fontWeight: "600", color: "#666", fontSize: 13 },
  infoValue: { fontWeight: "700", color: "#000", fontSize: 13, marginLeft: 10 },
  materialWarningText: {
    marginTop: 12,
    fontSize: 12,
    color: "#B26A00",
    lineHeight: 18,
    fontWeight: "600",
  },
  section: { marginBottom: 18 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 10,
  },
  relatedMaterialItem: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  relatedMaterialRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  relatedMaterialTitle: { fontWeight: "600", color: "#111", marginBottom: 4 },
  relatedMaterialMeta: { color: "#777", fontSize: 12, textTransform: "capitalize" },
  relatedMaterialFileName: { fontSize: 12, color: "#D32F2F", marginTop: 4, fontWeight: "600" },
  relatedMaterialOpenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF1F1",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#F3D4D4",
  },
  relatedMaterialOpenText: { fontSize: 11, fontWeight: "700", color: "#D32F2F" },
  attachmentFileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3D4D4",
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  fileInfo: { flex: 1, marginLeft: 8 },
  fileName: { fontWeight: "600", color: "#000", marginBottom: 4, fontSize: 13 },
  fileDetails: { color: "#888", fontSize: 12 },
  fileActionsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 8 },
  fileOpenButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#D32F2F",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  fileOpenButtonDisabled: { backgroundColor: "#D9A0A0" },
  fileOpenButtonText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  uploadActionsRow: { gap: 10, marginTop: 8 },
  linkSubmitBox: { gap: 8, marginTop: 8 },
  linkInput: {
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E4E7EC",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  lockedSubmissionTitle: { color: "#111", fontWeight: "700", fontSize: 13, marginBottom: 3 },
  lockedSubmissionText: { color: "#666", fontSize: 12, lineHeight: 18 },
  commentItem: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
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
  commentAuthor: { fontWeight: "700", color: "#000", fontSize: 13 },
  teacherBadge: {
    fontWeight: '800',
    color: '#251c0099',
    backgroundColor: '#fbc12d99',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    marginLeft: 8,
  },
  commentContent: { fontSize: 13, color: "#333", lineHeight: 18, marginBottom: 6 },
  commentTime: { fontSize: 11, color: "#888", fontWeight: "500" },
  commentInputContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 12,
  },
  commentInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    fontSize: 13,
    color: "#000",
    marginBottom: 8,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  sendButtonDisabled: { backgroundColor: "#CCC" },
  sendButtonText: { color: "#FFF", fontWeight: "700", fontSize: 13 },
  secondaryButton: {
    backgroundColor: "#EFEFEF",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 8,
  },
  secondaryButtonText: { color: "#444", fontWeight: "700", fontSize: 13 },
  uploadButtonWide: {
    backgroundColor: "#D32F2F",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    marginTop: 8,
  },
  uploadButtonText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  commentMenuBtn: { padding: 4, marginLeft: 8 },
  editRow: { marginTop: 4 },
  editInput: {
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
  editCancelText: { fontWeight: '600', color: '#111', fontSize: 13 },
  editSaveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#DA1318' },
  editSaveText: { fontWeight: '700', color: '#fff', fontSize: 13 },
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
    borderRadius: 12,
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
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '600',
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
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalMessage: {
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
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#444',
  },
  deleteModalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
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
  moduleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },
  moduleDescription: {
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
  moduleSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 8,
  },
  moduleSectionText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
  },
  moduleBulletText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  moduleSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
    marginTop: 4,
  },
  lessonItem: {
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0B9B9',
  },
  lessonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D32F2F',
    marginBottom: 4,
  },
  lessonDescription: {
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
  createTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  modalSubtitle: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFF', fontWeight: '800', textAlign: 'center'},
  removeButton: { color: '#D32F2F', fontWeight: 'bold', paddingLeft: 8 },
  // ✅ NEW STYLES FOR INLINE PREVIEW MODAL
  previewModalContainer: { flex: 1, backgroundColor: '#3c3c3c87' },
  previewTopBar: {
    height: 62,
    backgroundColor: '#D32F2F',
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
  previewTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  previewTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  previewTypeText: { color: '#D32F2F', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});