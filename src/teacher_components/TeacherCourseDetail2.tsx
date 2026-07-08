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
// ─── Types ─────────────────────────────────────────────────────────────────
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
  linkUrls?: string[]; 
  storagePath?: string | null;   // ✅ add
  bucketPath?: string | null;  
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
// ─── Helpers ─────────────────────────────────────────────────────────────────
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
const formatSyllabusDate = (value: any): string => {
  if (!value) return 'Recently';
  // If it's already a valid date string
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
  }
  // If it's a Firebase Timestamp object (Client SDK)
  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleDateString();
  }
  // If it's a Firebase Timestamp object (Raw JSON from REST API)
  if (value?._seconds) {
    return new Date(value._seconds * 1000).toLocaleDateString();
  }
  // If it's a plain object with seconds (common in some serializations)
  if (value?.seconds) {
    // Check if it's milliseconds (large number) or seconds (smaller number)
    // Firebase seconds are usually ~10 digits. Milliseconds are ~13 digits.
    const multiplier = value.seconds > 10000000000 ? 1 : 1000;
    return new Date(value.seconds * multiplier).toLocaleDateString();
  }
  // If it's a Unix timestamp in milliseconds (number)
  if (typeof value === 'number') {
    return new Date(value).toLocaleDateString();
  }
  return 'Recently';
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
// ─── Game Question Generation Limits (per teacher, across ALL classes) ─────
const DAILY_GENERATION_LIMIT = 30;       // generations/day
const MAX_QUESTIONS_PER_GENERATION = 45; // questions per generation

const GENERATION_USAGE_KEY = 'teacher_question_gen_usage_v1';
const getTodayDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Shape: { [teacherIdentity]: { date: 'YYYY-MM-DD', count: number } }
type GenerationUsageMap = Record<string, { date: string; count: number }>;

const readGenerationUsage = async (): Promise<GenerationUsageMap> => {
  try {
    if (Platform.OS === 'web') {
      const raw =
        typeof window !== 'undefined'
          ? window.localStorage?.getItem(GENERATION_USAGE_KEY)
          : null;
      return raw ? JSON.parse(raw) : {};
    }
    const path = `${FileSystem.documentDirectory}${GENERATION_USAGE_KEY}.json`;
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(path);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeGenerationUsage = async (data: GenerationUsageMap) => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage?.setItem(GENERATION_USAGE_KEY, JSON.stringify(data));
      }
      return;
    }
    const path = `${FileSystem.documentDirectory}${GENERATION_USAGE_KEY}.json`;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to persist question generation usage', e);
  }
};

// Returns today's count for this teacher, auto-resetting if stored date != today.
// Keyed by teacherIdentity ONLY (not classId), so the cap is shared across
// every class/course the teacher generates game questions for.
const getTodayUsageForTeacher = async (
  teacherKey: string
): Promise<{ usageMap: GenerationUsageMap; count: number }> => {
  const usageMap = await readGenerationUsage();
  const todayKey = getTodayDateKey();
  const entry = usageMap[teacherKey];
  const count = entry && entry.date === todayKey ? entry.count : 0;
  return { usageMap, count };
};
const mapMaterial = (item: any): Material => {
  const fileName = item.fileName || undefined;
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
    fileType,
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
  linkUrls: Array.isArray(item.linkUrls)
    ? item.linkUrls
    : item.linkUrl
      ? [item.linkUrl] // fallback for legacy single-link field
      : [],
       storagePath: item.storagePath || null,   // ✅ add
  bucketPath: item.bucketPath || null, 
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
  return getGoogleDocsViewerUrl(fileUrl);
}
const renderFormattedText = (text: string, baseStyle: any) => {
  if (!text) return null;
  const lines = text.split("\n");
  const justifiedBaseStyle = [
    baseStyle,
    {
      textAlign: "justify",
      lineHeight: 34,
      letterSpacing: 0.3,
      fontSize: 14,
    },
  ];
  return lines.map((line, lineIndex) => {
    const trimmedLine = line.trim();
    // Empty line spacing
    if (!trimmedLine) {
      return <View key={lineIndex} style={{ height: 8 }} />;
    }
    // Detect bullets
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
    // Count markdown bold markers
    const boldMarkers = contentToParse.match(/\*\*/g) || [];
    const boldCount = boldMarkers.length;
    // Detect malformed markdown
    const hasInvalidBold =
      boldCount % 2 !== 0 ||
      /^\*+\s*\*/.test(contentToParse) ||
      /\*\*\*$/.test(contentToParse);
    // Fallback: render as plain text
    if (hasInvalidBold) {
      const cleanedText = contentToParse.replace(/\*/g, "");
      return (
        <View
          key={lineIndex}
          style={{
            flexDirection: "row",
            marginBottom: 6,
          }}
        >
          {isBullet && (
            <Text
              style={[
                justifiedBaseStyle,
                {
                  marginRight: 10,
                  fontWeight: "bold",
                },
              ]}
            >
              •
            </Text>
          )}
          <Text style={justifiedBaseStyle}>
            {cleanedText}
          </Text>
        </View>
      );
    }
    // Parse valid **bold**
    const boldRegex = /(\*\*[^*]+\*\*)/g;
    const parts = contentToParse.split(boldRegex);
    return (
      <View
        key={lineIndex}
        style={{
          flexDirection: "row",
          marginBottom: 6,
        }}
      >
        {isBullet && (
          <Text
            style={[
              justifiedBaseStyle,
              {
                marginRight: 10,
                fontWeight: "bold",
              },
            ]}
          >
            •
          </Text>
        )}
        <Text style={{ flex: 1 }}>
          {parts.map((part, partIndex) => {
            const isBold =
              part.startsWith("**") &&
              part.endsWith("**") &&
              part.length > 4;
            return (
              <Text
                key={`${lineIndex}-${partIndex}`}
                style={[
                  justifiedBaseStyle,
                  isBold && {
                    fontWeight: "bold",
                  },
                ]}
              >
                {isBold ? part.slice(2, -2) : part}
              </Text>
            );
          })}
        </Text>
      </View>
    );
  });
};
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

  const [numberOfQuestions, setNumberOfQuestions] = useState<string>('10');
  const [isEditingLesson, setIsEditingLesson] = useState(false);
  // ✅ Daily generation usage for THIS teacher, shared across all classes/courses
  const [dailyGenerationsUsed, setDailyGenerationsUsed] = useState<number>(0);

  const [showDeleteLessonModal, setShowDeleteLessonModal] = useState(false);
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  // Helper validation matching Game.tsx logic
  const parsedQuestionCount = parseInt(numberOfQuestions, 10) || 0;
  const isInvalidQuestionCount =
    parsedQuestionCount > MAX_QUESTIONS_PER_GENERATION || parsedQuestionCount < 1;
  // Add these states near other 'Generate' states
  const [pendingGeneratedLessons, setPendingGeneratedLessons] = useState<any[]>([]);
  const [showLessonPreviewModal, setShowLessonPreviewModal] = useState(false);
  const [editingPreviewIndex, setEditingPreviewIndex] = useState<number | null>(null);
  const [isSavingGeneratedLessons, setIsSavingGeneratedLessons] = useState(false);
  // ── Generate Next Lesson Modal State ────────────────────────────────
  const [showNextLessonModal, setShowNextLessonModal] = useState(false);
  const [selectedTopicsForGen, setSelectedTopicsForGen] = useState<string[]>([]);
  const [isGeneratingNextLessons, setIsGeneratingNextLessons] = useState(false);
  const [targetModuleForGen, setTargetModuleForGen] = useState<any>(null);
  // ── Tab / display state
  const [activeTab, setActiveTab] = useState<"materials" | "assignments" | "modules">('modules');
  const [showSubmissions, setShowSubmissions] = useState(false);
  const cleanModuleTitle = (title: string, moduleNumber: number) => {
    // Remove common prefixes the AI might add
    let cleaned = title.replace(/^Module\s+\d+[:.\s]*/i, '').trim();
    // If empty after cleaning, fallback to a generic title
    return cleaned || `Module ${moduleNumber}`;
  };
  // ── Data
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  // Add these states inside the component
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedGenModule, setSelectedGenModule] = useState<any>(null);
  const [selectedGenTopic, setSelectedGenTopic] = useState<any>(null);
  const [selectedGenSubtopic, setSelectedGenSubtopic] = useState<string | null>(null);
  // Checkboxes state
  const [genDiscussion, setGenDiscussion] = useState(true);
  const [genActivity, setGenActivity] = useState(true);
  const [genSummary, setGenSummary] = useState(true);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  // ── Module AI Tools State
  const [modules, setModules] = useState<any[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [aiPreviewData, setAiPreviewData] = useState<any>(null);
  const [aiPreviewType, setAiPreviewType] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingType, setAiLoadingType] = useState<string>('');
  // ── Syllabus Upload State
  const [currentSyllabus, setCurrentSyllabus] = useState<any>(null);
  const [isUploadingSyllabus, setIsUploadingSyllabus] = useState(false);
  const [syllabusViewerUrl, setSyllabusViewerUrl] = useState<string | null>(null);
  // ✅ NEW: State for pending syllabus file before confirmation
  const [pendingSyllabusFile, setPendingSyllabusFile] = useState<{
    name?: string;
    uri?: string;
    mimeType?: string;
    size?: number;
    base64?: string;
    file?: File;
  } | null>(null);
  // ── Course Structure Generation State
  const [generatedStructure, setGeneratedStructure] = useState<any>(null);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [showStructurePreviewModal, setShowStructurePreviewModal] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});
  // ── Lesson Detail View State (NEW)
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [lessonDetailModalVisible, setLessonDetailModalVisible] = useState(false);
  // ── Manual Creation Modals State
  const [showManualModuleModal, setShowManualModuleModal] = useState(false);
  const [showManualLessonModal, setShowManualLessonModal] = useState(false);
  const [selectedModuleForLesson, setSelectedModuleForLesson] = useState<any>(null);
  // Manual Module Form State
  const [newModuleNum, setNewModuleNum] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleWeek, setNewModuleWeek] = useState('');
  // Manual Lesson Form State
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDesc, setNewLessonDesc] = useState('');
  const [newLessonDiscussion, setNewLessonDiscussion] = useState('');
  const [newLessonActivity, setNewLessonActivity] = useState('');
  const [newLessonFile, setNewLessonFile] = useState<PickedUploadFile>(null);
  const [lessonMode, setLessonMode] = useState<'text' | 'file'>('text');
  // ── Material viewer state
  const [viewerMaterial, setViewerMaterial] = useState<Material | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  // ── Edit material state
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
  const [resultModalType, setResultModalType] = useState<'success' | 'error' | 'info'>('success');
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
  const showResultModal = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setResultModalType(type);
    setResultModalTitle(title);
    setResultModalMessage(message);
    setResultModalVisible(true);
  };
  const mapModule = (item: any): any => {
    return {
      ...item,
      moduleNumber: Number(item.moduleNumber) || 0, // ✅ ENSURE NUMBER TYPE
      lessons: Array.isArray(item.lessons) ? item.lessons : []
    };
  };
  const handleDeleteLesson = async () => {
  if (!selectedLesson?.id || !course?.id) return;
  
  setIsDeletingLesson(true);
  try {
    const response = await fetch(`${API_BASE_URL}/course-lessons/${selectedLesson.id}`, {
      credentials: 'include',
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to delete lesson');
    }
    
    setLessonDetailModalVisible(false);
    setShowDeleteLessonModal(false);
    await loadCourseContent(); // Refresh modules list
    showResultModal('success', 'Deleted', 'Lesson deleted successfully.');
  } catch (error: any) {
    showResultModal('error', 'Delete Failed', error?.message || 'Unable to delete lesson.');
  } finally {
    setIsDeletingLesson(false);
  }
};
  // ─── UPDATE loadCourseContent ────────────────────────────────────────────────
  const loadCourseContent = async () => {
    if (!course?.id) {
      setAssignments([]);
      setMaterials([]);
      setMembers([]);
      setSubmissions([]);
      setModules([]);
      setCurrentSyllabus(null);
      setGeneratedStructure(null);
      return;
    }
    setIsLoadingModules(true); // ✅ START LOADING
    try {
      const [modulesRes, syllabusRes, materialsRes, assignmentsRes, membersRes, submissionsRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/course-modules/${course.id}`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/course-syllabus/${course.id}`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/class-materials/${course.id}`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/class-assignments/${course.id}`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/class-members/${course.id}`, { credentials: 'include' }),
          fetch(`${API_BASE_URL}/class-submissions/${course.id}`, { credentials: 'include' }),
        ]);
      const [modulesData, syllabusData, materialsData, assignmentsData, membersData, submissionsData] =
        await Promise.all([
          modulesRes.json(),
          syllabusRes.json(),
          materialsRes.json(),
          assignmentsRes.json(),
          membersRes.json(),
          submissionsRes.json(),
        ]);
      // ✅ ENSURE MODULES ARE MAPPED WITH CORRECT TYPES
      setModules(
        modulesRes.ok && Array.isArray(modulesData)
          ? modulesData.map(mapModule)
          : []
      );
      setCurrentSyllabus(syllabusRes.ok ? syllabusData : null);
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
      setModules([]);
      setCurrentSyllabus(null);
    } finally {
    setIsLoadingModules(false); // ✅ STOP LOADING
  }
  };
  useEffect(() => {
    loadCourseContent();
  }, [course?.id]);
  // ✅ Load today's cross-class generation usage for this teacher on mount / identity change
  useEffect(() => {
    (async () => {
      const { count } = await getTodayUsageForTeacher(teacherIdentity);
      setDailyGenerationsUsed(count);
    })();
  }, [teacherIdentity]);
  const handleGenerateLessonContent = async () => {
    if (!selectedGenModule || !selectedGenTopic) {
      showResultModal('error', 'Error', 'Please select a Module and Topic.');
      return;
    }
    if (!genDiscussion && !genActivity && !genSummary) {
      showResultModal('error', 'Error', 'Please select at least one content type to generate.');
      return;
    }
    setIsGeneratingContent(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/generate-lesson-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classId: course?.id,
          moduleId: selectedGenModule.moduleNumber || selectedGenModule.id, // Use ID if available, else number
          topicTitle: selectedGenTopic.title,
          subtopicTitle: selectedGenSubtopic,
          generateDiscussion: genDiscussion,
          generateActivity: genActivity,
          generateSummary: genSummary
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      showResultModal('success', 'Generated!', 'Lesson content generated successfully.');
      setShowGenerateModal(false);
      // Reset selections
      setSelectedGenModule(null);
      setSelectedGenTopic(null);
      setSelectedGenSubtopic(null);
    } catch (error: any) {
      showResultModal('error', 'Generation Failed', error?.message || 'Failed to generate content.');
    } finally {
      setIsGeneratingContent(false);
    }
  };
  const saveModuleLessonsToBackend = async (moduleId: string, lessons: any[]) => {
    try {
      // We use the existing save endpoint. It merges the moduleData.
      // By passing the updated lessons array, we persist them.
      const response = await fetch(`${API_BASE_URL}/course-modules/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          moduleData: {
            id: moduleId,
            courseId: course?.id,
            lessons: lessons // This overwrites/updates the lessons in DB
          }
        })
      });
      if (!response.ok) {
        console.error('Failed to save generated lessons to backend');
      }
    } catch (error) {
      console.error('Error saving lessons:', error);
    }
  };
  // ─── UPDATED: Lesson Detail Handler ──────────────────────────────────────────
  // ─── UPDATED: Lesson Detail Handler with Fresh URL Fetching ──────────────────
