import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AnnouncementModal, { Announcement } from './components/AnnouncementModal';
import DrawerMenu from './components/DrawerMenu';
import GeminiFloatingModal from './components/GeminiFloatingModal';
import Header from './components/Header';

import Analytics from './screens/Analytics';
import Assignments, {
  AssignmentComment,
  AssignmentCourse,
  AssignmentFileUpload,
  AssignmentItem,
} from './screens/Assignments';
import ClassesScreen from './screens/ClassesScreen';
import Community, { CommunityPost } from './screens/Community';
import CourseDetail, {
  CourseAssignment,
  CourseAssignmentComment,
  CourseDetailData,
} from './screens/CourseDetail';
import Dashboard, { DashboardAssignment } from './screens/Dashboard';
import Game from './screens/Game';
import GenerateActivity, { GenerateActivityData } from './screens/GenerateActivity';
import Messenger from './screens/Messenger';
import MyJourney from './screens/MyJourney';
import Notification, { NotificationItem } from './screens/Notification';
import Profile from './screens/Profile';
import Videos from './screens/Videos';

import FlipIt from './screens/games/flip-it';
import FruitMania from './screens/games/fruit-mania';
import QuizMasters from './screens/games/quiz-masters';

interface CurrentStudent {
  studentId: string;
  authUid?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  profileImage?: string | null;
  bannerImage?: string | null;
}

interface Props {
  onLogout: () => void;
  currentStudent: CurrentStudent;
}

interface RemoteStudentProfile {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string | null;
  bannerImage?: string | null;
}

type ScreenType =
  | 'home'
  | 'classes'
  | 'game'
  | 'flipit'
  | 'fruitmania'
  | 'quizmasters'
  | 'videos'
  | 'myjourney'
  | 'analytics'
  | 'profile'
  | 'messenger'
  | 'assignments'
  | 'coursedetail'
  | 'community'
  | 'generateactivity'
  | 'notification';

type StudentClassAnnouncement = Announcement & {
  classIds?: string[];
  bannerKey?: number | null;
  expiresAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

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

type StoredAssignmentScore = {
  points?: number;
  maxPoints?: number;
  feedback?: string | null;
};

type StoredAssignmentState = {
  files: Record<string, AssignmentFileUpload[]>;
  statuses: Record<string, AssignmentItem['status']>;
  scores: Record<string, StoredAssignmentScore>;
};

const getAssignmentStateKey = (studentId: string) => `student-assignment-state-${studentId}`;

const emptyStoredAssignmentState = (): StoredAssignmentState => ({
  files: {},
  statuses: {},
  scores: {},
});

const readStoredAssignmentState = async (studentId: string): Promise<StoredAssignmentState> => {
  if (!studentId) return emptyStoredAssignmentState();

  const key = getAssignmentStateKey(studentId);

  try {
    const raw =
      Platform.OS === 'web'
        ? (globalThis as any).localStorage?.getItem(key)
        : await FileSystem.readAsStringAsync(`${FileSystem.documentDirectory}${key}.json`);

    if (!raw) return emptyStoredAssignmentState();

    const parsed = JSON.parse(raw);
    return {
      files: parsed?.files || {},
      statuses: parsed?.statuses || {},
      scores: parsed?.scores || {},
    };
  } catch {
    return emptyStoredAssignmentState();
  }
};

const writeStoredAssignmentState = async (studentId: string, state: StoredAssignmentState) => {
  if (!studentId) return;

  const key = getAssignmentStateKey(studentId);
  const raw = JSON.stringify(state);

  try {
    if (Platform.OS === 'web') {
      (globalThis as any).localStorage?.setItem(key, raw);
      return;
    }

    await FileSystem.writeAsStringAsync(`${FileSystem.documentDirectory}${key}.json`, raw);
  } catch (error) {
    console.log('SAVE ASSIGNMENT STATE ERROR =>', error);
  }
};

const normalizeSubmissionList = (value: any): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.submissions)) return value.submissions;
  return [];
};

const formatRemoteDateTime = (value: any) => {
  if (!value) return new Date().toLocaleString();
  if (typeof value === 'string') return value;
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString();
  if (typeof value?._seconds === 'number') return new Date(value._seconds * 1000).toLocaleString();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000).toLocaleString();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toLocaleString() : parsed.toLocaleString();
};

const mapSubmissionToFile = (submission: any): AssignmentFileUpload | null => {
  const fileUrl = submission?.fileUrl || submission?.url || submission?.downloadUrl;
  const fileName = submission?.fileName || submission?.name;

  if (!fileUrl || !fileName) return null;

  return {
    id: String(submission?.submissionId || submission?.id || `submission-${submission?.assignmentId || Date.now()}`),
    submissionId: submission?.submissionId || submission?.id,
    fileName,
    fileSize: submission?.fileSize || 'Submitted file',
    uploadedDate: formatRemoteDateTime(submission?.submittedAt || submission?.uploadedDate || submission?.createdAt),
    submittedAt: formatRemoteDateTime(submission?.submittedAt || submission?.createdAt),
    fileUrl,
    fileType: submission?.fileType || 'application/octet-stream',
    storagePath: submission?.storagePath,
    bucketPath: submission?.bucketPath,
    isSubmitted: true,
    source: 'student',
  };
};


const ANNOUNCEMENT_BANNERS: Record<number, any> = {
  1: require('../assets/images/Banner1.png'),
  2: require('../assets/images/Banner2.png'),
  3: require('../assets/images/Banner3.png'),
  4: require('../assets/images/Banner4.png'),
};

