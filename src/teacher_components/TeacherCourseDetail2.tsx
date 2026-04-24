import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import TeacherAssignmentSection from './TeacherAssignmentSection';
import TeacherMaterialSection from './TeacherMaterialSection';
import TeacherSubmissionsSection from './TeacherSubmissionsSection';

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
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 23, 59);
  }

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

const isPastDay = (date: Date) => {
  return date.getTime() < startOfToday().getTime();
};

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

const mapMaterial = (item: any): Material => ({
  id: item.id,
  title: item.title || '',
  week: item.week || '',
  posted: formatDateTime(item.createdAt || item.posted),
  content: item.content || '',
  fileName: item.fileName || undefined,
  fileUri: item.fileUrl || item.fileUri || undefined,
  fileType: item.fileType || undefined,
});

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
  score: typeof item.score === 'number' ? item.score : item.score === null ? undefined : Number(item.score),
  submittedAt: formatDateTime(item.submittedAt),
  fileName: item.fileName || undefined,
  fileUrl: item.fileUrl || undefined,
  fileType: item.fileType || undefined,
  feedback: item.feedback || '',
});

const TeacherCourseDetail2 = ({
  onBack,
  course,
  currentTeacher,
}: {
  onBack?: () => void;
  course?: CourseDetailData;
  currentTeacher: SignedInTeacher;
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

  const teacherIdentity = useMemo(() => {
    return (
      currentTeacher?.teacherId?.trim() ||
      currentTeacher?.authUid?.trim() ||
      currentTeacher?.email?.trim() ||
      teacherFullName
    );
  }, [currentTeacher, teacherFullName]);

  const [activeTab, setActiveTab] = useState<'Materials' | 'Assignments'>('Materials');
  const [showSubmissions, setShowSubmissions] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);

  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPoints, setFormPoints] = useState('');
  const [formDue, setFormDue] = useState('');
  const [formPointsOnTime, setFormPointsOnTime] = useState('');
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [assignmentDisableRepositoryAfterDue, setAssignmentDisableRepositoryAfterDue] = useState(false);
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
        fetch(`${API_BASE_URL}/class-materials/${course.id}`),
        fetch(`${API_BASE_URL}/class-assignments/${course.id}`),
        fetch(`${API_BASE_URL}/class-members/${course.id}`),
        fetch(`${API_BASE_URL}/class-submissions/${course.id}`),
      ]);

      const [materialsData, assignmentsData, membersData, submissionsData] = await Promise.all([
        materialsRes.json(),
        assignmentsRes.json(),
        membersRes.json(),
        submissionsRes.json(),
      ]);

      setMaterials(materialsRes.ok && Array.isArray(materialsData) ? materialsData.map(mapMaterial) : []);
      setAssignments(assignmentsRes.ok && Array.isArray(assignmentsData) ? assignmentsData.map(mapAssignment) : []);
      setMembers(
        membersRes.ok && Array.isArray(membersData)
          ? membersData
              .filter((item: any) => item?.role === 'student')
              .map(mapMember)
          : []
      );
      setSubmissions(submissionsRes.ok && Array.isArray(submissionsData) ? submissionsData.map(mapSubmission) : []);
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
    setShowUpdateModal(true);
  };

  const openMaterialModal = (material: Material) => {
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const openDateTimePicker = () => {
    const parsed = parseDueDateTime(formDue);
    setDraftDueDateTime(parsed);
    setVisibleCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setShowDateTimeModal(true);
  };

  const applyDraftDateTime = () => {
    if (draftDueDateTime.getTime() < startOfToday().getTime()) {
      setErrors((prev) => ({
        ...prev,
        dueDate: 'Past dates are not allowed.',
      }));
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
      prev.includes(materialId)
        ? prev.filter((id) => id !== materialId)
        : [...prev, materialId]
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

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

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

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;

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
            if (typeof result === 'string') {
              resolve(result.includes(',') ? result.split(',')[1] : result);
            } else {
              reject(new Error('Failed to read file on web.'));
            }
          };
          reader.onerror = () => reject(new Error('Failed to read file on web.'));
          reader.readAsDataURL(picked.file as File);
        });
      }
    } else if (picked.uri) {
      fileBase64 = await FileSystem.readAsStringAsync(picked.uri, {
        encoding: 'base64' as any,
      });
    }

    const response = await fetch(`${API_BASE_URL}/upload-class-file`, {
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


  const handleGradeSubmission = async (submissionId: string, score: number, feedback?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/grade-submission/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'graded',
          score,
          feedback: feedback || null,
        }),
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

  const validateAssignmentForm = () => {
    const nextErrors: FormErrors = {};

    if (!formTitle.trim()) nextErrors.title = 'Header is required.';
    if (!formDesc.trim()) nextErrors.instruction = 'Instruction is required.';
    if (!formPoints.trim()) nextErrors.totalScore = 'Total score is required.';
    if (!formPointsOnTime.trim()) nextErrors.pointsOnTime = 'Points on time is required.';
    if (!formDue.trim()) nextErrors.dueDate = 'Due date and time is required.';
    if (selectedMaterialIds.length === 0) nextErrors.materials = 'Select at least one related material.';

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      showResultModal('error', 'Required', 'Please complete the highlighted assignment fields.');
      return false;
    }

    return true;
  };

  const handleCreate = async () => {
    if (!course?.id) {
      showResultModal('error', 'Error', 'No class selected.');
      return;
    }

    if (activeTab === 'Materials') {
      if (!formTitle.trim() || !formPointsOnTime.trim()) {
        showResultModal('error', 'Required', 'Please enter the title and week.');
        return;
      }

      try {
        let uploadedFile = null;
        if (pickedFile?.uri || pickedFile?.base64 || pickedFile?.file) {
          uploadedFile = await uploadPickedFile(pickedFile, 'material');
        }

        const response = await fetch(`${API_BASE_URL}/create-class-material`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classId: course.id,
            title: formTitle.trim(),
            week: formPointsOnTime.trim(),
            content: formDesc.trim() || `${formPointsOnTime.trim()} material: ${formTitle.trim()}`,
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
        if (!response.ok) throw new Error(data.error || 'Failed to create material');

        await loadCourseContent();
        setShowCreateModal(false);
        resetCreateForm();
        showResultModal('success', 'Success', 'Material uploaded successfully.');
      } catch (error: any) {
        showResultModal('error', 'Upload Failed', error?.message || 'Failed to create material.');
      }
      return;
    }

    if (!validateAssignmentForm()) return;

    try {
      let uploadedFile = null;
      if (pickedAssignmentFile?.uri || pickedAssignmentFile?.base64 || pickedAssignmentFile?.file) {
        uploadedFile = await uploadPickedFile(pickedAssignmentFile, 'assignment');
      }

      const response = await fetch(`${API_BASE_URL}/create-class-assignment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: course.id,
          header: formTitle.trim(),
          instruction: formDesc.trim(),
          dueDate: formDue.trim(),
          totalScore: Number(formPoints),
          pointsOnTime: Number(formPointsOnTime),
          repositoryDisabledAfterDue: assignmentDisableRepositoryAfterDue,
          materialIds: selectedMaterialIds,
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
    }
  };

  const handleUpdate = async () => {
    if (!selectedId) return;
    if (!validateAssignmentForm()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/update-class-assignment/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: formTitle.trim(),
          instruction: formDesc.trim(),
          totalScore: Number(formPoints),
          pointsOnTime: Number(formPointsOnTime),
          dueDate: formDue.trim(),
          repositoryDisabledAfterDue: assignmentDisableRepositoryAfterDue,
          materialIds: selectedMaterialIds,
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
      <Text style={styles.sectionLabel}>Related Material</Text>
      <Text style={styles.helperText}>
        Select the materials the AI should use for follow-up activity generation.
      </Text>

      {materials.length === 0 ? (
        <Text style={styles.emptyMiniText}>No created materials yet.</Text>
      ) : (
        <View
          style={[
            styles.materialSelectorWrap,
            errors.materials ? styles.errorContainer : null,
          ]}
        >
          {materials.map((material) => {
            const active = selectedMaterialIds.includes(material.id);
            return (
              <TouchableOpacity
                key={material.id}
                style={[styles.materialChip, active && styles.materialChipActive]}
                onPress={() => toggleRelatedMaterial(material.id)}
                activeOpacity={0.85}
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
        style={[styles.dateButton, errors.dueDate ? styles.errorBorder : null]}
        onPress={openDateTimePicker}
        activeOpacity={0.85}
      >
        <Ionicons name="calendar-outline" size={18} color="#D32F2F" />
        <Text style={styles.dateButtonText}>{formDue || 'Select due date and time'}</Text>
      </TouchableOpacity>
      {renderInputError(errors.dueDate)}
    </View>
  );

  const renderAssignmentFields = () => (
    <View style={[styles.formGrid, !isMobile && styles.formGridDesktop]}>
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
        />
        {renderInputError(errors.instruction)}
      </View>

      <View style={[styles.formColumnRight, !isMobile && styles.formColumnRightDesktop]}>
        {renderDateTimeField()}

        <View style={styles.scoreStackDesktop}>
          <View style={styles.scoreFieldFull}>
            <Text style={styles.sectionLabel}>Total Score</Text>
            <TextInput
              style={[styles.inputBox, errors.totalScore ? styles.errorBorder : null]}
              value={formPoints}
              onChangeText={(value) => {
                setFormPoints(value);
                if (errors.totalScore) setErrors((prev) => ({ ...prev, totalScore: undefined }));
              }}
              keyboardType="numeric"
              placeholder="Total Score"
              placeholderTextColor="#999"
            />
            {renderInputError(errors.totalScore)}
          </View>

          <View style={styles.scoreFieldFull}>
            <Text style={styles.sectionLabel}>Points On Time</Text>
            <TextInput
              style={[styles.inputBox, errors.pointsOnTime ? styles.errorBorder : null]}
              value={formPointsOnTime}
              onChangeText={(value) => {
                setFormPointsOnTime(value);
                if (errors.pointsOnTime) setErrors((prev) => ({ ...prev, pointsOnTime: undefined }));
              }}
              keyboardType="numeric"
              placeholder="Points On Time"
              placeholderTextColor="#999"
            />
            {renderInputError(errors.pointsOnTime)}
          </View>
        </View>
      </View>

      <View style={styles.fullWidthSection}>
        {renderRelatedMaterialsSelector()}

        <Text style={styles.sectionLabel}>Attachment</Text>
        <TouchableOpacity style={styles.primaryButtonWide} onPress={handlePickAssignmentFile}>
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
          <TouchableOpacity style={styles.primaryButtonWide} onPress={handlePickFile}>
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
            <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 360) : 820, maxHeight: height * 0.9 }]}>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.screenScroll}
        contentContainerStyle={styles.screenScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isMobile ? <View style={{ height: insets.top + 10 }} /> : null}

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

        <Text style={[styles.courseName, { fontSize: isSmallPhone ? 20 : 24 }]}>{courseName}</Text>

        <View style={styles.headerInfoCard}>
          <View style={styles.headerInfoRow}>
            <Text style={styles.headerInfoLabel}>INSTRUCTOR</Text>
            <Text style={styles.headerInfoValue} numberOfLines={1}>
              {courseInstructor}
            </Text>
          </View>

          <View style={[styles.headerDetailsGrid, !isMobile && styles.headerDetailsGridDesktop]}>
            {!!courseYear && (
              <View style={[styles.academicInfoPill, !isMobile && styles.headerDetailItemDesktop]}>
                <Ionicons name="school-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Year</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseYear}</Text>
                </View>
              </View>
            )}

            {!!courseSection && (
              <View style={[styles.academicInfoPill, !isMobile && styles.headerDetailItemDesktop]}>
                <Ionicons name="people-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Section</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseSection}</Text>
                </View>
              </View>
            )}

            {!!courseSemester && (
              <View style={[styles.academicInfoPill, !isMobile && styles.headerDetailItemDesktop]}>
                <Ionicons name="calendar-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>Semester</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{courseSemester}</Text>
                </View>
              </View>
            )}

            {!!schoolYear && (
              <View style={[styles.academicInfoPill, !isMobile && styles.headerDetailItemDesktop]}>
                <Ionicons name="time-outline" size={14} color="#D32F2F" />
                <View style={styles.academicInfoTextWrap}>
                  <Text style={styles.academicInfoLabel}>School Year</Text>
                  <Text style={styles.academicInfoValue} numberOfLines={1}>{schoolYear}</Text>
                </View>
              </View>
            )}

            <View style={[styles.classCodeBox, !isMobile && styles.headerDetailItemDesktop]}>
              <Ionicons name="copy-outline" size={14} color="#D32F2F" />
              <View style={styles.classCodeTextWrap}>
                <Text style={styles.classCodeLabel}>CLASS CODE</Text>
                <Text style={styles.classCodeValue} numberOfLines={1}>{classCode}</Text>
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

        <View style={styles.tabContainer}>
            <TouchableOpacity onPress={() => setActiveTab('Materials')} style={[styles.tab, activeTab === 'Materials' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'Materials' && styles.tabTextActive]}>
            Materials ({materials.length})
          </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveTab('Assignments')} style={[styles.tab, activeTab === 'Assignments' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'Assignments' && styles.tabTextActive]}>
            Assignments ({assignments.length})
          </Text>
            </TouchableOpacity>
        </View>

        {activeTab === 'Materials' ? (
        <TeacherMaterialSection materials={materials} onCreate={openCreateModal} onOpenMaterial={openMaterialModal} />
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

      <Modal visible={showCreateModal} transparent animationType="fade">
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 370) : 900, maxHeight: height * 0.9 }]}>
            <View style={styles.createHeaderRow}>
              <View style={styles.modalHeaderTextWrap}>
                <Text style={styles.createTitle}>Create {activeTab === 'Materials' ? 'Material' : 'Assignment'}</Text>
                <Text style={styles.modalSubtitle}>
                  {activeTab === 'Materials'
                    ? 'Add a new class material with optional file attachment.'
                    : 'Create a new assignment with professional responsive layout, aligned date and time, related materials, and optional file upload.'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  resetCreateForm();
                }}
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

            <View style={[styles.floatingSaveWrap, isMobile && styles.floatingSaveWrapMobile]}>
              <TouchableOpacity
                style={[
                  styles.floatingSaveButton,
                  activeTab === 'Assignments' && Object.keys(errors).length > 0 ? styles.floatingSaveButtonWarn : null,
                ]}
                onPress={handleCreate}
              >
                <Ionicons name="save-outline" size={18} color="#FFF" />
                <Text style={styles.floatingSaveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDateTimeModal} transparent animationType="fade" onRequestClose={() => setShowDateTimeModal(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.dateTimeCard, { width: isMobile ? Math.min(width - 28, 360) : 760 }]}>
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
                        new Date(visibleCalendarMonth.getFullYear(), visibleCalendarMonth.getMonth() - 1, 1)
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
                        new Date(visibleCalendarMonth.getFullYear(), visibleCalendarMonth.getMonth() + 1, 1)
                      )
                    }
                  >
                    <Ionicons name="chevron-forward" size={18} color="#D32F2F" />
                  </TouchableOpacity>
                </View>

                <View style={styles.weekRow}>
                  {WEEKDAY_LABELS.map((label) => (
                    <Text key={label} style={styles.weekLabel}>{label}</Text>
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
                              draftDueDateTime.getMinutes() === minute && styles.timeOptionTextActive,
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
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowDateTimeModal(false)}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={applyDraftDateTime}>
                <Text style={styles.primaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMaterialModal} transparent animationType="fade" onRequestClose={() => setShowMaterialModal(false)}>
        <Pressable style={styles.modalOverlayCenter} onPress={() => setShowMaterialModal(false)}>
          <Pressable style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 360) : 430 }]}>
            <Text style={styles.createTitle}>{selectedMaterial?.title || 'Material'}</Text>
            <Text style={styles.modalSubtitle}>{selectedMaterial?.week || 'No week'} • {selectedMaterial?.posted || 'No date'}</Text>

            {!!selectedMaterial?.content && <Text style={styles.previewContent}>{selectedMaterial.content}</Text>}

            {!!selectedMaterial?.fileName && (
              <TouchableOpacity
                style={styles.openFileButton}
                onPress={() => handleOpenUploadedFile(selectedMaterial?.fileUri)}
              >
                <Ionicons name="document-attach-outline" size={18} color="#FFF" />
                <Text style={styles.openFileButtonText}>Open {selectedMaterial.fileName}</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={resultModalVisible} transparent animationType="fade" onRequestClose={() => setResultModalVisible(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={[styles.modalCardElevated, { width: isMobile ? Math.min(width - 28, 330) : 360 }]}>
            <Text style={[styles.createTitle, { color: resultModalType === 'success' ? '#2E7D32' : '#D32F2F' }]}>
              {resultModalTitle}
            </Text>
            <Text style={styles.previewContent}>{resultModalMessage}</Text>
            <TouchableOpacity style={styles.primaryButtonWide} onPress={() => setResultModalVisible(false)}>
              <Text style={styles.uploadBtnText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TeacherCourseDetail2;

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
  courseName: { color: '#FFF', fontWeight: '900', marginBottom: 14, letterSpacing: 0.2 },
  instructor: { color: 'rgba(255,255,255,0.92)', marginBottom: 6 },
  metaText: { color: 'rgba(255,255,255,0.88)', marginBottom: 4 },
  headerInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    padding: 14,
  },
  headerInfoRow: {
    marginBottom: 12,
  },
  headerInfoLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  headerInfoValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  headerDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  headerDetailsGridDesktop: {
    flexWrap: 'nowrap',
    alignItems: 'stretch',
  },
  headerDetailItemDesktop: {
    flexBasis: 0,
    flexGrow: 1,
    minWidth: 0,
  },
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
  academicInfoValue: {
    color: '#202124',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
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
  classCodeLabel: {
    color: '#8A8A8A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  classCodeValue: {
    color: '#202124',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 4 },
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

  tabContainer: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#D32F2F' },
  tabText: { color: '#888', fontWeight: '700' },
  tabTextActive: { color: '#D32F2F' },

  modalOverlayCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)', padding: 12 },
  modalCardElevated: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, maxHeight: '90%' },
  dateTimeCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 18, maxHeight: '92%' },
  modalScrollContent: { paddingBottom: 100 },

  createHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  modalHeaderTextWrap: { flex: 1, paddingRight: 12 },
  createTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  modalSubtitle: { fontSize: 13, color: '#666', lineHeight: 19, marginTop: 4 },

  formGrid: { gap: 16 },
  formGridDesktop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between' },
  formColumnLeft: {},
  formColumnLeftDesktop: { width: '58%' },
  formColumnRight: {},
  formColumnRightDesktop: { width: '40%' },
  fullWidthSection: { width: '100%' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#222', marginBottom: 8, marginTop: 10 },
  helperText: { fontSize: 12, color: '#777', marginBottom: 8, lineHeight: 18 },
  emptyMiniText: { fontSize: 12, color: '#999', marginBottom: 6 },
  errorText: { color: '#D32F2F', fontSize: 12, fontWeight: '600', marginTop: -2, marginBottom: 6 },
  errorBorder: { borderColor: '#D32F2F', borderWidth: 1.5 },
  errorContainer: { borderWidth: 1.5, borderColor: '#D32F2F', borderRadius: 14, padding: 8 },

  inputBox: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF', marginBottom: 8, fontSize: 14, color: '#111' },
  textAreaBox: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#FFF', marginBottom: 8, minHeight: 120, textAlignVertical: 'top', fontSize: 14, color: '#111' },

  scoreStackDesktop: { gap: 2 },
  scoreFieldFull: { width: '100%' },

  dateButton: { borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dateButtonText: { color: '#222', fontWeight: '600', flex: 1 },
  sectionBlock: { marginTop: 0 },

  materialSelectorWrap: { gap: 8, marginTop: 4 },
  materialChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#F0B9B9', backgroundColor: '#FFF5F5', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  materialChipActive: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  materialChipText: { color: '#D32F2F', fontWeight: '700', flex: 1 },
  materialChipTextActive: { color: '#FFF' },

  primaryButtonWide: { backgroundColor: '#D32F2F', minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, marginTop: 12, flexDirection: 'row', gap: 8, width: '100%' },
  uploadBtnText: { color: '#FFF', fontWeight: '800', fontSize: 13 },
  filePreviewBox: { marginTop: 10, borderWidth: 1, borderColor: '#F1D0D0', backgroundColor: '#FFF8F8', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  filePreviewText: { flex: 1, color: '#333', fontWeight: '600' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginTop: 16, marginBottom: 8, gap: 12 },
  checkboxLabel: { color: '#333', fontWeight: '600' },
  checkboxBox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: '#D32F2F', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  checkboxBoxChecked: { backgroundColor: '#D32F2F' },

  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primaryButton: { flex: 1, backgroundColor: '#D32F2F', minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#FFF', fontWeight: '800' },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: '#D32F2F', minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  secondaryButtonText: { color: '#D32F2F', fontWeight: '800' },

  floatingSaveWrap: {
    position: 'absolute',
    right: 18,
    left: 18,
    bottom: 18,
  },
  floatingSaveWrapMobile: {
    right: 18,
    left: 18,
    bottom: 18,
  },
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
  floatingSaveButtonWarn: {
    backgroundColor: '#C62828',
  },
  floatingSaveButtonText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
  modalBottomActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  previewContent: { fontSize: 14, color: '#444', lineHeight: 22, marginTop: 10 },
  openFileButton: { marginTop: 16, backgroundColor: '#D32F2F', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  openFileButtonText: { color: '#FFF', fontWeight: '800' },

  dateTimeLayout: { gap: 16 },
  dateTimeLayoutDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  calendarPanel: {},
  calendarPanelDesktop: { flex: 1.05 },
  timePanel: {},
  timePanelDesktop: { flex: 0.95 },

  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  calendarNavBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center' },
  calendarMonthLabel: { fontSize: 16, fontWeight: '800', color: '#111' },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#777' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  dayCell: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginBottom: 6 },
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
  timeList: { maxHeight: 260, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12, backgroundColor: '#FAFAFA' },
  timeOption: { paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  timeOptionActive: { backgroundColor: '#D32F2F' },
  timeOptionText: { color: '#222', fontWeight: '600' },
  timeOptionTextActive: { color: '#FFF', fontWeight: '800' },
  datePreviewBox: { marginTop: 14, borderWidth: 1, borderColor: '#F1D0D0', backgroundColor: '#FFF8F8', borderRadius: 12, padding: 12 },
  datePreviewLabel: { fontSize: 12, fontWeight: '700', color: '#777', marginBottom: 4 },
  datePreviewValue: { fontSize: 14, fontWeight: '800', color: '#D32F2F' },
});
