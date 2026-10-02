import Constants from "expo-constants";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import type { Assignment, Member, Submission } from "./TeacherCourseDetail2";
// ✅ ADDED: FileSystem and Sharing for downloads
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { FONT_BODY, FONT_TITLE } from '../theme/typography';
// ✅ Reuses the same Toast component used across the app (Admin/Teacher screens)
// instead of native Alert dialogs.
import Toast from '../Final_Admin_Components/Toast';

type ToastType = 'success' | 'error' | 'info';

// ✅ NEW: Optional WebView import (mirrors CourseDetail.tsx pattern)
let WebView: any = null;
try {
  WebView = require("react-native-webview").WebView;
} catch (_) {}

function getApiBaseUrl() {
  // Prefer the deployed backend URL on every platform — including native /
  // Expo Go — since EXPO_PUBLIC_ vars are inlined for native builds too, not
  // just web. Only fall back to guessing a local dev server's LAN IP when
  // no URL has been configured (e.g. testing against a backend running on
  // your own machine during local dev).
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === "web") {
    console.warn("EXPO_PUBLIC_API_URL is not set; API calls will fail.");
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = possibleHost.split(":")[0];

  return host
    ? `http://${host}:5000`
    : "http://192.168.1.5:5000";
}


const API_BASE_URL = getApiBaseUrl();
const apiFetch = (url: string, options: any = {}) =>
  fetch(url, { credentials: "include", ...options });

// ─────────────────────────────────────────────────────────────────────────────
// ✅ HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

// ✅ MOVED HERE: Defined at top level so InlineMaterialViewer can access it
function isImageFile(fileName: string, fileType?: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const mime = (fileType || '').toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || 
         mime.startsWith('image/');
}

function getGoogleDocsViewerUrl(fileUrl: string) {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}

