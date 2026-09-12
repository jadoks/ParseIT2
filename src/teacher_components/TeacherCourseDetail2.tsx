import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image'; // class banner photo, same caching/fade-in as the course cards
import * as Sharing from 'expo-sharing';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import * as XLSX from 'xlsx';
import Toast from '../Final_Admin_Components/Toast';
import { FONT_BODY, FONT_TITLE, WEIGHT_EMPHASIS, WEIGHT_TITLE } from '../theme/typography';
import TeacherAssignmentSection from './TeacherAssignmentSection';
import TeacherMaterialSection from './TeacherMaterialSection';
import TeacherSubmissionsSection from './TeacherSubmissionsSection';

// Same school letterhead assets used in Grades.tsx — shown as the default
// header/footer until an admin uploads a custom pair via "Manage Template".
const DefaultTemplateHeader = require('../../assets/images/myjourney-header-template-1.png');
const DefaultTemplateFooter = require('../../assets/images/footer.png');

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
  linkUrls?: Array<{ id: string; url: string } | string>;
  storagePath?: string | null;
  bucketPath?: string | null;
  // ✅ FIXED: full list of every file the student attached (source of truth).
  // fileName/fileUrl/fileType above are kept only as legacy mirrors of the
  // first file for backward compatibility — always read `files` for the
  // complete attachment list.
  files?: Array<{
    id?: string;
    fileName?: string;
    fileUrl?: string;
    fileType?: string;
    storagePath?: string | null;
    bucketPath?: string | null;
  }>;
};

export type ClassScheduleEntry = {
  days: string[];
  startTime: string;
  endTime: string;
  room?: string | null;
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
  schedule?: ClassScheduleEntry[];
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

// ─── Toast Context & Types ───────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms
};

