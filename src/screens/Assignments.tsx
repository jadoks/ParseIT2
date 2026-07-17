import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* =========================
   TYPES
========================= */
export interface AssignmentComment {
  id: string;
  author: string;
  authorId?: string; 
  content: string;
  timestamp: string;
  isInstructor: boolean;
}

export interface AssignmentFileUpload {
  id: string;
  fileName: string;
  fileSize: string;
  uploadedDate: string;
  fileUrl?: string;
  linkUrl?: string; 
  fileType?: string;
  storagePath?: string; // ✅ CRITICAL FOR REFRESH
  bucketPath?: string;  // ✅ CRITICAL FOR REFRESH
  submissionId?: string;
  submittedAt?: string;
  isSubmitted?: boolean;
  source?: 'student' | 'teacher';
}

export interface AssignmentMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'document' | 'link';
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

export interface AssignmentItem {
  id: string;
  title: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
  description?: string;
  fileName?: string | null;
  fileUrl?: string | null;
  fileUri?: string | null;
  fileType?: string | null;
  storagePath?: string | null; // ✅ ADD
  bucketPath?: string | null;  // ✅ ADD
  comments?: AssignmentComment[];
  files?: AssignmentFileUpload[];
  assignmentType?: 'regular' | 'game_based';
  gameType?: string;
  numberOfAttempts?: string | null;
  customAttempts?: string | null;
  attemptNumber?: number;
  createdAt?: string; 
}

export interface AssignmentCourse {
  id: string;
  name: string;
  code: string;
  instructor: string;
  description: string;
  semester: string;
  schoolYear: string;
  section: string;
  materials: AssignmentMaterial[];
  assignments: AssignmentItem[];
}

type CurrentStudent = {
  studentId: string;
  authUid?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
};

function getApiBaseUrl() {
  if (Platform.OS === 'web') return 'http://localhost:5000';
  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const host = possibleHost.split(':')[0];
  if (host) return `http://${host}:5000`;
  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

const getDisplayFileSize = (bytes?: number | null) => {
  if (!bytes || !Number.isFinite(bytes)) return 'Uploaded file';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

async function readPickedFileBase64(asset: any): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (asset?.base64) return asset.base64;
    if (asset?.file) {
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            resolve(result.includes(',') ? result.split(',')[1] : result);
          } else {
            reject(new Error('Failed to read selected file.'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read selected file.'));
        reader.readAsDataURL(asset.file as File);
      });
    }
  }
  if (asset?.uri) {
    return await FileSystem.readAsStringAsync(asset.uri, {
      encoding: 'base64' as any,
    });
  }
  return null;
}

interface FlattenedAssignment extends AssignmentItem {
  courseId: string;
  courseName: string;
  courseCode: string;
  instructor: string;
  semester: string;
  schoolYear: string;
  section: string;
  courseDescription: string;
  materials: AssignmentMaterial[];
}

interface AssignmentsProps {
  courses: AssignmentCourse[];
  selectedCourseId?: string | null;
  searchQuery?: string;
  assignmentComments: Record<string, AssignmentComment[]>;
  assignmentFiles: Record<string, AssignmentFileUpload[]>;
  onAddComment: (assignmentId: string, content: string) => void;
  onAddFile: (assignmentId: string, file: AssignmentFileUpload) => void;
  onRemoveFile: (assignmentId: string, fileId: string) => void;
  onOpenGeneratedActivity?: (course: AssignmentCourse, assignment: AssignmentItem) => void;
  onUpdateAssignmentStatus?: (assignmentId: string, status: AssignmentItem['status']) => void;
  onRefreshSubmissions?: () => Promise<void> | void;
  currentStudent?: CurrentStudent;
  isGeneratingActivity?: boolean;
  completedActivityScores?: Record<
    string,
    {
      scorePercent: number | null;
      completed: boolean;
      mastered: boolean;
    }
  >;
  onPlayGame?: (assignment: AssignmentItem) => void;
  onEditComment?: (assignmentId: string, commentId: string, newContent: string) => Promise<void>;
  onDeleteComment?: (assignmentId: string, commentId: string) => Promise<void>;
}

type FilterType = 'all' | 'pending' | 'submitted' | 'graded';

// ✅ HELPER: Check if file is an image
function isImageFile(fileName?: string, fileType?: string): boolean {
  if (!fileName && !fileType) return false;
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  const mime = (fileType || '').toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || 
         mime.startsWith('image/');
}

// ✅ HELPER: Get Viewer URL for Documents
function getViewerUrl(fileUrl: string, fileName?: string, fileType?: string): string {
  // For images, return direct URL
  if (isImageFile(fileName, fileType)) return fileUrl;
  
  // For documents, use Google Docs Viewer
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}

