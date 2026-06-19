import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Modal,
  Platform,
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

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

async function downloadFileToDevice(
  fileUrl: string,
  fileName: string,
  mimeType?: string,
  screenWidth?: number
): Promise<void> {
  let resolvedName = fileName || "download";
  const resolvedMime = mimeType || getMimeFromFileName(resolvedName);

  if (!resolvedName.includes(".")) {
    const ext = resolvedMime.split("/").pop()?.split(";")[0] || "bin";
    resolvedName += `.${ext}`;
  }

  if (Platform.OS === "web") {
    const response = await fetch(fileUrl, { credentials: "include" });
    if (!response.ok) throw new Error(`Download failed (${response.status})`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = resolvedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    return;
  }

  if (Platform.OS !== "android" && Platform.OS !== "ios") return;

  const cacheUri = FileSystem.cacheDirectory + resolvedName;
  const { uri: localUri, status } = await FileSystem.downloadAsync(fileUrl, cacheUri);
  if (status !== 200) throw new Error(`Download failed (${status})`);

  const isImage = resolvedMime.startsWith("image/");

  if (Platform.OS === "ios") {
    if (isImage) {
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.granted) {
        await MediaLibrary.saveToLibraryAsync(localUri);
        Alert.alert("Saved", "Image saved to your Photos!");
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
      Alert.alert("Saved", `File cached at:\n${localUri}`);
    }
    return;
  }

  try {
    const perms = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perms.granted) {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localUri, { mimeType: resolvedMime, dialogTitle: `Save ${resolvedName}` });
      }
      return;
    }
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
      perms.directoryUri,
      resolvedName,
      resolvedMime
    );
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(destUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    Alert.alert("Saved", "File saved to your selected folder!");
  } catch (error) {
    console.error("Android SAF error:", error);
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(localUri, { mimeType: resolvedMime, dialogTitle: `Save ${resolvedName}` });
    } else {
      Alert.alert("Error", "Unable to save file. Please try again.");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEWER URL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getGoogleDocsViewerUrl(fileUrl: string) {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}

function getMicrosoftOfficeViewerUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

/**
 * Returns the best viewer URL for the given material.
 * 
 * Strategy for Mobile/Expo Go Compatibility:
 * 1. PPT/PPTX: Use Microsoft Office Viewer (better slide rendering than Google).
 * 2. PDF: Use Google Docs Viewer. 
 *    - Why? Raw PDFs often fail to scale correctly in React Native WebViews on small screens.
 *    - Google Viewer provides a responsive web wrapper that works on all devices.
 * 3. Others: Google Docs Viewer.
 */
function getViewerUrl(
  fileUrl: string,
  fileName?: string | null,
  fileType?: string | null,
  pdfUrl?: string | null
): string {

  // 1. Handle Presentations (PPT/PPTX)
  if (isPresentationFile(fileName, fileType)) {
    // If a server-generated PDF preview exists, use it directly. 
    // PDFs are lighter and render faster on mobile than full PPT viewers.
    if (pdfUrl) {
        return pdfUrl; 
    }
    // Fallback to Microsoft Viewer for native PPT experience
    return getMicrosoftOfficeViewerUrl(fileUrl);
  }

  // 2. Handle PDFs
  if (fileType === "application/pdf") {
    // Use Google Docs Viewer for consistent mobile rendering
    return getGoogleDocsViewerUrl(fileUrl);
  }

  // 3. Handle Other Documents (DOCX, XLSX, etc.)
  return getGoogleDocsViewerUrl(fileUrl);
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE MATERIAL VIEWER COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function InlineMaterialViewer({
  viewerUrl,
  height,
}: {
  viewerUrl: string;
  height: number;
}) {
  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, width: "100%", height }}>
        {/* @ts-ignore */}
        <iframe
          src={viewerUrl}
          style={{ width: "100%", height: "100%", border: "none", borderRadius: 0 }}
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
        // Mixed content allowed for Android to load http resources if needed
        mixedContentMode="always" 
      />
    );
  }

  return (
    <View style={inlineViewerStyles.noWebViewFallback}>
      <Ionicons name="document-text-outline" size={48} color="#CCC" />
      <Text style={inlineViewerStyles.noWebViewText}>
        Install react-native-webview to preview files inline.
      </Text>
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
  /** Server-generated PDF preview URL (for PPT/PPTX) */
  pdfUrl?: string | null;
  /** Storage path of the server-generated PDF preview */
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
  initialTab?: "materials" | "assignments";
  autoOpenAssignmentId?: string | null;
  onConsumedAutoOpenAssignment?: () => void;
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

const CourseDetail = ({
  course,
  initialTab = "materials",
  onBack,
  autoOpenAssignmentId = null,
  onConsumedAutoOpenAssignment,
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
}: CourseDetailProps) => {
  const { width, height: windowHeight } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isLargeScreen = width >= 768;

  const safeCourse = course ?? EMPTY_COURSE;

  const [activeTab, setActiveTab] = useState<"materials" | "assignments">(initialTab);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentItem | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<
    AssignmentCourse["materials"][number] | null
  >(null);

  const [newComment, setNewComment] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [gameAttempts, setGameAttempts] = useState<Record<string, number>>({});
  const [isLoadingAttempts, setIsLoadingAttempts] = useState<Record<string, boolean>>({});

  const insets = useSafeAreaInsets();
  const autoHandledRef = useRef<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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

  // ─────────────────────────────────────────────────────────────────────────
  // MATERIAL URL HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  const getMaterialUrl = (
    material: AssignmentCourse["materials"][number] | null
  ): string | null => {
    if (!material) return null;
    const raw = material.fileUri || material.fileUrl || (material as any).uri || null;
    if (!raw || typeof raw !== "string") return null;
    return raw.trim() || null;
  };

  /**
   * Returns the PDF preview URL if the material is a presentation and one was
   * generated server-side. Falls back to null so callers can decide.
   */
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

  // ─────────────────────────────────────────────────────────────────────────
  // DOWNLOAD MATERIAL
  // Downloads the ORIGINAL file (PPT/PPTX or whatever was uploaded),
  // NOT the PDF preview. The PDF preview is only used for the viewer.
  // ─────────────────────────────────────────────────────────────────────────
  const handleDownloadMaterial = async () => {
    const storagePath = (selectedMaterial as any)?.storagePath;
    const firebaseUrl = getMaterialUrl(selectedMaterial);

    const resolvedStoragePath = storagePath || (() => {
      if (!firebaseUrl) return null;
      try {
        const url = new URL(firebaseUrl);
        if (url.hostname === "firebasestorage.googleapis.com") {
          const match = url.pathname.match(/\/o\/(.+)$/);
          return match ? decodeURIComponent(match[1]) : null;
        }
        if (url.hostname === "storage.googleapis.com") {
          const parts = url.pathname.split("/").slice(2);
          return parts.join("/");
        }
      } catch { return null; }
      return null;
    })();

    if (!resolvedStoragePath && !firebaseUrl) {
      Alert.alert("No file", "This material has no file to download.");
      return;
    }

    // Always use the original file name / mime — never the PDF preview name
    const fileName = selectedMaterial?.fileName || selectedMaterial?.title || "material";
    const mimeType = (selectedMaterial as any)?.fileType || getMimeFromFileName(fileName);

    setIsDownloading(true);
    try {
      let downloadUrl: string;

      if (Platform.OS === "web") {
        if (resolvedStoragePath && course?.id) {
          downloadUrl = `${API_BASE_URL}/course-material-download/${
            course.id
          }?storagePath=${encodeURIComponent(resolvedStoragePath)}`;
        } else {
          Alert.alert("Download unavailable", "This file cannot be downloaded directly.");
          return;
        }
      } else {
        if (!firebaseUrl) {
          Alert.alert("No file", "This material has no file to download.");
          return;
        }
        downloadUrl = firebaseUrl;
      }

      await downloadFileToDevice(downloadUrl, fileName, mimeType, width);
    } catch (err: any) {
      console.error("Download material error:", err);
      Alert.alert("Download failed", err?.message || "Unable to download this file.");
    } finally {
      setIsDownloading(false);
    }
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

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;
    if (!course?.id) {
      Alert.alert("No class", "This assignment is not connected to a class.");
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
      fileUrl: linkUrl,
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
    const mappedFiles = (assignment.files || []).map((file: any, index) => ({
      id: file.id || `teacher-file-${assignment.id}-${index}`,
      fileName: file.fileName || file.name || "Assignment attachment",
      fileSize: file.fileSize || "Teacher file",
      uploadedDate: file.uploadedDate || file.uploadedAt || "Attached by teacher",
      fileUrl: file.fileUrl || file.fileUri || file.uri || file.downloadUrl || null,
      fileType: file.fileType,
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

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !course?.id) return;
    if (isAssignmentSubmitted(selectedAssignment)) return;
    if (!currentStudent?.studentId) {
      Alert.alert("Missing student", "Student account information is missing. Please sign in again.");
      return;
    }

    const files = assignmentFiles[selectedAssignment.id] || [];
    if (files.length === 0) {
      Alert.alert("No files", "Please upload at least one file before submitting.");
      return;
    }
    const file = files[0];
    if (!file.fileUrl) {
      Alert.alert("Upload still needed", "Please re-upload the file before submitting.");
      return;
    }

    try {
      setIsSubmittingAssignment(true);
      const studentName = `${currentStudent.firstName || ""} ${currentStudent.lastName || ""}`.trim();
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
          fileName: file.fileName,
          fileUrl: file.fileUrl,
          fileType: file.fileType || "application/octet-stream",
          storagePath: file.storagePath || null,
          bucketPath: file.bucketPath || null,
          feedback: null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to submit assignment.");
      syncSelectedAssignmentStatus("submitted");
      await onRefreshSubmissions?.();
      Alert.alert("Submitted", "Your assignment was submitted successfully.");
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
        {/* Badge when a PDF preview is available for a presentation */}
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

  // ─────────────────────────────────────────────────────────────────────────
  // VIEWER RESOLUTION
  //
  // • previewUrl  → what we feed to the Google Docs viewer iframe / WebView.
  //   For PPT/PPTX: use the server-generated PDF (pdfUrl) if available,
  //                 otherwise fall back to the Google Docs viewer on the
  //                 original file (works for .pptx, though less reliable).
  // • The download button always uses the original storagePath / firebaseUrl,
  //   so the user always gets the real PPT/PPTX file, not the PDF preview.
  // ─────────────────────────────────────────────────────────────────────────
  const selectedMaterialUrl = getMaterialUrl(selectedMaterial);
  const selectedMaterialPdfUrl = getMaterialPdfPreviewUrl(selectedMaterial);
  const useInlineViewer = shouldUseInlineViewer(selectedMaterial);
  const isPresentation = isPresentationFile(
    selectedMaterial?.fileName,
    (selectedMaterial as any)?.fileType
  );

  const viewerUrl =
    selectedMaterialUrl
      ? getViewerUrl(
          selectedMaterialUrl,
          selectedMaterial?.fileName,
          (selectedMaterial as any)?.fileType,
          selectedMaterialPdfUrl  // ← PDF preview passed in
        )
      : null;

  // Show a small badge in the top bar when we are rendering a PDF preview
  // instead of the original file (so the user understands what they see).
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
          onPress={() => setActiveTab("materials")}
          style={[styles.tab, activeTab === "materials" && styles.tabActive]}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="document-text-outline"
              size={16}
              color={activeTab === "materials" ? "#D32F2F" : "#999"}
            />
            <Text style={[styles.tabText, activeTab === "materials" && styles.tabTextActive]}>
              Materials ({safeCourse.materials.length})
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
      <View
        style={[
          styles.contentContainer,
          { paddingHorizontal: wp(isSmallPhone ? "3" : "4") },
        ]}
      >
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
        ) : safeCourse.assignments.length > 0 ? (
          <FlatList
            data={safeCourse.assignments as any[]}
            renderItem={renderAssignmentItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          />
        ) : (
          <Text style={styles.emptyText}>No assignments yet</Text>
        )}

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
            {/* ─ Top Bar ── */}
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
                  {/* File type badge */}
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

                  {/* "PDF Preview" badge — only shown when viewing a PDF proxy of a PPT */}
                  {isShowingPdfPreview && (
                    <View style={styles.viewerPdfPreviewBadge}>
                      <Ionicons name="document-text-outline" size={11} color="#1565C0" />
                      <Text style={styles.viewerPdfPreviewText}>PDF Preview</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Download button — always downloads the ORIGINAL file */}
              {!!selectedMaterialUrl && selectedMaterial?.type !== "video" && (
                <TouchableOpacity
                  onPress={handleDownloadMaterial}
                  disabled={isDownloading}
                  style={[styles.viewerOpenExtBtn, isDownloading && { opacity: 0.55 }]}
                  hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="download-outline" size={20} color="#FFF" />
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* ── Viewer Body ── */}
            {useInlineViewer && viewerUrl ? (
              <InlineMaterialViewer viewerUrl={viewerUrl} height={windowHeight - 62} />
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

        {/* ═══════════════════════════════════════════════════════════════════
            ASSIGNMENT DETAIL MODAL
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
                                    !file.fileUrl && styles.fileOpenButtonDisabled,
                                  ]}
                                  disabled={!file.fileUrl}
                                  activeOpacity={0.85}
                                  onPress={() => handleOpenUploadedFile(file.fileUrl)}
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
                        <Text style={styles.sectionTitle}>📚 Related Materials</Text>
                        {getRelatedMaterials(selectedAssignment).length > 0 ? (
                          getRelatedMaterials(selectedAssignment).map((material) => (
                            <TouchableOpacity
                              key={material.id}
                              style={styles.relatedMaterialItem}
                              activeOpacity={0.85}
                              onPress={() => {
                                closeAssignmentModal();
                                setTimeout(() => handleOpenMaterialPreview(material), 300);
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

                      {/* Your Uploads */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>📎 Your Uploads</Text>
                        {getSubmittedFiles(selectedAssignment).length > 0 ? (
                          <View>
                            {getSubmittedFiles(selectedAssignment).map((file) => (
                              <View key={file.id} style={styles.fileItem}>
                                <Ionicons
                                  name={
                                    file.fileType === "text/uri-list"
                                      ? "link-outline"
                                      : "document-text-outline"
                                  }
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
                                      !file.fileUrl && styles.fileOpenButtonDisabled,
                                    ]}
                                    disabled={!file.fileUrl}
                                    activeOpacity={0.85}
                                    onPress={() => handleOpenUploadedFile(file.fileUrl)}
                                  >
                                    <Ionicons name="open-outline" size={15} color="#FFF" />
                                    <Text style={styles.fileOpenButtonText}>Open</Text>
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
                            ))}
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

                      {/* Comments */}
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>💬 Comments</Text>
                        {(assignmentComments[selectedAssignment.id] || []).length > 0 ? (
                          <View>
                            {(assignmentComments[selectedAssignment.id] || []).map((comment) => (
                              <View
                                key={comment.id}
                                style={[
                                  styles.commentItem,
                                  comment.isInstructor && styles.instructorComment,
                                ]}
                              >
                                <View style={styles.commentHeader}>
                                  <Text style={styles.commentAuthor}>{comment.author}</Text>
                                  {comment.isInstructor && (
                                    <Text style={styles.teacherBadge}>Teacher</Text>
                                  )}
                                </View>
                                <Text style={styles.commentContent}>{comment.content}</Text>
                                <Text style={styles.commentTime}>{comment.timestamp}</Text>
                              </View>
                            ))}
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
        </Modal>
      </View>
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
    maxWidth: 1100,
    alignSelf: "center",
    width: "100%",
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

  // ── NEW: PDF preview badge on material card ──
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

  // ─── Fullscreen viewer modal ──────────────────────────────────────────────
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

  // ── NEW: row that holds type badge + optional PDF preview badge ──
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

  // ── NEW: "PDF Preview" badge in viewer top bar ──
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
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#000", marginBottom: 10 },
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
    fontWeight: "600",
    color: "#1f1f1f",
    backgroundColor: "#fbc12d99",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 11,
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
});