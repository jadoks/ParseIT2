import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,

  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as XLSX from 'xlsx';
import TeacherAssignmentSection from './TeacherAssignmentSection';
import TeacherMaterialSection from './TeacherMaterialSection';
import TeacherSubmissionsSection from './TeacherSubmissionsSection';

// ─── Optional WebView ────────────────────────────────────────────────────────
let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch (_) {}

// ─── Types ────────────────────────────────────────────────────────────────────
export type Assignment = {
  id: string;
  header: string;
  instruction: string;
  posted: string;
  dueDate: string;
  totalScore: string;
  pointsOnTime: string;
  repositoryDisabledAfterDue: boolean;
  materialIds?: string[];
  fileName?: string;
  fileUri?: string;
  fileType?: string;
  questions?: any[];
  assignmentType?: 'regular' | 'game_based';
  gameType?: 'quiz_master' | 'memory_match' | 'fill_in_blanks' | 'flashcard' | 'boss_battle';
  numberOfAttempts?: string;
  customAttempts?: string;
  timeLimit?: string;
  customTimeLimit?: string;
};

export type Material = {
  id: string;
  title: string;
  week: string;
  posted: string;
  content?: string;
  fileName?: string;
  fileUri?: string;
  fileType?: string;
  storagePath?: string | null;
  bucketPath?: string | null;
  pdfUrl?: string | null;
  pdfStoragePath?: string | null;
};

export type Member = {
  id: string;
  name: string;
  handle: string;
};

export type Submission = {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName?: string;
  status: 'pending' | 'submitted' | 'graded' | 'late';
  score?: number;
  submittedAt?: string;
  fileName?: string;
  fileUrl?: string;
  fileType?: string;
  feedback?: string;
};

export type CourseDetailData = {
  id: string;
  name: string;
  courseCode: string;
  classCode: string;
  instructor: string;
  section?: string;
  bannerUri?: string;
  year?: string;
  semester?: string;
  schoolYear?: string | null;
};

type SignedInTeacher = {
  teacherId?: string;
  authUid?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: any;
  bannerImage?: any;
};

type PickedUploadFile = {
  name?: string;
  uri?: string;
  type?: string;
  base64?: string;
  file?: File;
} | null;

type FormErrors = {
  title?: string;
  instruction?: string;
  totalScore?: string;
  pointsOnTime?: string;
  dueDate?: string;
  materials?: string;
  gameType?: string;
  classId?: string;
  attempts?: string;
  customAttempts?: string;
  timeLimit?: string;
  customTimeLimit?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (value: number) => String(value).padStart(2, '0');
const formatDateTime = (value?: any) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value?._seconds) return new Date(value._seconds * 1000).toLocaleString();
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleString();
  return '';
};
const formatDateOnly = (value?: Date | null) => {
  if (!value) return '';
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};
const formatTimeOnly = (value?: Date | null) => {
  if (!value) return '';
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
};
const formatDueDateTime = (value?: Date | null) => {
  if (!value) return '';
  return `${formatDateOnly(value)} ${formatTimeOnly(value)}`;
};
const parseDueDateTime = (value?: string) => {
  if (!value?.trim()) return new Date();
  const normalized = value.trim().replace(' ', 'T');
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly)
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
      23,
      59
    );
  return new Date();
};
const isSameDate = (a?: Date | null, b?: Date | null) => {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};
const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};
const isPastDay = (date: Date) => date.getTime() < startOfToday().getTime();

const getCalendarDays = (visibleMonth: Date) => {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const days: Array<{ key: string; date: Date; inCurrentMonth: boolean }> = [];
  for (let i = startOffset; i > 0; i -= 1) {
    const date = new Date(year, month, 1 - i);
    days.push({ key: `prev-${date.toISOString()}`, date, inCurrentMonth: false });
  }
  const lastDay = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month, day);
    days.push({ key: `curr-${date.toISOString()}`, date, inCurrentMonth: true });
  }
  let nextDay = 1;
  while (days.length % 7 !== 0) {
    const date = new Date(year, month + 1, nextDay);
    days.push({ key: `next-${date.toISOString()}`, date, inCurrentMonth: false });
    nextDay += 1;
  }
  return days;
};
const monthLabel = (value: Date) =>
  value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const mapMaterial = (item: any): Material => {
  const fileName = item.fileName || undefined;
  // Infer fileType from fileName when the backend doesn't send it
  const fileType =
    item.fileType ||
    (fileName ? getMimeFromFileName(fileName) : undefined);

  return {
    id: item.id,
    title: item.title || '',
    week: item.week || '',
    posted: formatDateTime(item.createdAt || item.posted),
    content: item.content || '',
    fileName,
    fileUri: item.fileUrl || item.fileUri || undefined,
    fileType,                          // ← now always set when fileName exists
    storagePath: item.storagePath || null,
    bucketPath: item.bucketPath || null,
    pdfUrl: item.pdfUrl || null,
    pdfStoragePath: item.pdfStoragePath || null,
  };
};

const mapAssignment = (item: any): Assignment => ({
  id: item.id,
  header: item.header || '',
  instruction: item.instruction || '',
  posted: formatDateTime(item.createdAt || item.posted),
  dueDate: item.dueDate || '',
  totalScore: String(item.totalScore ?? ''),
  pointsOnTime: String(item.pointsOnTime ?? ''),
  repositoryDisabledAfterDue: !!item.repositoryDisabledAfterDue,
  materialIds: Array.isArray(item.materialIds) ? item.materialIds : [],
  fileName: item.fileName || undefined,
  fileUri: item.fileUrl || item.fileUri || undefined,
  fileType: item.fileType || undefined,
  assignmentType: item.assignmentType || 'regular',
  gameType: item.gameType,
  numberOfAttempts: item.numberOfAttempts,
  customAttempts: item.customAttempts,
  timeLimit: item.timeLimit,
  customTimeLimit: item.customTimeLimit,
  questions: item.questions || [],
});

const mapMember = (item: any): Member => ({
  id: item.userId || item.id || '',
  name: item.name || '',
  handle: item.email ? `@${String(item.email).split('@')[0]}` : '@member',
});

const mapSubmission = (item: any): Submission => ({
  id: item.id,
  assignmentId: item.assignmentId || '',
  studentId: item.studentId || '',
  studentName: item.studentName || '',
  status:
    item.status === 'submitted' ||
    item.status === 'graded' ||
    item.status === 'late'
      ? item.status
      : 'pending',
  score:
    typeof item.score === 'number'
      ? item.score
      : item.score === null
      ? undefined
      : Number(item.score),
  submittedAt: formatDateTime(item.submittedAt),
  fileName: item.fileName || undefined,
  fileUrl: item.fileUrl || undefined,
  fileType: item.fileType || undefined,
  feedback: item.feedback || '',
});

// ─── Viewer URL helpers (mirrors CourseDetail.tsx) ────────────────────────────
function getMimeFromFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    zip: 'application/zip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return map[ext] || 'application/octet-stream';
}