const COURSES: CourseDetailData[] = [
  {
    id: '1',
    name: 'Web Development',
    code: 'CS-101',
    instructor: 'Prof. John Smith',
    description:
      'Learn the fundamentals of web development including HTML, CSS, JavaScript, and introductory React concepts.',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '3A - Python',
    materials: [
      { id: 'm1', title: 'HTML Basics Tutorial', type: 'video', uploadedDate: '2026-02-01' },
      { id: 'm2', title: 'CSS Styling Guide', type: 'pdf', uploadedDate: '2026-02-03' },
      { id: 'm3', title: 'JavaScript Fundamentals', type: 'video', uploadedDate: '2026-02-05' },
      { id: 'm4', title: 'React Components Introduction', type: 'document', uploadedDate: '2026-02-07' },
      { id: 'm5', title: 'Project Guidelines', type: 'document', uploadedDate: '2026-02-10' },
    ],
    assignments: [
      {
        id: 'a1',
        title: 'React Fundamentals Quiz',
        dueDate: '2026-02-15',
        status: 'graded',
        points: 8,
        maxPoints: 20,
        topic: 'React Fundamentals',
        materialIds: ['m4'],
        files: [
          {
            id: 'f-a1-1',
            name: 'React_Fundamentals_Quiz_submission.pdf',
            uploadedAt: '2026-02-15 08:30 AM',
          },
        ],
        comments: [
          {
            id: 'c-a1-1',
            author: 'Prof. John Smith',
            content: 'Please review the related materials before attempting the next activity.',
            timestamp: '2026-02-15 09:00 AM',
            isInstructor: true,
          },
        ],
      },
      {
        id: 'a2',
        title: 'Build a Simple Website',
        dueDate: '2026-02-20',
        status: 'graded',
        points: 42,
        maxPoints: 50,
        topic: 'HTML and CSS Layout',
        materialIds: ['m1', 'm2', 'm5'],
        files: [
          {
            id: 'f-a2-1',
            name: 'Simple_Website_Project.zip',
            uploadedAt: '2026-02-20 09:10 AM',
          },
          {
            id: 'f-a2-2',
            name: 'Project_Screenshots.pdf',
            uploadedAt: '2026-02-20 09:12 AM',
          },
        ],
        comments: [
          {
            id: 'c-a2-1',
            author: 'Prof. John Smith',
            content: 'Good work. Continue practicing to strengthen your understanding.',
            timestamp: '2026-02-20 09:30 AM',
            isInstructor: true,
          },
        ],
      },
      {
        id: 'a3',
        title: 'JavaScript Basics Checkpoint',
        dueDate: '2026-02-24',
        status: 'submitted',
        points: 0,
        maxPoints: 25,
        topic: 'JavaScript Fundamentals',
        materialIds: ['m3'],
        files: [
          {
            id: 'f-a3-1',
            name: 'JS_Basics_Checkpoint.docx',
            uploadedAt: '2026-02-24 07:50 AM',
          },
        ],
        comments: [],
      },
      {
        id: 'a4',
        title: 'Responsive Design Exercise',
        dueDate: '2026-02-28',
        status: 'pending',
        points: 0,
        maxPoints: 30,
        topic: 'Responsive Design',
        materialIds: ['m2', 'm5'],
        files: [],
        comments: [],
      },
    ],
  },
  {
    id: '2',
    name: 'Programming Logic',
    code: 'CS-102',
    instructor: 'Prof. Maria Santos',
    description: 'Understand variables, conditions, loops, and basic program flow.',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '2A - Algorithm',
    materials: [
      { id: 'm6', title: 'Variables and Data Types', type: 'pdf', uploadedDate: '2026-02-02' },
      { id: 'm7', title: 'Conditional Statements', type: 'video', uploadedDate: '2026-02-04' },
      { id: 'm8', title: 'Looping Concepts', type: 'document', uploadedDate: '2026-02-06' },
    ],
    assignments: [
      {
        id: 'a5',
        title: 'Conditional Statements Quiz',
        dueDate: '2026-02-16',
        status: 'graded',
        points: 14,
        maxPoints: 20,
        topic: 'Conditional Statements',
        materialIds: ['m7'],
        files: [
          {
            id: 'f-a5-1',
            name: 'Conditional_Statements_Quiz.pdf',
            uploadedAt: '2026-02-16 08:05 AM',
          },
        ],
        comments: [
          {
            id: 'c-a5-1',
            author: 'Prof. Maria Santos',
            content: 'Good work. Continue practicing to strengthen your understanding.',
            timestamp: '2026-02-16 08:40 AM',
            isInstructor: true,
          },
        ],
      },
      {
        id: 'a6',
        title: 'Loops Practice Set',
        dueDate: '2026-02-21',
        status: 'graded',
        points: 10,
        maxPoints: 20,
        topic: 'Loops',
        materialIds: ['m8'],
        files: [
          {
            id: 'f-a6-1',
            name: 'Loops_Practice_Set.docx',
            uploadedAt: '2026-02-21 07:55 AM',
          },
        ],
        comments: [
          {
            id: 'c-a6-1',
            author: 'Prof. Maria Santos',
            content: 'Please review the related materials before attempting the next activity.',
            timestamp: '2026-02-21 08:15 AM',
            isInstructor: true,
          },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Computer Fundamentals',
    code: 'IT-100',
    instructor: 'Prof. Allan Reyes',
    description: 'Explore basic computing concepts, hardware, software, and digital systems.',
    semester: '2nd Semester',
    schoolYear: '2025-2026',
    section: '1A - Microsoft',
    materials: [
      { id: 'm9', title: 'Hardware Overview', type: 'pdf', uploadedDate: '2026-02-01' },
      { id: 'm10', title: 'Software Systems', type: 'document', uploadedDate: '2026-02-05' },
    ],
    assignments: [
      {
        id: 'a7',
        title: 'Computer Basics Assessment',
        dueDate: '2026-02-18',
        status: 'graded',
        points: 18,
        maxPoints: 20,
        topic: 'Computer Architecture',
        materialIds: ['m9'],
        files: [
          {
            id: 'f-a7-1',
            name: 'Computer_Basics_Assessment.pdf',
            uploadedAt: '2026-02-18 08:20 AM',
          },
        ],
        comments: [
          {
            id: 'c-a7-1',
            author: 'Prof. Allan Reyes',
            content: 'Good work. Continue practicing to strengthen your understanding.',
            timestamp: '2026-02-18 08:45 AM',
            isInstructor: true,
          },
        ],
      },
    ],
  },
];

const mapCourseCommentsToAssignmentComments = (
  comments?: CourseAssignmentComment[]
): AssignmentComment[] => {
  return (comments || []).map((comment) => ({
    id: comment.id,
    author: comment.author,
    content: comment.content,
    timestamp: comment.timestamp,
    isInstructor: comment.isInstructor,
  }));
};

const mapCourseFilesToAssignmentFiles = (
  files?: CourseAssignment['files']
): AssignmentFileUpload[] => {
  return (files || []).map((file) => ({
    id: file.id,
    fileName: file.name,
    fileSize: (file as any).fileSize || '1.2 MB',
    uploadedDate: file.uploadedAt,
    fileUrl: file.uri || (file as any).fileUrl,
    fileType: (file as any).fileType,
    source: 'teacher',
  }));
};

const mapCourseAssignmentsToAssignmentItems = (
  assignments: CourseAssignment[]
): AssignmentItem[] => {
  return assignments.map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.dueDate,
    status: assignment.status,
    points: assignment.points,
    maxPoints: assignment.maxPoints,
    topic: assignment.topic,
    materialIds: assignment.materialIds,
    description: (assignment as any).description || (assignment as any).instruction || '',
    fileName: (assignment as any).fileName || null,
    fileUrl: (assignment as any).fileUrl || (assignment as any).fileUri || null,
    fileUri: (assignment as any).fileUri || (assignment as any).fileUrl || null,
    fileType: (assignment as any).fileType || null,
    storagePath: (assignment as any).storagePath || null,
    bucketPath: (assignment as any).bucketPath || null,
    comments: mapCourseCommentsToAssignmentComments(assignment.comments),
    files: mapCourseFilesToAssignmentFiles(assignment.files),
  }));
};

const mapCoursesToAssignmentCourses = (courses: CourseDetailData[]): AssignmentCourse[] => {
  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    code: course.code,
    instructor: course.instructor,
    description: course.description,
    semester: course.semester,
    schoolYear: course.schoolYear,
    section: course.section,
    materials: course.materials.map((material) => ({
      id: material.id,
      title: material.title,
      type: material.type,
      uploadedDate: material.uploadedDate,
      content: material.content,
      fileName: material.fileName,
      fileUrl: material.fileUrl || material.fileUri,
      fileUri: material.fileUri || material.fileUrl,
      fileType: material.fileType,
    })),
    assignments: mapCourseAssignmentsToAssignmentItems(course.assignments),
  }));
};

const mapJoinedClassToCourseDetail = (item: any): CourseDetailData & { units?: number } => ({
  id: String(item.id || ''),
  name: item.name || 'Untitled Class',
  code: item.courseCode || item.classCode || '',
  instructor: item.instructorName || 'Unknown Instructor',
  description: item.description || 'No description available.',
  semester: item.semester || '',
  schoolYear: item.schoolYear || '',
  section: item.section || '',
  units: typeof item.units === 'number' ? item.units : Number(item.units) || 0,
  materials: Array.isArray(item.materials) ? item.materials : [],
  assignments: Array.isArray(item.assignments) ? item.assignments : [],
});