// ✅ UPDATED: InlineMaterialViewer now:
//   1. Proactively fetches a fresh signed URL as soon as a file is opened
//      (works for BOTH teacher and student files, since it keys off
//      storagePath/bucketPath rather than `source`).
//   2. Supports manual refresh for DOCUMENTS too (not just images), since an
//      expired link inside the Google Docs iframe viewer usually won't fire
//      a JS onError event — it just silently shows a broken/blank page.
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
  // Identify "which file" independent of the (possibly stale) URL so the
  // effects below correctly reset/retrigger when a new file is opened.
  const identity = `${fileName || ''}|${storagePath || bucketPath || ''}`;

  // Reset state whenever a new file is opened
  useEffect(() => {
    setResolvedUrl(fileUrl);
    setHasError(false);
    setHasAutoRefreshed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, fileUrl]);

  const tryRefreshUrl = async (silent = false) => {
    // Use storagePath primarily, fallback to bucketPath if needed
    const path = storagePath || bucketPath;

    if (!path) {
      console.warn('Cannot refresh: No storage path available.');
      if (!silent) setHasError(true);
      return;
    }
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      console.log(`Attempting to refresh signed URL for: ${path}`);

      const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath: path,
          classId, // Pass classId if required by your backend validation
        }),
      });

      const data = await response.json();

      if (response.ok && data?.url) {
        console.log('URL Refreshed Successfully');
        setResolvedUrl(data.url);
        setHasError(false);
      } else {
        console.error('Backend returned error for signed URL:', data);
        if (!silent) setHasError(true);
      }
    } catch (err) {
      console.error('Failed to fetch signed URL:', err);
      if (!silent) setHasError(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ✅ Proactively refresh the URL the moment a file is opened for preview,
  // rather than waiting for a load error. This catches links that already
  // expired before the user even tapped "Open".
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
        style={styles.previewRefreshBar}
        activeOpacity={0.8}
      >
        {isRefreshing ? (
          <ActivityIndicator size="small" color="#D32F2F" />
        ) : (
          <MaterialCommunityIcons name="refresh" size={16} color="#D32F2F" />
        )}
        <Text style={styles.previewRefreshBarText}>
          {isRefreshing ? 'Refreshing link...' : "Preview looks broken? Tap to refresh"}
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
              // Only try refresh once to avoid infinite loops if the file is truly gone
              if (!isRefreshing && !hasError) tryRefreshUrl(false);
            }}
          />
        </View>
      );
    }

    // ✅ Native: Render the image
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

  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, width: '100%', height }}>
        <RefreshBar />
        {/* @ts-ignore */}
        <iframe
          key={resolvedUrl}
          src={displayUrl}
          style={{ width: '100%', height: canRefresh ? height - 34 : '100%', border: 'none' }}
          allow="autoplay"
          title="Document Viewer"
        />
      </View>
    );
  }

  // Fallback for native document preview (since WebView might not be installed or configured for all docs)
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <MaterialCommunityIcons name="file-document-outline" size={48} color="#CCC" />
      <Text style={{ color: "#888", textAlign: "center", marginTop: 10 }}>
        Preview not available on this device. Please download or open externally.
      </Text>
      {canRefresh && (
        <TouchableOpacity
          onPress={() => tryRefreshUrl(false)}
          style={{ marginTop: 14, padding: 8, backgroundColor: '#D32F2F', borderRadius: 4 }}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Refresh Link</Text>
        </TouchableOpacity>
      )}
      {!!resolvedUrl && (
        <TouchableOpacity
          onPress={async () => {
            try {
              const supported = await Linking.canOpenURL(resolvedUrl);
              if (!supported) throw new Error('Unsupported URL.');
              await Linking.openURL(resolvedUrl);
            } catch {
              Alert.alert('Open Failed', 'Unable to open this file externally.');
            }
          }}
          style={{ marginTop: 10, padding: 8, backgroundColor: '#EFEFEF', borderRadius: 4 }}
        >
          <Text style={{ color: '#333', fontWeight: 'bold' }}>Open Externally</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const Assignments = ({
  courses,
  selectedCourseId = null,
  assignmentComments,
  assignmentFiles,
  searchQuery = '',
  onAddComment,
  onAddFile,
  onRemoveFile,
  onOpenGeneratedActivity,
  onUpdateAssignmentStatus,
  onRefreshSubmissions,
  currentStudent,
  isGeneratingActivity = false,
  completedActivityScores = {},
  onPlayGame,
  onEditComment,
  onDeleteComment,
}: AssignmentsProps) => {
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const isSmallScreen = width < 480;
  const modalWidth = isLargeScreen ? '72%' : isSmallScreen ? '92%' : '88%';

  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<FlattenedAssignment | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false);
  
  // 👇 NEW: Comment edit and delete states
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const buttonRefs = useState<{ [key: string]: any }>({});

  // 👇 NEW: Delete confirmation modal states
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);

  //  NEW: Inline Preview State
  const [previewFile, setPreviewFile] = useState<AssignmentFileUpload | null>(null);

  const [gameAttempts, setGameAttempts] = useState<Record<string, number>>({});
  const [isLoadingAttempts, setIsLoadingAttempts] = useState<Record<string, boolean>>({});

  const sourceCourses = useMemo(() => {
    if (!selectedCourseId) return courses;
    return courses.filter((c) => c.id === selectedCourseId);
  }, [courses, selectedCourseId]);

    const allAssignments = useMemo<FlattenedAssignment[]>(() => {
    const flattened = sourceCourses.flatMap((course) =>
      course.assignments.map((assignment) => ({
        ...assignment,
        courseId: course.id,
        courseName: course.name,
        courseCode: course.code,
        instructor: course.instructor,
        semester: course.semester,
        schoolYear: course.schoolYear,
        section: course.section,
        courseDescription: course.description,
        materials: course.materials,
      }))
    );

    return flattened.sort((a, b) => {
      if (a.id > b.id) return -1; 
      if (a.id < b.id) return 1;
      return 0;
    });
  }, [sourceCourses]);

  const statusFilteredAssignments = useMemo(() => {
    return filter === 'all'
      ? allAssignments
      : allAssignments.filter((a) => a.status === filter);
  }, [filter, allAssignments]);

  const searchedAndFilteredAssignments = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return statusFilteredAssignments;
    
    const lowerQuery = trimmedQuery.toLowerCase();

    return statusFilteredAssignments.filter((a) => 
      a.title.toLowerCase().startsWith(lowerQuery) ||
      a.courseName.toLowerCase().startsWith(lowerQuery) ||
      a.instructor.toLowerCase().startsWith(lowerQuery) ||
      (a.description && a.description.toLowerCase().startsWith(lowerQuery))
    );
  }, [searchQuery, statusFilteredAssignments]);

  const getScorePercent = (assignment: AssignmentItem) => {
    if (
      assignment.status !== 'graded' ||
      assignment.points === undefined ||
      assignment.maxPoints === undefined ||
      assignment.maxPoints === 0
    ) {
      return null;
    }
    return Math.round((assignment.points / assignment.maxPoints) * 100);
  };

  const getRecommendationType = (assignment: AssignmentItem): 'review' | 'practice' | null => {
    const percent = getScorePercent(assignment);
    if (percent === null) return null;
    if (percent < 60) return 'review';
    if (percent < 75) return 'practice';
    return null;
  };

  const getRecommendationLabel = (assignment: AssignmentItem) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return 'Review Activity';
    if (recommendation === 'practice') return 'Practice Quiz';
    return null;
  };

  const getRecommendationColor = (assignment: AssignmentItem) => {
    const recommendation = getRecommendationType(assignment);
    if (recommendation === 'review') return '#D32F2F';
    if (recommendation === 'practice') return '#F57C00';
    return '#999';
  };

  const getStatusColor = (status: AssignmentItem['status']) => {
    switch (status) {
      case 'pending': return '#FFE082';
      case 'submitted': return '#BBDEFB';
      case 'graded': return '#A5D6A7';
      default: return '#DDD';
    }
  };

  const getStatusTextColor = (status: AssignmentItem['status']) => {
    switch (status) {
      case 'pending': return '#7A5600';
      case 'submitted': return '#0D47A1';
      case 'graded': return '#1B5E20';
      default: return '#555';
    }
  };

  const getRelatedMaterials = (assignment: FlattenedAssignment) => {
    if (!assignment.materialIds?.length) return [];
    return assignment.materials.filter((m) => assignment.materialIds?.includes(m.id));
  };

  const hasMasteredGeneratedActivity = (assignment: AssignmentItem) => {
    const activityScore = completedActivityScores[assignment.id];
    return (
      !!activityScore?.completed &&
      activityScore.scorePercent !== null &&
      activityScore.scorePercent >= 75
    );
  };

  const canGenerateActivity = (assignment: FlattenedAssignment) => {
    return (
      !!getRecommendationType(assignment) &&
      getRelatedMaterials(assignment).length > 0 &&
      !hasMasteredGeneratedActivity(assignment)
    );
  };

  const handleOpenGeneratedActivity = (assignment: FlattenedAssignment) => {
    if (isGeneratingActivity) return;
    const relatedMaterials = getRelatedMaterials(assignment);
    if (!relatedMaterials.length) {
      Alert.alert(
        'Related materials required',
        'The teacher must select related materials first. The AI follow-up activity is generated from those related materials, not from the assignment title.'
      );
      return;
    }
    const course = courses.find((c) => c.id === assignment.courseId);
    if (course && onOpenGeneratedActivity) {
      onOpenGeneratedActivity(course, {
        ...assignment,
        relatedMaterials,
        materialIds: relatedMaterials.map((material) => material.id),
      } as any);
    }
  };

  const handleAddComment = () => {
    if (!selectedAssignment || !newComment.trim()) return;
    onAddComment(selectedAssignment.id, newComment);
    setNewComment('');
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

  const handleFileUpload = async () => {
    if (!selectedAssignment) return;
    if (!selectedAssignment.courseId) {
      Alert.alert('No class', 'This assignment is not connected to a class.');
      return;
    }
    try {
      setIsUploadingFile(true);
      const res = await DocumentPicker.getDocumentAsync({
        type: '/',
        copyToCacheDirectory: true,
        base64: Platform.OS === 'web',
      });
      if (!res.canceled && res.assets?.length) {
        const file = res.assets[0];
        const fileBase64 = await readPickedFileBase64(file);
        if (!fileBase64) {
          throw new Error('Unable to read selected file.');
        }

        const uploadResponse = await apiFetch(`${API_BASE_URL}/upload-class-file`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: selectedAssignment.courseId,
            fileBase64,
            fileName: file.name || 'submission-file',
            fileType: file.mimeType || 'application/octet-stream',
            kind: 'submission',
          }),
        });

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData?.error || 'Failed to upload file.');
        }

        onAddFile(selectedAssignment.id, {
          id: `f${Date.now()}`,
          fileName: uploadData?.data?.fileName || file.name || 'file',
          fileSize: getDisplayFileSize(file.size),
          uploadedDate: new Date().toLocaleString(),
          fileUrl: uploadData?.data?.fileUrl,
          fileType: uploadData?.data?.fileType || file.mimeType,
          storagePath: uploadData?.data?.storagePath, // ✅ Ensure this is saved
          bucketPath: uploadData?.data?.bucketPath,   // ✅ Ensure this is saved
          isSubmitted: false,
          source: 'student',
        });
      }
    } catch (err: any) {
      console.warn('DocumentPicker/upload error', err);
      Alert.alert('Upload failed', err?.message || 'Could not upload the selected file.');
    } finally {
      setIsUploadingFile(false);
    }
  };

  const normalizeSubmissionLink = (value: string) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const handleAddLinkSubmission = () => {
  if (!selectedAssignment) return;
  const linkUrl = normalizeSubmissionLink(submissionLink);
  if (!linkUrl) {
    Alert.alert('Missing link', 'Please paste a submission link first.');
    return;
  }
  onAddFile(selectedAssignment.id, {
    id: `link-${Date.now()}`,
    fileName: 'Submitted link',
    fileSize: 'Link submission',
    uploadedDate: new Date().toLocaleString(),
    fileUrl: undefined,
    linkUrl: linkUrl,
    fileType: 'text/uri-list',
    isSubmitted: false,
    source: 'student',
  });
  setSubmissionLink('');
};

  const isAssignmentSubmitted = (assignment?: AssignmentItem | null) => {
    return assignment?.status === 'submitted' || assignment?.status === 'graded';
  };

  const isAssignmentGraded = (assignment?: AssignmentItem | null) => {
    return assignment?.status === 'graded';
  };

  const getSubmittedFiles = (assignment?: AssignmentItem | null) => {
    if (!assignment) return [];
    return (assignmentFiles[assignment.id] || []).filter(
      (file) => file.source !== 'teacher'
    );
  };

    const getTeacherAssignmentFiles = (assignment?: AssignmentItem | null) => {
  if (!assignment) return [];

  const teacherFiles = (assignment.files || [])
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
      fileName: file.fileName || file.name || 'Assignment attachment',
      fileSize: file.fileSize || 'Teacher file',
      uploadedDate: file.uploadedDate || file.uploadedAt || 'Attached by teacher',
      fileUrl: file.fileUrl || file.fileUri || file.uri || file.downloadUrl || null,
      fileType: file.fileType,
      storagePath: file.storagePath || null,   // ✅ PASS THROUGH
      bucketPath: file.bucketPath || null,     // ✅ PASS THROUGH
      source: 'teacher' as const,
    }));

  const topLevelUrl = getAssignmentFileUrl(assignment);
  if (topLevelUrl) {
    const alreadyIncluded = teacherFiles.some((file) => file.fileUrl === topLevelUrl);
    if (!alreadyIncluded) {
      teacherFiles.unshift({
        id: `teacher-file-${assignment.id}-main`,
        fileName: getAssignmentFileName(assignment),
        fileSize: 'Teacher file',
        uploadedDate: 'Attached by teacher',
        fileUrl: topLevelUrl,
        fileType: (assignment as any)?.fileType || (assignment as any)?.attachmentType,
        storagePath: (assignment as any)?.storagePath || null,  // ✅ PASS THROUGH
        bucketPath: (assignment as any)?.bucketPath || null,     // ✅ PASS THROUGH
        source: 'teacher' as const,
      });
    }
  }

  return teacherFiles;
};

  const getAssignmentFileUrl = (assignment?: AssignmentItem | null) => {
    const raw =
      assignment?.fileUrl ||
      assignment?.fileUri ||
      (assignment as any)?.downloadUrl ||
      (assignment as any)?.attachmentUrl ||
      null;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed || null;
  };

  const getAssignmentFileName = (assignment?: AssignmentItem | null) => {
    return (
      assignment?.fileName ||
      (assignment as any)?.name ||
      (assignment as any)?.attachmentName ||
      'Assignment attachment'
    );
  };

  // ✅ UPDATED: Handle opening files/links
  const handleOpenUploadedFile = async (
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
    // NOTE: we no longer require file.fileUrl to already be present/fresh —
    // as long as we have a storagePath/bucketPath, InlineMaterialViewer will
    // fetch (or refresh) a working URL itself. We only block if there's
    // truly nothing to go on.
    if (!file.fileUrl && !file.storagePath && !file.bucketPath) {
      Alert.alert('No File', emptyMessage);
      return;
    }

    // Set preview state to open the modal
    setPreviewFile(file);
  };

  const syncSelectedAssignmentStatus = (status: AssignmentItem['status']) => {
    if (!selectedAssignment) return;
    setSelectedAssignment((prev) => (prev ? { ...prev, status } : prev));
    onUpdateAssignmentStatus?.(selectedAssignment.id, status);
  };

     const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;
    if (isAssignmentSubmitted(selectedAssignment)) return;
    if (!currentStudent?.studentId) {
      Alert.alert('Missing student', 'Student account information is missing.');
      return;
    }

    const files = assignmentFiles[selectedAssignment.id] || [];
    if (files.length === 0) {
      Alert.alert('No files', 'Please upload at least one file or link before submitting.');
      return;
    }

    try {
      setIsSubmittingAssignment(true);
      const studentName = `${currentStudent.firstName || ''} ${currentStudent.lastName || ''}`.trim();
      
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

      console.log('[SUBMIT] Files:', submissionItems.length, 'Links:', linkUrls.length);

      const response = await apiFetch(`${API_BASE_URL}/create-submission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedAssignment.courseId,
          assignmentId: selectedAssignment.id,
          studentUid: currentStudent.authUid || null,
          studentId: currentStudent.studentId,
          studentName,
          status: 'submitted',
          score: null,
          feedback: null,
          submissions: submissionItems,
          linkUrls: linkUrls.length > 0 ? linkUrls : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to submit assignment.');
      }

      syncSelectedAssignmentStatus('submitted');
      await onRefreshSubmissions?.();
      
      const totalItems = submissionItems.length + (linkUrls.length > 0 ? 1 : 0);
      Alert.alert('Success', `Submitted ${totalItems} item(s) successfully.`);
    } catch (error: any) {
      console.error('[SUBMIT ERROR]', error);
      Alert.alert('Submit Failed', error?.message || 'Unable to submit assignment.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const handleUnsubmitAssignment = async () => {
    if (!selectedAssignment) return;
    if (selectedAssignment.status === 'graded') {
      Alert.alert('Already graded', 'This assignment has been graded and cannot be unsubmitted.');
      return;
    }
    if (!currentStudent?.studentId) {
      Alert.alert('Missing student', 'Please sign in again.');
      return;
    }

    try {
      setIsSubmittingAssignment(true);
      const response = await apiFetch(`${API_BASE_URL}/unsubmit-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedAssignment.courseId,
          assignmentId: selectedAssignment.id,
          studentId: currentStudent.studentId,
          studentUid: currentStudent.authUid || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to unsubmit.');

      syncSelectedAssignmentStatus('pending');
      await onRefreshSubmissions?.();

      Alert.alert('Unsubmitted', 'You can now edit your files and resubmit.');
    } catch (error: any) {
      Alert.alert('Unsubmit Failed', error?.message || 'Unable to unsubmit.');
    } finally {
      setIsSubmittingAssignment(false);
    }
  };

  const closeModal = () => {
    setSelectedAssignment(null);
    setNewComment('');
    setEditingCommentId(null);
    setEditText('');
    setOpenMenuCommentId(null);
    setMenuPosition(null);
    setDeleteModalVisible(false);
    setCommentToDeleteId(null);
    setIsDeletingComment(false);
  };

  const fetchGameAttempts = async (assignmentId: string) => {
    if (!currentStudent?.studentId) return;
    setIsLoadingAttempts((prev) => ({ ...prev, [assignmentId]: true }));
    try {
      const response = await apiFetch(`${API_BASE_URL}/student-submissions/${currentStudent.studentId}`);
      const data = await response.json();
      if (response.ok && data?.data) {
        const submissions = Array.isArray(data.data) ? data.data : [];
        const assignmentSubmissions = submissions.filter(
          (sub: any) => sub.assignmentId === assignmentId
        );
        const attemptCount = assignmentSubmissions.length;
        setGameAttempts((prev) => ({ ...prev, [assignmentId]: attemptCount }));
      }
    } catch (error) {
      console.error('Error fetching game attempts:', error);
    } finally {
      setIsLoadingAttempts((prev) => ({ ...prev, [assignmentId]: false }));
    }
  };

  const getRemainingAttempts = (assignment: AssignmentItem) => {
    const attemptsUsed = gameAttempts[assignment.id] || 0;
    const maxAttempts = assignment.numberOfAttempts === 'unlimited'
      ? Infinity
      : parseInt(assignment.numberOfAttempts || '1');
    return maxAttempts - attemptsUsed;
  };

  const canPlayGame = (assignment: AssignmentItem) => {
    const remaining = getRemainingAttempts(assignment);
    return remaining > 0;
  };

  const handlePlayGameWithAttemptCheck = async (assignment: AssignmentItem) => {
    if (!canPlayGame(assignment)) {
      Alert.alert(
        'No Attempts Remaining',
        'You have used all your attempts for this game-based assignment.'
      );
      return;
    }
    if (onPlayGame) {
      onPlayGame(assignment);
    }
  };

  const canManageComment = (comment: AssignmentComment) => {
    if (!currentStudent) return false;
    const studentName = `${currentStudent.firstName || ''} ${currentStudent.lastName || ''}`.trim();
    return comment.author === studentName || comment.author === currentStudent.email;
  };

  const renderAssignmentItem = ({ item }: { item: FlattenedAssignment }) => {
    const percent = getScorePercent(item);
    const recommendationLabel = getRecommendationLabel(item);
    const relatedMaterials = getRelatedMaterials(item);

    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        activeOpacity={0.85}
        onPress={() => {
          setSelectedAssignment(item);
          if (item.assignmentType === 'game_based') {
            fetchGameAttempts(item.id);
          }
        }}
      >
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            {!!(item.description || item.topic) && (
              <Text style={styles.assignmentTopicText}>
                Instruction: {item.description || item.topic}
              </Text>
            )}
            <Text style={styles.courseName}>
              {item.courseName}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: getStatusTextColor(item.status) },
              ]}
            >
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
            Based on: {relatedMaterials.map((m) => m.title).join(', ')}
          </Text>
        )}
        {recommendationLabel && (
          <View
            style={[
              styles.recommendationBadge,
              { backgroundColor: `${getRecommendationColor(item)}18` },
            ]}
          >
            <Text
              style={[
                styles.recommendationText,
                { color: getRecommendationColor(item) },
              ]}
            >
              {recommendationLabel}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        padding: isLargeScreen ? 24 : 16,
      }}
    >
      <Text style={styles.title}>Assignments</Text>
      <View style={styles.filterRow}>
        {(['all', 'pending', 'submitted', 'graded'] as FilterType[]).map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => setFilter(item)}
            style={[styles.filterChip, filter === item && styles.filterChipActive]}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === item && styles.filterChipTextActive,
              ]}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={searchedAndFilteredAssignments}
        renderItem={renderAssignmentItem}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
            <Text style={[styles.emptyText, { fontSize: 16, fontWeight: '700', color: '#333' }]}>
              {searchQuery.trim()
                ? `No assignments start with "${searchQuery}"`
                : 'No assignments found.'}
            </Text>
            <Text style={[styles.emptyText, { fontSize: 14, marginTop: 8 }]}>
              {searchQuery.trim()
                ? 'Try typing the beginning of the assignment or class name.'
                : ''}
            </Text>
          </View>
        }
      />
      
      <Modal visible={!!selectedAssignment} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalWrapper, { width: modalWidth }, !isLargeScreen && styles.modalWrapperMobile]}>
            <ScrollView
              contentContainerStyle={[
                styles.detailContainer,
                !isLargeScreen && styles.detailContainerMobile,
              ]}
            >
              {selectedAssignment && (
                <>
                  <View style={styles.detailContent}>
                    <View style={[styles.infoCard, !isLargeScreen && styles.infoCardMobile]}>
                      <TouchableOpacity onPress={closeModal} style={styles.modalCloseFloating}>
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
                            <Text style={styles.infoMetaCardValue}>{selectedAssignment.courseName}</Text>
                          </View>
                          <View style={styles.infoMetaCard}>
                            <Text style={styles.infoMetaCardLabel}>Semester</Text>
                            <Text style={styles.infoMetaCardValue}>{selectedAssignment.semester}</Text>
                          </View>
                          <View style={styles.infoMetaCard}>
                            <Text style={styles.infoMetaCardLabel}>School Year</Text>
                            <Text style={styles.infoMetaCardValue}>{selectedAssignment.schoolYear}</Text>
                          </View>
                          <View style={styles.infoMetaCard}>
                            <Text style={styles.infoMetaCardLabel}>Instructor</Text>
                            <Text style={styles.infoMetaCardValue}>{selectedAssignment.instructor}</Text>
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
                          {selectedAssignment.assignmentType === 'game_based' && selectedAssignment.numberOfAttempts && (
                            <View style={styles.infoMetaCard}>
                              <Text style={styles.infoMetaCardLabel}>Max Attempts</Text>
                              <Text style={styles.infoMetaCardValue}>
                                {selectedAssignment.numberOfAttempts === 'unlimited' 
                                  ? 'Unlimited' 
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
                              {selectedAssignment.courseName}
                            </Text>
                          </View>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Semester</Text>
                            <Text style={styles.infoMetaValue}>
                              {selectedAssignment.semester}
                            </Text>
                          </View>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>School Year</Text>
                            <Text style={styles.infoMetaValue}>
                              {selectedAssignment.schoolYear}
                            </Text>
                          </View>
                          <View style={styles.infoMetaRow}>
                            <Text style={styles.infoMetaLabel}>Instructor</Text>
                            <Text style={styles.infoMetaValue} numberOfLines={3}>
                              {selectedAssignment.instructor}
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
                          {selectedAssignment.assignmentType === 'game_based' && selectedAssignment.numberOfAttempts && (
                            <View style={styles.infoMetaRow}>
                              <Text style={styles.infoMetaLabel}>Max Attempts</Text>
                              <Text style={styles.infoMetaValue}>
                                {selectedAssignment.numberOfAttempts === 'unlimited' 
                                  ? 'Unlimited' 
                                  : selectedAssignment.numberOfAttempts}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      <View style={styles.infoInstructionBlock}>
                        <Text style={styles.infoMetaLabel}>Instruction</Text>
                        <Text style={styles.infoInstructionText}>
                          {selectedAssignment.description || 'No instruction provided.'}
                        </Text>
                      </View>
                      {getRecommendationLabel(selectedAssignment) && (
                        <View
                          style={[
                            styles.recommendationBadge,
                            {
                              backgroundColor: `${getRecommendationColor(selectedAssignment)}18`,
                              alignSelf: 'flex-start',
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
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Assignment File</Text>
                      {getTeacherAssignmentFiles(selectedAssignment).length > 0 ? (
                        <View>
                          {getTeacherAssignmentFiles(selectedAssignment).map((file) => (
                            <View key={file.id} style={[styles.attachmentFileCard, !isLargeScreen && styles.fileCardMobile]}>
                              <Text style={{ fontSize: 22 }}>📄</Text>
                              <View style={styles.fileInfo}>
                                <Text style={styles.fileName}>{file.fileName}</Text>
                                <Text style={styles.fileDetails}>Uploaded by your teacher for this assignment</Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.fileOpenButton, !isLargeScreen && styles.fileOpenButtonMobile, !file.fileUrl && !file.storagePath && !file.bucketPath && styles.fileOpenButtonDisabled]}
                                disabled={!file.fileUrl && !file.storagePath && !file.bucketPath}
                                activeOpacity={0.85}
                                onPress={() => handleOpenUploadedFile(file, 'This assignment has no attached file yet.')}
                              >
                                <Text style={styles.fileOpenButtonText}>Open</Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyText}>No assignment file attached.</Text>
                      )}
                    </View>
                    
                    {selectedAssignment.assignmentType === 'game_based' && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}> Game-Based Assignment</Text>
                        <Text style={{ color: '#666', marginBottom: 10, fontSize: 13 }}>
                          This is an interactive game assignment. Click below to start playing!
                        </Text>
                        {isLoadingAttempts[selectedAssignment.id] ? (
                          <View style={[styles.uploadButton, { backgroundColor: '#CCC' }]}>
                            <ActivityIndicator size="small" color="#666" />
                            <Text style={[styles.uploadButtonText, { color: '#666' }]}>
                              Checking attempts...
                            </Text>
                          </View>
                        ) : (
                          <>
                          
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              
                              <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>
                                
                                {selectedAssignment.numberOfAttempts === 'unlimited' 
                                  ? 'Attempt: Unlimited'
                                  : `Attempt: ${getRemainingAttempts(selectedAssignment)}`}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={[
                                styles.uploadButton, 
                                { backgroundColor: canPlayGame(selectedAssignment) ? '#4CAF50' : '#CCC' }
                              ]}
                              onPress={() => handlePlayGameWithAttemptCheck(selectedAssignment)}
                              disabled={!canPlayGame(selectedAssignment)}
                            >
                              <Text style={styles.uploadButtonText}>
                                {canPlayGame(selectedAssignment) ? 'Start Game' : 'No Attempts Remaining'}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}

                    {getRecommendationType(selectedAssignment) && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>🎯 Follow-Up Activity</Text>
                        {!canGenerateActivity(selectedAssignment) && (
                          <Text style={styles.materialWarningText}>
                            The teacher must link related materials first. AI will generate this activity from those related materials only.
                          </Text>
                        )}
                        <TouchableOpacity
                          onPress={() => handleOpenGeneratedActivity(selectedAssignment)}
                          disabled={!canGenerateActivity(selectedAssignment) || isGeneratingActivity}
                          style={[
                            styles.uploadButton,
                            {
                              backgroundColor: canGenerateActivity(selectedAssignment)
                                ? getRecommendationColor(selectedAssignment)
                                : '#CCC',
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

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📚 Related Course Resources</Text>
                      {getRelatedMaterials(selectedAssignment).length > 0 ? (
                        getRelatedMaterials(selectedAssignment).map((material) => (
                          <View key={material.id} style={styles.relatedMaterialItem}>
                            <Text style={styles.relatedMaterialTitle}>{material.title}</Text>
                            <Text style={styles.relatedMaterialMeta}>
                              {material.type} • {material.uploadedDate}
                            </Text>
                            {!!material.fileName && (
                              <Text style={styles.relatedMaterialFileName}>{material.fileName}</Text>
                            )}
                          </View>
                        ))
                      ) : (
                        <Text style={styles.emptyText}>No linked materials.</Text>
                      )}
                    </View>

                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>📤 Your Uploads</Text>
                      {getSubmittedFiles(selectedAssignment).length > 0 ? (
                        <View>
                          {getSubmittedFiles(selectedAssignment).map((file) => {
                            const isLink = file.fileType === 'text/uri-list';
                            
                            // Render Link as Clickable Text (Google Classroom Style)
                            if (isLink && file.linkUrl) {
                              return (
                                <TouchableOpacity 
                                  key={file.id} 
                                  style={[styles.fileItem, !isLargeScreen && styles.fileCardMobile]}
                                  onPress={() => handleOpenUploadedFile(file, 'Invalid link URL')}
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

                            // Render Regular Files with Open Button (Now triggers Inline Preview)
                            return (
                              <View key={file.id} style={[styles.fileItem, !isLargeScreen && styles.fileCardMobile]}>
                                <Text style={{ fontSize: 20 }}>📄</Text>
                                <View style={styles.fileInfo}>
                                  <Text style={styles.fileName}>{file.fileName}</Text>
                                  <Text style={styles.fileDetails}>
                                    {file.fileSize} • {file.uploadedDate}
                                  </Text>
                                </View>
                                <View style={[styles.fileActionsRow, !isLargeScreen && styles.fileActionsRowMobile]}>
                                  <TouchableOpacity
                                    style={[styles.fileOpenButton, !isLargeScreen && styles.fileOpenButtonMobile, !file.fileUrl && !file.storagePath && !file.bucketPath && styles.fileOpenButtonDisabled]}
                                    disabled={!file.fileUrl && !file.storagePath && !file.bucketPath}
                                    activeOpacity={0.85}
                                    onPress={() => handleOpenUploadedFile(file, 'This submitted file has no URL yet.')}
                                  >
                                    <Text style={styles.fileOpenButtonText}>Preview</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    disabled={isAssignmentSubmitted(selectedAssignment)}
                                    onPress={() => onRemoveFile(selectedAssignment.id, file.id)}
                                  >
                                    <Text style={[styles.removeButton, isAssignmentSubmitted(selectedAssignment) && styles.disabledRemoveButton]}>✕</Text>
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
                                <Text style={styles.lockedSubmissionTitle}>✅ Assignment already graded</Text>
                                <Text style={styles.lockedSubmissionText}>
                                  Your submission is locked. You can no longer upload, remove, submit, or unsubmit files.
                                </Text>
                              </View>
                            </View>
                          );
                        }

                        if (isSubmitted) {
                          return (
                            <View style={styles.uploadActionsRow}>
                              <View style={styles.lockedSubmissionBox}>
                                <Text style={styles.lockedSubmissionTitle}> Already submitted</Text>
                                <Text style={styles.lockedSubmissionText}>
                                  Your teacher has received this assignment. Unsubmit only if you need to change your file before grading.
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={handleUnsubmitAssignment}
                                disabled={isSubmittingAssignment}
                                style={[
                                  styles.uploadButton,
                                  { backgroundColor: '#D32F2F' },
                                  isSubmittingAssignment && styles.sendButtonDisabled,
                                ]}
                              >
                                <Text style={styles.uploadButtonText}>
                                  {isSubmittingAssignment ? 'UNSUBMITTING...' : 'UNSUBMIT'}
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
                                style={[styles.uploadButton, isUploadingFile && styles.sendButtonDisabled]}
                                disabled={isUploadingFile}
                                onPress={handleFileUpload}
                              >
                                <Text style={styles.uploadButtonText}>
                                  {isUploadingFile ? 'Uploading...' : '+ Upload File'}
                                </Text>
                              </TouchableOpacity>
                            ) : (
                              <>
                                {canEditFiles && (
                                  <TouchableOpacity
                                    onPress={handleFileUpload}
                                    disabled={isUploadingFile}
                                    style={[styles.secondaryButton, isUploadingFile && styles.sendButtonDisabled]}
                                  >
                                    <Text style={styles.secondaryButtonText}>
                                      {isUploadingFile ? 'Uploading...' : '+ Add Another File'}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                  onPress={handleSubmitAssignment}
                                  disabled={isSubmittingAssignment}
                                  style={[
                                    styles.uploadButton,
                                    { backgroundColor: '#308C5D' },
                                    isSubmittingAssignment && styles.sendButtonDisabled,
                                  ]}
                                >
                                  <Text style={styles.uploadButtonText}>
                                    {isSubmittingAssignment ? 'SUBMITTING...' : 'SUBMIT'}
                                  </Text>
                                </TouchableOpacity>
                              </>
                            )}
                          </View>
                        );
                      })()}
                    </View>

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

        {/* 👇 DROPDOWN MENU FOR COMMENT ACTIONS */}
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
                }
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownOption}
                onPress={() => {
                  const comment = (assignmentComments[selectedAssignment?.id || ''] || []).find(c => c.id === openMenuCommentId);
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

      {/* 👇 DELETE CONFIRMATION MODAL */}
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

      {/* ✅ NEW: INLINE PREVIEW MODAL FOR FILES */}
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

            {/* Download/Open External Button could go here if needed */}
          </View>

          {previewFile && (
            <InlineMaterialViewer
              // ✅ Pass the raw fileUrl (may already be stale/expired) — the
              // viewer itself will fetch a fresh signed URL on open using
              // storagePath/bucketPath, for BOTH teacher and student files.
              fileUrl={previewFile.fileUrl || ''}
              height={height - 62}
              fileName={previewFile.fileName}
              fileType={previewFile.fileType}
              storagePath={previewFile.storagePath}
              bucketPath={previewFile.bucketPath}
              classId={selectedAssignment?.courseId}
            />
          )}
        </SafeAreaView>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  detailContainer: { padding: 16, paddingBottom: 40, backgroundColor: '#fff', borderRadius: 30 },
  detailContainerMobile: { padding: 12, paddingBottom: 40 },
  detailContent: {},
  title: { fontSize: 24, fontWeight: '700', color: '#000', marginBottom: 16 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#EFEFEF', borderRadius: 999 },
  filterChipActive: { backgroundColor: '#D32F2F' },
  filterChipText: { fontSize: 12, fontWeight: '700', color: '#555' },
  filterChipTextActive: { color: '#FFF' },
  assignmentCard: { borderLeftWidth: 5, borderLeftColor: '#D32F2F', backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  assignmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  assignmentInfo: { flex: 1, marginRight: 8 },
  assignmentTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 4 },
  assignmentTopicText: { color: '#444', fontSize: 12, fontWeight: '600', marginTop: 4 },
  courseName: { color: '#666', fontSize: 12, fontWeight: '600', marginTop: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText: { fontWeight: '700', textTransform: 'capitalize', fontSize: 12 },
  assignmentFooter: { borderTopWidth: 1, borderTopColor: '#E6E6E6', paddingTop: 8 },
  dueDateText: { color: '#D32F2F', fontWeight: '600', fontSize: 13, marginBottom: 4 },
  pointsText: { fontSize: 12, color: '#666', fontWeight: '600' },
  relatedPreviewText: { fontSize: 12, color: '#666', marginTop: 8, lineHeight: 18 },
  recommendationBadge: { marginTop: 10, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' },
  recommendationText: { fontWeight: '700', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalWrapper: { maxHeight: '92%', maxWidth: 1180, backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  modalWrapperMobile: { maxHeight: '94%', borderRadius: 14, overflow: 'hidden' },
  modalCloseFloating: { position: 'absolute', top: -10, left: -10, zIndex: 20, width: 42, height: 42, borderRadius: 999, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 5 },
  closeButton: { fontSize: 20, color: '#666' },
  infoCard: { position: 'relative', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 22, paddingTop: 28, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#D32F2F' },
  infoCardMobile: { padding: 16, paddingTop: 28 },
  assignmentModalTitle: { fontSize: 18, fontWeight: '700', color: '#000', textAlign: 'center', marginBottom: 16, paddingLeft: 24, paddingRight: 8 },
  assignmentModalTitleMobile: { fontSize: 16, lineHeight: 24, marginBottom: 14, paddingLeft: 24, paddingRight: 4 },
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
  infoMetaBlock: { borderTopWidth: 1, borderTopColor: '#EBEBEB', paddingTop: 12, marginBottom: 4, gap: 8 },
  infoMetaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoMetaLabel: { width: 90, flexShrink: 0, fontSize: 13, fontWeight: '700', color: '#000', lineHeight: 20 },
  infoMetaValue: { flex: 1, fontSize: 13, fontWeight: '500', color: '#333', lineHeight: 20 },
  infoMetaValueDue: { color: '#D32F2F', fontWeight: '600' },
  infoInstructionBlock: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#EBEBEB', paddingTop: 12, gap: 4 },
  infoInstructionText: { fontSize: 13, fontWeight: '400', color: '#444', lineHeight: 20 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#000', marginBottom: 10 },
  relatedMaterialItem: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10, marginBottom: 8 },
  relatedMaterialTitle: { fontWeight: '600', color: '#111', marginBottom: 4 },
  relatedMaterialMeta: { color: '#777', fontSize: 12, textTransform: 'capitalize' },
  relatedMaterialFileName: { color: '#D32F2F', fontSize: 12, fontWeight: '600', marginTop: 4 },
  materialWarningText: { color: '#B26A00', fontSize: 12, lineHeight: 18, fontWeight: '600', marginBottom: 8 },
  attachmentFileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF7F7', borderRadius: 12, borderWidth: 1, borderColor: '#F3D4D4', padding: 12, marginBottom: 8 },
  fileItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, padding: 10, marginBottom: 8 },
  fileInfo: { flex: 1, marginLeft: 8 },
  fileName: { fontWeight: '600', color: '#000', marginBottom: 4, fontSize: 13 },
  fileDetails: { color: '#888', fontSize: 12 },
  fileCardMobile: { alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 },
  fileActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 8 },
  fileActionsRowMobile: { width: '100%', justifyContent: 'flex-end', marginLeft: 0, marginTop: 4 },
  fileOpenButton: { minHeight: 34, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#D32F2F', alignItems: 'center', justifyContent: 'center' },
  fileOpenButtonMobile: { minWidth: 82 },
  fileOpenButtonDisabled: { backgroundColor: '#D9A0A0' },
  fileOpenButtonText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  removeButton: { color: '#D32F2F', fontWeight: 'bold', paddingLeft: 8 },
  disabledRemoveButton: { opacity: 0.45 },
  uploadActionsRow: { gap: 10, marginTop: 8 },
  linkSubmitBox: { gap: 8, marginTop: 8 },
  linkInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#000' },
  lockedSubmissionBox: { backgroundColor: '#F5F7FA', borderRadius: 10, borderWidth: 1, borderColor: '#E4E7EC', paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  lockedSubmissionTitle: { color: '#111', fontWeight: '700', fontSize: 13, marginBottom: 4 },
  lockedSubmissionText: { color: '#666', fontSize: 12, lineHeight: 18 },
  uploadButton: { backgroundColor: '#D32F2F', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', marginTop: 8 },
  uploadButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  secondaryButton: { backgroundColor: '#EFEFEF', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { color: '#444', fontWeight: '700', fontSize: 13 },
  loadingButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginVertical: 20 },
  commentItem: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 10, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: '#2196F3' },
  instructorComment: { backgroundColor: '#FFF9C4', borderLeftColor: '#FBC02D' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  commentAuthor: { fontWeight: '700', color: '#000', fontSize: 13 },
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
  commentContent: { fontSize: 13, color: '#333', lineHeight: 18, marginBottom: 6 },
  commentTime: { fontSize: 11, color: '#888', fontWeight: '500' },
  commentInputContainer: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 12 },
  commentInput: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 10, minHeight: 60, fontSize: 13, color: '#000', marginBottom: 8 },
  sendButton: { backgroundColor: '#D32F2F', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: '#CCC' },
  sendButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  commentMenuBtn: { padding: 4, marginLeft: 8 },
  editRow: { marginTop: 4 },
  editInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, color: '#111', backgroundColor: '#fff', fontSize: 14, lineHeight: 20 },
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

  // ✅ NEW: refresh bar shown above document previews (web) since expired
  // links inside the Google Docs viewer iframe don't reliably trigger an
  // error event we can detect programmatically.
  previewRefreshBar: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF3F3',
    borderBottomWidth: 1,
    borderBottomColor: '#F3D4D4',
  },
  previewRefreshBarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D32F2F',
  },
});

export default Assignments;