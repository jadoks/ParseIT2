import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ImageBackground,
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

import AnnouncementBanner from './TeacherAnnouncementBanner';
import AnnouncementModal, { Announcement } from './TeacherAnnouncementModal';

const DEFAULT_COURSE_IMAGE = require('../../assets/parseclass/AP1.jpg');

export type TeacherCourseData = {
  id: string;
  name: string;
  courseCode: string;
  classCode: string;
  instructor: string;
  section?: string;
  bannerUri?: string;
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

interface DashboardProps {
  announcements?: Announcement[];
  courses?: TeacherCourseData[];
  onOpenCourse?: (course: TeacherCourseData) => void;
  onCreateClass?: (course: TeacherCourseData) => void;
  onDeleteCourse?: (id: string) => void;
  onEditCourse?: (course: TeacherCourseData) => void;
}

type YearOption = {
  id: string;
  label: string;
};

type SectionOption = {
  id: string;
  label: string;
};

type SemesterOption = {
  id: string;
  label: string;
};

type CourseOption = {
  id: string;
  label: string;
  units: number;
};

const DEFAULT_INSTRUCTOR = 'Ramcee Jade L. Munoz';
const TEACHER_UID = 'teacher_uid_001';
const TEACHER_EMAIL = 'teacher@email.com';
const TEACHER_ID = 'T-001';

function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
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

const YEAR_OPTIONS: YearOption[] = [
  { id: '1st', label: '1st Year' },
  { id: '2nd', label: '2nd Year' },
  { id: '3rd', label: '3rd Year' },
  { id: '4th', label: '4th Year' },
];

const SECTION_OPTIONS: Record<string, SectionOption[]> = {
  '1st': [
    { id: '1A', label: '1A Microsoft' },
    { id: '1B', label: '1B Google' },
  ],
  '2nd': [
    { id: '2A', label: '2A Algorithm' },
    { id: '2B', label: '2B Pseudocode' },
  ],
  '3rd': [
    { id: '3A', label: '3A Python' },
    { id: '3B', label: '3B Java' },
  ],
  '4th': [
    { id: '4A', label: '4A Xamarin' },
    { id: '4B', label: '4B Laravel' },
  ],
};

const COURSE_OPTIONS: Record<string, CourseOption[]> = {
  '1st': [
    { id: 'IT101', label: 'IT101 - Introduction to Computing', units: 3 },
    { id: 'IT102', label: 'IT102 - Computer Programming 1', units: 3 },
  ],
  '2nd': [
    { id: 'IT201', label: 'IT201 - Data Structures and Algorithms', units: 3 },
    { id: 'IT202', label: 'IT202 - Object-Oriented Programming', units: 3 },
  ],
  '3rd': [
    { id: 'IT301', label: 'IT301 - Mobile Application Development', units: 3 },
    { id: 'IT302', label: 'IT302 - Web Systems and Technologies', units: 3 },
  ],
  '4th': [
    { id: 'IT401', label: 'IT401 - Capstone Project 1', units: 3 },
    { id: 'IT402', label: 'IT402 - Systems Integration and Architecture', units: 3 },
  ],
};

const SEMESTER_OPTIONS: SemesterOption[] = [
  { id: 'sem-1', label: '1st Semester' },
  { id: 'sem-2', label: '2nd Semester' },
  { id: 'sem-3', label: 'Summer' },
];

const normalizeCoursePositions = (courseList: TeacherCourseData[]) => {
  return [...courseList]
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER))
    .map((course, index) => ({
      ...course,
      position: index + 1,
    }));
};

const fileUriToBase64 = async (uri: string): Promise<string> => {
  const response = await fetch(uri);
  const blob = await response.blob();

  return await new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to convert image to base64.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read selected image.'));
    reader.readAsDataURL(blob);
  });
};

const mapBackendClass = (item: any): TeacherCourseData => ({
  id: item.id,
  name: item.name || '',
  courseCode: item.courseCode || '',
  classCode: item.classCode || '',
  instructor: item.instructorName || DEFAULT_INSTRUCTOR,
  section: item.section || '',
  bannerUri: item.bannerUrl || undefined,
  year: item.year || '',
  yearSection: item.section || '',
  semester: item.semester || '',
  schoolYear: item.schoolYear || null,
  description: item.description || null,
  position: item.position,
  units: typeof item.units === 'number' ? item.units : undefined,
});