const mapCourseDetailToAssignmentCourse = (course: CourseDetailData): AssignmentCourse => ({
  id: course.id,
  name: course.name,
  code: course.code,
  instructor: course.instructor,
  description: course.description,
  semester: course.semester,
  schoolYear: course.schoolYear,
  section: course.section,
  materials: (course.materials || []).map((material) => ({
    id: material.id,
    title: material.title,
    type: material.type,
    uploadedDate: material.uploadedDate,
    content: material.content,
    fileName: material.fileName,
    fileUrl: material.fileUrl || material.fileUri,
    fileUri: material.fileUri || material.fileUrl,
    fileType: material.fileType,
  })),
  assignments: (course.assignments || []).map((assignment) => ({
    id: assignment.id,
    title: assignment.title,
    dueDate: assignment.dueDate,
    status: assignment.status,
    points: assignment.points,
    maxPoints: assignment.maxPoints,
    topic: assignment.topic,
    materialIds: assignment.materialIds,
    description: (assignment as any).description || (assignment as any).instruction || '',
    fileName: (assignment as any).fileName || null,
    fileUrl: (assignment as any).fileUrl || (assignment as any).fileUri || null,
    fileUri: (assignment as any).fileUri || (assignment as any).fileUrl || null,
    fileType: (assignment as any).fileType || null,
    storagePath: (assignment as any).storagePath || null,
    bucketPath: (assignment as any).bucketPath || null,
    comments: mapCourseCommentsToAssignmentComments(assignment.comments),
    files: mapCourseFilesToAssignmentFiles(assignment.files),
  })),
});