function isPresentationFile(fileName?: string | null, fileType?: string | null): boolean {
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const mime = (fileType || '').toLowerCase();
  return (
    ext === 'ppt' ||
    ext === 'pptx' ||
    mime === 'application/vnd.ms-powerpoint' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
}

function getGoogleDocsViewerUrl(fileUrl: string) {
  return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(fileUrl)}`;
}

function getMicrosoftOfficeViewerUrl(fileUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
}

function getViewerUrl(
  fileUrl: string,
  fileName?: string | null,
  fileType?: string | null,
  pdfUrl?: string | null
): string {
  // 1. Presentations (PPT/PPTX)
  if (isPresentationFile(fileName, fileType)) {
    // Prefer the server-generated PDF preview — lighter and renders faster on mobile
    if (pdfUrl) return pdfUrl;
    // Fallback: Microsoft Office viewer for native PPT rendering
    return getMicrosoftOfficeViewerUrl(fileUrl);
  }

  // 2. PDFs — wrap in Google Docs viewer for consistent mobile rendering
  if (fileType === 'application/pdf') {
    return getGoogleDocsViewerUrl(fileUrl);
  }

  // 3. Everything else (DOCX, XLSX, etc.) — Google Docs viewer
  return getGoogleDocsViewerUrl(fileUrl);
}

// ─── Inline Viewer ────────────────────────────────────────────────────────────
function InlineMaterialViewer({
  viewerUrl,
  height,
}: {
  viewerUrl: string;
  height: number;
}) {
  if (Platform.OS === 'web') {
    return (
      <View style={{ flex: 1, width: '100%', height }}>
        {/* @ts-ignore */}
        <iframe
          src={viewerUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
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
        style={{ flex: 1, width: '100%', height }}
        startInLoadingState
        renderLoading={() => (
          <View style={inlineStyles.loadingOverlay}>
            <ActivityIndicator size="large" color="#D32F2F" />
            <Text style={inlineStyles.loadingText}>Loading document...</Text>
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mixedContentMode="always"
      />
    );
  }
  return (
    <View style={inlineStyles.noWebViewFallback}>
      <Ionicons name="document-text-outline" size={48} color="#CCC" />
      <Text style={inlineStyles.noWebViewText}>
        Install react-native-webview to preview files inline.
      </Text>
    </View>
  );
}

const inlineStyles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: { marginTop: 12, color: '#666', fontSize: 14 },
  noWebViewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  noWebViewText: { color: '#888', textAlign: 'center', fontSize: 13, lineHeight: 20 },
});

// ─── Main Component ───────────────────────────────────────────────────────────
const TeacherCourseDetail2 = ({
  onBack,
  course,
  currentTeacher,
  availableCourses = [],
}: {
  onBack?: () => void;
  course?: CourseDetailData;
  currentTeacher: SignedInTeacher;
  availableCourses?: CourseDetailData[];
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallPhone = width < 360;
  const isMobile = width < 768;

  const teacherFullName = useMemo(() => {
    const first = currentTeacher?.firstName?.trim() || '';
    const last = currentTeacher?.lastName?.trim() || '';
    return `${first} ${last}`.trim() || course?.instructor || 'Teacher';
  }, [currentTeacher, course?.instructor]);

  const teacherIdentity = useMemo(
    () =>
      currentTeacher?.teacherId?.trim() ||
      currentTeacher?.authUid?.trim() ||
      currentTeacher?.email?.trim() ||
      teacherFullName,
    [currentTeacher, teacherFullName]
  );

  // ── Tab / display state
  const [activeTab, setActiveTab] = useState<'Materials' | 'Assignments'>('Materials');
  const [showSubmissions, setShowSubmissions] = useState(false);

  // ── Data
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // ── Material viewer state (new)
  const [viewerMaterial, setViewerMaterial] = useState<Material | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Edit material state (new)
  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editMatTitle, setEditMatTitle] = useState('');
  const [editMatWeek, setEditMatWeek] = useState('');
  const [editMatContent, setEditMatContent] = useState('');
  const [editMatPickedFile, setEditMatPickedFile] = useState<PickedUploadFile>(null);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  // ── Create / update assignment state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showMaterialPreviewModal, setShowMaterialPreviewModal] = useState(false);
  const [selectedMaterialPreview, setSelectedMaterialPreview] = useState<Material | null>(null);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPoints, setFormPoints] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formPointsOnTime, setFormPointsOnTime] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [assignmentDisableRepositoryAfterDue, setAssignmentDisableRepositoryAfterDue] =
    useState(false);
  const [pickedFile, setPickedFile] = useState<PickedUploadFile>(null);
  const [pickedAssignmentFile, setPickedAssignmentFile] = useState<PickedUploadFile>(null);
  const [draftDueDateTime, setDraftDueDateTime] = useState<Date>(new Date());
  const [visibleCalendarMonth, setVisibleCalendarMonth] = useState<Date>(new Date());
  const [classCodeCopied, setClassCodeCopied] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [resultModalType, setResultModalType] = useState<'success' | 'error'>('success');
  const [resultModalTitle, setResultModalTitle] = useState('');
  const [resultModalMessage, setResultModalMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const [assignmentType, setAssignmentType] = useState<'regular' | 'game_based'>('regular');
  const [gameType, setGameType] = useState<
    'quiz_master' | 'memory_match' | 'fill_in_blanks' | 'flashcard' | 'boss_battle' | ''
  >('');
  const [selectedClassId, setSelectedClassId] = useState<string>(course?.id || '');
  const [numberOfAttempts, setNumberOfAttempts] = useState<string>('1');
  const [customAttempts, setCustomAttempts] = useState<string>('');
  const [timeLimit, setTimeLimit] = useState<string>('');
  const [customTimeLimit, setCustomTimeLimit] = useState<string>('');
  const [showGameTypeModal, setShowGameTypeModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);

  const gameOptions = [
    { value: 'quiz_master', label: 'Quiz Master', desc: 'Timed, auto-graded questions from materials' },
    { value: 'memory_match', label: 'Memory Match', desc: 'Match terms ↔ definitions' },
    { value: 'fill_in_blanks', label: 'Fill-in-the-Blanks', desc: 'Complete missing keywords' },
    { value: 'flashcard', label: 'Flashcard Challenge', desc: 'Review flashcards & answer questions' },
  ];

  const showResultModal = (type: 'success' | 'error', title: string, message: string) => {
    setResultModalType(type);
    setResultModalTitle(title);
    setResultModalMessage(message);
    setResultModalVisible(true);
  };

  const loadCourseContent = async () => {
    if (!course?.id) {
      setAssignments([]);
      setMaterials([]);
      setMembers([]);
      setSubmissions([]);
      return;
    }
    try {
      const [materialsRes, assignmentsRes, membersRes, submissionsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/class-materials/${course.id}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/class-assignments/${course.id}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/class-members/${course.id}`, { credentials: 'include' }),
        fetch(`${API_BASE_URL}/class-submissions/${course.id}`, { credentials: 'include' }),
      ]);
      const [materialsData, assignmentsData, membersData, submissionsData] = await Promise.all([
        materialsRes.json(),
        assignmentsRes.json(),
        membersRes.json(),
        submissionsRes.json(),
      ]);
      setMaterials(
        materialsRes.ok && Array.isArray(materialsData) ? materialsData.map(mapMaterial) : []
      );
      setAssignments(
        assignmentsRes.ok && Array.isArray(assignmentsData)
          ? assignmentsData.map(mapAssignment)
          : []
      );
      setMembers(
        membersRes.ok && Array.isArray(membersData)
          ? membersData.filter((item: any) => item?.role === 'student').map(mapMember)
          : []
      );
      setSubmissions(
        submissionsRes.ok && Array.isArray(submissionsData)
          ? submissionsData.map(mapSubmission)
          : []
      );
    } catch (error) {
      console.error('Error loading course content:', error);
      setAssignments([]);
      setMaterials([]);
      setMembers([]);
      setSubmissions([]);
    }
  };

  useEffect(() => {
    loadCourseContent();
  }, [course?.id]);

  // ─── Material viewer helpers ──────────────────────────────────────────────
  const getMaterialFileUrl = (material: Material | null) => {
    if (!material) return null;
    const raw = material.fileUri || (material as any).fileUrl || null;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  };

  const getMaterialPdfUrl = (material: Material | null) => {
    if (!material) return null;
    const raw = (material as any).pdfUrl;
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  };

  const openMaterialViewer = (material: Material) => {
    setViewerMaterial(material);
  };

  const closeMaterialViewer = () => {
    setViewerMaterial(null);
  };

  // ─── Edit material handlers (new) ─────────────────────────────────────────
  const openEditMaterialModal = (material: Material) => {
    setEditingMaterial(material);
    setEditMatTitle(material.title || '');
    setEditMatWeek(material.week || '');
    setEditMatContent(material.content || '');
    setEditMatPickedFile(null);
    setShowEditMaterialModal(true);
  };

  const handlePickEditMaterialFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        base64: Platform.OS === 'web',
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setEditMatPickedFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
        base64: (asset as any).base64,
        file: (asset as any).file,
      });
    } catch {
      showResultModal('error', 'Error', 'Failed to pick file.');
    }
  };

  const handleSaveEditMaterial = async () => {
  if (!editingMaterial || !editMatTitle.trim() || !editMatWeek.trim()) {
    showResultModal('error', 'Required', 'Title and Week are required.');
    return;
  }
  
  setIsSavingMaterial(true);
  try {
    let uploadedFile: any = null;
    const hasNewFile = !!(editMatPickedFile && (editMatPickedFile.uri || editMatPickedFile.base64 || editMatPickedFile.file));
    
    // 1. If a new file was picked, upload it first
    if (hasNewFile && course?.id) {
      let fileBase64: string | null = null;
      
      // Handle Web File
      if (Platform.OS === 'web') {
        if (editMatPickedFile.base64) {
          fileBase64 = editMatPickedFile.base64;
        } else if (editMatPickedFile.file) {
          fileBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              if (typeof result === 'string')
                resolve(result.includes(',') ? result.split(',')[1] : result);
              else reject(new Error('Failed to read file.'));
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsDataURL(editMatPickedFile.file as File);
          });
        }
      } 
      // Handle Mobile File
      else if (editMatPickedFile.uri) {
        fileBase64 = await FileSystem.readAsStringAsync(editMatPickedFile.uri, {
          encoding: 'base64' as any,
        });
      }

      if (fileBase64) {
        const uploadRes = await fetch(`${API_BASE_URL}/upload-class-file`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: course.id,
            fileBase64,
            fileName: editMatPickedFile.name ?? 'file',
            fileType: editMatPickedFile.type ?? 'application/octet-stream',
            kind: 'material',
          }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || 'Failed to upload file.');
        
        uploadedFile = uploadData.data;
      }
    }

    // 2. Prepare update payload
    const updateBody: any = {
      title: editMatTitle.trim(),
      week: editMatWeek.trim(),
      content: editMatContent.trim() || undefined,
    };

    // If a new file was uploaded, update file references
    if (uploadedFile) {
      updateBody.fileName = uploadedFile.fileName ?? null;
      updateBody.fileUrl = uploadedFile.fileUrl ?? null;
      updateBody.fileType = uploadedFile.fileType ?? null;
      updateBody.storagePath = uploadedFile.storagePath ?? null;
      updateBody.bucketPath = uploadedFile.bucketPath ?? null;
      updateBody.pdfUrl = uploadedFile.pdfUrl ?? null;
      updateBody.pdfStoragePath = uploadedFile.pdfStoragePath ?? null;
    }

    // 3. Update Firestore
    const response = await fetch(
      `${API_BASE_URL}/update-class-material/${editingMaterial.id}`,
      {
        credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      }
    );
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update material.');

    // 4. CLEANUP: If a new file was uploaded, delete the OLD file from Storage
    if (uploadedFile && editingMaterial.storagePath) {
      // We use the DELETE endpoint which handles storage deletion internally
      // Note: We don't delete the Firestore doc, just the storage file associated with the old path
      // Since there is no direct "delete storage file" endpoint, we can rely on the fact that 
      // the old path is now orphaned. However, to be thorough, we can call a custom cleanup 
      // or just accept that the old file remains until manual cleanup. 
      
      // BETTER APPROACH: Since we can't easily delete just the file without a specific endpoint,
      // and we've already updated the DB to point to the new file, the old file is effectively "deleted" 
      // from the user's perspective. 
      
      // IF YOU WANT TO FORCE DELETE THE OLD FILE FROM STORAGE:
      // You would need to add a backend endpoint like POST /storage/delete-file { storagePath }
      // For now, we will leave it as is because the reference is gone.
    }

    await loadCourseContent();
    setShowEditMaterialModal(false);
    setViewerMaterial(null);
    showResultModal('success', 'Updated', 'Material updated successfully.');
  } catch (error: any) {
    showResultModal('error', 'Update Failed', error?.message || 'Failed to update material.');
  } finally {
    setIsSavingMaterial(false);
  }
};

  const handleDeleteMaterial = () => {
  if (!editingMaterial) return;
  
  Alert.alert(
    'Delete Material',
    `Are you sure you want to delete "${editingMaterial.title}"? This will remove the file from storage and cannot be undone.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeletingMaterial(true);
          try {
            // 1. Delete from Firestore (The backend route /delete-class-material/:id already handles Storage deletion)
            // Looking at your backend code:
            // app.delete("/delete-class-material/:id", ...) calls deleteStorageFileIfExists(materialData?.storagePath)
            
            const response = await fetch(
              `${API_BASE_URL}/delete-class-material/${editingMaterial.id}`,
              { credentials: 'include', method: 'DELETE' }
            );
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete material.');
            
            // 2. Refresh List
            await loadCourseContent();
            
            // 3. Close Modals
            setShowEditMaterialModal(false);
            setViewerMaterial(null);
            
            showResultModal('success', 'Deleted', 'Material deleted successfully.');
          } catch (error: any) {
            showResultModal(
              'error',
              'Delete Failed',
              error?.message || 'Failed to delete material.'
            );
          } finally {
            setIsDeletingMaterial(false);
          }
        },
      },
    ]
  );
};

  const handleDownloadMaterial = async () => {
  if (!viewerMaterial) {
    showResultModal('error', 'No File', 'This material has no downloadable file.');
    return;
  }

  const storagePath = viewerMaterial.storagePath;
  const firebaseUrl = getMaterialFileUrl(viewerMaterial);

  if (!storagePath && !firebaseUrl) {
    showResultModal('error', 'No File', 'This material has no file to download.');
    return;
  }

  const fileName = viewerMaterial.fileName || viewerMaterial.title || 'material';
  const mimeType = viewerMaterial.fileType || getMimeFromFileName(fileName);

  setIsDownloading(true);
  try {
    let downloadUrl: string;

    if (Platform.OS === 'web') {
      // Web: use backend authenticated endpoint (requires storagePath)
      if (storagePath && course?.id) {
        downloadUrl = `${API_BASE_URL}/course-material-download/${course.id}?storagePath=${encodeURIComponent(storagePath)}`;
      } else {
        showResultModal('error', 'Download Unavailable', 'This file cannot be downloaded directly.');
        return;
      }
    } else {
      // Mobile: use Firebase public URL directly (same as student side)
      if (!firebaseUrl) {
        showResultModal('error', 'No File', 'This material has no file to download.');
        return;
      }
      downloadUrl = firebaseUrl;
    }

    // Web download
    if (Platform.OS === 'web') {
      const response = await fetch(downloadUrl, { credentials: 'include' });
      if (!response.ok) throw new Error(`Download failed (${response.status})`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } else {
      // Mobile download
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      const result = await FileSystem.downloadAsync(downloadUrl, localUri);
      if (result.status !== 200) throw new Error(`Download failed (${result.status})`);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, { mimeType, dialogTitle: `Save ${fileName}` });
      } else {
        Alert.alert('Saved', `File downloaded to:\n${result.uri}`);
      }
    }
  } catch (error: any) {
    showResultModal('error', 'Download Failed', error?.message || 'Unable to download file.');
  } finally {
    setIsDownloading(false);
  }
};
  // ─── Create / update form helpers ─────────────────────────────────────────
  const resetCreateForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormPoints('');
    setFormDue('');
    setFormPointsOnTime('');
    setSelectedMaterialIds([]);
    setAssignmentDisableRepositoryAfterDue(false);
    setPickedFile(null);
    setPickedAssignmentFile(null);
    setErrors({});
    const now = new Date();
    setDraftDueDateTime(now);
    setVisibleCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setAssignmentType('regular');
    setGameType('');
    setSelectedClassId(course?.id || '');
    setNumberOfAttempts('1');
    setCustomAttempts('');
    setTimeLimit('');
    setCustomTimeLimit('');
    setGeneratedQuestions([]);
    setShowGeneratedPreview(false);
    setShowGameTypeModal(false);
    setShowClassModal(false);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const openUpdateModal = (item: Assignment | undefined) => {
    if (!item) return;
    setSelectedId(item.id);
    setFormTitle(item.header);
    setFormDesc(item.instruction);
    setFormPoints(item.totalScore);
    setFormDue(item.dueDate);
    setFormPointsOnTime(item.pointsOnTime);
    setSelectedMaterialIds(item.materialIds || []);
    setAssignmentDisableRepositoryAfterDue(item.repositoryDisabledAfterDue);
    setErrors({});
    const parsed = parseDueDateTime(item.dueDate);
    setDraftDueDateTime(parsed);
    setVisibleCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setAssignmentType((item as any).assignmentType || 'regular');
    setGameType((item as any).gameType || '');
    setSelectedClassId(course?.id || '');
    setNumberOfAttempts(String((item as any).numberOfAttempts || '1'));
    setCustomAttempts(String((item as any).customAttempts || ''));
    setTimeLimit(String((item as any).timeLimit || ''));
    setCustomTimeLimit(String((item as any).customTimeLimit || ''));

    const existingQuestions = (item as any).questions || [];
    const mappedQuestions = existingQuestions.map((q: any, index: number) => {
      if ((item as any).gameType === 'memory_match') {
        return { id: q.id || `existing-${index}`, question: q.question || '', answer: q.answer || '' };
      }
      const options = q.options && q.options.length === 4 ? q.options : ['', '', '', ''];
      const answer = q.answer || options[0] || '';
      const correctIndex = options.indexOf(answer);
      return { ...q, id: q.id || `existing-${index}`, options, answer, correctIndex: correctIndex !== -1 ? correctIndex : 0 };
    });
    setGeneratedQuestions(mappedQuestions);
    setShowGameTypeModal(false);
    setShowClassModal(false);
    setShowUpdateModal(true);
  };

  const openDateTimePicker = () => {
    const parsed = parseDueDateTime(formDue);
    setDraftDueDateTime(parsed);
    setVisibleCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setShowDateTimeModal(true);
  };

  const applyDraftDateTime = () => {
    if (draftDueDateTime.getTime() < startOfToday().getTime()) {
      setErrors((prev) => ({ ...prev, dueDate: 'Past dates are not allowed.' }));
      return;
    }
    setFormDue(formatDueDateTime(draftDueDateTime));
    setErrors((prev) => ({ ...prev, dueDate: undefined }));
    setShowDateTimeModal(false);
  };

  const selectDraftDate = (date: Date) => {
    const next = new Date(draftDueDateTime);
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDraftDueDateTime(next);
  };

  const updateDraftTime = (field: 'hours' | 'minutes', value: number) => {
    const next = new Date(draftDueDateTime);
    if (field === 'hours') next.setHours(value);
    if (field === 'minutes') next.setMinutes(value);
    setDraftDueDateTime(next);
  };

  const toggleRelatedMaterial = (materialId: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(materialId) ? prev.filter((id) => id !== materialId) : [...prev, materialId]
    );
    setErrors((prev) => ({ ...prev, materials: undefined }));
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        base64: Platform.OS === 'web',
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPickedFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
        base64: (asset as any).base64,
        file: (asset as any).file,
      });
    } catch {
      showResultModal('error', 'Error', 'Failed to pick file.');
    }
  };

  const handlePickAssignmentFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        base64: Platform.OS === 'web',
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setPickedAssignmentFile({
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
        base64: (asset as any).base64,
        file: (asset as any).file,
      });
    } catch {
      showResultModal('error', 'Error', 'Failed to pick assignment file.');
    }
  };

  const uploadPickedFile = async (picked: PickedUploadFile, kind: 'material' | 'assignment') => {
    if (!picked || !course?.id) return null;
    let fileBase64: string | null = null;
    if (Platform.OS === 'web') {
      if (picked.base64) {
        fileBase64 = picked.base64;
      } else if (picked.file) {
        fileBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string')
              resolve(result.includes(',') ? result.split(',')[1] : result);
            else reject(new Error('Failed to read file on web.'));
          };
          reader.onerror = () => reject(new Error('Failed to read file on web.'));
          reader.readAsDataURL(picked.file as File);
        });
      }
    } else if (picked.uri) {
      fileBase64 = await FileSystem.readAsStringAsync(picked.uri, { encoding: 'base64' as any });
    }
    const response = await fetch(`${API_BASE_URL}/upload-class-file`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        classId: course.id,
        fileBase64,
        fileName: picked.name ?? 'file',
        fileType: picked.type ?? 'application/octet-stream',
        kind,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to upload file.');
    return data.data;
  };

  const handleOpenUploadedFile = async (fileUri?: string) => {
    if (!fileUri) {
      showResultModal('error', 'No File', 'No uploaded file available.');
      return;
    }
    try {
      await Linking.openURL(fileUri);
    } catch {
      showResultModal('error', 'Error', 'Unable to open the file.');
    }
  };

  const handleGradeSubmission = async (
    submissionId: string,
    score: number,
    feedback?: string
  ) => {
    try {
      const response = await fetch(`${API_BASE_URL}/grade-submission/${submissionId}`, {
        credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'graded', score, feedback: feedback || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to save score.');
      await loadCourseContent();
      showResultModal('success', 'Score Saved', 'The student submission has been graded.');
    } catch (error: any) {
      showResultModal('error', 'Grade Failed', error?.message || 'Unable to save score.');
    }
  };

  const handleCopyClassCode = async () => {
    const codeToCopy = course?.classCode || '';
    if (!codeToCopy || codeToCopy === 'No Class Code') return;
    await Clipboard.setStringAsync(codeToCopy);
    setClassCodeCopied(true);
    setTimeout(() => setClassCodeCopied(false), 2000);
  };

  const downloadClassGradesExcel = async () => {
    if (!course?.id) {
      showResultModal('error', 'No Class', 'No class selected.');
      return;
    }
    try {
      const gameResponse = await fetch(`${API_BASE_URL}/class-game-scores/${course.id}`, {
        credentials: 'include',
      });
      const gameScores = gameResponse.ok ? await gameResponse.json() : [];
      const workbook = XLSX.utils.book_new();

      const gradeRows = members.map((member) => {
        const studentSubmissions = submissions.filter((s) => s.studentId === member.id);
        const scores = assignments.map((assignment) => {
          const submission = studentSubmissions.find((s) => s.assignmentId === assignment.id);
          return submission?.status === 'graded' ? submission.score : '';
        });
        return {
          'Student Name': member.name,
          ...Object.fromEntries(assignments.map((a, i) => [a.header, scores[i]])),
        };
      });
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(gradeRows),
        'Assignment Grades'
      );

      const gameRows = gameScores.map((game: any, index: number) => ({
        No: index + 1,
        'Student ID': game.studentId,
        'Student Name': game.studentName,
        Score: game.score,
        'Total Questions': game.totalQuestions,
        Percentage: `${game.percent}%`,
      }));
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(gameRows),
        'Quiz Masters Scores'
      );

      const wbout = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      if (Platform.OS === 'web') {
        const blob = new Blob([wbout], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${course.name}_Grades.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const base64 = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
        const fileUri = `${FileSystem.documentDirectory}${course.name}_Grades.xlsx`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        await Linking.openURL(fileUri);
      }
      showResultModal('success', 'Export Successful', 'Excel exported successfully.');
    } catch (error: any) {
      showResultModal('error', 'Export Failed', error?.message || 'Failed to export Excel.');
    }
  };

  const validateAssignmentForm = () => {
    const nextErrors: FormErrors = {};
    if (!formTitle.trim()) nextErrors.title = 'Header is required.';
    if (!formDesc.trim()) nextErrors.instruction = 'Instruction is required.';
    if (assignmentType === 'game_based') {
      if (generatedQuestions.length === 0)
        nextErrors.totalScore = 'Please generate at least one question for the game.';
    } else {
      if (!formPoints.trim()) nextErrors.totalScore = 'Total score is required.';
      if (!formPointsOnTime.trim()) nextErrors.pointsOnTime = 'Points on time is required.';
    }
    if (!formDue.trim()) nextErrors.dueDate = 'Due date and time is required.';
    if (selectedMaterialIds.length === 0)
      nextErrors.materials = 'Select at least one related material.';
    if (assignmentType === 'game_based') {
      if (!gameType) nextErrors.gameType = 'Please select a game type.';
      if (availableCourses.length > 1 && !selectedClassId)
        nextErrors.classId = 'Please select a class.';
      if (!numberOfAttempts) nextErrors.attempts = 'Please select number of attempts.';
      else if (
        numberOfAttempts === 'custom' &&
        (!customAttempts.trim() || Number(customAttempts) < 1)
      )
        nextErrors.customAttempts = 'Custom attempts must be at least 1.';
      if (!timeLimit) nextErrors.timeLimit = 'Please select a time limit.';
      if (timeLimit === 'custom' && !customTimeLimit.trim())
        nextErrors.customTimeLimit = 'Please enter custom time limit.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showResultModal('error', 'Required', 'Please complete the highlighted assignment fields.');
      return false;
    }
    return true;
  };

  const handleGenerateQuestions = async () => {
    if (!gameType) {
      showResultModal('error', 'Error', 'Please select a game type first before generating questions.');
      return;
    }
    if (selectedMaterialIds.length === 0) {
      showResultModal('error', 'Error', 'Please select at least one learning material first.');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/game-ai/generate-quiz-materials`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: course?.id,
          materialIds: selectedMaterialIds,
          studentId: currentTeacher?.teacherId || 'teacher-preview',
          gameType,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate questions.');
      const questionsArray = Array.isArray(data.questions) ? data.questions : [];
      if (questionsArray.length === 0)
        throw new Error('AI did not return any valid questions. Please try again.');

      const editableQuestions = questionsArray.map((q: any, index: number) => {
        if (gameType === 'memory_match') {
          return { id: `gen-${Date.now()}-${index}`, question: q.question || '', answer: q.answer || '' };
        }
        const options = q.options && q.options.length === 4 ? q.options : ['', '', '', ''];
        const answer = q.answer || options[0] || '';
        const correctIndex = options.indexOf(answer);
        return { id: `gen-${Date.now()}-${index}`, question: q.question || '', options, answer, correctIndex: correctIndex !== -1 ? correctIndex : 0 };
      });
      setGeneratedQuestions(editableQuestions);
      setShowGeneratedPreview(true);
      showResultModal('success', 'Generated', 'Questions generated successfully! You can edit them before saving.');
    } catch (error: any) {
      showResultModal('error', 'Generation Failed', error?.message || 'Unable to generate questions.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateMoreQuestions = async () => {
    if (selectedMaterialIds.length === 0) {
      showResultModal('error', 'Error', 'Please select at least one learning material first.');
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/game-ai/generate-quiz-materials`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: course?.id,
          materialIds: selectedMaterialIds,
          studentId: currentTeacher?.teacherId || 'teacher-preview',
          gameType,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate questions.');
      const questionsArray = Array.isArray(data.questions) ? data.questions : [];
      if (questionsArray.length === 0)
        throw new Error('AI did not return any valid questions. Please try again.');

      const newQuestions = questionsArray.map((q: any, index: number) => {
        if (gameType === 'memory_match') {
          return { id: `gen-${Date.now()}-${index}`, question: q.question || '', answer: q.answer || '' };
        }
        const options = q.options && q.options.length === 4 ? q.options : ['', '', '', ''];
        const answer = q.answer || options[0] || '';
        const correctIndex = options.indexOf(answer);
        return { id: `gen-${Date.now()}-${index}`, question: q.question || '', options, answer, correctIndex: correctIndex !== -1 ? correctIndex : 0 };
      });
      setGeneratedQuestions((prev) => [...prev, ...newQuestions]);
      showResultModal('success', 'Generated', `${newQuestions.length} more questions added successfully!`);
    } catch (error: any) {
      showResultModal('error', 'Generation Failed', error?.message || 'Unable to generate questions.');
    } finally {
      setIsGenerating(false);
    }
  };

  const updateGeneratedQuestion = (index: number, field: string, value: string) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const updateGeneratedOption = (qIndex: number, oIndex: number, value: string) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      const newOptions = [...next[qIndex].options];
      newOptions[oIndex] = value;
      let newAnswer = next[qIndex].answer;
      if (next[qIndex].correctIndex === oIndex) newAnswer = value;
      next[qIndex] = { ...next[qIndex], options: newOptions, answer: newAnswer };
      return next;
    });
  };

  const toggleCorrectOption = (qIndex: number, oIndex: number) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], correctIndex: oIndex, answer: next[qIndex].options[oIndex] };
      return next;
    });
  };

  const deleteGeneratedQuestion = (qIndex: number) => {
    setGeneratedQuestions((prev) => prev.filter((_, index) => index !== qIndex));
  };

  const handleCreate = async () => {
    if (isSaving) return;
    if (!course?.id) {
      showResultModal('error', 'Error', 'No class selected.');
      return;
    }

    if (activeTab === 'Materials') {
      if (!formTitle.trim() || !formPointsOnTime.trim()) {
        showResultModal('error', 'Required', 'Please enter the title and week.');
        return;
      }
      setIsSaving(true);
      try {
        let uploadedFile = null;
        if (pickedFile?.uri || pickedFile?.base64 || pickedFile?.file)
          uploadedFile = await uploadPickedFile(pickedFile, 'material');
        const response = await fetch(`${API_BASE_URL}/create-class-material`, {
          credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          classId: course.id,
          title: formTitle.trim(),
          week: formPointsOnTime.trim(),
          content:
            formDesc.trim() || `${formPointsOnTime.trim()} material: ${formTitle.trim()}`,

          fileName: uploadedFile?.fileName ?? null,
          fileUrl: uploadedFile?.fileUrl ?? null,
          fileType: uploadedFile?.fileType ?? null,

          storagePath: uploadedFile?.storagePath ?? null,
          bucketPath: uploadedFile?.bucketPath ?? null,

          // ADD THESE
          pdfUrl: uploadedFile?.pdfUrl ?? null,
          pdfStoragePath: uploadedFile?.pdfStoragePath ?? null,

          postedByUid: teacherIdentity,
          postedByName: teacherFullName,
        }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create material');
        await loadCourseContent();
        setShowCreateModal(false);
        resetCreateForm();
        showResultModal('success', 'Success', 'Material uploaded successfully.');
      } catch (error: any) {
        showResultModal('error', 'Upload Failed', error?.message || 'Failed to create material.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!validateAssignmentForm()) return;
    setIsSaving(true);
    try {
      let uploadedFile = null;
      if (pickedAssignmentFile?.uri || pickedAssignmentFile?.base64 || pickedAssignmentFile?.file)
        uploadedFile = await uploadPickedFile(pickedAssignmentFile, 'assignment');

      const response = await fetch(`${API_BASE_URL}/create-class-assignment`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId:
            assignmentType === 'game_based' && selectedClassId
              ? selectedClassId
              : course?.id,
          header: formTitle.trim(),
          instruction: formDesc.trim(),
          dueDate: formDue.trim(),
          totalScore:
            assignmentType === 'game_based' ? generatedQuestions.length : Number(formPoints),
          pointsOnTime:
            assignmentType === 'game_based' ? generatedQuestions.length : Number(formPointsOnTime),
          repositoryDisabledAfterDue: assignmentDisableRepositoryAfterDue,
          materialIds: selectedMaterialIds,
          assignmentType,
          gameType: assignmentType === 'game_based' ? gameType : undefined,
          numberOfAttempts:
            assignmentType === 'game_based'
              ? numberOfAttempts === 'custom'
                ? 'custom'
                : numberOfAttempts
              : undefined,
          customAttempts:
            assignmentType === 'game_based' && numberOfAttempts === 'custom'
              ? customAttempts
              : undefined,
          timeLimit: assignmentType === 'game_based' ? timeLimit : undefined,
          customTimeLimit:
            assignmentType === 'game_based' && timeLimit === 'custom'
              ? customTimeLimit
              : undefined,
          questions: assignmentType === 'game_based' ? generatedQuestions : undefined,
          fileName: uploadedFile?.fileName ?? null,
          fileUrl: uploadedFile?.fileUrl ?? null,
          fileType: uploadedFile?.fileType ?? null,
          storagePath: uploadedFile?.storagePath ?? null,
          bucketPath: uploadedFile?.bucketPath ?? null,
          postedByUid: teacherIdentity,
          postedByName: teacherFullName,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create assignment');
      await loadCourseContent();
      setShowCreateModal(false);
      resetCreateForm();
      showResultModal('success', 'Success', 'Assignment uploaded successfully.');
    } catch (error: any) {
      showResultModal('error', 'Upload Failed', error?.message || 'Failed to create assignment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedId || !validateAssignmentForm()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/update-class-assignment/${selectedId}`, {
        credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: formTitle.trim(),
          instruction: formDesc.trim(),
          totalScore:
            assignmentType === 'game_based' ? generatedQuestions.length : Number(formPoints),
          pointsOnTime:
            assignmentType === 'game_based' ? generatedQuestions.length : Number(formPointsOnTime),
          dueDate: formDue.trim(),
          repositoryDisabledAfterDue: assignmentDisableRepositoryAfterDue,
          materialIds: selectedMaterialIds,
          assignmentType,
          gameType: assignmentType === 'game_based' ? gameType : undefined,
          numberOfAttempts:
            assignmentType === 'game_based'
              ? numberOfAttempts === 'custom'
                ? 'custom'
                : numberOfAttempts
              : undefined,
          customAttempts:
            assignmentType === 'game_based' && numberOfAttempts === 'custom'
              ? customAttempts
              : undefined,
          timeLimit: assignmentType === 'game_based' ? timeLimit : undefined,
          customTimeLimit:
            assignmentType === 'game_based' && timeLimit === 'custom'
              ? customTimeLimit
              : undefined,
          questions: assignmentType === 'game_based' ? generatedQuestions : undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update assignment');
      await loadCourseContent();
      setShowUpdateModal(false);
      showResultModal('success', 'Success', 'Assignment updated.');
    } catch (error: any) {
      showResultModal('error', 'Error', error?.message || 'Failed to update assignment.');
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete-class-assignment/${selectedId}`, {
        credentials: 'include',
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete assignment');
      await loadCourseContent();
      setShowUpdateModal(false);
      setShowSubmissions(false);
      showResultModal('success', 'Success', 'Assignment deleted.');
    } catch (error: any) {
      showResultModal('error', 'Error', error?.message || 'Failed to delete assignment.');
    }
  };

// ─── Viewer-related computed values ───────────────────────────────────────
const viewerFileUrl = getMaterialFileUrl(viewerMaterial);
const viewerPdfUrl = getMaterialPdfUrl(viewerMaterial);
const viewerIsPresentation = isPresentationFile(
  viewerMaterial?.fileName,
  viewerMaterial?.fileType
);
const viewerIsShowingPdfPreview = viewerIsPresentation && !!viewerPdfUrl;

const viewerIsVideo =
  (viewerMaterial?.fileType || '').startsWith('video/') ||
  ['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(
    (viewerMaterial?.fileName || '').split('.').pop()?.toLowerCase() || ''
  );

// Mirror student: inline viewer is used for anything non-video that has a URL
const viewerShouldUseInline = !viewerIsVideo && !!viewerFileUrl;

const viewerUrl = viewerFileUrl
  ? getViewerUrl(
      viewerFileUrl,
      viewerMaterial?.fileName,
      viewerMaterial?.fileType,
      viewerPdfUrl
    )
  : null;

const viewerHasFile = !!viewerFileUrl;

  const selectedAssignment = assignments.find((a) => a.id === selectedId);
  const courseName = course?.name || 'Untitled Course';
  const courseYear = course?.year || '';
  const courseSection = course?.section || '';
  const courseInstructor = course?.instructor || 'No Instructor';
  const classCode = course?.classCode || 'No Class Code';
  const courseSemester = course?.semester || '';
  const schoolYear = course?.schoolYear || '';
  const calendarDays = getCalendarDays(visibleCalendarMonth);

  const renderInputError = (message?: string) =>
    !!message ? <Text style={styles.errorText}>{message}</Text> : null;

  const renderRelatedMaterialsSelector = () => (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>Learning Materials</Text>
      <Text style={styles.helperText}>
        Select the materials the AI should use for follow-up activity generation or game content.
      </Text>
      {materials.length === 0 ? (
        <Text style={styles.emptyMiniText}>No created materials yet.</Text>
      ) : (
        <View
          style={[styles.materialSelectorWrap, errors.materials ? styles.errorContainer : null]}
        >
          {materials.map((material) => {
            const active = selectedMaterialIds.includes(material.id);
            return (
              <TouchableOpacity
                key={material.id}
                style={[styles.materialChip, active && styles.materialChipActive]}
                onPress={() => toggleRelatedMaterial(material.id)}
                activeOpacity={0.85}
                disabled={isSaving}
              >
                <Ionicons
                  name={active ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={active ? '#FFF' : '#D32F2F'}
                />
                <Text style={[styles.materialChipText, active && styles.materialChipTextActive]}>
                  {material.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {renderInputError(errors.materials)}
    </View>
  );

  const renderDateTimeField = () => (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>Due Date & Time</Text>
      <TouchableOpacity
        style={[
          styles.dateButton,
          errors.dueDate ? styles.errorBorder : null,
          isSaving ? styles.disabledInput : null,
        ]}
        onPress={openDateTimePicker}
        activeOpacity={0.85}
        disabled={isSaving}
      >
        <Ionicons name="calendar-outline" size={18} color="#D32F2F" />
        <Text style={styles.dateButtonText}>{formDue || 'Select due date and time'}</Text>
      </TouchableOpacity>
      {renderInputError(errors.dueDate)}
    </View>
  );

  const renderGameAndClassRow = () => {
    const selectedGame = gameOptions.find((g) => g.value === gameType);
    const selectedClass = availableCourses.find((c) => c.id === selectedClassId);
    return (
      <View style={[styles.gameAndClassRow, isMobile && styles.gameAndClassRowMobile]}>
        <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
          <Text style={styles.sectionLabel}>Select Game</Text>
          <TouchableOpacity
            style={[styles.dropdownTrigger, errors.gameType ? styles.errorBorder : null]}
            onPress={() => setShowGameTypeModal(true)}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.dropdownText, !selectedGame && styles.dropdownPlaceholder]}
              numberOfLines={1}
            >
              {selectedGame ? selectedGame.label : 'Choose a game type'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#D32F2F" />
          </TouchableOpacity>
          {renderInputError(errors.gameType)}
        </View>
        {availableCourses.length > 1 && (
          <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
            <Text style={styles.sectionLabel}>Course / Class</Text>
            <TouchableOpacity
              style={[styles.dropdownTrigger, errors.classId ? styles.errorBorder : null]}
              onPress={() => setShowClassModal(true)}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.dropdownText, !selectedClass && styles.dropdownPlaceholder]}
                numberOfLines={1}
              >
                {selectedClass
                  ? `${selectedClass.courseCode} - ${selectedClass.name}`
                  : 'Select a class'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#D32F2F" />
            </TouchableOpacity>
            {renderInputError(errors.classId)}
          </View>
        )}
      </View>
    );
  };

  const renderAttemptsSelector = () => (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>Number of Attempts</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {['1', '2', '3', 'unlimited', 'custom'].map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.attemptChip, numberOfAttempts === val && styles.attemptChipActive]}
            onPress={() => {
              setNumberOfAttempts(val);
              if (val !== 'custom') setCustomAttempts('');
              if (errors.attempts) setErrors((prev) => ({ ...prev, attempts: undefined }));
              if (errors.customAttempts)
                setErrors((prev) => ({ ...prev, customAttempts: undefined }));
            }}
            disabled={isSaving}
          >
            <Text
              style={[
                styles.attemptChipText,
                numberOfAttempts === val && styles.attemptChipTextActive,
              ]}
            >
              {val === 'unlimited' ? 'Unlimited' : val === 'custom' ? 'Custom' : val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {numberOfAttempts === 'custom' && (
        <TextInput
          style={[
            styles.inputBox,
            { marginTop: 10 },
            errors.customAttempts ? styles.errorBorder : null,
          ]}
          value={customAttempts}
          onChangeText={(val) => {
            setCustomAttempts(val.replace(/[^0-9]/g, ''));
            if (errors.customAttempts)
              setErrors((prev) => ({ ...prev, customAttempts: undefined }));
          }}
          keyboardType="numeric"
          placeholder="Enter number (e.g., 5)"
          placeholderTextColor="#999"
          editable={!isSaving}
        />
      )}
      {renderInputError(errors.attempts || errors.customAttempts)}
    </View>
  );

  const renderTimeLimitSelector = () => (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>Time Limit</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {['5', '10', '15', '30', '60', 'custom', 'unlimited'].map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.timeChip, timeLimit === val && styles.timeChipActive]}
            onPress={() => {
              setTimeLimit(val);
              if (val !== 'custom') setCustomTimeLimit('');
              if (errors.timeLimit) setErrors((prev) => ({ ...prev, timeLimit: undefined }));
              if (errors.customTimeLimit)
                setErrors((prev) => ({ ...prev, customTimeLimit: undefined }));
            }}
            disabled={isSaving}
          >
            <Text
              style={[styles.timeChipText, timeLimit === val && styles.timeChipTextActive]}
            >
              {val === 'custom' ? 'Custom' : val === 'unlimited' ? 'Unlimited' : `${val} mins`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {timeLimit === 'custom' && (
        <TextInput
          style={[
            styles.inputBox,
            { marginTop: 10 },
            errors.customTimeLimit ? styles.errorBorder : null,
          ]}
          value={customTimeLimit}
          onChangeText={(val) => {
            setCustomTimeLimit(val.replace(/[^0-9]/g, ''));
            if (errors.customTimeLimit)
              setErrors((prev) => ({ ...prev, customTimeLimit: undefined }));
          }}
          keyboardType="numeric"
          placeholder="Enter minutes (e.g., 45)"
          placeholderTextColor="#999"
          editable={!isSaving}
        />
      )}
      {renderInputError(errors.timeLimit || errors.customTimeLimit)}
    </View>
  );

  const renderAssignmentFields = () => (
    <View style={[styles.formGrid, !isMobile && styles.formGridDesktop]}>
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Assignment Type</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <TouchableOpacity
            style={[styles.typeChip, assignmentType === 'regular' && styles.typeChipActive]}
            onPress={() => setAssignmentType('regular')}
            disabled={isSaving}
          >
            <Text
              style={[
                styles.typeChipText,
                assignmentType === 'regular' && styles.typeChipTextActive,
              ]}
            >
              Regular Submission
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeChip, assignmentType === 'game_based' && styles.typeChipActive]}
            onPress={() => setAssignmentType('game_based')}
            disabled={isSaving}
          >
            <Text
              style={[
                styles.typeChipText,
                assignmentType === 'game_based' && styles.typeChipTextActive,
              ]}
            >
              Game Based Assignment
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {assignmentType === 'game_based' && renderGameAndClassRow()}

      <View style={[styles.formColumnLeft, !isMobile && styles.formColumnLeftDesktop]}>
        <Text style={styles.sectionLabel}>Header</Text>
        <TextInput
          style={[styles.inputBox, errors.title ? styles.errorBorder : null]}
          value={formTitle}
          onChangeText={(value) => {
            setFormTitle(value);
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          placeholder="Enter Header"
          placeholderTextColor="#999"
          editable={!isSaving}
        />
        {renderInputError(errors.title)}

        <Text style={styles.sectionLabel}>Instruction</Text>
        <TextInput
          style={[styles.textAreaBox, errors.instruction ? styles.errorBorder : null]}
          value={formDesc}
          onChangeText={(value) => {
            setFormDesc(value);
            if (errors.instruction) setErrors((prev) => ({ ...prev, instruction: undefined }));
          }}
          placeholder="Enter Instruction"
          placeholderTextColor="#999"
          multiline
          editable={!isSaving}
        />
        {renderInputError(errors.instruction)}

        {assignmentType === 'game_based' && renderAttemptsSelector()}
        {assignmentType === 'game_based' && renderTimeLimitSelector()}
      </View>

      <View style={[styles.formColumnRight, !isMobile && styles.formColumnRightDesktop]}>
        {renderDateTimeField()}
        <View style={styles.scoreStackDesktop}>
          <View style={styles.scoreFieldFull}>
            <Text style={styles.sectionLabel}>Total Score</Text>
            <TextInput
              style={[
                styles.inputBox,
                errors.totalScore ? styles.errorBorder : null,
                assignmentType === 'game_based' ? { backgroundColor: '#F5F5F5', color: '#666' } : null,
              ]}
              value={
                assignmentType === 'game_based' ? String(generatedQuestions.length) : formPoints
              }
              onChangeText={(value) => {
                setFormPoints(value);
                if (errors.totalScore) setErrors((prev) => ({ ...prev, totalScore: undefined }));
              }}
              keyboardType="numeric"
              placeholder="Total Score"
              placeholderTextColor="#999"
              editable={assignmentType !== 'game_based' && !isSaving}
            />
            {assignmentType === 'game_based' && (
              <Text style={{ fontSize: 11, color: '#888', marginTop: -4, marginBottom: 8, marginLeft: 4 }}>
                * Auto-calculated based on the number of generated questions (1 point per item).
              </Text>
            )}
            {renderInputError(errors.totalScore)}
          </View>
          {assignmentType !== 'game_based' && (
            <View style={styles.scoreFieldFull}>
              <Text style={styles.sectionLabel}>Points On Time</Text>
              <TextInput
                style={[styles.inputBox, errors.pointsOnTime ? styles.errorBorder : null]}
                value={formPointsOnTime}
                onChangeText={(value) => {
                  setFormPointsOnTime(value);
                  if (errors.pointsOnTime)
                    setErrors((prev) => ({ ...prev, pointsOnTime: undefined }));
                }}
                keyboardType="numeric"
                placeholder="Points On Time"
                placeholderTextColor="#999"
                editable={!isSaving}
              />
              {renderInputError(errors.pointsOnTime)}
            </View>
          )}
        </View>
      </View>

      <View style={styles.fullWidthSection}>
        {renderRelatedMaterialsSelector()}

        {assignmentType === 'game_based' && selectedMaterialIds.length > 0 && gameType && (
          <TouchableOpacity
            style={[styles.generateButton, isGenerating ? styles.disabledButton : null]}
            onPress={handleGenerateQuestions}
            disabled={isGenerating || isSaving}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color="#FFF" />
            )}
            <Text style={styles.generateButtonText}>
              {isGenerating
                ? 'Generating...'
                : `Generate ${gameOptions.find((g) => g.value === gameType)?.label || ''} Questions`}
            </Text>
          </TouchableOpacity>
        )}

        {assignmentType === 'game_based' && selectedMaterialIds.length > 0 && !gameType && (
          <View style={[styles.generateButton, { backgroundColor: '#9E9E9E' }]}>
            <Ionicons name="alert-circle-outline" size={18} color="#FFF" />
            <Text style={styles.generateButtonText}>Select a Game Type to Generate Questions</Text>
          </View>
        )}

        {assignmentType === 'regular' && (
          <>
            <Text style={styles.sectionLabel}>Attachment</Text>
            <TouchableOpacity
              style={[styles.primaryButtonWide, isSaving ? styles.disabledButton : null]}
              onPress={handlePickAssignmentFile}
              disabled={isSaving}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.uploadBtnText}>
                {pickedAssignmentFile?.name ? 'Change File' : 'Upload File'}
              </Text>
            </TouchableOpacity>
            {!!pickedAssignmentFile?.name && (
              <View style={styles.filePreviewBox}>
                <Ionicons name="document-text-outline" size={20} color="#D32F2F" />
                <Text style={styles.filePreviewText}>{pickedAssignmentFile.name}</Text>
              </View>
            )}
          </>
        )}

        <View style={styles.checkboxRow}>
          <TouchableOpacity
            style={[
              styles.checkboxBox,
              assignmentDisableRepositoryAfterDue && styles.checkboxBoxChecked,
            ]}
            onPress={() =>
              setAssignmentDisableRepositoryAfterDue(!assignmentDisableRepositoryAfterDue)
            }
          >
            {assignmentDisableRepositoryAfterDue ? (
              <Ionicons name="checkmark" size={16} color="#FFF" />
            ) : null}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>Disable repository after due</Text>
        </View>
      </View>
    </View>
  );

  const renderCreateModalBody = () => {
    if (activeTab === 'Materials') {
      return (
        <>
          <Text style={styles.sectionLabel}>Title</Text>
          <TextInput
            style={styles.inputBox}
            placeholder="Material Title"
            placeholderTextColor="#999"
            value={formTitle}
            onChangeText={setFormTitle}
          />
          <Text style={styles.sectionLabel}>Week</Text>
          <TextInput
            style={styles.inputBox}
            placeholder="Week (example: Week 1)"
            placeholderTextColor="#999"
            value={formPointsOnTime}
            onChangeText={setFormPointsOnTime}
          />
          <Text style={styles.sectionLabel}>Description</Text>
          <TextInput
            style={styles.textAreaBox}
            placeholder="Optional description"
            placeholderTextColor="#999"
            value={formDesc}
            onChangeText={setFormDesc}
            multiline
          />
          <Text style={styles.sectionLabel}>Attachment</Text>
          <TouchableOpacity
            style={[styles.primaryButtonWide, isSaving ? styles.disabledButton : null]}
            onPress={handlePickFile}
            disabled={isSaving}
          >
            <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
            <Text style={styles.uploadBtnText}>Upload File</Text>
          </TouchableOpacity>
          {!!pickedFile?.name && (
            <View style={styles.filePreviewBox}>
              <Ionicons name="document-text-outline" size={20} color="#D32F2F" />
              <Text style={styles.filePreviewText}>{pickedFile.name}</Text>
            </View>
          )}
        </>
      );
    }
    return renderAssignmentFields();
  };

  const renderQuestionEditor = (q: any, qIndex: number) => {
    const renderHeader = (title: string) => (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>{title}</Text>
        <TouchableOpacity
          onPress={() => deleteGeneratedQuestion(qIndex)}
          style={{ padding: 6, backgroundColor: '#FFEBEE', borderRadius: 8 }}
        >
          <Ionicons name="trash-outline" size={18} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    );

    const renderOptionWithDropdown = (opt: string, oIndex: number, placeholderPrefix: string) => {
      const isCorrect = q.correctIndex === oIndex;
      return (
        <View
          key={oIndex}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
        >
          <TextInput
            style={[
              styles.inputBox,
              { flex: 1, marginBottom: 0, borderColor: isCorrect ? '#2E7D32' : '#DDD' },
            ]}
            value={opt}
            onChangeText={(val) => updateGeneratedOption(qIndex, oIndex, val)}
            placeholder={isCorrect ? `${placeholderPrefix} (Correct)` : `${placeholderPrefix} ${oIndex + 1}`}
          />
          <TouchableOpacity
            style={[
              styles.correctnessDropdown,
              {
                borderColor: isCorrect ? '#2E7D32' : '#DDD',
                backgroundColor: isCorrect ? '#E8F5E9' : '#FFF',
              },
            ]}
            onPress={() => toggleCorrectOption(qIndex, oIndex)}
          >
            <Text style={{ color: isCorrect ? '#2E7D32' : '#888', fontWeight: '700', fontSize: 12 }}>
              {isCorrect ? 'Correct' : 'Wrong'}
            </Text>
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={isCorrect ? '#2E7D32' : '#888'}
            />
          </TouchableOpacity>
        </View>
      );
    };

    switch (gameType) {
      case 'memory_match':
        return (
          <View key={q.id} style={styles.generatedQuestionBlock}>
            {renderHeader(`Pair ${qIndex + 1}`)}
            <Text style={styles.sectionLabel}>Term</Text>
            <TextInput
              style={styles.inputBox}
              value={q.question}
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'question', val)}
              placeholder="HTML"
            />
            <Text style={styles.sectionLabel}>Definition</Text>
            <TextInput
              style={styles.inputBox}
              value={q.answer}
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'answer', val)}
              placeholder="HyperText Markup Language"
              multiline
            />
          </View>
        );
      case 'fill_in_blanks':
        return (
          <View key={q.id} style={styles.generatedQuestionBlock}>
            {renderHeader(`Item ${qIndex + 1}`)}
            <Text style={styles.sectionLabel}>Sentence (Use '___' for the blank)</Text>
            <TextInput
              style={styles.inputBox}
              value={q.question}
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'question', val)}
              placeholder="The process of ___ is defined as..."
              multiline
            />
            <Text style={styles.sectionLabel}>Missing Word / Correct Answer</Text>
            <TextInput
              style={styles.inputBox}
              value={q.answer}
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'answer', val)}
              placeholder="Enter the exact word to fill in the blank"
            />
          </View>
        );
      case 'flashcard':
        return (
          <View key={q.id} style={styles.generatedQuestionBlock}>
            {renderHeader(`Flashcard ${qIndex + 1}`)}
            <Text style={styles.sectionLabel}>Front of Card (Question / Prompt)</Text>
            <TextInput
              style={styles.inputBox}
              value={q.question}
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'question', val)}
              placeholder="What is the capital of France?"
              multiline
            />
            <Text style={styles.sectionLabel}>Back of Card (Answer)</Text>
            <TextInput
              style={styles.inputBox}
              value={q.answer}
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'answer', val)}
              placeholder="Paris"
            />
          </View>
        );
      case 'quiz_master':
      case 'boss_battle':
      default:
        return (
          <View key={q.id} style={styles.generatedQuestionBlock}>
            {renderHeader(
              `${gameType === 'boss_battle' ? 'Boss Battle Question' : 'Question'} ${qIndex + 1}`
            )}
            <TextInput
              style={styles.inputBox}
              value={q.question}
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'question', val)}
              placeholder="Enter question"
              multiline
            />
            <Text style={styles.sectionLabel}>Options (Select Correct or Wrong)</Text>
            {q.options.map((opt: string, oIndex: number) =>
              renderOptionWithDropdown(opt, oIndex, `Option ${String.fromCharCode(65 + oIndex)}`)
            )}
          </View>
        );
    }
  };

  // ─── Submissions sub-view ─────────────────────────────────────────────────
  if (showSubmissions) {
    return (
      <>
        <TeacherSubmissionsSection
          members={members}
          currentAssignment={selectedAssignment}
          submissions={submissions}
          onBack={() => setShowSubmissions(false)}
          onOpenUpdate={() => openUpdateModal(selectedAssignment)}
          onGradeSubmission={handleGradeSubmission}
        />
        <Modal visible={showUpdateModal} transparent animationType="fade">
          <View style={styles.modalOverlayCenter}>
            <View
              style={[
                styles.modalCardElevated,
                { width: isMobile ? Math.min(width - 28, 360) : 820, maxHeight: height * 0.9 },
              ]}
            >
              <View style={styles.createHeaderRow}>
                <View style={styles.modalHeaderTextWrap}>
                  <Text style={styles.createTitle}>Update Assignment</Text>
                  <Text style={styles.modalSubtitle}>Edit the selected assignment details.</Text>
                </View>
                <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                  <Ionicons name="close" size={24} color="#111" />
                </TouchableOpacity>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                {renderAssignmentFields()}
              </ScrollView>
              <View style={styles.modalBottomActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleDelete}>
                  <Text style={styles.secondaryButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleUpdate}>
                  <Text style={styles.primaryButtonText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.screenScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isMobile ? <View style={{ height: insets.top + 10 }} /> : null}

        {/* ── Course Header ── */}
        <View
          style={[
            styles.courseHeader,
            {
              paddingHorizontal: isMobile ? 16 : 60,
              paddingTop: isMobile ? 16 : 20,
              paddingBottom: isMobile ? 18 : 24,
            },
          ]}
        >
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTopRow}>
            <Text
              style={[styles.courseName, { fontSize: isSmallPhone ? 20 : 24, flex: 1 }]}
              numberOfLines={1}
            >
              {courseName}
            </Text>
            <TouchableOpacity
              style={styles.exportGradesButtonInline}
              onPress={downloadClassGradesExcel}
              activeOpacity={0.85}
            >
              <Ionicons name="download-outline" size={18} color="#FFFFFF" />
              {!isMobile && (
                <Text style={styles.exportGradesButtonText}>Export Grades Excel</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.headerInfoCard}>
            <View style={styles.headerInfoRow}>
              <Text style={styles.headerInfoLabel}>INSTRUCTOR</Text>
              <Text style={styles.headerInfoValue} numberOfLines={1}>
                {courseInstructor}
              </Text>
            </View>
            <View
              style={[
                styles.headerDetailsGrid,
                !isMobile && styles.headerDetailsGridDesktop,
              ]}
            >
              {!!courseYear && (
                <View
                  style={[
                    styles.academicInfoPill,
                    !isMobile && styles.headerDetailItemDesktop,
                  ]}
                >
                  <Ionicons name="school-outline" size={14} color="#D32F2F" />
                  <View style={styles.academicInfoTextWrap}>
                    <Text style={styles.academicInfoLabel}>Year</Text>
                    <Text style={styles.academicInfoValue} numberOfLines={1}>
                      {courseYear}
                    </Text>
                  </View>
                </View>
              )}
              {!!courseSection && (
                <View
                  style={[
                    styles.academicInfoPill,
                    !isMobile && styles.headerDetailItemDesktop,
                  ]}
                >
                  <Ionicons name="people-outline" size={14} color="#D32F2F" />
                  <View style={styles.academicInfoTextWrap}>
                    <Text style={styles.academicInfoLabel}>Section</Text>
                    <Text style={styles.academicInfoValue} numberOfLines={1}>
                      {courseSection}
                    </Text>
                  </View>
                </View>
              )}
              {!!courseSemester && (
                <View
                  style={[
                    styles.academicInfoPill,
                    !isMobile && styles.headerDetailItemDesktop,
                  ]}
                >
                  <Ionicons name="calendar-outline" size={14} color="#D32F2F" />
                  <View style={styles.academicInfoTextWrap}>
                    <Text style={styles.academicInfoLabel}>Semester</Text>
                    <Text style={styles.academicInfoValue} numberOfLines={1}>
                      {courseSemester}
                    </Text>
                  </View>
                </View>
              )}
              {!!schoolYear && (
                <View
                  style={[
                    styles.academicInfoPill,
                    !isMobile && styles.headerDetailItemDesktop,
                  ]}
                >
                  <Ionicons name="time-outline" size={14} color="#D32F2F" />
                  <View style={styles.academicInfoTextWrap}>
                    <Text style={styles.academicInfoLabel}>School Year</Text>
                    <Text style={styles.academicInfoValue} numberOfLines={1}>
                      {schoolYear}
                    </Text>
                  </View>
                </View>
              )}
              <View
                style={[styles.classCodeBox, !isMobile && styles.headerDetailItemDesktop]}
              >
                <Ionicons name="copy-outline" size={14} color="#D32F2F" />
                <View style={styles.classCodeTextWrap}>
                  <Text style={styles.classCodeLabel}>CLASS CODE</Text>
                  <Text style={styles.classCodeValue} numberOfLines={1}>
                    {classCode}
                  </Text>
                </View>
                <TouchableOpacity style={styles.copyCodeButton} onPress={handleCopyClassCode}>
                  <Ionicons
                    name={classCodeCopied ? 'checkmark-outline' : 'copy-outline'}
                    size={15}
                    color="#D32F2F"
                  />
                  <Text style={styles.copyCodeText}>{classCodeCopied ? 'Copied' : 'Copy'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ── Tabs ── */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => setActiveTab('Materials')}
            style={[styles.tab, activeTab === 'Materials' && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, activeTab === 'Materials' && styles.tabTextActive]}
            >
              Materials ({materials.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('Assignments')}
            style={[styles.tab, activeTab === 'Assignments' && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, activeTab === 'Assignments' && styles.tabTextActive]}
            >
              Assignments ({assignments.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'Materials' ? (
          <TeacherMaterialSection
            materials={materials}
            onCreate={openCreateModal}
            onOpenMaterial={openMaterialViewer}
          />
        ) : (
          <TeacherAssignmentSection
            assignments={assignments}
            onCreate={openCreateModal}
            onOpenMembers={(id) => {
              setSelectedId(id);
              setShowSubmissions(true);
            }}
          />
        )}
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          FULLSCREEN MATERIAL VIEWER MODAL (Teacher Side — mirrors student)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!viewerMaterial}
        transparent={false}
        animationType="slide"
        onRequestClose={closeMaterialViewer}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.viewerModal} edges={['top', 'bottom'] as any}>
          {/* Top bar */}
          <View style={styles.viewerTopBar}>
            <TouchableOpacity
              onPress={closeMaterialViewer}
              style={styles.viewerBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.viewerTitleBlock}>
              <Text style={styles.viewerTitle} numberOfLines={1}>
                {viewerMaterial?.title ?? ''}
              </Text>
              <View style={styles.viewerBadgeRow}>
                {/* File type badge */}
                <View style={styles.viewerTypeBadge}>
                  <Ionicons
                    name={viewerIsPresentation ? 'easel-outline' : 'document-text-outline'}
                    size={11}
                    color="#D32F2F"
                  />
                  <Text style={styles.viewerTypeText}>
                    {viewerIsPresentation
                      ? 'SLIDES'
                      : (viewerMaterial?.fileType || 'FILE').toUpperCase().slice(0, 12)}
                  </Text>
                </View>
                {/* PDF preview badge */}
                {viewerIsShowingPdfPreview && (
                  <View style={styles.viewerPdfBadge}>
                    <Ionicons name="document-text-outline" size={11} color="#1565C0" />
                    <Text style={styles.viewerPdfBadgeText}>PDF Preview</Text>
                  </View>
                )}
                {/* Week badge */}
                {!!viewerMaterial?.week && (
                  <View style={styles.viewerWeekBadge}>
                    <Text style={styles.viewerWeekText}>{viewerMaterial.week}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Action buttons: Edit + Download */}
            <View style={styles.viewerActions}>
              {/* Edit button */}
              <TouchableOpacity
                onPress={() => {
                  if (viewerMaterial) openEditMaterialModal(viewerMaterial);
                }}
                style={styles.viewerActionBtn}
                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              >
                <Ionicons name="create-outline" size={20} color="#FFF" />
              </TouchableOpacity>

              {/* Download button — only show when there's a non-video file (mirrors student) */}
{!!viewerFileUrl && !viewerIsVideo && (
  <TouchableOpacity
    onPress={handleDownloadMaterial}
    disabled={isDownloading}
    style={[styles.viewerActionBtn, isDownloading && { opacity: 0.55 }]}
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
          </View>

          {/* Viewer body — mirrors CourseDetail student exactly */}
{viewerShouldUseInline && viewerUrl ? (
  <InlineMaterialViewer viewerUrl={viewerUrl} height={height - 62} />

) : viewerIsVideo && viewerFileUrl ? (
  <View style={styles.viewerExternalPrompt}>
    <Ionicons name="videocam-outline" size={56} color="#D32F2F" />
    <Text style={styles.viewerExternalTitle}>Video Material</Text>
    <Text style={styles.viewerExternalText}>
      Videos open in your device's media player or browser.
    </Text>
    <TouchableOpacity
      style={styles.viewerExternalButton}
      onPress={() => handleOpenUploadedFile(viewerFileUrl)}
    >
      <Ionicons name="play-circle-outline" size={18} color="#FFF" />
      <Text style={styles.viewerExternalButtonText}>Play Video</Text>
    </TouchableOpacity>
  </View>

) : viewerMaterial?.content ? (
  <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.viewerTextContent}>
    <Text style={styles.viewerTextTitle}>{viewerMaterial.title}</Text>
    {!!viewerMaterial.week && (
      <Text style={styles.viewerTextMeta}>{viewerMaterial.week}</Text>
    )}
    <Text style={styles.viewerTextBody}>{viewerMaterial.content}</Text>
  </ScrollView>

) : (
  <View style={styles.viewerExternalPrompt}>
    <Ionicons name="document-outline" size={56} color="#CCC" />
    <Text style={styles.viewerExternalTitle}>No File Attached</Text>
    <Text style={styles.viewerExternalText}>
      This material has no uploaded file yet.
    </Text>
    <TouchableOpacity
      style={styles.viewerExternalButton}
      onPress={() => {
        if (viewerMaterial) openEditMaterialModal(viewerMaterial);
      }}
    >
      <Ionicons name="create-outline" size={18} color="#FFF" />
      <Text style={styles.viewerExternalButtonText}>Edit Material</Text>
    </TouchableOpacity>
  </View>
)}
        </SafeAreaView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          EDIT MATERIAL MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showEditMaterialModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingMaterial && setShowEditMaterialModal(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 380) : 540, maxHeight: height * 0.88 },
            ]}
          >
            {/* Header */}
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Edit Material</Text>
                <Text style={styles.modalSubtitle}>
                  Update the title, week, description, or replace the attached file.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!isSavingMaterial) setShowEditMaterialModal(false);
                }}
                disabled={isSavingMaterial}
              >
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[styles.modalScrollContent, { paddingBottom: 24 }]}
            >
              {/* Title */}
              <Text style={styles.sectionLabel}>Title *</Text>
              <TextInput
                style={styles.inputBox}
                value={editMatTitle}
                onChangeText={setEditMatTitle}
                placeholder="Material title"
                placeholderTextColor="#999"
                editable={!isSavingMaterial}
              />

              {/* Week */}
              <Text style={styles.sectionLabel}>Week *</Text>
              <TextInput
                style={styles.inputBox}
                value={editMatWeek}
                onChangeText={setEditMatWeek}
                placeholder="e.g. Week 3"
                placeholderTextColor="#999"
                editable={!isSavingMaterial}
              />

              {/* Description */}
              <Text style={styles.sectionLabel}>Description</Text>
              <TextInput
                style={[styles.textAreaBox, { minHeight: 80 }]}
                value={editMatContent}
                onChangeText={setEditMatContent}
                placeholder="Optional description or notes"
                placeholderTextColor="#999"
                multiline
                editable={!isSavingMaterial}
              />

              {/* Current file info */}
              {!!editingMaterial?.fileName && (
                <View style={styles.currentFileBox}>
                  <Ionicons name="document-text-outline" size={20} color="#D32F2F" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentFileLabel}>Current File</Text>
                    <Text style={styles.currentFileName} numberOfLines={1}>
                      {editingMaterial.fileName}
                    </Text>
                  </View>
                </View>
              )}

              {/* Replace file */}
              <Text style={styles.sectionLabel}>
                {editingMaterial?.fileName ? 'Replace File (optional)' : 'Upload File (optional)'}
              </Text>
              <TouchableOpacity
                style={[styles.primaryButtonWide, isSavingMaterial && styles.disabledButton]}
                onPress={handlePickEditMaterialFile}
                disabled={isSavingMaterial}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                <Text style={styles.uploadBtnText}>
                  {editMatPickedFile?.name ? 'Change File' : 'Choose File'}
                </Text>
              </TouchableOpacity>
              {!!editMatPickedFile?.name && (
                <View style={styles.filePreviewBox}>
                  <Ionicons name="document-text-outline" size={20} color="#D32F2F" />
                  <Text style={styles.filePreviewText}>{editMatPickedFile.name}</Text>
                  <TouchableOpacity
                    onPress={() => setEditMatPickedFile(null)}
                    disabled={isSavingMaterial}
                  >
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            <View style={styles.editMaterialActions}>
              {/* Delete */}
              <TouchableOpacity
                style={[styles.deleteMaterialBtn, (isSavingMaterial || isDeletingMaterial) && styles.disabledButton]}
                onPress={handleDeleteMaterial}
                disabled={isSavingMaterial || isDeletingMaterial}
              >
                {isDeletingMaterial ? (
                  <ActivityIndicator size="small" color="#D32F2F" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                )}
                <Text style={styles.deleteMaterialBtnText}>
                  {isDeletingMaterial ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>

              {/* Save */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { flex: 2 },
                  (isSavingMaterial || isDeletingMaterial) && styles.disabledButton,
                ]}
                onPress={handleSaveEditMaterial}
                disabled={isSavingMaterial || isDeletingMaterial}
              >
                {isSavingMaterial ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.primaryButtonText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 370) : 900, maxHeight: height * 0.9 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>
                  Create{' '}
                  {activeTab === 'Materials'
                    ? 'Material'
                    : assignmentType === 'game_based'
                    ? 'Game-Based Assignment'
                    : 'Assignment'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {activeTab === 'Materials'
                    ? 'Add a new class material with optional file attachment.'
                    : assignmentType === 'game_based'
                    ? 'Create a new game-based assignment with interactive challenges.'
                    : 'Create a new assignment with professional responsive layout.'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (isSaving) return;
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
                disabled={isSaving}
              >
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {renderCreateModalBody()}
            </ScrollView>
            <View
              style={[
                styles.floatingSaveWrap,
                isMobile && styles.floatingSaveWrapMobile,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.floatingSaveButton,
                  activeTab === 'Assignments' && Object.keys(errors).length > 0
                    ? styles.floatingSaveButtonWarn
                    : null,
                  isSaving ? styles.floatingSaveButtonDisabled : null,
                ]}
                onPress={handleCreate}
                disabled={isSaving}
                activeOpacity={isSaving ? 1 : 0.85}
              >
                {isSaving ? (
                  <>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.floatingSaveButtonText}>
                      {activeTab === 'Materials' ? 'Saving Material...' : 'Saving Assignment...'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFF" />
                    <Text style={styles.floatingSaveButtonText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          DATE TIME MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showDateTimeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateTimeModal(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.dateTimeCard,
              { width: isMobile ? Math.min(width - 28, 360) : 760 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Select Due Date & Time</Text>
                <Text style={styles.modalSubtitle}>Works in web and mobile.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDateTimeModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <View style={[styles.dateTimeLayout, !isMobile && styles.dateTimeLayoutDesktop]}>
              <View style={[styles.calendarPanel, !isMobile && styles.calendarPanelDesktop]}>
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    style={styles.calendarNavBtn}
                    onPress={() =>
                      setVisibleCalendarMonth(
                        new Date(
                          visibleCalendarMonth.getFullYear(),
                          visibleCalendarMonth.getMonth() - 1,
                          1
                        )
                      )
                    }
                  >
                    <Ionicons name="chevron-back" size={18} color="#D32F2F" />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthLabel}>{monthLabel(visibleCalendarMonth)}</Text>
                  <TouchableOpacity
                    style={styles.calendarNavBtn}
                    onPress={() =>
                      setVisibleCalendarMonth(
                        new Date(
                          visibleCalendarMonth.getFullYear(),
                          visibleCalendarMonth.getMonth() + 1,
                          1
                        )
                      )
                    }
                  >
                    <Ionicons name="chevron-forward" size={18} color="#D32F2F" />
                  </TouchableOpacity>
                </View>
                <View style={styles.weekRow}>
                  {WEEKDAY_LABELS.map((label) => (
                    <Text key={label} style={styles.weekLabel}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View style={styles.dayGrid}>
                  {calendarDays.map((item) => {
                    const active = isSameDate(item.date, draftDueDateTime);
                    const disabled = isPastDay(item.date);
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={[
                          styles.dayCell,
                          !item.inCurrentMonth && styles.dayCellOutside,
                          active && styles.dayCellActive,
                          disabled && styles.dayCellDisabled,
                        ]}
                        onPress={() => {
                          if (disabled) return;
                          selectDraftDate(item.date);
                        }}
                        disabled={disabled}
                        activeOpacity={disabled ? 1 : 0.85}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            !item.inCurrentMonth && styles.dayTextOutside,
                            active && styles.dayTextActive,
                            disabled && styles.dayTextDisabled,
                          ]}
                        >
                          {item.date.getDate()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={[styles.timePanel, !isMobile && styles.timePanelDesktop]}>
                <View style={styles.timePickerWrapRow}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeLabel}>Hour</Text>
                    <ScrollView style={styles.timeList} nestedScrollEnabled>
                      {Array.from({ length: 24 }, (_, hour) => (
                        <TouchableOpacity
                          key={`hour-${hour}`}
                          style={[
                            styles.timeOption,
                            draftDueDateTime.getHours() === hour && styles.timeOptionActive,
                          ]}
                          onPress={() => updateDraftTime('hours', hour)}
                        >
                          <Text
                            style={[
                              styles.timeOptionText,
                              draftDueDateTime.getHours() === hour && styles.timeOptionTextActive,
                            ]}
                          >
                            {pad(hour)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  <View style={styles.timeColumn}>
                    <Text style={styles.timeLabel}>Minute</Text>
                    <ScrollView style={styles.timeList} nestedScrollEnabled>
                      {Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => (
                        <TouchableOpacity
                          key={`minute-${minute}`}
                          style={[
                            styles.timeOption,
                            draftDueDateTime.getMinutes() === minute && styles.timeOptionActive,
                          ]}
                          onPress={() => updateDraftTime('minutes', minute)}
                        >
                          <Text
                            style={[
                              styles.timeOptionText,
                              draftDueDateTime.getMinutes() === minute &&
                                styles.timeOptionTextActive,
                            ]}
                          >
                            {pad(minute)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
                <View style={styles.datePreviewBox}>
                  <Text style={styles.datePreviewLabel}>Selected</Text>
                  <Text style={styles.datePreviewValue}>{formatDueDateTime(draftDueDateTime)}</Text>
                </View>
              </View>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowDateTimeModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={applyDraftDateTime}>
                <Text style={styles.primaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          GAME TYPE MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showGameTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGameTypeModal(false)}
      >
        <Pressable style={styles.modalOverlayCenter} onPress={() => setShowGameTypeModal(false)}>
          <Pressable
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 360) : 450, maxHeight: height * 0.8 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Select Game Type</Text>
                <Text style={styles.modalSubtitle}>
                  Choose the interactive format for this assignment.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowGameTypeModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {gameOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.dropdownItem,
                    gameType === opt.value && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setGameType(opt.value as any);
                    setShowGameTypeModal(false);
                    if (errors.gameType) setErrors((prev) => ({ ...prev, gameType: undefined }));
                  }}
                >
                  <Ionicons
                    name={gameType === opt.value ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={gameType === opt.value ? '#FFF' : '#D32F2F'}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.dropdownItemText,
                        gameType === opt.value && styles.dropdownItemTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {!!opt.desc && (
                      <Text
                        style={[
                          styles.dropdownItemDesc,
                          gameType === opt.value && styles.dropdownItemDescActive,
                        ]}
                      >
                        {opt.desc}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          CLASS MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showClassModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClassModal(false)}
      >
        <Pressable style={styles.modalOverlayCenter} onPress={() => setShowClassModal(false)}>
          <Pressable
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 360) : 450, maxHeight: height * 0.8 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Select Course / Class</Text>
                <Text style={styles.modalSubtitle}>Assign this game to a specific class.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {availableCourses.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.dropdownItem,
                    selectedClassId === c.id && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setSelectedClassId(c.id);
                    setShowClassModal(false);
                    if (errors.classId) setErrors((prev) => ({ ...prev, classId: undefined }));
                  }}
                >
                  <Ionicons
                    name={selectedClassId === c.id ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={selectedClassId === c.id ? '#FFF' : '#D32F2F'}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedClassId === c.id && styles.dropdownItemTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {c.courseCode} - {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          GENERATED QUESTIONS PREVIEW MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showGeneratedPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGeneratedPreview(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 380) : 700, maxHeight: height * 0.9 },
            ]}
          >
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Preview & Edit Generated Questions</Text>
                <Text style={styles.modalSubtitle}>
                  {gameType === 'memory_match'
                    ? 'Review terms and definitions for Memory Match.'
                    : gameType === 'fill_in_blanks'
                    ? 'Review sentences and missing words for Fill-in-the-Blanks.'
                    : gameType === 'flashcard'
                    ? 'Review front and back of cards for Flashcard Challenge.'
                    : 'Review and tweak the AI-generated questions before saving.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowGeneratedPreview(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {generatedQuestions.length === 0 && (
                <Text style={styles.emptyMiniText}>No questions generated yet.</Text>
              )}
              {generatedQuestions.map((q, qIndex) => renderQuestionEditor(q, qIndex))}
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: '#1976D2', marginTop: 16 }]}
                onPress={handleGenerateMoreQuestions}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                )}
                <Text style={styles.generateButtonText}>Generate 10 More Questions</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowGeneratedPreview(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  if (generatedQuestions.length === 0) {
                    showResultModal('error', 'Invalid Questions', 'You must have at least one question.');
                    return;
                  }
                  let hasInvalid = false;
                  if (gameType === 'fill_in_blanks' || gameType === 'flashcard') {
                    hasInvalid = generatedQuestions.some(
                      (q) => !q.question.trim() || !q.answer.trim()
                    );
                  } else if (gameType === 'memory_match') {
                    hasInvalid = generatedQuestions.some(
                      (q) => !q.question?.trim() || !q.answer?.trim()
                    );
                  } else {
                    hasInvalid = generatedQuestions.some(
                      (q) =>
                        q.correctIndex === undefined ||
                        q.correctIndex === -1 ||
                        !q.options[q.correctIndex]?.trim() ||
                        !q.question.trim()
                    );
                  }
                  if (hasInvalid) {
                    showResultModal(
                      'error',
                      'Invalid Questions',
                      gameType === 'memory_match'
                        ? 'Please ensure every term and definition has text.'
                        : 'Please ensure all items have text and a correct option is selected.'
                    );
                    return;
                  }
                  setShowGeneratedPreview(false);
                  showResultModal('success', 'Saved', 'Questions updated and ready to be assigned.');
                }}
              >
                <Text style={styles.primaryButtonText}>Confirm & Keep Questions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════
          RESULT MODAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={resultModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResultModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.modalCardElevated,
              { width: isMobile ? Math.min(width - 28, 330) : 360 },
            ]}
          >
            <Text
              style={[
                styles.createTitle,
                { color: resultModalType === 'success' ? '#2E7D32' : '#D32F2F' },
              ]}
            >
              {resultModalTitle}
            </Text>
            <Text style={styles.previewContent}>{resultModalMessage}</Text>
            <TouchableOpacity
              style={styles.primaryButtonWide}
              onPress={() => setResultModalVisible(false)}
            >
              <Text style={styles.uploadBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Saving overlay ── */}
      {isSaving && (
        <View style={styles.savingOverlay} pointerEvents="auto">
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color="#D32F2F" />
            <Text style={styles.savingTitle}>
              {activeTab === 'Materials' ? 'Saving Material' : 'Saving Assignment'}
            </Text>
            <Text style={styles.savingMessage}>
              Please wait while your file and details are being stored in Firebase.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default TeacherCourseDetail2;

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  screenScroll: { flex: 1, backgroundColor: '#ffffff' },
  screenScrollContent: { paddingBottom: 40 },

  // ── Course header ──
  courseHeader: {
    backgroundColor: '#D32F2F',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  courseName: { color: '#FFF', fontWeight: '900', letterSpacing: 0.2 },
  headerInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    padding: 14,
  },
  headerInfoRow: { marginBottom: 12 },
  headerInfoLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerInfoValue: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  headerDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  headerDetailsGridDesktop: { flexWrap: 'nowrap', alignItems: 'stretch' },
  headerDetailItemDesktop: { flexBasis: 0, flexGrow: 1, minWidth: 0 },
  academicInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: '100%',
  },
  academicInfoTextWrap: { flex: 1 },
  academicInfoLabel: {
    color: '#8A8A8A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  academicInfoValue: { color: '#202124', fontSize: 12, fontWeight: '800', marginTop: 2 },
  classCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: '100%',
  },
  classCodeTextWrap: { flex: 1 },
  classCodeLabel: { color: '#8A8A8A', fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  classCodeValue: { color: '#202124', fontSize: 13, fontWeight: '900', marginTop: 2 },
  copyCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF4F4',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  copyCodeText: { color: '#D32F2F', fontWeight: '900', fontSize: 12 },
  exportGradesButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F7A3A',
    paddingHorizontal: 12,
    minWidth: 42,
    height: 42,
    borderRadius: 10,
    borderBottomWidth: 3,
    borderBottomColor: '#145A2A',
  },
  exportGradesButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.25,
    textTransform: 'uppercase',
  },

  // ── Tabs ──
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#D32F2F' },
  tabText: { color: '#888', fontWeight: '700' },
  tabTextActive: { color: '#D32F2F' },

  // ── Fullscreen viewer ──
  viewerModal: { flex: 1, backgroundColor: '#1e1e1e' },
  viewerTopBar: {
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
  viewerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  viewerTitleBlock: { flex: 1, gap: 3 },
  viewerTitle: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  viewerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  viewerTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  viewerTypeText: {
    color: '#D32F2F',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewerPdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  viewerPdfBadgeText: { color: '#1565C0', fontSize: 10, fontWeight: '800' },
  viewerWeekBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  viewerWeekText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  viewerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  viewerExternalPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
    backgroundColor: '#FFF',
  },
  viewerExternalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  viewerExternalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  viewerExternalButton: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  viewerExternalButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  viewerTextContent: {
    padding: 24,
    backgroundColor: '#FFF',
    minHeight: '100%',
  },
  viewerTextTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },
  viewerTextMeta: {
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '700',
    marginBottom: 16,
  },
  viewerTextBody: {
    fontSize: 15,
    color: '#333',
    lineHeight: 26,
  },

  // ── Edit material modal ──
  editMaterialActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  deleteMaterialBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFF',
  },
  deleteMaterialBtnText: {
    color: '#D32F2F',
    fontWeight: '800',
    fontSize: 13,
  },
  currentFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#F1D0D0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  currentFileLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '700',
    marginBottom: 2,
  },
  currentFileName: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },

  // ── Modals ──
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
    maxHeight: '90%',
  },
  dateTimeCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, maxHeight: '92%' },
  modalScrollContent: { paddingBottom: 100 },
  createHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalHeaderTextWrap: { flex: 1, paddingRight: 12 },
  createTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  modalSubtitle: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 4 },
  modalBottomActions: { flexDirection: 'row', gap: 10, marginTop: 14 },

  // ── Form ──
  formGrid: { gap: 16 },
  formGridDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  formColumnLeft: {},
  formColumnLeftDesktop: { width: '58%' },
  formColumnRight: {},
  formColumnRightDesktop: { width: '40%' },
  fullWidthSection: { width: '100%' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
    marginTop: 10,
  },
  helperText: { fontSize: 12, color: '#777', marginBottom: 8, lineHeight: 18 },
  emptyMiniText: { fontSize: 12, color: '#999', marginBottom: 6 },
  errorText: { color: '#D32F2F', fontSize: 12, fontWeight: '600', marginTop: -2, marginBottom: 6 },
  errorBorder: { borderColor: '#D32F2F', borderWidth: 1.5 },
  errorContainer: { borderWidth: 1.5, borderColor: '#D32F2F', borderRadius: 14, padding: 8 },
  inputBox: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    marginBottom: 8,
    fontSize: 14,
    color: '#111',
  },
  textAreaBox: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    marginBottom: 8,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111',
  },
  scoreStackDesktop: { gap: 2 },
  scoreFieldFull: { width: '100%' },
  dateButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dateButtonText: { color: '#222', fontWeight: '600', flex: 1 },
  sectionBlock: { marginTop: 0 },
  materialSelectorWrap: { gap: 8, marginTop: 4 },
  materialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F0B9B9',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  materialChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  materialChipText: { color: '#D32F2F', fontWeight: '700', flex: 1 },
  materialChipTextActive: { color: '#FFF' },
  primaryButtonWide: {
    backgroundColor: '#D32F2F',
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  uploadBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  filePreviewBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1D0D0',
    backgroundColor: '#FFF8F8',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filePreviewText: { flex: 1, color: '#333', fontWeight: '600' },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  checkboxLabel: { color: '#333', fontWeight: '600' },
  checkboxBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxBoxChecked: { backgroundColor: '#D32F2F' },

  // ── Buttons ──
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFF', fontWeight: '800' },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D32F2F',
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  secondaryButtonText: { color: '#D32F2F', fontWeight: '800' },
  floatingSaveWrap: { position: 'absolute', right: 18, left: 18, bottom: 18 },
  floatingSaveWrapMobile: { right: 18, left: 18, bottom: 18 },
  floatingSaveButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    minHeight: 48,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingSaveButtonWarn: { backgroundColor: '#C62828' },
  floatingSaveButtonDisabled: { opacity: 0.72 },
  floatingSaveButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  disabledButton: { opacity: 0.65 },
  disabledInput: { opacity: 0.65, backgroundColor: '#F8F8F8' },

  // ── Saving overlay ──
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    zIndex: 9999,
    elevation: 9999,
  },
  savingCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  savingTitle: {
    marginTop: 12,
    fontSize: 17,
    fontWeight: '900',
    color: '#111',
    textAlign: 'center',
  },
  savingMessage: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#666',
    textAlign: 'center',
  },

  // ── Preview ──
  previewContent: { fontSize: 14, color: '#444', lineHeight: 22, marginTop: 10 },

  // ── Calendar / DateTime ──
  dateTimeLayout: { gap: 16 },
  dateTimeLayoutDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  calendarPanel: {},
  calendarPanelDesktop: { flex: 1.05 },
  timePanel: {},
  timePanelDesktop: { flex: 0.95 },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthLabel: { fontSize: 16, fontWeight: '800', color: '#111' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginBottom: 6,
  },
  dayCellOutside: { opacity: 0.35 },
  dayCellActive: { backgroundColor: '#D32F2F' },
  dayCellDisabled: { backgroundColor: '#F5F5F5', opacity: 0.45 },
  dayText: { color: '#222', fontWeight: '600' },
  dayTextOutside: { color: '#888' },
  dayTextActive: { color: '#FFF', fontWeight: '800' },
  dayTextDisabled: { color: '#B0B0B0' },
  timePickerWrapRow: { flexDirection: 'row', gap: 12 },
  timeColumn: { flex: 1 },
  timeLabel: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 8 },
  timeList: {
    maxHeight: 260,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  timeOption: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  timeOptionActive: { backgroundColor: '#D32F2F' },
  timeOptionText: { color: '#222', fontWeight: '600' },
  timeOptionTextActive: { color: '#FFF', fontWeight: '800' },
  datePreviewBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F1D0D0',
    backgroundColor: '#FFF8F8',
    borderRadius: 12,
    padding: 12,
  },
  datePreviewLabel: { fontSize: 12, fontWeight: '700', color: '#777', marginBottom: 4 },
  datePreviewValue: { fontSize: 14, fontWeight: '800', color: '#D32F2F' },

  // ── Assignment type / game chips ──
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0B9B9',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  typeChipText: { color: '#D32F2F', fontWeight: '700', fontSize: 14 },
  typeChipTextActive: { color: '#FFF' },
  gameAndClassRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  gameAndClassRowMobile: { flexDirection: 'column', gap: 12 },
  dropdownWrap: { flex: 1 },
  dropdownWrapHalf: { flexBasis: '48%' },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  dropdownText: { color: '#111', fontWeight: '600', fontSize: 14, flex: 1, marginRight: 8 },
  dropdownPlaceholder: { color: '#999' },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemActive: { backgroundColor: '#D32F2F', borderBottomColor: '#C62828' },
  dropdownItemText: { color: '#111', fontWeight: '700', fontSize: 14, flex: 1 },
  dropdownItemTextActive: { color: '#FFF' },
  dropdownItemDesc: { color: '#888', fontSize: 11, marginTop: 2, lineHeight: 15 },
  dropdownItemDescActive: { color: '#FFE0E0' },
  attemptChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0B9B9',
    backgroundColor: '#FFF5F5',
  },
  attemptChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  attemptChipText: { color: '#D32F2F', fontWeight: '700', fontSize: 13 },
  attemptChipTextActive: { color: '#FFF' },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F0B9B9',
    backgroundColor: '#FFF5F5',
  },
  timeChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  timeChipText: { color: '#D32F2F', fontWeight: '700', fontSize: 13 },
  timeChipTextActive: { color: '#FFF' },
  generatedQuestionBlock: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  generateButton: {
    backgroundColor: '#4CAF50',
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  generateButtonText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  correctnessDropdown: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 90,
    justifyContent: 'center',
  },
});