// ✅ UPDATED: Accepts fileName and fileType to handle images natively
function InlineMaterialViewer({
  viewerUrl,
  height,
  fileName,
  fileType,
}: {
  viewerUrl: string;
  height: number;
  fileName?: string;
  fileType?: string;
}) {
  // ✅ Direct image rendering for JPG/PNG/GIF
  if (fileName && isImageFile(fileName, fileType)) {
    if (Platform.OS === "web") {
      return (
        <View style={{ flex: 1, width: "100%", height, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
          {/* @ts-ignore */}
          <img
            src={viewerUrl}
            alt={fileName}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </View>
      );
    }
    
    // Native Image fallback via WebView HTML
    if (WebView) {
       return (
        <WebView
          source={{ html: `<html><body style="margin:0;padding:0;display:flex;align-items:center;justify-content:center;height:100vh;background:#f0f0f0;"><img src="${viewerUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" /></body></html>` }}
          style={{ flex: 1, width: "100%", height }}
          startInLoadingState
          renderLoading={() => (
            <View style={previewViewerStyles.loadingOverlay}>
              <ActivityIndicator size="large" color="#8B0000" />
              <Text style={previewViewerStyles.loadingText}>Loading image...</Text>
            </View>
          )}
        />
      );
    }
  }

  // Existing Document Viewer Logic
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, width: "100%", height }}>
        {/* @ts-ignore */}
        <iframe
          src={viewerUrl}
          style={{ width: "100%", height: "100%", border: "none" }}
          allow="autoplay"
          title="Document Viewer"
        />
      </View>
    );
  }

  if (WebView) {
    return (
      <WebView
        source={{ uri: viewerUrl }}
        style={{ flex: 1, width: "100%", height }}
        startInLoadingState
        renderLoading={() => (
          <View style={previewViewerStyles.loadingOverlay}>
            <ActivityIndicator size="large" color="#8B0000" />
            <Text style={previewViewerStyles.loadingText}>Loading document...</Text>
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={["*"]}
        mixedContentMode="always"
      />
    );
  }

  return (
    <View style={previewViewerStyles.noWebViewFallback}>
      <MaterialCommunityIcons name="file-document-outline" size={48} color="#CCC" />
      <Text style={previewViewerStyles.noWebViewText}>
        Install react-native-webview to preview files inline.
      </Text>
    </View>
  );
}

const previewViewerStyles = StyleSheet.create({
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  loadingText: { fontFamily: FONT_BODY, marginTop: 12, color: "#666", fontSize: 14 },
  noWebViewFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  noWebViewText: { fontFamily: FONT_BODY, color: "#888", textAlign: "center", fontSize: 13, lineHeight: 20 },
});

type Props = {
  members: Member[];
  currentAssignment?: Assignment;
  submissions: Submission[];
  onBack: () => void;
  onOpenUpdate: () => void;
  classId?: string;
  currentTeacher?: {
    teacherId?: string;
    authUid?: string | null;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  onGradeSubmission?: (
    submissionId: string,
    score: number,
    feedback: string
  ) => Promise<void> | void;
  // ✅ NEW: Let the parent refetch submissions (e.g. re-hit /class-submissions/:classId)
  // so newly-submitted work from students shows up without leaving this screen.
  onRefreshSubmissions?: () => Promise<void> | void;
  // ✅ NEW: How often (ms) to auto-poll for new comments/submissions. Set to 0 to disable.
  autoRefreshIntervalMs?: number;
  // ✅ LIVE: bumped by the parent when the server pushes a change (see useLiveEvents).
  liveRefreshToken?: number;
  // 👇 ADDED: Deep-link support — when set, auto-selects this student and
  // expands their comment thread (used when opened from an
  // "assignment-comment" notification).
  initialStudentId?: string | null;
  onInitialStudentHandled?: () => void;
};

type AssignmentComment = {
  id: string;
  assignmentId: string;
  classId: string;
  studentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  isInstructor: boolean;
  timestamp: string;
  createdAt?: any;
  updatedAt?: any;
};

type FilterKey = "all" | "submitted" | "graded" | "late" | "pending";

// ✅ NEW: Shape of an individual submitted item (file or link) used by the Preview Modal
type SubmissionPreviewSource = {
  id: string;
  submissionId: string;
  type: "file" | "link";
  url?: string;
  fileName: string;
  fileType?: string;
  submittedAt?: any;
  status?: string;
  storagePath?: string | null; 
};

const TeacherSubmissionsSection = ({
  members,
  currentAssignment,
  submissions,
  onBack,
  onOpenUpdate,
  classId,
  currentTeacher,
  onGradeSubmission,
  onRefreshSubmissions,
  autoRefreshIntervalMs = 15000,
  liveRefreshToken,
  initialStudentId,
  onInitialStudentHandled,
}: Props) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallPhone = width < 360;
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1200;
  const isLargeScreen = width >= 1200;
  const pagePadding = isSmallPhone ? 12 : isMobile ? 14 : isTablet ? 20 : 24;
  const mobileTopSpace = isMobile ? insets.top : 0;

  // ✅ Toast state — replaces native Alert usage with the shared Toast UI.
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'success' });

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ visible: true, message: message.length > 60 ? `${message.slice(0, 59)}…` : message, type });
  };

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  // Add this state at the component level
  const [freshUrlsCache, setFreshUrlsCache] = useState<Record<string, { url: string; timestamp: number }>>({});

  const CACHED_URL_TTL = 5 * 60 * 1000; // 5 minutes

  const getCachedOrFreshUrl = async (submissionId: string): Promise<string | null> => {
    const cached = freshUrlsCache[submissionId];
    
    // Return cached URL if still valid
    if (cached && (Date.now() - cached.timestamp) < CACHED_URL_TTL) {
      return cached.url;
    }
    
    // Fetch fresh URL
    const freshUrl = await fetchFreshSubmissionFile(submissionId);
    
    if (freshUrl) {
      setFreshUrlsCache(prev => ({
        ...prev,
        [submissionId]: { url: freshUrl, timestamp: Date.now() }
      }));
    }
    
    return freshUrl;
  };

  // ── Comment States ──
  const [allComments, setAllComments] = useState<AssignmentComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [studentCommentDrafts, setStudentCommentDrafts] = useState<Record<string, string>>({});
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isTokenExpired = (url: string): boolean => {
  try {
    // Firebase Storage signed URLs typically contain an expiration timestamp
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get('Expires');
    if (expiresParam) {
      const expiresTime = parseInt(expiresParam, 10) * 1000; // Convert to milliseconds
      return Date.now() > expiresTime;
    }
    
    // Alternative: Check for 'X-Goog-Expires' or similar params
    const googExpires = urlObj.searchParams.get('X-Goog-Expires');
    if (googExpires) {
      const expiresTime = parseInt(googExpires, 10) * 1000;
      return Date.now() > expiresTime;
    }
    
    // If no expiration param found, assume it might be expired
    return false;
  } catch {
    return false;
  }
};

  // ── UI States ──
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [commentsExpanded, setCommentsExpanded] = useState<Record<string, boolean>>({});

  // ── Grade States ──
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [savingSubmissionId, setSavingSubmissionId] = useState<string | null>(null);

  // ── ✅ NEW: Preview Modal States (inline document viewer, matches CourseDetail.tsx) ──
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<{
    fileName: string;
    url: string;
    isLink: boolean;
    submissionId?: string;
     fileType?: string; 
     storagePath?: string | null; 
  } | null>(null);
  const [previewViewerUrl, setPreviewViewerUrl] = useState<string | null>(null);
  
  // ✅ NEW: Download State
  const [isDownloading, setIsDownloading] = useState(false);

  // ✅ NEW: Refresh state — used by pull-to-refresh and the background poller so
  // new student submissions/comments show up without leaving this screen.
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentTeacherId = useMemo(() => {
    return currentTeacher?.teacherId || currentTeacher?.authUid || currentTeacher?.email || "";
  }, [currentTeacher]);

  // ✅ UPDATED: Get ALL submission docs for this assignment
  const assignmentSubmissions = useMemo(() => {
    if (!currentAssignment) return [];
    return submissions.filter((item) => item.assignmentId === currentAssignment.id);
  }, [submissions, currentAssignment]);

  const studentMembers = useMemo(() => {
    return members.filter((member) => {
      const lowerName = String(member.name || "").toLowerCase();
      const lowerHandle = String(member.handle || "").toLowerCase();
      return !lowerName.includes("teacher") && !lowerHandle.includes("teacher");
    });
  }, [members]);

  // ✅ FIXED: Count unique students who have submitted, not total submission docs
  const completedCount = useMemo(() => {
    const uniqueStudentIds = new Set(
      assignmentSubmissions
        .filter((item) => ["submitted", "graded", "late"].includes(item.status || ""))
        .map((item) => item.studentId)
    );
    return uniqueStudentIds.size;
  }, [assignmentSubmissions]);

  const pendingCount = studentMembers.length - completedCount;

  // Count late unique students
  const lateCount = useMemo(() => {
    const uniqueLateIds = new Set(
      assignmentSubmissions
        .filter((item) => item.status === "late")
        .map((item) => item.studentId)
    );
    return uniqueLateIds.size;
  }, [assignmentSubmissions]);

  const gradedSubmissionsForAvg = assignmentSubmissions.filter(
    (item) => item.status === "graded" && typeof item.score === "number"
  );

  const averageScore =
    gradedSubmissionsForAvg.length > 0
      ? Math.round(
          gradedSubmissionsForAvg.reduce((sum, item) => sum + (item.score || 0), 0) /
            gradedSubmissionsForAvg.length
        )
      : 0;

  const completionPercent =
    studentMembers.length > 0
      ? Math.round((completedCount / studentMembers.length) * 100)
      : 0;

  const totalScoreValue = Number(currentAssignment?.totalScore || 0);

  // ── Comment API Functions ──
  const fetchComments = async (silent = false) => {
    if (!currentAssignment?.id) return;
    if (!silent) setIsLoadingComments(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments/${currentAssignment.id}`);
      const data = await response.json();
      if (response.ok) {
        setAllComments(Array.isArray(data?.data) ? data.data : []);
      }
    } catch (error) {
      console.error("Fetch comments error:", error);
    } finally {
      if (!silent) setIsLoadingComments(false);
    }
  };

  // Paused while a preview is open or a comment is being edited/deleted, so a
// background refresh never resets a modal or interrupts an in-progress edit.
const isOverlayOpenRef = useRef(false);
useEffect(() => {
  isOverlayOpenRef.current =
    previewVisible ||
    deleteModalVisible ||
    !!editingCommentId ||
    isPostingComment ||
    savingEdit ||
    isDeleting;
});

  useEffect(() => {
    if (currentAssignment?.id) {
      fetchComments();
    } else {
      setAllComments([]);
    }
  }, [currentAssignment?.id]);

  // ✅ NEW: Silent background refresh — pulls fresh comments, and asks the parent
  // to refetch submissions, so a newly-submitted assignment or a new comment from
  // a student shows up automatically while the teacher is on this screen.
  const silentRefresh = async (options?: { silent?: boolean }) => {
    if (!currentAssignment?.id) return;
    try {
      await Promise.all([
        fetchComments(options?.silent ?? true),
        onRefreshSubmissions?.(),
      ]);
    } catch (error) {
      console.error("Auto-refresh error:", error);
    }
  };

  // ✅ NEW: Poll on an interval while an assignment is open. Cleared/reset whenever
  // the assignment changes or the interval prop changes.
  useEffect(() => {
  if (!currentAssignment?.id || !autoRefreshIntervalMs || autoRefreshIntervalMs <= 0) {
    return;
  }
  const intervalId = setInterval(() => {
    if (isOverlayOpenRef.current) return; // paused — user has something open
    silentRefresh();
  }, autoRefreshIntervalMs);
  return () => clearInterval(intervalId);
}, [currentAssignment?.id, autoRefreshIntervalMs]);

  // ✅ LIVE: the parent bumps `liveRefreshToken` whenever the server signals that
  // course content, submissions or comments changed. This replaces the interval
  // above (parents pass autoRefreshIntervalMs={0} to switch polling off). If a
  // modal/edit is open the refresh waits (up to ~30s) instead of being dropped,
  // so a push is never lost just because the user was mid-interaction.
  const lastLiveRefreshTokenRef = useRef(liveRefreshToken ?? 0);
  useEffect(() => {
    if (liveRefreshToken === undefined || liveRefreshToken === lastLiveRefreshTokenRef.current) return;
    lastLiveRefreshTokenRef.current = liveRefreshToken;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = (tries: number) => {
      if (cancelled) return;
      if (isOverlayOpenRef.current && tries < 10) {
        timer = setTimeout(() => run(tries + 1), 3000);
        return;
      }
      void silentRefresh();
    };
    run(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRefreshToken]);

  // ✅ NEW: Manual pull-to-refresh handler shown on the scroll views below.
  const handlePullToRefresh = async () => {
    setIsRefreshing(true);
    try {
      await silentRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStudentComments = (studentId: string) => {
    return allComments.filter((c) => c.studentId === studentId);
  };

  // Helper to format dates consistently
const formatRemoteDateTime = (value: any) => {
  if (!value) return new Date().toLocaleString();
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString();
  if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000).toLocaleString();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toLocaleString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toLocaleString() : parsed.toLocaleString();
};

// Helper to map a single submission doc to multiple UI items (File + Links)
const mapSubmissionToItems = (submission: any): any[] => {
  const items: any[] = [];
  const baseDate = formatRemoteDateTime(submission?.submittedAt || submission?.createdAt);
  
  // 1. Map EVERY file the student attached (source of truth: submission.files).
  // ✅ FIXED: this used to only look at the legacy singular submission.fileUrl,
  // which only ever holds the *first* file — additional files the student
  // added via "+ Add Another File" were silently dropped from the teacher's
  // view even though they were saved in Firestore.
  const filesArray = Array.isArray(submission?.files) ? submission.files : [];
  if (filesArray.length > 0) {
    filesArray.forEach((file: any, index: number) => {
      const itemFileUrl = file?.fileUrl || file?.url || file?.downloadUrl;
      if (!itemFileUrl || !file?.fileName) return;
      items.push({
        id: file.id || `${submission.id}-file-${index}`,
        submissionId: submission.id,
        fileName: file.fileName,
        fileSize: 'Submitted file',
        uploadedDate: baseDate,
        submittedAt: baseDate,
        fileUrl: itemFileUrl,
        fileType: file.fileType || 'application/octet-stream',
        storagePath: file.storagePath,
        bucketPath: file.bucketPath,
        isSubmitted: true,
        source: 'student',
        type: 'file' // Explicit type for rendering
      });
    });
  } else {
    // Fallback for legacy submission docs that predate the "files" array.
    const fileUrl = submission?.fileUrl || submission?.url || submission?.downloadUrl;
    if (fileUrl && submission?.fileName) {
      items.push({
        id: `${submission.id}-file`,
        submissionId: submission.id,
        fileName: submission.fileName,
        fileSize: 'Submitted file',
        uploadedDate: baseDate,
        submittedAt: baseDate,
        fileUrl: fileUrl,
        fileType: submission.fileType || 'application/octet-stream',
        storagePath: submission.storagePath,
        bucketPath: submission.bucketPath,
        isSubmitted: true,
        source: 'student',
        type: 'file' // Explicit type for rendering
      });
    }
  }

  // 2. Map ALL Link URLs from the array.
  // Preferred shape is { id, url } — a link carries its own persistent id the
  // same way a file does, round-tripped from the server, so it isn't
  // misidentified across resubmits. Older docs may still have a flat array
  // of plain strings; those fall back to a positional id.
  const linkUrls = Array.isArray(submission.linkUrls) ? submission.linkUrls : [];
  linkUrls.forEach((entry: any, index: number) => {
    const isLegacyString = typeof entry === 'string';
    const url = isLegacyString ? entry : entry?.url;
    if (!url || typeof url !== 'string') return;
    items.push({
      id: (!isLegacyString && entry?.id) || `${submission.id}-link-${index}`,
      submissionId: submission.id,
      fileName: 'Submitted link',
      fileSize: 'Link submission',
      uploadedDate: baseDate,
      submittedAt: baseDate,
      linkUrl: url.trim(),
      fileType: 'text/uri-list',
      isSubmitted: true,
      source: 'student',
      type: 'link' // Explicit type for rendering
    });
  });

  // Fallback for legacy single linkUrl field
  if (!linkUrls.length && submission.linkUrl) {
     items.push({
      id: `${submission.id}-link-legacy`,
      submissionId: submission.id,
      fileName: 'Submitted link',
      fileSize: 'Link submission',
      uploadedDate: baseDate,
      submittedAt: baseDate,
      linkUrl: submission.linkUrl,
      fileType: 'text/uri-list',
      isSubmitted: true,
      source: 'student',
      type: 'link'
    });
  }

  return items;
};
  // ── File Handling Functions ──

  /**
   * ✅ FIXED: Extract ALL individual submission items including links from the unified doc.
   * This matches the logic used in StudentApp.tsx and Assignments.tsx
   * ✅ UPDATED: Each item now carries `submissionId` so the Preview Modal can
   * request a fresh signed URL if the current one has expired.
   */
  const getStudentSubmissionItems = (studentId: string): SubmissionPreviewSource[] => {
  if (!currentAssignment) return [];

  const studentSubs = assignmentSubmissions.filter(
    sub => sub.studentId === studentId && sub.assignmentId === currentAssignment.id
  );

  if (studentSubs.length === 0) return [];

  const sub = studentSubs[0]; 
  
  

  const items: SubmissionPreviewSource[] = [];

  // 1. Handle EVERY file the student attached (source of truth: sub.files).
  // ✅ FIXED: this used to only look at the legacy singular sub.fileUrl,
  // which only ever holds the *first* file — additional files added via
  // "+ Add Another File" were silently dropped from the teacher's view even
  // though they were saved in Firestore.
  const subFiles = Array.isArray((sub as any).files) ? (sub as any).files : [];
  if (subFiles.length > 0) {
    subFiles.forEach((file: any, index: number) => {
      if (!file?.fileUrl || !file?.fileName) return;
      items.push({
        id: file.id || `${sub.id}-file-${index}`,
        type: 'file' as const,
        submissionId: sub.id,
        url: file.fileUrl,
        fileName: file.fileName,
        fileType: file.fileType || 'application/octet-stream',
        submittedAt: sub.submittedAt,
        status: sub.status,
        storagePath: file.storagePath || null,
      });
    });
  } else if (sub.fileUrl && sub.fileName) {
    // Fallback for legacy submission docs that predate the "files" array.
    items.push({
      id: `${sub.id}-file`,
      type: 'file' as const,
      submissionId: sub.id,
      url: sub.fileUrl,
      fileName: sub.fileName,
      fileType: sub.fileType || 'application/octet-stream',
      submittedAt: sub.submittedAt,
      status: sub.status,
      storagePath: (sub as any).storagePath || null, 
    });
  }

  // 2. Handle Link URLs Array.
  // Preferred shape is { id, url } (see mapSubmissionToItems above for why);
  // legacy plain-string entries still fall back to a positional id.
  if (Array.isArray(sub.linkUrls) && sub.linkUrls.length > 0) {
    sub.linkUrls.forEach((entry: any, index: number) => {
      const isLegacyString = typeof entry === 'string';
      const url = isLegacyString ? entry : entry?.url;
      if (!url || typeof url !== 'string' || !url.trim()) return;
      items.push({
        id: (!isLegacyString && entry?.id) || `${sub.id}-link-${index}`,
        type: 'link' as const,
        submissionId: sub.id,
        url: url.trim(),
        fileName: url.trim(),
        fileType: 'text/uri-list',
        submittedAt: sub.submittedAt,
        status: sub.status
      });
    });
  }

  return items;
};

  /**
   * ✅ UPDATED: Renders individual file/link items exactly like Assignment Modal
   */
    /**
   * ✅ UPDATED: Renders individual file/link items exactly like Assignment Modal
   */
  const renderSubmittedFiles = (student: Member) => {
    const items = getStudentSubmissionItems(student.id);
    
    if (items.length === 0) {
      return (
        <View style={styles.noSubmissionContainer}>
          <MaterialCommunityIcons name="file-remove-outline" size={24} color="#9CA3AF" />
          <Text style={styles.noSubmissionText}>No submission</Text>
        </View>
      );
    }

    return (
      <View style={styles.submittedFilesContainer}>
        <Text style={styles.submittedFilesTitle}> Submitted Items ({items.length})</Text>
        {items.map((item) => {
          const isLink = item.type === 'link';
          
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.submittedFileItem, isLink && styles.linkSubmissionItem]}
              onPress={() => handlePreviewItem(item)}
              activeOpacity={0.7}
            >
              <View style={styles.fileIconContainer}>
                <MaterialCommunityIcons
                  name={isLink ? "link-variant" : "file-document-outline"}
                  size={22}
                  color={isLink ? "#1a73e8" : "#8B0000"}
                />
              </View>
              <View style={styles.fileDetails}>
                <Text
                  style={[
                    styles.fileNameText,
                    isLink && styles.linkFileNameText,
                  ]}
                >
                  {isLink ? item.url : item.fileName}
                </Text>
                <Text style={styles.fileTypeText}>
                  {isLink ? "Link submission" : "Submitted file"} • {item.submittedAt || "Just now"}
                </Text>
              </View>
              <MaterialCommunityIcons name="eye-outline" size={16} color="#9CA3AF" style={{ alignSelf: "center", marginRight: 12 }} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const fetchFreshSubmissionFile = async (
  submissionId: string, 
  retries = 2
): Promise<string | null> => {
  if (!classId) return null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await apiFetch(`${API_BASE_URL}/class-submissions/${classId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const match = data.find((item: any) => item.id === submissionId);
        if (match?.fileUrl) {
          return match.fileUrl as string;
        }
      }
      
      throw new Error("Submission not found");
    } catch (error) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, error);
      
      if (attempt === retries) {
        return null;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  
  return null;
};