export default function StudentApp({ onLogout, currentStudent }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isLargeScreen = width >= 768;
  const isSmallScreen = width < 768;

  const [remoteStudentProfile, setRemoteStudentProfile] = useState<RemoteStudentProfile | null>(null);

  const currentUserFirstName = remoteStudentProfile?.firstName || currentStudent.firstName || '';
  const currentUserLastName = remoteStudentProfile?.lastName || currentStudent.lastName || '';
  const currentUserName =
    `${currentUserFirstName} ${currentUserLastName}`.trim() || 'Student';

  const currentUserEmail = remoteStudentProfile?.email || currentStudent.email || '';

  const initialAvatar = remoteStudentProfile?.profileImage || currentStudent.profileImage
    ? { uri: remoteStudentProfile?.profileImage || currentStudent.profileImage || '' }
    : null;

  const initialBanner = remoteStudentProfile?.bannerImage || currentStudent.bannerImage
    ? { uri: remoteStudentProfile?.bannerImage || currentStudent.bannerImage || '' }
    : null;

  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [lastScreen, setLastScreen] = useState<ScreenType>('home');
  const [selectedCourse, setSelectedCourse] = useState<CourseDetailData>(COURSES[0]);
  const [selectedCourseIdForAssignments, setSelectedCourseIdForAssignments] = useState<string | null>(null);
  const [generatedActivity, setGeneratedActivity] = useState<GenerateActivityData | null>(null);

  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [activeCourseTab, setActiveCourseTab] = useState<'materials' | 'assignments'>('materials');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<any>(initialAvatar);
  const [currentUserBanner, setCurrentUserBanner] = useState<any>(initialBanner);
  const [hasImageChanged, setHasImageChanged] = useState(false);

  const [joinedCourses, setJoinedCourses] = useState<CourseDetailData[]>([]);
  const [isLoadingJoinedCourses, setIsLoadingJoinedCourses] = useState(false);
  const [studentAnnouncements, setStudentAnnouncements] = useState<StudentClassAnnouncement[]>([]);

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [studentNotifications, setStudentNotifications] = useState<NotificationItem[]>([]);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');

  const isFullscreenScreen =
    activeScreen === 'flipit' ||
    activeScreen === 'fruitmania' ||
    activeScreen === 'quizmasters';

  const isMobileFullscreenScreen =
    isSmallScreen &&
    (
      activeScreen === 'messenger' ||
      activeScreen === 'notification' ||
      activeScreen === 'coursedetail' ||
      activeScreen === 'generateactivity'
    );

  const shouldShowHeader = !isFullscreenScreen && !isMobileFullscreenScreen;
  const shouldShowDesktopDrawer =
    !isFullscreenScreen &&
    !isMobileFullscreenScreen &&
    isLargeScreen &&
    activeScreen !== 'profile' &&
    activeScreen !== 'notification';

  const safeAreaEdges =
    isFullscreenScreen
      ? []
      : hasImageChanged
      ? (['top', 'right', 'bottom', 'left'] as const)
      : (['right', 'left'] as const);

  const toMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (typeof value?._seconds === 'number') return value._seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const isAnnouncementActive = (value?: any) => {
  if (!value) return true;
  const expiry =
    typeof value?.toDate === 'function' ? value.toDate() : new Date(value);

  if (Number.isNaN(expiry.getTime())) return true;
  return expiry.getTime() > Date.now();
};

  const loadCurrentStudentProfile = async () => {
    if (!currentStudent?.studentId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentStudent.studentId,
          role: 'student',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load user profile.');
      }

      const profileData = data?.data || {};

      setRemoteStudentProfile({
        firstName: profileData.firstName || currentStudent.firstName,
        lastName: profileData.lastName || currentStudent.lastName,
        email: profileData.email || currentStudent.email,
        profileImage: profileData.profileImage || null,
        bannerImage: profileData.bannerImage || null,
      });

      if (profileData.profileImage) {
        setCurrentUserAvatar({ uri: profileData.profileImage });
      } else if (currentStudent.profileImage) {
        setCurrentUserAvatar({ uri: currentStudent.profileImage });
      }

      if (profileData.bannerImage) {
        setCurrentUserBanner({ uri: profileData.bannerImage });
      } else if (currentStudent.bannerImage) {
        setCurrentUserBanner({ uri: currentStudent.bannerImage });
      }
    } catch (error) {
      console.log('LOAD CURRENT STUDENT PROFILE ERROR =>', error);

      if (currentStudent.profileImage) {
        setCurrentUserAvatar({ uri: currentStudent.profileImage });
      }

      if (currentStudent.bannerImage) {
        setCurrentUserBanner({ uri: currentStudent.bannerImage });
      }
    }
  };

  useEffect(() => {
    loadCurrentStudentProfile();
  }, [currentStudent?.studentId]);

  useEffect(() => {
    if (!remoteStudentProfile?.profileImage && currentStudent.profileImage) {
      setCurrentUserAvatar({ uri: currentStudent.profileImage });
    }

    if (!remoteStudentProfile?.bannerImage && currentStudent.bannerImage) {
      setCurrentUserBanner({ uri: currentStudent.bannerImage });
    }
  }, [
    currentStudent.bannerImage,
    currentStudent.profileImage,
    remoteStudentProfile?.bannerImage,
    remoteStudentProfile?.profileImage,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const setupNavigation = async () => {
      try {
        if (isFullscreenScreen) {
          await NavigationBar.setBehaviorAsync('overlay-swipe');
          await NavigationBar.setVisibilityAsync('hidden');
        } else {
          await NavigationBar.setVisibilityAsync('visible');
        }
      } catch (error) {
        console.log('Navigation bar error:', error);
      }
    };

    setupNavigation();
  }, [isFullscreenScreen]);

  useEffect(() => {
    if (isMobileFullscreenScreen && isMobileDrawerOpen) {
      setMobileDrawerOpen(false);
    }
  }, [isMobileFullscreenScreen, isMobileDrawerOpen]);

  useEffect(() => {
    if (!isLargeScreen) {
      setIsNotificationOpen(false);
    }
  }, [isLargeScreen]);

  useEffect(() => {
    if (activeScreen === 'notification' || isMobileFullscreenScreen) {
      setIsNotificationOpen(false);
    }
  }, [activeScreen, isMobileFullscreenScreen]);

  const getBase64FromUri = async (uri: string) => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();

      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();

        reader.onloadend = () => {
          const result = reader.result;

          if (typeof result !== 'string') {
            reject(new Error('Failed to read file as base64.'));
            return;
          }

          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };

        reader.onerror = () => reject(new Error('Failed to convert blob to base64.'));
        reader.readAsDataURL(blob);
      });
    }

    return await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });
  };

  const resolveCurrentUserDocId = () => {
    return (
      currentStudent.studentId ||
      currentStudent.authUid ||
      currentStudent.email
    );
  };

  const saveUserImagesToFirestore = async ({
    profileImage,
    bannerImage,
  }: {
    profileImage?: any;
    bannerImage?: any;
  }) => {
    const userId = resolveCurrentUserDocId();

    if (!userId) {
      throw new Error('User ID is missing.');
    }

    const body: any = {
      id: userId,
      role: 'student',
    };

    if (profileImage?.uri) {
      body.profileImageBase64 = await getBase64FromUri(profileImage.uri);
      body.profileImageMimeType = 'image/jpeg';
      body.profileImageFileName = 'profile.jpg';
    }

    if (bannerImage?.uri) {
      body.bannerImageBase64 = await getBase64FromUri(bannerImage.uri);
      body.bannerImageMimeType = 'image/jpeg';
      body.bannerImageFileName = 'banner.jpg';
    }

    const response = await fetch(`${API_BASE_URL}/auth/update-user-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to save user images.');
    }

    return data?.data || {};
  };

  const handleChangeProfileImage = async (image: any) => {
    try {
      setCurrentUserAvatar(image);
      setHasImageChanged(true);

      if (!image?.uri) return;

      const savedData = await saveUserImagesToFirestore({
        profileImage: image,
      });

      if (savedData?.profileImage) {
        setCurrentUserAvatar({ uri: savedData.profileImage });
        setRemoteStudentProfile((prev) => ({
          ...(prev || {}),
          firstName: prev?.firstName || currentStudent.firstName,
          lastName: prev?.lastName || currentStudent.lastName,
          email: prev?.email || currentStudent.email,
          profileImage: savedData.profileImage,
          bannerImage: prev?.bannerImage || currentUserBanner?.uri || currentStudent.bannerImage || null,
        }));
      }
    } catch (error: any) {
      console.log('SAVE PROFILE IMAGE ERROR =>', error);
      Alert.alert(
        'Save Failed',
        error?.message || 'Unable to save profile image.'
      );
    }
  };

  const handleChangeBannerImage = async (image: any) => {
    try {
      setCurrentUserBanner(image);
      setHasImageChanged(true);

      if (!image?.uri) return;

      const savedData = await saveUserImagesToFirestore({
        bannerImage: image,
      });

      if (savedData?.bannerImage) {
        setCurrentUserBanner({ uri: savedData.bannerImage });
        setRemoteStudentProfile((prev) => ({
          ...(prev || {}),
          firstName: prev?.firstName || currentStudent.firstName,
          lastName: prev?.lastName || currentStudent.lastName,
          email: prev?.email || currentStudent.email,
          profileImage: prev?.profileImage || currentUserAvatar?.uri || currentStudent.profileImage || null,
          bannerImage: savedData.bannerImage,
        }));
      }
    } catch (error: any) {
      console.log('SAVE BANNER IMAGE ERROR =>', error);
      Alert.alert(
        'Save Failed',
        error?.message || 'Unable to save banner image.'
      );
    }
  };

  const handleDrawerEmailUpdated = (nextEmail: string) => {
    setRemoteStudentProfile((prev) => ({
      ...(prev || {}),
      firstName: prev?.firstName || currentStudent.firstName,
      lastName: prev?.lastName || currentStudent.lastName,
      email: nextEmail,
      profileImage:
        prev?.profileImage ||
        currentUserAvatar?.uri ||
        currentStudent.profileImage ||
        null,
      bannerImage:
        prev?.bannerImage ||
        currentUserBanner?.uri ||
        currentStudent.bannerImage ||
        null,
    }));
  };


  const loadStudentAnnouncements = async (courses: CourseDetailData[]) => {
  try {
    const classIds = courses.map((item) => item.id).filter(Boolean);

    if (!classIds.length) {
      setStudentAnnouncements([]);
      return;
    }

    const groupedAnnouncements = await Promise.all(
      classIds.map(async (classId) => {
        const response = await fetch(`${API_BASE_URL}/class-announcements/${classId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load announcements.');
        }

        return Array.isArray(data) ? data : [];
      })
    );

    const rawAnnouncements = groupedAnnouncements.flat();

    const active = rawAnnouncements.filter((item: any) =>
      isAnnouncementActive(item?.expiresAt)
    );

    const uniqueMap = new Map<string, any>();

    active.forEach((item: any) => {
      const key = `${item.title}-${item.message}-${item.expiresAt}-${item.bannerKey}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    });

    const mappedAnnouncements: StudentClassAnnouncement[] = Array.from(
      uniqueMap.values()
    )
      .map((item: any) => ({
        id: item.id,
        classIds: Array.isArray(item.classIds) ? item.classIds : [],
        title: item.title || '',
        message: item.message || '',
        bannerKey: typeof item.bannerKey === 'number' ? item.bannerKey : 4,
        bannerImage:
          ANNOUNCEMENT_BANNERS[
            typeof item.bannerKey === 'number' ? item.bannerKey : 4
          ],
        expiresAt: item.expiresAt || null,
        createdAt: item.createdAt || null,
        updatedAt: item.updatedAt || null,
      }))
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    setStudentAnnouncements(mappedAnnouncements);
  } catch (error) {
    console.log('LOAD STUDENT ANNOUNCEMENTS ERROR =>', error);
    setStudentAnnouncements([]);
  }
};

  const loadJoinedClasses = async () => {
    if (!currentStudent?.studentId) return;

    try {
      setIsLoadingJoinedCourses(true);

      const response = await fetch(
        `${API_BASE_URL}/student-joined-classes/${currentStudent.studentId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load joined classes.');
      }

      const classesArray = Array.isArray(data) ? data : data?.data || [];
      const mappedCourses = classesArray.map(mapJoinedClassToCourseDetail);

      setJoinedCourses(mappedCourses);
      await loadStudentAnnouncements(mappedCourses);
    } catch (error) {
      console.log('LOAD JOINED CLASSES ERROR =>', error);
      setJoinedCourses([]);
      setStudentAnnouncements([]);
    } finally {
      setIsLoadingJoinedCourses(false);
    }
  };

  useEffect(() => {
    loadJoinedClasses();
  }, [currentStudent?.studentId]);

  const handleJoinClass = async (classCode: string) => {
    const trimmedCode = classCode.trim().toUpperCase();

    if (!trimmedCode) return;

    try {
      const joinResponse = await fetch(`${API_BASE_URL}/join-class`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode: trimmedCode,
          studentId: currentStudent.studentId,
        }),
      });

      const joinData = await joinResponse.json();

      if (joinResponse.status === 409) {
        await loadJoinedClasses();
        Alert.alert(
          'Already Joined',
          joinData?.error || 'You are already a member of this class.'
        );
        return;
      }

      if (!joinResponse.ok) {
        throw new Error(joinData?.error || 'Failed to join class.');
      }

      await loadJoinedClasses();
      Alert.alert('Success', 'You joined the class successfully.');
    } catch (error: any) {
      Alert.alert('Join Class Failed', error?.message || 'Unable to join class.');
    }
  };

  const hydratedCommunityPosts = useMemo<CommunityPost[]>(() => {
    return communityPosts.map((post) => {
      const isCurrentUsersPost = post.userEmail
        ? post.userEmail === currentUserEmail
        : post.userName === currentUserName;

      return {
        ...post,
        avatar: isCurrentUsersPost ? currentUserAvatar : post.avatar,
        answers: post.answers.map((answer) => ({
          ...answer,
          avatar: answer.userName === currentUserName ? currentUserAvatar : answer.avatar,
        })),
      };
    });
  }, [communityPosts, currentUserAvatar, currentUserEmail, currentUserName]);

  const sharedCourses = useMemo(() => mapCoursesToAssignmentCourses(COURSES), []);

  const [sharedAssignmentComments, setSharedAssignmentComments] = useState<Record<string, AssignmentComment[]>>(
    () =>
      Object.fromEntries(
        sharedCourses.flatMap((course) =>
          course.assignments.map((assignment) => [assignment.id, assignment.comments || []])
        )
      )
  );

  const [sharedAssignmentFiles, setSharedAssignmentFiles] = useState<Record<string, AssignmentFileUpload[]>>(
    () =>
      Object.fromEntries(
        sharedCourses.flatMap((course) =>
          course.assignments.map((assignment) => [assignment.id, []])
        )
      )
  );

  const [sharedAssignmentStatuses, setSharedAssignmentStatuses] = useState<Record<string, AssignmentItem['status']>>({});
  const [sharedAssignmentScores, setSharedAssignmentScores] = useState<Record<string, StoredAssignmentScore>>({});
  const [hasLoadedAssignmentState, setHasLoadedAssignmentState] = useState(false);

  const hydratedSharedCourses = useMemo<AssignmentCourse[]>(() => {
    return sharedCourses.map((course) => ({
      ...course,
      assignments: course.assignments.map((assignment) => {
        const scoreState = sharedAssignmentScores[assignment.id];

        return {
          ...assignment,
          status: sharedAssignmentStatuses[assignment.id] || assignment.status,
          points:
            scoreState?.points !== undefined
              ? scoreState.points
              : assignment.points,
          maxPoints:
            scoreState?.maxPoints !== undefined
              ? scoreState.maxPoints
              : assignment.maxPoints,
          comments: sharedAssignmentComments[assignment.id] || [],
          files: assignment.files || [],
        };
      }),
    }));
  }, [sharedCourses, sharedAssignmentComments, sharedAssignmentFiles, sharedAssignmentScores, sharedAssignmentStatuses]);

  const joinedAssignmentCourses = useMemo<AssignmentCourse[]>(
    () =>
      mapCoursesToAssignmentCourses(joinedCourses).map((course) => ({
        ...course,
        assignments: course.assignments.map((assignment) => {
          const scoreState = sharedAssignmentScores[assignment.id];

          return {
            ...assignment,
            status: sharedAssignmentStatuses[assignment.id] || assignment.status,
            points:
              scoreState?.points !== undefined
                ? scoreState.points
                : assignment.points,
            maxPoints:
              scoreState?.maxPoints !== undefined
                ? scoreState.maxPoints
                : assignment.maxPoints,
            files: assignment.files || [],
          };
        }),
      })),
    [joinedCourses, sharedAssignmentFiles, sharedAssignmentScores, sharedAssignmentStatuses]
  );

  const selectedAssignmentCourse = useMemo(() => {
    return (
      joinedAssignmentCourses.find((course) => course.id === selectedCourse.id) ||
      hydratedSharedCourses.find((course) => course.id === selectedCourse.id) ||
      hydratedSharedCourses[0]
    );
  }, [joinedAssignmentCourses, hydratedSharedCourses, selectedCourse.id]);

  const applySavedAssignmentState = (state: StoredAssignmentState) => {
    setSharedAssignmentFiles((prev) => ({
      ...prev,
      ...state.files,
    }));

    setSharedAssignmentStatuses((prev) => ({
      ...prev,
      ...state.statuses,
    }));

    setSharedAssignmentScores((prev) => ({
      ...prev,
      ...(state.scores || {}),
    }));
  };

  const loadStudentSubmissionState = useCallback(async () => {
    if (!currentStudent?.studentId) return;

    const localState = await readStoredAssignmentState(currentStudent.studentId);
    applySavedAssignmentState(localState);

    try {
      const response = await fetch(
        `${API_BASE_URL}/student-submissions/${encodeURIComponent(currentStudent.studentId)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load student submissions.');
      }

      const filesByAssignment: Record<string, AssignmentFileUpload[]> = {};
      const statusesByAssignment: Record<string, AssignmentItem['status']> = {};
      const scoresByAssignment: Record<string, StoredAssignmentScore> = {};

      normalizeSubmissionList(data).forEach((submission) => {
        const assignmentId = String(submission?.assignmentId || '');
        if (!assignmentId) return;

        const status =
          submission?.status === 'graded'
            ? 'graded'
            : submission?.status === 'submitted'
            ? 'submitted'
            : 'pending';

        statusesByAssignment[assignmentId] = status;

        if (status !== 'graded') {
          scoresByAssignment[assignmentId] = {};
        }

        if (status === 'graded') {
          const numericScore = Number(submission?.score);
          const numericMaxScore = Number(
            submission?.maxPoints ??
              submission?.totalScore ??
              submission?.maxScore
          );

          scoresByAssignment[assignmentId] = {
            ...(Number.isFinite(numericScore) ? { points: numericScore } : {}),
            ...(Number.isFinite(numericMaxScore) && numericMaxScore > 0
              ? { maxPoints: numericMaxScore }
              : {}),
            feedback: submission?.feedback ?? null,
          };
        }

        const mappedFile = mapSubmissionToFile(submission);
        if (mappedFile) {
          filesByAssignment[assignmentId] = [
            ...(filesByAssignment[assignmentId] || []),
            mappedFile,
          ];
        }
      });

      applySavedAssignmentState({
        files: filesByAssignment,
        statuses: statusesByAssignment,
        scores: scoresByAssignment,
      });
    } catch (error) {
      console.log('LOAD STUDENT SUBMISSIONS FALLBACK TO LOCAL CACHE =>', error);
    } finally {
      setHasLoadedAssignmentState(true);
    }
  }, [currentStudent?.studentId]);

  useEffect(() => {
    setHasLoadedAssignmentState(false);
    void loadStudentSubmissionState();
  }, [loadStudentSubmissionState]);

  useEffect(() => {
    if (!currentStudent?.studentId || !hasLoadedAssignmentState) return;

    void writeStoredAssignmentState(currentStudent.studentId, {
      files: sharedAssignmentFiles,
      statuses: sharedAssignmentStatuses,
      scores: sharedAssignmentScores,
    });
  }, [
    currentStudent?.studentId,
    hasLoadedAssignmentState,
    sharedAssignmentFiles,
    sharedAssignmentScores,
    sharedAssignmentStatuses,
  ]);

  const currentUserPosts = useMemo(() => {
    return hydratedCommunityPosts.filter(
      (post) => post.userName === currentUserName || post.userEmail === currentUserEmail
    );
  }, [hydratedCommunityPosts, currentUserEmail, currentUserName]);

  const handleAddAssignmentComment = (assignmentId: string, content: string) => {
    if (!content.trim()) return;

    setSharedAssignmentComments((prev) => ({
      ...prev,
      [assignmentId]: [
        ...(prev[assignmentId] || []),
        {
          id: `c${Date.now()}`,
          author: currentUserName,
          content,
          timestamp: new Date().toLocaleString(),
          isInstructor: false,
        },
      ],
    }));
  };

  const handleAddAssignmentFile = (assignmentId: string, file: AssignmentFileUpload) => {
    setSharedAssignmentFiles((prev) => ({
      ...prev,
      [assignmentId]: [...(prev[assignmentId] || []), file],
    }));
  };

  const handleRemoveAssignmentFile = (assignmentId: string, fileId: string) => {
    setSharedAssignmentFiles((prev) => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] || []).filter((file) => file.id !== fileId),
    }));
  };

  const handleUpdateAssignmentStatus = (
    assignmentId: string,
    status: AssignmentItem['status']
  ) => {
    setSharedAssignmentStatuses((prev) => {
      const next = {
        ...prev,
        [assignmentId]: status,
      };

      void writeStoredAssignmentState(currentStudent.studentId, {
        files: sharedAssignmentFiles,
        statuses: next,
        scores: sharedAssignmentScores,
      });

      return next;
    });

    setJoinedCourses((prev) =>
      prev.map((course) => ({
        ...course,
        assignments: course.assignments.map((assignment) =>
          assignment.id === assignmentId
            ? { ...assignment, status }
            : assignment
        ),
      }))
    );
  };

  const normalizeCommunityAvatar = (avatar: any) => {
    if (!avatar) return null;
    if (typeof avatar === 'string') return avatar;
    if (avatar?.uri) return avatar.uri;
    return null;
  };

  const loadCommunityPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/community-posts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load community posts.');
      }

      const posts = Array.isArray(data?.data) ? data.data : [];
      setCommunityPosts(posts);
    } catch (error) {
      console.log('LOAD COMMUNITY POSTS ERROR =>', error);
    }
  };

  const handleCreateCommunityPost = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    try {
      const response = await fetch(`${API_BASE_URL}/community-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmedQuery,
          authorId: currentStudent.studentId,
          authorUid: currentStudent.authUid || null,
          authorRole: 'student',
          userName: currentUserName,
          userEmail: currentUserEmail,
          avatar: normalizeCommunityAvatar(currentUserAvatar),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create post.');
      }

      await loadCurrentStudentProfile();
      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Post Failed', error?.message || 'Unable to create post.');
    }
  };

  const handleAddCommunityAnswer = async (postId: string, message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    try {
      const response = await fetch(`${API_BASE_URL}/community-posts/${postId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          authorId: currentStudent.studentId,
          authorUid: currentStudent.authUid || null,
          authorRole: 'student',
          userName: currentUserName,
          avatar: normalizeCommunityAvatar(currentUserAvatar),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add answer.');
      }

      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Answer Failed', error?.message || 'Unable to post answer.');
    }
  };

  const handleEditCommunityPost = async (postId: string, content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    try {
      const response = await fetch(`${API_BASE_URL}/community-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmedContent }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update post.');
      }

      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update post.');
    }
  };

  const handleDeleteCommunityPost = async (postId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/community-posts/${postId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete post.');
      }

      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Unable to delete post.');
    }
  };

  const handleEditCommunityAnswer = async (
    postId: string,
    answerId: string,
    message: string
  ) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    try {
      const response = await fetch(
        `${API_BASE_URL}/community-posts/${postId}/answers/${answerId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: trimmedMessage }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update answer.');
      }

      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update answer.');
    }
  };

  const handleDeleteCommunityAnswer = async (postId: string, answerId: string) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/community-posts/${postId}/answers/${answerId}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete answer.');
      }

      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Unable to delete answer.');
    }
  };

  useEffect(() => {
    loadCommunityPosts();
  }, []);

  const getScorePercent = (assignment: {
    status: 'pending' | 'submitted' | 'graded';
    points?: number;
    maxPoints?: number;
  }) => {
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

  const buildGeneratedActivity = (
    course: CourseDetailData,
    assignment: DashboardAssignment | CourseAssignment | AssignmentItem
  ): GenerateActivityData | null => {
    const score = getScorePercent(assignment);
    if (score === null) return null;

    const recommendationType: GenerateActivityData['recommendationType'] =
      score < 60 ? 'review' : score < 75 ? 'practice' : 'advanced';

    const difficulty: GenerateActivityData['difficulty'] =
      recommendationType === 'review'
        ? 'easy'
        : recommendationType === 'practice'
        ? 'medium'
        : 'hard';

    const instructions =
      recommendationType === 'review'
        ? 'Review the concept explanation, answer the quick check, and complete the short response to strengthen your foundation.'
        : recommendationType === 'practice'
        ? 'Complete this guided practice to improve your understanding and become more confident with the topic.'
        : 'Take on this advanced follow-up activity to deepen your mastery of the topic.';

    return {
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      topic: assignment.topic || assignment.title,
      score,
      recommendationType,
      difficulty,
      instructions,
      basedOnMaterials: course.materials
        .filter((material) => assignment.materialIds?.includes(material.id))
        .map((material) => material.title),
    };
  };

  const loadStudentNotifications = useCallback(async () => {
    if (!currentStudent?.studentId) {
      setStudentNotifications([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications?userId=${encodeURIComponent(currentStudent.studentId)}&role=student`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load notifications.');
      }

      setStudentNotifications(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.log('LOAD STUDENT NOTIFICATIONS ERROR =>', error);
    }
  }, [currentStudent?.studentId]);

  useEffect(() => {
    void loadStudentNotifications();
  }, [loadStudentNotifications]);

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to mark notification as read.');
    }

    setStudentNotifications((prev) =>
      prev.map((item) =>
        item.id === notificationId ? { ...item, read: true } : item
      )
    );
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const response = await fetch(`${API_BASE_URL}/notifications/read-all`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentStudent.studentId,
        role: 'student',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to mark all notifications as read.');
    }

    setStudentNotifications((prev) =>
      prev.map((item) => ({ ...item, read: true }))
    );
  };

  const handleGeneratedActivityCompleted = async (activity: GenerateActivityData) => {
    await loadStudentNotifications();

    Alert.alert(
      'Activity Completed',
      `${activity.assignmentTitle} has been marked as done.`
    );
  };

  const unreadNotificationCount = useMemo(
    () => studentNotifications.filter((item) => !item.read).length,
    [studentNotifications]
  );

  const dashboardCourses = joinedAssignmentCourses;
  const classesScreenCourses = joinedAssignmentCourses;

  const messengerCourses = useMemo(
    () =>
      joinedCourses.map((course) => ({
        id: course.id,
        name: course.name,
        instructor: course.instructor,
        semester: course.semester,
        schoolYear: course.schoolYear,
        section: course.section,
      })),
    [joinedCourses]
  );

  const handleNavigate = (screen: ScreenType) => {
    if (activeScreen !== screen) {
      setLastScreen(activeScreen);
    }

    if (screen === 'assignments') {
      setSelectedCourseIdForAssignments(null);
    }

    if (screen !== 'generateactivity') {
      setGeneratedActivity(null);
    }

    setIsNotificationOpen(false);
    setActiveScreen(screen);
    if (screen !== 'videos') {
      setVideoSearchQuery('');
    }
    setMobileDrawerOpen(false);
  };

  const handleNotificationPress = () => {
    if (isLargeScreen) {
      setIsNotificationOpen((prev) => !prev);
    } else {
      setLastScreen(activeScreen);
      setActiveScreen('notification');
    }
  };

  const openGeneratedActivity = async (
    course: CourseDetailData,
    assignment: DashboardAssignment | CourseAssignment | AssignmentItem
  ) => {
    const activity = buildGeneratedActivity(course, assignment);

    if (!activity) {
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/student-activities/notify-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: currentStudent.studentId,
          courseId: activity.courseId,
          assignmentId: activity.assignmentId,
          courseName: activity.courseName,
          assignmentTitle: activity.assignmentTitle,
          topic: activity.topic,
          recommendationType: activity.recommendationType,
        }),
      });
    } catch (error) {
      console.log('NOTIFY READY ERROR =>', error);
    }

    await loadStudentNotifications();
    setSelectedCourse(course);
    setSelectedCourseIdForAssignments(course.id);
    setGeneratedActivity(activity);
    setLastScreen(activeScreen);
    setIsNotificationOpen(false);
    setActiveScreen('generateactivity');
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'profile':
        return (
          <Profile
            userPosts={currentUserPosts}
            onCreatePost={handleCreateCommunityPost}
            onAddAnswer={handleAddCommunityAnswer}
            onEditPost={handleEditCommunityPost}
            onDeletePost={handleDeleteCommunityPost}
            onEditAnswer={handleEditCommunityAnswer}
            onDeleteAnswer={handleDeleteCommunityAnswer}
            userName={currentUserName}
            userEmail={currentUserEmail}
            profileImage={currentUserAvatar}
            bannerImage={currentUserBanner}
            onChangeProfileImage={handleChangeProfileImage}
            onChangeBannerImage={handleChangeBannerImage}
          />
        );

      case 'home':
        return (
          <Dashboard
            announcements={studentAnnouncements}
            courses={dashboardCourses}
            onOpenCourse={(course) => {
              setSelectedCourse(course as unknown as CourseDetailData);
              setGeneratedActivity(null);
              setLastScreen(activeScreen);
              setIsNotificationOpen(false);
              setActiveScreen('coursedetail');
              setActiveCourseTab('materials');
            }}
            onOpenAssignments={(course) => {
              setSelectedCourse(course as unknown as CourseDetailData);
              setSelectedCourseIdForAssignments(course.id);
              setGeneratedActivity(null);
              setLastScreen(activeScreen);
              setIsNotificationOpen(false);
              setActiveScreen('coursedetail');
              setActiveCourseTab('assignments');
            }}
            onOpenMaterials={(course) => {
              setSelectedCourse(course as unknown as CourseDetailData);
              setGeneratedActivity(null);
              setLastScreen(activeScreen);
              setIsNotificationOpen(false);
              setActiveScreen('coursedetail');
              setActiveCourseTab('materials');
            }}
            onOpenGeneratedActivity={(course, assignment) =>
              openGeneratedActivity(course as unknown as CourseDetailData, assignment)
            }
            onJoinClass={handleJoinClass}
          />
        );

      case 'classes':
        return (
          <ClassesScreen
            courses={classesScreenCourses}
            onCoursePress={(course) => {
              setSelectedCourse(course as unknown as CourseDetailData);
              setGeneratedActivity(null);
              setLastScreen('classes');
              setIsNotificationOpen(false);
              setActiveScreen('coursedetail');
              setActiveCourseTab('materials');
            }}
            onAssignmentPress={(course) => {
              setSelectedCourse(course as unknown as CourseDetailData);
              setSelectedCourseIdForAssignments(course.id);
              setGeneratedActivity(null);
              setLastScreen('classes');
              setIsNotificationOpen(false);
              setActiveScreen('coursedetail');
              setActiveCourseTab('assignments');
            }}
            onMaterialsPress={(course) => {
              setSelectedCourse(course as unknown as CourseDetailData);
              setGeneratedActivity(null);
              setLastScreen('classes');
              setIsNotificationOpen(false);
              setActiveScreen('coursedetail');
              setActiveCourseTab('materials');
            }}
            onJoinClass={handleJoinClass}
          />
        );

      case 'game':
        return <Game onNavigate={handleNavigate} />;

      case 'flipit':
        return <FlipIt onBack={() => setActiveScreen('game')} />;

      case 'fruitmania':
        return <FruitMania onBack={() => setActiveScreen('game')} />;

      case 'quizmasters':
        return <QuizMasters onBack={() => setActiveScreen('game')} />;

      case 'videos':
        return (
          <Videos
          onVideoActiveChange={setIsVideoActive}
          currentUserName={currentUserName}
          currentUserAvatar={currentUserAvatar}
          currentUserId={currentStudent.studentId}
          currentUserRole="student"
          apiBaseUrl={API_BASE_URL}
          searchQuery={videoSearchQuery}
        />
        );

      case 'myjourney':
        return (
          <MyJourney
            courses={joinedCourses}
            currentStudent={currentStudent}
            studentName={currentUserName}
            apiBaseUrl={API_BASE_URL}
          />
        );

      case 'analytics':
        return (
          <Analytics
            courses={joinedAssignmentCourses}
            studentName={currentUserName}
          />
        );

      case 'assignments':
        return (
          <Assignments
            courses={joinedAssignmentCourses}
            selectedCourseId={selectedCourseIdForAssignments}
            assignmentComments={sharedAssignmentComments}
            assignmentFiles={sharedAssignmentFiles}
            onAddComment={handleAddAssignmentComment}
            onAddFile={handleAddAssignmentFile}
            onRemoveFile={handleRemoveAssignmentFile}
            onUpdateAssignmentStatus={handleUpdateAssignmentStatus}
            onRefreshSubmissions={loadStudentSubmissionState}
            currentStudent={currentStudent}
            onOpenGeneratedActivity={(course, assignment) =>
              openGeneratedActivity(course as unknown as CourseDetailData, assignment)
            }
          />
        );

      case 'community':
        return (
          <Community
            posts={hydratedCommunityPosts}
            userName={currentUserName}
            userEmail={currentUserEmail}
            userAvatar={currentUserAvatar}
            onCreatePost={handleCreateCommunityPost}
            onAddAnswer={handleAddCommunityAnswer}
            onEditPost={handleEditCommunityPost}
            onDeletePost={handleDeleteCommunityPost}
            onEditAnswer={handleEditCommunityAnswer}
            onDeleteAnswer={handleDeleteCommunityAnswer}
          />
        );

      case 'messenger':
        return (
          <Messenger
            searchQuery=""
            onConversationActiveChange={setIsConversationActive}
            onBack={() => setActiveScreen(lastScreen)}
            currentUser={currentStudent.studentId}
            currentUserName={currentUserName}
            courses={messengerCourses}
          />
        );

      case 'notification':
        return (
          <Notification
            mode="screen"
            onBack={() => setActiveScreen(lastScreen)}
            notifications={studentNotifications}
            onMarkAsRead={handleMarkNotificationAsRead}
            onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          />
        );

      case 'coursedetail':
        return (
          <CourseDetail
            course={selectedAssignmentCourse}
            initialTab={activeCourseTab}
            onBack={() => setActiveScreen(lastScreen)}
            assignmentComments={sharedAssignmentComments}
            assignmentFiles={sharedAssignmentFiles}
            onAddComment={handleAddAssignmentComment}
            onAddFile={handleAddAssignmentFile}
            onRemoveFile={handleRemoveAssignmentFile}
            onUpdateAssignmentStatus={handleUpdateAssignmentStatus}
            onRefreshSubmissions={loadStudentSubmissionState}
            currentStudent={currentStudent}
            onGenerateActivity={(assignment) =>
              openGeneratedActivity(selectedCourse, assignment)
            }
          />
        );

      case 'generateactivity':
        return (
          <GenerateActivity
            activity={generatedActivity}
            onBack={() => setActiveScreen(lastScreen)}
            currentStudentId={currentStudent.studentId}
            apiBaseUrl={API_BASE_URL}
            onCompleted={handleGeneratedActivityCompleted}
          />
        );

      default:
        return (
          <Text style={{ textAlign: 'center', marginTop: 50 }}>
            Screen not found: {activeScreen}
          </Text>
        );
    }
  };

  return (
    <>
      <StatusBar
        hidden={isFullscreenScreen}
        translucent={isFullscreenScreen}
        backgroundColor={isFullscreenScreen ? 'transparent' : '#fff'}
        barStyle="dark-content"
      />

      <SafeAreaView
        style={[
          styles.safeArea,
          isFullscreenScreen && styles.safeAreaFullscreen,
          isMobileFullscreenScreen && styles.safeAreaMobileFullscreen,
        ]}
        edges={safeAreaEdges}
      >
        {shouldShowHeader && (
          <View style={styles.headerLayer}>
            <Header
              isLargeScreen={isLargeScreen}
              activeScreen={activeScreen}
              onNavigate={handleNavigate}
              onSearchChange={(query) => {
                if (activeScreen === 'videos') {
                  setVideoSearchQuery(query);
                }
              }}
              notificationCount={unreadNotificationCount}
              onNotificationPress={handleNotificationPress}
              onMenuPress={() => setMobileDrawerOpen((prev) => !prev)}
            />
          </View>
        )}

        {isLargeScreen && isNotificationOpen && (
          <>
            <Pressable
              style={styles.notificationBackdrop}
              onPress={() => setIsNotificationOpen(false)}
            />
            <View style={styles.notificationPopover}>
              <Notification
                mode="popover"
                notifications={studentNotifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                onClosePopover={() => setIsNotificationOpen(false)}
                onBack={() => {
                  setIsNotificationOpen(false);
                  setLastScreen(activeScreen);
                  setActiveScreen('notification');
                }}
              />
            </View>
          </>
        )}

        <View
          style={[
            styles.contentLayer,
            isFullscreenScreen && styles.contentLayerFullscreen,
            isMobileFullscreenScreen && styles.contentLayerMobileFullscreen,
          ]}
        >
          {shouldShowDesktopDrawer && (
            <DrawerMenu
              isFixed={true}
              activeScreen={activeScreen}
              onNavigate={handleNavigate}
              userName={currentUserName}
              userEmail={currentUserEmail}
              userAvatar={currentUserAvatar}
              userId={currentStudent.studentId}
              userRole="student"
              apiBaseUrl={API_BASE_URL}
              onEmailUpdated={handleDrawerEmailUpdated}
              onAvatarPress={() => handleNavigate('profile')}
              setIsLoggedIn={() => onLogout()}
            />
          )}

          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>

        {!isFullscreenScreen &&
          !isMobileFullscreenScreen &&
          !isLargeScreen &&
          isMobileDrawerOpen && (
            <View style={styles.mobileDrawerPortal}>
              <Pressable
                style={styles.mobileBackdrop}
                onPress={() => setMobileDrawerOpen(false)}
              />
              <View
                style={[
                  styles.mobileOverlay,
                  hasImageChanged && {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                  },
                ]}
              >
                <DrawerMenu
                  isFixed={false}
                  onClose={() => setMobileDrawerOpen(false)}
                  activeScreen={activeScreen}
                  onNavigate={handleNavigate}
                  userName={currentUserName}
                  userEmail={currentUserEmail}
                  userAvatar={currentUserAvatar}
                  userId={currentStudent.studentId}
                  userRole="student"
                  apiBaseUrl={API_BASE_URL}
                  onEmailUpdated={handleDrawerEmailUpdated}
                  onAvatarPress={() => {
                    setMobileDrawerOpen(false);
                    handleNavigate('profile');
                  }}
                  setIsLoggedIn={() => onLogout()}
                />
              </View>
            </View>
          )}

        <AnnouncementModal
          visible={
            !isFullscreenScreen &&
            activeScreen === 'home' &&
            showAnnouncement &&
            studentAnnouncements.length > 0
          }
          onClose={() => setShowAnnouncement(false)}
          announcements={studentAnnouncements}
        />

        {!isFullscreenScreen &&
          activeScreen !== 'messenger' &&
          activeScreen !== 'notification' &&
          activeScreen !== 'coursedetail' &&
          activeScreen !== 'generateactivity' &&
          !(activeScreen === 'videos' && isVideoActive) && (
            <Pressable
              style={[
                styles.floatingChatBtn,
                !isLargeScreen && styles.floatingChatBtnSmall,
                {
                  bottom: hasImageChanged ? insets.bottom + 12 : 12,
                  right: hasImageChanged ? insets.right + 20 : 20,
                },
              ]}
              onPress={() => setIsChatOpen((prev) => !prev)}
            >
              {isChatOpen ? (
                <Text style={[styles.chatClose, { color: '#fff' }]}>✕</Text>
              ) : (
                <>
                  <Image
                    source={require('../assets/images/AI.png')}
                    style={styles.chatBtnImage}
                  />
                  {isLargeScreen && (
                    <Text style={styles.chatBtnLabel}>Ask anything</Text>
                  )}
                </>
              )}
            </Pressable>
          )}

        {!isFullscreenScreen && (
          <GeminiFloatingModal
            visible={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  safeAreaFullscreen: {
    backgroundColor: '#000',
  },

  safeAreaMobileFullscreen: {
    backgroundColor: '#fff',
  },

  headerLayer: {
    position: 'relative',
    zIndex: 1000,
    elevation: 1000,
  },

  contentLayer: {
    flex: 1,
    flexDirection: 'row',
    position: 'relative',
    zIndex: 1,
  },

  contentLayerFullscreen: {
    flexDirection: 'column',
  },

  contentLayerMobileFullscreen: {
    flexDirection: 'column',
  },

  notificationBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3999,
    elevation: 3999,
  },

  notificationPopover: {
    position: 'absolute',
    top: 72,
    right: 20,
    zIndex: 4000,
    elevation: 4000,
  },

  mobileDrawerPortal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5000,
    elevation: 5000,
    flexDirection: 'row',
  },

  mobileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },

  mobileOverlay: {
    width: 250,
    height: '100%',
    backgroundColor: '#FFF',
    zIndex: 5001,
    elevation: 5001,
  },

  floatingChatBtn: {
    position: 'absolute',
    bottom: 12,
    right: 20,
    zIndex: 20,
    width: 140,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#D32F2F',
    borderRadius: 28,
    paddingHorizontal: 16,
  },

  floatingChatBtnSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  chatBtnImage: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },

  chatBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },

  chatClose: {
    fontSize: 20,
  },
});