const Dashboard2 = ({
  announcements = [],
  courses = [],
  onOpenCourse,
  onCreateClass,
  onDeleteCourse,
  onEditCourse,
}: DashboardProps) => {

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { width } = useWindowDimensions();

  const [isDeleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<TeacherCourseData | null>(null);

  const [localCourses, setLocalCourses] = useState<TeacherCourseData[]>(
    normalizeCoursePositions(courses)
  );

  const [isAnnouncementModalVisible, setAnnouncementModalVisible] = useState(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [isEditModalVisible, setEditModalVisible] = useState(false);
  const [isMenuVisible, setMenuVisible] = useState(false);

  const [isSemesterDropdownVisible, setSemesterDropdownVisible] = useState(false);
  const [isEditSemesterDropdownVisible, setEditSemesterDropdownVisible] = useState(false);

  const [menuCourse, setMenuCourse] = useState<TeacherCourseData | null>(null);
  const [editingCourse, setEditingCourse] = useState<TeacherCourseData | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string>('sem-1');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [classBanner, setClassBanner] = useState('');
  const [description, setDescription] = useState('');
  const [startYear, setStartYear] = useState('2025');
  const [endYear, setEndYear] = useState('2026');

  const [editSelectedYear, setEditSelectedYear] = useState<string | null>(null);
  const [editSelectedSection, setEditSelectedSection] = useState<string | null>(null);
  const [editSelectedSemester, setEditSelectedSemester] = useState<string>('sem-1');
  const [editSelectedCourse, setEditSelectedCourse] = useState<string | null>(null);
  const [editClassBanner, setEditClassBanner] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartYear, setEditStartYear] = useState('2025');
  const [editEndYear, setEditEndYear] = useState('2026');

  const isMobile = width < 768;
  const isLargeScreen = width >= 1200;

  const loadTeacherClasses = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/classes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch classes');
      }

      const classList = Array.isArray(data) ? data : [];

      const teacherClasses = classList
        .filter(
          (item) =>
            item.assignedTeacherUid === TEACHER_UID ||
            item.instructorEmail === TEACHER_EMAIL ||
            item.assignedTeacherId === TEACHER_ID ||
            item.createdByUid === TEACHER_UID
        )
        .map(mapBackendClass);

      setLocalCourses(normalizeCoursePositions(teacherClasses));
    } catch (error) {
      console.error('Error loading teacher classes:', error);
      Alert.alert('Error', 'Failed to load classes.');
    }
  };

  useEffect(() => {
    loadTeacherClasses();
  }, []);

  useEffect(() => {
    if (courses.length > 0) {
      setLocalCourses(normalizeCoursePositions(courses));
    }
  }, [courses]);

  const processedCourses = useMemo(() => {
    return [...localCourses]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((course) => ({
        ...course,
        themeColor: '#2E7D32',
      }));
  }, [localCourses]);

  const cardWidth = isMobile ? '100%' : isLargeScreen ? '31.5%' : '48%';

  const selectedSemesterLabel = useMemo(() => {
    return (
      SEMESTER_OPTIONS.find((item) => item.id === selectedSemester)?.label ||
      'Select semester'
    );
  }, [selectedSemester]);

  const editSelectedSemesterLabel = useMemo(() => {
    return (
      SEMESTER_OPTIONS.find((item) => item.id === editSelectedSemester)?.label ||
      'Select semester'
    );
  }, [editSelectedSemester]);

  const resetCreateForm = () => {
    setSelectedYear(null);
    setSelectedSection(null);
    setSelectedCourse(null);
    setSelectedSemester('sem-1');
    setClassBanner('');
    setDescription('');
    setStartYear('2025');
    setEndYear('2026');
    setSemesterDropdownVisible(false);
  };

  const resetEditForm = () => {
    setEditSelectedYear(null);
    setEditSelectedSection(null);
    setEditSelectedCourse(null);
    setEditSelectedSemester('sem-1');
    setEditClassBanner('');
    setEditDescription('');
    setEditStartYear('2025');
    setEditEndYear('2026');
    setEditSemesterDropdownVisible(false);
    setEditingCourse(null);
  };

  const handlePickBanner = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });

    if (result.didCancel) return;

    if (result.errorCode) {
      Alert.alert('Upload failed', result.errorMessage || 'Unable to pick image.');
      return;
    }

    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setClassBanner(uri);
    }
  };

  const handlePickEditBanner = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });

    if (result.didCancel) return;

    if (result.errorCode) {
      Alert.alert('Upload failed', result.errorMessage || 'Unable to pick image.');
      return;
    }

    const uri = result.assets?.[0]?.uri;
    if (uri) {
      setEditClassBanner(uri);
    }
  };

  const toggleYear = (yearId: string) => {
    if (selectedYear === yearId) {
      setSelectedYear(null);
      setSelectedSection(null);
      setSelectedCourse(null);
      return;
    }

    setSelectedYear(yearId);
    setSelectedSection(null);
    setSelectedCourse(null);
  };

  const toggleSection = (sectionId: string) => {
    if (selectedSection === sectionId) {
      setSelectedSection(null);
      return;
    }

    setSelectedSection(sectionId);
  };

  const toggleCourse = (courseId: string) => {
    if (selectedCourse === courseId) {
      setSelectedCourse(null);
      return;
    }

    setSelectedCourse(courseId);
  };

  const toggleEditYear = (yearId: string) => {
    if (editSelectedYear === yearId) {
      setEditSelectedYear(null);
      setEditSelectedSection(null);
      setEditSelectedCourse(null);
      return;
    }

    setEditSelectedYear(yearId);
    setEditSelectedSection(null);
    setEditSelectedCourse(null);
  };

  const toggleEditSection = (sectionId: string) => {
    if (editSelectedSection === sectionId) {
      setEditSelectedSection(null);
      return;
    }

    setEditSelectedSection(sectionId);
  };

  const toggleEditCourse = (courseId: string) => {
    if (editSelectedCourse === courseId) {
      setEditSelectedCourse(null);
      return;
    }

    setEditSelectedCourse(courseId);
  };

  const handleCreateClass = async () => {
    if (!selectedYear) {
      Alert.alert('Missing Field', 'Please select a year.');
      return;
    }

    if (!selectedSection) {
      Alert.alert('Missing Field', 'Please select a section.');
      return;
    }

    if (!selectedCourse) {
      Alert.alert('Missing Field', 'Please select a course code with course name.');
      return;
    }

    if (!startYear.trim() || !endYear.trim()) {
      Alert.alert('Missing Field', 'Please enter start year and end year.');
      return;
    }

    const yearLabel =
      YEAR_OPTIONS.find((year) => year.id === selectedYear)?.label || '';

    const sectionLabel =
      SECTION_OPTIONS[selectedYear]?.find((section) => section.id === selectedSection)?.label || '';

    const selectedCourseItem =
      COURSE_OPTIONS[selectedYear]?.find((course) => course.id === selectedCourse);

    const courseLabel = selectedCourseItem?.label || '';
    const courseCode = selectedCourseItem?.id || '';
    const units = selectedCourseItem?.units || 0;

    try {
      let bannerBase64: string | null = null;

      if (classBanner) {
        bannerBase64 = await fileUriToBase64(classBanner);
      }

      const response = await fetch(`${API_BASE_URL}/create-class`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: courseLabel,
          courseCode,
          section: sectionLabel,
          semester: selectedSemesterLabel,
          schoolYear: `${startYear.trim()}-${endYear.trim()}`,
          description: description.trim() ? description.trim() : null,
          bannerBase64,
          bannerFileName: classBanner ? 'teacher-banner.jpg' : null,
          bannerMimeType: classBanner ? 'image/jpeg' : null,
          instructorName: DEFAULT_INSTRUCTOR,
          instructorEmail: TEACHER_EMAIL,
          instructorIdentifier: TEACHER_ID,
          createdByUid: TEACHER_UID,
          createdByRole: 'teacher',
          createdByName: DEFAULT_INSTRUCTOR,
          year: yearLabel,
          units,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create class');
      }

      await loadTeacherClasses();

      const createdCourse: TeacherCourseData = {
        id: data?.data?.id || Date.now().toString(),
        name: courseLabel,
        courseCode,
        classCode: data?.data?.classCode || '',
        section: sectionLabel,
        instructor: DEFAULT_INSTRUCTOR,
        bannerUri: data?.data?.bannerUrl || classBanner || undefined,
        year: yearLabel,
        yearSection: sectionLabel,
        semester: selectedSemesterLabel,
        schoolYear: `${startYear.trim()}-${endYear.trim()}`,
        description: description.trim() ? description.trim() : null,
        units,
      };

      onCreateClass?.(createdCourse);

      resetCreateForm();
      setCreateModalVisible(false);

      Alert.alert(
        'Success',
        `Class created successfully.\nClass Code: ${data?.data?.classCode || ''}`
      );
    } catch (error) {
      console.error('Error creating class:', error);
      Alert.alert('Error', 'Failed to create class.');
    }
  };

  const openEditModal = () => {
    if (!menuCourse) return;

    const matchedYear =
      YEAR_OPTIONS.find((year) => year.label === menuCourse.year)?.id ||
      Object.entries(SECTION_OPTIONS).find(([, sections]) =>
        sections.some((section) => section.label === (menuCourse.yearSection || menuCourse.section))
      )?.[0] ||
      null;

    const matchedSection =
      matchedYear
        ? SECTION_OPTIONS[matchedYear]?.find(
            (section) => section.label === (menuCourse.yearSection || menuCourse.section)
          )?.id || null
        : null;

    const matchedCourse =
      matchedYear
        ? COURSE_OPTIONS[matchedYear]?.find(
            (course) =>
              course.id === menuCourse.courseCode || course.label === menuCourse.name
          )?.id || null
        : null;

    const matchedSemester =
      SEMESTER_OPTIONS.find((semester) => semester.label === menuCourse.semester)?.id || 'sem-1';

    const schoolYearParts = (menuCourse.schoolYear || '2025-2026').split('-');

    setEditingCourse(menuCourse);
    setEditSelectedYear(matchedYear);
    setEditSelectedSection(matchedSection);
    setEditSelectedCourse(matchedCourse);
    setEditSelectedSemester(matchedSemester);
    setEditClassBanner(menuCourse.bannerUri || '');
    setEditDescription(menuCourse.description || '');
    setEditStartYear(schoolYearParts[0] || '2025');
    setEditEndYear(schoolYearParts[1] || '2026');

    closeMenu();
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingCourse) return;

    if (!editSelectedYear) {
      Alert.alert('Missing Field', 'Please select a year.');
      return;
    }

    if (!editSelectedSection) {
      Alert.alert('Missing Field', 'Please select a section.');
      return;
    }

    if (!editSelectedCourse) {
      Alert.alert('Missing Field', 'Please select a course code with course name.');
      return;
    }

    if (!editStartYear.trim() || !editEndYear.trim()) {
      Alert.alert('Missing Field', 'Please enter start year and end year.');
      return;
    }

    const yearLabel =
      YEAR_OPTIONS.find((year) => year.id === editSelectedYear)?.label || '';

    const sectionLabel =
      SECTION_OPTIONS[editSelectedYear]?.find(
        (section) => section.id === editSelectedSection
      )?.label || '';

    const selectedCourseItem =
      COURSE_OPTIONS[editSelectedYear]?.find(
        (course) => course.id === editSelectedCourse
      );

    const courseLabel = selectedCourseItem?.label || '';
    const courseCode = selectedCourseItem?.id || '';
    const units = selectedCourseItem?.units || 0;

    try {
      let bannerBase64: string | null | undefined = undefined;

      if (editClassBanner) {
        const isRemote =
          editClassBanner.startsWith('http://') ||
          editClassBanner.startsWith('https://');

        if (!isRemote) {
          bannerBase64 = await fileUriToBase64(editClassBanner);
        }
      } else {
        bannerBase64 = null;
      }

      const response = await fetch(
        `${API_BASE_URL}/update-class/${editingCourse.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: courseLabel,
            courseCode,
            section: sectionLabel,
            semester: editSelectedSemesterLabel,
            schoolYear: `${editStartYear.trim()}-${editEndYear.trim()}`,
            description: editDescription.trim() ? editDescription.trim() : null,
            bannerBase64,
            bannerFileName: editClassBanner ? 'teacher-banner.jpg' : null,
            bannerMimeType: editClassBanner ? 'image/jpeg' : null,
            instructorName: DEFAULT_INSTRUCTOR,
            instructorEmail: TEACHER_EMAIL,
            instructorIdentifier: TEACHER_ID,
            updatedByUid: TEACHER_UID,
            updatedByRole: 'teacher',
            year: yearLabel,
            units,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update class');
      }

      const updatedCourse: TeacherCourseData = {
        ...editingCourse,
        name: courseLabel,
        courseCode,
        year: yearLabel,
        yearSection: sectionLabel,
        section: sectionLabel,
        semester: editSelectedSemesterLabel,
        schoolYear: `${editStartYear.trim()}-${editEndYear.trim()}`,
        description: editDescription.trim() ? editDescription.trim() : null,
        bannerUri: editClassBanner || undefined,
        units,
      };

      await loadTeacherClasses();
      onEditCourse?.(updatedCourse);

      resetEditForm();
      setEditModalVisible(false);
      Alert.alert('Success', 'Class updated successfully.');
    } catch (error) {
      console.error('Error updating class:', error);
      Alert.alert('Error', 'Failed to update class.');
    }
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setMenuCourse(null);
  };

  const handleCopyLink = () => {
    if (!menuCourse) return;

    const link = `https://yourapp.com/join/${menuCourse.classCode}`;
    Clipboard.setStringAsync(link);
    Alert.alert('Copied', 'Class link copied to clipboard.');
    closeMenu();
  };

  const handleDeleteCourse = () => {
    if (!menuCourse) return;

    setCourseToDelete(menuCourse);
    setDeleteConfirmVisible(true);
    closeMenu();
  };

  const confirmDeleteCourse = async () => {
    if (!courseToDelete) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/delete-class/${courseToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete class');
      }

      await loadTeacherClasses();
      onDeleteCourse?.(courseToDelete.id);

      setDeleteConfirmVisible(false);
      setCourseToDelete(null);
    } catch (error) {
      console.error('Error deleting class:', error);
      Alert.alert('Error', 'Failed to delete class.');
    }
  };

  const cancelDeleteCourse = () => {
    setDeleteConfirmVisible(false);
    setCourseToDelete(null);
  };

  const renderCheckboxRow = (
    label: string,
    isChecked: boolean,
    onPress: () => void,
    activeStyle: any
  ) => (
    <TouchableOpacity
      style={[styles.checkRow, isChecked && activeStyle]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={[styles.checkboxBase, isChecked && styles.checkboxChecked]}>
        {isChecked && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
      </View>
      <Text style={styles.checkText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.safeArea}>
      <AnnouncementModal
        visible={isAnnouncementModalVisible}
        onClose={() => setAnnouncementModalVisible(false)}
        announcements={announcements}
      />

      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              resetCreateForm();
              setCreateModalVisible(false);
            }}
          />

          <View style={styles.createModalContainerWide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Class</Text>
              <TouchableOpacity
                onPress={() => {
                  resetCreateForm();
                  setCreateModalVisible(false);
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#202124" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.transparentScroll}
              contentContainerStyle={styles.modalInnerContent}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeaderRow}>
                  <MaterialCommunityIcons name="google-classroom" size={18} color="#D32F2F" />
                  <Text style={styles.modalSectionTitle}>Select Year</Text>
                </View>

                {YEAR_OPTIONS.map((year) => (
                  <View key={year.id}>
                    {renderCheckboxRow(
                      year.label,
                      selectedYear === year.id,
                      () => toggleYear(year.id),
                      styles.checkRowActive
                    )}
                  </View>
                ))}
              </View>

              {selectedYear && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="layers-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Select Section</Text>
                  </View>

                  {SECTION_OPTIONS[selectedYear].map((section) => (
                    <TouchableOpacity
                      key={section.id}
                      style={[
                        styles.sectionRow,
                        selectedSection === section.id && styles.sectionRowActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => toggleSection(section.id)}
                    >
                      <View
                        style={[
                          styles.checkboxBase,
                          selectedSection === section.id && styles.checkboxChecked,
                        ]}
                      >
                        {selectedSection === section.id && (
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.checkText}>{section.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedYear && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="book-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Select Course Code with Course Name</Text>
                  </View>

                  {COURSE_OPTIONS[selectedYear].map((course) => (
                    <View key={course.id}>
                      {renderCheckboxRow(
                        `${course.label} (${course.units} units)`,
                        selectedCourse === course.id,
                        () => toggleCourse(course.id),
                        styles.sectionRowActive
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.semesterFieldWrap}>
                <Text style={styles.inputLabel}>Semester Selection</Text>

                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setSemesterDropdownVisible((prev) => !prev)}
                >
                  <Text style={styles.dropdownTriggerText}>{selectedSemesterLabel}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                {isSemesterDropdownVisible && (
                  <>
                    <Pressable
                      style={styles.floatingDropdownDismiss}
                      onPress={() => setSemesterDropdownVisible(false)}
                    />
                    <View style={styles.floatingDropdownMenu}>
                      {SEMESTER_OPTIONS.map((semester, index) => {
                        const isActive = selectedSemester === semester.id;
                        const isLast = index === SEMESTER_OPTIONS.length - 1;

                        return (
                          <TouchableOpacity
                            key={semester.id}
                            style={[
                              styles.floatingDropdownItem,
                              isActive && styles.floatingDropdownItemActive,
                              !isLast && styles.floatingDropdownItemBorder,
                            ]}
                            onPress={() => {
                              setSelectedSemester(semester.id);
                              setSemesterDropdownVisible(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.floatingDropdownItemText,
                                isActive && styles.floatingDropdownItemTextActive,
                              ]}
                            >
                              {semester.label}
                            </Text>

                            {isActive && (
                              <Ionicons name="checkmark-circle" size={18} color="#D32F2F" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>

              <View style={styles.yearRow}>
                <View style={styles.yearCol}>
                  <Text style={styles.inputLabel}>Start Year</Text>
                  <View style={styles.yearInputWrap}>
                    <TextInput
                      value={startYear}
                      onChangeText={setStartYear}
                      placeholder="2025"
                      placeholderTextColor="#9AA0A6"
                      keyboardType="number-pad"
                      maxLength={4}
                      style={styles.yearInput}
                    />
                  </View>
                </View>

                <View style={styles.yearCol}>
                  <Text style={styles.inputLabel}>End Year</Text>
                  <View style={styles.yearInputWrap}>
                    <TextInput
                      value={endYear}
                      onChangeText={setEndYear}
                      placeholder="2026"
                      placeholderTextColor="#9AA0A6"
                      keyboardType="number-pad"
                      maxLength={4}
                      style={styles.yearInput}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <View style={styles.textAreaWrap}>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter class description"
                  placeholderTextColor="#9AA0A6"
                  multiline
                  textAlignVertical="top"
                  style={styles.textAreaInput}
                />
              </View>

              <Text style={styles.inputLabel}>Class Banner / Background Photo</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickBanner}>
                <MaterialCommunityIcons name="image-plus" size={20} color="#D32F2F" />
                <Text style={styles.uploadBtnText}>
                  {classBanner ? 'Change Banner Photo' : 'Upload Banner Photo'}
                </Text>
              </TouchableOpacity>

              {classBanner ? (
                <ImageBackground
                  source={{ uri: classBanner }}
                  style={styles.bannerPreview}
                  imageStyle={styles.previewImage}
                >
                  <View style={styles.previewOverlay}>
                    <Text style={styles.previewText}>Banner Preview</Text>
                  </View>
                </ImageBackground>
              ) : null}

              <View style={styles.codeNoticeBox}>
                <MaterialCommunityIcons name="book-education-outline" size={18} color="#2E7D32" />
                <Text style={styles.codeNoticeText}>
                  The selected course units will also be saved to the class record.
                </Text>
              </View>

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    resetCreateForm();
                    setCreateModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleCreateClass}>
                  <Text style={styles.saveBtnText}>Create</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              resetEditForm();
              setEditModalVisible(false);
            }}
          />

          <View style={styles.createModalContainerWide}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Class</Text>
              <TouchableOpacity
                onPress={() => {
                  resetEditForm();
                  setEditModalVisible(false);
                }}
              >
                <MaterialCommunityIcons name="close" size={24} color="#202124" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.transparentScroll}
              contentContainerStyle={styles.modalInnerContent}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
            >
              <View style={styles.modalSection}>
                <View style={styles.modalSectionHeaderRow}>
                  <MaterialCommunityIcons name="google-classroom" size={18} color="#D32F2F" />
                  <Text style={styles.modalSectionTitle}>Select Year</Text>
                </View>

                {YEAR_OPTIONS.map((year) => (
                  <View key={year.id}>
                    {renderCheckboxRow(
                      year.label,
                      editSelectedYear === year.id,
                      () => toggleEditYear(year.id),
                      styles.checkRowActive
                    )}
                  </View>
                ))}
              </View>

              {editSelectedYear && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="layers-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Select Section</Text>
                  </View>

                  {SECTION_OPTIONS[editSelectedYear].map((section) => (
                    <TouchableOpacity
                      key={section.id}
                      style={[
                        styles.sectionRow,
                        editSelectedSection === section.id && styles.sectionRowActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => toggleEditSection(section.id)}
                    >
                      <View
                        style={[
                          styles.checkboxBase,
                          editSelectedSection === section.id && styles.checkboxChecked,
                        ]}
                      >
                        {editSelectedSection === section.id && (
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        )}
                      </View>
                      <Text style={styles.checkText}>{section.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {editSelectedYear && (
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeaderRow}>
                    <Ionicons name="book-outline" size={18} color="#D32F2F" />
                    <Text style={styles.modalSectionTitle}>Select Course Code with Course Name</Text>
                  </View>

                  {COURSE_OPTIONS[editSelectedYear].map((course) => (
                    <View key={course.id}>
                      {renderCheckboxRow(
                        `${course.label} (${course.units} units)`,
                        editSelectedCourse === course.id,
                        () => toggleEditCourse(course.id),
                        styles.sectionRowActive
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.semesterFieldWrap}>
                <Text style={styles.inputLabel}>Semester Selection</Text>

                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setEditSemesterDropdownVisible((prev) => !prev)}
                >
                  <Text style={styles.dropdownTriggerText}>{editSelectedSemesterLabel}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                {isEditSemesterDropdownVisible && (
                  <>
                    <Pressable
                      style={styles.floatingDropdownDismiss}
                      onPress={() => setEditSemesterDropdownVisible(false)}
                    />
                    <View style={styles.floatingDropdownMenu}>
                      {SEMESTER_OPTIONS.map((semester, index) => {
                        const isActive = editSelectedSemester === semester.id;
                        const isLast = index === SEMESTER_OPTIONS.length - 1;

                        return (
                          <TouchableOpacity
                            key={semester.id}
                            style={[
                              styles.floatingDropdownItem,
                              isActive && styles.floatingDropdownItemActive,
                              !isLast && styles.floatingDropdownItemBorder,
                            ]}
                            onPress={() => {
                              setEditSelectedSemester(semester.id);
                              setEditSemesterDropdownVisible(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.floatingDropdownItemText,
                                isActive && styles.floatingDropdownItemTextActive,
                              ]}
                            >
                              {semester.label}
                            </Text>

                            {isActive && (
                              <Ionicons name="checkmark-circle" size={18} color="#D32F2F" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                )}
              </View>

              <View style={styles.yearRow}>
                <View style={styles.yearCol}>
                  <Text style={styles.inputLabel}>Start Year</Text>
                  <View style={styles.yearInputWrap}>
                    <TextInput
                      value={editStartYear}
                      onChangeText={setEditStartYear}
                      placeholder="2025"
                      placeholderTextColor="#9AA0A6"
                      keyboardType="number-pad"
                      maxLength={4}
                      style={styles.yearInput}
                    />
                  </View>
                </View>

                <View style={styles.yearCol}>
                  <Text style={styles.inputLabel}>End Year</Text>
                  <View style={styles.yearInputWrap}>
                    <TextInput
                      value={editEndYear}
                      onChangeText={setEditEndYear}
                      placeholder="2026"
                      placeholderTextColor="#9AA0A6"
                      keyboardType="number-pad"
                      maxLength={4}
                      style={styles.yearInput}
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <View style={styles.textAreaWrap}>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Enter class description"
                  placeholderTextColor="#9AA0A6"
                  multiline
                  textAlignVertical="top"
                  style={styles.textAreaInput}
                />
              </View>

              <Text style={styles.inputLabel}>Class Banner / Background Photo</Text>
              <TouchableOpacity style={styles.uploadBtn} onPress={handlePickEditBanner}>
                <MaterialCommunityIcons name="image-edit-outline" size={20} color="#D32F2F" />
                <Text style={styles.uploadBtnText}>
                  {editClassBanner ? 'Change Banner Photo' : 'Upload Banner Photo'}
                </Text>
              </TouchableOpacity>

              {editClassBanner ? (
                <ImageBackground
                  source={{ uri: editClassBanner }}
                  style={styles.bannerPreview}
                  imageStyle={styles.previewImage}
                >
                  <View style={styles.previewOverlay}>
                    <Text style={styles.previewText}>Banner Preview</Text>
                  </View>
                </ImageBackground>
              ) : null}

              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    resetEditForm();
                    setEditModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isDeleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDeleteCourse}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteConfirmBox}>
            <Text style={styles.deleteConfirmTitle}>Delete Class</Text>
            <Text style={styles.deleteConfirmText}>
              Are you sure you want to delete "{courseToDelete?.name}"?
            </Text>

            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={cancelDeleteCourse}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={confirmDeleteCourse}
              >
                <Text style={styles.deleteConfirmBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <View style={styles.menuOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu} />

          <View
            style={[
              styles.menuBox,
              {
                position: 'absolute',
                top: menuPosition.y - 100,
                left: menuPosition.x - 200,
              },
            ]}
          >

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

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollPadding,
          { paddingHorizontal: isMobile ? 14 : 20 },
        ]}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <View style={styles.mainWrapper}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionHeader}>Announcements</Text>
          </View>

          <AnnouncementBanner announcements={announcements} />

          <View style={styles.classesHeaderRow}>
            <Text style={styles.classesTitle}>My Classes</Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setCreateModalVisible(true)}
            >
              <Text style={styles.createBtnText}>+ Create Class</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.courseGrid}>
            {processedCourses.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { width: cardWidth }]}
                onPress={() => onOpenCourse?.(item)}
                activeOpacity={0.9}
              >
                <View style={styles.bannerWrapper}>
                  <ImageBackground
                    source={item.bannerUri ? { uri: item.bannerUri } : DEFAULT_COURSE_IMAGE}
                    style={styles.banner}
                    imageStyle={styles.cardBannerImage}
                  >
                    <View style={styles.bannerOverlay}>
                    <Text style={styles.bannerName} numberOfLines={2}>
                      {item.name}
                    </Text>

                  </View>
                  </ImageBackground>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.instructorLabel}>INSTRUCTOR</Text>
                  <Text style={styles.instructorName}>{item.instructor}</Text>

                  <View style={styles.classCodeRow}>
                    <Text style={styles.bannerCode}>Class Code: {item.classCode}</Text>

                    <TouchableOpacity
                      onPress={async () => {
                        await Clipboard.setStringAsync(item.classCode);

                        setCopiedId(item.id); // mark this card as copied

                        setTimeout(() => {
                          setCopiedId(null); // revert after 3 seconds
                        }, 3000);
                      }}
                      style={styles.copyButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={copiedId === item.id ? "checkmark-outline" : "copy-outline"}
                        size={16}
                        color={copiedId === item.id ? "#000000" : "#000000"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    onPress={(event) => {
                      event.stopPropagation?.();
                      const { pageX, pageY } = event.nativeEvent;

                      setMenuPosition({
                        x: pageX,
                        y: pageY,
                      });

                      setMenuCourse(item);
                      setMenuVisible(true);
                    }}
                    style={styles.dotButton}
                  >
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={22}
                      color="#5f6368"
                    />
                  </TouchableOpacity>

                  <View
                    style={[
                      styles.bottomBorder,
                      { backgroundColor: item.themeColor || '#2E7D32' },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Dashboard2;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  scrollPadding: {
    paddingTop: 16,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },

  mainWrapper: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionHeader: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },

  classesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },

  classesTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111',
  },

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
  },

  createBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  courseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 21,
    width: '100%',
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderTopWidth: 5,
    borderTopColor: '#2E7D32',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },

  bannerWrapper: {
    height: 140,
    width: '100%',
  },

  banner: {
    flex: 1,
  },

  cardBannerImage: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },

  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.28)',
    padding: 16,
    justifyContent: 'flex-end',
  },

  bannerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  bannerCode: {
    color: 'rgba(19, 17, 17, 0.92)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  classCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  copyButton: {
    marginLeft: 6,
    padding: 4,
  },
  bannerMeta: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  cardContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },

  instructorLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    fontWeight: '700',
  },

  instructorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
    marginTop: 4,
  },

  cardFooter: {
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },

  dotButton: {
    padding: 6,
    borderRadius: 10,
    zIndex: 2,
  },

  bottomBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  createModalContainerWide: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
  },

  transparentScroll: {
    backgroundColor: 'transparent',
  },

  modalInnerContent: {
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#202124',
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },

  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },

  dropdownTriggerText: {
    fontSize: 14,
    color: '#202124',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },

  semesterFieldWrap: {
    position: 'relative',
    zIndex: 2000,
  },

  floatingDropdownDismiss: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  floatingDropdownMenu: {
    position: 'absolute',
    top: 86,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4E4E4',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 2,
  },

  floatingDropdownItem: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },

  floatingDropdownItemActive: {
    backgroundColor: '#FFF7F7',
  },

  floatingDropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F1F1',
  },

  floatingDropdownItemText: {
    flex: 1,
    fontSize: 13,
    color: '#202124',
    fontWeight: '500',
    paddingRight: 10,
  },

  floatingDropdownItemTextActive: {
    color: '#D32F2F',
    fontWeight: '700',
  },

  yearRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },

  yearCol: {
    flex: 1,
  },

  yearInputWrap: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },

  yearInput: {
    fontSize: 14,
    color: '#202124',
    fontWeight: '500',
  },

  textAreaWrap: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  textAreaInput: {
    minHeight: 96,
    fontSize: 14,
    color: '#202124',
    fontWeight: '400',
  },

  uploadBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF5F5',
  },

  uploadBtnText: {
    color: '#D32F2F',
    fontWeight: '700',
    fontSize: 14,
  },

  bannerPreview: {
    marginTop: 12,
    height: 120,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },

  previewImage: {
    borderRadius: 12,
  },

  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
    padding: 12,
  },

  previewText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  codeNoticeBox: {
    marginTop: 14,
    backgroundColor: '#F1F8F2',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  codeNoticeText: {
    marginLeft: 8,
    flex: 1,
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
  },

  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 22,
    gap: 10,
  },

  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#F3F3F3',
  },

  cancelBtnText: {
    color: '#202124',
    fontWeight: '600',
  },

  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
  },

  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
  },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },

  menuBox: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: 190,
    paddingVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },

  menuText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },

  modalSection: {
    marginBottom: 18,
  },

  modalSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  modalSectionTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
  },

  checkRow: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },

  checkRowActive: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF7F7',
  },

  sectionRow: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3D4D4',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },

  sectionRowActive: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFF7F7',
  },

  checkboxBase: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#D8B4B4',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  checkboxChecked: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },

  checkText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#202124',
    flex: 1,
  },

  deleteConfirmBox: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 22,
  },

  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 10,
  },

  deleteConfirmText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 21,
    marginBottom: 20,
  },

  deleteConfirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  deleteConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#D32F2F',
  },

  deleteConfirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
  },
});