type ToastContextType = {
  show: (type: ToastType, title: string, message?: string, duration?: number) => void;
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
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
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (value: number) => String(value).padStart(2, '0');

// 12-hour "YYYY-MM-DD hh:mm AM/PM" formatter for a resolved Date, used by
// formatDateTime below — mirrors formatDueDateForDisplay in Assignments.tsx
// so fetched timestamps (materials/assignments "posted", submission
// "submittedAt") render in the same 12-hour AM/PM style everywhere, instead
// of the locale-dependent (and often 24-hour) output of .toLocaleString().
const formatDateTime12h = (value: Date): string => {
  const datePart = `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  const hour24 = value.getHours();
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const timePart = `${pad(hour12)}:${pad(value.getMinutes())} ${meridiem}`;
  return `${datePart} ${timePart}`;
};

const formatDateTime = (value?: any) => {
  if (!value) return '';
  if (typeof value?.toDate === 'function') return formatDateTime12h(value.toDate());
  if (value?._seconds) return formatDateTime12h(new Date(value._seconds * 1000));
  if (value?.seconds) return formatDateTime12h(new Date(value.seconds * 1000));
  // Previously returned raw strings unchanged instead of formatting them,
  // which meant an ISO string like "2026-09-08T10:30:00.000Z" showed up
  // as-is instead of a readable date+time — and downstream code that
  // re-parsed it and called .toLocaleDateString() lost the time entirely.
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : formatDateTime12h(parsed);
  }
  return '';
};

const formatSyllabusDate = (value: any): string => {
  if (!value) return 'Recently';
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString();
  }
  if (typeof value?.toDate === 'function') {
    return value.toDate().toLocaleDateString();
  }
  if (value?._seconds) {
    return new Date(value._seconds * 1000).toLocaleDateString();
  }
  if (value?.seconds) {
    const multiplier = value.seconds > 10000000000 ? 1 : 1000;
    return new Date(value.seconds * multiplier).toLocaleDateString();
  }
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

// 12-hour "hh:mm AM/PM" version of the time, used only for display (e.g. the
// "Selected" preview under the Time field) — matches how the merged Time
// input itself is typed/shown, instead of the raw 24-hour value used for
// storage/parsing.
const formatTimeOnly12h = (value?: Date | null) => {
  if (!value) return '';
  const hour24 = value.getHours();
  const minute = value.getMinutes();
  const meridiem = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  return `${pad(hour12)}:${pad(minute)} ${meridiem}`;
};

// Display-only counterpart to formatDueDateTime: same date part, but the
// time part is 12-hour with AM/PM instead of 24-hour. Never use this for
// setFormDue()/storage — parseDueDateTime() expects the 24-hour format.
const formatDueDateTimeDisplay = (value?: Date | null) => {
  if (!value) return '';
  return `${formatDateOnly(value)} ${formatTimeOnly12h(value)}`;
};

// ---- Merged "Time" input helpers (typed HH:MM digits + AM/PM), matching
// the single-field time input used on the Teacher Dashboard's Create Class
// schedule blocks, instead of separate scrollable Hour / Minute lists.
const clampTimeDigits = (raw: string): string => {
  let out = raw.replace(/[^0-9]/g, '').slice(0, 4);
  if (out.length >= 2) {
    let hh = parseInt(out.slice(0, 2), 10);
    if (Number.isNaN(hh)) hh = 0;
    if (hh > 12) hh = 12;
    if (hh < 1 && out.length >= 2) hh = 1;
    out = pad(hh) + out.slice(2);
  }
  if (out.length >= 4) {
    let mm = parseInt(out.slice(2, 4), 10);
    if (Number.isNaN(mm)) mm = 0;
    if (mm > 59) mm = 59;
    out = out.slice(0, 2) + pad(mm);
  }
  return out;
};

const formatTimeDigitsForDisplay = (digits: string): string =>
  digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;

// Converts typed 12-hour digits ("0930") + AM/PM into 24-hour { hour, minute },
// or null while the typed value is incomplete/invalid.
const timeDigitsAndMeridiemToHourMinute = (
  digits: string,
  meridiem: 'AM' | 'PM'
): { hour: number; minute: number } | null => {
  if (digits.length !== 4) return null;
  const hour12 = parseInt(digits.slice(0, 2), 10);
  const minute = parseInt(digits.slice(2, 4), 10);
  if (Number.isNaN(hour12) || Number.isNaN(minute) || hour12 < 1 || hour12 > 12 || minute > 59) return null;
  let hour = hour12 % 12;
  if (meridiem === 'PM') hour += 12;
  return { hour, minute };
};

// Converts a 24-hour hour/minute pair back into typed digits + AM/PM, so
// opening the picker on an existing due date/time shows the right value.
const hourMinuteToTimeDigits = (hour: number, minute: number): { digits: string; meridiem: 'AM' | 'PM' } => {
  const meridiem: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  let hour12 = hour % 12;
  if (hour12 === 0) hour12 = 12;
  return { digits: `${pad(hour12)}${pad(minute)}`, meridiem };
};

// Single merged "Time" field: one text input for HH:MM digits plus an
// AM/PM toggle, replacing the separate scrollable Hour / Minute columns.
function DueTimeInputField({
  hour,
  minute,
  onChangeHourMinute,
}: {
  hour: number;
  minute: number;
  onChangeHourMinute: (hour: number, minute: number) => void;
}) {
  const initial = hourMinuteToTimeDigits(hour, minute);
  const [digits, setDigits] = useState(initial.digits);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>(initial.meridiem);
  const [isFocused, setIsFocused] = useState(false);

  // Keep the typed value in sync if the parent's date changes from
  // elsewhere (e.g. reopening the modal for a different assignment).
  useEffect(() => {
    const next = hourMinuteToTimeDigits(hour, minute);
    setDigits(next.digits);
    setMeridiem(next.meridiem);
  }, [hour, minute]);

  const commit = (nextDigits: string, nextMeridiem: 'AM' | 'PM') => {
    const result = timeDigitsAndMeridiemToHourMinute(nextDigits, nextMeridiem);
    if (result) onChangeHourMinute(result.hour, result.minute);
  };

  const handleChangeText = (text: string) => {
    const clamped = clampTimeDigits(text);
    setDigits(clamped);
    commit(clamped, meridiem);
  };

  const handleMeridiemPress = (nextMeridiem: 'AM' | 'PM') => {
    setMeridiem(nextMeridiem);
    commit(digits, nextMeridiem);
  };

  return (
    <View style={styles.timeInputRow}>
      <View style={[styles.timeTextInputWrap, isFocused && styles.timeTextInputWrapFocused]}>
        <TextInput
          value={formatTimeDigitsForDisplay(digits)}
          onChangeText={handleChangeText}
          placeholder="09:30"
          placeholderTextColor="#9AA0A6"
          keyboardType="number-pad"
          maxLength={5}
          style={styles.timeTextInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      <View style={styles.meridiemToggle}>
        <TouchableOpacity
          style={[styles.meridiemBtn, meridiem === 'AM' && styles.meridiemBtnActive]}
          onPress={() => handleMeridiemPress('AM')}
        >
          <Text style={[styles.meridiemBtnText, meridiem === 'AM' && styles.meridiemBtnTextActive]}>AM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.meridiemBtn, meridiem === 'PM' && styles.meridiemBtnActive]}
          onPress={() => handleMeridiemPress('PM')}
        >
          <Text style={[styles.meridiemBtnText, meridiem === 'PM' && styles.meridiemBtnTextActive]}>PM</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

// ─── Game Question Generation Limits ────────────────────────────────────────
const DAILY_GENERATION_LIMIT = 30;
const MAX_QUESTIONS_PER_GENERATION = 45;
const GENERATION_USAGE_KEY = 'teacher_question_gen_usage_v1';

const getTodayDateKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type GenerationUsageMap = Record<string, { date: string; count: number }>;

const readGenerationUsage = async (): Promise<GenerationUsageMap> => {
  try {
    if (Platform.OS === 'web') {
      const raw = typeof window !== 'undefined' ? window.localStorage?.getItem(GENERATION_USAGE_KEY) : null;
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
  const fileType = item.fileType || (fileName ? getMimeFromFileName(fileName) : undefined);
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
    item.status === 'submitted' || item.status === 'graded' || item.status === 'late'
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
    ? [item.linkUrl]
    : [],
  storagePath: item.storagePath || null,
  bucketPath: item.bucketPath || null,
  // ✅ FIXED: carry through every attached file, not just the legacy
  // singular fileUrl/fileName mirror of the first one.
  files: Array.isArray(item.files) ? item.files : [],
});

// ─── Viewer URL helpers ─────────────────────────────────────────────────────
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
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
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

// Strips markdown asterisks (bold "**text**", italics "*text*", and
// "* " bullet markers) so AI-generated content shows as plain text in the
// editable "Edit Generated Lessons" preview before it's saved.
const stripAsterisks = (text?: string | null): string => {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) => line.replace(/\*/g, '').replace(/^[ \t]+/, ''))
    .join('\n');
};

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
      /^\*+\s*\*/.test(contentToParse) ||
      /\*\*\*$/.test(contentToParse);

    if (hasInvalidBold) {
      const cleanedText = contentToParse.replace(/\*/g, "");
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
              <Text
                key={`${lineIndex}-${partIndex}`}
                style={[justifiedBaseStyle, isBold && { fontWeight: "bold" }]}
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

// ─── Inline Viewer ───────────────────────────────────────────────────────────
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
  loadingText: { fontFamily: FONT_BODY, marginTop: 12, color: '#666', fontSize: 14 },
  noWebViewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  noWebViewText: { fontFamily: FONT_BODY, color: '#888', textAlign: 'center', fontSize: 13, lineHeight: 20 },
});

// ─── Confirmation Modal (used for delete confirmations) ─────────────────────
const ConfirmationModal = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}) => {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlayCenter}>
        <View style={[styles.modalCardElevated, { width: 330 }]}>
          <Text style={[styles.createTitle, { textAlign: 'center', marginBottom: 10, color: '#D32F2F' }]}>
            {title}
          </Text>
          <Text style={{ fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 20 }}>
            {message}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { onCancel?.(); }}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
              <Text style={styles.primaryButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const TeacherCourseDetail2 = ({
  onBack,
  course,
  currentTeacher,
  availableCourses = [],
  initialAssignmentId,
  onInitialAssignmentHandled,
  initialCommentStudentId,
  onInitialCommentStudentHandled,
}: {
  onBack?: () => void;
  course?: CourseDetailData;
  currentTeacher: SignedInTeacher;
  availableCourses?: CourseDetailData[];
  // 👇 ADDED: Deep-link support — when set, automatically jump to the
  // Assignments tab and open the submissions screen for this assignment
  // (used when a teacher taps a "submitted-assignment" notification).
  initialAssignmentId?: string | null;
  onInitialAssignmentHandled?: () => void;
  // 👇 ADDED: Deep-link support — when set (alongside initialAssignmentId),
  // auto-selects this student and expands their comment thread once the
  // submissions screen opens (used for "assignment-comment" notifications).
  initialCommentStudentId?: string | null;
  onInitialCommentStudentHandled?: () => void;
}) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallPhone = width < 360;
  const isMobile = width < 768;

  // ─── Shared Toast (same component used across Admin/Teacher/Community/
  // Dashboard/ClassesScreen and SignIn) instead of the old bespoke toast
  // stack + inline confirmation UI. We keep the same `toast.show(...)` /
  // `toast.confirm(...)` call sites everywhere below by wrapping the shared
  // <Toast /> component in a small local object with the same shape as the
  // old ToastContext value.
  const [toastState, setToastState] = useState<{
    visible: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, message: '', type: 'success' });

  const [confirmation, setConfirmation] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const hideToast = () => {
    setToastState((prev) => ({ ...prev, visible: false }));
  };

  const toast = {
    show: (type: 'success' | 'error' | 'info' | 'warning', title: string, message?: string) => {
      // The shared Toast component supports success/error/info, so a
      // "warning" is shown using the error styling.
      const mappedType: 'success' | 'error' | 'info' = type === 'warning' ? 'error' : type;
      setToastState({
        visible: true,
        message: message ? `${title}: ${message}` : title,
        type: mappedType,
      });
    },
    confirm: (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void
    ) => {
      setConfirmation({ visible: true, title, message, onConfirm, onCancel });
    },
  };

  const closeConfirmation = () => setConfirmation(null);

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
  
  // ✅ NEW: Loading state for Export Grades
  const [isExportingGrades, setIsExportingGrades] = useState(false);

  const [dailyGenerationsUsed, setDailyGenerationsUsed] = useState<number>(0);
  
  // Note: showDeleteLessonModal is kept for internal logic but triggered via toast.confirm now
  const [showDeleteLessonModal, setShowDeleteLessonModal] = useState(false); 
  const [isDeletingLesson, setIsDeletingLesson] = useState(false);

  const parsedQuestionCount = parseInt(numberOfQuestions, 10) || 0;
  const isInvalidQuestionCount =
    parsedQuestionCount > MAX_QUESTIONS_PER_GENERATION || parsedQuestionCount < 1;

  const [pendingGeneratedLessons, setPendingGeneratedLessons] = useState<any[]>([]);
  const [showLessonPreviewModal, setShowLessonPreviewModal] = useState(false);
  const [editingPreviewIndex, setEditingPreviewIndex] = useState<number | null>(null);
  const [isSavingGeneratedLessons, setIsSavingGeneratedLessons] = useState(false);

  const [showNextLessonModal, setShowNextLessonModal] = useState(false);
  const [selectedTopicsForGen, setSelectedTopicsForGen] = useState<string[]>([]);
  const [isGeneratingNextLessons, setIsGeneratingNextLessons] = useState(false);
  const [targetModuleForGen, setTargetModuleForGen] = useState<any>(null);

  const [showModuleSelectionModal, setShowModuleSelectionModal] = useState(false);
  const [selectedModulesForGen, setSelectedModulesForGen] = useState<string[]>([]);
  const [isGeneratingModules, setIsGeneratingModules] = useState(false);

  const [activeTab, setActiveTab] = useState<"materials" | "assignments" | "modules">('modules');
  // Tabs are mounted lazily (only once first visited) and then kept alive and
  // simply hidden/shown via `display` instead of being unmounted on every
  // switch. Swapping between conditional JSX trees (as this screen used to
  // do) forces React to tear down and rebuild the whole subtree — including
  // re-laying-out every nested ScrollView and re-decoding any images — which
  // is what made tapping "Course Resources" / "Assignments" feel janky even
  // though the content itself was correct. Keeping the mounted tabs alive
  // avoids that remount cost on every tap.
  const [mountedTabs, setMountedTabs] = useState<Record<string, boolean>>({ modules: true });
  useEffect(() => {
    setMountedTabs((prev) => (prev[activeTab] ? prev : { ...prev, [activeTab]: true }));
  }, [activeTab]);
  const [showSubmissions, setShowSubmissions] = useState(false);
  
  const cleanModuleTitle = (title: string, moduleNumber: number) => {
    let cleaned = title.replace(/^Module\s+\d+[:.\s]*/i, '').trim();
    return cleaned || `Module ${moduleNumber}`;
  };

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedGenModule, setSelectedGenModule] = useState<any>(null);
  const [selectedGenTopic, setSelectedGenTopic] = useState<any>(null);
  const [selectedGenSubtopic, setSelectedGenSubtopic] = useState<string | null>(null);
  // NOTE: individual Discussion/Activity/Summary toggles were removed — every
  // Student Activity Sheet section is now generated together and is required.
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const [modules, setModules] = useState<any[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [aiPreviewData, setAiPreviewData] = useState<any>(null);
  const [aiPreviewType, setAiPreviewType] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiLoadingType, setAiLoadingType] = useState<string>('');

  const [currentSyllabus, setCurrentSyllabus] = useState<any>(null);
  const [isUploadingSyllabus, setIsUploadingSyllabus] = useState(false);
  const [isDeletingSyllabus, setIsDeletingSyllabus] = useState(false);
  const [isEditingSyllabus, setIsEditingSyllabus] = useState(false); // true = replacing an existing syllabus (vs. first upload)
  const [syllabusViewerUrl, setSyllabusViewerUrl] = useState<string | null>(null);
  const [pendingSyllabusFile, setPendingSyllabusFile] = useState<{
    name?: string;
    uri?: string;
    mimeType?: string;
    size?: number;
    base64?: string;
    file?: File;
  } | null>(null);

  const [generatedStructure, setGeneratedStructure] = useState<any>(null);
  const [isGeneratingStructure, setIsGeneratingStructure] = useState(false);
  const [showStructurePreviewModal, setShowStructurePreviewModal] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<number, boolean>>({});

  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [isLessonLoading, setIsLessonLoading] = useState(false);
  const [lessonDetailModalVisible, setLessonDetailModalVisible] = useState(false);

  const [showManualModuleModal, setShowManualModuleModal] = useState(false);
  const [showManualLessonModal, setShowManualLessonModal] = useState(false);
  const [selectedModuleForLesson, setSelectedModuleForLesson] = useState<any>(null);

  const [newModuleNum, setNewModuleNum] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [newModuleDesc, setNewModuleDesc] = useState('');
  const [newModuleWeek, setNewModuleWeek] = useState('');

  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDesc, setNewLessonDesc] = useState('');
  const [newLessonDiscussion, setNewLessonDiscussion] = useState('');
  const [newLessonActivity, setNewLessonActivity] = useState('');
  const [newLessonFile, setNewLessonFile] = useState<PickedUploadFile>(null);
  const [lessonMode, setLessonMode] = useState<'text' | 'file'>('text');
  const [showLessonModeDropdown, setShowLessonModeDropdown] = useState(false);

  // ─── SAS (Student Activity Sheet) template fields — Manual Lesson form ─────
  // Every section below is REQUIRED, mirroring the CTU Student Activity Sheet
  // format. Lists/pairs are entered one-per-line as plain text and parsed on
  // submit — see parseLinesToArray / parsePipePairs helpers.
  const [newLessonObjectivesText, setNewLessonObjectivesText] = useState('');       // Intended Learning Outcomes, one per line
  const [newLessonMaterialsText, setNewLessonMaterialsText] = useState('');         // Materials, one per line
  const [newLessonReferencesText, setNewLessonReferencesText] = useState('');       // References, one per line
  const [newLessonSdgText, setNewLessonSdgText] = useState('');                     // "SDG # 4 – Quality Education | Description" per line
  const [newLessonPrepResourcesText, setNewLessonPrepResourcesText] = useState(''); // "Label | https://url" per line
  const [newLessonPrepActivityTitle, setNewLessonPrepActivityTitle] = useState('');
  const [newLessonPrepInstructions, setNewLessonPrepInstructions] = useState('');
  const [newLessonPrepGuideQuestionsText, setNewLessonPrepGuideQuestionsText] = useState(''); // one per line
  const [newLessonPrepTransition, setNewLessonPrepTransition] = useState('');
  const [newLessonKeyTermsText, setNewLessonKeyTermsText] = useState('');           // "Term | Meaning" per line
  const [newLessonTakeawaysText, setNewLessonTakeawaysText] = useState('');         // one per line
  const [newLessonGuidedPractice, setNewLessonGuidedPractice] = useState('');

  // Helpers: turn a "one item per line" textarea into a clean string[]
  const parseLinesToArray = (text: string): string[] =>
    (text || '').split('\n').map(l => l.trim()).filter(Boolean);

  // Helper: turn a "Left | Right" per-line textarea into [{a,b}] pairs
  const parsePipePairs = (text: string): { a: string; b: string }[] =>
    (text || '')
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
      .map(line => {
        const [a, b] = line.split('|').map(s => (s || '').trim());
        return { a: a || '', b: b || '' };
      });

  // Helper: turn string[] back into "one per line" text (for prefilling on edit)
  const arrayToLines = (arr?: string[] | null): string =>
    Array.isArray(arr) ? arr.join('\n') : '';

  // Helper: turn [{a,b}] pairs back into "a | b" per-line text (for prefilling on edit)
  const pairsToLines = (arr: any[] | null | undefined, aKey: string, bKey: string): string =>
    Array.isArray(arr) ? arr.map(item => `${item?.[aKey] || ''} | ${item?.[bKey] || ''}`).join('\n') : '';

  // ─── Course Template (school-wide header/footer) ───────────────────────────
  // One global template shared by every teacher/course. Fetched once on
  // mount and reused wherever a lesson is previewed, edited, or generated.
  const [courseTemplate, setCourseTemplate] = useState<{ headerUrl: string | null; footerUrl: string | null }>({
    headerUrl: null,
    footerUrl: null,
  });
  const [isLoadingCourseTemplate, setIsLoadingCourseTemplate] = useState(false);
  const [showManageTemplateModal, setShowManageTemplateModal] = useState(false);
  const [templateHeaderPick, setTemplateHeaderPick] = useState<PickedUploadFile>(null);
  const [templateFooterPick, setTemplateFooterPick] = useState<PickedUploadFile>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const [viewerMaterial, setViewerMaterial] = useState<Material | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [editMatTitle, setEditMatTitle] = useState('');
  const [editMatWeek, setEditMatWeek] = useState('');
  const [editMatContent, setEditMatContent] = useState('');
  const [editMatPickedFile, setEditMatPickedFile] = useState<PickedUploadFile>(null);
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [isDeletingMaterial, setIsDeletingMaterial] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showMaterialPreviewModal, setShowMaterialPreviewModal] = useState(false);
  const [selectedMaterialPreview, setSelectedMaterialPreview] = useState<Material | null>(null);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hasSubmissionsForSelected = useMemo(() => {
    if (!selectedId) return false;
    return submissions.some((s) => s.assignmentId === selectedId);
  }, [selectedId, submissions]);

  // ✅ NEW: Used to disable the "Export Scores" button when there's clearly
  // nothing gradable to export yet. This only reflects graded *assignment*
  // submissions, since game scores live on the server and are only fetched
  // at export time — the export handler itself still does the definitive
  // check (covering game scores too) before writing the file.
  const hasGradedAssignmentScores = useMemo(
    () => submissions.some((s) => s.status === 'graded' && typeof s.score === 'number'),
    [submissions]
  );

  // 👇 ADDED: Deep-link handling — when navigated here from a
  // "submitted-assignment" notification, jump straight to the Assignments
  // tab and open the submissions screen for that assignment as soon as it
  // shows up in the loaded `assignments` list.
  //
  // NOTE: the backend is inconsistent about what it puts in `relatedId` for
  // this notification type — most submission paths store the *submission*
  // id (relatedType "class-submission"), but the stackable game-assignment
  // path stores the *assignment* id directly. So we try both: look it up as
  // a submission first (and resolve its assignmentId), then fall back to
  // treating it as an assignment id.
  useEffect(() => {
    if (!initialAssignmentId) return;

    const matchingSubmission = submissions.find((s) => s.id === initialAssignmentId);
    const resolvedAssignmentId = matchingSubmission
      ? matchingSubmission.assignmentId
      : initialAssignmentId;

    const target = assignments.find((a) => a.id === resolvedAssignmentId);
    if (!target) return;

    setActiveTab('assignments');
    setSelectedId(target.id);
    setShowSubmissions(true);
    onInitialAssignmentHandled?.();
  }, [initialAssignmentId, assignments, submissions, onInitialAssignmentHandled]);
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
  
  // Removed resultModal states
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  // Measured width of the "Regular Submission" type chip in the Create
  // Assignment modal (desktop only), so the Upload File and Save buttons
  // there can match it exactly instead of stretching full-width. The chip
  // itself has no fixed width (flex: 1), so we read it via onLayout.
  const [regularSubmissionChipWidth, setRegularSubmissionChipWidth] = useState<number | null>(null);
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
  // ✅ NEW: Assignment Type is now a dropdown (same pattern as the
  // Assignments.tsx filter dropdown, and the Game Type dropdown below)
  // instead of the old two-chip toggle.
  const [showAssignmentTypeDropdown, setShowAssignmentTypeDropdown] = useState(false);
  // ✅ FIX: On desktop, the "Assignment Type" / "Select Game" dropdown menus
  // used to be plain absolutely-positioned Views living inside the form's
  // normal layout tree. Other fields further down the form (Header,
  // Instruction, etc.) could end up painting ON TOP of the open menu
  // instead of the menu sitting in front of them. We now open the menu
  // inside a transparent Modal (same trick already used on mobile), which
  // always paints above everything else, and we measure the trigger's
  // on-screen position first so the menu still appears anchored directly
  // under the button like before.
  const assignmentTypeTriggerRef = useRef<any>(null);
  const gameTypeTriggerRef = useRef<any>(null);
  const [assignmentTypeMenuRect, setAssignmentTypeMenuRect] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);
  const [gameTypeMenuRect, setGameTypeMenuRect] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);
  const [extraQuestionsCount, setExtraQuestionsCount] = useState<string>('5');
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  const gameOptions = [
    { value: 'quiz_master', label: 'Quiz Master', desc: 'Timed, auto-graded questions from materials' },
    { value: 'memory_match', label: 'Memory Match', desc: 'Match terms ↔ definitions' },
    { value: 'fill_in_blanks', label: 'Fill-in-the-Blanks', desc: 'Complete missing keywords' },
    { value: 'flashcard', label: 'Flashcard Challenge', desc: 'Review flashcards & answer questions' },
  ];

  // ✅ NEW: options for the Assignment Type dropdown.
  // "Regular Submission" → "Standard Assignment"
  // "Game Based Assignment" → "Game-Based Learning Assignment"
  const assignmentTypeOptions: { value: 'regular' | 'game_based'; label: string; desc?: string }[] = [
    { value: 'regular', label: 'Standard Assignment', desc: 'Students submit files or links for grading' },
    { value: 'game_based', label: 'Game-Based Learning Assignment', desc: 'Students play an interactive game to earn points' },
  ];

  // Replaced showResultModal with toast.show
  // Note: We keep the signature for compatibility but it now uses toast
  const showResultModal = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    const toastType: ToastType = type === 'info' ? 'info' : type;
    toast.show(toastType, title, message);
  };

  const mapModule = (item: any): any => {
    return {
      ...item,
      moduleNumber: Number(item.moduleNumber) || 0,
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
      await loadCourseContent();
      toast.show('success', 'Deleted', 'Lesson deleted successfully.');
    } catch (error: any) {
      toast.show('error', 'Delete Failed', error?.message || 'Unable to delete lesson.');
    } finally {
      setIsDeletingLesson(false);
    }
  };

  const loadCourseContent = async (silent: boolean = false) => {
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
  if (!silent) setIsLoadingModules(true);
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
      if (!silent) setIsLoadingModules(false);
    }
  }

  useEffect(() => {
    loadCourseContent();
  }, [course?.id]);

  // Course template is global/school-wide, so it only needs to be fetched
  // once — it isn't tied to this particular course.
  const loadCourseTemplate = async () => {
    setIsLoadingCourseTemplate(true);
    try {
      const response = await fetch(`${API_BASE_URL}/course-template`, { credentials: 'include' });
      const data = await response.json();
      if (response.ok && data?.success) {
        setCourseTemplate({
          headerUrl: data.data?.headerUrl || null,
          footerUrl: data.data?.footerUrl || null,
        });
      }
    } catch (error) {
      console.error('Failed to load course template:', error);
    } finally {
      setIsLoadingCourseTemplate(false);
    }
  };

  useEffect(() => {
    loadCourseTemplate();
  }, []);

  useEffect(() => {
    (async () => {
      const { count } = await getTodayUsageForTeacher(teacherIdentity);
      setDailyGenerationsUsed(count);
    })();
  }, [teacherIdentity]);

  // Tracks whether ANY modal/preview/confirmation is currently open, so the
// background poller never yanks content out from under an in-progress edit.
const isOverlayOpenRef = useRef(false);
useEffect(() => {
  isOverlayOpenRef.current =
    showEditMaterialModal ||
    showCreateModal ||
    showUpdateModal ||
    showMaterialPreviewModal ||
    showDateTimeModal ||
    showGameTypeModal ||
    showGeneratedPreview ||
    !!aiPreviewData ||
    !!syllabusViewerUrl ||
    lessonDetailModalVisible ||
    showManualModuleModal ||
    showManualLessonModal ||
    showStructurePreviewModal ||
    showGenerateModal ||
    showNextLessonModal ||
    showModuleSelectionModal ||
    !!pendingSyllabusFile ||
    showLessonPreviewModal ||
    showManageTemplateModal ||
    !!viewerMaterial ||
    !!confirmation?.visible;
});

// Silent background refresh — picks up new student submissions, new
// materials/assignments/modules, etc. while the teacher stays on this screen.
useEffect(() => {
  if (!course?.id) return;
  const intervalId = setInterval(() => {
    if (isOverlayOpenRef.current) return; // paused — something's open
    loadCourseContent(true);
  }, 12000); // every 12s, tweak to taste
  return () => clearInterval(intervalId);
}, [course?.id]);

  const handleGenerateLessonContent = async () => {
    if (!selectedGenModule || !selectedGenTopic) {
      toast.show('error', 'Error', 'Please select a Module and Topic.');
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
          moduleId: selectedGenModule.moduleNumber || selectedGenModule.id,
          topicTitle: selectedGenTopic.title,
          subtopicTitle: selectedGenSubtopic
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      toast.show('success', 'Generated!', 'Lesson content generated successfully.');
      setShowGenerateModal(false);
      setSelectedGenModule(null);
      setSelectedGenTopic(null);
      setSelectedGenSubtopic(null);
    } catch (error: any) {
      toast.show('error', 'Generation Failed', error?.message || 'Failed to generate content.');
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const saveModuleLessonsToBackend = async (moduleId: string, lessons: any[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/course-modules/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          moduleData: {
            id: moduleId,
            courseId: course?.id,
            lessons: lessons
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

  const handleOpenLessonDetail = async (lesson: any) => {
    setSelectedLesson(lesson);
    setLessonDetailModalVisible(true);
    setIsLessonLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/course-lessons/${lesson.id}`, {
        credentials: 'include'
      });
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

  // A saved courseModule is only eligible for "Generate Next Lesson" if it
  // genuinely corresponds to a module in the uploaded syllabus. We can't rely
  // on the stored `type` field for this: every module — whether created via
  // "Generate Module" (syllabus-sourced) or "Create Module Manually"
  // (teacher-typed) — goes through the same backend endpoint, which always
  // stamps type: "manual". So instead we match on TITLE ALONE: a saved
  // module's title is copied verbatim from the syllabus module's title at
  // creation time, so a 100% (case-insensitive, trimmed) title match reliably
  // identifies the source syllabus module. We deliberately do NOT also
  // require moduleNumber to match — moduleNumber is just a sequential slot
  // position, and once a teacher manually creates a module in between two
  // AI-generated ones, a later syllabus module's number stops lining up with
  // the saved module's number even though the title still matches perfectly.
  // Requiring both caused correctly-generated modules to be treated as
  // "unmatched" and lose access to their syllabus subtopics.
  const findMatchingSyllabusModule = (savedModule: any) => {
    if (!currentSyllabus?.structure?.modules || !savedModule?.title) return null;
    const savedTitle = String(savedModule.title).trim().toLowerCase();
    return currentSyllabus.structure.modules.find(
      (m: any) =>
        String(m.moduleTitle || m.title || '').trim().toLowerCase() === savedTitle
    ) || null;
  };

  const handleOpenNextLessonModal = (savedModule: any) => {
    const syllabusMod = findMatchingSyllabusModule(savedModule);
    // Each syllabus "topic" can bundle several subtopics (e.g. "Course
    // Orientation and SQA Fundamentals" -> VMGO, Intro to Testing, Intro to
    // SQA...). We want the teacher to pick individual SUBTOPICS to generate —
    // each selected subtopic becomes its own lesson — rather than one lesson
    // per bundled topic. Topics without explicit subtopics fall back to using
    // the topic title itself as a single selectable item.
    let availableTopics: any[] = [];
    if (syllabusMod && syllabusMod.topics) {
      const existingLessonTitles = new Set(
        (savedModule.lessons || []).map((l: any) => l.title.toLowerCase().trim())
      );
      availableTopics = syllabusMod.topics
        .map((topic: any) => {
          const rawSubtopics = Array.isArray(topic.subtopics) && topic.subtopics.length > 0
            ? topic.subtopics
            : [topic.title];
          const remainingSubtopics = rawSubtopics.filter(
            (sub: string) => !existingLessonTitles.has(String(sub).toLowerCase().trim())
          );
          return { ...topic, subtopics: remainingSubtopics };
        })
        .filter((topic: any) => topic.subtopics.length > 0);
    }
    setTargetModuleForGen({
      ...savedModule,
      topics: availableTopics
    });
    setSelectedTopicsForGen([]);
    setShowNextLessonModal(true);
  };

  const toggleTopicSelection = (subtopicTitle: string) => {
    setSelectedTopicsForGen(prev =>
      prev.includes(subtopicTitle)
        ? prev.filter(t => t !== subtopicTitle)
        : [...prev, subtopicTitle]
    );
  };

  const handleGenerateNextLessons = async () => {
    if (!targetModuleForGen || selectedTopicsForGen.length === 0 || !course?.id) {
      toast.show('error', 'Error', 'Please select at least one topic.');
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
      const meta = data.meta || null;
      if (data.data && data.data.lessons && data.data.lessons.length > 0) {
        const plainTextLessons = data.data.lessons.map((l: any) => ({
          ...l,
          title: stripAsterisks(l.title),
          description: stripAsterisks(l.description),
          discussion: stripAsterisks(l.discussion),
          activity: stripAsterisks(l.activity),
        }));
        setPendingGeneratedLessons(plainTextLessons);
        setEditingPreviewIndex(0);
        setShowLessonPreviewModal(true);
        const generatedCount = data.data.lessons.length;
        const failedCount = meta?.failed?.length || 0;
        const skippedCount = meta?.skipped?.length || 0;
        if (failedCount > 0 || skippedCount > 0) {
          const parts = [`${generatedCount} lesson(s) generated`];
          if (skippedCount > 0) parts.push(`${skippedCount} already existed`);
          if (failedCount > 0) parts.push(`${failedCount} failed — you can retry those individually`);
          toast.show('info', 'Generated with some issues', `${parts.join(', ')}. Review and edit before saving.`);
        } else {
          toast.show(
            'success',
            'Generated!',
            generatedCount > 1 ? `${generatedCount} lessons generated. Review and edit before saving.` : 'Review and edit the content before saving.'
          );
        }
      } else {
        toast.show('info', 'No New Content', 'No new lessons were generated or they already exist.');
      }
      setShowNextLessonModal(false);
    } catch (error: any) {
      toast.show('error', 'Generation Failed', error?.message || 'Unable to generate lessons.');
    } finally {
      setIsGeneratingNextLessons(false);
    }
  };

  const handleSavePreviewedLessons = async () => {
    if (!targetModuleForGen || pendingGeneratedLessons.length === 0) return;
    setIsSavingGeneratedLessons(true);
    try {
      let currentMax = 0;
      try {
        const modulesRes = await fetch(`${API_BASE_URL}/course-modules/${course?.id}`, {
          credentials: 'include'
        });
        if (modulesRes.ok) {
          const allModules = await modulesRes.json();
          const targetMod = allModules.find((m: any) => m.id === targetModuleForGen.id);
          if (targetMod && Array.isArray(targetMod.lessons)) {
            currentMax = targetMod.lessons.reduce((max: number, l: any) =>
              Math.max(max, Number(l.lessonNumber) || 0), 0
            );
          }
        }
      } catch (e) {
        console.warn("Failed to sync max lesson number for AI save, using local state");
        currentMax = (targetModuleForGen.lessons || []).reduce((max: number, l: any) =>
          Math.max(max, Number(l.lessonNumber) || 0), 0
        );
      }

      const promises = pendingGeneratedLessons.map(async (lesson, idx) => {
        const payload = {
          classId: course?.id,
          moduleId: targetModuleForGen.id,
          title: lesson.title,
          description: lesson.description,
          discussion: lesson.discussion,
          activity: lesson.activity,
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
      await loadCourseContent();
      setShowLessonPreviewModal(false);
      setPendingGeneratedLessons([]);
      toast.show('success', 'Saved!', `${pendingGeneratedLessons.length} lesson(s) saved successfully.`);
    } catch (error: any) {
      toast.show('error', 'Save Failed', error?.message || 'Failed to save some lessons.');
    } finally {
      setIsSavingGeneratedLessons(false);
    }
  };

  // A module title counts as a duplicate regardless of whether the existing
  // module was AI-generated or manually created — normalized (trimmed,
  // case-insensitive) so "javascript design patterns" === "JavaScript Design Patterns".
  const isDuplicateModuleTitle = modules.some(
    (m) => (m.title || '').trim().toLowerCase() === newModuleTitle.trim().toLowerCase() && newModuleTitle.trim() !== ''
  );

  // A lesson title counts as a duplicate against any other lesson already in
  // the SAME module (AI-generated or manually created), normalized the same
  // way as module titles. When editing an existing lesson, that lesson's own
  // (unchanged) title doesn't count against itself.
  const isDuplicateLessonTitle = (() => {
    const trimmedTitle = newLessonTitle.trim();
    if (!trimmedTitle || !selectedModuleForLesson) return false;
    const lessons = Array.isArray(selectedModuleForLesson.lessons) ? selectedModuleForLesson.lessons : [];
    return lessons.some((l: any) => {
      if (isEditingLesson && selectedLesson?.id && l.id === selectedLesson.id) return false;
      return (l.title || '').trim().toLowerCase() === trimmedTitle.toLowerCase();
    });
  })();

  const handleCreateManualModule = async () => {
    const num = Number(newModuleNum);
    if (!newModuleTitle.trim() || !course?.id) {
      toast.show('error', 'Error', 'Please enter a title.');
      return;
    }
    if (isDuplicateModuleTitle) {
      toast.show('error', 'Duplicate Title', 'A module with this title already exists (generated or manual). Please use a different title.');
      return;
    }
    if (isNaN(num) || num < 1) {
      toast.show('error', 'Invalid Number', 'Module number generation failed.');
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
      setShowManualModuleModal(false);
      setNewModuleNum('');
      setNewModuleTitle('');
      setNewModuleDesc('');
      setNewModuleWeek('');
      await loadCourseContent();
      toast.show('success', 'Success', `Module ${num} created successfully!`);
    } catch (e: any) {
      console.error("Create Manual Module Error:", e);
      toast.show('error', 'Error', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateManualLesson = async () => {
    if (!newLessonTitle.trim() || !selectedModuleForLesson?.id || !course?.id) {
      toast.show('error', 'Error', 'Please enter a title and select a module.');
      return;
    }
    if (isDuplicateLessonTitle) {
      toast.show('error', 'Duplicate Title', 'A lesson with this title already exists in this module (generated or manual). Please use a different title.');
      return;
    }
    // ─── SAS sections are REQUIRED for text-mode lessons (not applicable when uploading a file) ───
    if (lessonMode === 'text') {
      const sasRequiredChecks: [boolean, string][] = [
        [!newLessonDiscussion.trim(), 'Concept Notes / Discussion'],
        [!newLessonActivity.trim(), 'Compu-Skill / Performance Task'],
        [parseLinesToArray(newLessonObjectivesText).length === 0, 'Intended Learning Outcomes'],
        [parseLinesToArray(newLessonMaterialsText).length === 0, 'Materials'],
        [parseLinesToArray(newLessonReferencesText).length === 0, 'References'],
        [parsePipePairs(newLessonSdgText).length === 0, 'SDG Integration'],
        [!newLessonPrepActivityTitle.trim() || !newLessonPrepInstructions.trim(), 'Lesson Preparation activity'],
        [parseLinesToArray(newLessonPrepGuideQuestionsText).length === 0, 'Lesson Preparation guide questions'],
        [!newLessonPrepTransition.trim(), 'Lesson Preparation transition'],
        [parsePipePairs(newLessonKeyTermsText).length === 0, 'Key Terms'],
        [parseLinesToArray(newLessonTakeawaysText).length === 0, 'Take Aways'],
        [!newLessonGuidedPractice.trim(), 'Guided Practice'],
      ];
      const missing = sasRequiredChecks.filter(([isMissing]) => isMissing).map(([, label]) => label);
      if (missing.length > 0) {
        toast.show('error', 'Missing Sections', `Please fill in: ${missing.join(', ')}.`);
        return;
      }
    }
    setIsSaving(true);
    try {
      const payload: any = {
        classId: course.id,
        moduleId: selectedModuleForLesson.id,
        title: newLessonTitle.trim(),
        description: newLessonDesc.trim(),
        type: lessonMode,
      };
      if (lessonMode === 'text') {
        payload.discussion = newLessonDiscussion.trim();
        payload.activity = newLessonActivity.trim();
        // ─── SAS template fields ───
        payload.objectives = parseLinesToArray(newLessonObjectivesText);
        payload.materials = parseLinesToArray(newLessonMaterialsText);
        payload.references = parseLinesToArray(newLessonReferencesText);
        payload.sdgIntegration = parsePipePairs(newLessonSdgText).map(p => ({ sdg: p.a, description: p.b }));
        payload.lessonPrep = {
          resources: parsePipePairs(newLessonPrepResourcesText).map(p => ({ label: p.a, url: p.b })),
          activityTitle: newLessonPrepActivityTitle.trim(),
          instructions: newLessonPrepInstructions.trim(),
          guideQuestions: parseLinesToArray(newLessonPrepGuideQuestionsText),
          transition: newLessonPrepTransition.trim(),
        };
        payload.keyTerms = parsePipePairs(newLessonKeyTermsText).map(p => ({ term: p.a, meaning: p.b }));
        payload.takeaways = parseLinesToArray(newLessonTakeawaysText);
        payload.guidedPractice = newLessonGuidedPractice.trim();
      } else if (lessonMode === 'file' && newLessonFile) {
        payload.fileBase64 = newLessonFile.base64;
        payload.fileName = newLessonFile.name;
        payload.fileType = newLessonFile.type;
      }

      let response;
      let data;
      if (isEditingLesson && selectedLesson?.id) {
        response = await fetch(`${API_BASE_URL}/course-lessons/${selectedLesson.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to update lesson');
        toast.show('success', 'Updated', 'Lesson updated successfully.');
      } else {
        response = await fetch(`${API_BASE_URL}/course-lessons/create-manual`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create lesson');
        toast.show('success', 'Success', 'Lesson created successfully.');
      }
      setShowManualLessonModal(false);
      resetLessonForm();
      setIsEditingLesson(false);
      setSelectedLesson(null);
      await loadCourseContent();
    } catch (e: any) {
      console.error(e);
      toast.show('error', 'Error', e.message || 'An unexpected error occurred.');
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
    setIsEditingLesson(false);
    setShowLessonModeDropdown(false);
    // ─── SAS template fields ───
    setNewLessonObjectivesText('');
    setNewLessonMaterialsText('');
    setNewLessonReferencesText('');
    setNewLessonSdgText('');
    setNewLessonPrepResourcesText('');
    setNewLessonPrepActivityTitle('');
    setNewLessonPrepInstructions('');
    setNewLessonPrepGuideQuestionsText('');
    setNewLessonPrepTransition('');
    setNewLessonKeyTermsText('');
    setNewLessonTakeawaysText('');
    setNewLessonGuidedPractice('');
  };

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
      toast.show('error', 'AI Error', error?.message || 'Failed to generate AI content.');
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
      toast.show('success', 'Saved', 'Module updated successfully.');
    } catch (error: any) {
      toast.show('error', 'Save Failed', error?.message || 'Failed to save module.');
    }
  };

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
      if (result.canceled || !result.assets?.[0]) {
        setIsEditingSyllabus(false);
        return;
      }
      const asset = result.assets[0];
      if (asset.size && asset.size > 20 * 1024 * 1024) {
        toast.show('error', 'File Too Large', 'File exceeds maximum size of 20 MB.');
        setIsEditingSyllabus(false);
        return;
      }
      const ext = asset.name?.split('.').pop()?.toLowerCase();
      const allowedExts = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'png', 'jpg', 'jpeg', 'webp'];
      if (!ext || !allowedExts.includes(ext)) {
        toast.show('error', 'Unsupported File', 'Please upload a supported file type (PDF, DOCX, PPTX, etc.).');
        setIsEditingSyllabus(false);
        return;
      }
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
      toast.show('error', 'Error', 'Failed to pick file.');
      setIsEditingSyllabus(false);
    }
  };

  const confirmAndUploadSyllabus = async () => {
    if (!pendingSyllabusFile || !course?.id) return;
    setIsUploadingSyllabus(true);
    setPendingSyllabusFile(null);
    try {
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
      if (!response.ok) {
        if (data.code === 'INVALID_SYLLABUS') {
          toast.show(
            'error',
            'Invalid Syllabus',
            data.error || 'This file doesn\'t look like a valid syllabus — no "Week No." or weekly schedule was found. Please upload the actual course syllabus.'
          );
          return;
        }
        throw new Error(data.error || 'Upload failed.');
      }
      setCurrentSyllabus(data.syllabus);
      const wasEdit = isEditingSyllabus;
      if (data.syllabus?.structure && data.syllabus.structure.modules) {
        toast.show(
          'success',
          wasEdit ? 'Syllabus Replaced' : 'Syllabus Uploaded',
          wasEdit
            ? 'Syllabus updated successfully! New "Generate Module" clicks will use the updated syllabus.'
            : 'Syllabus parsed successfully! Click "Generate Module 1" to create course content.'
        );
      } else {
        toast.show(
          'info',
          'Upload Complete',
          wasEdit
            ? 'Syllabus replaced. Auto-parsing could not extract structure. You can generate modules manually or try uploading a different file.'
            : 'Syllabus uploaded. Auto-parsing could not extract structure. You can generate modules manually or try uploading a different file.'
        );
      }
    } catch (error: any) {
      console.error('Syllabus upload error:', error);
      toast.show('error', 'Upload Failed', error?.message || 'Failed to upload syllabus.');
    } finally {
      setIsUploadingSyllabus(false);
      setIsEditingSyllabus(false);
    }
  };

  // Edit = replace the current syllabus file with an updated one (e.g. after CTU
  // standards revise the course syllabus). Reuses the same picker/upload flow as
  // the initial upload, just flagged so we can tailor the confirmation copy.
  const handleEditSyllabus = () => {
    setIsEditingSyllabus(true);
    handlePickSyllabus();
  };

  const handleDeleteSyllabus = () => {
    if (!currentSyllabus?.id) return;
    toast.confirm(
      'Delete Syllabus',
      `Are you sure you want to delete "${currentSyllabus.fileName}"? This will remove the file and its parsed structure. Modules and lessons already generated will not be deleted.`,
      async () => {
        setIsDeletingSyllabus(true);
        try {
          const response = await fetch(`${API_BASE_URL}/course-syllabus/${currentSyllabus.id}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to delete syllabus.');
          setCurrentSyllabus(null);
          toast.show('success', 'Deleted', 'Syllabus deleted successfully.');
        } catch (error: any) {
          console.error('Syllabus delete error:', error);
          toast.show('error', 'Delete Failed', error?.message || 'Failed to delete syllabus.');
        } finally {
          setIsDeletingSyllabus(false);
        }
      }
    );
  };

  const handleViewSyllabus = async () => {
    if (!currentSyllabus?.id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/course-syllabus/view/${currentSyllabus.id}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.url) {
        const googleDocsUrl = getGoogleDocsViewerUrl(data.url);
        setSyllabusViewerUrl(googleDocsUrl);
      }
    } catch (e) {
      toast.show('error', 'Error', 'Failed to load syllabus preview.');
    }
  };

  // Generates the next module (whether it's Module 1 or Module N) as a BARE
  // module — no lesson/discussion/activity content is auto-generated. This is
  // intentional: the syllabus can be edited/replaced (e.g. after CTU standards
  // are revised) at any time, so module creation is kept independent from
  // lesson content. Once the module exists, the teacher chooses per-lesson
  // whether to use "Generate Next Lesson" (AI) or "Add Lesson (Manual)".
  // Syllabus modules that don't yet have a corresponding saved courseModule
  // ("unmade" modules) — the pool of choices offered in the Module Selection
  // modal below. A syllabus module counts as "already created" ONLY if its
  // title has a 100% (case-insensitive, trimmed) match with a module title
  // already stored in Firebase. We intentionally do NOT compare moduleNumber
  // here: numbers are just sequential slot positions, so once a teacher
  // manually inserts a module in between two AI-generated ones, a later
  // syllabus module's number can collide with an unrelated created module's
  // number. Matching on number in that case would falsely mark the syllabus
  // module as "already created". Title is the reliable source of truth since
  // it's copied verbatim from the syllabus module into the created module's
  // title at creation time.
  const unmadeSyllabusModules = (currentSyllabus?.structure?.modules || []).filter(
    (sylMod: any) => {
      const sylTitle = String(sylMod.moduleTitle || sylMod.title || '').trim().toLowerCase();
      return !modules.some((m: any) => (m.title || '').trim().toLowerCase() === sylTitle);
    }
  );

  const handleOpenModuleSelectionModal = () => {
    setSelectedModulesForGen([]);
    setShowModuleSelectionModal(true);
  };

  const toggleModuleSelectionForGen = (moduleTitle: string) => {
    setSelectedModulesForGen(prev =>
      prev.includes(moduleTitle)
        ? prev.filter(t => t !== moduleTitle)
        : [...prev, moduleTitle]
    );
  };

  // Creates one saved courseModule per selected syllabus module — no
  // lesson/discussion/activity content is auto-generated. This is
  // intentional: the syllabus can be edited/replaced (e.g. after CTU
  // standards are revised) at any time, so module creation is kept
  // independent from lesson content. Once a module exists, the teacher
  // chooses per-lesson whether to use "Generate Next Lesson" (AI) or
  // "Add Lesson (Manual)".
  const handleGenerateSelectedModules = async () => {
    if (selectedModulesForGen.length === 0 || !course?.id) {
      toast.show('error', 'Error', 'Please select at least one module.');
      return;
    }
    setIsGeneratingModules(true);
    const succeeded: string[] = [];
    const failed: string[] = [];
    try {
      // Preserve syllabus order regardless of the order the teacher tapped
      // checkboxes in, and create modules ONE AT A TIME (not in parallel) so
      // each module's assigned number correctly accounts for the ones just
      // created earlier in this same batch.
      const orderedSelection = unmadeSyllabusModules.filter((sylMod: any) =>
        selectedModulesForGen.includes(sylMod.moduleTitle || sylMod.title)
      );
      let nextNum = modules.length > 0
        ? Math.max(...modules.map((m: any) => Number(m.moduleNumber) || 0)) + 1
        : 1;
      for (const sylMod of orderedSelection) {
        const moduleTitle = sylMod.moduleTitle || sylMod.title;
        try {
          const response = await fetch(`${API_BASE_URL}/course-modules/create-manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              classId: course.id,
              moduleNumber: nextNum,
              title: moduleTitle,
              description: sylMod.description || '',
              weeklySchedule: sylMod.weeklySchedule || ''
            })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || `Failed to create "${moduleTitle}"`);
          succeeded.push(moduleTitle);
          nextNum += 1;
        } catch (e: any) {
          failed.push(moduleTitle);
        }
      }
      await loadCourseContent();
      if (succeeded.length > 0) {
        setShowModuleSelectionModal(false);
      }
      if (failed.length === 0) {
        toast.show(
          'success',
          'Modules Created',
          succeeded.length > 1 ? `${succeeded.length} modules created successfully.` : `Module "${succeeded[0]}" created successfully.`
        );
      } else if (succeeded.length > 0) {
        toast.show('info', 'Created with some issues', `${succeeded.length} created, ${failed.length} failed: ${failed.join(', ')}`);
      } else {
        toast.show('error', 'Generation Failed', `Failed to create: ${failed.join(', ')}`);
      }
    } finally {
      setIsGeneratingModules(false);
    }
  };

  const updateStructureField = (path: string, value: any) => {
    if (!generatedStructure) return;
    const keys = path.split('.');
    const newStructure = JSON.parse(JSON.stringify(generatedStructure));
    let current: any = newStructure;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      const indexMatch = key.match(/^(\w+)\[(\d+)\]$/);
      if (indexMatch) {
        const arrayKey = indexMatch[1];
        const index = parseInt(indexMatch[2]);
        if (!Array.isArray(current[arrayKey])) {
          current[arrayKey] = [];
        }
        if (!current[arrayKey][index]) {
          current[arrayKey][index] = {};
        }
        current = current[arrayKey][index];
      } else {
        if (current[key] === undefined || current[key] === null) {
          current[key] = {};
        }
        current = current[key];
      }
    }
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
      await loadCourseContent();
      toast.show('success', 'Approved', 'Course structure saved and modules created!');
    } catch (error: any) {
      toast.show('error', 'Save Failed', error?.message || 'Unable to save course structure.');
    } finally {
      setIsGeneratingStructure(false);
    }
  };

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
      toast.show('error', 'Error', 'Failed to pick file.');
    }
  };

  const handleSaveEditMaterial = async () => {
    if (!editingMaterial || !editMatTitle.trim() || !editMatWeek.trim()) {
      toast.show('error', 'Required', 'Title and Week are required.');
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
      toast.show('success', 'Updated', 'Material updated successfully.');
    } catch (error: any) {
      toast.show('error', 'Update Failed', error?.message || 'Failed to update material.');
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleDeleteMaterial = () => {
    if (!editingMaterial) return;
    // Uses toast.confirm (backed by the local ConfirmationModal below).
    toast.confirm(
      'Delete Material',
      `Are you sure you want to delete "${editingMaterial.title}"? This will remove the file from storage and cannot be undone.`,
      async () => {
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
          toast.show('success', 'Deleted', 'Material deleted successfully.');
        } catch (error: any) {
          toast.show('error', 'Delete Failed', error?.message || 'Failed to delete material.');
        } finally {
          setIsDeletingMaterial(false);
        }
      }
    );
  };

  const handleDownloadMaterial = async () => {
    if (!viewerMaterial) {
      toast.show('error', 'No File', 'This material has no downloadable file.');
      return;
    }
    const storagePath = viewerMaterial.storagePath;
    const firebaseUrl = getMaterialFileUrl(viewerMaterial);
    if (!storagePath && !firebaseUrl) {
      toast.show('error', 'No File', 'This material has no file to download.');
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
          toast.show('error', 'Download Unavailable', 'This file cannot be downloaded directly.');
          return;
        }
      } else {
        if (!firebaseUrl) {
          toast.show('error', 'No File', 'This material has no file to download.');
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
          toast.show('info', 'Saved', `File downloaded to:\n${result.uri}`);
        }
      }
    } catch (error: any) {
      toast.show('error', 'Download Failed', error?.message || 'Unable to download file.');
    } finally {
      setIsDownloading(false);
    }
  };

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
    // ✅ NEW: Clear any stale picked replacement file from a previous
    // edit/create session so the "Replace File" flow starts clean and shows
    // this assignment's own current attachment (via selectedAssignment).
    setPickedAssignmentFile(null);
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
    setShowUpdateModal(true);
  };

  const openDateTimePicker = () => {
    const parsed = parseDueDateTime(formDue);
    setDraftDueDateTime(parsed);
    setVisibleCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setShowDateTimeModal(true);
  };

  // Returns a validation message if the currently selected due date/time in
  // the picker isn't allowed, or null when it's fine. Blocks dates before
  // today, AND (new) blocks a time on today's date that has already passed
  // — e.g. picking today at 9:00 AM when it's already 3:00 PM.
  const getDraftDateTimeIssue = (): string | null => {
    const now = new Date();
    if (isPastDay(draftDueDateTime)) return 'Past dates are not allowed.';
    if (isSameDate(draftDueDateTime, now)) {
      // Compare at minute resolution so picking the current minute isn't
      // flagged just because a second or two ticked by before Apply.
      const nowAtMinute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
      if (draftDueDateTime.getTime() < nowAtMinute.getTime()) {
        return "That time has already passed today. Please pick a later time.";
      }
    }
    return null;
  };

  const applyDraftDateTime = () => {
    const issue = getDraftDateTimeIssue();
    if (issue) {
      setErrors((prev) => ({ ...prev, dueDate: issue }));
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

  // Sets hour + minute together in one state update. Needed because the
  // merged Time field reports both at once (typing digits + AM/PM can
  // change the hour and minute in the same commit) — calling
  // updateDraftTime twice back-to-back would use a stale closure and the
  // second call would clobber the first.
  const updateDraftHourAndMinute = (hour: number, minute: number) => {
    setDraftDueDateTime((prev) => {
      const next = new Date(prev);
      next.setHours(hour);
      next.setMinutes(minute);
      return next;
    });
  };

  const toggleRelatedMaterial = (materialId: string) => {
    setSelectedMaterialIds((prev) => {
      const isSelected = prev.includes(materialId);
      if (isSelected) {
        return prev.filter((id) => id !== materialId);
      }
      return [...prev, materialId];
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
      toast.show('error', 'Error', 'Failed to pick file.');
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
      toast.show('error', 'Error', 'Failed to pick assignment file.');
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

  // ─── Course Template (Manage Template) ─────────────────────────────────────
  const handlePickTemplateImage = async (slot: 'header' | 'footer') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
        base64: Platform.OS === 'web',
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const picked: PickedUploadFile = {
        name: asset.name,
        uri: asset.uri,
        type: asset.mimeType,
        base64: (asset as any).base64,
        file: (asset as any).file,
      };
      if (slot === 'header') setTemplateHeaderPick(picked);
      else setTemplateFooterPick(picked);
    } catch {
      toast.show('error', 'Error', 'Failed to pick image.');
    }
  };

  const readPickedFileAsBase64 = async (picked: PickedUploadFile) => {
    if (!picked) return null;
    if (Platform.OS === 'web') {
      if (picked.base64) return picked.base64;
      if (picked.file) {
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') resolve(result.includes(',') ? result.split(',')[1] : result);
            else reject(new Error('Failed to read file on web.'));
          };
          reader.onerror = () => reject(new Error('Failed to read file on web.'));
          reader.readAsDataURL(picked.file as File);
        });
      }
      return null;
    }
    if (picked.uri) return FileSystem.readAsStringAsync(picked.uri, { encoding: 'base64' as any });
    return null;
  };

  const handleSaveCourseTemplate = async () => {
    if (!templateHeaderPick && !templateFooterPick) {
      toast.show('info', 'Nothing to Save', 'Choose a new header or footer image first.');
      return;
    }
    setIsSavingTemplate(true);
    try {
      const [headerBase64, footerBase64] = await Promise.all([
        readPickedFileAsBase64(templateHeaderPick),
        readPickedFileAsBase64(templateFooterPick),
      ]);

      const response = await fetch(`${API_BASE_URL}/course-template/save`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headerBase64,
          headerMimeType: templateHeaderPick?.type,
          headerFileName: templateHeaderPick?.name,
          footerBase64,
          footerMimeType: templateFooterPick?.type,
          footerFileName: templateFooterPick?.name,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.error || 'Failed to save template.');

      setCourseTemplate({
        headerUrl: data.data?.headerUrl || courseTemplate.headerUrl,
        footerUrl: data.data?.footerUrl || courseTemplate.footerUrl,
      });
      setTemplateHeaderPick(null);
      setTemplateFooterPick(null);
      setShowManageTemplateModal(false);
      toast.show('success', 'Template Updated', 'The school-wide header & footer are now live for every class.');
    } catch (error: any) {
      toast.show('error', 'Save Failed', error?.message || 'Unable to save the template.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleOpenUploadedFile = async (fileUri?: string) => {
    if (!fileUri) {
      toast.show('error', 'No File', 'No uploaded file available.');
      return;
    }
    try {
      await Linking.openURL(fileUri);
    } catch {
      toast.show('error', 'Error', 'Unable to open the file.');
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
      toast.show('success', 'Score Saved', 'The student submission has been graded.');
    } catch (error: any) {
      toast.show('error', 'Grade Failed', error?.message || 'Unable to save score.');
    }
  };

  const handleCopyClassCode = async () => {
    const codeToCopy = course?.classCode || '';
    if (!codeToCopy || codeToCopy === 'No Class Code') return;
    await Clipboard.setStringAsync(codeToCopy);
    setClassCodeCopied(true);
    setTimeout(() => setClassCodeCopied(false), 2000);
  };

  // ✅ UPDATED: Added loading state logic
  const downloadClassGradesExcel = async () => {
    if (!course?.id) {
      toast.show('error', 'No Class', 'No class selected.');
      return;
    }

    setIsExportingGrades(true);
    try {
      const gameResponse = await fetch(`${API_BASE_URL}/class-game-scores/${course.id}`, {
        credentials: 'include',
      });
      const gameScores = gameResponse.ok ? await gameResponse.json() : [];

      // ✅ NEW: Validate that there is at least one actual score to export
      // (either a graded assignment submission or a recorded game score)
      // before we bother building/writing the workbook. Without this,
      // "exporting" with nothing but empty cells produces a confusing,
      // effectively blank file. `hasGradedAssignmentScores` covers the
      // assignment side (same check used to enable/disable the button);
      // game scores can only be known after this fetch, so they're
      // checked here.
      const hasGameScores = Array.isArray(gameScores) && gameScores.length > 0;

      if (!hasGradedAssignmentScores && !hasGameScores) {
        toast.show(
          'info',
          'Nothing to Export',
          'There are no graded scores yet for this class, so there is nothing to export.'
        );
        return;
      }

      const workbook = XLSX.utils.book_new();

      // Build headers explicitly so column order is guaranteed,
      // regardless of whether assignment titles are numeric strings.
      const gradeHeaders = ['Student Name', ...assignments.map((a) => a.header)];

      const gradeAoa = [
        gradeHeaders,
        ...members.map((member) => {
          const studentSubmissions = submissions.filter((s) => s.studentId === member.id);
          const scores = assignments.map((assignment) => {
            const submission = studentSubmissions.find((s) => s.assignmentId === assignment.id);
            return submission?.status === 'graded' ? submission.score : '';
          });
          return [member.name, ...scores];
        }),
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet(gradeAoa),
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
        'Student Game Scores' 
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
      toast.show('success', 'Export Successful', 'Excel exported successfully.');
    } catch (error: any) {
      toast.show('error', 'Export Failed', error?.message || 'Failed to export Excel.');
    } finally {
      setIsExportingGrades(false);
    }
  };

  const validateAssignmentForm = () => {
    const nextErrors: FormErrors = {};

    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) nextErrors.title = 'Header is required.';
    else if (trimmedTitle.length > 150)
      nextErrors.title = 'Header must be 150 characters or fewer.';

    const trimmedDesc = formDesc.trim();
    if (!trimmedDesc) nextErrors.instruction = 'Instruction is required.';
    else if (trimmedDesc.length > 5000)
      nextErrors.instruction = 'Instruction must be 5000 characters or fewer.';

    if (assignmentType === 'game_based') {
      if (generatedQuestions.length === 0)
        nextErrors.totalScore = 'Please generate at least one question for the game.';
    } else {
      const trimmedPoints = formPoints.trim();
      const numericPoints = Number(trimmedPoints);
      if (!trimmedPoints) nextErrors.totalScore = 'Total score is required.';
      else if (!/^\d+(\.\d+)?$/.test(trimmedPoints) || Number.isNaN(numericPoints))
        nextErrors.totalScore = 'Total score must be a valid number.';
      else if (numericPoints <= 0) nextErrors.totalScore = 'Total score must be greater than 0.';
      else if (numericPoints > 1000) nextErrors.totalScore = 'Total score cannot exceed 1000.';
    }

    if (!formDue.trim()) nextErrors.dueDate = 'Due date and time is required.';
    else {
      const parsedDue = parseDueDateTime(formDue);
      const nowForDue = new Date();
      if (isPastDay(parsedDue)) {
        nextErrors.dueDate = 'Past dates are not allowed.';
      } else if (isSameDate(parsedDue, nowForDue)) {
        const nowAtMinute = new Date(
          nowForDue.getFullYear(),
          nowForDue.getMonth(),
          nowForDue.getDate(),
          nowForDue.getHours(),
          nowForDue.getMinutes()
        );
        if (parsedDue.getTime() < nowAtMinute.getTime()) {
          nextErrors.dueDate = 'That time has already passed today. Please pick a later time.';
        }
      }
    }

    if (selectedMaterialIds.length === 0)
      nextErrors.materials = 'Select at least one related material.';

    if (assignmentType === 'game_based') {
      if (!gameType) nextErrors.gameType = 'Please select a game type.';

      if (!numberOfAttempts) nextErrors.attempts = 'Please select number of attempts.';
      else if (numberOfAttempts === 'custom') {
        const trimmedAttempts = customAttempts.trim();
        const numericAttempts = Number(trimmedAttempts);
        if (!trimmedAttempts || !/^\d+$/.test(trimmedAttempts) || Number.isNaN(numericAttempts))
          nextErrors.customAttempts = 'Enter a whole number of attempts.';
        else if (numericAttempts < 1)
          nextErrors.customAttempts = 'Custom attempts must be at least 1.';
        else if (numericAttempts > 50)
          nextErrors.customAttempts = 'Custom attempts cannot exceed 50.';
      }

      if (!timeLimit) nextErrors.timeLimit = 'Please select a time limit.';
      else if (timeLimit === 'custom') {
        const trimmedTimeLimit = customTimeLimit.trim();
        const numericTimeLimit = Number(trimmedTimeLimit);
        if (!trimmedTimeLimit || !/^\d+$/.test(trimmedTimeLimit) || Number.isNaN(numericTimeLimit))
          nextErrors.customTimeLimit = 'Enter a whole number of minutes.';
        else if (numericTimeLimit < 1)
          nextErrors.customTimeLimit = 'Time limit must be at least 1 minute.';
        else if (numericTimeLimit > 480)
          nextErrors.customTimeLimit = 'Time limit cannot exceed 480 minutes.';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.show('error', 'Required', 'Please complete the highlighted assignment fields.');
      return false;
    }
    return true;
  };

  const handleGenerateQuestions = async () => {
    if (!gameType) {
      toast.show('error', 'Error', 'Please select a game type first.');
      return;
    }
    if (selectedMaterialIds.length === 0) {
      toast.show('error', 'Error', 'Please select at least one learning material.');
      return;
    }
    const parsedCount = parseInt(numberOfQuestions, 10) || 0;
    if (parsedCount < 1 || parsedCount > MAX_QUESTIONS_PER_GENERATION) {
      toast.show(
        'error',
        'Invalid Count',
        `Please enter between 1 and ${MAX_QUESTIONS_PER_GENERATION} questions.`
      );
      return;
    }
    const { usageMap, count: usedToday } = await getTodayUsageForTeacher(teacherIdentity);
    if (usedToday >= DAILY_GENERATION_LIMIT) {
      setDailyGenerationsUsed(usedToday);
      toast.show(
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
          numberOfQuestions: parsedCount,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate questions.');
      const questionsArray = Array.isArray(data.questions) ? data.questions : [];
      const uniqueQuestions = questionsArray.filter((q: any, index: number, self: any[]) => {
        const uniqueKey = gameType === 'fill_in_blanks'
          ? q.sentence
          : (q.question || q.term || q.front);
        const isDuplicate = index !== self.findIndex((t: any) => {
          const tKey = gameType === 'fill_in_blanks' ? t.sentence : (t.question || t.term || t.front);
          return tKey === uniqueKey;
        });
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
        if (gameType === 'fill_in_blanks') {
          return {
            id: `gen-${Date.now()}-${index}`,
            sentence: q.sentence || '',
            answer: q.answer || '',
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
            question: q.term || q.question || '',
            answer: q.definition || q.answer || ''
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
      const nextCount = usedToday + 1;
      const nextUsageMap: GenerationUsageMap = {
        ...usageMap,
        [teacherIdentity]: { date: getTodayDateKey(), count: nextCount },
      };
      await writeGenerationUsage(nextUsageMap);
      setDailyGenerationsUsed(nextCount);
      setGeneratedQuestions(editableQuestions);
      setShowGeneratedPreview(true);
      toast.show(
        'success',
        'Generated',
        `Questions generated successfully! (${nextCount}/${DAILY_GENERATION_LIMIT} generations used today) You can edit them before saving.`
      );
    } catch (error: any) {
      toast.show('error', 'Generation Failed', error?.message || 'Unable to generate questions.');
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

  const createBlankQuestion = () => {
    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (gameType === 'fill_in_blanks') {
      return { id, sentence: '', answer: '', question: '' };
    }
    if (gameType === 'flashcard' || gameType === 'memory_match') {
      return { id, question: '', answer: '' };
    }
    return { id, question: '', options: ['', '', '', ''], answer: '', correctIndex: -1 };
  };

  const addManualQuestion = () => {
    setGeneratedQuestions((prev) => [...prev, createBlankQuestion()]);
  };

  const handleGenerateMoreQuestions = async () => {
    if (selectedMaterialIds.length === 0) {
      toast.show('error', 'Error', 'Please select at least one learning material.');
      return;
    }
    const parsedCount = parseInt(extraQuestionsCount, 10) || 0;
    if (parsedCount < 1 || parsedCount > MAX_QUESTIONS_PER_GENERATION) {
      toast.show(
        'error',
        'Invalid Count',
        `Please enter between 1 and ${MAX_QUESTIONS_PER_GENERATION} questions.`
      );
      return;
    }
    const { usageMap, count: usedToday } = await getTodayUsageForTeacher(teacherIdentity);
    if (usedToday >= DAILY_GENERATION_LIMIT) {
      setDailyGenerationsUsed(usedToday);
      toast.show(
        'error',
        'Daily Limit Reached',
        `You've used all ${DAILY_GENERATION_LIMIT} question generations allowed today across your classes. Please try again tomorrow.`
      );
      return;
    }
    setIsGeneratingMore(true);
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
          numberOfQuestions: parsedCount,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate questions.');
      const questionsArray = Array.isArray(data.questions) ? data.questions : [];

      // Key existing questions so we don't add duplicates of what's already in the list
      const keyOf = (q: any) =>
        (gameType === 'fill_in_blanks' ? q.sentence : (q.question || q.term || q.front))
          ?.trim()
          .toLowerCase();
      const existingKeys = new Set(generatedQuestions.map(keyOf));

      const mappedNew = questionsArray.map((q: any, index: number) => {
        if (gameType === 'fill_in_blanks') {
          return {
            id: `gen-more-${Date.now()}-${index}`,
            sentence: q.sentence || '',
            answer: q.answer || '',
            question: q.sentence || q.question || '',
          };
        }
        if (gameType === 'flashcard') {
          return { id: `gen-more-${Date.now()}-${index}`, question: q.front || '', answer: q.back || '' };
        }
        if (gameType === 'memory_match') {
          return {
            id: `gen-more-${Date.now()}-${index}`,
            question: q.term || q.question || '',
            answer: q.definition || q.answer || '',
          };
        }
        const options = q.options && q.options.length === 4 ? q.options : ['', '', '', ''];
        const answer = q.answer || options[0] || '';
        const correctIndex = options.indexOf(answer);
        return {
          id: `gen-more-${Date.now()}-${index}`,
          question: q.question || '',
          options,
          answer,
          correctIndex: correctIndex !== -1 ? correctIndex : 0,
        };
      });

      const newUnique = mappedNew.filter((q: any) => {
        const key = keyOf(q);
        const isPlaceholder = key?.includes('the process of ___ is defined as');
        if (!key || isPlaceholder || existingKeys.has(key)) return false;
        existingKeys.add(key);
        return true;
      });

      if (newUnique.length === 0) {
        toast.show(
          'error',
          'No New Questions',
          'The AI only returned duplicates of what you already have. Try again or add one manually.'
        );
        return;
      }

      const nextCount = usedToday + 1;
      await writeGenerationUsage({
        ...usageMap,
        [teacherIdentity]: { date: getTodayDateKey(), count: nextCount },
      });
      setDailyGenerationsUsed(nextCount);
      setGeneratedQuestions((prev) => [...prev, ...newUnique]);
      toast.show(
        'success',
        'Added',
        `${newUnique.length} new question(s) added. (${nextCount}/${DAILY_GENERATION_LIMIT} generations used today)`
      );
    } catch (error: any) {
      toast.show('error', 'Generation Failed', error?.message || 'Unable to generate more questions.');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleCreate = async () => {
    if (isSaving) return;
    if (!course?.id) {
      toast.show('error', 'Error', 'No class selected.');
      return;
    }
    if (activeTab === 'materials') {
      if (!formTitle.trim() || !formPointsOnTime.trim()) {
        toast.show('error', 'Required', 'Please enter the title and week.');
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
        toast.show('success', 'Success', 'Material uploaded successfully.');
      } catch (error: any) {
        toast.show('error', 'Upload Failed', error?.message || 'Failed to create material.');
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
            assignmentType === 'game_based' ? generatedQuestions.length : Number(formPoints),
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
      toast.show('success', 'Success', 'Assignment uploaded successfully.');
    } catch (error: any) {
      toast.show('error', 'Upload Failed', error?.message || 'Failed to create assignment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedId || !validateAssignmentForm()) return;
    setIsSaving(true);
    try {
      // ✅ NEW: Only upload if the teacher actually picked a replacement
      // file — otherwise leave the assignment's existing attachment as-is.
      let uploadedFile: any = null;
      if (pickedAssignmentFile?.uri || pickedAssignmentFile?.base64 || pickedAssignmentFile?.file) {
        uploadedFile = await uploadPickedFile(pickedAssignmentFile, 'assignment');
      }
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
            assignmentType === 'game_based' ? generatedQuestions.length : Number(formPoints),
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
          // ✅ NEW: Only sent when a replacement file was uploaded above, so
          // the existing attachment is preserved untouched otherwise.
          ...(uploadedFile
            ? {
                fileName: uploadedFile.fileName ?? null,
                fileUrl: uploadedFile.fileUrl ?? null,
                fileType: uploadedFile.fileType ?? null,
                storagePath: uploadedFile.storagePath ?? null,
                bucketPath: uploadedFile.bucketPath ?? null,
              }
            : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update assignment');
      await loadCourseContent();
      setShowUpdateModal(false);
      setPickedAssignmentFile(null);
      toast.show('success', 'Success', 'Assignment updated.');
    } catch (error: any) {
      toast.show('error', 'Error', error?.message || 'Failed to update assignment.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    // Uses toast.confirm (backed by the local ConfirmationModal below).
    toast.confirm(
      'Delete Assignment',
      'Are you sure you want to delete this assignment? This action cannot be undone.',
      async () => {
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
          toast.show('success', 'Success', 'Assignment deleted.');
        } catch (error: any) {
          toast.show('error', 'Error', error?.message || 'Failed to delete assignment.');
        }
      }
    );
  };

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
  const courseBannerUri = course?.bannerUri || null;
  const courseYear = course?.year || '';
  const courseSection = course?.section || '';
  const courseInstructor = course?.instructor || 'No Instructor';
  const classCode = course?.classCode || 'No Class Code';
  const courseSemester = course?.semester || '';
  const schoolYear = course?.schoolYear || '';
  const courseSchedule: ClassScheduleEntry[] = Array.isArray(course?.schedule) ? course.schedule : [];

  const DAY_ABBREVIATIONS: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
    Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
  };

  const formatScheduleTime = (time: string) => {
    if (!time) return '';
    const [hourStr, minuteStr] = time.split(':');
    let hour = parseInt(hourStr, 10);
    if (Number.isNaN(hour)) return time;
    const period = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${(minuteStr || '00').padStart(2, '0')} ${period}`;
  };

  const formatScheduleBlock = (entry: ClassScheduleEntry) => {
    const days = (entry.days || []).map((d) => DAY_ABBREVIATIONS[d] || d).join(', ');
    const time = `${formatScheduleTime(entry.startTime)} - ${formatScheduleTime(entry.endTime)}`;
    return { days, time, room: entry.room || '' };
  };
  const calendarDays = getCalendarDays(visibleCalendarMonth);
  // ─── Course Template header/footer frame ───────────────────────────────────
  // Wraps lesson content (Edit Lesson, AI-generated, or manually created) with
  // the school-wide header/footer banner set via "Manage Template".
  const renderTemplateHeaderBanner = () => {
    // Falls back to the same CTU Argao letterhead used in Grades.tsx until
    // an admin uploads a custom header via "Manage Template".
    const source = courseTemplate.headerUrl ? { uri: courseTemplate.headerUrl } : DefaultTemplateHeader;
    return (
      <Image
        source={source}
        style={styles.templateHeaderImage}
        contentFit="contain"
      />
    );
  };

  const renderTemplateFooterBanner = () => {
    // Falls back to the same accreditation-logos footer used in Grades.tsx
    // until an admin uploads a custom footer via "Manage Template".
    const source = courseTemplate.footerUrl ? { uri: courseTemplate.footerUrl } : DefaultTemplateFooter;
    return (
      <Image
        source={source}
        style={styles.templateFooterImage}
        contentFit="contain"
      />
    );
  };

  // Wraps lesson content in a Word/PDF-style "page" — school-wide header
  // banner on top, footer banner on bottom — so Lesson Preview, Edit Lesson,
  // and manually created lessons all share one consistent letterhead layout.
  // `label` shows a small badge (e.g. "AI Generated" / "Manually Created")
  // so it's clear which template is being applied.
  // Shared form fields for the "Add/Edit Lesson" modal, used by both the
  // compact popup (Add Lesson) and the full-screen editor (Edit Lesson).
  const renderLessonFormFields = () => (
    <>
      <Text style={styles.sectionLabel}>Lesson Title</Text>
      <TextInput
        style={[styles.inputBox, isDuplicateLessonTitle && styles.errorBorder]}
        value={newLessonTitle}
        onChangeText={setNewLessonTitle}
        placeholder="Lesson Title"
      />
      {isDuplicateLessonTitle &&
        renderInputError('A lesson with this title already exists in this module (generated or manual). Please use a different title.')}
      <Text style={styles.sectionLabel}>Description</Text>
      <TextInput style={styles.inputBox} value={newLessonDesc} onChangeText={setNewLessonDesc} placeholder="Short summary" />
      {lessonMode === 'text' ? (
        <>
          <Text style={styles.sasFormSectionDivider}>Student Activity Sheet — every section below is required</Text>

          <Text style={styles.sectionLabel}>Intended Learning Outcomes (one per line)</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 90 }]} value={newLessonObjectivesText} onChangeText={setNewLessonObjectivesText} multiline placeholder={"Define C Programming.\nExplain the importance of learning C Programming."} />

          <Text style={styles.sectionLabel}>Materials (one per line)</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 70 }]} value={newLessonMaterialsText} onChangeText={setNewLessonMaterialsText} multiline placeholder={"Computer\nSmartphone\nStudent Activity Sheet"} />

          <Text style={styles.sectionLabel}>References (one per line)</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 70 }]} value={newLessonReferencesText} onChangeText={setNewLessonReferencesText} multiline placeholder={"Author, Title, Year"} />

          <Text style={styles.sectionLabel}>SDG Integration — one per line: "SDG name | description"</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 70 }]} value={newLessonSdgText} onChangeText={setNewLessonSdgText} multiline placeholder={"SDG # 4 – Quality Education | Ensures inclusive and equitable quality education"} />

          <Text style={styles.sasFormSectionDivider}>Lesson Preparation / Review / Preview</Text>

          <Text style={styles.sectionLabel}>Resource Links — optional, one per line: "Label | URL"</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 60 }]} value={newLessonPrepResourcesText} onChangeText={setNewLessonPrepResourcesText} multiline placeholder={"Download Dev C++ | https://sourceforge.net/projects/orwelldevcpp/"} />

          <Text style={styles.sectionLabel}>Warm-up Activity Title</Text>
          <TextInput style={styles.inputBox} value={newLessonPrepActivityTitle} onChangeText={setNewLessonPrepActivityTitle} placeholder='e.g. "Making a Cup of Coffee: Human vs Computer"' />

          <Text style={styles.sectionLabel}>Warm-up Activity Instructions</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 100 }]} value={newLessonPrepInstructions} onChangeText={setNewLessonPrepInstructions} multiline placeholder={"Ask students: \"How do you make a cup of coffee?\"\n1. Get a cup.\n2. Put coffee in the cup."} />

          <Text style={styles.sectionLabel}>Guide Questions (one per line)</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 70 }]} value={newLessonPrepGuideQuestionsText} onChangeText={setNewLessonPrepGuideQuestionsText} multiline placeholder={"Did you follow a sequence of steps?\nIs this similar to an algorithm?"} />

          <Text style={styles.sectionLabel}>Transition into Today's Lesson</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 80 }]} value={newLessonPrepTransition} onChangeText={setNewLessonPrepTransition} multiline placeholder="Last meeting, we learned... Today, we will learn..." />

          <Text style={styles.sasFormSectionDivider}>Concept Notes Presentation</Text>

          <Text style={styles.sectionLabel}>Discussion / Concept Notes</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 150 }]} value={newLessonDiscussion} onChangeText={setNewLessonDiscussion} multiline placeholder="Enter detailed content..." />

          <Text style={styles.sectionLabel}>Key Terms — one per line: "Term | Meaning"</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 90 }]} value={newLessonKeyTermsText} onChangeText={setNewLessonKeyTermsText} multiline placeholder={"Program | A set of instructions given to a computer\nCompiler | A tool that translates source code into machine code"} />

          <Text style={styles.sectionLabel}>Take Aways (one per line)</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 80 }]} value={newLessonTakeawaysText} onChangeText={setNewLessonTakeawaysText} multiline placeholder={"C Programming was developed by Dennis Ritchie in 1972.\nEvery C program starts with the main() function."} />

          <Text style={styles.sasFormSectionDivider}>Practice &amp; Performance</Text>

          <Text style={styles.sectionLabel}>Guided Practice</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 100 }]} value={newLessonGuidedPractice} onChangeText={setNewLessonGuidedPractice} multiline placeholder="1. Write a main() function\n2. Use printf to print Hello, C!" />

          <Text style={styles.sectionLabel}>Compu-Skill / Performance Task</Text>
          <TextInput style={[styles.textAreaBox, { minHeight: 100 }]} value={newLessonActivity} onChangeText={setNewLessonActivity} multiline placeholder="Instructions for the independent performance task..." />
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Upload Lesson Material</Text>
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
    </>
  );

  const renderDocPage = (children: React.ReactNode, label?: string, key?: string | number) => (
    <View key={key} style={styles.docPageOuter}>
      <View style={styles.docPage}>
        {renderTemplateHeaderBanner()}
        {label ? (
          <View style={styles.docPageBadge}>
            <Ionicons
              name={label === 'AI Generated' ? 'sparkles-outline' : 'create-outline'}
              size={11}
              color="#D32F2F"
            />
            <Text style={styles.docPageBadgeText}>{label}</Text>
          </View>
        ) : null}
        {children}
        {renderTemplateFooterBanner()}
      </View>
    </View>
  );

  const renderInputError = (message?: string) =>
    !!message ? <Text style={styles.errorText}>{message}</Text> : null;

  // Once questions have been generated for a game-based assignment, the
  // lesson selection is "locked": we show a read-only summary of what the
  // questions were generated from instead of the live pickable grid, so a
  // teacher can't silently change lessons out from under a question set
  // that's already been reviewed/saved. They can still get back to an
  // editable selector via "Change Lessons", which warns that doing so
  // discards the current questions.
  const handleChangeLessonsAfterGeneration = () => {
    toast.confirm(
      'Change Module Lessons?',
      "These questions were generated from the lessons currently selected. Changing your selection will discard them, and you'll need to generate again.",
      () => {
        setGeneratedQuestions([]);
        setShowGeneratedPreview(false);
      }
    );
  };

  const renderRelatedMaterialsSelector = () => {
    const hasSelection = selectedMaterialIds.length > 0;
    const isLockedByGeneration = assignmentType === 'game_based' && generatedQuestions.length > 0;

    if (isLockedByGeneration) {
      const selectedLessonMaterials = materials.filter((material) =>
        selectedMaterialIds.includes(material.id)
      );
      return (
        <View style={styles.sectionBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.sectionLabel}>Module Lessons</Text>
            <TouchableOpacity
              onPress={handleChangeLessonsAfterGeneration}
              hitSlop={8}
              disabled={isSaving}
            >
              <Text style={styles.clearSelectionText}>Change Lessons</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Questions were generated from the lessons below. Changing your selection will discard them.
          </Text>
          <View style={styles.materialSelectorWrap}>
            {selectedLessonMaterials.map((material) => (
              <View
                key={material.id}
                style={[
                  styles.materialChip,
                  styles.materialChipLocked,
                  { width: isMobile ? '48%' : '32%' },
                ]}
              >
                <Ionicons name="lock-closed" size={14} color="#9E9E9E" />
                <Text
                  style={[styles.materialChipText, styles.materialChipTextLocked]}
                  numberOfLines={2}
                >
                  {material.title}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.reviewQuestionsButton}
            onPress={() => setShowGeneratedPreview(true)}
            disabled={isSaving}
          >
            <Ionicons name="eye-outline" size={16} color="#D32F2F" />
            <Text style={styles.reviewQuestionsButtonText}>
              Review {generatedQuestions.length} Generated Question{generatedQuestions.length === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
          {renderInputError(errors.materials)}
        </View>
      );
    }

    return (
      <View style={styles.sectionBlock}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.sectionLabel}>Module Lessons</Text>
          {hasSelection && (
            <TouchableOpacity onPress={() => setSelectedMaterialIds([])} hitSlop={8}>
              <Text style={styles.clearSelectionText}>Clear ({selectedMaterialIds.length})</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.helperText}>
          {assignmentType === 'game_based'
            ? 'Select one or more lessons the AI should use for follow-up activity generation or game content.'
            : "Select one or more lessons to link as this assignment's Related Lesson. If a student scores below 75%, these will be used to generate a Review Activity under Suggested Learning Actions."}
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
              return (
                <TouchableOpacity
                  key={material.id}
                  style={[
                    styles.materialChip,
                    { width: isMobile ? '48%' : '32%' },
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
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        styles.materialChipText,
                        active && styles.materialChipTextActive,
                        isLesson && styles.lessonChipText
                      ]}
                      numberOfLines={2}
                    >
                      {material.title}
                    </Text>
                    {isLesson && (
                      <Text
                        style={[styles.lessonSubtext, active && styles.lessonSubtextActive]}
                        numberOfLines={1}
                      >
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

  // ══════════════════════════════════════════════════════════════════════
  // ✅ NEW: Generic dropdown field — same visual/interaction pattern as the
  // "Filter Assignments" dropdown in Assignments.tsx: a button with a
  // chevron that reveals an inline absolutely-positioned menu on large
  // screens, or a bottom-sheet Modal on mobile (so it's never clipped by a
  // surrounding ScrollView/Modal). Shared by both the Assignment Type and
  // Game Type dropdowns below so they look and behave identically.
  // ══════════════════════════════════════════════════════════════════════
  const renderFormDropdownTrigger = (
    label: string,
    placeholder: string,
    visible: boolean,
    setVisible: (v: boolean) => void,
    hasError?: boolean,
    disabled?: boolean,
    onLayout?: (e: any) => void,
    // ✅ FIX: optional ref + measurement callback so the menu (rendered in a
    // Modal on desktop, see renderFormDropdownOptions) can be anchored to
    // this button's actual on-screen position instead of relying on normal
    // in-flow stacking, which was letting other fields paint over it.
    triggerRef?: React.RefObject<any>,
    onMeasured?: (rect: { x: number; y: number; width: number; height: number }) => void
  ) => (
    <TouchableOpacity
      ref={triggerRef}
      style={[
        styles.dropdownTrigger,
        hasError ? styles.errorBorder : null,
        disabled ? styles.disabledInput : null,
      ]}
      onPress={() => {
        if (!visible && !isMobile && triggerRef?.current?.measureInWindow) {
          triggerRef.current.measureInWindow((x: number, y: number, w: number, h: number) => {
            onMeasured?.({ x, y, width: w, height: h });
            setVisible(true);
          });
        } else {
          setVisible(!visible);
        }
      }}
      disabled={disabled}
      activeOpacity={0.8}
      onLayout={onLayout}
    >
      <Text style={[styles.dropdownText, !label && styles.dropdownPlaceholder]} numberOfLines={1}>
        {label || placeholder}
      </Text>
      <Ionicons name={visible ? 'chevron-up' : 'chevron-down'} size={18} color="#D32F2F" />
    </TouchableOpacity>
  );

  const renderFormDropdownOptions = (
    options: { value: string; label: string; desc?: string }[],
    selectedValue: string,
    onSelect: (value: string) => void,
    visible: boolean,
    setVisible: (v: boolean) => void,
    sheetTitle: string,
    // ✅ FIX: on desktop the menu now renders inside a transparent Modal,
    // anchored to this measured trigger rect, so it always paints in front
    // of the rest of the form instead of behind other fields.
    anchorRect?: { x: number; y: number; width: number; height: number } | null
  ) => {
    if (!visible) return null;

    // ✅ Mobile: bottom-sheet Modal, same as Assignments.tsx's
    // "Filter Assignments" sheet — renders above everything so it's always
    // tappable even from inside another Modal.
    if (isMobile) {
      return (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={() => setVisible(false)}
          statusBarTranslucent
        >
          <TouchableOpacity
            style={styles.formDropdownModalOverlay}
            activeOpacity={1}
            onPress={() => setVisible(false)}
          >
            <TouchableOpacity style={styles.formDropdownModalSheet} activeOpacity={1} onPress={() => {}}>
              <View style={styles.formDropdownModalHandle} />
              <View style={styles.formDropdownModalHeader}>
                <Text style={styles.formDropdownModalTitle}>{sheetTitle}</Text>
                <TouchableOpacity onPress={() => setVisible(false)} hitSlop={8}>
                  <Ionicons name="close" size={22} color="#3B332E" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.formDropdownModalScroll} showsVerticalScrollIndicator={false}>
                {options.map((opt) => {
                  const isSelected = opt.value === selectedValue;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.formDropdownModalItem,
                        isSelected && styles.formDropdownModalItemSelected,
                      ]}
                      onPress={() => {
                        onSelect(opt.value);
                        setVisible(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.formDropdownModalItemText,
                            isSelected && styles.formDropdownModalItemTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                        {!!opt.desc && (
                          <Text style={styles.formDropdownModalItemDesc}>{opt.desc}</Text>
                        )}
                      </View>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color="#B71C1C" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      );
    }

    // ✅ FIX: Desktop/large-screen menu now renders inside its own
    // transparent Modal, anchored (via measured trigger coordinates) just
    // below the button — visually identical to the old inline dropdown, but
    // a Modal always paints in its own top-level layer above the rest of
    // the form, so it can no longer end up rendered behind the Header,
    // Instruction, or any other field.
    const menuLeft = anchorRect?.x ?? 0;
    const menuTop = (anchorRect?.y ?? 0) + (anchorRect?.height ?? 0) + 6;
    const menuWidth = anchorRect?.width ?? 260;
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View
            style={[
              styles.formInlineDropdownMenu,
              {
                position: 'absolute',
                top: menuTop,
                left: menuLeft,
                right: undefined,
                width: menuWidth,
              },
            ]}
          >
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
              {options.map((opt) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={styles.formDropdownItem}
                    onPress={() => {
                      onSelect(opt.value);
                      setVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.formDropdownItemText,
                          isSelected && styles.formDropdownItemTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      {!!opt.desc && <Text style={styles.formDropdownItemDesc}>{opt.desc}</Text>}
                    </View>
                    {isSelected ? <Ionicons name="checkmark" size={16} color="#B71C1C" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  // ✅ NEW: "Assignment Type" as a dropdown (Standard Assignment /
  // Game-Based Learning Assignment) using the shared dropdown pattern above.
  // Used by both the Create Assignment and Update Assignment forms.
  const renderAssignmentTypeSelector = (options?: {
    disabled?: boolean;
    warningText?: string;
    onLayout?: (e: any) => void;
  }) => {
    const disabled = isSaving || !!options?.disabled;
    const selected = assignmentTypeOptions.find((o) => o.value === assignmentType);
    return (
      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>Assignment Type</Text>
        <View style={[styles.formDropdownContainer, { marginTop: 8 }]}>
          {renderFormDropdownTrigger(
            selected?.label || '',
            'Select assignment type',
            showAssignmentTypeDropdown,
            setShowAssignmentTypeDropdown,
            false,
            disabled,
            options?.onLayout,
            assignmentTypeTriggerRef,
            setAssignmentTypeMenuRect
          )}
          {renderFormDropdownOptions(
            assignmentTypeOptions,
            assignmentType,
            (value) => {
              setAssignmentType(value as 'regular' | 'game_based');
              if (value === 'game_based') setAssignmentDisableRepositoryAfterDue(false);
            },
            showAssignmentTypeDropdown,
            setShowAssignmentTypeDropdown,
            'Select Assignment Type',
            assignmentTypeMenuRect
          )}
        </View>
        {options?.warningText && (
          <Text style={{ fontSize: 12, color: '#D32F2F', marginTop: 8, lineHeight: 17 }}>
            {options.warningText}
          </Text>
        )}
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

  // ✅ Extracted just the "Select Game" field itself (label + dropdown +
  // error), without any surrounding row/width wrapper, so it can be dropped
  // into whichever row layout a given modal needs — e.g. next to
  // "Assignment Type" in the Create modal (see renderCreateModalBody).
  const renderSelectGameField = () => {
    const selectedGame = gameOptions.find((g) => g.value === gameType);
    return (
      <>
        <Text style={styles.sectionLabel}>Select Game</Text>
        <View style={styles.formDropdownContainer}>
          {renderFormDropdownTrigger(
            selectedGame?.label || '',
            'Choose a game type',
            showGameTypeModal,
            setShowGameTypeModal,
            !!errors.gameType,
            isSaving,
            undefined,
            gameTypeTriggerRef,
            setGameTypeMenuRect
          )}
          {renderFormDropdownOptions(
            gameOptions,
            gameType,
            (value) => {
              setGameType(value as any);
              if (errors.gameType) setErrors((prev) => ({ ...prev, gameType: undefined }));
            },
            showGameTypeModal,
            setShowGameTypeModal,
            'Select Game Type',
            gameTypeMenuRect
          )}
        </View>
        {renderInputError(errors.gameType)}
      </>
    );
  };

  const renderGameAndClassRow = (
    // ✅ UPDATED: This row is shared by two modals whose "Due Date & Time"
    // field is sized differently:
    //  - the Create modal wraps it in formColumnRightDesktop (40% of the
    //    formGridDesktop grid)
    //  - the Update modal (renderAssignmentFields) wraps it in
    //    dropdownWrapHalf (48% of a two-column row)
    // Hardcoding either one here only lines up in one of the two modals, so
    // each caller now passes the style that matches ITS OWN Due Date field.
    desktopWidthStyle: StyleProp<ViewStyle> = styles.dropdownWrapHalf,
    // ✅ UPDATED: The Create modal right-aligns Select Game so it sits above
    // the Due Date column (on the right). The Update modal now places
    // Select Game directly above Header instead, so it needs to sit on the
    // left — hence this alignment override.
    desktopAlign: 'flex-start' | 'flex-end' = 'flex-end'
  ) => {
    // This form always creates the game-based assignment for the class whose
    // detail page it was opened from — selectedClassId is initialized to,
    // and reset to, course.id (see resetCreateForm). There's nothing to
    // pick, so no Course/Class selector is rendered here; the assignment is
    // implicitly scoped to the current class.
    return (
      <View
        style={[
          styles.gameAndClassRow,
          isMobile && styles.gameAndClassRowMobile,
          !isMobile && { justifyContent: desktopAlign },
        ]}
      >
        <View style={[styles.dropdownWrap, !isMobile && desktopWidthStyle]}>
          {renderSelectGameField()}
        </View>
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
      {renderAssignmentTypeSelector({
        disabled: hasSubmissionsForSelected,
        warningText: hasSubmissionsForSelected
          ? 'Type is locked because students have already submitted work for this assignment.'
          : undefined,
      })}
      {assignmentType === 'game_based' && renderGameAndClassRow(styles.dropdownWrapHalf, 'flex-start')}
      <View style={styles.fullWidthSection}>
        <View style={[styles.gameAndClassRow, isMobile && styles.gameAndClassRowMobile]}>
          <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
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
          </View>
          <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
            {renderDateTimeField()}
          </View>
        </View>
        <View style={[styles.gameAndClassRow, isMobile && styles.gameAndClassRowMobile]}>
          <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
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
          </View>
          <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
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
        </View>
        {assignmentType === 'game_based' && renderAttemptsSelector()}
        {assignmentType === 'game_based' && renderTimeLimitSelector()}
      </View>
      <View style={styles.fullWidthSection}>
        {renderRelatedMaterialsSelector()}
        {assignmentType === 'game_based' && selectedMaterialIds.length > 0 && gameType && generatedQuestions.length === 0 && (
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
        {assignmentType === 'game_based' && selectedMaterialIds.length > 0 && !gameType && generatedQuestions.length === 0 && (
          <View style={[styles.generateButton, { backgroundColor: '#9E9E9E' }]}>
            <Ionicons name="alert-circle-outline" size={18} color="#FFF" />
            <Text style={styles.generateButtonText}>Select a Game Type to Generate Questions</Text>
          </View>
        )}
        {assignmentType === 'regular' && (
          <>
            <Text style={styles.sectionLabel}>Attachment</Text>
            {/* ✅ NEW: Show the assignment's already-uploaded file (if any)
                so the teacher can see what's currently attached before
                deciding to replace it. Hidden once a new file is picked,
                since the preview box below already shows that instead. */}
            {!!selectedAssignment?.fileName && !pickedAssignmentFile?.name && (
              <View style={styles.currentFileBox}>
                <Ionicons name="document-text-outline" size={20} color="#D32F2F" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentFileLabel}>Current File</Text>
                  <Text style={styles.currentFileName} numberOfLines={1}>
                    {selectedAssignment.fileName}
                  </Text>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={[styles.primaryButtonWide, isSaving ? styles.disabledButton : null]}
              onPress={handlePickAssignmentFile}
              disabled={isSaving}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
              <Text style={styles.uploadBtnText}>
                {pickedAssignmentFile?.name
                  ? 'Change File'
                  : selectedAssignment?.fileName
                    ? 'Replace File'
                    : 'Upload File'}
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
        {assignmentType === 'regular' && (
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
        )}
      </View>
    </View>
  );

  const renderCreateModalBody = () => {
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
    return (
      <View style={[styles.formGrid, !isMobile && styles.formGridDesktop]}>
        <View style={styles.fullWidthSection}>
          {/* Row 1: Assignment Type, and — only for a Game-Based Learning
              Assignment — Select Game right beside it, instead of tucked
              off to the far right above Due Date. */}
          <View style={[styles.gameAndClassRow, isMobile && styles.gameAndClassRowMobile]}>
            <View style={[styles.dropdownWrap, !isMobile && assignmentType === 'game_based' && styles.dropdownWrapHalf]}>
              {renderAssignmentTypeSelector({
                onLayout: (e) => {
                  if (!isMobile) setRegularSubmissionChipWidth(e.nativeEvent.layout.width);
                },
              })}
            </View>
            {assignmentType === 'game_based' && (
              <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
                <View style={styles.sectionBlock}>{renderSelectGameField()}</View>
              </View>
            )}
          </View>

          {/* Row 2: Header, with Due Date & Time alongside it. */}
          <View style={[styles.gameAndClassRow, isMobile && styles.gameAndClassRowMobile]}>
            <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
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
            </View>
            <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
              {renderDateTimeField()}
            </View>
          </View>

          {/* Row 3: Instruction, with Total Score alongside it. */}
          <View style={[styles.gameAndClassRow, isMobile && styles.gameAndClassRowMobile]}>
            <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
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
            </View>
            <View style={[styles.dropdownWrap, !isMobile && styles.dropdownWrapHalf]}>
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
          </View>

          {assignmentType === 'game_based' && (
            <>
              <Text style={styles.sectionLabel}>
                Number of Questions (Max {MAX_QUESTIONS_PER_GENERATION})
              </Text>
              <TextInput
                style={[
                  styles.inputBox,
                  styles.numberOfQuestionsInput,
                  isInvalidQuestionCount && styles.errorBorder,
                ]}
                placeholder="e.g., 10"
                placeholderTextColor="#999"
                value={numberOfQuestions}
                onChangeText={(text) => {
                  setNumberOfQuestions(text.replace(/[^0-9]/g, ''));
                  if (errors.totalScore) setErrors((prev) => ({ ...prev, totalScore: undefined }));
                }}
                keyboardType="numeric"
                maxLength={2}
                editable={!isSaving}
              />
              {isInvalidQuestionCount && (
                <Text style={styles.errorText}>
                  {parsedQuestionCount > MAX_QUESTIONS_PER_GENERATION
                    ? `Maximum limit is ${MAX_QUESTIONS_PER_GENERATION} questions.`
                    : 'Please enter at least 1 question.'}
                </Text>
              )}
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
        <View style={styles.fullWidthSection}>
          {renderRelatedMaterialsSelector()}
          {assignmentType === 'game_based' && selectedMaterialIds.length > 0 && gameType && generatedQuestions.length === 0 && (
            <TouchableOpacity
              style={[
                styles.generateButton,
                (isGenerating || isInvalidQuestionCount || dailyGenerationsUsed >= DAILY_GENERATION_LIMIT)
                  ? styles.disabledButton
                  : null,
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
          {assignmentType === 'game_based' && selectedMaterialIds.length > 0 && !gameType && generatedQuestions.length === 0 && (
            <View
              style={[
                styles.generateButton,
                { backgroundColor: '#9E9E9E' },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={18} color="#FFF" />
              <Text style={styles.generateButtonText}>Select a Game Type to Generate Questions</Text>
            </View>
          )}
          {assignmentType === 'regular' && (
            <>
              <Text style={styles.sectionLabel}>Attachment (Optional)</Text>
              <TouchableOpacity
                style={[
                  styles.primaryButtonWide,
                  !isMobile && regularSubmissionChipWidth
                    ? { width: regularSubmissionChipWidth, alignSelf: 'flex-start' }
                    : null,
                  isSaving ? styles.disabledButton : null,
                ]}
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
          {assignmentType === 'regular' && (
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
          )}
          <View style={styles.inlineSaveWrap}>
            <TouchableOpacity
              style={[
                styles.inlineSaveButton,
                Object.keys(errors).length > 0 ? styles.floatingSaveButtonWarn : null,
                isSaving ? styles.floatingSaveButtonDisabled : null,
                { width: '100%' },
              ]}
              onPress={handleCreate}
              disabled={isSaving}
              activeOpacity={isSaving ? 1 : 0.85}
            >
              {isSaving ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.floatingSaveButtonText}>Saving Assignment...</Text>
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
          style={{ padding: 6, backgroundColor: '#FFEBEE', borderRadius: 14 }}
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
              value={q.sentence || q.question || ''}
              onChangeText={(val) => updateGeneratedQuestion(qIndex, 'sentence', val)}
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
                  <View style={{ backgroundColor: '#D32F2F', padding: 16, borderRadius: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: WEIGHT_EMPHASIS, color: '#FFF' }}>
                        Module {mod.moduleNumber}: {cleanModuleTitle(mod.title, mod.moduleNumber)}
                      </Text>
                      <TouchableOpacity onPress={() => updateStructureField('modules', generatedStructure.modules.filter((_: any, idx: number) => idx !== mi))}>
                        <Ionicons name="trash-outline" size={24} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={{ paddingLeft: 16, marginBottom: 16 }}>
                    <Text style={styles.sectionLabel}>Description</Text>
                    <TextInput style={styles.textAreaBox} value={mod.description} onChangeText={v => updateStructureField(`modules.${mi}.description`, v)} multiline />
                  </View>
                  <View style={{ paddingLeft: 16 }}>
                    <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>Lessons ({mod.lessons?.length || 0})</Text>
                    {mod.lessons?.map((l: any, li: number) => (
                      <View key={li} style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#DDD', borderLeftWidth: 4, borderLeftColor: '#1976D2' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#1976D2' }}>Lesson {li + 1}: {l.title}</Text>
                          <TouchableOpacity onPress={() => { const nl = mod.lessons.filter((_: any, idx: number) => idx !== li); updateStructureField(`modules.${mi}.lessons`, nl); }}>
                            <Ionicons name="close-circle" size={20} color="#999" />
                          </TouchableOpacity>
                        </View>
                        <TextInput style={styles.inputBox} placeholder="Title" value={l.title} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.title`, v)} />
                        <TextInput style={[styles.textAreaBox, { minHeight: 60 }]} placeholder="Description" value={l.description} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.description`, v)} multiline />

                        <Text style={styles.sasFormSectionDivider}>Student Activity Sheet — every section required</Text>

                        <Text style={styles.sectionLabel}>Intended Learning Outcomes (one per line)</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 80 }]} value={arrayToLines(l.objectives)} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.objectives`, parseLinesToArray(v))} multiline />

                        <Text style={styles.sectionLabel}>Materials (one per line)</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 60 }]} value={arrayToLines(l.materials)} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.materials`, parseLinesToArray(v))} multiline />

                        <Text style={styles.sectionLabel}>References (one per line)</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 60 }]} value={arrayToLines(l.references)} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.references`, parseLinesToArray(v))} multiline />

                        <Text style={styles.sectionLabel}>SDG Integration — "SDG name | description" per line</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 60 }]} value={pairsToLines(l.sdgIntegration, 'sdg', 'description')} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.sdgIntegration`, parsePipePairs(v).map(p => ({ sdg: p.a, description: p.b })))} multiline />

                        <Text style={styles.sectionLabel}>Lesson Prep — Resource Links (optional, "Label | URL" per line)</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 50 }]} value={pairsToLines(l.lessonPrep?.resources, 'label', 'url')} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.lessonPrep.resources`, parsePipePairs(v).map(p => ({ label: p.a, url: p.b })))} multiline />

                        <Text style={styles.sectionLabel}>Lesson Prep — Warm-up Activity Title</Text>
                        <TextInput style={styles.inputBox} value={l.lessonPrep?.activityTitle || ''} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.lessonPrep.activityTitle`, v)} />

                        <Text style={styles.sectionLabel}>Lesson Prep — Warm-up Instructions</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 90 }]} value={l.lessonPrep?.instructions || ''} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.lessonPrep.instructions`, v)} multiline />

                        <Text style={styles.sectionLabel}>Lesson Prep — Guide Questions (one per line)</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 60 }]} value={arrayToLines(l.lessonPrep?.guideQuestions)} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.lessonPrep.guideQuestions`, parseLinesToArray(v))} multiline />

                        <Text style={styles.sectionLabel}>Lesson Prep — Transition</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 70 }]} value={l.lessonPrep?.transition || ''} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.lessonPrep.transition`, v)} multiline />

                        <View style={{ marginTop: 12 }}>
                          <Text style={styles.sectionLabel}>Discussion / Concept Notes</Text>
                          <TextInput style={[styles.textAreaBox, { minHeight: 300 }]} placeholder="AI content..." value={l.discussion || ''} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.discussion`, v)} multiline />
                        </View>

                        <Text style={styles.sectionLabel}>Key Terms — "Term | Meaning" per line</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 80 }]} value={pairsToLines(l.keyTerms, 'term', 'meaning')} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.keyTerms`, parsePipePairs(v).map(p => ({ term: p.a, meaning: p.b })))} multiline />

                        <Text style={styles.sectionLabel}>Take Aways (one per line)</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 70 }]} value={arrayToLines(l.takeaways)} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.takeaways`, parseLinesToArray(v))} multiline />

                        <Text style={styles.sectionLabel}>Guided Practice</Text>
                        <TextInput style={[styles.textAreaBox, { minHeight: 100 }]} value={l.guidedPractice || ''} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.guidedPractice`, v)} multiline />

                        <View style={{ marginTop: 12 }}>
                          <Text style={styles.sectionLabel}>Compu-Skill / Performance Task</Text>
                          <TextInput style={[styles.textAreaBox, { minHeight: 300 }]} placeholder="Scenario..." value={l.activity || ''} onChangeText={v => updateStructureField(`modules.${mi}.lessons.${li}.activity`, v)} multiline />
                        </View>
                      </View>
                    ))}
                    <TouchableOpacity onPress={() => {
                      const nl = {
                        id: `l-${Date.now()}`, title: '', description: '', discussion: '', activity: '', estimatedHours: 2,
                        objectives: [], materials: [], references: [], sdgIntegration: [],
                        lessonPrep: { resources: [], activityTitle: '', instructions: '', guideQuestions: [], transition: '' },
                        keyTerms: [], takeaways: [], guidedPractice: '',
                      };
                      updateStructureField(`modules.${mi}.lessons`, [...(mod.lessons || []), nl]);
                    }} style={{ marginTop: 8, padding: 12, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#1976D2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                      <Ionicons name="add-circle-outline" size={20} color="#1976D2" />
                      <Text style={{ color: '#1976D2', fontWeight: '700' }}>Add Lesson</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowStructurePreviewModal(false)} disabled={isGeneratingStructure}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleApproveStructure} disabled={isGeneratingStructure}>
                {isGeneratingStructure ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryButtonText}>Approve & Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ─── Toast + Confirmation modal rendered by the shared component ───────────
  // Rendered inside both return branches below (submissions view and the
  // main detail view) so it's always available regardless of which screen
  // is currently showing.
  const renderToastAndConfirmation = () => (
    <>
      <Modal
        visible={toastState.visible}
        transparent
        animationType="fade"
        onRequestClose={hideToast}
        statusBarTranslucent
      >
        <View style={styles.toastPortal} pointerEvents="box-none">
          <Toast
            visible={toastState.visible}
            message={toastState.message}
            type={toastState.type}
            onHide={hideToast}
          />
        </View>
      </Modal>
      <ConfirmationModal
        visible={!!confirmation?.visible}
        title={confirmation?.title || ''}
        message={confirmation?.message || ''}
        onConfirm={() => {
          confirmation?.onConfirm();
          closeConfirmation();
        }}
        onCancel={() => {
          confirmation?.onCancel?.();
          closeConfirmation();
        }}
      />
    </>
  );

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
        onRefreshSubmissions={() => loadCourseContent(true)}
        autoRefreshIntervalMs={10000}
        initialStudentId={initialCommentStudentId}
        onInitialStudentHandled={onInitialCommentStudentHandled}
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
                keyboardShouldPersistTaps="handled"
              >
                {renderAssignmentFields()}
              </ScrollView>
              <View style={styles.modalBottomActions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, isSaving && styles.disabledButton]}
                  onPress={handleDelete}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, isSaving && styles.disabledButton]}
                  onPress={handleUpdate}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Update</Text>
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
                {
                  width: isMobile ? Math.min(width - 28, 360) : 760,
                  maxHeight: height * 0.92,
                },
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
              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                contentContainerStyle={styles.dateTimeScrollContent}
                style={styles.dateTimeScroll}
              >
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
                      <Text
                        style={[styles.calendarMonthLabel, isSmallPhone && styles.calendarMonthLabelCompact]}
                        numberOfLines={1}
                      >
                        {monthLabel(visibleCalendarMonth)}
                      </Text>
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
                        <Text
                          key={label}
                          style={[styles.weekLabel, isSmallPhone && styles.weekLabelCompact]}
                        >
                          {isSmallPhone ? label.slice(0, 1) : label}
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
                                isSmallPhone && styles.dayTextCompact,
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
                    <Text style={styles.timeLabel}>Time</Text>
                    <DueTimeInputField
                      hour={draftDueDateTime.getHours()}
                      minute={draftDueDateTime.getMinutes()}
                      onChangeHourMinute={updateDraftHourAndMinute}
                    />
                    {getDraftDateTimeIssue() && (
                      <Text style={styles.timeErrorText}>{getDraftDateTimeIssue()}</Text>
                    )}
                    <View style={styles.datePreviewBox}>
                      <Text style={styles.datePreviewLabel}>Selected</Text>
                      <Text
                        style={[styles.datePreviewValue, isSmallPhone && styles.datePreviewValueCompact]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {formatDueDateTimeDisplay(draftDueDateTime)}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => setShowDateTimeModal(false)}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, !!getDraftDateTimeIssue() && { opacity: 0.5 }]}
                  onPress={applyDraftDateTime}
                  disabled={!!getDraftDateTimeIssue()}
                >
                  <Text style={styles.primaryButtonText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
GENERATED QUESTIONS PREVIEW MODAL (Submissions-screen entry point)
────────────────────────────────────────────────────────────────────────
Duplicated from the main return below. This modal was missing from this
early-return branch, so tapping "Review N Generated Questions" after
opening Update Assignment from the Submissions screen set
showGeneratedPreview=true with no matching <Modal> mounted to show it —
the button looked completely dead.
════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showGeneratedPreview}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
        onRequestClose={() => setShowGeneratedPreview(false)}
      >
        <SafeAreaView style={styles.lessonPreviewScreen} edges={['top', 'left', 'right']}>
          {/* Fixed top bar — same "Google Classroom" document-editor chrome as
              Edit Lesson: back button on the left, title/subtitle in the
              middle, and the primary save action as an icon button on the
              right (instead of a bottom button row). */}
          <View style={styles.lessonPreviewTopBar}>
            <TouchableOpacity
              onPress={() => setShowGeneratedPreview(false)}
              style={styles.lessonPreviewBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={Platform.OS === 'web' ? 'close' : 'arrow-back'} size={22} color="#111" />
            </TouchableOpacity>
            <View style={styles.lessonPreviewTopBarTextWrap}>
              <Text style={styles.lessonPreviewTopBarTitle} numberOfLines={1}>
                Preview &amp; Edit Questions
              </Text>
              <Text style={styles.lessonPreviewTopBarSubtitle} numberOfLines={1}>
                {gameType === 'memory_match'
                  ? 'Review terms and definitions for Memory Match.'
                  : gameType === 'fill_in_blanks'
                    ? 'Review sentences and missing words for Fill-in-the-Blanks.'
                    : gameType === 'flashcard'
                      ? 'Review front and back of cards for Flashcard Challenge.'
                      : 'Review and tweak the AI-generated questions before saving.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (generatedQuestions.length === 0) {
                  toast.show('error', 'Invalid Questions', 'You must have at least one question.');
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
                  toast.show(
                    'error',
                    'Invalid Questions',
                    gameType === 'memory_match'
                      ? 'Please ensure every term and definition has text.'
                      : 'Please ensure all items have text and a correct option is selected.'
                  );
                  return;
                }
                setShowGeneratedPreview(false);
                toast.show('success', 'Saved', 'Questions updated and ready to be assigned.');
              }}
              style={[styles.lessonPreviewIconBtn, { backgroundColor: '#D32F2F' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Scrollable question list — full-width document-style page, same
              treatment as the Edit Lesson editor, so there's much more room
              to review and edit each generated question. */}
          <ScrollView
            style={styles.flexOne}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.lessonPreviewScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.lessonPreviewPageWrap}>
              <View style={[styles.lessonPreviewPage, !isMobile && styles.lessonPreviewPageWeb]}>
                {generatedQuestions.length === 0 && (
                  <Text style={styles.emptyMiniText}>No questions generated yet.</Text>
                )}
                {generatedQuestions.map((q, qIndex) => renderQuestionEditor(q, qIndex))}
              </View>
            </View>
          </ScrollView>

          {/* Fixed bottom toolbar: add more questions, manually or with AI */}
          <View style={styles.lessonPreviewBottomToolbar}>
            <View
              style={{
                flexDirection: isMobile ? 'column' : 'row',
                gap: 8,
                alignItems: isMobile ? 'stretch' : 'center',
              }}
            >
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                ]}
                onPress={addManualQuestion}
              >
                <Ionicons name="add" size={16} color="#4B6BFB" />
                <Text style={styles.secondaryButtonText}>Add Manually</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: isMobile ? undefined : 1 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', marginBottom: 3 }} numberOfLines={1}>
                    To Generate w/ AI
                  </Text>
                  <TextInput
                    value={extraQuestionsCount}
                    onChangeText={(v) => setExtraQuestionsCount(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel="Number of questions to generate with AI (used by Generate More with AI)"
                    style={{
                      borderWidth: 1,
                      borderColor: '#DDD',
                      borderRadius: 14,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      width: 56,
                      textAlign: 'center',
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 },
                    (isGeneratingMore || dailyGenerationsUsed >= DAILY_GENERATION_LIMIT) && { opacity: 0.5 },
                  ]}
                  disabled={isGeneratingMore || dailyGenerationsUsed >= DAILY_GENERATION_LIMIT}
                  onPress={handleGenerateMoreQuestions}
                >
                  {isGeneratingMore ? (
                    <ActivityIndicator size="small" color="#4B6BFB" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#4B6BFB" />
                      <Text style={styles.secondaryButtonText}>Generate More with AI</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
              {dailyGenerationsUsed}/{DAILY_GENERATION_LIMIT} AI generations used today
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
        {renderToastAndConfirmation()}
      </>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.screenScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Course Header (Google Classroom–style banner) ── */}
        <View style={styles.courseHeaderWrap}>
          <View style={[styles.bannerBox, { height: isMobile ? 168 : 224 }]}>
            {courseBannerUri ? (
              <Image
                source={{ uri: courseBannerUri }}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[StyleSheet.absoluteFillObject, styles.bannerFallback]} />
            )}
            <View style={styles.bannerScrim} />

            <TouchableOpacity onPress={onBack} style={styles.backButtonOnBanner}>
              <Ionicons name="arrow-back" size={22} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.exportGradesButtonOnBanner,
                (isExportingGrades || !hasGradedAssignmentScores) && { opacity: 0.5 },
              ]}
              onPress={downloadClassGradesExcel}
              disabled={isExportingGrades || !hasGradedAssignmentScores}
              activeOpacity={0.85}
            >
              {isExportingGrades ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
              )}
              {!isMobile && (
                <Text style={styles.exportGradesButtonText}>
                  {isExportingGrades ? 'Exporting...' : 'Export Scores'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={[styles.bannerTextBlock, { paddingHorizontal: isMobile ? 16 : 60 }]}>
              <Text
                style={[styles.courseNameOnBanner, { fontSize: isSmallPhone ? 22 : 30 }]}
                numberOfLines={2}
              >
                {courseName}
              </Text>
              <Text style={styles.courseInstructorOnBanner} numberOfLines={1}>
                {courseInstructor}
              </Text>
            </View>
          </View>

          {/* Thin meta strip directly under the banner, Classroom-style */}
          <View style={[styles.metaStrip, { paddingHorizontal: isMobile ? 16 : 60 }]}>
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
              {!!schoolYear && (
                <View style={styles.metaChip}>
                  <Ionicons name="time-outline" size={13} color="#5F6368" />
                  <Text style={styles.metaChipText} numberOfLines={1}>S.Y. {schoolYear}</Text>
                </View>
              )}
            </View>

            <View style={styles.classCodeInline}>
              <Ionicons name="key-outline" size={14} color="#D32F2F" />
              <Text style={styles.classCodeInlineValue} numberOfLines={1}>{classCode}</Text>
              <TouchableOpacity
                onPress={handleCopyClassCode}
                style={styles.copyCodeInlineButton}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={classCodeCopied ? 'checkmark-outline' : 'copy-outline'}
                  size={14}
                  color="#D32F2F"
                />
                <Text style={styles.copyCodeInlineText}>{classCodeCopied ? 'Copied' : 'Copy'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {courseSchedule.length > 0 && (
            <View style={[styles.scheduleStripWrap, { paddingHorizontal: isMobile ? 16 : 60 }]}>
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

          {/* Divider before the Stream/Classwork/People tabs */}
          <View style={[styles.headerBottomDivider, { marginHorizontal: isMobile ? 16 : 60 }]} />
        </View>
        {/* ── Tabs ─ */}
        <View style={styles.tabContainer}>
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
        </View>
        {/* Each tab panel is kept mounted (once first visited) and toggled
            with `display` rather than being conditionally unmounted, so
            switching tabs is a cheap style flip instead of a full
            teardown/rebuild of a large subtree. */}
        <View style={activeTab === 'materials' ? styles.flexOne : styles.hiddenTabPanel}>
          {!!mountedTabs.materials && (
            <TeacherMaterialSection
              materials={materials}
              onCreate={openCreateModal}
              onOpenMaterial={openMaterialViewer}
            />
          )}
        </View>
        <View style={activeTab === 'assignments' ? styles.flexOne : styles.hiddenTabPanel}>
          {!!mountedTabs.assignments && (
            <TeacherAssignmentSection
              assignments={assignments}
              onCreate={openCreateModal}
              onOpenMembers={(id) => {
                setSelectedId(id);
                setShowSubmissions(true);
              }}
            />
          )}
        </View>
        <View style={activeTab === 'modules' ? styles.flexOne : styles.hiddenTabPanel}>
          {!!mountedTabs.modules && (
          <View style={{ padding: 16 }}>
            {/* Header/Footer Template controls — one school-wide template shared by every teacher/class */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
              <TouchableOpacity
                style={styles.manageTemplateButton}
                onPress={() => {
                  setTemplateHeaderPick(null);
                  setTemplateFooterPick(null);
                  setShowManageTemplateModal(true);
                }}
              >
                <Ionicons name="image-outline" size={16} color="#D32F2F" />
                <Text style={styles.manageTemplateButtonText}>Manage Template</Text>
              </TouchableOpacity>
            </View>
            {/* AI Course Builder / Syllabus Section */}
            <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE' }}>
              <Text style={{ fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#111', marginBottom: 12 }}>AI Course Builder</Text>
              {!currentSyllabus ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ color: '#888', marginBottom: 12 }}>No syllabus uploaded.</Text>
                  <TouchableOpacity
                    onPress={handlePickSyllabus}
                    disabled={isUploadingSyllabus}
                    style={{ backgroundColor: '#D32F2F', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    {isUploadingSyllabus ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />}
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Upload Course Syllabus</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={{ backgroundColor: '#F9F9F9', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EEE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Ionicons name="document-text-outline" size={24} color="#D32F2F" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }} numberOfLines={1}>{currentSyllabus.fileName}</Text>
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        Uploaded {formatSyllabusDate(currentSyllabus?.uploadedAt)}
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
                    <TouchableOpacity onPress={handleViewSyllabus} style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 }}>
                      <Text style={{ color: '#1565C0', fontWeight: '700', fontSize: 12 }}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleEditSyllabus}
                      disabled={isUploadingSyllabus || isDeletingSyllabus}
                      style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: (isUploadingSyllabus || isDeletingSyllabus) ? 0.5 : 1 }}
                    >
                      {isUploadingSyllabus && isEditingSyllabus ? (
                        <ActivityIndicator color="#EF6C00" size="small" />
                      ) : (
                        <Ionicons name="create-outline" size={14} color="#EF6C00" />
                      )}
                      <Text style={{ color: '#EF6C00', fontWeight: '700', fontSize: 12 }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDeleteSyllabus}
                      disabled={isUploadingSyllabus || isDeletingSyllabus}
                      style={{ backgroundColor: '#FFEBEE', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 4, opacity: (isUploadingSyllabus || isDeletingSyllabus) ? 0.5 : 1 }}
                    >
                      {isDeletingSyllabus ? (
                        <ActivityIndicator color="#D32F2F" size="small" />
                      ) : (
                        <Ionicons name="trash-outline" size={14} color="#D32F2F" />
                      )}
                      <Text style={{ color: '#D32F2F', fontWeight: '700', fontSize: 12 }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ fontSize: 11, color: '#999', marginTop: 8, lineHeight: 15 }}>
                    Updated to new CTU standards? Tap "Edit" to replace this file — module and lesson generation will use the new syllabus.
                  </Text>
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
                    <View key={mod.id} style={{ backgroundColor: '#FFF', borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden' }}>
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
                              <Text style={{ fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#111' }}>
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
                              const sortedLessons = [...mod.lessons].sort((a: any, b: any) =>
                                (Number(a.lessonNumber) || 0) - (Number(b.lessonNumber) || 0)
                              );
                              return sortedLessons.map((lesson: any, li: number) => (
                                <TouchableOpacity
                                  key={lesson.id || li}
                                  onPress={() => handleOpenLessonDetail(lesson)}
                                  style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#DDD', borderLeftWidth: 3, borderLeftColor: '#1976D2' }}
                                >
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
                                </TouchableOpacity>
                              ));
                            })()
                          ) : (
                            <Text style={{ textAlign: 'center', color: '#999', padding: 12 }}>No lessons added yet.</Text>
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              resetLessonForm();
                              setSelectedLesson(null);
                              setSelectedModuleForLesson(mod);
                              setShowManualLessonModal(true);
                            }}
                            style={{ marginTop: 8, padding: 10, backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderColor: '#1976D2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                          >
                            <Ionicons name="add-circle-outline" size={16} color="#1976D2" />
                            <Text style={{ color: '#1976D2', fontWeight: '700', fontSize: 12 }}>Add Lesson (Manual)</Text>
                          </TouchableOpacity>
                          {findMatchingSyllabusModule(mod) && (
                            <TouchableOpacity
                              onPress={() => handleOpenNextLessonModal(mod)}
                              style={{ marginTop: 8, padding: 16, backgroundColor: '#E3F2FD', borderRadius: 16, borderWidth: 1, borderColor: '#1976D2', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                            >
                              <Ionicons name="sparkles-outline" size={24} color="#1976D2" />
                              <Text style={{ color: '#1976D2', fontWeight: WEIGHT_EMPHASIS, fontSize: 16 }}>Generate Next Lesson</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            )}
            {currentSyllabus && (
              <>
                {modules.length === 0 ? (
                  <TouchableOpacity
                    onPress={handleOpenModuleSelectionModal}
                    disabled={unmadeSyllabusModules.length === 0}
                    style={[
                      { marginTop: 8, padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 2, borderColor: '#D32F2F', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
                      unmadeSyllabusModules.length === 0 && styles.disabledButton
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#D32F2F" />
                    <Text style={{ color: '#D32F2F', fontWeight: WEIGHT_EMPHASIS, fontSize: 16 }}>Generate Module 1</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleOpenModuleSelectionModal}
                    disabled={unmadeSyllabusModules.length === 0}
                    style={[
                      { marginTop: 8, padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 2, borderColor: '#D32F2F', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
                      unmadeSyllabusModules.length === 0 && styles.disabledButton
                    ]}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#D32F2F" />
                    <Text style={{ color: '#D32F2F', fontWeight: WEIGHT_EMPHASIS, fontSize: 16 }}>Generate Another Module</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => {
                    const maxExistingNum = modules.length > 0
                      ? Math.max(...modules.map((m: any) => Number(m.moduleNumber) || 0))
                      : 0;
                    const nextNum = maxExistingNum + 1;
                    setNewModuleNum(String(nextNum));
                    setNewModuleTitle('');
                    setShowManualModuleModal(true);
                  }}
                  style={{ marginTop: 16, padding: 16, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#D32F2F', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="create-outline" size={24} color="#D32F2F" />
                  <Text style={{ color: '#D32F2F', fontWeight: WEIGHT_EMPHASIS, fontSize: 16 }}>Create Module (Manual)</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          )}
        </View>
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
                      ? 'Game-Based Learning Assignment'
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
              keyboardShouldPersistTaps="handled"
            >
              {renderCreateModalBody()}
            </ScrollView>
            {activeTab === 'materials' && (
              <View
                style={[
                  styles.floatingSaveWrap,
                  isMobile && styles.floatingSaveWrapMobile,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.floatingSaveButton,
                    isSaving ? styles.floatingSaveButtonDisabled : null,
                  ]}
                  onPress={handleCreate}
                  disabled={isSaving}
                  activeOpacity={isSaving ? 1 : 0.85}
                >
                  {isSaving ? (
                    <>
                      <ActivityIndicator size="small" color="#FFF" />
                      <Text style={styles.floatingSaveButtonText}>Saving Material...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#FFF" />
                      <Text style={styles.floatingSaveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
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
              {
                width: isMobile ? Math.min(width - 28, 360) : 760,
                maxHeight: height * 0.92,
              },
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.dateTimeScrollContent}
              style={styles.dateTimeScroll}
            >
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
                    <Text
                      style={[styles.calendarMonthLabel, isSmallPhone && styles.calendarMonthLabelCompact]}
                      numberOfLines={1}
                    >
                      {monthLabel(visibleCalendarMonth)}
                    </Text>
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
                      <Text
                        key={label}
                        style={[styles.weekLabel, isSmallPhone && styles.weekLabelCompact]}
                      >
                        {isSmallPhone ? label.slice(0, 1) : label}
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
                              isSmallPhone && styles.dayTextCompact,
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
                  <Text style={styles.timeLabel}>Time</Text>
                  <DueTimeInputField
                    hour={draftDueDateTime.getHours()}
                    minute={draftDueDateTime.getMinutes()}
                    onChangeHourMinute={updateDraftHourAndMinute}
                  />
                  {getDraftDateTimeIssue() && (
                    <Text style={styles.timeErrorText}>{getDraftDateTimeIssue()}</Text>
                  )}
                  <View style={styles.datePreviewBox}>
                    <Text style={styles.datePreviewLabel}>Selected</Text>
                    <Text
                      style={[styles.datePreviewValue, isSmallPhone && styles.datePreviewValueCompact]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatDueDateTimeDisplay(draftDueDateTime)}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowDateTimeModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, !!getDraftDateTimeIssue() && { opacity: 0.5 }]}
                onPress={applyDraftDateTime}
                disabled={!!getDraftDateTimeIssue()}
              >
                <Text style={styles.primaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
GENERATED QUESTIONS PREVIEW MODAL
════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showGeneratedPreview}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
        onRequestClose={() => setShowGeneratedPreview(false)}
      >
        <SafeAreaView style={styles.lessonPreviewScreen} edges={['top', 'left', 'right']}>
          {/* Fixed top bar — same "Google Classroom" document-editor chrome as
              Edit Lesson: back button on the left, title/subtitle in the
              middle, and the primary save action as an icon button on the
              right (instead of a bottom button row). */}
          <View style={styles.lessonPreviewTopBar}>
            <TouchableOpacity
              onPress={() => setShowGeneratedPreview(false)}
              style={styles.lessonPreviewBackBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={Platform.OS === 'web' ? 'close' : 'arrow-back'} size={22} color="#111" />
            </TouchableOpacity>
            <View style={styles.lessonPreviewTopBarTextWrap}>
              <Text style={styles.lessonPreviewTopBarTitle} numberOfLines={1}>
                Preview &amp; Edit Questions
              </Text>
              <Text style={styles.lessonPreviewTopBarSubtitle} numberOfLines={1}>
                {gameType === 'memory_match'
                  ? 'Review terms and definitions for Memory Match.'
                  : gameType === 'fill_in_blanks'
                    ? 'Review sentences and missing words for Fill-in-the-Blanks.'
                    : gameType === 'flashcard'
                      ? 'Review front and back of cards for Flashcard Challenge.'
                      : 'Review and tweak the AI-generated questions before saving.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (generatedQuestions.length === 0) {
                  toast.show('error', 'Invalid Questions', 'You must have at least one question.');
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
                  toast.show(
                    'error',
                    'Invalid Questions',
                    gameType === 'memory_match'
                      ? 'Please ensure every term and definition has text.'
                      : 'Please ensure all items have text and a correct option is selected.'
                  );
                  return;
                }
                setShowGeneratedPreview(false);
                toast.show('success', 'Saved', 'Questions updated and ready to be assigned.');
              }}
              style={[styles.lessonPreviewIconBtn, { backgroundColor: '#D32F2F' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Scrollable question list — full-width document-style page, same
              treatment as the Edit Lesson editor, so there's much more room
              to review and edit each generated question. */}
          <ScrollView
            style={styles.flexOne}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.lessonPreviewScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.lessonPreviewPageWrap}>
              <View style={[styles.lessonPreviewPage, !isMobile && styles.lessonPreviewPageWeb]}>
                {generatedQuestions.length === 0 && (
                  <Text style={styles.emptyMiniText}>No questions generated yet.</Text>
                )}
                {generatedQuestions.map((q, qIndex) => renderQuestionEditor(q, qIndex))}
              </View>
            </View>
          </ScrollView>

          {/* Fixed bottom toolbar: add more questions, manually or with AI */}
          <View style={styles.lessonPreviewBottomToolbar}>
            <View
              style={{
                flexDirection: isMobile ? 'column' : 'row',
                gap: 8,
                alignItems: isMobile ? 'stretch' : 'center',
              }}
            >
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
                ]}
                onPress={addManualQuestion}
              >
                <Ionicons name="add" size={16} color="#4B6BFB" />
                <Text style={styles.secondaryButtonText}>Add Manually</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: isMobile ? undefined : 1 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', marginBottom: 3 }} numberOfLines={1}>
                    To Generate w/ AI
                  </Text>
                  <TextInput
                    value={extraQuestionsCount}
                    onChangeText={(v) => setExtraQuestionsCount(v.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel="Number of questions to generate with AI (used by Generate More with AI)"
                    style={{
                      borderWidth: 1,
                      borderColor: '#DDD',
                      borderRadius: 14,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      width: 56,
                      textAlign: 'center',
                    }}
                  />
                </View>
                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1 },
                    (isGeneratingMore || dailyGenerationsUsed >= DAILY_GENERATION_LIMIT) && { opacity: 0.5 },
                  ]}
                  disabled={isGeneratingMore || dailyGenerationsUsed >= DAILY_GENERATION_LIMIT}
                  onPress={handleGenerateMoreQuestions}
                >
                  {isGeneratingMore ? (
                    <ActivityIndicator size="small" color="#4B6BFB" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#4B6BFB" />
                      <Text style={styles.secondaryButtonText}>Generate More with AI</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
            <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
              {dailyGenerationsUsed}/{DAILY_GENERATION_LIMIT} AI generations used today
            </Text>
          </View>
        </SafeAreaView>
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
MANAGE TEMPLATE MODAL (school-wide header/footer — saved to Firebase)
════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showManageTemplateModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 400) : 560, maxHeight: height * 0.9 }]}>
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Manage Template</Text>
                <Text style={styles.modalSubtitle}>
                  This header & footer is shared by every class in the school. Updating it here applies everywhere.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowManageTemplateModal(false)} disabled={isSavingTemplate}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.templateSlotCard}>
                <Text style={styles.sectionLabel}>Header Image</Text>
                <View style={styles.templateSlotPreviewBox}>
                  {templateHeaderPick?.uri || courseTemplate.headerUrl ? (
                    <Image
                      source={{ uri: templateHeaderPick?.uri || courseTemplate.headerUrl! }}
                      style={styles.templateSlotPreviewImage}
                      contentFit="contain"
                    />
                  ) : (
                    <Text style={{ color: '#999', fontSize: 12 }}>No header set yet</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.primaryButtonWide, { marginTop: 0 }]}
                  onPress={() => handlePickTemplateImage('header')}
                  disabled={isSavingTemplate}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                  <Text style={styles.uploadBtnText}>
                    {templateHeaderPick ? 'Change Header Image' : 'Upload New Header Image'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.templateSlotCard}>
                <Text style={styles.sectionLabel}>Footer Image</Text>
                <View style={styles.templateSlotPreviewBox}>
                  {templateFooterPick?.uri || courseTemplate.footerUrl ? (
                    <Image
                      source={{ uri: templateFooterPick?.uri || courseTemplate.footerUrl! }}
                      style={styles.templateSlotPreviewImage}
                      contentFit="contain"
                    />
                  ) : (
                    <Text style={{ color: '#999', fontSize: 12 }}>No footer set yet</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.primaryButtonWide, { marginTop: 0 }]}
                  onPress={() => handlePickTemplateImage('footer')}
                  disabled={isSavingTemplate}
                >
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                  <Text style={styles.uploadBtnText}>
                    {templateFooterPick ? 'Change Footer Image' : 'Upload New Footer Image'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 11, color: '#999', lineHeight: 15 }}>
                Saved images are stored in Firebase and are automatically used as the header/footer on lesson previews, edited lessons, and newly generated or manually created lessons.
              </Text>
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowManageTemplateModal(false)}
                disabled={isSavingTemplate}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, (isSavingTemplate || (!templateHeaderPick && !templateFooterPick)) && styles.disabledButton]}
                onPress={handleSaveCourseTemplate}
                disabled={isSavingTemplate || (!templateHeaderPick && !templateFooterPick)}
              >
                {isSavingTemplate ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.primaryButtonText}>Save Template</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ══════════════════════════════════════════════════════════════════════
LESSON DETAIL MODAL — FULL-SCREEN "GOOGLE CLASSROOM"-STYLE DOCUMENT VIEWER
Full-screen presentation: fixed top bar (title/back), a scrollable
letterhead "page" using the same school-wide header/footer banner as
Grades' Official Grade Report, and a fixed bottom action bar (Delete /
Edit Lesson) — like opening a Doc/PDF attachment in Google Classroom.
════════════════════════════════════════════════════════════════════════ */}
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
            {selectedLesson ? (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (!selectedLesson) return;
                    const parentModule = modules.find((m: any) => m.id === selectedLesson.moduleId);
                    setIsEditingLesson(true);
                    setSelectedModuleForLesson(parentModule || null);
                    setNewLessonTitle(selectedLesson.title || '');
                    setNewLessonDesc(selectedLesson.description || '');
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
                      // ─── Prefill SAS template fields ───
                      setNewLessonObjectivesText(arrayToLines(selectedLesson.objectives));
                      setNewLessonMaterialsText(arrayToLines(selectedLesson.materials));
                      setNewLessonReferencesText(arrayToLines(selectedLesson.references));
                      setNewLessonSdgText(pairsToLines(selectedLesson.sdgIntegration, 'sdg', 'description'));
                      setNewLessonPrepResourcesText(pairsToLines(selectedLesson.lessonPrep?.resources, 'label', 'url'));
                      setNewLessonPrepActivityTitle(selectedLesson.lessonPrep?.activityTitle || '');
                      setNewLessonPrepInstructions(selectedLesson.lessonPrep?.instructions || '');
                      setNewLessonPrepGuideQuestionsText(arrayToLines(selectedLesson.lessonPrep?.guideQuestions));
                      setNewLessonPrepTransition(selectedLesson.lessonPrep?.transition || '');
                      setNewLessonKeyTermsText(pairsToLines(selectedLesson.keyTerms, 'term', 'meaning'));
                      setNewLessonTakeawaysText(arrayToLines(selectedLesson.takeaways));
                      setNewLessonGuidedPractice(selectedLesson.guidedPractice || '');
                    }
                    setLessonDetailModalVisible(false);
                    setShowManualLessonModal(true);
                  }}
                  style={styles.lessonPreviewIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="create-outline" size={19} color="#1976D2" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    toast.confirm(
                      'Delete Lesson?',
                      `Are you sure you want to delete "${selectedLesson?.title}"? This action cannot be undone.`,
                      handleDeleteLesson
                    );
                  }}
                  disabled={isDeletingLesson}
                  style={[styles.lessonPreviewIconBtn, { backgroundColor: '#FFEBEE' }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={19} color="#D32F2F" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Scrollable document */}
          <ScrollView
            style={styles.flexOne}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.lessonPreviewScrollContent}
          >
            {isLessonLoading ? (
              <ActivityIndicator size="large" color="#D32F2F" style={{ marginVertical: 40 }} />
            ) : selectedLesson ? (
              <View style={styles.lessonPreviewPageWrap}>
                <View style={[styles.lessonPreviewPage, !isMobile && styles.lessonPreviewPageWeb]}>
                  {renderTemplateHeaderBanner()}

                  <View style={styles.lessonPreviewTitleBlock}>
                    <View style={styles.docPageBadge}>
                      <Ionicons
                        name={selectedLesson.isGenerated ? 'sparkles-outline' : 'create-outline'}
                        size={11}
                        color="#D32F2F"
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
                        const materialViewData: Material = {
                          id: selectedLesson.id,
                          title: selectedLesson.title,
                          week: '',
                          posted: formatDateTime12h(new Date()),
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
                      <Text style={{ fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#D32F2F' }}>
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

                  {Array.isArray(selectedLesson.objectives) && selectedLesson.objectives.length > 0 ? (
                    <View style={styles.sasCard}>
                      <Text style={styles.sectionLabel}>Intended Learning Outcomes</Text>
                      <Text style={{ color: '#333', lineHeight: 18, marginBottom: 4 }}>At the end of the lesson, you should be able to:</Text>
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
                          <Text style={styles.sectionLabel}>Materials</Text>
                          <Text style={{ color: '#333', lineHeight: 20, marginBottom: 10 }}>{selectedLesson.materials.join(', ')}</Text>
                        </>
                      ) : null}
                      {Array.isArray(selectedLesson.references) && selectedLesson.references.length > 0 ? (
                        <>
                          <Text style={styles.sectionLabel}>References</Text>
                          {selectedLesson.references.map((r: string, i: number) => (
                            <Text key={i} style={styles.sasBulletText}>{'\u2022 '}{r}</Text>
                          ))}
                        </>
                      ) : null}
                    </View>
                  ) : null}

                  {Array.isArray(selectedLesson.sdgIntegration) && selectedLesson.sdgIntegration.length > 0 ? (
                    <View style={styles.sasCard}>
                      <Text style={styles.sectionLabel}>SDG Integration</Text>
                      {selectedLesson.sdgIntegration.map((s: any, i: number) => (
                        <Text key={i} style={{ color: '#333', lineHeight: 20, marginBottom: 6 }}>
                          <Text style={{ fontWeight: '700' }}>{s.sdg}</Text>{s.description ? ` — ${s.description}` : ''}
                        </Text>
                      ))}
                    </View>
                  ) : null}

                  {selectedLesson.lessonPrep ? (
                    <View style={styles.sasCard}>
                      <Text style={styles.sectionLabel}>Lesson Preparation / Review / Preview</Text>
                      {Array.isArray(selectedLesson.lessonPrep.resources) && selectedLesson.lessonPrep.resources.length > 0 ? (
                        <View style={{ marginBottom: 8 }}>
                          {selectedLesson.lessonPrep.resources.map((r: any, i: number) => (
                            <Text key={i} style={{ color: '#1976D2', lineHeight: 20 }}>{r.label}{r.url ? `: ${r.url}` : ''}</Text>
                          ))}
                        </View>
                      ) : null}
                      {selectedLesson.lessonPrep.activityTitle ? (
                        <Text style={{ color: '#000', fontWeight: '700', marginBottom: 4 }}>Activity: "{selectedLesson.lessonPrep.activityTitle}"</Text>
                      ) : null}
                      {selectedLesson.lessonPrep.instructions ? (
                        <Text style={{ color: '#000', lineHeight: 22, marginBottom: 8 }}>
                          {renderFormattedText(selectedLesson.lessonPrep.instructions, { color: '#000', lineHeight: 22 })}
                        </Text>
                      ) : null}
                      {Array.isArray(selectedLesson.lessonPrep.guideQuestions) && selectedLesson.lessonPrep.guideQuestions.length > 0 ? (
                        <View style={{ marginBottom: 8 }}>
                          <Text style={{ fontWeight: '700', color: '#000', marginBottom: 4 }}>Guide Questions</Text>
                          {selectedLesson.lessonPrep.guideQuestions.map((q: string, i: number) => (
                            <Text key={i} style={styles.sasBulletText}>{i + 1}. {q}</Text>
                          ))}
                        </View>
                      ) : null}
                      {selectedLesson.lessonPrep.transition ? (
                        <Text style={{ color: '#444', lineHeight: 20, fontStyle: 'italic' }}>{selectedLesson.lessonPrep.transition}</Text>
                      ) : null}
                    </View>
                  ) : null}

                  {selectedLesson.discussion ? (
                    <View style={styles.sasCard}>
                      <Text style={styles.sectionLabel}>Concept Notes / Discussion</Text>
                      <Text style={{ color: '#000', lineHeight: 22 }}>
                        {renderFormattedText(selectedLesson.discussion, { color: '#000', lineHeight: 22 })}
                      </Text>
                    </View>
                  ) : null}

                  {Array.isArray(selectedLesson.keyTerms) && selectedLesson.keyTerms.length > 0 ? (
                    <View style={styles.sasCard}>
                      <Text style={styles.sectionLabel}>Key Terms to Remember</Text>
                      {selectedLesson.keyTerms.map((k: any, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 6 }}>
                          <Text style={{ width: 110, fontWeight: '700', color: '#000' }}>{k.term}</Text>
                          <Text style={{ flex: 1, color: '#333' }}>{k.meaning}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {Array.isArray(selectedLesson.takeaways) && selectedLesson.takeaways.length > 0 ? (
                    <View style={[styles.sasCard, { backgroundColor: '#FFF3E0' }]}>
                      <Text style={styles.sectionLabel}>Take Aways</Text>
                      {selectedLesson.takeaways.map((t: string, i: number) => (
                        <Text key={i} style={styles.sasBulletText}>{'\u2022 '}{t}</Text>
                      ))}
                    </View>
                  ) : null}

                  {selectedLesson.guidedPractice ? (
                    <View style={styles.sasCard}>
                      <Text style={styles.sectionLabel}>Guided Practice</Text>
                      <Text style={{ color: '#000', lineHeight: 22 }}>
                        {renderFormattedText(selectedLesson.guidedPractice, { color: '#000', lineHeight: 22 })}
                      </Text>
                    </View>
                  ) : null}

                  {selectedLesson.activity ? (
                    <View style={styles.sasCard}>
                      <Text style={styles.sectionLabel}>Compu-Skill / Performance Task</Text>
                      <Text style={{ color: '#000', lineHeight: 22 }}>
                        {renderFormattedText(selectedLesson.activity, { color: '#000', lineHeight: 22 })}
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

        </SafeAreaView>
      </Modal>
      {/* ═════════════════════════════════════════════════════════════════════
DELETE LESSON CONFIRMATION MODAL (Cross-Platform)
════════════════════════════════════════════════════════════════════════ */}
      {/* Confirmations are now shown via toast.confirm + ConfirmationModal above */}
      
      {/* ══════════════════════════════════════════════════════════════════════
MANUAL MODULE CREATION MODAL
═════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showManualModuleModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 360) : 500 }]}>
            <View style={styles.createHeaderRow}>
              <Text style={styles.createTitle}>Create Module Manually</Text>
              <TouchableOpacity onPress={() => setShowManualModuleModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={styles.sectionLabel}>Module Number</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: '#f5f5f5' }]}
                value={newModuleNum}
                editable={false}
                keyboardType="numeric"
                placeholder="Auto-generated"
                placeholderTextColor="#999"
              />
              <Text style={styles.sectionLabel}>Title</Text>
              <TextInput
                style={[styles.inputBox, isDuplicateModuleTitle && styles.errorBorder]}
                value={newModuleTitle}
                onChangeText={setNewModuleTitle}
                placeholder="Module Title"
                placeholderTextColor="#999"
              />
              {isDuplicateModuleTitle &&
                renderInputError('A module with this title already exists (generated or manual). Please use a different title.')}
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowManualModuleModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (modules.some(m => Number(m.moduleNumber) === Number(newModuleNum)) ||
                    !newModuleTitle.trim() ||
                    isDuplicateModuleTitle)
                    ? styles.disabledButton
                    : null
                ]}
                onPress={handleCreateManualModule}
                disabled={
                  modules.some(m => Number(m.moduleNumber) === Number(newModuleNum)) ||
                  !newModuleTitle.trim() ||
                  isDuplicateModuleTitle
                }
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
      {isEditingLesson ? (
        // Full-screen editor — same "Google Classroom" document-viewer layout
        // as the Lesson Preview modal (fixed top bar, scrollable letterhead
        // page, fixed bottom action bar).
        <Modal
          visible={showManualLessonModal}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
          onRequestClose={() => { setShowManualLessonModal(false); resetLessonForm(); }}
        >
          <SafeAreaView style={styles.lessonPreviewScreen} edges={['top', 'left', 'right']}>
            <View style={styles.lessonPreviewTopBar}>
              <TouchableOpacity
                onPress={() => { setShowManualLessonModal(false); resetLessonForm(); }}
                style={styles.lessonPreviewBackBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name={Platform.OS === 'web' ? 'close' : 'arrow-back'} size={22} color="#111" />
              </TouchableOpacity>
              <View style={styles.lessonPreviewTopBarTextWrap}>
                <Text style={styles.lessonPreviewTopBarTitle} numberOfLines={1}>Edit Lesson</Text>
                <Text style={styles.lessonPreviewTopBarSubtitle} numberOfLines={1}>
                  {selectedModuleForLesson?.title || 'Module Content'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCreateManualLesson}
                disabled={isSaving || isDuplicateLessonTitle || !newLessonTitle.trim()}
                style={[
                  styles.lessonPreviewIconBtn,
                  { backgroundColor: '#D32F2F' },
                  (isSaving || isDuplicateLessonTitle || !newLessonTitle.trim()) && { opacity: 0.5 },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={20} color="#FFF" />}
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.flexOne}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.lessonPreviewScrollContent}
            >
              <View style={styles.lessonPreviewPageWrap}>
                <View style={[styles.lessonPreviewPage, !isMobile && styles.lessonPreviewPageWeb]}>
                  {renderTemplateHeaderBanner()}
                  <View style={styles.docPageBadge}>
                    <Ionicons name="create-outline" size={11} color="#D32F2F" />
                    <Text style={styles.docPageBadgeText}>Edit Lesson</Text>
                  </View>
                  {renderLessonFormFields()}
                  {renderTemplateFooterBanner()}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      ) : (
        // Full-screen "Add Lesson" editor — same document-viewer layout as
        // Edit Lesson, but with a Text Content / Upload File dropdown at the
        // left of the top bar (in place of the title) and Save at the right.
        <Modal
          visible={showManualLessonModal}
          animationType="slide"
          presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
          onRequestClose={() => { setShowManualLessonModal(false); resetLessonForm(); }}
        >
          <SafeAreaView style={styles.lessonPreviewScreen} edges={['top', 'left', 'right']}>
            <View style={[styles.lessonPreviewTopBar, { zIndex: 20 }]}>
              <TouchableOpacity
                onPress={() => { setShowManualLessonModal(false); resetLessonForm(); }}
                style={styles.lessonPreviewBackBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name={Platform.OS === 'web' ? 'close' : 'arrow-back'} size={22} color="#111" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <View style={styles.lessonModeDropdownWrap}>
                  <TouchableOpacity
                    style={styles.lessonModeDropdownTrigger}
                    onPress={() => setShowLessonModeDropdown((v) => !v)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.lessonModeDropdownText} numberOfLines={1}>
                      {lessonMode === 'file' ? 'Upload File' : 'Text Content'}
                    </Text>
                    <Ionicons name={showLessonModeDropdown ? 'chevron-up' : 'chevron-down'} size={16} color="#D32F2F" />
                  </TouchableOpacity>
                  {showLessonModeDropdown && (
                    <View style={styles.lessonModeDropdownMenu}>
                      <TouchableOpacity
                        style={[styles.lessonModeDropdownItem, lessonMode === 'text' && styles.lessonModeDropdownItemActive]}
                        onPress={() => { setLessonMode('text'); setShowLessonModeDropdown(false); }}
                      >
                        <Text style={[styles.lessonModeDropdownItemText, lessonMode === 'text' && styles.lessonModeDropdownItemTextActive]}>
                          Text Content
                        </Text>
                        {lessonMode === 'text' && <Ionicons name="checkmark" size={16} color="#D32F2F" />}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.lessonModeDropdownItem, lessonMode === 'file' && styles.lessonModeDropdownItemActive]}
                        onPress={() => { setLessonMode('file'); setShowLessonModeDropdown(false); }}
                      >
                        <Text style={[styles.lessonModeDropdownItemText, lessonMode === 'file' && styles.lessonModeDropdownItemTextActive]}>
                          Upload File
                        </Text>
                        {lessonMode === 'file' && <Ionicons name="checkmark" size={16} color="#D32F2F" />}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={handleCreateManualLesson}
                disabled={isSaving || isDuplicateLessonTitle || !newLessonTitle.trim()}
                style={[
                  styles.lessonPreviewIconBtn,
                  { backgroundColor: '#D32F2F' },
                  (isSaving || isDuplicateLessonTitle || !newLessonTitle.trim()) && { opacity: 0.5 },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {isSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="checkmark" size={20} color="#FFF" />}
              </TouchableOpacity>
            </View>
            {showLessonModeDropdown && (
              <TouchableOpacity
                style={styles.lessonModeDropdownBackdrop}
                activeOpacity={1}
                onPress={() => setShowLessonModeDropdown(false)}
              />
            )}
            <ScrollView
              style={styles.flexOne}
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.lessonPreviewScrollContent}
            >
              <View style={styles.lessonPreviewPageWrap}>
                <View style={[styles.lessonPreviewPage, !isMobile && styles.lessonPreviewPageWeb]}>
                  {renderTemplateHeaderBanner()}
                  <View style={styles.docPageBadge}>
                    <Ionicons name="add-circle-outline" size={11} color="#D32F2F" />
                    <Text style={styles.docPageBadgeText}>Manually Created</Text>
                  </View>
                  <Text style={styles.lessonPreviewTopBarSubtitle}>
                    Adding to "{selectedModuleForLesson?.title}"
                  </Text>
                  {renderLessonFormFields()}
                  {renderTemplateFooterBanner()}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
      {/* ══════════════════════════════════════════════════════════════════════
COURSE STRUCTURE PREVIEW & APPROVAL MODAL
════════════════════════════════════════════════════════════════════════ */}
      {renderStructurePreviewModal()}
      {/* ══════════════════════════════════════════════════════════════════════
RESULT MODAL (REMOVED - Replaced by Toast)
════════════════════════════════════════════════════════════════════════ */}
      
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
              {selectedGenModule && (
                <>
                  <Text style={styles.sectionLabel}>Select Topic</Text>
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
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Content to Generate</Text>
              <View style={{ backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EEE' }}>
                <Text style={{ fontSize: 13, color: '#444', lineHeight: 19 }}>
                  A full Student Activity Sheet will be generated — Intended Learning Outcomes, Materials, References,
                  SDG Integration, Lesson Preparation, Concept Notes / Discussion, Key Terms, Take Aways, Guided Practice,
                  and a Compu-Skill / Performance Task. Every section is included automatically.
                </Text>
              </View>
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
                  Select one or more subtopics from "{targetModuleForGen?.title}" to generate content. Each subtopic becomes its own lesson.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowNextLessonModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {!targetModuleForGen?.topics || targetModuleForGen.topics.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#888', padding: 20 }}>
                  {targetModuleForGen?.type === 'manual'
                    ? "This is a manually created module. Topics are only available for modules defined in the uploaded Syllabus."
                    : !currentSyllabus?.structure?.modules ||
                      !currentSyllabus.structure.modules.some((m: any) =>
                        (targetModuleForGen?.moduleNumber != null &&
                          Number(m.moduleNumber) === Number(targetModuleForGen.moduleNumber)) ||
                        (targetModuleForGen?.title &&
                          String(m.moduleTitle || m.title).trim().toLowerCase() ===
                          String(targetModuleForGen.title).trim().toLowerCase())
                      )
                    ? "This module no longer matches a module in the current Syllabus (it may have been removed, renumbered, or renamed since this module was generated). Update the syllabus mapping or add lessons manually."
                    : "All topics for this module have already been generated!"}
                </Text>
              ) : (
                targetModuleForGen.topics.map((topic: any, tIdx: number) => {
                  // If this topic has no distinct subtopics of its own (the
                  // fallback case is a single-item array equal to the topic
                  // title), skip the redundant header and just show the item.
                  const isFallbackSingleItem =
                    topic.subtopics.length === 1 &&
                    String(topic.subtopics[0]).trim().toLowerCase() === String(topic.title).trim().toLowerCase();
                  return (
                    <View key={tIdx} style={{ marginBottom: 14 }}>
                      {!isFallbackSingleItem && (
                        <Text style={{ fontSize: 13, fontWeight: WEIGHT_EMPHASIS, color: '#D32F2F', marginBottom: 6 }}>
                          {topic.title}
                        </Text>
                      )}
                      {topic.subtopics.map((subtopicTitle: string, sIdx: number) => {
                        const isSelected = selectedTopicsForGen.includes(subtopicTitle);
                        return (
                          <TouchableOpacity
                            key={sIdx}
                            onPress={() => toggleTopicSelection(subtopicTitle)}
                            style={[
                              styles.materialChip,
                              { marginBottom: 8, minHeight: 44 },
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
                                {subtopicTitle}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
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
MODULE SELECTION MODAL (mirrors "Generate Next Lessons" above)
═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showModuleSelectionModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 380) : 520 }]}>
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Select Modules to Generate</Text>
                <Text style={styles.modalSubtitle}>
                  Select one or more modules from the uploaded Syllabus to create. Each selected module is added as its own empty module — no lessons are generated yet.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowModuleSelectionModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {unmadeSyllabusModules.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#888', padding: 20 }}>
                  All modules from the current Syllabus have already been created!
                </Text>
              ) : (
                unmadeSyllabusModules.map((sylMod: any, mIdx: number) => {
                  const moduleTitle = sylMod.moduleTitle || sylMod.title;
                  const isSelected = selectedModulesForGen.includes(moduleTitle);
                  return (
                    <TouchableOpacity
                      key={mIdx}
                      onPress={() => toggleModuleSelectionForGen(moduleTitle)}
                      style={[
                        styles.materialChip,
                        { marginBottom: 8, minHeight: 44 },
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
                          {moduleTitle}
                        </Text>
                        {!!sylMod.weeklySchedule && (
                          <Text
                            style={[
                              { fontSize: 12, marginTop: 2, color: '#777' },
                              isSelected && { color: '#EEE' }
                            ]}
                          >
                            {sylMod.weeklySchedule}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowModuleSelectionModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, (isGeneratingModules || selectedModulesForGen.length === 0) && styles.disabledButton]}
                onPress={handleGenerateSelectedModules}
                disabled={isGeneratingModules || selectedModulesForGen.length === 0}
              >
                {isGeneratingModules ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                    <Text style={styles.primaryButtonText}>Create ({selectedModulesForGen.length})</Text>
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
            <Text style={[styles.createTitle, { textAlign: 'center', marginBottom: 10 }]}>
              {isEditingSyllabus ? 'Confirm Replacement' : 'Confirm Upload'}
            </Text>
            <View style={{ backgroundColor: '#F5F5F5', padding: 12, borderRadius: 14, marginBottom: 16, alignItems: 'center' }}>
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
              {isEditingSyllabus ? (
                <>
                  This will replace the current syllabus{currentSyllabus?.fileName ? ` ("${currentSyllabus.fileName}")` : ''}.
                  <Text style={{ fontWeight: '700', color: '#D32F2F' }}> New "Generate Module" runs will use this updated file. Modules already generated are not changed.</Text>
                </>
              ) : (
                <>
                  Please verify that this is the correct syllabus file.
                  <Text style={{ fontWeight: '700', color: '#D32F2F' }}> You can replace or delete it later using Edit / Delete.</Text>
                </>
              )}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => { setPendingSyllabusFile(null); setIsEditingSyllabus(false); }}
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
                  <Text style={styles.primaryButtonText}>{isEditingSyllabus ? 'Confirm & Replace' : 'Confirm & Upload'}</Text>
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
                <Text style={styles.createTitle}>
                  Edit Generated Lessons{pendingGeneratedLessons.length > 0 ? ` (${pendingGeneratedLessons.length})` : ''}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {pendingGeneratedLessons.length > 1
                    ? 'Review, edit, or remove each lesson before saving them all.'
                    : 'Review and modify content before saving.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLessonPreviewModal(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {pendingGeneratedLessons.map((lesson, index) =>
                renderDocPage(
                  <View style={{ marginBottom: 24 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#D32F2F', flex: 1, marginRight: 8 }}>
                        Lesson {index + 1}: {lesson.title}
                      </Text>
                      {pendingGeneratedLessons.length > 1 && (
                        <TouchableOpacity
                          onPress={() => {
                            const updated = pendingGeneratedLessons.filter((_, i) => i !== index);
                            setPendingGeneratedLessons(updated);
                          }}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FFEBEE' }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#D32F2F" />
                          <Text style={{ color: '#D32F2F', fontWeight: '700', fontSize: 12 }}>Remove</Text>
                        </TouchableOpacity>
                      )}
                    </View>
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
                  </View>,
                  'AI Generated',
                  lesson.id || index
                )
              )}
              {pendingGeneratedLessons.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#888', padding: 20 }}>
                  All generated lessons were removed. Close this and generate again if needed.
                </Text>
              )}
            </ScrollView>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setShowLessonPreviewModal(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, (isSavingGeneratedLessons || pendingGeneratedLessons.length === 0) && styles.disabledButton]}
                onPress={handleSavePreviewedLessons}
                disabled={isSavingGeneratedLessons || pendingGeneratedLessons.length === 0}
              >
                {isSavingGeneratedLessons ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {pendingGeneratedLessons.length > 1 ? `Save All Lessons (${pendingGeneratedLessons.length})` : 'Save Lesson'}
                  </Text>
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
      {renderToastAndConfirmation()}
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
  // ── Google Classroom–style banner header ──
  courseHeaderWrap: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  bannerBox: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#D32F2F',
  },
  bannerFallback: {
    backgroundColor: '#D32F2F',
  },
  bannerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  backButtonOnBanner: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportGradesButtonOnBanner: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  bannerTextBlock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
  },
  courseNameOnBanner: {
    color: '#FFFFFF',
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  courseInstructorOnBanner: { fontFamily: FONT_BODY,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 14,
    paddingBottom: 12,
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    flexShrink: 1,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F3F4',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metaChipText: { fontFamily: FONT_BODY, color: '#3C4043', fontSize: 12, fontWeight: '700' },
  classCodeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDEAEA',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  classCodeInlineValue: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
  copyCodeInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(211,47,47,0.25)',
  },
  copyCodeInlineText: { fontFamily: FONT_BODY, color: '#D32F2F', fontSize: 12, fontWeight: WEIGHT_EMPHASIS },
  scheduleStripWrap: { paddingBottom: 14 },
  scheduleStripCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scheduleStripTextWrap: { flex: 1, gap: 3 },
  scheduleStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleStripDays: { fontFamily: FONT_BODY, color: '#202124', fontSize: 12, fontWeight: WEIGHT_EMPHASIS, minWidth: 80 },
  scheduleStripTime: { fontFamily: FONT_BODY, color: '#5F6368', fontSize: 12, fontWeight: '600' },
  scheduleStripRoom: { fontFamily: FONT_BODY, color: '#80868B', fontSize: 12, fontStyle: 'italic' },
  headerBottomDivider: {
    height: 1,
    backgroundColor: '#E8EAED',
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
  courseName: { color: '#FFF', fontWeight: WEIGHT_EMPHASIS, letterSpacing: 0.2 },
  scheduleDisplayCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
  },
  scheduleDisplayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  scheduleDisplayTitle: { fontFamily: FONT_TITLE,
    color: '#FFF',
    fontSize: 13,
    fontWeight: WEIGHT_TITLE,
  },
  scheduleDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  scheduleDisplayDays: { fontFamily: FONT_BODY,
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    minWidth: 90,
  },
  scheduleDisplayTime: { fontFamily: FONT_BODY,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
  },
  scheduleDisplayRoom: { fontFamily: FONT_BODY,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  headerInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    padding: 14,
  },
  headerInfoRow: { marginBottom: 12 },
  headerInfoLabel: { fontFamily: FONT_TITLE,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: WEIGHT_TITLE,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerInfoValue: { fontFamily: FONT_TITLE, color: '#FFF', fontSize: 14, fontWeight: WEIGHT_TITLE },
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
  academicInfoLabel: { fontFamily: FONT_BODY,
    color: '#8A8A8A',
    fontSize: 10,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  academicInfoValue: { fontFamily: FONT_BODY, color: '#202124', fontSize: 12, fontWeight: WEIGHT_EMPHASIS, marginTop: 2 },
  classCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    minWidth: 132,
    flexGrow: 1,
    flexBasis: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  classCodeStandalone: {
    flexGrow: 0,
    flexBasis: 'auto',
    alignSelf: 'flex-start',
    minWidth: 0,
    marginTop: 14,
  },
  classCodeIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 16,
    backgroundColor: '#FDEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  classCodeTextWrap: { flex: 1 },
  classCodeLabel: { fontFamily: FONT_BODY, color: '#9AA0A6', fontSize: 10, fontWeight: WEIGHT_EMPHASIS, letterSpacing: 0.8 },
  classCodeValue: {
    color: '#202124',
    fontSize: 15,
    fontWeight: WEIGHT_EMPHASIS,
    marginTop: 2,
    letterSpacing: 1.2,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
  },
  classCodeDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#EEEEEE',
    marginVertical: 2,
  },
  copyCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  copyCodeText: { fontFamily: FONT_BODY, color: '#FFFFFF', fontWeight: WEIGHT_EMPHASIS, fontSize: 12 },
  exportGradesButtonInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1F7A3A',
    paddingHorizontal: 12,
    minWidth: 42,
    height: 42,
    borderRadius: 16,
    borderBottomWidth: 3,
    borderBottomColor: '#145A2A',
  },
  exportGradesButtonText: { fontFamily: FONT_BODY,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: WEIGHT_EMPHASIS,
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
  viewerTitle: { fontFamily: FONT_TITLE, color: '#FFF', fontSize: 15, fontWeight: WEIGHT_TITLE, letterSpacing: 0.1 },
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
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  viewerTypeText: { fontFamily: FONT_BODY,
    color: '#D32F2F',
    fontSize: 10,
    fontWeight: WEIGHT_EMPHASIS,
    letterSpacing: 0.5,
  },
  viewerPdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  viewerPdfBadgeText: { fontFamily: FONT_BODY, color: '#1565C0', fontSize: 10, fontWeight: WEIGHT_EMPHASIS },
  viewerWeekBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  viewerWeekText: { fontFamily: FONT_BODY, color: '#FFF', fontSize: 10, fontWeight: '700' },
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
  viewerExternalTitle: { fontFamily: FONT_TITLE,
    fontSize: 18,
    fontWeight: WEIGHT_TITLE,
    color: '#111',
    textAlign: 'center',
  },
  viewerExternalText: { fontFamily: FONT_BODY,
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
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  viewerExternalButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: '700', fontSize: 14 },
  viewerTextContent: {
    padding: 24,
    backgroundColor: '#FFF',
    minHeight: '100%',
  },
  viewerTextTitle: { fontFamily: FONT_TITLE,
    fontSize: 22,
    fontWeight: WEIGHT_TITLE,
    color: '#111',
    marginBottom: 8,
  },
  viewerTextMeta: { fontFamily: FONT_BODY,
    fontSize: 13,
    color: '#D32F2F',
    fontWeight: '700',
    marginBottom: 16,
  },
  viewerTextBody: { fontFamily: FONT_BODY,
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
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#FFF',
  },
  deleteMaterialBtnText: { fontFamily: FONT_BODY,
    color: '#D32F2F',
    fontWeight: WEIGHT_EMPHASIS,
    fontSize: 13,
  },
  currentFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#F1D0D0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  currentFileLabel: { fontFamily: FONT_BODY,
    fontSize: 11,
    color: '#999',
    fontWeight: '700',
    marginBottom: 2,
  },
  currentFileName: { fontFamily: FONT_BODY,
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
  dateTimeScroll: { flexGrow: 0 },
  dateTimeScrollContent: { paddingBottom: 4 },
  modalScrollContent: { paddingBottom: 10 },
  createHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  modalHeaderTextWrap: { flex: 1, paddingRight: 12 },
  createTitle: { fontFamily: FONT_TITLE, fontSize: 18, fontWeight: WEIGHT_TITLE, color: '#111' },
  modalSubtitle: { fontFamily: FONT_BODY, fontSize: 13, color: '#666', lineHeight: 19, marginTop: 4 },
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
  // Number of Questions only ever holds up to 2 digits (maxLength={2}), so it
  // doesn't need to span the full column width like a text field would.
  numberOfQuestionsInput: { width: '100%', maxWidth: 100 },
  fullWidthSection: { width: '100%' },
  sectionLabel: { fontFamily: FONT_BODY,
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
    marginTop: 10,
  },
  sasCard: {
    marginBottom: 16,
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  sasBulletText: { color: '#333', lineHeight: 20, marginBottom: 3 },
  sasFormSectionDivider: {
    fontFamily: FONT_BODY,
    fontSize: 12,
    fontWeight: '800',
    color: '#D32F2F',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  helperText: { fontFamily: FONT_BODY, fontSize: 12, color: '#777', marginBottom: 8, lineHeight: 18 },
  emptyMiniText: { fontFamily: FONT_BODY, fontSize: 12, color: '#999', marginBottom: 6 },
  errorText: { fontFamily: FONT_BODY, color: '#D32F2F', fontSize: 12, fontWeight: '600', marginTop: -2, marginBottom: 6 },
  errorBorder: { borderColor: '#D32F2F', borderWidth: 1.5 },
  errorContainer: { borderWidth: 1.5, borderColor: '#D32F2F', borderRadius: 14, padding: 8 },
  inputBox: { fontFamily: FONT_BODY,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    marginBottom: 8,
    fontSize: 14,
    color: '#111',
  },
  textAreaBox: { fontFamily: FONT_BODY,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    marginBottom: 8,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 16,
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
  clearSelectionText: { fontFamily: FONT_BODY,
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '700',
  },
  materialSelectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  materialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F0B9B9',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  materialChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  materialChipText: { color: '#D32F2F', fontWeight: '700', flex: 1 },
  materialChipTextActive: { color: '#FFF' },
  // Read-only chip shown once questions have been generated — lesson
  // selection is locked until the teacher explicitly chooses to change it.
  materialChipLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  materialChipTextLocked: { color: '#888' },
  reviewQuestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 16,
    paddingVertical: 10,
    marginTop: 12,
  },
  reviewQuestionsButtonText: { fontFamily: FONT_BODY, color: '#D32F2F', fontWeight: '700', fontSize: 13 },
  lessonChip: {
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  lessonChipText: {
    color: '#1565C0',
  },
  lessonSubtext: { fontFamily: FONT_BODY,
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  uploadBtnText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: WEIGHT_EMPHASIS, fontSize: 13 },
  filePreviewBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1D0D0',
    backgroundColor: '#FFF8F8',
    padding: 12,
    borderRadius: 16,
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
    borderRadius: 14,
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFF', fontWeight: WEIGHT_EMPHASIS, textAlign: 'center' },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D32F2F',
    minHeight: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  secondaryButtonText: { color: '#D32F2F', fontWeight: WEIGHT_EMPHASIS },
  floatingSaveWrap: { position: 'absolute', right: 18, left: 18, bottom: 18 },
  floatingSaveWrapMobile: { right: 18, left: 18, bottom: 18 },
  floatingSaveButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 16,
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
  floatingSaveButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
  // Non-floating version of the Save button used inside the Create
  // Assignment form (both Regular Submission and Game Based): sits in the
  // normal document flow at the bottom, right-aligned, instead of an
  // always-visible overlay covering the scrollable content.
  inlineSaveWrap: {
    flexDirection: 'row',
    marginTop: 20,
  },
  inlineSaveButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 16,
    minHeight: 48,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
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
  savingTitle: { fontFamily: FONT_TITLE,
    marginTop: 12,
    fontSize: 17,
    fontWeight: WEIGHT_TITLE,
    color: '#111',
    textAlign: 'center',
  },
  savingMessage: { fontFamily: FONT_BODY,
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: '#666',
    textAlign: 'center',
  },
  previewContent: { fontFamily: FONT_BODY, fontSize: 14, color: '#444', lineHeight: 22, marginTop: 10 },
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
    gap: 8,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthLabel: { fontFamily: FONT_BODY, fontSize: 16, fontWeight: WEIGHT_EMPHASIS, color: '#111', flexShrink: 1, textAlign: 'center' },
  calendarMonthLabelCompact: { fontFamily: FONT_BODY, fontSize: 14 },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { fontFamily: FONT_BODY,
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
  },
  weekLabelCompact: { fontFamily: FONT_BODY, fontSize: 11 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginBottom: 6,
  },
  dayCellOutside: { opacity: 0.35 },
  dayCellActive: { backgroundColor: '#D32F2F' },
  dayCellDisabled: { backgroundColor: '#F5F5F5', opacity: 0.45 },
  dayText: { color: '#222', fontWeight: '600' },
  dayTextCompact: { fontFamily: FONT_BODY, fontSize: 12 },
  dayTextOutside: { color: '#888' },
  dayTextActive: { color: '#FFF', fontWeight: WEIGHT_EMPHASIS },
  dayTextDisabled: { color: '#B0B0B0' },
  timeLabel: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: '700', color: '#222', marginTop: 16, marginBottom: 8 },
  // ✅ Merged Time field (typed HH:MM + AM/PM toggle), replacing the old
  // separate scrollable Hour / Minute columns — mirrors TimeInputField
  // used on the Teacher Dashboard's Create Class schedule blocks.
  timeInputRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  timeTextInputWrap: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  timeTextInputWrapFocused: { borderColor: '#D32F2F', borderWidth: 1.5 },
  timeTextInput: { fontFamily: FONT_BODY,
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  meridiemToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  meridiemBtn: { paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center' },
  meridiemBtnActive: { backgroundColor: '#D32F2F' },
  meridiemBtnText: { fontFamily: FONT_BODY, fontSize: 13, fontWeight: WEIGHT_EMPHASIS, color: '#9AA0A6' },
  meridiemBtnTextActive: { color: '#FFFFFF' },
  timeErrorText: { fontFamily: FONT_BODY, marginTop: 8, color: '#D32F2F', fontSize: 12, fontWeight: '700' },
  datePreviewBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#F1D0D0',
    backgroundColor: '#FFF8F8',
    borderRadius: 16,
    padding: 12,
  },
  datePreviewLabel: { fontFamily: FONT_BODY, fontSize: 12, fontWeight: '700', color: '#777', marginBottom: 4 },
  datePreviewValue: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, color: '#D32F2F' },
  datePreviewValueCompact: { fontFamily: FONT_BODY, fontSize: 12 },
  typeChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0B9B9',
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
  },
  typeChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  typeChipText: { fontFamily: FONT_BODY, color: '#D32F2F', fontWeight: '700', fontSize: 14 },
  typeChipTextActive: { color: '#FFF' },
  gameAndClassRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  gameAndClassRowMobile: { flexDirection: 'column', gap: 12 },
  // ✅ NEW: Right-aligns the "Select Game" field on desktop so its
  // fixed (formColumnRightDesktop) width lines up under the same right
  // column as the Due Date & Time field, instead of sitting flush left.
  gameAndClassRowDesktop: { justifyContent: 'flex-end' },
  dropdownWrap: { flex: 1 },
  dropdownWrapHalf: { flexBasis: '48%' },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  dropdownText: { fontFamily: FONT_BODY, color: '#111', fontWeight: '600', fontSize: 14, flex: 1, marginRight: 8 },
  dropdownPlaceholder: { color: '#999' },

  // ✅ NEW: shared dropdown-field styles (Assignment Type + Game Type),
  // matching the "Filter Assignments" dropdown pattern in Assignments.tsx —
  // an inline absolutely-positioned menu on large screens, or a bottom-sheet
  // Modal on mobile.
  formDropdownContainer: { position: 'relative', zIndex: 4000 },
  formInlineDropdownMenu: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    overflow: 'hidden',
    zIndex: 5000,
    maxHeight: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  formDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  formDropdownItemText: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, color: '#111' },
  formDropdownItemTextSelected: { color: '#B71C1C' },
  formDropdownItemDesc: { fontFamily: FONT_BODY, fontSize: 11, color: '#888', marginTop: 2, lineHeight: 15 },

  // ✅ Mobile bottom-sheet Modal variant — same shape as Assignments.tsx's
  // "Filter Assignments" sheet.
  formDropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  formDropdownModalSheet: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
  },
  formDropdownModalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 14,
    backgroundColor: '#DDD6CE',
    marginBottom: 12,
  },
  formDropdownModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE4',
  },
  formDropdownModalTitle: { fontFamily: FONT_TITLE, fontSize: 15, fontWeight: WEIGHT_TITLE, color: '#3B332E' },
  formDropdownModalScroll: { maxHeight: 320 },
  formDropdownModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  formDropdownModalItemSelected: { backgroundColor: '#FDECEC' },
  formDropdownModalItemText: { fontFamily: FONT_BODY, fontSize: 14, fontWeight: WEIGHT_EMPHASIS, color: '#111' },
  formDropdownModalItemTextSelected: { fontFamily: FONT_BODY, color: '#B71C1C', fontWeight: WEIGHT_EMPHASIS },
  formDropdownModalItemDesc: { fontFamily: FONT_BODY, fontSize: 12, color: '#888', marginTop: 2, lineHeight: 16 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemActive: { backgroundColor: '#D32F2F', borderBottomColor: '#C62828' },
  dropdownItemText: { fontFamily: FONT_BODY, color: '#111', fontWeight: '700', fontSize: 14, flex: 1 },
  dropdownItemTextActive: { color: '#FFF' },
  dropdownItemDesc: { fontFamily: FONT_BODY, color: '#888', fontSize: 11, marginTop: 2, lineHeight: 15 },
  dropdownItemDescActive: { color: '#FFE0E0' },
  attemptChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0B9B9',
    backgroundColor: '#FFF5F5',
  },
  attemptChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  attemptChipText: { fontFamily: FONT_BODY, color: '#D32F2F', fontWeight: '700', fontSize: 13 },
  attemptChipTextActive: { color: '#FFF' },
  timeChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0B9B9',
    backgroundColor: '#FFF5F5',
  },
  timeChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  timeChipText: { fontFamily: FONT_BODY, color: '#D32F2F', fontWeight: '700', fontSize: 13 },
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
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  generateButtonText: { fontFamily: FONT_BODY, color: '#FFF', fontWeight: WEIGHT_EMPHASIS, fontSize: 14 },
  correctnessDropdown: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 90,
    justifyContent: 'center',
  },
  // Toast portal — matches the pattern used in SignIn.tsx; lets touches
  // pass through to whatever's behind, except the toast itself.
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
  // "Word/PDF"-style document page used to frame lesson content (Lesson
  // Preview, Edit Lesson, and manually created lessons) with the
  // school-wide header/footer banner, like a letterhead.
  docPageOuter: {
    backgroundColor: '#ECECEC',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  docPage: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  docPageHeaderImage: {
    width: '100%',
    height: 90,
    marginBottom: 16,
  },
  docPageFooterImage: {
    width: '100%',
    height: 64,
    marginTop: 20,
  },
  docPageDivider: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    marginBottom: 16,
  },
  docPageBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FCE8E8',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  docPageBadgeText: { fontFamily: FONT_BODY,
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  manageTemplateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  manageTemplateButtonText: { fontFamily: FONT_BODY, color: '#D32F2F', fontWeight: '700', fontSize: 12 },
  templateSlotCard: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  templateSlotPreviewBox: {
    width: '100%',
    height: 100,
    borderRadius: 14,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  templateSlotPreviewImage: { width: '100%', height: '100%' },

  // ── Lesson Preview — full-screen "Google Classroom" document viewer ──
  // Outer screen behind the "page" is a soft neutral gray (same idea as a
  // PDF/Docs viewer canvas) so the white letterhead page reads as a sheet
  // of paper, mirroring the Official Grade Report look used in Grades.
  lessonPreviewScreen: {
    flex: 1,
    backgroundColor: '#ECECEC',
  },
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
  lessonPreviewBottomToolbar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 4,
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
  // Used to keep an inactive tab panel mounted (so switching tabs doesn't
  // pay a full unmount/remount cost) while removing it from layout/paint.
  hiddenTabPanel: {
    display: 'none',
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
  lessonPreviewIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
  lessonModeDropdownWrap: {
    alignSelf: 'flex-start',
    position: 'relative',
  },
  lessonModeDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    maxWidth: 180,
  },
  lessonModeDropdownText: { fontFamily: FONT_BODY,
    color: '#111',
    fontWeight: '700',
    fontSize: 13,
  },
  lessonModeDropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  lessonModeDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: 190,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 30,
    overflow: 'hidden',
  },
  lessonModeDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lessonModeDropdownItemActive: {
    backgroundColor: '#FFF5F5',
  },
  lessonModeDropdownItemText: { fontFamily: FONT_BODY,
    color: '#333',
    fontWeight: '600',
    fontSize: 13,
  },
  lessonModeDropdownItemTextActive: {
    color: '#D32F2F',
    fontWeight: WEIGHT_EMPHASIS,
  },
  lessonPreviewBottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 4,
  },
});