// ✅ NEW: Same idea as fetchFreshSubmissionFile, but for the assignment's own
// attachment(s) — the file(s) the teacher uploaded when creating/updating
// the assignment. Re-hits /class-assignments/:classId, which the server
// hydrates with freshly-signed URLs for EVERY file in the assignment's
// multi-file `files` array (not just the legacy single attachment) — see
// refreshAssignmentFileUrls() in server.js. Pass the specific file's
// storagePath (preferred, stable) or id to resolve THAT file's fresh URL;
// omitting both falls back to the legacy top-level fileUrl (the first/only
// file on older assignments).
const fetchFreshAssignmentFile = async (
  classIdForLookup: string | undefined,
  assignmentId: string,
  target?: { storagePath?: string | null; id?: string | null }
): Promise<string | null> => {
  if (!classIdForLookup) return null;
  try {
    const response = await apiFetch(`${API_BASE_URL}/class-assignments/${classIdForLookup}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (Array.isArray(data)) {
      const match = data.find((item: any) => item.id === assignmentId);
      if (!match) return null;

      if (target?.storagePath || target?.id) {
        const files = Array.isArray(match.files) ? match.files : [];
        const matchedFile = files.find(
          (f: any) =>
            (target.storagePath && f?.storagePath === target.storagePath) ||
            (target.id && f?.id === target.id)
        );
        if (matchedFile?.fileUrl) return matchedFile.fileUrl as string;
      }

      if (match?.fileUrl) return match.fileUrl as string;
    }
  } catch (error) {
    console.error("Failed to refresh assignment attachment URL:", error);
  }
  return null;
};

// ✅ FIXED DOWNLOAD FUNCTION: Routes through backend to avoid CORS and preserve filenames
const downloadFileToDevice = async (
  fileUrl: string,
  fileName: string,
  mimeType?: string,
  storagePath?: string | null
): Promise<void> => {
  let resolvedName = fileName || "downloaded_file";
  const resolvedMime = mimeType || "application/octet-stream";

  // Ensure filename has extension
  if (!resolvedName.includes(".")) {
    const ext = resolvedMime.split("/").pop()?.split(";")[0] || "bin";
    resolvedName += `.${ext}`;
  }

  if (Platform.OS === "web") {
    // ✅ FIX: ALWAYS route through backend proxy to bypass CORS and get proper headers
    let downloadUrl = fileUrl;
    if (storagePath && classId) {
      downloadUrl = `${API_BASE_URL}/class-submission-download/${classId}?storagePath=${encodeURIComponent(storagePath)}`;
    }

    const response = await fetch(downloadUrl, { credentials: "include" });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = resolvedName; // Backend sets Content-Disposition, but this reinforces it
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    return;
  }

  // ── Mobile: Use backend proxy if available, otherwise direct URL ──
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;

  // Prefer backend proxy for mobile too to ensure auth works seamlessly
  let finalDownloadUrl = fileUrl;
  if (storagePath && classId) {
    finalDownloadUrl = `${API_BASE_URL}/class-submission-download/${classId}?storagePath=${encodeURIComponent(storagePath)}`;
  }

  const cacheUri = FileSystem.cacheDirectory + resolvedName;
  const { uri: localUri, status } = await FileSystem.downloadAsync(finalDownloadUrl, cacheUri);
  if (status !== 200) throw new Error(`Download failed with status ${status}`);

  const isImage = resolvedMime.startsWith("image/");

  if (Platform.OS === "ios") {
    if (isImage) {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.granted) {
        await MediaLibrary.saveToLibraryAsync(localUri);
        showToast('Image saved.', 'success');
        return;
      }
    }
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(localUri, {
        mimeType: resolvedMime,
        UTI: resolvedMime,
        dialogTitle: `Save ${resolvedName}`,
      });
    } else {
      showToast('File saved.', 'success');
    }
    return;
  }

  // Android SAF
  try {
    const perms = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perms.granted) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) await Sharing.shareAsync(localUri, { mimeType: resolvedMime, dialogTitle: `Save ${resolvedName}` });
      return;
    }
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(perms.directoryUri, resolvedName, resolvedMime);
    const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
    await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    showToast('File saved.', 'success');
  } catch (error) {
    console.error("Android SAF error:", error);
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(localUri, { mimeType: resolvedMime, dialogTitle: `Save ${resolvedName}` });
    } else {
      showToast('Failed to save file.', 'error');
    }
  }
};

const handleDownloadPreview = async () => {
  if (!previewItem || previewItem.isLink) return;
  setIsDownloading(true);
  try {
    await downloadFileToDevice(
      previewItem.url,
      previewItem.fileName || 'downloaded_file',
      previewItem.fileType || 'application/octet-stream',
      previewItem.storagePath
    );
  } catch (error: any) {
    showToast(error?.message || 'Failed to download file.', 'error');
  } finally {
    setIsDownloading(false);
  }
};

  const handlePreviewItem = async (item: SubmissionPreviewSource) => {
  if (!item.url) {
    showToast('No URL to open.', 'error');
    return;
  }

  const isLink = item.type === "link";

  // ✅ Links navigate directly — no inline preview modal
  if (isLink) {
    try {
      const supported = await Linking.canOpenURL(item.url);
      if (!supported) {
        showToast('URL not supported.', 'error');
        return;
      }
      await Linking.openURL(item.url);
    } catch {
      showToast('Failed to open the link.', 'error');
    }
    return;
  }

  // Files still go through the inline preview modal
  setPreviewItem({
    fileName: item.fileName,
    url: item.url,
    isLink: false,
    submissionId: item.submissionId,
    fileType: item.fileType,
    storagePath: item.storagePath || null,
  });
  setPreviewVisible(true);
  setPreviewLoading(true);
  setPreviewViewerUrl(null);

  try {
    let resolvedUrl = item.url;

    if (item.submissionId) {
      const needsRefresh = isTokenExpired(item.url);

      if (needsRefresh) {
        
        const freshUrl = await getCachedOrFreshUrl(item.submissionId);
        if (freshUrl) {
          resolvedUrl = freshUrl;
          setPreviewItem((prev) => (prev ? { ...prev, url: freshUrl } : prev));
        } else {
          throw new Error("Failed to refresh expired token");
        }
      }
    }

    const viewerUrl = isImageFile(item.fileName, item.fileType)
      ? resolvedUrl
      : getGoogleDocsViewerUrl(resolvedUrl);

    setPreviewViewerUrl(viewerUrl);
  } catch (error) {
    console.error("Preview error:", error);
    showToast('Preview unavailable.', 'error');
    setPreviewVisible(false);
  } finally {
    setPreviewLoading(false);
  }
};
  // ✅ UPDATED: Preview one of the assignment's own attachment(s) — the
  // file(s) the teacher uploaded when creating/updating the assignment —
  // separate from student submission files, but reuses the same inline
  // Preview Modal. Takes the specific attachment to preview so it works for
  // ANY file in a multi-file assignment, not just the legacy first/only one.
  const handlePreviewAssignmentAttachment = async (attachment: {
    id?: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    storagePath?: string | null;
  }) => {
    const assignmentFileUrl = attachment.fileUrl;

    if (!assignmentFileUrl || !attachment.fileName) {
      showToast('No attachment to preview.', 'error');
      return;
    }

    setPreviewItem({
      fileName: attachment.fileName,
      url: assignmentFileUrl,
      isLink: false,
      submissionId: "",
      fileType: attachment.fileType,
      storagePath: attachment.storagePath || null,
    });
    setPreviewVisible(true);
    setPreviewLoading(true);
    setPreviewViewerUrl(null);

    try {
      let resolvedUrl = assignmentFileUrl;

      if (isTokenExpired(resolvedUrl) && currentAssignment?.id) {
        const freshUrl = await fetchFreshAssignmentFile(classId, currentAssignment.id, {
          storagePath: attachment.storagePath,
          id: attachment.id,
        });
        if (freshUrl) {
          resolvedUrl = freshUrl;
          setPreviewItem((prev) => (prev ? { ...prev, url: freshUrl } : prev));
        }
      }

      const viewerUrl = isImageFile(attachment.fileName, attachment.fileType)
        ? resolvedUrl
        : getGoogleDocsViewerUrl(resolvedUrl);

      setPreviewViewerUrl(viewerUrl);
    } catch (error) {
      console.error("Assignment attachment preview error:", error);
      showToast('Preview unavailable.', 'error');
      setPreviewVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreviewModal = () => {
    setPreviewVisible(false);
    setPreviewItem(null);
    setPreviewViewerUrl(null);
    setPreviewLoading(false);
  };

  const handleOpenPreviewExternally = async () => {
    if (!previewItem?.url) return;
    try {
      const supported = await Linking.canOpenURL(previewItem.url);
      if (!supported) {
        showToast('URL not supported.', 'error');
        return;
      }
      await Linking.openURL(previewItem.url);
    } catch {
      showToast(`Failed to open the ${previewItem.isLink ? "link" : "file"}.`, 'error');
    }
  };

  // ── Comment Functions ──
  const handleAddComment = async (studentId: string) => {
    const commentText = studentCommentDrafts[studentId]?.trim();
    if (!commentText || !currentAssignment?.id) return;
    setIsPostingComment(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: currentAssignment.id,
          classId: classId || (currentAssignment as any).classId || "",
          studentId: studentId,
          content: commentText,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setStudentCommentDrafts((prev) => ({ ...prev, [studentId]: "" }));
        await fetchComments();
      } else {
        showToast(data?.error || 'Failed to post comment.', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'Failed to post comment.', 'error');
    } finally {
      setIsPostingComment(false);
    }
  };

  const startEditComment = (comment: AssignmentComment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editText.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        cancelEdit();
        await fetchComments();
      } else {
        showToast(data?.error || 'Failed to update comment.', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'Failed to update comment.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeleteModal = (commentId: string) => {
    setCommentToDeleteId(commentId);
    setDeleteModalVisible(true);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDeleteId) return;
    setIsDeleting(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments/${commentToDeleteId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (response.ok) {
        setDeleteModalVisible(false);
        setCommentToDeleteId(null);
        await fetchComments();
      } else {
        showToast(data?.error || 'Failed to delete comment.', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'Failed to delete comment.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const canManageComment = (comment: AssignmentComment) => {
    if (!currentTeacherId) return false;
    return comment.authorId === currentTeacherId;
  };

  // ── Helper Functions ──
  const getStudentSubmissionStatus = (studentId: string) => {
    // Get the latest/highest priority status from their submissions
    const subs = assignmentSubmissions.filter(s => s.studentId === studentId);
    if (subs.length === 0) return undefined;
    // Priority: graded > late > submitted
    if (subs.some(s => s.status === 'graded')) return 'graded';
    if (subs.some(s => s.status === 'late')) return 'late';
    if (subs.some(s => s.status === 'submitted')) return 'submitted';
    return subs[0].status;
  };

  const getStudentScore = (studentId: string) => {
    const graded = assignmentSubmissions.find(s => s.studentId === studentId && s.status === 'graded');
    return graded?.score;
  };

  const getDotColor = (status?: string) => {
    switch (status) {
      case "graded": return "#3B82F6";
      case "submitted": return "#10B981";
      case "late": return "#EF4444";
      default: return "#9CA3AF";
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case "graded": return "Graded";
      case "submitted": return "Submitted";
      case "late": return "Late";
      case "pending": return "Pending";
      default: return "No submission";
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "graded": return "#1E40AF";
      case "submitted": return "#065F46";
      case "late": return "#991B1B";
      case "pending": return "#4B5563";
      default: return "#4B5563";
    }
  };

  const getStatusBgColor = (status?: string) => {
    switch (status) {
      case "graded": return "#DBEAFE";
      case "submitted": return "#D1FAE5";
      case "late": return "#FEE2E2";
      case "pending": return "#F3F4F6";
      default: return "#F3F4F6";
    }
  };

  const getFilterKeyForStatus = (status?: string): FilterKey => {
    switch (status) {
      case "graded": return "graded";
      case "submitted": return "submitted";
      case "late": return "late";
      default: return "pending";
    }
  };

  const handleSaveScore = async (studentId: string) => {
    // Find the primary submission ID to grade (usually the first one or the one with fileUrl)
    const subToGrade = assignmentSubmissions.find(s => s.studentId === studentId);
    if (!subToGrade) return;

    const rawScore = scoreDrafts[studentId] ?? String(subToGrade.score ?? "");
    const score = Number(rawScore);
    if (!Number.isFinite(score)) {
      showToast('Enter a valid numeric score.', 'error');
      return;
    }
    if (score < 0) {
      showToast('Score cannot be lower than 0.', 'error');
      return;
    }
    if (totalScoreValue > 0 && score > totalScoreValue) {
      showToast(`Score cannot be higher than ${totalScoreValue}.`, 'error');
      return;
    }
    if (!onGradeSubmission) {
      showToast('Grading unavailable.', 'error');
      return;
    }

    try {
      setSavingSubmissionId(studentId);
      await onGradeSubmission(subToGrade.id, score, "");
      showToast('Score saved.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Failed to save score.', 'error');
    } finally {
      setSavingSubmissionId(null);
    }
  };

  // ── Filtering ──
  const visibleStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return studentMembers.filter((student) => {
      const status = getStudentSubmissionStatus(student.id);
      if (activeFilter !== "all") {
        if (getFilterKeyForStatus(status) !== activeFilter) return false;
      }
      if (!query) return true;
      const name = String(student.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [studentMembers, searchQuery, activeFilter, assignmentSubmissions]);

  useEffect(() => {
    if (isLargeScreen && visibleStudents.length > 0) {
      const stillVisible = visibleStudents.some((s) => s.id === selectedStudentId);
      if (!stillVisible) {
        setSelectedStudentId(visibleStudents[0].id);
      }
    }
  }, [isLargeScreen, visibleStudents, selectedStudentId]);

  // 👇 ADDED: Deep-link handling — when navigated here from an
  // "assignment-comment" notification, auto-select the commenting student
  // and expand their comment thread so the teacher lands right on it.
  useEffect(() => {
    if (!initialStudentId) return;
    const target = studentMembers.find((s) => s.id === initialStudentId);
    if (!target) return;

    setSelectedStudentId(initialStudentId);
    setCommentsExpanded((prev) => ({ ...prev, [initialStudentId]: true }));
    onInitialStudentHandled?.();
  }, [initialStudentId, studentMembers, onInitialStudentHandled]);

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentMembers.find((s) => s.id === selectedStudentId) || null;
  }, [studentMembers, selectedStudentId]);

  const toggleCommentsExpanded = (studentId: string) => {
    setCommentsExpanded((prev) => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "submitted", label: "Submitted" },
    { key: "graded", label: "Graded" },
    { key: "late", label: "Late" },
    { key: "pending", label: "Pending" },
  ];

  // ── Render Functions ──
  const renderStatusChip = (status?: string, small?: boolean) => (
    <View
      style={[
        styles.statusChip,
        { backgroundColor: getStatusBgColor(status) },
        small && styles.statusChipSmall,
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: getDotColor(status) }]} />
      <Text
        style={[styles.statusChipText, { color: getStatusColor(status) }, small && styles.statusChipTextSmall]}
        numberOfLines={1}
      >
        {getStatusText(status)}
      </Text>
    </View>
  );

  const renderStudentListItem = (student: Member, variant: "list" | "grid" | "card") => {
    const status = getStudentSubmissionStatus(student.id);
    const isSelected = selectedStudentId === student.id;
    const score = getStudentScore(student.id);

    if (variant === "list") {
      return (
        <TouchableOpacity
          key={student.id}
          activeOpacity={0.7}
          onPress={() => setSelectedStudentId(student.id)}
          style={[styles.listItem, isSelected && styles.listItemActive]}
          accessibilityRole="button"
          accessibilityLabel={`${student.name}, ${getStatusText(status)}`}
        >
          <View style={styles.listItemAvatar}>
            <MaterialCommunityIcons name="account" size={18} color={isSelected ? "#8B0000" : "#9CA3AF"} />
          </View>
          <View style={styles.listItemTextWrap}>
            <Text style={[styles.listItemName, isSelected && styles.listItemNameActive]}>
              {student.name}
            </Text>
            <Text style={styles.listItemHandle}>
              {student.handle}
            </Text>
          </View>
          {status === "graded" && score !== undefined && (
            <Text style={styles.listItemScore}>
              {score}/{totalScoreValue}
            </Text>
          )}
          <View style={[styles.listItemDot, { backgroundColor: getDotColor(status) }]} />
        </TouchableOpacity>
      );
    }

    return renderStudentCard(student, variant === "card");
  };


  const renderSubmissionMeta = (student: Member) => {
    const status = getStudentSubmissionStatus(student.id);
    const score = getStudentScore(student.id);
    const latestSub = assignmentSubmissions.find(s => s.studentId === student.id);
    
    return (
      <View>
        <View style={styles.metaRow}>
          <View style={styles.metaCell}>
            <View style={styles.metaCellLabelRow}>
              <Ionicons name="star" size={isSmallPhone ? 11 : 12} color="#F59E0B" />
              <Text style={styles.metaCellLabel}>Score</Text>
            </View>
            <Text style={styles.metaCellValue}>
              {score ?? 0}/{totalScoreValue}
            </Text>
          </View>
          {(latestSub as any)?.gameScore !== undefined && (
            <View style={styles.metaCell}>
              <View style={styles.metaCellLabelRow}>
                <Ionicons name="game-controller-outline" size={isSmallPhone ? 11 : 12} color="#8B5CF6" />
                <Text style={styles.metaCellLabel}>Game</Text>
              </View>
              <Text style={styles.metaCellValue}>
                {(latestSub as any).gameScore}/{(latestSub as any).gameTotalQuestions || "?"}
                {(latestSub as any).attemptNumber > 1 ? ` (Att.${(latestSub as any).attemptNumber})` : ""}
              </Text>
            </View>
          )}
          <View style={styles.metaCell}>
            <View style={styles.metaCellLabelRow}>
              <Ionicons name="calendar-outline" size={isSmallPhone ? 11 : 12} color="#6B7280" />
              <Text style={styles.metaCellLabel}>Submitted</Text>
            </View>
            <Text style={styles.metaCellValue}>
              {latestSub?.submittedAt || "Not yet"}
            </Text>
          </View>
        </View>

        {renderSubmittedFiles(student)}
      </View>
    );
  };

  const renderStudentCard = (student: Member, fullWidth: boolean) => {
    const status = getStudentSubmissionStatus(student.id);
    const isSelected = selectedStudentId === student.id;
    return (
      <TouchableOpacity
        key={student.id}
        activeOpacity={0.85}
        onPress={() => setSelectedStudentId(student.id)}
        style={[
          styles.studentCard,
          fullWidth ? styles.studentCardFull : styles.studentCardGrid,
          isSelected && styles.studentCardSelected,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`View ${student.name}'s submission`}
      >
        <View style={styles.studentCardTopRow}>
          <View style={styles.studentCardIdentity}>
            <View style={styles.avatarCircle}>
              <MaterialCommunityIcons name="account" size={20} color="#8B0000" />
            </View>
            <View style={styles.studentCardNameWrap}>
              <Text style={styles.studentCardName}>
                {student.name}
              </Text>
              <Text style={styles.studentCardId}>
                {student.id}
              </Text>
            </View>
          </View>
          {renderStatusChip(status, true)}
        </View>

        <View style={styles.cardDivider} />

        {renderSubmissionMeta(student)}
      </TouchableOpacity>
    );
  };

  // ✅ UPDATED: renderGradePanel now includes real-time score validation
  // - Input is clamped so a teacher physically can't type past the max
  // - Save button is disabled whenever the draft score is invalid (empty, negative, non-numeric, or over max)
  // - An inline red warning shows under the input in addition to the existing Alert-based check in handleSaveScore
  const renderGradePanel = (student: Member) => {
    const status = getStudentSubmissionStatus(student.id);
    const currentScore = getStudentScore(student.id);
    const scoreDraft = scoreDrafts[student.id] ?? String(currentScore ?? "");

    const canGrade = status === "submitted" || status === "late" || status === "graded";
    const isSaving = savingSubmissionId === student.id;

    // ✅ NEW: Real-time validation of the typed score against the max
    const numericDraft = Number(scoreDraft);
    const isDraftValid =
      scoreDraft.trim() !== "" &&
      Number.isFinite(numericDraft) &&
      numericDraft >= 0 &&
      (totalScoreValue <= 0 || numericDraft <= totalScoreValue);

    const showExceedsError =
      scoreDraft.trim() !== "" &&
      Number.isFinite(numericDraft) &&
      totalScoreValue > 0 &&
      numericDraft > totalScoreValue;

    const isSaveDisabled = !canGrade || isSaving || !isDraftValid;

    return (
      <View style={styles.gradePanel}>
        <Text style={styles.gradePanelTitle}>Grade</Text>
        <Text style={styles.gradePanelSubtitle}>
          {canGrade ? "Enter a score for this submission" : "No submission to grade yet"}
        </Text>

        <View style={styles.scoreRow}>
          <TextInput
            style={[
              styles.scoreInput,
              !canGrade && styles.inputDisabled,
              showExceedsError && styles.scoreInputError, // ✅ NEW: red border when over the max
            ]}
            value={scoreDraft}
            onChangeText={(value) => {
              let cleaned = value.replace(/[^0-9.]/g, "");

              // ✅ NEW: hard-clamp so the teacher physically can't type past the max
              const numeric = Number(cleaned);
              if (totalScoreValue > 0 && Number.isFinite(numeric) && numeric > totalScoreValue) {
                cleaned = String(totalScoreValue);
              }

              setScoreDrafts((prev) => ({
                ...prev,
                [student.id]: cleaned,
              }));
            }}
            editable={canGrade && !isSaving}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel="Score input"
          />
          <Text style={styles.maxScoreText} numberOfLines={1}>/ {totalScoreValue}</Text>
        </View>

        {/* ✅ NEW: Inline error message shown as soon as the score exceeds the max */}
        {showExceedsError && (
          <Text style={styles.scoreErrorText}>
            Score cannot exceed {totalScoreValue} points.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.saveScoreButton, isSaveDisabled && styles.disabledButton]}
          disabled={isSaveDisabled}
          onPress={() => handleSaveScore(student.id)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Save grade"
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveScoreText}>
              {status === "graded" ? "Update Grade" : "Save Grade"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderComments = (student: Member, collapsedByDefault: boolean) => {
    const studentComments = getStudentComments(student.id);
    const commentDraft = studentCommentDrafts[student.id] || "";
    const isCollapsed = collapsedByDefault && !commentsExpanded[student.id];
    return (
      <View style={styles.commentsSection}>
        <TouchableOpacity
          style={styles.commentsSectionHeader}
          onPress={() => collapsedByDefault && toggleCommentsExpanded(student.id)}
          activeOpacity={collapsedByDefault ? 0.7 : 1}
          disabled={!collapsedByDefault}
        >
          <Text style={styles.commentsSectionTitle}>
            Comments{studentComments.length > 0 ? ` (${studentComments.length})` : ""}
          </Text>
          {collapsedByDefault && (
            <View style={styles.showCommentsBtn}>
              <Text style={styles.showCommentsBtnText}>{isCollapsed ? "Show " : "Hide "}</Text>
              <MaterialCommunityIcons
                name={isCollapsed ? "chevron-down" : "chevron-up"}
                size={16}
                color="#8B0000"
              />
            </View>
          )}
        </TouchableOpacity>

        {!isCollapsed && (
          <View>
            {isLoadingComments ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#8B0000" />
              </View>
            ) : studentComments.length > 0 ? (
              <View style={styles.bubbleList}>
                {studentComments.map((comment) => {
                  const isEditing = editingCommentId === comment.id;
                  const canManage = canManageComment(comment);

                  return (
                    <View
                      key={comment.id}
                      style={[
                        styles.bubbleRow,
                        comment.isInstructor ? styles.bubbleRowTeacher : styles.bubbleRowStudent,
                      ]}
                    >
                      <View
                        style={[
                          styles.bubble,
                          comment.isInstructor ? styles.bubbleTeacher : styles.bubbleStudent,
                        ]}
                      >
                        <View style={styles.bubbleHeaderRow}>
                          <View style={styles.bubbleMetaWrap}>
                            <Text style={styles.bubbleAuthor}>
                              {comment.authorName || (comment.isInstructor ? "Instructor" : "Student")}
                            </Text>
                            <Text style={styles.bubbleTime}>{comment.timestamp}</Text>
                          </View>
                          {canManage && !isEditing && (
                            <View style={styles.bubbleActions}>
                              <TouchableOpacity
                                onPress={() => startEditComment(comment)}
                                accessibilityLabel="Edit comment"
                                style={styles.bubbleActionBtn}
                              >
                                <MaterialCommunityIcons name="pencil-outline" size={14} color="#6B7280" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => openDeleteModal(comment.id)}
                                accessibilityLabel="Delete comment"
                                style={styles.bubbleActionBtn}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={14} color="#EF4444" />
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
                              placeholderTextColor="#9CA3AF"
                              autoFocus
                              multiline
                            />
                            <View style={styles.editActionsRow}>
                              <TouchableOpacity onPress={cancelEdit} style={styles.editCancelBtn}>
                                <Text style={styles.editCancelText}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleSaveEdit(comment.id)}
                                style={[styles.editSaveBtn, savingEdit && { opacity: 0.6 }]}
                                disabled={savingEdit}
                              >
                                <Text style={styles.editSaveText}>{savingEdit ? "Saving..." : "Save"}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <Text style={styles.bubbleContent}>{comment.content}</Text>
                        )}

                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyCommentsText}>No comments yet</Text>
            )}

            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Type a comment..."
                placeholderTextColor="#9CA3AF"
                value={commentDraft}
                onChangeText={(text) => {
                  setStudentCommentDrafts((prev) => ({ ...prev, [student.id]: text }));
                }}
                multiline
                editable={!isPostingComment}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!commentDraft.trim() || isPostingComment) && styles.sendButtonDisabled,
                ]}
                disabled={!commentDraft.trim() || isPostingComment}
                onPress={() => handleAddComment(student.id)}
                accessibilityLabel="Send comment"
              >
                {isPostingComment ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <MaterialCommunityIcons name="send" size={16} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Classroom-style detail: header on top, the student's work on the left and a
  // side panel (grade + comments) on the right.
  const renderSelectedStudentDetail = (student: Member) => (
    <View style={styles.detailPane}>
      <View style={styles.detailHeaderRow}>
        <View style={styles.avatarCircleLarge}>
          <MaterialCommunityIcons name="account" size={26} color="#8B0000" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.detailName}>{student.name}</Text>
          <Text style={styles.detailHandle}>{student.handle} · {student.id}</Text>
        </View>
        {renderStatusChip(getStudentSubmissionStatus(student.id))}
      </View>

      <View style={styles.detailBodyRow}>
        <View style={styles.detailWorkCol}>{renderSubmissionMeta(student)}</View>
        <View style={styles.detailSideCol}>
          {renderGradePanel(student)}
          {renderComments(student, false)}
        </View>
      </View>
    </View>
  );

  // Every file the teacher attached to the assignment. `files` is the source of
  // truth; the legacy single fileName/fileUri fields are only a fallback for
  // older assignments that predate the multi-file array.
  const assignmentAttachments: any[] = currentAssignment?.files?.length
    ? currentAssignment.files
    : currentAssignment?.fileName || currentAssignment?.fileUri
      ? [
          {
            id: currentAssignment.id,
            fileName: currentAssignment.fileName,
            fileUrl: currentAssignment.fileUri,
            fileType: currentAssignment.fileType,
            storagePath: (currentAssignment as any)?.storagePath || null,
          },
        ]
      : [];

  // Counts, progress bar and status legend. On large screens this sits at the
  // top of the sidebar; on phones/tablets it is a card above the list.
  const renderStatsBlock = (inSidebar: boolean) => (
    <View style={inSidebar ? styles.statsBlockSidebar : styles.statsCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryCardValue, isSmallPhone && styles.summaryCardValueSmall]}>{completedCount}</Text>
          <Text style={styles.summaryCardLabel}>Completed</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardDivided]}>
          <Text style={[styles.summaryCardValue, isSmallPhone && styles.summaryCardValueSmall]}>{Math.max(pendingCount, 0)}</Text>
          <Text style={styles.summaryCardLabel}>Pending</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardDivided]}>
          <Text style={[styles.summaryCardValue, isSmallPhone && styles.summaryCardValueSmall]}>{lateCount}</Text>
          <Text style={styles.summaryCardLabel}>Late</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardDivided]}>
          <Text style={[styles.summaryCardValue, isSmallPhone && styles.summaryCardValueSmall]}>
            {averageScore}/{totalScoreValue}
          </Text>
          <Text style={styles.summaryCardLabel}>Avg. Score</Text>
        </View>
      </View>

      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${completionPercent}%` }]} />
      </View>
      <Text style={styles.progressPercentLabel}>{completionPercent}% complete</Text>

      <View style={styles.chipsRow}>
        <View style={[styles.smallChip, { backgroundColor: "#D1FAE5" }]}>
          <Ionicons name="ellipse" size={isSmallPhone ? 7 : 8} color="#065F46" />
          <Text style={[styles.smallChipText, { color: "#065F46" }]}>Submitted</Text>
        </View>
        <View style={[styles.smallChip, { backgroundColor: "#F3F4F6" }]}>
          <Ionicons name="ellipse" size={isSmallPhone ? 7 : 8} color="#4B5563" />
          <Text style={[styles.smallChipText, { color: "#4B5563" }]}>Pending</Text>
        </View>
        <View style={[styles.smallChip, { backgroundColor: "#FEE2E2" }]}>
          <Ionicons name="ellipse" size={isSmallPhone ? 7 : 8} color="#991B1B" />
          <Text style={[styles.smallChipText, { color: "#991B1B" }]}>Late</Text>
        </View>
        <View style={[styles.smallChip, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name="ellipse" size={isSmallPhone ? 7 : 8} color="#1E40AF" />
          <Text style={[styles.smallChipText, { color: "#1E40AF" }]}>Graded</Text>
        </View>
      </View>
    </View>
  );

  const renderSearchFilter = (inSidebar: boolean) => (
    <View style={inSidebar ? styles.searchFilterWrapSidebar : styles.searchFilterWrap}>
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search student..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search students"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} accessibilityLabel="Clear search">
            <MaterialCommunityIcons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.filterChipsRow}
      >
        {filterChips.map((chip) => {
          const active = activeFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(chip.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isMobile ? <View style={{ height: mobileTopSpace }} /> : null}
      {/* ✅ FIX: the WHOLE screen (header, attachments, progress, summary cards,
          search/filters AND the student list) now lives in one page-level
          ScrollView. Before, everything above the list was pinned, so on a
          phone/tablet the actual list was squeezed into a small strip that
          was hard to view. */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: isMobile ? Math.max(90, insets.bottom + 80) : Math.max(30, insets.bottom + 20),
        }}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handlePullToRefresh} colors={["#8B0000"]} tintColor="#8B0000" />
        }
      >
      {/* ── Top app bar ── */}
      <View style={[styles.headerBar, { paddingHorizontal: pagePadding }]}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons name="chevron-left" size={isMobile ? 26 : 28} color="#111827" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text
            style={[styles.headerTitle, { fontSize: isSmallPhone ? 18 : isMobile ? 20 : 22 }]}
          >
            {currentAssignment?.header || "Assignment"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {completedCount} / {studentMembers.length} Submitted
          </Text>
        </View>

        {!isMobile && (
          <TouchableOpacity
            style={styles.updateButtonOutlined}
            onPress={onOpenUpdate}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Update assignment"
          >
            <MaterialCommunityIcons name="pencil-outline" size={16} color="#8B0000" />
            <Text style={styles.updateButtonOutlinedText}>Update Assignment</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Assignment attachments (every file the teacher uploaded; tap to preview) ── */}
      {assignmentAttachments.length > 0 && (
        <View style={[styles.attachmentsBand, { paddingHorizontal: pagePadding }]}>
          <View style={styles.attachmentsGrid}>
            {assignmentAttachments.map((file: any, index: number) => (
              <TouchableOpacity
                key={file.id || file.storagePath || `${currentAssignment?.id}-attachment-${index}`}
                style={[
                  styles.assignmentAttachmentCard,
                  { flexBasis: isMobile ? "100%" : 300 },
                  !isMobile && { maxWidth: 460 },
                ]}
                onPress={() =>
                  handlePreviewAssignmentAttachment({
                    id: file.id,
                    fileName: file.fileName,
                    fileUrl: file.fileUrl,
                    fileType: file.fileType,
                    storagePath: file.storagePath,
                  })
                }
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Preview assignment attachment ${file.fileName}`}
              >
                <View style={styles.assignmentAttachmentIconWrap}>
                  <MaterialCommunityIcons name="paperclip" size={20} color="#8B0000" />
                </View>
                <View style={styles.assignmentAttachmentBody}>
                  <Text style={styles.assignmentAttachmentName} numberOfLines={2}>
                    {file.fileName}
                  </Text>
                  <Text style={styles.assignmentAttachmentLabel}>
                    {currentAssignment && (currentAssignment.files?.length || 0) > 1
                      ? `Assignment Attachment ${index + 1}`
                      : 'Assignment Attachment'}
                  </Text>
                </View>
                <View style={styles.assignmentAttachmentPreviewBtn}>
                  <MaterialCommunityIcons name="eye-outline" size={14} color="#8B0000" />
                  <Text style={styles.assignmentAttachmentPreviewText}>Preview</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Student work ── */}
      {isLargeScreen ? (
        <View style={[styles.workspaceRow, { paddingHorizontal: pagePadding }]}>
          <View style={styles.sidebar}>
            {renderStatsBlock(true)}
            {renderSearchFilter(true)}
            <Text style={styles.masterListTitle}>Student List</Text>
            <View style={{ paddingBottom: 8 }}>
              {visibleStudents.map((student) => renderStudentListItem(student, "list"))}
              {visibleStudents.length === 0 && (
                <Text style={styles.emptyText}>No students match your search.</Text>
              )}
            </View>
          </View>

          <View style={styles.detailScroll}>
            {selectedStudent ? (
              renderSelectedStudentDetail(selectedStudent)
            ) : (
              <Text style={styles.emptyText}>Select a student to view details.</Text>
            )}
          </View>
        </View>
      ) : (
        <View style={{ paddingHorizontal: pagePadding, paddingTop: 16 }}>
          {renderStatsBlock(false)}
          {renderSearchFilter(false)}

          {visibleStudents.length > 0 ? (
            <View style={styles.listPanel}>
              {visibleStudents.map((student, index) => {
                const isExpandedOnMobile = isMobile && selectedStudentId === student.id;
                const isExpandedOnTablet = isTablet && selectedStudentId === student.id;
                const rowWrapStyle = index < visibleStudents.length - 1 ? styles.rowDivider : undefined;

                if (isTablet) {
                  return (
                    <View key={student.id} style={[{ width: "100%" }, rowWrapStyle]}>
                      {renderStudentListItem(student, "grid")}
                      {isExpandedOnTablet && (
                        <View style={styles.tabletExpandedDetail}>
                          <View style={styles.tabletDetailRow}>
                            <View style={{ flex: 1 }}>{renderGradePanel(student)}</View>
                            <View style={{ flex: 1 }}>{renderComments(student, false)}</View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                }

                return (
                  <View key={student.id} style={[{ width: "100%" }, rowWrapStyle]}>
                    {renderStudentListItem(student, "card")}
                    {isExpandedOnMobile && (
                      <View style={styles.mobileExpandedDetail}>
                        {renderGradePanel(student)}
                        {renderComments(student, true)}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              {studentMembers.length === 0 ? "No students found for this class." : "No students match your search."}
            </Text>
          )}
        </View>
      )}
      </ScrollView>

      {/* ── Mobile FAB ── */}
      {isMobile && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(24, insets.bottom + 16) }]}
          onPress={onOpenUpdate}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Update assignment"
        >
          <MaterialCommunityIcons name="pencil-outline" size={22} color="#FFF" />
        </TouchableOpacity>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          ✅ NEW: PREVIEW MODAL — inline document/link viewer
          Matches the fullscreen viewer used in CourseDetail.tsx. Files always
          get a freshly-signed URL from the backend right before previewing,
          so an expired signed URL never results in a broken preview.
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={previewVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={closePreviewModal}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.previewModalContainer} edges={["top", "bottom"]}>
          <View style={styles.previewTopBar}>
            <TouchableOpacity
              onPress={closePreviewModal}
              style={styles.previewBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close preview"
            >
              <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.previewTitleBlock}>
              <Text style={styles.previewTitle} numberOfLines={1}>
                {previewItem?.fileName || "Preview"}
              </Text>
              <View style={styles.previewTypeBadge}>
                <MaterialCommunityIcons
                  name={previewItem?.isLink ? "link-variant" : "file-document-outline"}
                  size={11}
                  color="#8B0000"
                />
                <Text style={styles.previewTypeText}>
                  {previewItem?.isLink ? "LINK" : "FILE"}
                </Text>
              </View>
            </View>

            <View style={styles.previewActions}>
              {/* ✅ NEW: Download Button */}
              {!!previewItem?.url && !previewItem.isLink && (
                <TouchableOpacity
                  onPress={handleDownloadPreview}
                  disabled={isDownloading}
                  style={[styles.previewActionBtn, isDownloading && { opacity: 0.55 }]}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Download file"
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <MaterialCommunityIcons name="download-outline" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              )}

              {!!previewItem?.url && (
                <TouchableOpacity
                  onPress={handleOpenPreviewExternally}
                  style={styles.previewOpenExtBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                  accessibilityRole="button"
                  accessibilityLabel="Open in browser"
                >
                  <MaterialCommunityIcons name="open-in-new" size={20} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ✅ UPDATED: Pass fileName and fileType to handle images natively */}
          {previewLoading ? (
            <View style={styles.previewLoadingWrap}>
              <ActivityIndicator size="large" color="#8B0000" />
              <Text style={styles.previewLoadingText}>Loading preview...</Text>
            </View>
          ) : previewViewerUrl ? (
            <InlineMaterialViewer 
              viewerUrl={previewViewerUrl} 
              height={height - 62} 
              fileName={previewItem?.fileName}   
              fileType={previewItem?.fileType}   
            />
          ) : (
            <View style={styles.previewLoadingWrap}>
              <MaterialCommunityIcons name="file-remove-outline" size={48} color="#CCC" />
              <Text style={styles.previewLoadingText}>Unable to load preview.</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Delete Modal ── */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
          }
        }}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIconContainer}>
              <MaterialCommunityIcons name="trash-can-outline" size={44} color="#EF4444" />
            </View>
            <Text style={styles.deleteModalTitle}>Delete Comment</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to delete this comment? This action cannot be undone.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalConfirmBtn, isDeleting && { opacity: 0.7 }]}
                onPress={confirmDeleteComment}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast — portal-based so it renders above all other Modals */}
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
    </SafeAreaView>
  );
};

export default TeacherSubmissionsSection;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", paddingBottom: 15 },
  // ── Top app bar ──
  headerBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingVertical: 10, minHeight: 64 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginLeft: -8 },
  headerTitleWrap: { flex: 1, marginLeft: 2, minWidth: 0 },
  headerTitle: { fontWeight: "700", color: "#111827" },
  headerSubtitle: { fontFamily: FONT_BODY, fontSize: 13, color: "#6B7280", fontWeight: "500", marginTop: 2 },
  updateButtonOutlined: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#8B0000",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
  },
  updateButtonOutlinedText: { fontFamily: FONT_BODY, color: "#8B0000", fontWeight: "700", fontSize: 13 },
  // ── Assignment attachments (cards with a thumbnail block, like Classroom) ──
  attachmentsBand: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB", paddingVertical: 14 },
  attachmentsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, width: "100%", maxWidth: 1440, alignSelf: "center" },
  assignmentAttachmentCard: {
    flexDirection: "row",
    alignItems: "stretch",
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
  },
  assignmentAttachmentIconWrap: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F0F0",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  assignmentAttachmentBody: { flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 12, justifyContent: "center" },
  assignmentAttachmentLabel: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: "500", color: "#6B7280", marginTop: 2 },
  assignmentAttachmentName: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: "700", color: "#111827" },
  assignmentAttachmentPreviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
  },
  assignmentAttachmentPreviewText: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: "700", color: "#8B0000" },
  // ── Stats, progress and legend ──
  statsCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 16 },
  statsBlockSidebar: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  summaryRow: { flexDirection: "row", marginBottom: 16 },
  summaryCard: { flex: 1, alignItems: "center", paddingHorizontal: 4 },
  summaryCardDivided: { borderLeftWidth: 1, borderLeftColor: "#E5E7EB" },
  summaryCardValue: { fontFamily: FONT_BODY, fontSize: 22, fontWeight: "600", color: "#111827" },
  summaryCardValueSmall: { fontSize: 17 },
  summaryCardLabel: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: "500", color: "#6B7280", marginTop: 2 },
  progressBarTrack: { height: 6, borderRadius: 3, backgroundColor: "#E5E7EB", overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 3, backgroundColor: "#8B0000" },
  progressPercentLabel: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: "600", color: "#6B7280", marginTop: 6 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  smallChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  smallChipText: { fontFamily: FONT_BODY, fontSize: 11, fontWeight: "700" },
  // ── Search + Filters ──
  searchFilterWrap: { marginTop: 16, marginBottom: 16 },
  searchFilterWrapSidebar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { fontFamily: FONT_BODY, flex: 1, fontSize: 14, color: "#111827" },
  filterChipsRow: { flexDirection: "row", gap: 8, marginTop: 10, paddingVertical: 2 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 34,
    justifyContent: "center",
  },
  filterChipActive: { backgroundColor: "#F8F0F0", borderColor: "#8B0000" },
  filterChipText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: "600", color: "#4B5563" },
  filterChipTextActive: { color: "#8B0000", fontWeight: "700" },
  // ── Large screens: sidebar + detail workspace ──
  workspaceRow: { flexDirection: "row", alignItems: "flex-start", gap: 24, marginTop: 20, width: "100%", maxWidth: 1440, alignSelf: "center" },
  sidebar: { width: 360, alignSelf: "flex-start", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, overflow: "hidden" },
  masterListTitle: { fontFamily: FONT_TITLE, fontSize: 14, fontWeight: "700", color: "#374151", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  detailScroll: { flex: 1, minWidth: 0 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 56,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  listItemActive: { backgroundColor: "#F8F0F0", borderLeftColor: "#8B0000" },
  listItemAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  listItemTextWrap: { flex: 1, minWidth: 0 },
  listItemName: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: "600", color: "#111827" },
  listItemNameActive: { color: "#8B0000" },
  listItemHandle: { fontFamily: FONT_BODY, fontSize: 11, color: "#6B7280", marginTop: 1 },
  listItemScore: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: "700", color: "#374151", marginRight: 4 },
  listItemDot: { width: 8, height: 8, borderRadius: 4 },
  detailPane: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, overflow: "hidden" },
  detailHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  avatarCircleLarge: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#F8F0F0", alignItems: "center", justifyContent: "center" },
  detailName: { fontFamily: FONT_BODY, fontSize: 20, fontWeight: "600", color: "#111827" },
  detailHandle: { fontFamily: FONT_BODY, fontSize: 12, color: "#6B7280", fontWeight: "500", marginTop: 2 },
  detailBodyRow: { flexDirection: "row", alignItems: "flex-start" },
  detailWorkCol: { flex: 1, minWidth: 0, padding: 20 },
  detailSideCol: { width: 360, gap: 16, padding: 16, backgroundColor: "#F8F9FA", borderLeftWidth: 1, borderLeftColor: "#E5E7EB" },
  // ── Phones / tablets: one flat list ──
  listPanel: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, overflow: "hidden" },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  tabletDetailRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  tabletExpandedDetail: { padding: 16, backgroundColor: "#F8F9FA", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  mobileExpandedDetail: { gap: 16, padding: 12, backgroundColor: "#F8F9FA", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  // ── Student row ──
  studentCard: { backgroundColor: "#FFFFFF", paddingHorizontal: 16, paddingVertical: 16, borderLeftWidth: 3, borderLeftColor: "transparent" },
  studentCardFull: { width: "100%" },
  studentCardGrid: { width: "100%" },
  studentCardSelected: { backgroundColor: "#FBF6F6", borderLeftColor: "#8B0000" },
  studentCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  studentCardIdentity: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1, minWidth: 0 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8F0F0", alignItems: "center", justifyContent: "center" },
  studentCardNameWrap: { flex: 1, minWidth: 0 },
  studentCardName: { fontFamily: FONT_BODY, fontSize: 15, fontWeight: "600", color: "#111827" },
  studentCardId: { fontFamily: FONT_BODY, fontSize: 12, color: "#6B7280", fontWeight: "500", marginTop: 1 },
  statusChip: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusChipSmall: { paddingHorizontal: 8, paddingVertical: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusChipText: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: "700" },
  statusChipTextSmall: { fontFamily: FONT_BODY, fontSize: 11 },
  cardDivider: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 14 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  metaCell: { flexGrow: 1, flexBasis: 120, minWidth: 100 },
  metaCellLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 },
  metaCellLabel: { fontFamily: FONT_BODY, fontSize: 11, color: "#6B7280", fontWeight: "500" },
  metaCellValue: { fontFamily: FONT_BODY, fontSize: 14, color: "#111827", fontWeight: "600" },
  // ── Submitted work (attachment-style cards) ──
  noSubmissionContainer: {
    marginTop: 14,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noSubmissionText: { fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: "600",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  submittedFilesContainer: { marginTop: 14 },
  submittedFilesTitle: { fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  submittedFileItem: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 8,
  },
  linkSubmissionItem: {
    borderColor: "#BFD3F2",
  },
  fileIconContainer: {
    width: 56,
    backgroundColor: "#F8F0F0",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  fileDetails: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  fileNameText: { fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  linkFileNameText: {
    color: "#1a73e8",
    textDecorationLine: "underline",
  },
  fileTypeText: { fontFamily: FONT_BODY,
    fontSize: 11,
    color: "#6B7280",
  },
  // ── Grade (side panel) ──
  gradePanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    width: "100%",
  },
  gradePanelTitle: { fontFamily: FONT_TITLE, fontSize: 15, fontWeight: "700", color: "#111827" },
  gradePanelSubtitle: { fontFamily: FONT_BODY, fontSize: 12, color: "#6B7280", marginTop: 2, marginBottom: 14 },
  scoreRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  scoreInput: { fontFamily: FONT_BODY,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    minHeight: 48,
  },
  // ✅ red border shown on the score input when the draft exceeds the max
  scoreInputError: {
    borderColor: "#EF4444",
    borderWidth: 1.5,
  },
  // ✅ inline error text shown under the score input
  scoreErrorText: { fontFamily: FONT_BODY,
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  inputDisabled: { backgroundColor: "#F3F4F6", color: "#9CA3AF", borderColor: "#E5E7EB" },
  maxScoreText: { fontFamily: FONT_BODY, color: "#6B7280", fontWeight: "700", fontSize: 16, flexShrink: 0 },
  saveScoreButton: {
    marginTop: 14,
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  disabledButton: { backgroundColor: "#D1D5DB" },
  saveScoreText: { fontFamily: FONT_BODY, color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  // ── Comments (side panel) ─
  commentsSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    width: "100%",
  },
  commentsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 },
  commentsSectionTitle: { fontFamily: FONT_TITLE, fontSize: 15, fontWeight: "700", color: "#111827" },
  showCommentsBtn: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 32, paddingHorizontal: 6 },
  showCommentsBtnText: { fontFamily: FONT_BODY, color: "#8B0000", fontWeight: "700", fontSize: 12 },
  bubbleList: { marginTop: 12, gap: 12 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowTeacher: { justifyContent: "flex-start" },
  bubbleRowStudent: { justifyContent: "flex-start" },
  bubble: { width: "100%", borderRadius: 8, padding: 12, borderWidth: 1, borderColor: "#F3F4F6" },
  bubbleTeacher: { backgroundColor: "#FEF9E7", borderColor: "#FDE68A" },
  bubbleStudent: { backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" },
  bubbleHeaderRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  bubbleMetaWrap: { flex: 1, minWidth: 0, flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: 6 },
  bubbleAuthor: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: "700", color: "#111827" },
  bubbleActions: { flexDirection: "row", gap: 12 },
  bubbleActionBtn: { padding: 4 },
  bubbleContent: { fontFamily: FONT_BODY, fontSize: 13, color: "#111827", lineHeight: 19, marginTop: 4 },
  bubbleTime: { fontFamily: FONT_BODY, fontSize: 11, color: "#6B7280", fontWeight: "500" },
  emptyCommentsText: { fontFamily: FONT_BODY, fontSize: 12, color: "#9CA3AF", textAlign: "center", marginVertical: 16 },
  commentInputContainer: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 14 },
  commentInput: { fontFamily: FONT_BODY,
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 200,
    fontSize: 13,
    color: "#111827",
    textAlignVertical: "top",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#8B0000",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#D1D5DB" },
  editRow: { marginTop: 6 },
  editInput: { fontFamily: FONT_BODY, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: "#111827", backgroundColor: "#FFFFFF", fontSize: 13, lineHeight: 18 },
  editActionsRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
  editCancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#F3F4F6", minHeight: 32 },
  editCancelText: { fontFamily: FONT_BODY, fontWeight: "600", color: "#4B5563", fontSize: 12 },
  editSaveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#8B0000", minHeight: 32 },
  editSaveText: { fontFamily: FONT_BODY, fontWeight: "700", color: "#FFFFFF", fontSize: 12 },
  // ── Delete Modal ──
  deleteModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  deleteModalContent: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 10 },
  deleteModalIconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  deleteModalTitle: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  deleteModalMessage: { fontFamily: FONT_BODY, fontSize: 14, color: "#6B7280", textAlign: "center", marginBottom: 24, lineHeight: 20 },
  deleteModalActions: { flexDirection: "row", gap: 12, width: "100%" },
  deleteModalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: "#F3F4F6", alignItems: "center", minHeight: 44, justifyContent: "center" },
  deleteModalCancelText: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: "700", color: "#4B5563" },
  deleteModalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center", minHeight: 44 },
  deleteModalConfirmText: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  // ── FAB ──
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8B0000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  emptyText: { fontFamily: FONT_BODY, width: "100%", textAlign: "center", color: "#9CA3AF", fontSize: 14, marginTop: 30, fontWeight: "600", paddingHorizontal: 20 },

  // ── ✅ NEW: Preview Modal (inline document/link viewer) ──
  previewModalContainer: { flex: 1, backgroundColor: "#3c3c3c87" },
  previewTopBar: {
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
  previewBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  previewTitleBlock: { flex: 1, gap: 3 },
  previewTitle: { fontFamily: FONT_TITLE, color: "#FFF", fontSize: 15, fontWeight: "700", letterSpacing: 0.1 },
  previewTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  previewTypeText: { fontFamily: FONT_BODY, color: "#8B0000", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewOpenExtBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  previewLoadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#FFF",
  },
  previewLoadingText: { fontFamily: FONT_BODY, color: "#666", fontSize: 14, fontWeight: "600" },
  // ✅ Toast portal — lets touches pass through to whatever's behind, except the toast itself
  toastPortal: {
    ...StyleSheet.absoluteFillObject,
  },
});