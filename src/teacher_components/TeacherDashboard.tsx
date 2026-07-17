import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// 🔥 IMPORT GLOBAL API SERVICE INSTEAD OF LOCAL FETCH LOGIC
import { apiFetch } from '../services/api';

import AnnouncementBanner from './TeacherAnnouncementBanner';
import { Announcement } from './TeacherAnnouncementModal';
import TeacherCourseCard from './TeacherCourseCard';

// ✅ Reuses the same Toast component used in the Admin ManageStudent screen.
import Toast from '../Final_Admin_Components/Toast';

export type TeacherCourseData = {
  id: string;
  name: string;
  courseCode: string;
  classCode: string;
  instructor: string;
  section?: string;
  bannerUri?: string;
  bannerStoragePath?: string | null;
  bannerFileName?: string | null;
  bannerMimeType?: string | null;
  year?: string;
  yearSection?: string;
  semester?: string;
  schoolYear?: string | null;
  description?: string | null;
  position?: number;
  units?: number;
};

export interface DashboardAssignment {
  id: string;
  title: string;
  dueDate?: string;
  status?: 'pending' | 'submitted' | 'graded';
  points?: number;
  maxPoints?: number;
  topic?: string;
  materialIds?: string[];
}

type SignedInTeacher = {
  teacherId?: string;
  authUid?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: any;
  bannerImage?: any;
};

interface DashboardProps {
  announcements?: Announcement[];
  courses?: TeacherCourseData[];
  onOpenCourse?: (course: TeacherCourseData) => void;
  onCreateClass?: (course: TeacherCourseData) => void;
  onDeleteCourse?: (id: string) => void;
  onEditCourse?: (course: TeacherCourseData) => void;
  currentTeacher: SignedInTeacher;
  isLoading?: boolean;
}

type YearOption = { id: string; label: string; };
type SectionOption = { id: string; label: string; };
type SemesterOption = { id: string; label: string; };
type ToastType = 'success' | 'error' | 'info';

function DashboardTextField({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  maxLength,
  editable,
}: {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'number-pad' | 'numeric';
  maxLength?: number;
  editable?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.yearInputWrap, isFocused && styles.yearInputWrapFocused]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA0A6"
        keyboardType={keyboardType}
        maxLength={maxLength}
        editable={editable}
        style={styles.yearInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

function DashboardTextArea({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.textAreaWrap, isFocused && styles.textAreaWrapFocused]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9AA0A6"
        multiline
        textAlignVertical="top"
        style={styles.textAreaInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

const YEAR_OPTIONS: YearOption[] = [
  { id: '1st', label: '1st Year' }, { id: '2nd', label: '2nd Year' },
  { id: '3rd', label: '3rd Year' }, { id: '4th', label: '4th Year' },
];

const SECTION_OPTIONS: Record<string, SectionOption[]> = {
  "1st": [
    { id: "1A", label: "1A Microsoft" },
    { id: "1B", label: "1B Google" },
    { id: "1C", label: "1C Amazon" },
  ],
  "2nd": [
    { id: "2A", label: "2A Algorithm" },
    { id: "2B", label: "2B Pseudocode" },
    { id: "2C", label: "2C Binary" },
  ],
  "3rd": [
    { id: "3A", label: "3A Python" },
    { id: "3B", label: "3B Java" },
    { id: "3C", label: "3C C++" },
  ],
  "4th": [
    { id: "4A", label: "4A Xamarin" },
    { id: "4B", label: "4B Laravel" },
    { id: "4C", label: "4C Flutter" },
  ],
};

const SEMESTER_OPTIONS: SemesterOption[] = [
  { id: 'sem-1', label: '1st Semester' }, { id: 'sem-2', label: '2nd Semester' },
];

const normalizeCoursePositions = (courseList: TeacherCourseData[]) => {
  return [...courseList]
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER))
    .map((course, index) => ({ ...course, position: index + 1 }));
};

const fileUriToBase64 = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') resolve(result);
        else reject(new Error('Failed to convert image to base64.'));
      };
      reader.onerror = () => reject(new Error('Failed to read selected image.'));
      reader.readAsDataURL(blob);
    });
  }
  return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
};

const mapBackendClass = (item: any, fallbackInstructor: string): TeacherCourseData => ({
  id: item.id, name: item.name || '', courseCode: item.courseCode || '', classCode: item.classCode || '',
  instructor: item.instructorName || fallbackInstructor, section: item.section || '',
  bannerUri: item.bannerUrl || item.bannerUri || item.bannerLocalUri || undefined,
  bannerStoragePath: item.bannerStoragePath || null, bannerFileName: item.bannerFileName || null,
  bannerMimeType: item.bannerMimeType || null, year: item.year || '', yearSection: item.yearSection || item.section || '',
  semester: item.semester || '', schoolYear: item.schoolYear || null, description: item.description || null,
  position: item.position, units: typeof item.units === 'number' ? item.units : undefined,
});