const handleOpenLessonDetail = async (lesson: any) => {
  // 1. Set loading state and show the modal immediately
  setSelectedLesson(lesson);
  setLessonDetailModalVisible(true);
  setIsLessonLoading(true);

  try {
    // 2. Fetch full details from backend to get fresh signed URLs
    const response = await fetch(`${API_BASE_URL}/course-lessons/${lesson.id}`, {
      credentials: 'include'
    });

    if (response.ok) {
      const result = await response.json();
      
      // ✅ FIX: Check if the fetched data has a valid fileUrl
      // If the backend returns a fresh signed URL, use it. 
      // If not, fallback to the local lesson object's url (if any).
      const freshData = result.data;
      
      // Update state with full data including fresh URL
      setSelectedLesson({
        ...freshData,
        // Ensure fileUrl is present even if backend didn't return it explicitly
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
  const handleOpenNextLessonModal = (savedModule: any) => {
  // ✅ STRICT VALIDATION: Match ONLY by Module Title from Syllabus Structure
  const syllabusMod = currentSyllabus?.structure?.modules?.find(
    (m: any) => 
      // Compare titles case-insensitively and trimmed to avoid whitespace issues
      String(m.moduleTitle || m.title).trim().toLowerCase() === 
      String(savedModule.title).trim().toLowerCase()
  );

  let availableTopics: any[] = [];

  // Only populate topics if we found an EXACT title match in the Syllabus
  if (syllabusMod && syllabusMod.topics) {
    // Get existing lesson titles for this specific module to avoid duplicates
    const existingLessonTitles = new Set(
      (savedModule.lessons || []).map((l: any) => l.title.toLowerCase().trim())
    );

    // Filter out topics that are already generated as lessons
    availableTopics = syllabusMod.topics.filter(
      (topic: any) => !existingLessonTitles.has(topic.title.toLowerCase().trim())
    );
  } 
  // ELSE: If syllabusMod is undefined (Manual Module with different title) 
  // OR has no topics, availableTopics remains an empty array []

  setTargetModuleForGen({
    ...savedModule,
    topics: availableTopics // Pass empty array for manual modules
  });
  
  setSelectedTopicsForGen([]);
  setShowNextLessonModal(true);
};
  const toggleTopicSelection = (topicTitle: string) => {
    setSelectedTopicsForGen(prev =>
      prev.includes(topicTitle)
        ? prev.filter(t => t !== topicTitle)
        : [...prev, topicTitle]
    );
  };
  const handleGenerateNextLessons = async () => {
    if (!targetModuleForGen || selectedTopicsForGen.length === 0 || !course?.id) {
      showResultModal('error', 'Error', 'Please select at least one topic.');
      return;
    }
    setIsGeneratingNextLessons(true);
    try {
      const response = await fetch(`${API_BASE_URL}/course-syllabus/generate-next-lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classId: course.id,
          moduleNumber: targetModuleForGen.moduleNumber,
          topicTitles: selectedTopicsForGen
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      // ✅ UPDATED: Store lessons AND open directly in Edit Mode for the first lesson
      if (data.data && data.data.lessons && data.data.lessons.length > 0) {
        setPendingGeneratedLessons(data.data.lessons);
        setEditingPreviewIndex(0); // 👈 Opens the first lesson in Edit Mode immediately
        setShowLessonPreviewModal(true);
        showResultModal('success', 'Generated!', 'Review and edit the content before saving.');
      } else {
        showResultModal('info', 'No New Content', 'No new lessons were generated or they already exist.');
      }
      setShowNextLessonModal(false);
    } catch (error: any) {
      showResultModal('error', 'Generation Failed', error?.message || 'Unable to generate lessons.');
    } finally {
      setIsGeneratingNextLessons(false);
    }
  };
 const handleSavePreviewedLessons = async () => {
  if (!targetModuleForGen || pendingGeneratedLessons.length === 0) return;
  
  setIsSavingGeneratedLessons(true);
  
  try {
    // ✅ STEP 1: Fetch TRUE current max lesson number from backend
    // This ensures we don't overwrite or duplicate numbers if manual lessons were added recently
    // or if "Generate Module" previously saved lessons.
    let currentMax = 0;
    try {
      const modulesRes = await fetch(`${API_BASE_URL}/course-modules/${course?.id}`, {
        credentials: 'include'
      });
      
      if (modulesRes.ok) {
        const allModules = await modulesRes.json();
        // Find the specific module we are adding lessons to
        const targetMod = allModules.find((m: any) => m.id === targetModuleForGen.id);
        
        if (targetMod && Array.isArray(targetMod.lessons)) {
          currentMax = targetMod.lessons.reduce((max: number, l: any) => 
            Math.max(max, Number(l.lessonNumber) || 0), 0
          );
        }
      }
    } catch (e) {
      console.warn("Failed to sync max lesson number for AI save, using local state");
      // Fallback to local state if network fails, but prefer DB truth
      currentMax = (targetModuleForGen.lessons || []).reduce((max: number, l: any) => 
        Math.max(max, Number(l.lessonNumber) || 0), 0
      );
    }

    // ✅ STEP 2: Save each lesson with calculated sequential numbers
    const promises = pendingGeneratedLessons.map(async (lesson, idx) => {
      const payload = {
        classId: course?.id,
        moduleId: targetModuleForGen.id,
        title: lesson.title,
        description: lesson.description,
        discussion: lesson.discussion,
        activity: lesson.activity,
        // ✅ CRITICAL: Use fetched max + index offset
        lessonNumber: currentMax + idx + 1
      };

      const res = await fetch(`${API_BASE_URL}/course-lessons/create-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to save lesson: ${lesson.title}`);
      }
      return res.json();
    });

    await Promise.all(promises);
    
    // ✅ STEP 3: Refresh UI immediately to reflect new lesson numbers
    await loadCourseContent(); 
    
    setShowLessonPreviewModal(false);
    setPendingGeneratedLessons([]);
    
    showResultModal('success', 'Saved!', `${pendingGeneratedLessons.length} lesson(s) saved successfully.`);

  } catch (error: any) {
    showResultModal('error', 'Save Failed', error?.message || 'Failed to save some lessons.');
  } finally {
    setIsSavingGeneratedLessons(false);
  }
};
    // ─── UPDATE handleCreateManualModule ─────────────────────────────────────────
  const handleCreateManualModule = async () => {
  // 1. Basic Validation
  const num = Number(newModuleNum);
  
  if (!newModuleTitle.trim() || !course?.id) {
    showResultModal('error', 'Error', 'Please enter a title.');
    return;
  }

  // ✅ Simple check: Ensure the auto-generated number is valid (should always be true)
  if (isNaN(num) || num < 1) {
    showResultModal('error', 'Invalid Number', 'Module number generation failed.');
    return;
  }

  setIsSaving(true);
  try {
    const response = await fetch(`${API_BASE_URL}/course-modules/create-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        classId: course.id,
        moduleNumber: num,
        title: newModuleTitle,
        description: newModuleDesc,
        weeklySchedule: newModuleWeek,
        type: "manual"
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create module.');

    // Success: Reset Form
    setShowManualModuleModal(false);
    setNewModuleNum('');
    setNewModuleTitle('');
    setNewModuleDesc('');
    setNewModuleWeek('');
    
    // ✅ RELOAD CONTENT to sync state
    await loadCourseContent();
    showResultModal('success', 'Success', `Module ${num} created successfully!`);

  } catch (e: any) {
    console.error("Create Manual Module Error:", e);
    showResultModal('error', 'Error', e.message);
  } finally {
    setIsSaving(false);
  }
};
const handleCreateManualLesson = async () => {
  // 1. Validation
  if (!newLessonTitle.trim() || !selectedModuleForLesson?.id || !course?.id) {
    showResultModal('error', 'Error', 'Please enter a title and select a module.');
    return;
  }

  setIsSaving(true);

  try {
    // Prepare Payload
    const payload: any = {
      classId: course.id,
      moduleId: selectedModuleForLesson.id,
      title: newLessonTitle.trim(),
      description: newLessonDesc.trim(),
      type: lessonMode, // 'text' or 'manual_file'
    };

    if (lessonMode === 'text') {
      payload.discussion = newLessonDiscussion.trim();
      payload.activity = newLessonActivity.trim();
    } else if (lessonMode === 'file' && newLessonFile) {
      payload.fileBase64 = newLessonFile.base64;
      payload.fileName = newLessonFile.name;
      payload.fileType = newLessonFile.type;
    }

    let response;
    let data;

    // ✅ CHECK IF EDITING OR CREATING
    if (isEditingLesson && selectedLesson?.id) {
      // --- UPDATE EXISTING LESSON ---
      response = await fetch(`${API_BASE_URL}/course-lessons/${selectedLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      
      data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update lesson');
      
      showResultModal('success', 'Updated', 'Lesson updated successfully.');
    } else {
      // --- CREATE NEW LESSON ---
      response = await fetch(`${API_BASE_URL}/course-lessons/create-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create lesson');
      
      showResultModal('success', 'Success', 'Lesson created successfully.');
    }

    // Cleanup
    setShowManualLessonModal(false);
    resetLessonForm();
    setIsEditingLesson(false); // Reset edit mode
    await loadCourseContent(); // Refresh UI

  } catch (e: any) {
    console.error(e);
    showResultModal('error', 'Error', e.message || 'An unexpected error occurred.');
  } finally {
    setIsSaving(false);
  }
};
  const resetLessonForm = () => {
  setNewLessonTitle('');
  setNewLessonDesc('');
  setNewLessonDiscussion('');
  setNewLessonActivity('');
  setNewLessonFile(null);
  setLessonMode('text');
  setIsEditingLesson(false); // ✅ Reset edit mode here too
};
  // ─── Module AI Tool Handlers ──────────────────────────────────────────────
  const handleAiTool = async (tool: string, module: any, extraParams?: any) => {
    setIsAiLoading(true);
    setAiLoadingType(tool);
    try {
      const response = await fetch(`${API_BASE_URL}/ai/module-tools/${tool}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ courseId: course?.id, moduleData: module, ...extraParams })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI generation failed');
      setAiPreviewData(data.data);
      setAiPreviewType(tool);
      setSelectedModule(module);
    } catch (error: any) {
      showResultModal('error', 'AI Error', error?.message || 'Failed to generate AI content.');
    } finally {
      setIsAiLoading(false);
      setAiLoadingType('');
    }
  };
  const handleSaveAiPreview = async () => {
    if (!selectedModule || !aiPreviewData) return;
    let updatedModule = { ...selectedModule };
    if (aiPreviewType === 'regenerate') updatedModule = { ...updatedModule, ...aiPreviewData };
    else if (aiPreviewType === 'generate-lessons') updatedModule.lessons = [...(updatedModule.lessons || []), ...(aiPreviewData.lessons || [])];
    else if (aiPreviewType === 'improve-outcomes') updatedModule.learningOutcomes = aiPreviewData.learningOutcomes;
    else if (aiPreviewType === 'generate-blooms') updatedModule.bloomsObjectives = aiPreviewData.bloomsObjectives;
    else if (aiPreviewType === 'generate-summary') updatedModule.summary = aiPreviewData.summary;
    try {
      const response = await fetch(`${API_BASE_URL}/course-modules/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ moduleData: { ...updatedModule, courseId: course?.id } })
      });
      if (!response.ok) throw new Error('Failed to save');
      const modulesRes = await fetch(`${API_BASE_URL}/course-modules/${course?.id}`, { credentials: 'include' });
      setModules(await modulesRes.json());
      setAiPreviewData(null); setAiPreviewType(''); setSelectedModule(null);
      showResultModal('success', 'Saved', 'Module updated successfully.');
    } catch (error: any) {
      showResultModal('error', 'Save Failed', error?.message || 'Failed to save module.');
    }
  };
  // ─── UPDATE handleUploadSyllabus (Split into Pick and Confirm) ─────────────────────────────────────────────
  // This function now only picks the file and shows the confirmation modal
  const handlePickSyllabus = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain', 'text/csv', 'image/png', 'image/jpeg', 'image/webp'
        ],
        copyToCacheDirectory: true,
        base64: Platform.OS === 'web',
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      // Validate file size (20MB limit)
      if (asset.size && asset.size > 20 * 1024 * 1024) {
        showResultModal('error', 'File Too Large', 'File exceeds maximum size of 20 MB.');
        return;
      }
      // Validate extension
      const ext = asset.name?.split('.').pop()?.toLowerCase();
      const allowedExts = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'png', 'jpg', 'jpeg', 'webp'];
      if (!ext || !allowedExts.includes(ext)) {
        showResultModal('error', 'Unsupported File', 'Please upload a supported file type (PDF, DOCX, PPTX, etc.).');
        return;
      }
      // Store file details in state to show in modal
      setPendingSyllabusFile({
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        size: asset.size,
        base64: (asset as any).base64,
        file: (asset as any).file,
      });
    } catch (error: any) {
      console.error('Syllabus pick error:', error);
      showResultModal('error', 'Error', 'Failed to pick file.');
    }
  };
  // ✅ NEW: This function performs the actual upload after confirmation
  const confirmAndUploadSyllabus = async () => {
    if (!pendingSyllabusFile || !course?.id) return;
    setIsUploadingSyllabus(true);
    setPendingSyllabusFile(null); // Clear pending file
    try {
      // Convert file to Base64
      let fileBase64 = '';
      if (Platform.OS === 'web') {
        if (pendingSyllabusFile.base64) {
          fileBase64 = pendingSyllabusFile.base64;
        } else if (pendingSyllabusFile.file) {
          fileBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = reader.result;
              if (typeof res === 'string') resolve(res.includes(',') ? res.split(',')[1] : res);
              else reject(new Error('Failed to read file.'));
            };
            reader.onerror = () => reject(new Error('Failed to read file.'));
            reader.readAsDataURL(pendingSyllabusFile.file as File);
          });
        }
      } else if (pendingSyllabusFile.uri) {
        fileBase64 = await FileSystem.readAsStringAsync(pendingSyllabusFile.uri, { encoding: 'base64' });
      }
      // Upload to Backend (Backend handles Storage + CloudConvert + Gemini Parsing)
      const response = await fetch(`${API_BASE_URL}/course-syllabus/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classId: course?.id,
          fileBase64,
          fileName: pendingSyllabusFile.name,
          fileType: pendingSyllabusFile.mimeType,
          fileSize: pendingSyllabusFile.size,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed.');
      // Update Syllabus State
      setCurrentSyllabus(data.syllabus);
      if (data.syllabus?.structure && data.syllabus.structure.modules) {
        showResultModal('success', 'Syllabus Uploaded', 'Syllabus parsed successfully! Click "Generate Module 1" to create course content.');
      } else {
        showResultModal('info', 'Upload Complete', 'Syllabus uploaded. Auto-parsing could not extract structure. You can generate modules manually or try uploading a different file.');
      }
    } catch (error: any) {
      console.error('Syllabus upload error:', error);
      showResultModal('error', 'Upload Failed', error?.message || 'Failed to upload syllabus.');
    } finally {
      setIsUploadingSyllabus(false);
    }
  };
  // ❌ REMOVED: handleReplaceSyllabus
  // ❌ REMOVED: handleDeleteSyllabus
  const handleViewSyllabus = async () => {
    if (!currentSyllabus?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/course-syllabus/view/${currentSyllabus.id}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.url) {
        // ✅ Use Google Docs Viewer instead of raw download link
        const googleDocsUrl = getGoogleDocsViewerUrl(data.url);
        setSyllabusViewerUrl(googleDocsUrl);
      }
    } catch (e) {
      showResultModal('error', 'Error', 'Failed to load syllabus preview.');
    }
  };
  const handleGenerateStructure = async () => {
  if (!currentSyllabus || isGeneratingStructure) return;
  setIsGeneratingStructure(true);
  setGeneratedStructure(null);
  
  try {
    const modules = currentSyllabus.structure?.modules || [];
    if (modules.length === 0) {
      throw new Error("No modules found in syllabus structure.");
    }
    
    // Get the first module's details
    const firstModule = modules[0];
    const moduleTitle = firstModule.moduleTitle || `Module 1`;
    
    const response = await fetch(`${API_BASE_URL}/course-syllabus/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        classId: course?.id,
        moduleNumber: 1,
        cachedModules: modules,
        title: moduleTitle // ✅ Ensure title is passed
      })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Generation failed');
    setGeneratedStructure(data.data);
    setShowStructurePreviewModal(true);
  } catch (error: any) {
    console.error("Generation Error:", error);
    showResultModal('error', 'Generation Failed', error?.message || 'Unable to generate course structure.');
  } finally {
    setIsGeneratingStructure(false);
  }
};
  const handleGenerateAnotherModule = async () => {
  if (!currentSyllabus || isGeneratingStructure) return;

  setIsGeneratingStructure(true);
  setGeneratedStructure(null);

  try {
    // 1. Identify which Syllabus MODULE TITLES have NOT been created yet
    // We compare by Title (case-insensitive) to see which content is missing.
    const createdModuleTitles = new Set(
      modules.map((m: any) => String(m.title).trim().toLowerCase())
    );
    
    // Find all syllabus modules whose TITLES do not exist in the created modules
    const missingSyllabusModules = currentSyllabus.structure?.modules?.filter(
      (sylMod: any) => !createdModuleTitles.has(String(sylMod.moduleTitle).trim().toLowerCase())
    ) || [];

    let targetSyllabusModule: any = null;
    let nextNum: number = 0;

    if (missingSyllabusModules.length > 0) {
      // ✅ FIX: Prioritize filling the MISSING SYLLABUS CONTENT first.
      // Pick the first missing module from the syllabus (usually the lowest original number).
      targetSyllabusModule = missingSyllabusModules[0];
      
      // Decide on the Module Number:
      // Option A: Use the next sequential number (1, 2, 3...) regardless of syllabus number.
      const maxExistingNum = modules.length > 0 
        ? Math.max(...modules.map((m: any) => Number(m.moduleNumber) || 0)) 
        : 0;
      nextNum = maxExistingNum + 1;

      console.log(`Filling missing syllabus content: "${targetSyllabusModule.moduleTitle}" as Module ${nextNum}`);
    } else {
      // If all syllabus titles are present, just create a new sequential module.
      const maxExistingNum = modules.length > 0 
        ? Math.max(...modules.map((m: any) => Number(m.moduleNumber) || 0)) 
        : 0;
      
      nextNum = maxExistingNum + 1;
      
      // Try to find a syllabus module for this new number, if it exists (for extra metadata)
      targetSyllabusModule = currentSyllabus.structure?.modules?.find(
        (m: any) => Number(m.moduleNumber) === nextNum
      );
    }

    // Determine the Title: ALWAYS use the Syllabus Title if we found a missing one.
    // Otherwise, fallback to "Module X".
    const moduleTitle = targetSyllabusModule?.moduleTitle || `Module ${nextNum}`;
    const weeklySchedule = targetSyllabusModule?.weeklySchedule || '';
    const description = targetSyllabusModule?.description || '';

    console.log(`Generating Module ${nextNum} with Title: "${moduleTitle}"`);

    const response = await fetch(`${API_BASE_URL}/course-modules/create-manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        classId: course?.id,
        moduleNumber: nextNum,
        title: moduleTitle, // ✅ Uses the missing Syllabus Title
        description: description,
        weeklySchedule: weeklySchedule
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Generation failed');

    // 2. Reload Course Content to update the 'modules' state
    await loadCourseContent();

    showResultModal('success', 'Module Created', `Module ${nextNum} ("${moduleTitle}") has been created.`);

  } catch (error: any) {
    showResultModal('error', 'Generation Failed', error?.message || 'Unable to generate module.');
  } finally {
    setIsGeneratingStructure(false);
  }
};
  const updateStructureField = (path: string, value: any) => {
    if (!generatedStructure) return;
    const keys = path.split('.');
    const newStructure = JSON.parse(JSON.stringify(generatedStructure)); // Deep clone
    let current: any = newStructure;
    // Navigate to parent and create missing intermediate objects
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const indexMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (indexMatch) {
        const arrayKey = indexMatch[1];
        const index = parseInt(indexMatch[2]);
        // Ensure array exists
        if (!Array.isArray(current[arrayKey])) {
          current[arrayKey] = [];
        }
        // Ensure index exists in array
        if (!current[arrayKey][index]) {
          current[arrayKey][index] = {};
        }
        current = current[arrayKey][index];
      } else {
        // Ensure object exists
        if (current[key] === undefined || current[key] === null) {
          current[key] = {};
        }
        current = current[key];
      }
    }
    // Set the final value
    const lastKey = keys[keys.length - 1];
    const lastIndexMatch = lastKey.match(/^(\w+)\[(\d+)\]$/);
    if (lastIndexMatch) {
      const arrayKey = lastIndexMatch[1];
      const index = parseInt(lastIndexMatch[2]);
      if (!Array.isArray(current[arrayKey])) {
        current[arrayKey] = [];
      }
      current[arrayKey][index] = value;
    } else {
      current[lastKey] = value;
    }
    setGeneratedStructure(newStructure);
  };
  const handleApproveStructure = async () => {
    if (!generatedStructure || !course?.id) return;
    setIsGeneratingStructure(true);
    try {
      const response = await fetch(`${API_BASE_URL}/course-syllabus/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          classId: course.id,
          curriculum: generatedStructure
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Approval failed');
      setShowStructurePreviewModal(false);
      setGeneratedStructure(null);
      await loadCourseContent(); // Refresh to show newly saved modules
      showResultModal('success', 'Approved', 'Course structure saved and modules created!');
    } catch (error: any) {
      showResultModal('error', 'Save Failed', error?.message || 'Unable to save course structure.');
    } finally {
      setIsGeneratingStructure(false);
    }
  };
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
  // ─── Edit material handlers ───────────────────────────────────────────────
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
      if (hasNewFile && course?.id) {
        let fileBase64: string | null = null;
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
        } else if (editMatPickedFile.uri) {
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
      const updateBody: any = {
        title: editMatTitle.trim(),
        week: editMatWeek.trim(),
        content: editMatContent.trim() || undefined,
      };
      if (uploadedFile) {
        updateBody.fileName = uploadedFile.fileName ?? null;
        updateBody.fileUrl = uploadedFile.fileUrl ?? null;
        updateBody.fileType = uploadedFile.fileType ?? null;
        updateBody.storagePath = uploadedFile.storagePath ?? null;
        updateBody.bucketPath = uploadedFile.bucketPath ?? null;
        updateBody.pdfUrl = uploadedFile.pdfUrl ?? null;
        updateBody.pdfStoragePath = uploadedFile.pdfStoragePath ?? null;
      }
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
              const response = await fetch(
                `${API_BASE_URL}/delete-class-material/${editingMaterial.id}`,
                { credentials: 'include', method: 'DELETE' }
              );
              const data = await response.json();
              if (!response.ok) throw new Error(data.error || 'Failed to delete material.');
              await loadCourseContent();
              setShowEditMaterialModal(false);
              setViewerMaterial(null);
              showResultModal('success', 'Deleted', 'Material deleted successfully.');
            } catch (error: any) {
              showResultModal('error', 'Delete Failed', error?.message || 'Failed to delete material.');
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
        if (storagePath && course?.id) {
          downloadUrl = `${API_BASE_URL}/course-material-download/${course.id}?storagePath=${encodeURIComponent(storagePath)}`;
        } else {
          showResultModal('error', 'Download Unavailable', 'This file cannot be downloaded directly.');
          return;
        }
      } else {
        if (!firebaseUrl) {
          showResultModal('error', 'No File', 'This material has no file to download.');
          return;
        }
        downloadUrl = firebaseUrl;
      }
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
  setSelectedMaterialIds((prev) => {
    const isSelected = prev.includes(materialId);

    if (isSelected) {
      // Deselecting: remove it, nothing stays hidden
      return prev.filter((id) => id !== materialId);
    }

    // ✅ STRICT MODE FOR ALL TYPES: selecting ANY material or lesson
    // clears everything else — only this one item remains selected.
    return [materialId];
  });

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
  // ✅ VALIDATION: Match Game.tsx logic strictly
  if (!gameType) {
    showResultModal('error', 'Error', 'Please select a game type first.');
    return;
  }
  if (selectedMaterialIds.length === 0) {
    showResultModal('error', 'Error', 'Please select at least one learning material.');
    return;
  }

  // ✅ MAX QUESTIONS PER GENERATION (shared constant)
  const parsedCount = parseInt(numberOfQuestions, 10) || 0;
  if (parsedCount < 1 || parsedCount > MAX_QUESTIONS_PER_GENERATION) {
    showResultModal(
      'error',
      'Invalid Count',
      `Please enter between 1 and ${MAX_QUESTIONS_PER_GENERATION} questions.`
    );
    return;
  }

  // ✅ DAILY GENERATION LIMIT — per teacher, shared across ALL classes/courses.
  // We re-check the persisted usage right before generating so the limit can't
  // be bypassed by switching between classes/tabs without refreshing state.
  const { usageMap, count: usedToday } = await getTodayUsageForTeacher(teacherIdentity);
  if (usedToday >= DAILY_GENERATION_LIMIT) {
    setDailyGenerationsUsed(usedToday);
    showResultModal(
      'error',
      'Daily Limit Reached',
      `You've used all ${DAILY_GENERATION_LIMIT} question generations allowed today across your classes. Please try again tomorrow.`
    );
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
        numberOfQuestions: parsedCount, // ✅ Send validated number
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to generate questions.');

    const questionsArray = Array.isArray(data.questions) ? data.questions : [];
    
    const uniqueQuestions = questionsArray.filter((q: any, index: number, self: any[]) => {
      // Determine the unique identifier based on game type
      const uniqueKey = gameType === 'fill_in_blanks' 
        ? q.sentence 
        : (q.question || q.term || q.front);
        
      const answerKey = q.answer || q.definition || q.back;

      // Check for exact duplicates based on the CORRECT field
      const isDuplicate = index !== self.findIndex((t: any) => {
         const tKey = gameType === 'fill_in_blanks' ? t.sentence : (t.question || t.term || t.front);
         return tKey === uniqueKey;
      });

      // Specific check for low-quality placeholders
      const isPlaceholder = uniqueKey?.toLowerCase().includes("the process of ___ is defined as");
      
      return !isDuplicate && !isPlaceholder;
    });

let finalQuestions = uniqueQuestions;
    if (uniqueQuestions.length < 3 && questionsArray.length >= 3) {
      console.warn("Strict filtering removed too many questions. Using relaxed filter.");
      finalQuestions = questionsArray.filter((q: any, index: number, self: any[]) => {
         const uniqueKey = gameType === 'fill_in_blanks' ? q.sentence : (q.question || q.term || q.front);
         return index === self.findIndex((t: any) => {
            const tKey = gameType === 'fill_in_blanks' ? t.sentence : (t.question || t.term || t.front);
            return tKey === uniqueKey;
         });
      });
    }


    if (finalQuestions.length === 0) {
      throw new Error('AI did not return any valid questions. Please try again.');
    }


   const editableQuestions = finalQuestions.map((q: any, index: number) => {
    
    
    // ✅ FIX: Handle fill_in_blanks specifically
  if (gameType === 'fill_in_blanks') {
    return { 
      id: `gen-${Date.now()}-${index}`, 
      sentence: q.sentence || '', // ✅ Keep sentence
      answer: q.answer || '', 
      // Keep question as fallback just in case
      question: q.sentence || q.question || '' 
    };
  }
  if (gameType === 'flashcard') {
        return { 
          id: `gen-${Date.now()}-${index}`, 
          question: q.front || '', 
          answer: q.back || '' 
        };
      }
      if (gameType === 'memory_match') {
    return { 
      id: `gen-${Date.now()}-${index}`, 
      question: q.term || q.question || '',       // ✅ Map term → question for UI
      answer: q.definition || q.answer || ''      // ✅ Map definition → answer for UI
    };
  }

    const options = q.options && q.options.length === 4 ? q.options : ['', '', '', ''];
    const answer = q.answer || options[0] || '';
    const correctIndex = options.indexOf(answer);
    return {
      id: `gen-${Date.now()}-${index}`,
      question: q.question || '',
      options,
      answer,
      correctIndex: correctIndex !== -1 ? correctIndex : 0
    };
  });

    // ✅ Record generation usage — persisted per teacher and shared across
    // every class/course, resets automatically at the start of a new day.
    const nextCount = usedToday + 1;
    const nextUsageMap: GenerationUsageMap = {
      ...usageMap,
      [teacherIdentity]: { date: getTodayDateKey(), count: nextCount },
    };
    await writeGenerationUsage(nextUsageMap);
    setDailyGenerationsUsed(nextCount);

    setGeneratedQuestions(editableQuestions);
    setShowGeneratedPreview(true);
    showResultModal(
      'success',
      'Generated',
      `Questions generated successfully! (${nextCount}/${DAILY_GENERATION_LIMIT} generations used today) You can edit them before saving.`
    );
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
    if (activeTab === 'materials') {
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
  const renderRelatedMaterialsSelector = () => {
  // Check if ANY item is currently selected (material or lesson)
  const hasSelection = selectedMaterialIds.length > 0;

  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionLabel}>Module Lessons</Text>
      <Text style={styles.helperText}>
        Select one lesson the AI should use for follow-up activity generation or game content.
      </Text>
      {materials.length === 0 ? (
        <Text style={styles.emptyMiniText}>No created materials or lessons yet.</Text>
      ) : (
        <View
          style={[styles.materialSelectorWrap, errors.materials ? styles.errorContainer : null]}
        >
          {materials.map((material) => {
            const active = selectedMaterialIds.includes(material.id);
            const isLesson = (material as any).isLesson === true || (material as any).type === 'module_lesson';

            // ✅ HIDE LOGIC: If anything is selected, hide everything except that item
            if (hasSelection && !active) {
              return null;
            }

            return (
              <TouchableOpacity
                key={material.id}
                style={[
                  styles.materialChip,
                  active && styles.materialChipActive,
                  isLesson && styles.lessonChip
                ]}
                onPress={() => toggleRelatedMaterial(material.id)}
                activeOpacity={0.85}
                disabled={isSaving}
              >
                <Ionicons
                  name={active ? 'checkmark-circle' : isLesson ? 'book-outline' : 'ellipse-outline'}
                  size={16}
                  color={active ? '#FFF' : isLesson ? '#1976D2' : '#D32F2F'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.materialChipText,
                    active && styles.materialChipTextActive,
                    isLesson && styles.lessonChipText
                  ]}>
                    {material.title}
                  </Text>
                  {isLesson && (
                    <Text style={[styles.lessonSubtext, active && styles.lessonSubtextActive]}>
                      {active 
                        ? 'Selected' 
                        : 'Lesson ' + ((material as any).lessonNumber || '')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {renderInputError(errors.materials)}
    </View>
  );
};
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
            style={[
              styles.generateButton,
              (isGenerating || dailyGenerationsUsed >= DAILY_GENERATION_LIMIT)
                ? styles.disabledButton
                : null,
            ]}
            onPress={handleGenerateQuestions}
            disabled={
              isGenerating || isSaving || dailyGenerationsUsed >= DAILY_GENERATION_LIMIT
            }
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color="#FFF" />
            )}
            <Text style={styles.generateButtonText}>
              {isGenerating
                ? 'Generating...'
                : dailyGenerationsUsed >= DAILY_GENERATION_LIMIT
                  ? 'Daily Limit Reached'
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
  // Helper to validate question count (matches Game.tsx logic)
  const parsedQuestionCount = parseInt(numberOfQuestions, 10) || 0;
  const isInvalidQuestionCount =
    parsedQuestionCount > MAX_QUESTIONS_PER_GENERATION || parsedQuestionCount < 1;

  if (activeTab === 'materials') {
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

  // --- GAME-BASED ASSIGNMENT FORM ---
  return (
    <View style={[styles.formGrid, !isMobile && styles.formGridDesktop]}>
      {/* Assignment Type Toggle */}
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

        {/* ✅ NEW: Number of Questions Input for Game-Based Assignments */}
{assignmentType === 'game_based' && (
  <>
    <Text style={styles.sectionLabel}>
      Number of Questions (Max {MAX_QUESTIONS_PER_GENERATION})
    </Text>
    <TextInput
      style={[
        styles.inputBox,
        isInvalidQuestionCount && styles.errorBorder, // ✅ Show red border if invalid
      ]}
      placeholder="e.g., 10"
      placeholderTextColor="#999"
      value={numberOfQuestions}
      onChangeText={(text) => {
        // ✅ Sanitize input: Only allow numbers (matches Game.tsx UX)
        setNumberOfQuestions(text.replace(/[^0-9]/g, ''));
        // Clear error when user starts typing valid input
        if (errors.totalScore) setErrors((prev) => ({ ...prev, totalScore: undefined }));
      }}
      keyboardType="numeric"
      maxLength={2}
      editable={!isSaving}
    />
    {/* ✅ Display specific error message under input */}
    {isInvalidQuestionCount && (
      <Text style={styles.errorText}>
        {parsedQuestionCount > MAX_QUESTIONS_PER_GENERATION
          ? `Maximum limit is ${MAX_QUESTIONS_PER_GENERATION} questions.`
          : 'Please enter at least 1 question.'}
      </Text>
    )}
    {/* ✅ Daily generation usage, shared across ALL of this teacher's classes/courses */}
    <Text
      style={{
        fontSize: 11,
        color: dailyGenerationsUsed >= DAILY_GENERATION_LIMIT ? '#D32F2F' : '#888',
        marginTop: -4,
        marginBottom: 8,
      }}
    >
      {dailyGenerationsUsed}/{DAILY_GENERATION_LIMIT} generations used today across all your classes
      {dailyGenerationsUsed >= DAILY_GENERATION_LIMIT ? ' — limit reached, try again tomorrow.' : ''}
    </Text>
  </>
)}

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
                assignmentType === 'game_based' 
                  ? { backgroundColor: '#F5F5F5', color: '#666' } 
                  : null,
              ]}
              value={
                assignmentType === 'game_based' 
                  ? String(generatedQuestions.length) 
                  : formPoints
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
                * Auto-calculated based on generated questions (1 point per item).
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

        {/* Generate Button for Game-Based */}
        {assignmentType === 'game_based' && selectedMaterialIds.length > 0 && gameType && (
          <TouchableOpacity
            style={[
              styles.generateButton, 
              (isGenerating || isInvalidQuestionCount || dailyGenerationsUsed >= DAILY_GENERATION_LIMIT)
                ? styles.disabledButton
                : null
            ]}
            onPress={handleGenerateQuestions}
            disabled={
              isGenerating || isSaving || isInvalidQuestionCount ||
              dailyGenerationsUsed >= DAILY_GENERATION_LIMIT
            }
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="sparkles-outline" size={18} color="#FFF" />
            )}
            <Text style={styles.generateButtonText}>
              {isGenerating
                ? 'Generating...'
                : dailyGenerationsUsed >= DAILY_GENERATION_LIMIT
                  ? 'Daily Limit Reached'
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

        {/* Attachment for Regular Submission */}
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
            
            {/* ✅ UPDATED: Use q.sentence */}
            <Text style={styles.sectionLabel}>Sentence (Use '___' for the blank)</Text>
            <TextInput
              style={styles.inputBox}
              // ✅ FIX: Bind to 'sentence' if available, fallback to 'question' for legacy safety
              value={q.sentence || q.question || ''} 
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'sentence', val)} // ✅ SAVE as 'sentence'
              placeholder="The process of ___ is defined as..."
              multiline
            />
            
            <Text style={styles.sectionLabel}>Missing Word / Correct Answer</Text>
            <TextInput
              style={styles.inputBox}
              value={q.answer || ''}
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
  // ─── Structure Preview Modal Renderer ─────────────────────────────────────
  const renderStructurePreviewModal = () => {
    if (!showStructurePreviewModal || !generatedStructure) return null;
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 400) : 900, maxHeight: height * 0.9 }]}>
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Preview Structure</Text>
                <Text style={styles.modalSubtitle}>Edit before approving.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowStructurePreviewModal(false)} disabled={isGeneratingStructure}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
              {generatedStructure?.modules?.map((mod: any, mi: number) => (
                <View key={mi} style={{ marginBottom: 24 }}>
                  <View style={{ backgroundColor: '#D32F2F', padding: 16, borderRadius: 12, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>
                      Module {mod.moduleNumber}: {cleanModuleTitle(mod.title, mod.moduleNumber)}
                    </Text>
                      <TouchableOpacity onPress={() => updateStructureField('modules', generatedStructure.modules.filter((_: any, idx: number) => idx !== mi))}><Ionicons name="trash-outline" size={24} color="#FFF" /></TouchableOpacity></View>
                    
                  </View>
                  <View style={{ paddingLeft: 16, marginBottom: 16 }}><Text style={styles.sectionLabel}>Description</Text><TextInput style={styles.textAreaBox} value={mod.description} onChangeText={v => updateStructureField(`modules.${mi}.description`, v)} multiline /></View>
                  <View style={{ paddingLeft: 16 }}>
                    <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Lessons ({mod.lessons?.length || 0})</Text>
                    {mod.lessons?.map((l: any, li: number) => (
                      <View key={li} style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#DDD', borderLeftWidth: 4, borderLeftColor: '#1976D2' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}><Text style={{ fontSize: 16, fontWeight: '700', color: '#1976D2' }}>Lesson {li + 1}: {l.title}</Text><TouchableOpacity onPress={() => { const nl = mod.lessons.filter((_: any, idx: number) => idx !== li); updateStructureField(`modules.${mi}.lessons`, nl); }}><Ionicons name="close-circle" size={20} color="#999" /></TouchableOpacity></View>
                        <TextInput style={styles.inputBox} placeholder="Title" value={l.title} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.title`, v)} />
                        <TextInput style={[styles.textAreaBox, { minHeight: 60 }]} placeholder="Description" value={l.description} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.description`, v)} multiline />
            
                        <View style={{ marginTop: 12 }}><Text style={styles.sectionLabel}>Discussion</Text><TextInput style={[styles.textAreaBox, { minHeight: 300 }]} placeholder="AI content..." value={l.discussion || ''} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.discussion`, v)} multiline /></View>
                        <View style={{ marginTop: 12 }}><Text style={styles.sectionLabel}>Activity</Text><TextInput style={[styles.textAreaBox, { minHeight: 300 }]} placeholder="Scenario..." value={l.activity || ''} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.activity`, v)} multiline /></View>
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => { const nl = { id: `l-${Date.now()}`, title: '', description: '', discussion: '', activity: '', estimatedHours: 2 }; updateStructureField(`modules.${mi}.lessons`, [...(mod.lessons || []), nl]); }} style={{ marginTop: 8, padding: 12, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#1976D2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}><Ionicons name="add-circle-outline" size={20} color="#1976D2" /><Text style={{ color: '#1976D2', fontWeight: '700' }}>Add Lesson</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.buttonRow}><TouchableOpacity style={styles.secondaryButton} onPress={() => setShowStructurePreviewModal(false)} disabled={isGeneratingStructure}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.primaryButton} onPress={handleApproveStructure} disabled={isGeneratingStructure}>{isGeneratingStructure ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryButtonText}>Approve & Save</Text>}</TouchableOpacity></View>
          </View>
        </View>
      </Modal>
    );
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
          classId={course?.id}
          currentTeacher={currentTeacher}
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
    <View style={styles.container}>
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
        {/* ── Tabs ─ */}
        <View style={styles.tabContainer}>
  {/* ✅ MOVED TO FIRST POSITION (LEFT) */}
  <TouchableOpacity
    onPress={() => setActiveTab('modules')}
    style={[styles.tab, activeTab === 'modules' && styles.tabActive]}
  >
    <Text
      style={[styles.tabText, activeTab === 'modules' && styles.tabTextActive]}
    >
      Course Resources ({modules.length})
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => setActiveTab('assignments')}
    style={[styles.tab, activeTab === 'assignments' && styles.tabActive]}
  >
    <Text
      style={[styles.tabText, activeTab === 'assignments' && styles.tabTextActive]}
    >
      Assignments ({assignments.length})
    </Text>
  </TouchableOpacity>

  {/* ❌ REMOVED MATERIALS TAB AS REQUESTED */}
</View>
        {activeTab === 'materials' ? (
          <TeacherMaterialSection
            materials={materials}
            onCreate={openCreateModal}
            onOpenMaterial={openMaterialViewer}
          />
        ) : activeTab === 'assignments' ? (
          <TeacherAssignmentSection
            assignments={assignments}
            onCreate={openCreateModal}
            onOpenMembers={(id) => {
              setSelectedId(id);
              setShowSubmissions(true);
            }}
          />
        ) : (
          <View style={{ padding: 16 }}>
            {/* AI Course Builder / Syllabus Section */}
            <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 12 }}>AI Course Builder</Text>
              {!currentSyllabus ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ color: '#888', marginBottom: 12 }}>No syllabus uploaded.</Text>
                  <TouchableOpacity
                    onPress={handlePickSyllabus} // ✅ Changed to handlePickSyllabus
                    disabled={isUploadingSyllabus}
                    style={{ backgroundColor: '#D32F2F', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    {isUploadingSyllabus ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />}
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Upload Course Syllabus</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EEE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Ionicons name="document-text-outline" size={24} color="#D32F2F" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }} numberOfLines={1}>{currentSyllabus.fileName}</Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Uploaded {formatSyllabusDate(currentSyllabus?.uploadedAt)}
                      </Text>
                    </View>
                  </View>
                  {/* Generating State Indicator */}
                  {currentSyllabus.status === 'generating' && (
                    <View style={{ marginTop: 12, padding: 12, backgroundColor: '#FFF8E1', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator size="small" color="#F57C00" />
                      <Text style={{ color: '#F57C00', fontWeight: '600', fontSize: 13 }}>AI is analyzing your syllabus...</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    <TouchableOpacity onPress={handleViewSyllabus} style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}>
                      <Text style={{ color: '#1565C0', fontWeight: '700', fontSize: 12 }}>View</Text>
                    </TouchableOpacity>
                    {/* ❌ REMOVED: Replace Button */}
                    {/* ❌ REMOVED: Delete Button */}
                  </View>
                </View>
              )}
            </View>
             {/* ACCORDION MODULES LIST WITH LOADING STATE */}
    {isLoadingModules ? (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D32F2F" />
        <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>Loading resources...</Text>
      </View>
    ) : modules.length === 0 ? (
      <Text style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>No modules generated yet.</Text>
    ) : (
  <>
    {modules.map((mod: any) => {
      const isExpanded = expandedModules[mod.moduleNumber] || false;
      const totalHours = mod.estimatedHours ||
        (mod.lessons?.reduce((sum: number, l: any) => sum + (l.estimatedHours || 0), 0) || 0);
      return (
        <View key={mod.id} style={{ backgroundColor: '#FFF', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden' }}>
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
                    Module {mod.moduleNumber}: {cleanModuleTitle(mod.title, mod.moduleNumber)}
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
                  // ✅ SORT LESSONS BY LESSON NUMBER BEFORE RENDERING
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
                        {/* ✅ USE ACTUAL LESSON NUMBER FROM DB INSTEAD OF ARRAY INDEX */}
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
              
              {/* Add Lesson & Generate buttons remain unchanged below */}
              <TouchableOpacity
                onPress={() => { setSelectedModuleForLesson(mod); setShowManualLessonModal(true); }}
                style={{ marginTop: 8, padding: 10, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#1976D2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              >
                <Ionicons name="add-circle-outline" size={16} color="#1976D2" />
                <Text style={{ color: '#1976D2', fontWeight: '700', fontSize: 12 }}>Add Lesson (Manual)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleOpenNextLessonModal(mod)}
                style={{ marginTop: 8, padding: 16, backgroundColor: '#E3F2FD', borderRadius: 12, borderWidth: 1, borderColor: '#1976D2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                <Ionicons name="sparkles-outline" size={24} color="#1976D2" />
                <Text style={{ color: '#1976D2', fontWeight: '800', fontSize: 16 }}>Generate Next Lesson</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    })}
  </>
)}
            {/* ✅ MOVED OUTSIDE THE TERNARY: Always visible when syllabus exists */}
            {currentSyllabus && (
              <>
                {modules.length === 0 ? (
                  <TouchableOpacity
                    onPress={handleGenerateStructure}
                    disabled={isGeneratingStructure}
                    style={{ marginTop: 8, padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 2, borderColor: '#D32F2F', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  >
                    {isGeneratingStructure ? <ActivityIndicator size="small" color="#D32F2F" /> : <Ionicons name="add-circle-outline" size={24} color="#D32F2F" />}
                    <Text style={{ color: '#D32F2F', fontWeight: '800', fontSize: 16 }}>Generate Module 1</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleGenerateAnotherModule}
                    disabled={isGeneratingStructure}
                    style={{ marginTop: 8, padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 2, borderColor: '#D32F2F', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  >
                    {isGeneratingStructure ? <ActivityIndicator size="small" color="#D32F2F" /> : <Ionicons name="add-circle-outline" size={24} color="#D32F2F" />}
                    <Text style={{ color: '#D32F2F', fontWeight: '800', fontSize: 16 }}>Generate Another Module</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setShowManualModuleModal(true)}
                  style={{ marginTop: 16, padding: 16, backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#D32F2F', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="create-outline" size={24} color="#D32F2F" />
                  <Text style={{ color: '#D32F2F', fontWeight: '800', fontSize: 16 }}>Create Module (Manual)</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
      {/* ══════════════════════════════════════════════════════════════════════
FULLSCREEN MATERIAL VIEWER MODAL (Teacher Side — mirrors student)
════════════════════════════════════════════════════════════════════════ */}
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
                {viewerIsShowingPdfPreview && (
                  <View style={styles.viewerPdfBadge}>
                    <Ionicons name="document-text-outline" size={11} color="#1565C0" />
                    <Text style={styles.viewerPdfBadgeText}>PDF Preview</Text>
                  </View>
                )}
                {!!viewerMaterial?.week && (
                  <View style={styles.viewerWeekBadge}>
                    <Text style={styles.viewerWeekText}>{viewerMaterial.week}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.viewerActions}>
            {/* Edit Button Removed */}
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
════════════════════════════════════════════════════════════════════════ */}
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
              <Text style={styles.sectionLabel}>Title *</Text>
              <TextInput
                style={styles.inputBox}
                value={editMatTitle}
                onChangeText={setEditMatTitle}
                placeholder="Material title"
                placeholderTextColor="#999"
                editable={!isSavingMaterial}
              />
              <Text style={styles.sectionLabel}>Week *</Text>
              <TextInput
                style={styles.inputBox}
                value={editMatWeek}
                onChangeText={setEditMatWeek}
                placeholder="e.g. Week 3"
                placeholderTextColor="#999"
                editable={!isSavingMaterial}
              />
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
            <View style={styles.editMaterialActions}>
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
════════════════════════════════════════════════════════════════════════ */}
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
                  {activeTab === 'materials'
                    ? 'Material'
                    : assignmentType === 'game_based'
                      ? 'Game-Based Assignment'
                      : 'Assignment'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {activeTab === 'materials'
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
                  activeTab === 'assignments' && Object.keys(errors).length > 0
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
                      {activeTab === 'materials' ? 'Saving Material...' : 'Saving Assignment...'}
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
════════════════════════════════════════════════════════════════════════ */}
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
════════════════════════════════════════════════════════════════════════ */}
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
════════════════════════════════════════════════════════════════════════ */}
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
════════════════════════════════════════════════════════════════════════ */}
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
AI PREVIEW & APPROVAL MODAL
════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!aiPreviewData} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 400) : 600, maxHeight: height * 0.85 }]}>
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Review AI Changes</Text>
                <Text style={styles.modalSubtitle}>Edit the generated content before saving.</Text>
              </View>
              <TouchableOpacity onPress={() => { setAiPreviewData(null); setAiPreviewType(''); }}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1, marginTop: 12 }} nestedScrollEnabled>
              <TextInput
                style={[styles.textAreaBox, { minHeight: 300 }]}
                value={JSON.stringify(aiPreviewData, null, 2)}
                onChangeText={(text) => { try { setAiPreviewData(JSON.parse(text)); } catch (e) { } }}
                multiline
              />
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => { setAiPreviewData(null); setAiPreviewType(''); }}>
                <Text style={styles.secondaryButtonText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSaveAiPreview}>
                <Text style={styles.primaryButtonText}>Approve & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
SYLLABUS VIEWER MODAL
════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={!!syllabusViewerUrl} transparent={false} animationType="slide" onRequestClose={() => setSyllabusViewerUrl(null)}>
        <SafeAreaView style={styles.viewerModal} edges={['top', 'bottom'] as any}>
          <View style={styles.viewerTopBar}>
            <TouchableOpacity onPress={() => setSyllabusViewerUrl(null)} style={styles.viewerBackBtn}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.viewerTitleBlock}>
              <Text style={styles.viewerTitle} numberOfLines={1}>{currentSyllabus?.fileName || 'Syllabus'}</Text>
            </View>
          </View>
          {syllabusViewerUrl && <InlineMaterialViewer viewerUrl={syllabusViewerUrl} height={height - 62} />}
        </SafeAreaView>
      </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
LESSON DETAIL MODAL (UPDATED WITH EDIT & DELETE ACTIONS)
════════════════════════════════════════════════════════════════════════ */}
{/* ══════════════════════════════════════════════════════════════════════
LESSON DETAIL MODAL (UPDATED WITH EDIT & DELETE ACTIONS)
════════════════════════════════════════════════════════════════════════ */}
<Modal
  visible={lessonDetailModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setLessonDetailModalVisible(false)}
>
  <View style={styles.modalOverlayCenter}>
    <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 400) : 800, maxHeight: height * 0.9 }]}>
      <View style={styles.createHeaderRow}>
        <View style={styles.modalHeaderTextWrap}>
          <Text style={styles.createTitle}>{selectedLesson?.title || 'Lesson Details'}</Text>
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
            {/* File Preview Trigger */}
            {selectedLesson.type === 'manual_file' && selectedLesson.fileUrl ? (
              <TouchableOpacity
                onPress={() => {
                  const materialViewData: Material = {
                    id: selectedLesson.id,
                    title: selectedLesson.title,
                    week: '',
                    posted: new Date().toLocaleString(),
                    content: selectedLesson.description || '',
                    fileName: selectedLesson.fileName,
                    fileUri: selectedLesson.fileUrl,
                    fileType: selectedLesson.fileType,
                    storagePath: selectedLesson.storagePath,
                    bucketPath: selectedLesson.bucketPath,
                    pdfUrl: selectedLesson.pdfUrl,
                    pdfStoragePath: selectedLesson.pdfStoragePath,
                  };
                  setLessonDetailModalVisible(false);
                  setViewerMaterial(materialViewData);
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
            
            {/* Description */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={{ color: '#333', lineHeight: 20 }}>
                {selectedLesson.description || 'No description available.'}
              </Text>
            </View>
            
            {/* Discussion Content */}
            {selectedLesson.discussion ? (
              <View style={{ marginBottom: 16, backgroundColor: '#F9F9F9', padding: 12, borderRadius: 8 }}>
                <Text style={styles.sectionLabel}>Discussion / Lecture Notes</Text>
                <Text style={{ color: '#444', lineHeight: 22 }}>
                  {renderFormattedText(selectedLesson.discussion, { color: '#444', lineHeight: 22 })}
                </Text>
              </View>
            ) : null}
            
            {/* Activity */}
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
      
      {/* ✅ NEW: Action Buttons Row */}
      <View style={styles.modalBottomActions}>
        <TouchableOpacity 
          style={styles.deleteMaterialBtn} 
          onPress={() => setShowDeleteLessonModal(true)}
          disabled={isDeletingLesson}
        >
          <Ionicons name="trash-outline" size={18} color="#D32F2F" />
          <Text style={styles.deleteMaterialBtnText}>Delete</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
  style={[styles.primaryButton, { flex: 2 }]} 
  onPress={() => {
    if (!selectedLesson) return;

    // 1. Find parent module
    const parentModule = modules.find((m: any) => m.id === selectedLesson.moduleId);
    
    // 2. Set Edit Mode Flag
    setIsEditingLesson(true); 

    // 3. Pre-fill form state
    setSelectedModuleForLesson(parentModule || null);
    setNewLessonTitle(selectedLesson.title || '');
    setNewLessonDesc(selectedLesson.description || '');
    
    // 4. Lock Mode based on type
    if (selectedLesson.type === 'manual_file' && selectedLesson.fileUrl) {
      setLessonMode('file');
      setNewLessonDiscussion('');
      setNewLessonActivity('');
      setNewLessonFile(null); 
    } else {
      setLessonMode('text');
      setNewLessonDiscussion(selectedLesson.discussion || '');
      setNewLessonActivity(selectedLesson.activity || '');
      setNewLessonFile(null);
    }
    
    // 5. Switch modals
    setLessonDetailModalVisible(false);
    setShowManualLessonModal(true);
  }}
>
  <Ionicons name="create-outline" size={18} color="#FFF" />
  <Text style={styles.primaryButtonText}>Edit Lesson</Text>
</TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>

{/* ═════════════════════════════════════════════════════════════════════
DELETE LESSON CONFIRMATION MODAL (Cross-Platform)
════════════════════════════════════════════════════════════════════════ */}
<Modal
  visible={showDeleteLessonModal}
  transparent
  animationType="fade"
  onRequestClose={() => !isDeletingLesson && setShowDeleteLessonModal(false)}
>
  <View style={styles.modalOverlayCenter}>
    <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 330) : 380 }]}>
      <Text style={[styles.createTitle, { textAlign: 'center', marginBottom: 10, color: '#D32F2F' }]}>
        Delete Lesson?
      </Text>
      <Text style={{ fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
        Are you sure you want to delete "<Text style={{ fontWeight: '700' }}>{selectedLesson?.title}</Text>"? 
        This action cannot be undone.
      </Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setShowDeleteLessonModal(false)}
          disabled={isDeletingLesson}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, isDeletingLesson && styles.disabledButton]}
          onPress={handleDeleteLesson}
          disabled={isDeletingLesson}
        >
          {isDeletingLesson ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#FFF" />
              <Text style={styles.primaryButtonText}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
      {/* ══════════════════════════════════════════════════════════════════════
MANUAL MODULE CREATION MODAL
═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showManualModuleModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 360) : 500 }]}>
            <View style={styles.createHeaderRow}>
              <Text style={styles.createTitle}>Create Module Manually</Text>
              <TouchableOpacity onPress={() => {
                // ✅ Calculate next available module number
                const maxExistingNum = modules.length > 0 
                  ? Math.max(...modules.map((m: any) => Number(m.moduleNumber) || 0)) 
                  : 0;
                const nextNum = maxExistingNum + 1;
                
                setNewModuleNum(String(nextNum)); // Set as string for TextInput
                setShowManualModuleModal(true);
              }}><TouchableOpacity onPress={() => setShowManualModuleModal(false)}>
  <Ionicons name="close" size={24} color="#111" />
</TouchableOpacity></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {/* --- UPDATED MODULE NUMBER INPUT WITH VALIDATION --- */}
             
              <Text style={styles.sectionLabel}>Module Number</Text>
  
              {/* ✅ UPDATED: Read-Only Input with Automatic Value */}
              <TextInput
                style={[styles.inputBox, { backgroundColor: '#f5f5f5' }]} // Optional: Grey background to indicate read-only
                value={newModuleNum}
                editable={false} // 🔒 Makes it unchangeable by user
                keyboardType="numeric"
                placeholder="Auto-generated"
                placeholderTextColor="#999"
              />
              {/* --- REST OF THE FORM --- */}
              <Text style={styles.sectionLabel}>Title</Text>
              <TextInput style={styles.inputBox} value={newModuleTitle} onChangeText={setNewModuleTitle} placeholder="Module Title" placeholderTextColor="#999" />
              
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowManualModuleModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              {/* ✅ DISABLE BUTTON IF DUPLICATE OR EMPTY TITLE */}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (modules.some(m => Number(m.moduleNumber) === Number(newModuleNum)) || !newModuleTitle.trim())
                    ? styles.disabledButton
                    : null
                ]}
                onPress={handleCreateManualModule}
                disabled={modules.some(m => Number(m.moduleNumber) === Number(newModuleNum)) || !newModuleTitle.trim()}
              >
                <Text style={styles.primaryButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
MANUAL LESSON CREATION MODAL
════════════════════════════════════════════════════════════════════════ */}
      {/* ══════════════════════════════════════════════════════════════════════
MANUAL LESSON CREATION MODAL (UPDATED WITH EXISTING FILE DISPLAY)
════════════════════════════════════════════════════════════════════════ */}
<Modal visible={showManualLessonModal} transparent animationType="fade">
  <View style={styles.modalOverlayCenter}>
    <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 380) : 600, maxHeight: height * 0.9 }]}>
      <View style={styles.createHeaderRow}>
        <Text style={styles.createTitle}>
          {/* Dynamic Title based on context */}
          {newLessonTitle ? `Edit "${selectedModuleForLesson?.title}" Lesson` : `Add Lesson to "${selectedModuleForLesson?.title}"`}
        </Text>
        <TouchableOpacity onPress={() => {
          setShowManualLessonModal(false);
          resetLessonForm(); // Reset when closing manually
        }}>
          <Ionicons name="close" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      {/* ✅ CONDITIONALLY HIDE TOGGLE WHEN EDITING */}
      {!newLessonTitle && (
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setLessonMode('text')} style={[styles.typeChip, lessonMode === 'text' && styles.typeChipActive]}>
            <Text style={[styles.typeChipText, lessonMode === 'text' && styles.typeChipTextActive]}>Text Content</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setLessonMode('file')} style={[styles.typeChip, lessonMode === 'file' && styles.typeChipActive]}>
            <Text style={[styles.typeChipText, lessonMode === 'file' && styles.typeChipTextActive]}>Upload File</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={styles.sectionLabel}>Lesson Title</Text>
        <TextInput style={styles.inputBox} value={newLessonTitle} onChangeText={setNewLessonTitle} placeholder="Lesson Title" />
        
        <Text style={styles.sectionLabel}>Description</Text>
        <TextInput style={styles.inputBox} value={newLessonDesc} onChangeText={setNewLessonDesc} placeholder="Short summary" />

        {lessonMode === 'text' ? (
          <>
            <Text style={styles.sectionLabel}>Discussion / Lecture Notes</Text>
            <TextInput style={[styles.textAreaBox, { minHeight: 150 }]} value={newLessonDiscussion} onChangeText={setNewLessonDiscussion} multiline placeholder="Enter detailed content..." />
            
            <Text style={styles.sectionLabel}>Activity</Text>
            <TextInput style={[styles.textAreaBox, { minHeight: 100 }]} value={newLessonActivity} onChangeText={setNewLessonActivity} multiline placeholder="Instructions for activity..." />
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Upload Lesson Material</Text>
            
            {/* ✅ SHOW EXISTING FILE IF EDITING A FILE LESSON AND NO NEW FILE PICKED YET */}
            {!newLessonFile && selectedLesson?.type === 'manual_file' && selectedLesson.fileName ? (
              <View style={[styles.filePreviewBox, { marginBottom: 10, backgroundColor: '#F9F9F9', borderColor: '#DDD' }]}>
                <Ionicons name="document-text-outline" size={20} color="#666" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#888', fontWeight: '700' }}>CURRENT FILE:</Text>
                  <Text style={styles.filePreviewText}>{selectedLesson.fileName}</Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity 
              style={[styles.primaryButtonWide, { marginTop: 0 }]} 
              onPress={async () => {
                const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, base64: Platform.OS === 'web' });
                if (!res.canceled && res.assets?.[0]) setNewLessonFile({ name: res.assets[0].name, uri: res.assets[0].uri, type: res.assets[0].mimeType, base64: (res.assets[0] as any).base64, file: (res.assets[0] as any).file });
              }}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.uploadBtnText}>
                {newLessonFile ? 'Change File' : (selectedLesson?.type === 'manual_file' ? 'Replace File' : 'Choose File')}
              </Text>
            </TouchableOpacity>

            {newLessonFile && <View style={styles.filePreviewBox}><Ionicons name="document-text-outline" size={20} color="#D32F2F" /><Text style={styles.filePreviewText}>{newLessonFile.name}</Text></View>}

            <Text style={{ fontSize: 12, color: '#888', marginTop: 8, textAlign: 'center' }}>
              {selectedLesson?.type === 'manual_file' 
                ? "Leave empty to keep the current file. Upload a new file to replace it." 
                : "Discussion and Activity sections are hidden when uploading a file."}
            </Text>
          </>
        )}
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowManualLessonModal(false)}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={handleCreateManualLesson}><Text style={styles.primaryButtonText}>Save Lesson</Text></TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
      {/* ══════════════════════════════════════════════════════════════════════
COURSE STRUCTURE PREVIEW & APPROVAL MODAL
════════════════════════════════════════════════════════════════════════ */}
      {renderStructurePreviewModal()}
      {/* ══════════════════════════════════════════════════════════════════════
RESULT MODAL
════════════════════════════════════════════════════════════════════════ */}
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
      {/* ══════════════════════════════════════════════════════════════════════
GENERATE LESSON CONTENT MODAL
═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showGenerateModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 360) : 500 }]}>
            <View style={styles.createHeaderRow}>
              <Text style={styles.createTitle}>Generate Lesson Content</Text>
              <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Module Selector */}
              <Text style={styles.sectionLabel}>Select Module</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {modules.map((mod) => (
                  <TouchableOpacity
                    key={mod.id}
                    onPress={() => { setSelectedGenModule(mod); setSelectedGenTopic(null); setSelectedGenSubtopic(null); }}
                    style={[
                      styles.typeChip,
                      { marginRight: 8, minWidth: 100 },
                      selectedGenModule?.id === mod.id && styles.typeChipActive
                    ]}
                  >
                    <Text style={[styles.typeChipText, selectedGenModule?.id === mod.id && styles.typeChipTextActive]}>
                      Mod {mod.moduleNumber}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {/* Topic Selector */}
              {selectedGenModule && (
                <>
                  <Text style={styles.sectionLabel}>Select Topic</Text>
                  {/* Note: Assuming modules have a 'topics' array from the syllabus structure */}
                  {(selectedGenModule.topics || []).map((topic: any, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => { setSelectedGenTopic(topic); setSelectedGenSubtopic(null); }}
                      style={[
                        styles.materialChip,
                        { marginBottom: 8 },
                        selectedGenTopic?.title === topic.title && styles.materialChipActive
                      ]}
                    >
                      <Text style={[styles.materialChipText, selectedGenTopic?.title === topic.title && styles.materialChipTextActive]}>
                        {topic.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {/* Subtopic Selector (Optional) */}
              {selectedGenTopic && selectedGenTopic.subtopics && selectedGenTopic.subtopics.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Select Subtopic (Optional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                    {selectedGenTopic.subtopics.map((sub: string, sIdx: number) => (
                      <TouchableOpacity
                        key={sIdx}
                        onPress={() => setSelectedGenSubtopic(selectedGenSubtopic === sub ? null : sub)}
                        style={[
                          styles.attemptChip,
                          { marginRight: 8 },
                          selectedGenSubtopic === sub && styles.attemptChipActive
                        ]}
                      >
                        <Text style={[styles.attemptChipText, selectedGenSubtopic === sub && styles.attemptChipTextActive]}>
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
              {/* Content Checkboxes */}
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Content to Generate</Text>
              <TouchableOpacity onPress={() => setGenDiscussion(!genDiscussion)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name={genDiscussion ? "checkbox" : "square-outline"} size={24} color="#D32F2F" />
                <Text style={{ marginLeft: 10, fontSize: 14 }}>Discussion / Lecture Notes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setGenActivity(!genActivity)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name={genActivity ? "checkbox" : "square-outline"} size={24} color="#D32F2F" />
                <Text style={{ marginLeft: 10, fontSize: 14 }}>Activity / Hands-on Task</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setGenSummary(!genSummary)} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name={genSummary ? "checkbox" : "square-outline"} size={24} color="#D32F2F" />
                <Text style={{ marginLeft: 10, fontSize: 14 }}>Summary</Text>
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowGenerateModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, isGeneratingContent && styles.disabledButton]}
                onPress={handleGenerateLessonContent}
                disabled={isGeneratingContent}
              >
                {isGeneratingContent ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Generate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
GENERATE NEXT LESSON - MULTI TOPIC SELECTION MODAL
═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showNextLessonModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 380) : 520 }]}>
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Generate Next Lessons</Text>
                <Text style={styles.modalSubtitle}>
                  Select one or more topics from "{targetModuleForGen?.title}" to generate content.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowNextLessonModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* ✅ UPDATED: Check if there are any remaining topics after filtering */}
              {!targetModuleForGen?.topics || targetModuleForGen.topics.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#888', padding: 20 }}>
                {/* Check if it's a manual module (no syllabus title match) */}
                {(!currentSyllabus?.structure?.modules || 
                !currentSyllabus.structure.modules.some((m: any) => 
                  // ✅ SAFE: Check if targetModuleForGen and its title exist before comparing
                  targetModuleForGen?.title && 
                  String(m.moduleTitle || m.title).trim().toLowerCase() === 
                  String(targetModuleForGen.title).trim().toLowerCase()
                ))
                  ? "This is a manually created module. Topics are only available for modules defined in the uploaded Syllabus."
                  : "All topics for this module have already been generated!"}
              </Text>
              ) : (
                targetModuleForGen.topics.map((topic: any, idx: number) => {
                  const isSelected = selectedTopicsForGen.includes(topic.title);
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => toggleTopicSelection(topic.title)}
                      style={[
                        styles.materialChip,
                        { marginBottom: 8, minHeight: 50 },
                        isSelected && styles.materialChipActive
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? "checkbox" : "square-outline"}
                        size={22}
                        color={isSelected ? "#FFF" : "#D32F2F"}
                      />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.materialChipText, isSelected && styles.materialChipTextActive]}>
                          {topic.title}
                        </Text>
                        {topic.subtopics && topic.subtopics.length > 0 && (
                          <Text style={{ fontSize: 11, color: isSelected ? '#FFE0E0' : '#888', marginTop: 2 }}>
                            {topic.subtopics.length} subtopic(s): {topic.subtopics.slice(0, 3).join(', ')}
                            {topic.subtopics.length > 3 ? '...' : ''}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowNextLessonModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, (isGeneratingNextLessons || selectedTopicsForGen.length === 0) && styles.disabledButton]}
                onPress={handleGenerateNextLessons}
                disabled={isGeneratingNextLessons || selectedTopicsForGen.length === 0}
              >
                {isGeneratingNextLessons ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles-outline" size={18} color="#FFF" />
                    <Text style={styles.primaryButtonText}>Generate ({selectedTopicsForGen.length})</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
SYLLABUS UPLOAD CONFIRMATION MODAL
════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!pendingSyllabusFile}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingSyllabusFile(null)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 330) : 360 }]}>
            <Text style={[styles.createTitle, { textAlign: 'center', marginBottom: 10 }]}>Confirm Upload</Text>
            <View style={{ backgroundColor: '#F5F5F5', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' }}>
              <Ionicons name="document-text-outline" size={32} color="#D32F2F" style={{ marginBottom: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#333', textAlign: 'center' }} numberOfLines={2}>
                {pendingSyllabusFile?.name}
              </Text>
              {pendingSyllabusFile?.size && (
                <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                  Size: {(pendingSyllabusFile.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              )}
            </View>
            <Text style={{ fontSize: 13, color: '#555', textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              Please verify that this is the correct syllabus file.
              <Text style={{ fontWeight: '700', color: '#D32F2F' }}> Once uploaded, it cannot be replaced or deleted.</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setPendingSyllabusFile(null)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={confirmAndUploadSyllabus}
                disabled={isUploadingSyllabus}
              >
                {isUploadingSyllabus ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Confirm & Upload</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
LESSON EDIT MODAL (Direct Edit - No Preview Toggle)
══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showLessonPreviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLessonPreviewModal(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 400) : 800, maxHeight: height * 0.9 }]}>
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Edit Generated Lessons</Text>
                <Text style={styles.modalSubtitle}>Review and modify content before saving.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLessonPreviewModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {pendingGeneratedLessons.map((lesson, index) => (
                <View key={lesson.id || index} style={{ marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 20 }}>
                  {/* Lesson Header (No toggle button) */}
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#D32F2F', marginBottom: 12 }}>
                    Lesson {index + 1}: {lesson.title}
                  </Text>
                  {/* Always Show Edit Fields */}
                  <View style={{ gap: 12 }}>
                    <Text style={styles.sectionLabel}>Title</Text>
                    <TextInput
                      style={styles.inputBox}
                      value={lesson.title}
                      onChangeText={(text) => {
                        const updated = [...pendingGeneratedLessons];
                        updated[index] = { ...updated[index], title: text };
                        setPendingGeneratedLessons(updated);
                      }}
                    />
                    <Text style={styles.sectionLabel}>Description</Text>
                    <TextInput
                      style={[styles.textAreaBox, { minHeight: 60 }]}
                      value={lesson.description || ''}
                      onChangeText={(text) => {
                        const updated = [...pendingGeneratedLessons];
                        updated[index] = { ...updated[index], description: text };
                        setPendingGeneratedLessons(updated);
                      }}
                      multiline
                    />
                    <Text style={styles.sectionLabel}>Discussion</Text>
                    <TextInput
                      style={[styles.textAreaBox, { minHeight: 300 }]}
                      value={lesson.discussion || ''}
                      onChangeText={(text) => {
                        const updated = [...pendingGeneratedLessons];
                        updated[index] = { ...updated[index], discussion: text };
                        setPendingGeneratedLessons(updated);
                      }}
                      multiline
                      textAlignVertical="top"
                    />
                    <Text style={styles.sectionLabel}>Activity</Text>
                    <TextInput
                      style={[styles.textAreaBox, { minHeight: 300 }]}
                      value={lesson.activity || ''}
                      onChangeText={(text) => {
                        const updated = [...pendingGeneratedLessons];
                        updated[index] = { ...updated[index], activity: text };
                        setPendingGeneratedLessons(updated);
                      }}
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowLessonPreviewModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, isSavingGeneratedLessons && styles.disabledButton]}
                onPress={handleSavePreviewedLessons}
                disabled={isSavingGeneratedLessons}
              >
                {isSavingGeneratedLessons ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Lesson</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ── Saving overlay ── */}
      {isSaving && (
        <View style={styles.savingOverlay} pointerEvents="auto">
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color="#D32F2F" />
            <Text style={styles.savingTitle}>
              {activeTab === 'materials' ? 'Saving Material' : 'Saving Assignment'}
            </Text>
            <Text style={styles.savingMessage}>
              Please wait while your file and details are being stored in Firebase.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};
export default TeacherCourseDetail2;
// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  screenScroll: { flex: 1, backgroundColor: '#ffffff' },
  screenScrollContent: { paddingBottom: 40 },
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
  modalScrollContent: { paddingBottom: 10 },
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
  lessonChip: {
    backgroundColor: '#E3F2FD', // Light Blue background for lessons
    borderColor: '#90CAF9',
  },
  lessonChipText: {
    color: '#1565C0', // Darker blue text
  },
  lessonSubtext: {
    fontSize: 10,
    color: '#1976D2',
    marginTop: 2,
  },
  lessonSubtextActive: {
    color: '#E3F2FD',
  },
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
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    minHeight: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFF', fontWeight: '800' , textAlign: 'center'},
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
  previewContent: { fontSize: 14, color: '#444', lineHeight: 22, marginTop: 10 },
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