const Dashboard2 = ({
  announcements = [],
  courses = [],
  onOpenCourse,
  onCreateClass,
  onDeleteCourse,
  onEditCourse,
  currentTeacher,
  isLoading = false,
}: DashboardProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const { width } = useWindowDimensions();
  const [isDeleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<TeacherCourseData | null>(null);
  const [localCourses, setLocalCourses] = useState<TeacherCourseData[]>(normalizeCoursePositions(courses));
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // ✅ Toast state
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
  }>({ visible: false, message: '', type: 'error' });

  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isSemesterDropdownVisible, setSemesterDropdownVisible] = useState(false);
  const [isEditSemesterDropdownVisible, setEditSemesterDropdownVisible] = useState(false);
  const [menuCourse, setMenuCourse] = useState<TeacherCourseData | null>(null);
  const [editingCourse, setEditingCourse] = useState<TeacherCourseData | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [classBanner, setClassBanner] = useState('');
  const [classBannerFileName, setClassBannerFileName] = useState<string | null>(null);
  const [classBannerMimeType, setClassBannerMimeType] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [startYear, setStartYear] = useState('2025');
  const [courseCodeInput, setCourseCodeInput] = useState('');
  const [courseNameInput, setCourseNameInput] = useState('');
  const [courseUnitsInput, setCourseUnitsInput] = useState('');
  const [editSelectedYear, setEditSelectedYear] = useState<string | null>(null);
  const [editSelectedSection, setEditSelectedSection] = useState<string | null>(null);
  const [editSelectedSemester, setEditSelectedSemester] = useState<string | null>(null);
  const [editClassBanner, setEditClassBanner] = useState('');
  const [editClassBannerFileName, setEditClassBannerFileName] = useState<string | null>(null);
  const [editClassBannerMimeType, setEditClassBannerMimeType] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editStartYear, setEditStartYear] = useState('2025');
  const [editCourseCodeInput, setEditCourseCodeInput] = useState('');
  const [editCourseNameInput, setEditCourseNameInput] = useState('');
  const [editCourseUnitsInput, setEditCourseUnitsInput] = useState('');

  const isMobile = width < 768;
  const isLargeScreen = width >= 1200;

  const teacherFullName = useMemo(() => {
    const first = currentTeacher?.firstName?.trim() || '';
    const last = currentTeacher?.lastName?.trim() || '';
    const full = `${first} ${last}`.trim();
    return full || 'Teacher';
  }, [currentTeacher]);

  const teacherEmail = useMemo(() => currentTeacher?.email?.trim() || '', [currentTeacher]);
  const teacherUid = useMemo(() => currentTeacher?.authUid?.trim() || '', [currentTeacher]);
  const teacherId = useMemo(() => currentTeacher?.teacherId?.trim() || '', [currentTeacher]);

  const showToast = (message: string, type: ToastType = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => setToast((prev) => ({ ...prev, visible: false }));

  const loadTeacherClasses = async () => {
    try {
      const response = await apiFetch('/classes'); 
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch classes');
      const classList = Array.isArray(data) ? data : [];
      const teacherClasses = classList
        .filter((item) =>
          (teacherUid && item.assignedTeacherUid === teacherUid) ||
          (teacherEmail && item.instructorEmail === teacherEmail) ||
          (teacherId && item.assignedTeacherId === teacherId) ||
          (teacherUid && item.createdByUid === teacherUid)
        )
        .map((item) => mapBackendClass(item, teacherFullName));
      const normalizedClasses = normalizeCoursePositions(teacherClasses);
      setLocalCourses(normalizedClasses);
      return normalizedClasses;
    } catch (error) {
      console.error('Error loading teacher classes:', error);
      showToast('Failed to load classes.', 'error');
      return [];
    }
  };

  const refreshClassesAfterStorageWrite = async () => {
    await loadTeacherClasses();
    setTimeout(() => loadTeacherClasses(), 800);
  };

  useEffect(() => { loadTeacherClasses(); }, [teacherUid, teacherEmail, teacherId, teacherFullName]);
  useEffect(() => {
    if (courses.length > 0 && localCourses.length === 0) {
      setLocalCourses(normalizeCoursePositions(courses));
    }
  }, [courses, localCourses.length]);

  const processedCourses = useMemo(() => {
    return [...localCourses].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((course) => ({ ...course, themeColor: '#2E7D32' }));
  }, [localCourses]);

  const visibleCourses = useMemo(() => showAllClasses ? processedCourses : processedCourses.slice(0, 6), [processedCourses, showAllClasses]);
  const hiddenCourseCount = Math.max(processedCourses.length - 6, 0);
  const cardWidth = isMobile ? '100%' : isLargeScreen ? '31.5%' : '48%';

  const selectedSemesterLabel = useMemo(() => SEMESTER_OPTIONS.find((item) => item.id === selectedSemester)?.label || 'Select semester', [selectedSemester]);
  const endYear = useMemo(() => {
    const parsedStartYear = Number.parseInt(startYear.trim(), 10);
    return Number.isNaN(parsedStartYear) ? '' : String(parsedStartYear + 1);
  }, [startYear]);

  const editSelectedSemesterLabel = useMemo(() => SEMESTER_OPTIONS.find((item) => item.id === editSelectedSemester)?.label || 'Select semester', [editSelectedSemester]);
  const editEndYear = useMemo(() => {
    const parsedStartYear = Number.parseInt(editStartYear.trim(), 10);
    return Number.isNaN(parsedStartYear) ? '' : String(parsedStartYear + 1);
  }, [editStartYear]);

  const isInitialLoad = isLoading && courses.length === 0 && announcements.length === 0;

  if (isInitialLoad) {
    return (
      <View style={styles.fullPageLoader}>
        <ActivityIndicator size="large" color="#D32F2F" />
        <Text style={styles.fullPageLoaderText}>Loading your dashboard...</Text>
      </View>
    );
  }

  const resetCreateForm = () => {
    setIsCreatingClass(false); setSelectedYear(null); setSelectedSemester(null); setSelectedSection(null);
    setClassBanner(''); setClassBannerFileName(null); setClassBannerMimeType(null); setDescription('');
    setStartYear('2025'); setSemesterDropdownVisible(false); setCourseCodeInput(''); setCourseNameInput(''); setCourseUnitsInput('');
  };

  const resetEditForm = () => {
    setEditSelectedSemester(null); setEditSelectedSection(null); setEditClassBanner(''); setEditClassBannerFileName(null);
    setEditClassBannerMimeType(null); setEditDescription(''); setEditStartYear('2025'); setEditSemesterDropdownVisible(false);
    setEditingCourse(null); setEditCourseCodeInput(''); setEditCourseNameInput(''); setEditCourseUnitsInput('');
  };

  const handlePickBanner = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (result.didCancel) return;
    if (result.errorCode) { showToast(result.errorMessage || 'Unable to pick image.', 'error'); return; }
    const asset = result.assets?.[0];
    const uri = asset?.uri;
    if (asset?.fileSize && asset.fileSize > 5 * 1024 * 1024) { showToast('Class banner must be below 5MB.', 'error'); return; }
    if (asset?.type && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.type)) { showToast('Only JPG, PNG, and WEBP banner images are allowed.', 'error'); return; }
    if (uri) { setClassBanner(uri); setClassBannerFileName(asset.fileName || 'teacher-banner.jpg'); setClassBannerMimeType(asset.type || 'image/jpeg'); }
  };

  const handlePickEditBanner = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (result.didCancel) return;
    if (result.errorCode) { showToast(result.errorMessage || 'Unable to pick image.', 'error'); return; }
    const asset = result.assets?.[0];
    const uri = asset?.uri;
    if (asset?.fileSize && asset.fileSize > 5 * 1024 * 1024) { showToast('Class banner must be below 5MB.', 'error'); return; }
    if (asset?.type && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.type)) { showToast('Only JPG, PNG, and WEBP banner images are allowed.', 'error'); return; }
    if (uri) { setEditClassBanner(uri); setEditClassBannerFileName(asset.fileName || 'teacher-banner.jpg'); setEditClassBannerMimeType(asset.type || 'image/jpeg'); }
  };

  const toggleYear = (yearId: string) => {
    if (selectedYear === yearId) { setSelectedYear(null); setSelectedSemester(null); setSelectedSection(null); return; }
    setSelectedYear(yearId); setSelectedSemester(null); setSelectedSection(null);
  };

  const toggleSection = (sectionId: string) => {
    if (selectedSection === sectionId) { setSelectedSection(null); return; }
    setSelectedSection(sectionId);
  };

  const toggleEditYear = (yearId: string) => {
    if (editSelectedYear === yearId) { setEditSelectedYear(null); setEditSelectedSemester(null); setEditSelectedSection(null); return; }
    setEditSelectedYear(yearId); setEditSelectedSemester(null); setEditSelectedSection(null);
  };

  const toggleEditSection = (sectionId: string) => {
    if (editSelectedSection === sectionId) { setEditSelectedSection(null); return; }
    setEditSelectedSection(sectionId);
  };

  const handleCreateClass = async () => {
    if (isCreatingClass) return;
    const activeYear = selectedYear; const activeSemester = selectedSemester;
    if (!activeYear) { showToast('Please select a year.', 'error'); return; }
    if (!activeSemester) { showToast('Please select a semester.', 'error'); return; }
    if (!selectedSection) { showToast('Please select a section.', 'error'); return; }
    if (!courseCodeInput.trim()) { showToast('Please enter a course code.', 'error'); return; }
    if (!courseNameInput.trim()) { showToast('Please enter a course name.', 'error'); return; }
    if (!startYear.trim() || !endYear) { showToast('Please enter a valid start year.', 'error'); return; }
    if (!classBanner) { showToast('Please upload a class banner.', 'error'); return; }

    const yearLabel = YEAR_OPTIONS.find((year) => year.id === activeYear)?.label || '';
    const sectionLabel = SECTION_OPTIONS[activeYear]?.find((section: SectionOption) => section.id === selectedSection)?.label || '';
    const courseCode = courseCodeInput.trim(); const courseLabel = courseNameInput.trim(); const units = parseFloat(courseUnitsInput) || 0;
    setIsCreatingClass(true);

    try {
      let bannerBase64: string | null = null;
      if (classBanner) bannerBase64 = await fileUriToBase64(classBanner);

      const response = await apiFetch('/create-class', {
        method: 'POST',
        body: JSON.stringify({
          name: courseLabel, courseCode, section: sectionLabel, semester: selectedSemesterLabel,
          schoolYear: `${startYear.trim()}-${endYear}`, description: description.trim() ? description.trim() : null,
          bannerBase64, bannerFileName: classBanner ? classBannerFileName || 'teacher-banner.jpg' : null,
          bannerMimeType: classBanner ? classBannerMimeType || 'image/jpeg' : null, instructorName: teacherFullName,
          instructorEmail: teacherEmail || null, instructorIdentifier: teacherId || null, createdByUid: teacherUid,
          createdByRole: 'teacher', createdByName: teacherFullName, year: yearLabel, units,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create class');

      const createdCourse: TeacherCourseData = {
        id: data?.data?.id || Date.now().toString(), name: courseLabel, courseCode, classCode: data?.data?.classCode || '',
        section: sectionLabel, instructor: teacherFullName, bannerUri: data?.data?.bannerUrl || undefined,
        bannerStoragePath: data?.data?.bannerStoragePath || null, bannerFileName: data?.data?.bannerFileName || null,
        bannerMimeType: data?.data?.bannerMimeType || null, year: yearLabel, yearSection: sectionLabel,
        semester: selectedSemesterLabel, schoolYear: `${startYear.trim()}-${endYear}`,
        description: description.trim() ? description.trim() : null, units,
      };

      setLocalCourses((prev) => normalizeCoursePositions([createdCourse, ...prev.filter((item) => item.id !== createdCourse.id)]));
      onCreateClass?.(createdCourse);
      await refreshClassesAfterStorageWrite();
      resetCreateForm(); setCreateModalVisible(false);
      showToast(`Class created successfully. Class Code: ${data?.data?.classCode || ''}`, 'success');
    } catch (error) {
      console.error('Error creating class:', error);
      showToast('Failed to create class.', 'error');
    } finally { setIsCreatingClass(false); }
  };

  const openEditModal = () => {
    if (!menuCourse) return;
    const matchedYear = YEAR_OPTIONS.find((year) => year.label === menuCourse.year)?.id || Object.entries(SECTION_OPTIONS).find(([, sections]) => sections.some((section: SectionOption) => section.label === (menuCourse.yearSection || menuCourse.section)))?.[0] || null;
    const matchedSection = matchedYear ? SECTION_OPTIONS[matchedYear]?.find((section: SectionOption) => section.label === (menuCourse.yearSection || menuCourse.section))?.id || null : null;
    const matchedSemester = SEMESTER_OPTIONS.find((semester) => semester.label === menuCourse.semester)?.id || null;
    const schoolYearParts = (menuCourse.schoolYear || '2025-2026').split('-');

    setEditingCourse(menuCourse); setEditSelectedYear(matchedYear); setEditSelectedSection(matchedSection); setEditSelectedSemester(matchedSemester);
    setEditCourseCodeInput(menuCourse.courseCode || ''); setEditCourseNameInput(menuCourse.name || ''); setEditCourseUnitsInput(menuCourse.units?.toString() || '');
    setEditClassBanner(menuCourse.bannerUri || ''); setEditClassBannerFileName(menuCourse.bannerFileName || null); setEditClassBannerMimeType(menuCourse.bannerMimeType || null);
    setEditDescription(menuCourse.description || ''); setEditStartYear(schoolYearParts[0] || '2025');
    closeMenu(); setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCourse || isSavingEdit) return;
    const activeEditYear = editSelectedYear; const activeEditSemester = editSelectedSemester;
    if (!activeEditYear) { showToast('Please select a year.', 'error'); return; }
    if (!activeEditSemester) { showToast('Please select a semester.', 'error'); return; }
    if (!editSelectedSection) { showToast('Please select a section.', 'error'); return; }
    if (!editCourseCodeInput.trim()) { showToast('Please enter a course code.', 'error'); return; }
    if (!editCourseNameInput.trim()) { showToast('Please enter a course name.', 'error'); return; }
    if (!editStartYear.trim() || !editEndYear) { showToast('Please enter a valid start year.', 'error'); return; }
    if (!editClassBanner) { showToast('Please upload a class banner.', 'error'); return; }

    const yearLabel = YEAR_OPTIONS.find((year) => year.id === activeEditYear)?.label || '';
    const sectionLabel = SECTION_OPTIONS[activeEditYear]?.find((section: SectionOption) => section.id === editSelectedSection)?.label || '';
    const courseCode = editCourseCodeInput.trim(); const courseLabel = editCourseNameInput.trim(); const units = parseFloat(editCourseUnitsInput) || 0;

    setIsSavingEdit(true);

    try {
      let bannerBase64: string | null | undefined = undefined;
      if (editClassBanner) {
        const isRemote = editClassBanner.startsWith('http://') || editClassBanner.startsWith('https://');
        if (!isRemote) bannerBase64 = await fileUriToBase64(editClassBanner);
      } else bannerBase64 = null;

      const response = await apiFetch(`/update-class/${editingCourse.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: courseLabel, courseCode, section: sectionLabel, semester: editSelectedSemesterLabel,
          schoolYear: `${editStartYear.trim()}-${editEndYear}`, description: editDescription.trim() ? editDescription.trim() : null,
          bannerBase64, bannerFileName: editClassBanner ? editClassBannerFileName || 'teacher-banner.jpg' : null,
          bannerMimeType: editClassBanner ? editClassBannerMimeType || 'image/jpeg' : null, instructorName: teacherFullName,
          instructorEmail: teacherEmail || null, instructorIdentifier: teacherId || null, updatedByUid: teacherUid,
          updatedByRole: 'teacher', year: yearLabel, units,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update class');

      const updatedCourse: TeacherCourseData = {
        ...editingCourse, name: courseLabel, courseCode, year: yearLabel, yearSection: sectionLabel, section: sectionLabel,
        semester: editSelectedSemesterLabel, schoolYear: `${editStartYear.trim()}-${editEndYear}`,
        description: editDescription.trim() ? editDescription.trim() : null,
        bannerUri: data?.data?.bannerUrl || editClassBanner || undefined,
        bannerStoragePath: data?.data?.bannerStoragePath || editingCourse.bannerStoragePath || null,
        bannerFileName: data?.data?.bannerFileName || editClassBannerFileName || editingCourse.bannerFileName || null,
        bannerMimeType: data?.data?.bannerMimeType || editClassBannerMimeType || editingCourse.bannerMimeType || null,
        instructor: teacherFullName, units,
      };

      setLocalCourses((prev) => normalizeCoursePositions(prev.map((item) => (item.id === updatedCourse.id ? updatedCourse : item))));
      onEditCourse?.(updatedCourse);
      await refreshClassesAfterStorageWrite();
      resetEditForm(); setEditModalVisible(false);
      showToast('Class updated successfully.', 'success');
    } catch (error) {
      console.error('Error updating class:', error);
      showToast('Failed to update class.', 'error');
    } finally { 
      setIsSavingEdit(false);
    }
  };

  const closeMenu = () => { setMenuVisible(false); setMenuCourse(null); };
  const handleDeleteCourse = () => { if (!menuCourse) return; setCourseToDelete(menuCourse); setDeleteConfirmVisible(true); closeMenu(); };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete || isDeletingClass) return;
    setIsDeletingClass(true);
    
    try {
      const response = await apiFetch(`/delete-class/${courseToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete class');
      await refreshClassesAfterStorageWrite();
      onDeleteCourse?.(courseToDelete.id);
      setDeleteConfirmVisible(false); setCourseToDelete(null);
      showToast('Class deleted successfully.', 'success');
    } catch (error) {
      console.error('Error deleting class:', error);
      showToast('Failed to delete class.', 'error');
    } finally {
      setIsDeletingClass(false);
    }
  };

  const cancelDeleteCourse = () => { 
    if (isDeletingClass) return;
    setDeleteConfirmVisible(false); 
    setCourseToDelete(null); 
  };

  const renderCheckboxRow = (label: string, isChecked: boolean, onPress: () => void, activeStyle: any) => (
    <TouchableOpacity style={[styles.checkRow, isChecked && activeStyle]} activeOpacity={0.85} onPress={onPress}>
      <View style={[styles.checkboxBase, isChecked && styles.checkboxChecked]}>
        {isChecked && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
      </View>
      <Text style={styles.checkText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.safeArea}>
      {/* Create Modal */}
      <Modal visible={isCreateModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (isCreatingClass) return; resetCreateForm(); setCreateModalVisible(false); }} />
          <View style={styles.createModalContainerWide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Class</Text>
              <TouchableOpacity disabled={isCreatingClass} onPress={() => { if (isCreatingClass) return; resetCreateForm(); setCreateModalVisible(false); }}>
                <MaterialCommunityIcons name="close" size={24} color="#202124" />
              </TouchableOpacity>
            </View>
            {isCreatingClass && (
              <View style={styles.creatingOverlay}>
                <ActivityIndicator size="large" color="#D32F2F" />
                <Text style={styles.creatingTitle}>Creating class...</Text>
                <Text style={styles.creatingSubtitle}>Please wait while the class is being saved</Text>
              </View>
            )}
            <ScrollView style={styles.transparentScroll} contentContainerStyle={styles.modalInnerContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeaderRow}>
                  <MaterialCommunityIcons name="google-classroom" size={18} color="#D32F2F" />
                  <Text style={styles.modalSectionTitle}>Select Year</Text>
                </View>
                {YEAR_OPTIONS.map((year) => (<View key={year.id}>{renderCheckboxRow(year.label, selectedYear === year.id, () => toggleYear(year.id), styles.checkRowActive)}</View>))}
              </View>
              {selectedYear && (
                <View style={styles.semesterFieldWrap}>
                  <Text style={styles.inputLabel}>Semester Selection</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setSemesterDropdownVisible((prev) => !prev)}>
                    <Text style={styles.dropdownTriggerText}>{selectedSemesterLabel}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  {isSemesterDropdownVisible && (
                    <>
                      <Pressable style={styles.floatingDropdownDismiss} onPress={() => setSemesterDropdownVisible(false)} />
                      <View style={styles.floatingDropdownMenu}>
                        {SEMESTER_OPTIONS.map((semester, index) => {
                          const isActive = selectedSemester === semester.id;
                          const isLast = index === SEMESTER_OPTIONS.length - 1;
                          return (
                            <TouchableOpacity key={semester.id} style={[styles.floatingDropdownItem, isActive && styles.floatingDropdownItemActive, !isLast && styles.floatingDropdownItemBorder]} onPress={() => { setSelectedSemester(semester.id); setSelectedSection(null); setSemesterDropdownVisible(false); }}>
                              <Text style={[styles.floatingDropdownItemText, isActive && styles.floatingDropdownItemTextActive]}>{semester.label}</Text>
                              {isActive && <Ionicons name="checkmark-circle" size={18} color="#D32F2F" />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              )}
              {selectedYear && selectedSemester && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="layers-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Select Section</Text>
                  </View>
                  {(selectedYear ? SECTION_OPTIONS[selectedYear] || [] : []).map((section: SectionOption) => (
                    <TouchableOpacity key={section.id} style={[styles.sectionRow, selectedSection === section.id && styles.sectionRowActive]} activeOpacity={0.85} onPress={() => toggleSection(section.id)}>
                      <View style={[styles.checkboxBase, selectedSection === section.id && styles.checkboxChecked]}>
                        {selectedSection === section.id && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.checkText}>{section.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {selectedYear && selectedSemester && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="book-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Course Details</Text>
                  </View>
                  <Text style={styles.inputLabel}>Course Code</Text>
                  <DashboardTextField
                    value={courseCodeInput}
                    onChangeText={setCourseCodeInput}
                    placeholder="e.g., CC 111"
                  />
                  <Text style={styles.inputLabel}>Course Name</Text>
                  <DashboardTextArea
                    value={courseNameInput}
                    onChangeText={setCourseNameInput}
                    placeholder="e.g., INTRODUCTION TO COMPUTING"
                  />
                  
                </View>
              )}
              <View style={styles.yearRow}>
                <View style={styles.yearCol}>
                  <Text style={styles.inputLabel}>Start Year</Text>
                  <DashboardTextField
                    value={startYear}
                    onChangeText={setStartYear}
                    placeholder="2025"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <View style={styles.yearCol}>
                  <Text style={styles.inputLabel}>End Year</Text>
                  <View style={styles.yearInputWrap}><Text style={styles.autoYearText}>{endYear || 'Auto'}</Text></View>
                </View>
              </View>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <DashboardTextArea
                value={description}
                onChangeText={setDescription}
                placeholder="Enter class description"
              />
              <Text style={styles.inputLabel}>Class Banner / Background Photo</Text>
              <TouchableOpacity style={[styles.uploadBtn, isCreatingClass && styles.disabledBtn]} onPress={handlePickBanner} disabled={isCreatingClass}>
                <MaterialCommunityIcons name="image-plus" size={20} color="#D32F2F" />
                <Text style={styles.uploadBtnText}>{classBanner ? 'Change Banner Photo' : 'Upload Banner Photo'}</Text>
              </TouchableOpacity>
              
              {classBanner ? (
                <View style={styles.bannerPreview}>
                  <Image
                    source={{ uri: classBanner }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.previewOverlay}>
                    <Text style={styles.previewText}>Banner Preview</Text>
                  </View>
                </View>
              ) : null}

           
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.cancelBtn, isCreatingClass && styles.disabledBtn]} disabled={isCreatingClass} onPress={() => { if (isCreatingClass) return; resetCreateForm(); setCreateModalVisible(false); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, isCreatingClass && styles.disabledBtn]} onPress={handleCreateClass} disabled={isCreatingClass}>
                  {isCreatingClass ? (<View style={styles.loadingButtonContent}><ActivityIndicator size="small" color="#FFFFFF" /><Text style={styles.saveBtnText}>Creating...</Text></View>) : (<Text style={styles.saveBtnText}>Create</Text>)}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={isEditModalVisible} transparent animationType="fade" onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { if (isSavingEdit) return; resetEditForm(); setEditModalVisible(false); }} />
          <View style={styles.createModalContainerWide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Class</Text>
              <TouchableOpacity disabled={isSavingEdit} onPress={() => { if (isSavingEdit) return; resetEditForm(); setEditModalVisible(false); }}>
                <MaterialCommunityIcons name="close" size={24} color="#202124" />
              </TouchableOpacity>
            </View>
            {isSavingEdit && (
              <View style={styles.creatingOverlay}>
                <ActivityIndicator size="large" color="#D32F2F" />
                <Text style={styles.creatingTitle}>Saving changes...</Text>
                <Text style={styles.creatingSubtitle}>Please wait while the class is being updated</Text>
              </View>
            )}
            <ScrollView style={styles.transparentScroll} contentContainerStyle={styles.modalInnerContent} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeaderRow}>
                  <MaterialCommunityIcons name="google-classroom" size={18} color="#D32F2F" />
                  <Text style={styles.modalSectionTitle}>Select Year</Text>
                </View>
                {YEAR_OPTIONS.map((year) => (<View key={year.id}>{renderCheckboxRow(year.label, editSelectedYear === year.id, () => toggleEditYear(year.id), styles.checkRowActive)}</View>))}
              </View>
              {editSelectedYear && (
                <View style={styles.semesterFieldWrap}>
                  <Text style={styles.inputLabel}>Semester Selection</Text>
                  <TouchableOpacity style={styles.dropdownTrigger} onPress={() => setEditSemesterDropdownVisible((prev) => !prev)}>
                    <Text style={styles.dropdownTriggerText}>{editSelectedSemesterLabel}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                  {isEditSemesterDropdownVisible && (
                    <>
                      <Pressable style={styles.floatingDropdownDismiss} onPress={() => setEditSemesterDropdownVisible(false)} />
                      <View style={styles.floatingDropdownMenu}>
                        {SEMESTER_OPTIONS.map((semester, index) => {
                          const isActive = editSelectedSemester === semester.id;
                          const isLast = index === SEMESTER_OPTIONS.length - 1;
                          return (
                            <TouchableOpacity key={semester.id} style={[styles.floatingDropdownItem, isActive && styles.floatingDropdownItemActive, !isLast && styles.floatingDropdownItemBorder]} onPress={() => { setEditSelectedSemester(semester.id); setEditSelectedSection(null); setEditSemesterDropdownVisible(false); }}>
                              <Text style={[styles.floatingDropdownItemText, isActive && styles.floatingDropdownItemTextActive]}>{semester.label}</Text>
                              {isActive && <Ionicons name="checkmark-circle" size={18} color="#D32F2F" />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              )}
              {editSelectedYear && editSelectedSemester && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="layers-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Select Section</Text>
                  </View>
                  {(editSelectedYear ? SECTION_OPTIONS[editSelectedYear] || [] : []).map((section: SectionOption) => (
                    <TouchableOpacity key={section.id} style={[styles.sectionRow, editSelectedSection === section.id && styles.sectionRowActive]} activeOpacity={0.85} onPress={() => toggleEditSection(section.id)}>
                      <View style={[styles.checkboxBase, editSelectedSection === section.id && styles.checkboxChecked]}>
                        {editSelectedSection === section.id && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                      </View>
                      <Text style={styles.checkText}>{section.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {editSelectedYear && editSelectedSemester && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="book-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Course Details</Text>
                  </View>
                  <Text style={styles.inputLabel}>Course Code</Text>
                  <DashboardTextField
                    value={editCourseCodeInput}
                    onChangeText={setEditCourseCodeInput}
                    placeholder="e.g., CC 111"
                  />
                  <Text style={styles.inputLabel}>Course Name</Text>
                  <DashboardTextArea
                    value={editCourseNameInput}
                    onChangeText={setEditCourseNameInput}
                    placeholder="e.g., INTRODUCTION TO COMPUTING"
                  />
                  <Text style={styles.inputLabel}>Units</Text>
                  <DashboardTextField
                    value={editCourseUnitsInput}
                    onChangeText={setEditCourseUnitsInput}
                    placeholder="e.g., 3.0"
                    keyboardType="numeric"
                  />
                </View>
              )}
              <View style={styles.yearRow}>
                <View style={styles.yearCol}>
                  <Text style={styles.inputLabel}>Start Year</Text>
                  <DashboardTextField
                    value={editStartYear}
                    onChangeText={setEditStartYear}
                    placeholder="2025"
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <View style={styles.yearCol}>
                  <Text style={styles.inputLabel}>End Year</Text>
                  <View style={styles.yearInputWrap}><Text style={styles.autoYearText}>{editEndYear || 'Auto'}</Text></View>
                </View>
              </View>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <DashboardTextArea
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Enter class description"
              />
              <Text style={styles.inputLabel}>Class Banner / Background Photo</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickEditBanner}>
                <MaterialCommunityIcons name="image-edit-outline" size={20} color="#D32F2F" />
                <Text style={styles.uploadBtnText}>{editClassBanner ? 'Change Banner Photo' : 'Upload Banner Photo'}</Text>
              </TouchableOpacity>

              {editClassBanner ? (
                <View style={styles.bannerPreview}>
                  <Image
                    source={{ uri: editClassBanner }}
                    style={StyleSheet.absoluteFillObject}
                    contentFit="cover"
                    transition={200}
                  />
                  <View style={styles.previewOverlay}>
                    <Text style={styles.previewText}>Banner Preview</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.modalButtonRow}>
                <TouchableOpacity 
                  style={[styles.cancelBtn, isSavingEdit && styles.disabledBtn]} 
                  disabled={isSavingEdit} 
                  onPress={() => { if (isSavingEdit) return; resetEditForm(); setEditModalVisible(false); }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveBtn, isSavingEdit && styles.disabledBtn]} 
                  disabled={isSavingEdit} 
                  onPress={handleSaveEdit}
                >
                  {isSavingEdit ? (
                    <View style={styles.loadingButtonContent}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={isDeleteConfirmVisible} transparent animationType="fade" onRequestClose={cancelDeleteCourse}>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteConfirmBox}>
            <Text style={styles.deleteConfirmTitle}>Delete Class</Text>
            <Text style={styles.deleteConfirmText}>Are you sure you want to delete "{courseToDelete?.name}"?</Text>
            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity 
                style={[styles.cancelBtn, isDeletingClass && styles.disabledBtn]} 
                disabled={isDeletingClass} 
                onPress={cancelDeleteCourse}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteConfirmBtn, isDeletingClass && styles.disabledBtn]} 
                disabled={isDeletingClass} 
                onPress={confirmDeleteCourse}
              >
                {isDeletingClass ? (
                  <View style={styles.loadingButtonContent}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.deleteConfirmBtnText}>Deleting...</Text>
                  </View>
                ) : (
                  <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
            {isDeletingClass && (
              <View style={styles.deletingOverlay}>
                <ActivityIndicator size="large" color="#D32F2F" />
                <Text style={styles.creatingTitle}>Deleting class...</Text>
                <Text style={styles.creatingSubtitle}>Please wait while the class is being deleted</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Context Menu Modal */}
      <Modal visible={isMenuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />
          <View style={[styles.menuBox, { position: 'absolute', top: menuPosition.y - 100, left: menuPosition.x - 200 }]}>
            <TouchableOpacity style={styles.menuItem} onPress={openEditModal}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color="#1565C0" />
              <Text style={[styles.menuText, { color: '#1565C0' }]}>Edit Class</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteCourse}>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#D32F2F" />
              <Text style={[styles.menuText, { color: '#D32F2F' }]}>Delete Class</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Main Dashboard Content */}
      <ScrollView style={styles.container} contentContainerStyle={[styles.scrollPadding, { paddingHorizontal: isMobile ? 14 : 20 }]} showsVerticalScrollIndicator={false} showsHorizontalScrollIndicator={false}>
        <View style={styles.mainWrapper}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionHeader}>Announcements</Text>
          </View>

          {isLoading ? (
            <AnnouncementBanner announcements={[]} isLoading={true} />
          ) : (
            <AnnouncementBanner announcements={announcements} />
          )}

          <View style={styles.classesHeaderRow}>
            <Text style={styles.classesTitle}>My Classes</Text>
            <View style={styles.classesHeaderActions}>
              {hiddenCourseCount > 0 ? (
                <TouchableOpacity 
                  style={[styles.seeAllButton, isMobile && styles.iconOnlyButton]} 
                  onPress={() => setShowAllClasses((prev) => !prev)} 
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons 
                    name={showAllClasses ? "unfold-less-horizontal" : "unfold-more-horizontal"} 
                    size={isMobile ? 20 : 18} 
                    color="#D32F2F" 
                  />
                  {!isMobile && (
                    <Text style={styles.seeAllButtonText}>
                      {showAllClasses ? 'Show Less' : `See All (${processedCourses.length})`}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity 
                style={[styles.createBtn, isMobile && styles.iconOnlyButton]} 
                onPress={() => setCreateModalVisible(true)}
              >
                <MaterialCommunityIcons 
                  name="plus" 
                  size={isMobile ? 22 : 18} 
                  color="#FFF" 
                />
                {!isMobile && <Text style={styles.createBtnText}>Create Class</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.courseGrid}>
            {visibleCourses.map((item) => (
              <TeacherCourseCard
                key={item.id}
                item={item}
                cardWidth={cardWidth}
                copiedId={copiedId}
                onOpenCourse={onOpenCourse}
                onCopyCode={async (course) => {
                  await Clipboard.setStringAsync(course.classCode);
                  setCopiedId(course.id);
                  setTimeout(() => setCopiedId(null), 3000);
                }}
                onMenuPress={(event, course) => {
                  const { pageX, pageY } = event.nativeEvent;
                  setMenuPosition({ x: pageX, y: pageY });
                  setMenuCourse(course);
                  setMenuVisible(true);
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Toast — now portal-based so it renders above other Modals (Create/Edit/Delete) */}
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
    </View>
  );
};

export default Dashboard2;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  scrollPadding: { paddingTop: 16, paddingBottom: 40, backgroundColor: 'transparent' },
  mainWrapper: { maxWidth: 1200, alignSelf: 'center', width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeader: { fontSize: 24, fontWeight: '700', color: '#111' },
  classesHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 16, gap: 12 },
  classesHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' },
  seeAllButton: { 
    backgroundColor: '#FFF1F1', 
    borderWidth: 1, 
    borderColor: '#F3C6C6', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seeAllButtonText: { color: '#D32F2F', fontWeight: '800', fontSize: 14 },
  classesTitle: { fontSize: 26, fontWeight: '700', color: '#111' },
  createBtn: { 
    backgroundColor: '#D32F2F', 
    paddingHorizontal: 16, 
    paddingVertical: 11, 
    borderRadius: 14, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 6, 
    shadowOffset: { width: 0, height: 2 },
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  
  iconOnlyButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minWidth: 44,
    justifyContent: 'center',
  },
  
  courseGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 21, width: '100%' },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  menuBox: { width: 220, backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  menuText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.28)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  createModalContainerWide: { width: '100%', maxWidth: 700, maxHeight: '90%', backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' },
  modalHeader: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F1F1', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#202124' },
  transparentScroll: { flexGrow: 0 },
  modalInnerContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22 },
  modalSection: { marginBottom: 18 },
  modalSectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  modalSectionTitle: { fontSize: 15, fontWeight: '700', color: '#202124' },
  checkRow: { minHeight: 46, borderWidth: 1, borderColor: '#E7E7E7', borderRadius: 14, paddingHorizontal: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
  checkRowActive: { backgroundColor: '#FFF4F4', borderColor: '#F4B4B4' },
  sectionRow: { minHeight: 46, borderWidth: 1, borderColor: '#E7E7E7', borderRadius: 14, paddingHorizontal: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
  sectionRowActive: { backgroundColor: '#FFF4F4', borderColor: '#F4B4B4' },
  checkboxBase: { width: 18, height: 18, borderRadius: 6, borderWidth: 1.5, borderColor: '#C9CDD2', alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: '#fff' },
  checkboxChecked: { backgroundColor: '#D32F2F', borderColor: '#D32F2F' },
  checkText: { flex: 1, color: '#202124', fontSize: 14, fontWeight: '500' },
  semesterFieldWrap: { marginBottom: 16, zIndex: 20 },
  inputLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  dropdownTrigger: { minHeight: 48, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, backgroundColor: '#F9FAFB', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownTriggerText: { fontSize: 14, color: '#111827', fontWeight: '500' },
  floatingDropdownDismiss: { ...StyleSheet.absoluteFillObject, zIndex: 25 },
  floatingDropdownMenu: { position: 'absolute', top: 60, left: 0, right: 0, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 14, zIndex: 30, overflow: 'hidden' },
  floatingDropdownItem: { minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  floatingDropdownItemActive: { backgroundColor: '#FFF4F4' },
  floatingDropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F3F4' },
  floatingDropdownItemText: { fontSize: 14, color: '#202124', fontWeight: '500' },
  floatingDropdownItemTextActive: { color: '#D32F2F', fontWeight: '700' },
  yearRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  yearCol: { flex: 1 },
  yearInputWrap: { minHeight: 48, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, backgroundColor: '#F9FAFB', paddingHorizontal: 14, justifyContent: 'center' },
  yearInputWrapFocused: { borderColor: '#D32F2F', borderWidth: 1.5 },
  yearInput: {
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  autoYearText: { fontSize: 14, color: '#111827', fontWeight: '600', paddingVertical: 10 },
  textAreaWrap: { minHeight: 108, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, backgroundColor: '#F9FAFB', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  textAreaWrapFocused: { borderColor: '#D32F2F', borderWidth: 1.5 },
  textAreaInput: {
    minHeight: 84,
    fontSize: 14,
    color: '#111827',
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  uploadBtn: { minHeight: 48, borderWidth: 1, borderColor: '#F4B4B4', borderRadius: 14, backgroundColor: '#FFF7F7', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 },
  uploadBtnText: { color: '#D32F2F', fontWeight: '700', fontSize: 14 },
  bannerPreview: { height: 150, borderRadius: 16, overflow: 'hidden', marginBottom: 14, position: 'relative' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center' },
  previewText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  codeNoticeBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#F4FBF5', borderWidth: 1, borderColor: '#D8F1DC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  codeNoticeText: { flex: 1, color: '#2E7D32', fontSize: 13, fontWeight: '600' },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 6 },
  cancelBtn: { minWidth: 110, minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#fff' },
  cancelBtnText: { color: '#444', fontWeight: '700', fontSize: 14 },
  saveBtn: { minWidth: 130, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#D32F2F' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  disabledBtn: { opacity: 0.65 },
  loadingButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  creatingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.88)', zIndex: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  creatingTitle: { marginTop: 14, fontSize: 16, fontWeight: '800', color: '#202124' },
  creatingSubtitle: { marginTop: 6, fontSize: 13, fontWeight: '600', color: '#5F6368', textAlign: 'center' },
  deleteConfirmBox: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 22, paddingVertical: 22, overflow: 'hidden' },
  deleteConfirmTitle: { fontSize: 20, fontWeight: '800', color: '#202124', marginBottom: 10 },
  deleteConfirmText: { fontSize: 14, color: '#5F6368', lineHeight: 22 },
  deleteConfirmActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 18 },
  deleteConfirmBtn: { minWidth: 110, minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: '#D32F2F' },
  deleteConfirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  deletingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.88)', zIndex: 100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  fullPageLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 400,
  },
  fullPageLoaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  // ✅ Added toastPortal style
  toastPortal: {
    ...StyleSheet.absoluteFillObject,
    // let touches pass through to whatever's behind, except the toast itself
  },
});