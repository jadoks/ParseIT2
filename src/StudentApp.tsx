import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Announcement } from './components/AnnouncementModal';
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
import GameBasedAssignment from './screens/games/GameBasedAssignment';
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
  profileImageStoragePath?: string | null;
  bannerImageStoragePath?: string | null;
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
  profileImageStoragePath?: string | null;
  bannerImageStoragePath?: string | null;
}

type ScreenType =
  | 'home'
  | 'classes'
  | 'game'
  | 'flipit'
  | 'fruitmania'
  | 'quizmasters'
  | 'gamebasedassignment'
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
  fetch(url, { credentials: 'include', ...options });

const refreshClassBannerUrl = async (course: any) => {
  if (!course?.bannerStoragePath || !course?.id) return course;
  try {
    const response = await apiFetch(`${API_BASE_URL}/storage/signed-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: course.bannerStoragePath, classId: course.id }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Unable to refresh class banner.');
    return { ...course, bannerUrl: data?.url || course.bannerUrl || null };
  } catch (error) {
    console.log('REFRESH CLASS BANNER ERROR =>', error);
    return course;
  }
};

type StoredAssignmentScore = {
  points?: number;
  maxPoints?: number;
  feedback?: string | null;
  gameScore?: number;
  gameTotalQuestions?: number;
  attemptNumber?: number;
};

type StoredAssignmentState = {
  files: Record<string, AssignmentFileUpload[]>;
  statuses: Record<string, AssignmentItem['status']>;
  scores: Record<string, StoredAssignmentScore>;
};

type CompletedActivityScore = {
  activityId?: string;
  assignmentId: string;
  courseId?: string | null;
  topic?: string | null;
  scorePercent: number | null;
  completed: boolean;
  mastered: boolean;
  completedAt?: string | null;
};

const getAssignmentStateKey = (studentId: string) => `student-assignment-state-${studentId}`;
const emptyStoredAssignmentState = (): StoredAssignmentState => ({ files: {}, statuses: {}, scores: {} });

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
    return { files: parsed?.files || {}, statuses: parsed?.statuses || {}, scores: parsed?.scores || {} };
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

const mapCourseCommentsToAssignmentComments = (comments?: CourseAssignmentComment[]): AssignmentComment[] =>
  (comments || []).map((comment) => ({ 
    id: comment.id, 
    author: comment.author, 
    authorId: (comment as any).authorId,   // ← add this
    content: comment.content, 
    timestamp: comment.timestamp, 
    isInstructor: comment.isInstructor 
  }));

const mapCourseFilesToAssignmentFiles = (files?: CourseAssignment['files']): AssignmentFileUpload[] =>
  (files || []).map((file) => ({ id: file.id, fileName: file.name, fileSize: (file as any).fileSize || '1.2 MB', uploadedDate: file.uploadedAt, fileUrl: file.uri || (file as any).fileUrl, fileType: (file as any).fileType, source: 'teacher' }));

const mapCourseAssignmentsToAssignmentItems = (assignments: CourseAssignment[]): AssignmentItem[] =>
  assignments.map((assignment) => ({
    id: assignment.id, title: assignment.title, dueDate: assignment.dueDate, status: assignment.status,
    points: assignment.points, maxPoints: assignment.maxPoints, topic: assignment.topic, materialIds: assignment.materialIds,
    description: (assignment as any).description || (assignment as any).instruction || '',
    fileName: (assignment as any).fileName || null, fileUrl: (assignment as any).fileUrl || (assignment as any).fileUri || null,
    fileUri: (assignment as any).fileUri || (assignment as any).fileUrl || null, fileType: (assignment as any).fileType || null,
    storagePath: (assignment as any).storagePath || null, bucketPath: (assignment as any).bucketPath || null,
    comments: mapCourseCommentsToAssignmentComments(assignment.comments), files: mapCourseFilesToAssignmentFiles(assignment.files),
    assignmentType: (assignment as any).assignmentType || 'regular', gameType: (assignment as any).gameType || null,
    numberOfAttempts: (assignment as any).numberOfAttempts || null, customAttempts: (assignment as any).customAttempts || null,
  }));

const mapCoursesToAssignmentCourses = (courses: CourseDetailData[]): AssignmentCourseWithBannerFields[] =>
  courses.map((course) => ({
    id: course.id, name: course.name, code: course.code, instructor: course.instructor, description: course.description,
    semester: course.semester, schoolYear: course.schoolYear, section: course.section,
    bannerUrl: (course as any).bannerUrl || (course as any).bannerUri || null,
    bannerStoragePath: (course as any).bannerStoragePath || null, bannerFileName: (course as any).bannerFileName || null,
    bannerMimeType: (course as any).bannerMimeType || null,
    materials: course.materials.map((material) => ({ id: material.id, title: material.title, type: material.type, uploadedDate: material.uploadedDate, content: material.content, fileName: material.fileName, fileUrl: material.fileUrl || material.fileUri, fileUri: material.fileUri || material.fileUrl, fileType: material.fileType })),
    assignments: mapCourseAssignmentsToAssignmentItems(course.assignments),
  }));

type CourseWithBannerFields = CourseDetailData & { units?: number; bannerUrl?: string | null; bannerStoragePath?: string | null; bannerFileName?: string | null; bannerMimeType?: string | null };
type AssignmentCourseWithBannerFields = AssignmentCourse & { bannerUrl?: string | null; bannerStoragePath?: string | null; bannerFileName?: string | null; bannerMimeType?: string | null };

// In StudentApp.tsx - Replace the existing fetchCombinedMaterials function
const fetchCombinedMaterials = async (classId: string) => {
  try {
    const response = await apiFetch(`${API_BASE_URL}/class-materials/${classId}`);
    const data = await response.json();
    
    if (response.ok && Array.isArray(data)) {
      // ✅ FILTER: Only keep items tagged as 'module_lesson'
      const lessonsOnly = data.filter((item: any) => item.type === 'module_lesson');
      
      return lessonsOnly.map((item: any) => ({
        id: item.id,
        title: item.title || "Untitled Lesson",
        type: 'document', // Treat lessons as documents for the viewer
        uploadedDate: item.posted || item.createdAt 
          ? new Date(item.posted || item.createdAt.seconds * 1000).toLocaleDateString() 
          : "Unknown",
        content: item.content || item.discussion || "",
        fileName: item.fileName,
        fileUrl: item.fileUrl || item.fileUri,
        fileType: item.fileType,
        storagePath: item.storagePath,
        bucketPath: item.bucketPath,
        pdfUrl: item.pdfUrl,
        pdfStoragePath: item.pdfStoragePath,
        isLesson: true,
        moduleId: item.moduleId,
        lessonNumber: item.lessonNumber
      }));
    }
  } catch (error) {
    console.error("Error fetching module lessons for class", classId, error);
  }
  return [];
};
// In StudentApp.tsx

const fetchModuleLessonsOnly = async (classId: string) => {
  try {
    const response = await apiFetch(`${API_BASE_URL}/class-materials/${classId}`);
    const data = await response.json();
    
    if (response.ok && Array.isArray(data)) {
      // ✅ FILTER: Only keep items tagged as 'module_lesson'
      const lessonsOnly = data.filter((item: any) => item.type === 'module_lesson');
      
      return lessonsOnly.map((item: any) => ({
        id: item.id,
        title: item.title || "Untitled Lesson",
        // ✅ FIX: Use 'as const' to satisfy the Material type union
        type: 'document' as const, 
        uploadedDate: item.posted || item.createdAt 
          ? new Date(item.posted || item.createdAt.seconds * 1000).toLocaleDateString() 
          : "Unknown",
        content: item.content || item.discussion || "",
        fileName: item.fileName,
        fileUrl: item.fileUrl || item.fileUri,
        fileType: item.fileType,
        storagePath: item.storagePath,
        bucketPath: item.bucketPath,
        pdfUrl: item.pdfUrl,
        pdfStoragePath: item.pdfStoragePath,
        isLesson: true,
        moduleId: item.moduleId,
        lessonNumber: item.lessonNumber
      }));
    }
  } catch (error) {
    console.error("Error fetching module lessons for class", classId, error);
  }
  return [];
};

// Update the existing mapping function
// Update the existing mapping function
const mapJoinedClassToCourseDetail = async (item: any): Promise<CourseWithBannerFields> => {
  // Fetch ONLY Module Lessons
  const moduleLessons = await fetchModuleLessonsOnly(item.id);

  return {
    id: String(item.id || ''), 
    name: item.name || 'Untitled Class', 
    code: item.courseCode || item.classCode || '',
    instructor: item.instructorName || 'Unknown Instructor', 
    description: item.description || 'No description available.',
    semester: item.semester || '', 
    schoolYear: item.schoolYear || '', 
    section: item.section || '',
    bannerUrl: item.bannerStoragePath ? null : item.bannerUrl || item.bannerUri || item.bannerLocalUri || null,
    bannerStoragePath: item.bannerStoragePath || null, 
    bannerFileName: item.bannerFileName || null, 
    bannerMimeType: item.bannerMimeType || null,
    units: typeof item.units === 'number' ? item.units : Number(item.units) || 0,
    // ✅ USE ONLY MODULE LESSONS HERE
    materials: moduleLessons,
    assignments: Array.isArray(item.assignments) ? item.assignments.map((a: any) => ({ ...a, assignmentType: a.assignmentType || 'regular', gameType: a.gameType || null })) : [],
  };
};

const mapCourseDetailToAssignmentCourse = (course: CourseDetailData): AssignmentCourseWithBannerFields => ({
  id: course.id, name: course.name, code: course.code, instructor: course.instructor, description: course.description,
  semester: course.semester, schoolYear: course.schoolYear, section: course.section,
  bannerUrl: (course as any).bannerUrl || null, bannerStoragePath: (course as any).bannerStoragePath || null,
  bannerFileName: (course as any).bannerFileName || null, bannerMimeType: (course as any).bannerMimeType || null,
  materials: (course.materials || []).map((material) => ({ id: material.id, title: material.title, type: material.type, uploadedDate: material.uploadedDate, content: material.content, fileName: material.fileName, fileUrl: material.fileUrl || material.fileUri, fileUri: material.fileUri || material.fileUrl, fileType: material.fileType })),
  assignments: (course.assignments || []).map((assignment) => ({
    id: assignment.id, title: assignment.title, dueDate: assignment.dueDate, status: assignment.status,
    points: assignment.points, maxPoints: assignment.maxPoints, topic: assignment.topic, materialIds: assignment.materialIds,
    description: (assignment as any).description || (assignment as any).instruction || '',
    fileName: (assignment as any).fileName || null, fileUrl: (assignment as any).fileUrl || (assignment as any).fileUri || null,
    fileUri: (assignment as any).fileUri || (assignment as any).fileUrl || null, fileType: (assignment as any).fileType || null,
    storagePath: (assignment as any).storagePath || null, bucketPath: (assignment as any).bucketPath || null,
    comments: mapCourseCommentsToAssignmentComments(assignment.comments), files: mapCourseFilesToAssignmentFiles(assignment.files),
    assignmentType: (assignment as any).assignmentType || 'regular', gameType: (assignment as any).gameType || null,
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
  const currentUserName = `${currentUserFirstName} ${currentUserLastName}`.trim() || 'Student';
  const currentUserEmail = remoteStudentProfile?.email || currentStudent.email || '';
  const initialAvatar = remoteStudentProfile?.profileImage || currentStudent.profileImage ? { uri: remoteStudentProfile?.profileImage || currentStudent.profileImage || '' } : null;
  const initialBanner = remoteStudentProfile?.bannerImage || currentStudent.bannerImage ? { uri: remoteStudentProfile?.bannerImage || currentStudent.bannerImage || '' } : null;

  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [lastScreen, setLastScreen] = useState<ScreenType>('home');
  const [selectedCourse, setSelectedCourse] = useState<CourseDetailData | null>(null);
  const [selectedCourseIdForAssignments, setSelectedCourseIdForAssignments] = useState<string | null>(null);
  const [generatedActivity, setGeneratedActivity] = useState<GenerateActivityData | null>(null);
  const [generatedQuizMastersData, setGeneratedQuizMastersData] = useState<any[] | null>(null);
  const [currentGameType, setCurrentGameType] = useState<string>('quiz_master');
  const [isGeneratingActivity, setIsGeneratingActivity] = useState(false);
  const [completedActivityScores, setCompletedActivityScores] = useState<Record<string, CompletedActivityScore>>({});
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [activeCourseTab, setActiveCourseTab] = useState<'materials' | 'assignments' | 'modules'>('modules');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<any>(initialAvatar);
  const [currentUserBanner, setCurrentUserBanner] = useState<any>(initialBanner);
  const [hasImageChanged, setHasImageChanged] = useState(false);
  const [joinedCourses, setJoinedCourses] = useState<CourseDetailData[]>([]);
  const [isLoadingJoinedCourses, setIsLoadingJoinedCourses] = useState(false);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(false);
  const [studentAnnouncements, setStudentAnnouncements] = useState<StudentClassAnnouncement[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [studentNotifications, setStudentNotifications] = useState<NotificationItem[]>([]);
  
  const [messengerUnreadCount, setMessengerUnreadCount] = useState(0);
  
  const [isVerificationErrorModalVisible, setVerificationErrorModalVisible] = useState(false);
  const [verificationErrorMessage, setVerificationErrorMessage] = useState('');

  const [isUploadSuccessModalVisible, setUploadSuccessModalVisible] = useState(false);

  const [isLeaveConfirmModalVisible, setLeaveConfirmModalVisible] = useState(false);
  const [courseToLeave, setCourseToLeave] = useState<any>(null);
  const [isLeavingCourse, setIsLeavingCourse] = useState(false);

  const [isLeaveSuccessModalVisible, setLeaveSuccessModalVisible] = useState(false);
  const [isLeaveErrorModalVisible, setLeaveErrorModalVisible] = useState(false);
  const [leaveErrorMessage, setLeaveErrorMessage] = useState('');

  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isFetchingGame, setIsFetchingGame] = useState(false);
  const [gameAssignmentData, setGameAssignmentData] = useState<{
    assignmentId: string; assignmentTitle: string; gameType: string; questions: any[];
    timeLimit?: string | null; customTimeLimit?: string | null; numberOfAttempts?: string;
  } | null>(null);
  const [autoOpenAssignmentId, setAutoOpenAssignmentId] = useState<string | null>(null);
  const [communityInitialPostId, setCommunityInitialPostId] = useState<string | null>(null);

  const isFullscreenScreen = activeScreen === 'flipit' || activeScreen === 'fruitmania' || activeScreen === 'quizmasters' || activeScreen === 'gamebasedassignment';
  const isMobileFullscreenScreen = isSmallScreen && (activeScreen === 'messenger' || activeScreen === 'notification' || activeScreen === 'coursedetail' || activeScreen === 'generateactivity');
  const shouldShowHeader = !isFullscreenScreen && !isMobileFullscreenScreen;
  const shouldShowDesktopDrawer = !isFullscreenScreen && !isMobileFullscreenScreen && isLargeScreen && activeScreen !== 'profile' && activeScreen !== 'notification';
  const safeAreaEdges = isFullscreenScreen ? [] : (['top', 'right', 'bottom', 'left'] as const);

  const toMillis = (value: any) => {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    if (typeof value?._seconds === 'number') return value._seconds * 1000;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  };

  const isAnnouncementActive = (value?: any) => {
    if (!value) return true;
    const expiry = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(expiry.getTime())) return true;
    return expiry.getTime() > Date.now();
  };

  const loadCurrentStudentProfile = async () => {
    if (!currentStudent?.studentId) return;
    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/user-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentStudent.studentId, role: 'student' }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load user profile.');
      const profileData = data?.data || {};
      setRemoteStudentProfile({ 
        firstName: profileData.firstName || currentStudent.firstName, 
        lastName: profileData.lastName || currentStudent.lastName, 
        email: profileData.email || currentStudent.email, 
        profileImage: profileData.profileImage || null, 
        bannerImage: profileData.bannerImage || null, 
        profileImageStoragePath: profileData.profileImageStoragePath || null, 
        bannerImageStoragePath: profileData.bannerImageStoragePath || null 
      });
      
      if (profileData.profileImage) setCurrentUserAvatar({ uri: profileData.profileImage });
      else if (currentStudent.profileImage) setCurrentUserAvatar({ uri: currentStudent.profileImage });
      
      if (profileData.bannerImage) setCurrentUserBanner({ uri: profileData.bannerImage });
      else if (currentStudent.bannerImage) setCurrentUserBanner({ uri: currentStudent.bannerImage });
    } catch (error) {
      console.log('LOAD CURRENT STUDENT PROFILE ERROR =>', error);
      if (currentStudent.profileImage) setCurrentUserAvatar({ uri: currentStudent.profileImage });
      if (currentStudent.bannerImage) setCurrentUserBanner({ uri: currentStudent.bannerImage });
    }
  };

  useEffect(() => { loadCurrentStudentProfile(); }, [currentStudent?.studentId]);

  useEffect(() => {
    if (!remoteStudentProfile?.profileImage && currentStudent.profileImage) setCurrentUserAvatar({ uri: currentStudent.profileImage });
    if (!remoteStudentProfile?.bannerImage && currentStudent.bannerImage) setCurrentUserBanner({ uri: currentStudent.bannerImage });
  }, [currentStudent.bannerImage, currentStudent.profileImage, remoteStudentProfile?.bannerImage, remoteStudentProfile?.profileImage]);

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
      } catch (error) { console.log('Navigation bar error:', error); }
    };
    setupNavigation();
  }, [isFullscreenScreen]);

  useEffect(() => { if (isMobileFullscreenScreen && isMobileDrawerOpen) setMobileDrawerOpen(false); }, [isMobileFullscreenScreen, isMobileDrawerOpen]);
  useEffect(() => { if (!isLargeScreen) setIsNotificationOpen(false); }, [isLargeScreen]);
  useEffect(() => { if (activeScreen === 'notification' || isMobileFullscreenScreen) setIsNotificationOpen(false); }, [activeScreen, isMobileFullscreenScreen]);
  useEffect(() => {
    if (activeScreen !== 'community') {
      setCommunityInitialPostId(null);
    }
  }, [activeScreen]);

  const getBase64FromUri = async (uri: string) => {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result;
          if (typeof result !== 'string') { reject(new Error('Failed to read file as base64.')); return; }
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(new Error('Failed to convert blob to base64.'));
        reader.readAsDataURL(blob);
      });
    }
    return await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  };

  const resolveCurrentUserDocId = () => currentStudent.studentId || currentStudent.authUid || currentStudent.email;

  const saveUserImagesToFirestore = async ({ profileImage, bannerImage }: { profileImage?: any; bannerImage?: any }) => {
    const userId = resolveCurrentUserDocId();
    if (!userId) throw new Error('User ID is missing.');
    const body: any = {};
    if (profileImage?.uri) { body.profileImageBase64 = await getBase64FromUri(profileImage.uri); body.profileImageMimeType = 'image/jpeg'; body.profileImageFileName = 'profile.jpg'; }
    if (bannerImage?.uri) { body.bannerImageBase64 = await getBase64FromUri(bannerImage.uri); body.bannerImageMimeType = 'image/jpeg'; body.bannerImageFileName = 'banner.jpg'; }
    const response = await apiFetch(`${API_BASE_URL}/auth/update-user-images`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to save user images.');
    return data?.data || {};
  };

  const handleChangeProfileImage = async (image: any) => {
    const previousAvatar = currentUserAvatar;
    try {
      setCurrentUserAvatar(image);
      setHasImageChanged(true);
      if (!image?.uri) return;
      const savedData = await saveUserImagesToFirestore({ profileImage: image });
      if (!savedData?.profileImage) throw new Error('Backend did not return the saved profile image URL.');
      
      setCurrentUserAvatar({ uri: savedData.profileImage });
      setRemoteStudentProfile((prev) => ({ 
        ...(prev || {}), 
        firstName: prev?.firstName || currentStudent.firstName, 
        lastName: prev?.lastName || currentStudent.lastName, 
        email: prev?.email || currentStudent.email, 
        profileImage: savedData.profileImage, 
        bannerImage: prev?.bannerImage || currentUserBanner?.uri || currentStudent.bannerImage || null 
      }));
    } catch (error: any) { 
      setCurrentUserAvatar(previousAvatar); 
      console.log('SAVE PROFILE IMAGE ERROR =>', error); 
      Alert.alert('Save Failed', error?.message || 'Unable to save profile image.'); 
    }
  };

  const handleChangeBannerImage = async (image: any) => {
    const previousBanner = currentUserBanner;
    try {
      setCurrentUserBanner(image);
      setHasImageChanged(true);
      if (!image?.uri) return;
      const savedData = await saveUserImagesToFirestore({ bannerImage: image });
      if (!savedData?.bannerImage) throw new Error('Backend did not return the saved banner image URL.');
      
      setCurrentUserBanner({ uri: savedData.bannerImage });
      setRemoteStudentProfile((prev) => ({ 
        ...(prev || {}), 
        firstName: prev?.firstName || currentStudent.firstName, 
        lastName: prev?.lastName || currentStudent.lastName, 
        email: prev?.email || currentStudent.email, 
        profileImage: prev?.profileImage || currentUserAvatar?.uri || currentStudent.profileImage || null, 
        bannerImage: savedData.bannerImage 
      }));
    } catch (error: any) { 
      setCurrentUserBanner(previousBanner); 
      console.log('SAVE BANNER IMAGE ERROR =>', error); 
      Alert.alert('Save Failed', error?.message || 'Unable to save banner image.'); 
    }
  };

  const handleDrawerEmailUpdated = (nextEmail: string) => {
    setRemoteStudentProfile((prev) => ({
      ...(prev || {}),
      firstName: prev?.firstName || currentStudent.firstName,
      lastName: prev?.lastName || currentStudent.lastName,
      email: nextEmail,
      profileImage: prev?.profileImage || currentUserAvatar?.uri || currentStudent.profileImage || null,
      bannerImage: prev?.bannerImage || currentUserBanner?.uri || currentStudent.bannerImage || null
    }));
  };

  const loadStudentAnnouncements = async (courses: CourseDetailData[]) => {
    try {
      const classIds = courses.map((item) => item.id).filter(Boolean);
      if (!classIds.length) { setStudentAnnouncements([]); return; }
      const groupedAnnouncements = await Promise.all(classIds.map(async (classId) => { 
        const response = await apiFetch(`${API_BASE_URL}/class-announcements/${classId}`); 
        const data = await response.json(); 
        if (!response.ok) throw new Error(data?.error || 'Failed to load announcements.'); 
        return Array.isArray(data) ? data : []; 
      }));
      
      const rawAnnouncements = groupedAnnouncements.flat();
      const active = rawAnnouncements.filter((item: any) => isAnnouncementActive(item?.expiresAt));
      const uniqueMap = new Map<string, any>();
      active.forEach((item: any) => { 
        const key = `${item.title}-${item.message}-${item.expiresAt}-${item.bannerKey}`; 
        if (!uniqueMap.has(key)) uniqueMap.set(key, item); 
      });
      
      const mappedAnnouncements: StudentClassAnnouncement[] = Array.from(uniqueMap.values()).map((item: any) => ({ 
        id: item.id, 
        classIds: Array.isArray(item.classIds) ? item.classIds : [], 
        title: item.title || '', 
        message: item.message || '', 
        bannerKey: typeof item.bannerKey === 'number' ? item.bannerKey : 4, 
        bannerImage: ANNOUNCEMENT_BANNERS[typeof item.bannerKey === 'number' ? item.bannerKey : 4], 
        expiresAt: item.expiresAt || null, 
        createdAt: item.createdAt || null, 
        updatedAt: item.updatedAt || null 
      })).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
      
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
    const response = await apiFetch(`${API_BASE_URL}/student-joined-classes/${currentStudent.studentId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to load joined classes.');
    
    const classesArray = Array.isArray(data) ? data : data?.data || [];
    
    // ✅ MAP ASYNC AND WAIT FOR ALL TO COMPLETE
    const mappedCourses = await Promise.all(classesArray.map(mapJoinedClassToCourseDetail));
    
    const mappedCoursesWithFreshBanners = await Promise.all(mappedCourses.map(refreshClassBannerUrl));
    
    setJoinedCourses(mappedCoursesWithFreshBanners);
    setIsLoadingAnnouncements(true);
    try {
      await loadStudentAnnouncements(mappedCoursesWithFreshBanners);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  } catch (error) { 
    console.log('LOAD JOINED CLASSES ERROR =>', error); 
    setJoinedCourses([]); 
    setStudentAnnouncements([]); 
  } finally { 
    setIsLoadingJoinedCourses(false); 
  }
};

  useEffect(() => { loadJoinedClasses(); }, [currentStudent?.studentId]);

  const handleJoinClass = async (classCode: string) => {
    const trimmedCode = String(classCode || '').trim().toUpperCase();
    if (!trimmedCode) throw new Error('Please enter a class code.');
    if (!currentStudent?.studentId) throw new Error('Student ID is missing. Please log in again.');
    const joinResponse = await apiFetch(`${API_BASE_URL}/join-class`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classCode: trimmedCode, studentId: currentStudent.studentId }) });
    const joinData = await joinResponse.json().catch(() => ({}));
    if (!joinResponse.ok) throw new Error(joinData?.error || joinData?.message || 'Failed to join class. Please check the class code.');

    await loadJoinedClasses();
    return { success: true, message: joinData?.message || 'Class joined successfully.', data: joinData?.data };
  };

  const parseTimeLimit = (limitStr?: string, customStr?: string): number | null => {
    if (!limitStr || limitStr === 'unlimited') return null;
    if (limitStr === 'custom') { const val = Number(customStr); return val > 0 ? val : null; }
    const val = Number(limitStr);
    return val > 0 ? val : null;
  };

  const hydratedCommunityPosts = useMemo<CommunityPost[]>(() => communityPosts.map((post) => {
    const isCurrentUsersPost = post.userEmail ? post.userEmail === currentUserEmail : post.userName === currentUserName;
    return {
      ...post,
      avatar: isCurrentUsersPost ? currentUserAvatar : post.avatar,
      answers: post.answers.map((answer) => ({ ...answer, avatar: answer.userName === currentUserName ? currentUserAvatar : answer.avatar }))
    };
  }), [communityPosts, currentUserAvatar, currentUserEmail, currentUserName]);

  const [sharedAssignmentComments, setSharedAssignmentComments] = useState<Record<string, AssignmentComment[]>>({});
  const [sharedAssignmentFiles, setSharedAssignmentFiles] = useState<Record<string, AssignmentFileUpload[]>>({});
  const [sharedAssignmentStatuses, setSharedAssignmentStatuses] = useState<Record<string, AssignmentItem['status']>>({});
  const [sharedAssignmentScores, setSharedAssignmentScores] = useState<Record<string, StoredAssignmentScore>>({});
  const [hasLoadedAssignmentState, setHasLoadedAssignmentState] = useState(false);

  useEffect(() => {
    if (joinedCourses.length > 0) {
      setSharedAssignmentComments(prev => {
        const next = { ...prev };
        joinedCourses.forEach(course => {
          course.assignments.forEach(assignment => {
            if (!next[assignment.id] && assignment.comments) {
              next[assignment.id] = mapCourseCommentsToAssignmentComments(assignment.comments);
            }
          });
        });
        return next;
      });
      setSharedAssignmentFiles(prev => {
        const next = { ...prev };
        joinedCourses.forEach(course => {
          course.assignments.forEach(assignment => {
            if (!next[assignment.id] && assignment.files) {
              next[assignment.id] = mapCourseFilesToAssignmentFiles(assignment.files);
            }
          });
        });
        return next;
      });
    }
  }, [joinedCourses]);

  const joinedAssignmentCourses = useMemo<AssignmentCourse[]>(() => mapCoursesToAssignmentCourses(joinedCourses).map((course) => ({ ...course, assignments: course.assignments.map((assignment) => {
    const scoreState = sharedAssignmentScores[assignment.id];
    return {
      ...assignment,
      status: sharedAssignmentStatuses[assignment.id] || assignment.status,
      points: scoreState?.points !== undefined ? scoreState.points : assignment.points,
      maxPoints: scoreState?.maxPoints !== undefined ? scoreState.maxPoints : assignment.maxPoints,
      comments: sharedAssignmentComments[assignment.id] || assignment.comments || [],
      files: sharedAssignmentFiles[assignment.id] || assignment.files || [],
      gameScore: scoreState?.gameScore !== undefined ? scoreState.gameScore : (assignment as any).gameScore,
      gameTotalQuestions: scoreState?.gameTotalQuestions !== undefined ? scoreState.gameTotalQuestions : (assignment as any).gameTotalQuestions,
      attemptNumber: scoreState?.attemptNumber !== undefined ? scoreState.attemptNumber : (assignment as any).attemptNumber
    };
  }) })), [joinedCourses, sharedAssignmentComments, sharedAssignmentFiles, sharedAssignmentScores, sharedAssignmentStatuses]);

  const selectedAssignmentCourse = useMemo(() => {
    if (!selectedCourse) return joinedAssignmentCourses[0] || null;
    return joinedAssignmentCourses.find((course) => course.id === selectedCourse.id) || joinedAssignmentCourses[0] || null;
  }, [joinedAssignmentCourses, selectedCourse?.id]);

  const applySavedAssignmentState = (state: StoredAssignmentState) => {
    setSharedAssignmentFiles((prev) => ({ ...prev, ...state.files }));
    setSharedAssignmentStatuses((prev) => ({ ...prev, ...state.statuses }));
    setSharedAssignmentScores((prev) => ({ ...prev, ...(state.scores || {}) }));
  };

  const loadStudentSubmissionState = useCallback(async () => {
    if (!currentStudent?.studentId) return;
    const localState = await readStoredAssignmentState(currentStudent.studentId);
    applySavedAssignmentState(localState);
    try {
      const response = await apiFetch(`${API_BASE_URL}/student-submissions/${encodeURIComponent(currentStudent.studentId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load student submissions.');
      const filesByAssignment: Record<string, AssignmentFileUpload[]> = {};
      const statusesByAssignment: Record<string, AssignmentItem['status']> = {};
      const scoresByAssignment: Record<string, StoredAssignmentScore> = {};
      
      normalizeSubmissionList(data).forEach((submission) => {
        const assignmentId = String(submission?.assignmentId || '');
        if (!assignmentId) return;
        const status = submission?.status === 'graded' ? 'graded' : submission?.status === 'submitted' ? 'submitted' : 'pending';
        statusesByAssignment[assignmentId] = status;
        if (status !== 'graded') { scoresByAssignment[assignmentId] = {}; }
        if (status === 'graded') {
          const numericScore = Number(submission?.score);
          const numericMaxScore = Number(submission?.maxPoints ?? submission?.totalScore ?? submission?.maxScore);
          scoresByAssignment[assignmentId] = { 
            ...(Number.isFinite(numericScore) ? { points: numericScore } : {}), 
            ...(Number.isFinite(numericMaxScore) && numericMaxScore > 0 ? { maxPoints: numericMaxScore } : {}), 
            feedback: submission?.feedback ?? null, 
            gameScore: submission?.gameScore, 
            gameTotalQuestions: submission?.gameTotalQuestions, 
            attemptNumber: submission?.attemptNumber 
          };
        }
        const mappedFile = mapSubmissionToFile(submission);
        if (mappedFile) filesByAssignment[assignmentId] = [...(filesByAssignment[assignmentId] || []), mappedFile];
      });
      applySavedAssignmentState({ files: filesByAssignment, statuses: statusesByAssignment, scores: scoresByAssignment });
    } catch (error) { 
      console.log('LOAD STUDENT SUBMISSIONS FALLBACK TO LOCAL CACHE =>', error); 
    } finally { 
      setHasLoadedAssignmentState(true); 
    }
  }, [currentStudent?.studentId]);

  useEffect(() => { setHasLoadedAssignmentState(false); void loadStudentSubmissionState(); }, [loadStudentSubmissionState]);

  useEffect(() => {
    if (!currentStudent?.studentId || !hasLoadedAssignmentState) return;
    void writeStoredAssignmentState(currentStudent.studentId, { files: sharedAssignmentFiles, statuses: sharedAssignmentStatuses, scores: sharedAssignmentScores });
  }, [currentStudent?.studentId, hasLoadedAssignmentState, sharedAssignmentFiles, sharedAssignmentScores, sharedAssignmentStatuses]);

  const currentUserPosts = useMemo(() => hydratedCommunityPosts.filter((post) => post.userName === currentUserName || post.userEmail === currentUserEmail), [hydratedCommunityPosts, currentUserEmail, currentUserName]);

const handleAddAssignmentComment = async (assignmentId: string, content: string, studentId?: string) => {
  if (!content.trim()) return;
  const tempId = `c${Date.now()}`;
  const newComment = {
    id: tempId,
    author: currentUserName,
    authorId: currentStudent.studentId,
    content,
    timestamp: new Date().toLocaleString(),
    isInstructor: false
  };
  setSharedAssignmentComments((prev) => ({
    ...prev,
    [assignmentId]: [...(prev[assignmentId] || []), newComment]
  }));
  try {
    const course = joinedAssignmentCourses.find(c => c.assignments.some(a => a.id === assignmentId));
    const classId = course?.id;
    if (!classId) throw new Error('Class not found for this assignment.');
    const response = await apiFetch(`${API_BASE_URL}/assignment-comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        assignmentId, 
        classId, 
        studentId: studentId || currentStudent.studentId, // ✅ ADD THIS
        content 
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to post comment.');
    // ✅ Replace tempId with the real Firestore comment ID
    setSharedAssignmentComments((prev) => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] || []).map((c) =>
        c.id === tempId
          ? { ...c, id: data.data.id, authorId: currentStudent.studentId }
          : c
      ),
    }));
  } catch (error: any) {
    console.error('POST COMMENT ERROR =>', error);
    setSharedAssignmentComments((prev) => ({
      ...prev,
      [assignmentId]: (prev[assignmentId] || []).filter(c => c.id !== tempId)
    }));
    Alert.alert('Comment Failed', error?.message || 'Unable to post comment.');
  }
};

  // 👇 NEW: Handle assignment comment edit
    const handleEditAssignmentComment = async (assignmentId: string, commentId: string, newContent: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update comment.');
      
      // 👇 FIX: Update local state directly to trigger instant UI re-render
      setSharedAssignmentComments((prev) => {
        const currentComments = prev[assignmentId] || [];
        const updatedComments = currentComments.map((c) =>
          c.id === commentId ? { ...c, content: newContent } : c
        );
        return { ...prev, [assignmentId]: updatedComments };
      });

      // Keep joinedCourses in sync so data doesn't revert if re-mapped
      setJoinedCourses((prev) =>
        prev.map((course) => ({
          ...course,
          assignments: course.assignments.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  comments: (a.comments || []).map((c) =>
                    c.id === commentId ? { ...c, content: newContent } : c
                  ),
                }
              : a
          ),
        }))
      );

    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update comment.');
    }
  };

  // 👇 NEW: Handle assignment comment delete
    const handleDeleteAssignmentComment = async (assignmentId: string, commentId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/assignment-comments/${commentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to delete comment.');
      
      // 👇 FIX: Remove from local state directly
      setSharedAssignmentComments((prev) => {
        const currentComments = prev[assignmentId] || [];
        const updatedComments = currentComments.filter((c) => c.id !== commentId);
        return { ...prev, [assignmentId]: updatedComments };
      });

      // Keep joinedCourses in sync
      setJoinedCourses((prev) =>
        prev.map((course) => ({
          ...course,
          assignments: course.assignments.map((a) =>
            a.id === assignmentId
              ? {
                  ...a,
                  comments: (a.comments || []).filter((c) => c.id !== commentId),
                }
              : a
          ),
        }))
      );

    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Unable to delete comment.');
    }
  };

  const handleAddAssignmentFile = (assignmentId: string, file: AssignmentFileUpload) => {
    setSharedAssignmentFiles((prev) => ({ ...prev, [assignmentId]: [...(prev[assignmentId] || []), file] }));
  };

  const handleRemoveAssignmentFile = (assignmentId: string, fileId: string) => {
    setSharedAssignmentFiles((prev) => ({ ...prev, [assignmentId]: (prev[assignmentId] || []).filter((file) => file.id !== fileId) }));
  };

  const handleUpdateAssignmentStatus = (assignmentId: string, status: AssignmentItem['status']) => {
    setSharedAssignmentStatuses((prev) => {
      const next = { ...prev, [assignmentId]: status };
      void writeStoredAssignmentState(currentStudent.studentId, { files: sharedAssignmentFiles, statuses: next, scores: sharedAssignmentScores });
      return next;
    });
    setJoinedCourses((prev) => prev.map((course) => ({ ...course, assignments: course.assignments.map((assignment) => assignment.id === assignmentId ? { ...assignment, status } : assignment) })));
  };

  // 👇 HANDLERS FOR VIDEO COMMENTS
  const handleEditVideoComment = async (videoId: string, commentId: string, newContent: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/video-comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update comment.');
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update comment.');
    }
  };

  const handleDeleteVideoComment = async (videoId: string, commentId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/video-comments/${commentId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to delete comment.');
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Unable to delete comment.');
    }
  };

  const normalizeCommunityAvatar = (avatar: any) => { if (!avatar) return null; if (typeof avatar === 'string') return avatar; if (avatar?.uri) return avatar.uri; return null; };

  const loadCommunityPosts = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/community-posts`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load community posts.');
      setCommunityPosts(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.log('LOAD COMMUNITY POSTS ERROR =>', error);
    }
  };

  const handleCreateCommunityPost = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    try {
      const response = await apiFetch(`${API_BASE_URL}/community-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmedQuery,
          authorId: currentStudent.studentId,
          authorUid: currentStudent.authUid || null,
          authorRole: 'student',
          userName: currentUserName,
          userEmail: currentUserEmail,
          avatar: normalizeCommunityAvatar(currentUserAvatar)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to create post.');
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
      const response = await apiFetch(`${API_BASE_URL}/community-posts/${postId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          authorId: currentStudent.studentId,
          authorUid: currentStudent.authUid || null,
          authorRole: 'student',
          userName: currentUserName,
          avatar: normalizeCommunityAvatar(currentUserAvatar)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to add answer.');
      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Answer Failed', error?.message || 'Unable to post answer.');
    }
  };

  const handleEditCommunityPost = async (postId: string, content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    try {
      const response = await apiFetch(`${API_BASE_URL}/community-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmedContent })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update post.');
      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update post.');
    }
  };

  const handleDeleteCommunityPost = async (postId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/community-posts/${postId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to delete post.');
      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Unable to delete post.');
    }
  };

  const handleEditCommunityAnswer = async (postId: string, answerId: string, message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    try {
      const response = await apiFetch(`${API_BASE_URL}/community-posts/${postId}/answers/${answerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to update answer.');
      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update answer.');
    }
  };

  const handleDeleteCommunityAnswer = async (postId: string, answerId: string) => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/community-posts/${postId}/answers/${answerId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to delete answer.');
      await loadCommunityPosts();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Unable to delete answer.');
    }
  };

  useEffect(() => { loadCommunityPosts(); }, []);

  const getScorePercent = (assignment: { status: 'pending' | 'submitted' | 'graded'; points?: number; maxPoints?: number }) => {
    if (assignment.status !== 'graded' || assignment.points === undefined || assignment.maxPoints === undefined || assignment.maxPoints === 0) return null;
    return Math.round((assignment.points / assignment.maxPoints) * 100);
  };

  const buildGeneratedActivity = (course: CourseDetailData, assignment: DashboardAssignment | CourseAssignment | AssignmentItem): GenerateActivityData | null => {
    const score = getScorePercent(assignment);
    if (score === null) return null;
    const recommendationType: GenerateActivityData['recommendationType'] = score < 60 ? 'review' : score < 75 ? 'practice' : 'advanced';
    const difficulty: GenerateActivityData['difficulty'] = recommendationType === 'review' ? 'easy' : recommendationType === 'practice' ? 'medium' : 'hard';
    const instructions = recommendationType === 'review' ? 'Review the concept explanation, answer the quick check, and complete the short response to strengthen your foundation.' : recommendationType === 'practice' ? 'Complete this guided practice to improve your understanding and become more confident with the topic.' : 'Take on this advanced follow-up activity to deepen your mastery of the topic.';
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
      basedOnMaterials: course.materials.filter((material) => assignment.materialIds?.includes(material.id)).map((material) => material.title)
    };
  };

  const loadCompletedActivityScores = useCallback(async () => {
    if (!currentStudent?.studentId) { setCompletedActivityScores({}); return; }
    try {
      const response = await apiFetch(`${API_BASE_URL}/student-activities/completed-scores/${encodeURIComponent(currentStudent.studentId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load completed support activities.');
      setCompletedActivityScores(data?.data?.scores || {});
    } catch (error) {
      console.log('LOAD COMPLETED ACTIVITY SCORES ERROR =>', error);
    }
  }, [currentStudent?.studentId]);

  useEffect(() => { void loadCompletedActivityScores(); }, [loadCompletedActivityScores]);

  const loadStudentNotifications = useCallback(async () => {
    if (!currentStudent?.studentId) { setStudentNotifications([]); return; }
    try {
      const response = await apiFetch(`${API_BASE_URL}/notifications?userId=${encodeURIComponent(currentStudent.studentId)}&role=student`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load notifications.');
      setStudentNotifications(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.log('LOAD STUDENT NOTIFICATIONS ERROR =>', error);
    }
  }, [currentStudent?.studentId]);

  useEffect(() => { void loadStudentNotifications(); }, [loadStudentNotifications]);

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    const response = await apiFetch(`${API_BASE_URL}/notifications/${notificationId}/read`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' } });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to mark notification as read.');
    setStudentNotifications((prev) => prev.map((item) => item.id === notificationId ? { ...item, read: true } : item));
  };

  const handleMarkAllNotificationsAsRead = async () => {
    const response = await apiFetch(`${API_BASE_URL}/notifications/read-all`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: currentStudent.studentId, role: 'student' }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Failed to mark all notifications as read.');
    setStudentNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const handleGeneratedActivityCompleted = async (activity: GenerateActivityData) => {
    await Promise.all([loadStudentNotifications(), loadCompletedActivityScores()]);
    Alert.alert('Activity Completed', `${activity.assignmentTitle} has been marked as done.`);
  };

  const visibleStudentNotifications = useMemo(() => {
    return studentNotifications.filter((notif) => {
      if (notif.type === 'support-activity' && notif.targetId) {
        const activityScore = completedActivityScores[notif.targetId];
        if (activityScore?.completed) {
          return false;
        }
      }
      return true;
    });
  }, [studentNotifications, completedActivityScores]);

  const unreadNotificationCount = useMemo(() => visibleStudentNotifications.filter((item) => !item.read).length, [visibleStudentNotifications]);

  const loadMessengerUnreadCount = useCallback(async () => {
    if (!currentStudent?.studentId) return;
    try {
      const response = await apiFetch(
        `${API_BASE_URL}/messenger-unread-count?userId=${encodeURIComponent(currentStudent.studentId)}&userUid=${encodeURIComponent(currentStudent.authUid || '')}&role=student`
      );
      const data = await response.json();
      if (response.ok && data.success) {
        setMessengerUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.log('LOAD MESSENGER UNREAD COUNT ERROR =>', error);
    }
  }, [currentStudent?.studentId]);

  useEffect(() => {
    loadMessengerUnreadCount();
    const interval = setInterval(loadMessengerUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [loadMessengerUnreadCount]);

  const cleanVideoSearchText = (value = '') => String(value || '').replace(/_/g, ' ').replace(/[^a-zA-Z0-9\s+#.()-]/g, ' ').replace(/\s+/g, ' ').trim();
  const getRotatingIndex = (length: number, salt = 0) => { if (length <= 0) return 0; const today = new Date(); const daySeed = Math.floor(new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() / 86400000); return Math.abs(daySeed + salt) % length; };

  const adaptiveVideoRecommendation = useMemo(() => {
    const weakRecommendations = joinedAssignmentCourses.flatMap((course) => course.assignments.map((assignment) => {
      const score = getScorePercent(assignment);
      if (score === null || score >= 75) return null;
      const completedSupportActivity = completedActivityScores[assignment.id];
      if (
        completedSupportActivity?.completed &&
        completedSupportActivity.scorePercent !== null &&
        completedSupportActivity.scorePercent >= 75
      ) {
          return null;
      }
      const relatedMaterialTitles = (course.materials || []).filter((material) => assignment.materialIds?.includes(material.id)).map((material) => cleanVideoSearchText(material.title)).filter(Boolean);
      const primaryMaterial = relatedMaterialTitles[getRotatingIndex(relatedMaterialTitles.length, assignment.id.length)] || cleanVideoSearchText(assignment.topic || '') || cleanVideoSearchText(course.name);
      if (!primaryMaterial) return null;
      return {
        type: 'weak' as const,
        primaryTopic: primaryMaterial,
        score,
        query: `${primaryMaterial}`.trim(),
        reason: relatedMaterialTitles.length > 0 ? `Related material (${primaryMaterial})` : `Weak topic (${primaryMaterial})` 
      };
    }).filter(Boolean)).sort((a: any, b: any) => (a.score ?? 100) - (b.score ?? 100)) as Array<{ type: 'weak'; primaryTopic: string; score: number; query: string; reason: string }>;

    const courseRecommendations = joinedAssignmentCourses.map((course, courseIndex) => { 
      const materialTitles = (course.materials || []).map((material) => cleanVideoSearchText(material.title)).filter(Boolean); 
      const rotatingMaterial = materialTitles[getRotatingIndex(materialTitles.length, courseIndex)] || cleanVideoSearchText(course.name); 
      if (!rotatingMaterial) return null; 
      return { 
        type: 'course' as const, 
        primaryTopic: rotatingMaterial, 
        query: `${rotatingMaterial} tutorial lesson explanation`.trim(), 
        reason: `Course topic (${course.name})` 
      }; 
    }).filter(Boolean) as Array<{ type: 'course'; primaryTopic: string; query: string; reason: string }>;

    if (weakRecommendations.length > 0) { 
      const selectedWeak = weakRecommendations[0]; 
      return { query: selectedWeak.query, reason: `${selectedWeak.reason}`, rotationKey: selectedWeak.query.length + selectedWeak.score }; 
    }
    if (courseRecommendations.length > 0) { 
      const selectedCourse = courseRecommendations[getRotatingIndex(courseRecommendations.length, 5)]; 
      return { query: selectedCourse.query, reason: selectedCourse.reason, rotationKey: getRotatingIndex(1000, 5) }; 
    }
    return { query: 'educational video lesson explanation', reason: 'Recommended educational videos', rotationKey: getRotatingIndex(1000, 9) };
  }, [joinedAssignmentCourses, sharedAssignmentScores, sharedAssignmentStatuses]);

  const dashboardCourses = joinedAssignmentCourses;
  const classesScreenCourses = joinedAssignmentCourses;
  const messengerCourses = useMemo(() => joinedCourses.map((course) => ({ id: course.id, name: course.name, instructor: course.instructor, semester: course.semester, schoolYear: course.schoolYear, section: course.section })), [joinedCourses]);

  const handleNavigate = (screen: ScreenType) => {
    if (activeScreen !== screen) setLastScreen(activeScreen);
    if (screen === 'assignments') setSelectedCourseIdForAssignments(null);
    if (screen !== 'generateactivity') setGeneratedActivity(null);
    setIsNotificationOpen(false);
    setIsChatOpen(false);
    setMobileDrawerOpen(false);
    setActiveScreen(screen);
    const searchableScreens: ScreenType[] = ['home', 'classes', 'game', 'videos', 'messenger', 'flipit', 'fruitmania', 'quizmasters', 'profile', 'analytics', 'myjourney'];
    if (!searchableScreens.includes(screen)) {
      setGlobalSearchQuery('');
    }
  };

  const exitFullscreenGameToGames = () => {
    setLastScreen('game');
    setIsNotificationOpen(false);
    setIsChatOpen(false);
    setIsConversationActive(false);
    setIsVideoActive(false);
    setMobileDrawerOpen(false);
    setActiveScreen('game');
    setGlobalSearchQuery('');
  };

  const handleNotificationPress = () => {
    if (isLargeScreen) setIsNotificationOpen((prev) => !prev);
    else {
      setLastScreen(activeScreen);
      setActiveScreen('notification');
    }
  };

  const handleNotificationItemClick = (notification: NotificationItem) => {
    setIsNotificationOpen(false);
    let previousScreen = activeScreen;
    if (activeScreen === 'notification') {
      previousScreen = lastScreen;
    }
    const targetId = notification.targetId;
    const courseId = notification.courseId;
    setAutoOpenAssignmentId(null);

    switch (notification.type) {
      case 'assignment':
      case 'game-assignment': {
        const course = joinedAssignmentCourses.find(c => c.id === courseId);
        if (course) {
          setSelectedCourse(course as unknown as CourseDetailData);
          setSelectedCourseIdForAssignments(course.id);
          setLastScreen(previousScreen);
          setActiveScreen('coursedetail');
          setActiveCourseTab('assignments');
          if (targetId) setAutoOpenAssignmentId(targetId);
        }
        break;
      }
      case 'material': {
        const course = joinedAssignmentCourses.find(c => c.id === courseId);
        if (course) {
          setSelectedCourse(course as unknown as CourseDetailData);
          setLastScreen(previousScreen);
          setActiveScreen('coursedetail');
          setActiveCourseTab('materials');
        }
        break;
      }
      case 'community-answer': {
        setLastScreen(previousScreen);
        setActiveScreen('community');
        setCommunityInitialPostId(targetId || null);
        break;
      }
      case 'support-activity': {
        if (targetId && completedActivityScores[targetId]?.completed) {
          Alert.alert('Already Completed', 'You have already completed this support activity.', [{ text: 'OK' }]);
          return;
        }
        const course = joinedAssignmentCourses.find(c => c.id === courseId);
        const assignment = course?.assignments.find(a => a.id === targetId);
        if (course && assignment) {
          setLastScreen(previousScreen);
          openGeneratedActivity(course as unknown as CourseDetailData, assignment);
        }
        break;
      }
      default:
        break;
    }
  };

  const normalizeCourseForActivity = (course: any): CourseWithBannerFields => ({
    id: String(course?.id || ''),
    name: course?.name || 'Untitled Class',
    code: course?.code || course?.courseCode || course?.classCode || '',
    instructor: course?.instructor || course?.instructorName || 'Unknown Instructor',
    description: course?.description || '',
    semester: course?.semester || '',
    schoolYear: course?.schoolYear || '',
    section: course?.section || '',
    bannerUrl: course?.bannerUrl || null,
    bannerStoragePath: course?.bannerStoragePath || null,
    bannerFileName: course?.bannerFileName || null,
    bannerMimeType: course?.bannerMimeType || null,
    materials: Array.isArray(course?.materials) ? course.materials : [],
    assignments: Array.isArray(course?.assignments) ? course.assignments : []
  });

  const findFreshCourseForActivity = (course: any): CourseDetailData => {
    const courseId = String(course?.id || '');
    const fromJoined = joinedCourses.find((item) => item.id === courseId);
    if (fromJoined) return normalizeCourseForActivity(fromJoined);
    const fromAssignmentCourses = joinedAssignmentCourses.find((item) => item.id === courseId);
    if (fromAssignmentCourses) return normalizeCourseForActivity(fromAssignmentCourses);
    const fromSelected = selectedAssignmentCourse?.id === courseId ? selectedAssignmentCourse : null;
    if (fromSelected) return normalizeCourseForActivity(fromSelected);
    return normalizeCourseForActivity(course);
  };

  const buildLocalMaterialFallbackActivity = ({ course, assignment, score, relatedMaterials }: { course: CourseDetailData; assignment: DashboardAssignment | CourseAssignment | AssignmentItem; score: number; relatedMaterials: CourseDetailData['materials'] }): GenerateActivityData => {
    const recommendationType: GenerateActivityData['recommendationType'] = score < 60 ? 'review' : 'practice';
    const difficulty: GenerateActivityData['difficulty'] = recommendationType === 'review' ? 'easy' : 'medium';
    const materialTitles = relatedMaterials.map((material) => material.title).filter(Boolean);
    const topic = materialTitles.length ? materialTitles.join(', ') : assignment.topic || assignment.title;
    return {
      courseId: course.id,
      courseName: course.name,
      courseCode: course.code,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      topic,
      score,
      recommendationType,
      difficulty,
      instructions: recommendationType === 'review' ? 'Review the related lesson material carefully, answer the quick check, and explain the concept in your own words.' : 'Complete this guided practice based on the related lesson material to improve your understanding.',
      basedOnMaterials: materialTitles,
      quiz: null
    };
  };

    const openGeneratedActivity = async (course: CourseDetailData, assignment: DashboardAssignment | CourseAssignment | AssignmentItem) => {
  if (isGeneratingActivity) return;
  
  const normalizedCourse = findFreshCourseForActivity(course);
  const score = getScorePercent(assignment);
  
  // Validation checks
  if (score === null) { 
    Alert.alert('Not available', 'Generate Activity is only available after the assignment has been graded.'); 
    return; 
  }
  if (score >= 75) { 
    Alert.alert('Not available', 'Generate Activity is only available for graded assignments below 75%.'); 
    return; 
  }
  const completedSupportActivity = completedActivityScores[assignment.id];
  if (completedSupportActivity?.completed && completedSupportActivity.scorePercent !== null && completedSupportActivity.scorePercent >= 75) { 
    Alert.alert('Already mastered', `You already scored ${completedSupportActivity.scorePercent}% on the generated follow-up activity for this assignment.`); 
    return; 
  }
   
  // ✅ UPDATED LOGIC: Support both Material IDs and Module Lessons
  let materialIds = Array.isArray(assignment.materialIds) ? assignment.materialIds.filter(Boolean) : [];
  
  // If no specific material IDs are linked, try to use ALL available Module Lessons as context
  let relatedMaterials = (normalizedCourse.materials || []).filter((material) => materialIds.includes(material.id));
  
  if (!relatedMaterials.length) {
    // Fallback: Use all module lessons if none are specifically linked
    relatedMaterials = normalizedCourse.materials || [];
    
    // If still empty, use assignment title/topic as a last resort
    if (!relatedMaterials.length) {
      Alert.alert('No Content Found', 'There are no module lessons or related materials available for this assignment. Please ask your instructor to add learning content first.');
      return;
    }
    
    // Clear materialIds so backend knows we're sending generic lesson content
    materialIds = relatedMaterials.map(m => m.id);
  }

  try {
    setIsGeneratingActivity(true); 
    setSelectedCourse(normalizedCourse); 
    setSelectedCourseIdForAssignments(normalizedCourse.id);
    setLastScreen(activeScreen === 'notification' ? lastScreen : activeScreen);
    setIsNotificationOpen(false);
    
    const response = await apiFetch(`${API_BASE_URL}/student-activities/generate`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        studentId: currentStudent.studentId, 
        courseId: normalizedCourse.id, 
        classId: normalizedCourse.id, 
        courseName: normalizedCourse.name, 
        courseCode: normalizedCourse.code, 
        assignmentId: assignment.id, 
        assignmentTitle: assignment.title, 
        topic: relatedMaterials.map((material) => material.title).join(', ') || assignment.topic || assignment.title, 
        score, 
        materialIds, // ✅ Send the collected IDs (either from assignment or fallback)
        relatedMaterials: relatedMaterials.map((material) => ({ 
          id: material.id, 
          title: material.title, 
          type: material.type, 
          content: material.content || null, 
          fileName: material.fileName || null, 
          fileUrl: material.fileUrl || material.fileUri || null, 
          fileUri: material.fileUri || material.fileUrl || null, 
          fileType: material.fileType || null 
        })) 
      }) 
    });
    
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || data?.message || 'Failed to generate follow-up activity.');
    
    const activity = data?.data as GenerateActivityData | undefined;
    if (!activity || !activity.assignmentId) throw new Error('The server did not return a valid generated activity.');
    
    await loadStudentNotifications(); 
    setGeneratedActivity(activity); 
    setActiveScreen('generateactivity');
  } catch (error: any) { 
    console.log('GENERATE ACTIVITY ERROR =>', error); 
    Alert.alert('Generate Activity Failed', error?.message || 'The AI material scan failed. Please try again after confirming the related material file is readable.'); 
  } finally { 
    setIsGeneratingActivity(false); 
  }
};

  const handlePlayGame = async (assignment: any) => {
    if (isFetchingGame) return;
    setIsFetchingGame(true);
    try {
      const response = await apiFetch(`${API_BASE_URL}/game-ai/get-game-questions/${assignment.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load game.');
      const questions = (data.questions || []).map((q: any, idx: number) => ({ 
        id: q.id || `q-${idx}`, 
        question: q.question, 
        options: q.options, 
        answer: q.answer, 
        correctIndex: q.options ? q.options.indexOf(q.answer) : 0 
      }));
      
      setGameAssignmentData({ 
        assignmentId: assignment.id, 
        assignmentTitle: assignment.title || assignment.header || 'Game Assignment', 
        gameType: data.gameType || assignment.gameType || 'quiz_master', 
        questions, 
        timeLimit: data.timeLimit || assignment.timeLimit || null, 
        customTimeLimit: data.customTimeLimit || assignment.customTimeLimit || null, 
        numberOfAttempts: data.numberOfAttempts || assignment.numberOfAttempts || '1' 
      });
      setLastScreen(activeScreen); 
      setActiveScreen('gamebasedassignment');
    } catch (error: any) { 
      Alert.alert('Game Error', error?.message || 'Unable to start the game.'); 
    } finally { 
      setIsFetchingGame(false); 
    }
  };

  const handleVerificationFailed = (errorMessage: string) => {
    setVerificationErrorMessage(errorMessage);
    setVerificationErrorModalVisible(true);
  };

  const handleUploadSuccess = () => {
    setUploadSuccessModalVisible(true);
  };

  const handleLeaveCourse = useCallback((course: any) => {
    setCourseToLeave(course);
    setLeaveConfirmModalVisible(true);
  }, []);

  const confirmLeaveCourse = useCallback(async () => {
    if (!courseToLeave || isLeavingCourse) return;
    
    setIsLeavingCourse(true);

    try {
      const findResponse = await apiFetch(`${API_BASE_URL}/class-members/find`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: courseToLeave.id,
          studentId: currentStudent.studentId,
          userUid: currentStudent.authUid || null,
        }),
      });

      const findData = await findResponse.json();
      if (!findResponse.ok) {
        throw new Error(findData?.error || 'Membership not found.');
      }

      const memberId = findData.memberId;
      if (!memberId) {
        throw new Error('Could not find your membership record.');
      }

      const deleteResponse = await apiFetch(`${API_BASE_URL}/class-members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId: courseToLeave.id }),
      });

      const deleteData = await deleteResponse.json();
      if (!deleteResponse.ok) {
        throw new Error(deleteData?.error || 'Unable to leave the course.');
      }

      await Promise.all([
        loadJoinedClasses(),
        loadStudentSubmissionState(),
        loadCommunityPosts(),
        loadStudentNotifications(),
        loadMessengerUnreadCount(),
      ]);

      if (
        selectedCourse?.id === courseToLeave.id ||
        activeScreen === 'coursedetail' ||
        activeScreen === 'messenger' ||
        activeScreen === 'assignments'
      ) {
        setActiveScreen('classes');
        setSelectedCourse(null);
        setSelectedCourseIdForAssignments(null);
      }

      setLeaveSuccessModalVisible(true);
    } catch (error: any) {
      setLeaveErrorMessage(
        error?.message || 'Unable to leave the course.\nPlease try again later.'
      );
      setLeaveErrorModalVisible(true);
    } finally {
      setIsLeavingCourse(false);
      setCourseToLeave(null);
      setLeaveConfirmModalVisible(false);
    }
  }, [
    courseToLeave,
    isLeavingCourse, 
    currentStudent,
    selectedCourse,
    activeScreen,
    loadJoinedClasses,
    loadStudentSubmissionState,
    loadCommunityPosts,
    loadStudentNotifications,
    loadMessengerUnreadCount,
  ]);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'profile':
        return <Profile
          searchQuery={globalSearchQuery}
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
        />;
      case 'home': 
        return <Dashboard 
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
          onOpenGeneratedActivity={(course, assignment) => openGeneratedActivity(course as unknown as CourseDetailData, assignment)} 
          onJoinClass={handleJoinClass} 
          isGeneratingActivity={isGeneratingActivity} 
          completedActivityScores={completedActivityScores} 
          isLoading={isLoadingJoinedCourses || isLoadingAnnouncements} 
        />;
        
      case 'classes': 
        return <ClassesScreen 
          courses={classesScreenCourses} 
          searchQuery={globalSearchQuery} 
          onLeaveCourse={handleLeaveCourse}
          completedActivityScores={completedActivityScores} 
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
        />;
        
      case 'game': 
        return <Game 
          enrolledCourses={joinedCourses.map(course => ({ id: course.id, name: course.name, materials: course.materials.map(m => ({ id: m.id, title: m.title, type: m.type })) }))} 
          studentId={currentStudent.studentId} 
          onNavigate={(screen, generatedQuiz, gameType) => { // 🌟 Added gameType parameter
            if (screen === 'quizmasters') {
              setGeneratedQuizMastersData(generatedQuiz || null);
              setCurrentGameType(gameType || 'quiz_master'); // 🌟 Capture the selected game type
              setLastScreen('game');
              setActiveScreen('quizmasters');
            }
          }}
          onSaveQuizScore={async ({ classId, materialIds, score, totalQuestions, answers }) => { 
            try { 
              const response = await apiFetch(`${API_BASE_URL}/game-ai/save-quiz-score`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ classId, materialIds, score, totalQuestions, answers }) 
              }); 
              if (!response.ok) throw new Error('Failed to save score'); 
              await loadCompletedActivityScores(); 
            } catch (err) { 
              console.error('Save quiz score error', err); 
              Alert.alert('Error', 'Could not save your quiz score.'); 
            } 
          }} 
        />;
        
      case 'flipit': 
        return <FlipIt onBack={exitFullscreenGameToGames} />;
        
      case 'fruitmania': 
        return <FruitMania onBack={exitFullscreenGameToGames} />;
        
       case 'quizmasters': 
        return <QuizMasters 
          onBack={exitFullscreenGameToGames} 
          generatedQuestions={generatedQuizMastersData} 
          gameType={currentGameType} // 🌟 Pass the captured gameType down to QuizMasters
        />;
        
      case 'gamebasedassignment': 
        return <GameBasedAssignment 
          assignmentTitle={gameAssignmentData?.assignmentTitle || 'Game'} 
          questions={gameAssignmentData?.questions || []} 
          gameType={gameAssignmentData?.gameType || 'quiz_master'} 
          timeLimitMinutes={gameAssignmentData?.timeLimit === 'unlimited' ? null : gameAssignmentData?.timeLimit === 'custom' ? Number(gameAssignmentData?.customTimeLimit) || null : Number(gameAssignmentData?.timeLimit) || null} 
          onBack={() => setActiveScreen(lastScreen)} 
          onComplete={async (score, totalQuestions) => { 
            try { 
              const response = await apiFetch(`${API_BASE_URL}/game-ai/submit-game-assignment`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ 
                  assignmentId: gameAssignmentData?.assignmentId, 
                  score, 
                  totalQuestions, 
                  studentName: `${currentStudent.firstName || ''} ${currentStudent.lastName || ''}`.trim() 
                }) 
              }); 
              if (response.ok) { 
                const data = await response.json(); 
                const attemptMsg = data.attemptNumber > 1 ? ` (Attempt ${data.attemptNumber} - Best score kept!)` : ''; 
                Alert.alert('Game Completed', `You scored ${score} out of ${totalQuestions}! Your assignment has been automatically graded.${attemptMsg}`); 
              } else { 
                Alert.alert('Game Completed', `You scored ${score} out of ${totalQuestions}!`); 
                const data = await response.json(); 
                console.warn('Game submission warning:', data?.error); 
              } 
            } catch (e: any) { 
              Alert.alert('Game Completed', `You scored ${score} out of ${totalQuestions}!`); 
              console.error('Game submission error:', e); 
            } 
            await loadStudentSubmissionState(); 
            setActiveScreen(lastScreen); 
          }} 
        />;
        
      case 'videos': 
        return <Videos 
          onVideoActiveChange={setIsVideoActive} 
          currentUserName={currentUserName} 
          currentUserAvatar={currentUserAvatar} 
          currentUserId={currentStudent.studentId} 
          currentUserRole="student" 
          apiBaseUrl={API_BASE_URL} 
          searchQuery={globalSearchQuery} 
          adaptiveQuery={adaptiveVideoRecommendation.query} 
          adaptiveReason={adaptiveVideoRecommendation.reason} 
          queryRotationKey={adaptiveVideoRecommendation.rotationKey}
        />;
        
      case 'myjourney': 
        return <MyJourney 
          searchQuery={globalSearchQuery} 
          courses={joinedCourses} 
          currentStudent={currentStudent} 
          studentName={currentUserName} 
          apiBaseUrl={API_BASE_URL} 
        />;
        
      case 'analytics': 
        return <Analytics 
          searchQuery={globalSearchQuery} 
          courses={joinedAssignmentCourses} 
          studentName={currentUserName} 
          completedActivityScores={completedActivityScores} 
        />;
        
      case 'assignments': 
        return <Assignments 
          searchQuery={globalSearchQuery} 
          courses={joinedAssignmentCourses} 
          selectedCourseId={selectedCourseIdForAssignments} 
          assignmentComments={sharedAssignmentComments} 
          assignmentFiles={sharedAssignmentFiles} 
          onAddComment={handleAddAssignmentComment}
          onEditComment={handleEditAssignmentComment}
          onDeleteComment={handleDeleteAssignmentComment}
          onAddFile={handleAddAssignmentFile} 
          onRemoveFile={handleRemoveAssignmentFile} 
          onUpdateAssignmentStatus={handleUpdateAssignmentStatus} 
          onRefreshSubmissions={loadStudentSubmissionState} 
          currentStudent={currentStudent} 
          isGeneratingActivity={isGeneratingActivity} 
          completedActivityScores={completedActivityScores} 
          onOpenGeneratedActivity={(course, assignment) => openGeneratedActivity(course as unknown as CourseDetailData, assignment)} 
          onPlayGame={handlePlayGame} 
        />;
        
      case 'community': 
        return <Community 
          searchQuery={globalSearchQuery} 
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
          initialPostId={communityInitialPostId} 
        />;
        
      case 'messenger': 
        return <Messenger 
          searchQuery={globalSearchQuery} 
          onConversationActiveChange={setIsConversationActive} 
          onBack={() => setActiveScreen(lastScreen)} 
          currentUser={currentStudent.studentId} 
          currentUserName={currentUserName} 
          courses={messengerCourses} 
          onUnreadCountChanged={loadMessengerUnreadCount}
        />;
        
      case 'notification': 
        return <Notification 
          mode="screen" 
          onBack={() => setActiveScreen(lastScreen)} 
          notifications={visibleStudentNotifications} 
          onMarkAsRead={handleMarkNotificationAsRead} 
          onMarkAllAsRead={handleMarkAllNotificationsAsRead} 
          onNotificationPress={handleNotificationItemClick} 
        />;
        
      case 'coursedetail': 
        if (!selectedAssignmentCourse) return <Text style={{ textAlign: 'center', marginTop: 50 }}>No course selected.</Text>;
        return <CourseDetail 
          course={selectedAssignmentCourse} 
          initialTab={'modules'} 
          autoOpenAssignmentId={autoOpenAssignmentId}
          onConsumedAutoOpenAssignment={() => setAutoOpenAssignmentId(null)}
          onBack={() => setActiveScreen(lastScreen)} 
          assignmentComments={sharedAssignmentComments} 
          assignmentFiles={sharedAssignmentFiles} 
          onAddComment={handleAddAssignmentComment}
          onEditComment={handleEditAssignmentComment}
          onDeleteComment={handleDeleteAssignmentComment} 
          onAddFile={handleAddAssignmentFile} 
          onRemoveFile={handleRemoveAssignmentFile} 
          onUpdateAssignmentStatus={handleUpdateAssignmentStatus} 
          onRefreshSubmissions={loadStudentSubmissionState} 
          currentStudent={currentStudent} 
          isGeneratingActivity={isGeneratingActivity} 
          completedActivityScores={completedActivityScores} 
          onGenerateActivity={(assignment) => openGeneratedActivity(selectedAssignmentCourse as unknown as CourseDetailData, assignment)} 
          onPlayGame={handlePlayGame} 
        />;
        
      case 'generateactivity': 
        return <GenerateActivity 
          activity={generatedActivity} 
          onBack={() => setActiveScreen(lastScreen)} 
          currentStudentId={currentStudent.studentId} 
          apiBaseUrl={API_BASE_URL} 
          onCompleted={handleGeneratedActivityCompleted} 
        />;
        
      default: 
        return <Text style={{ textAlign: 'center', marginTop: 50 }}>Screen not found: {activeScreen}</Text>;
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
              onSearchChange={(query) => setGlobalSearchQuery(query)}
              notificationCount={unreadNotificationCount}
              messengerUnreadCount={messengerUnreadCount}
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
                notifications={visibleStudentNotifications}
                onMarkAsRead={handleMarkNotificationAsRead}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                onClosePopover={() => setIsNotificationOpen(false)}
                onBack={() => {
                  setIsNotificationOpen(false);
                  setLastScreen(activeScreen);
                  setActiveScreen('notification');
                }}
                onNotificationPress={handleNotificationItemClick}
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
              onFilePickerOpen={() => setHasImageChanged(true)}
              onVerificationFailed={handleVerificationFailed}
              onUploadSuccess={handleUploadSuccess}
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
                  onFilePickerOpen={() => setHasImageChanged(true)}
                  onVerificationFailed={handleVerificationFailed}
                  onUploadSuccess={handleUploadSuccess}
                />
              </View>
            </View>
        )}

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
                  bottom: insets.bottom + 12,
                  right: insets.right + 20,
                },
              ]}
              onPress={() => setIsChatOpen((prev) => !prev)}
            >
              {isChatOpen ? (
                isLargeScreen ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Image
                      source={require('../assets/images/AI.png')}
                      style={[styles.chatBtnImage, { marginRight: 8 }]}
                    />
                    <Text style={[styles.chatClose, { color: '#fff' }]}>
                      Asking...
                    </Text>
                  </View>
                ) : (
                  <MaterialCommunityIcons
                    name="progress-clock"
                    size={24}
                    color="#fff"
                  />
                )
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
            currentStudentId={currentStudent.studentId}
          />
        )}

        {isGeneratingActivity && (
          <View style={styles.generatingOverlay} pointerEvents="auto">
            <View style={styles.generatingCard}>
              <ActivityIndicator size="large" color="#D32F2F" />
              <Text style={styles.generatingTitle}>Generating activity...</Text>
              <Text style={styles.generatingText}>
                AI is reading the related material file and creating 10 mixed
                quiz/activity questions.
              </Text>
            </View>
          </View>
        )}

        <Modal 
          animationType="fade" 
          transparent 
          visible={isVerificationErrorModalVisible} 
          onRequestClose={() => setVerificationErrorModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.logoutModalContainer}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#D32F2F" />
              </View>
              <Text style={[styles.logoutModalTitle, { color: '#D32F2F' }]}>Identity Verification Failed</Text>
              <Text style={[styles.logoutModalSubtitle, { textAlign: 'left', marginTop: 10 }]}>
                {verificationErrorMessage}
              </Text>
              <View style={styles.logoutButtonsRow}>
                <Pressable 
                  style={[styles.logoutConfirmBtn, { backgroundColor: '#555' }]} 
                  onPress={() => setVerificationErrorModalVisible(false)}
                >
                  <Text style={styles.logoutConfirmText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal 
          animationType="fade" 
          transparent 
          visible={isUploadSuccessModalVisible} 
          onRequestClose={() => setUploadSuccessModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.logoutModalContainer}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <MaterialCommunityIcons name="check-circle-outline" size={48} color="#2E7D32" />
              </View>
              <Text style={[styles.logoutModalTitle, { color: '#2E7D32' }]}>Upload Successful</Text>
              <Text style={[styles.logoutModalSubtitle, { textAlign: 'center', marginTop: 10 }]}>
                Your grade file has been uploaded successfully and is now being processed.
              </Text>
              <View style={styles.logoutButtonsRow}>
                <Pressable 
                  style={[styles.logoutConfirmBtn, { backgroundColor: '#2E7D32' }]} 
                  onPress={() => setUploadSuccessModalVisible(false)}
                >
                  <Text style={styles.logoutConfirmText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={isLeaveConfirmModalVisible}
          onRequestClose={() => {
            if (!isLeavingCourse) {
              setLeaveConfirmModalVisible(false);
              setCourseToLeave(null);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.logoutModalContainer}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <MaterialCommunityIcons name="exit-to-app" size={48} color="#D32F2F" />
              </View>
              <Text style={[styles.logoutModalTitle, { color: '#D32F2F' }]}>Leave Course</Text>
              <Text style={[styles.logoutModalSubtitle, { textAlign: 'left', marginTop: 10 }]}>
                Are you sure you want to leave this class?{'\n\n'}
                You will permanently lose access to:{'\n'}
                • Course Materials{'\n'}
                • Assignments{'\n'}
                • Announcements{'\n'}
                • Class Conversation / Messenger{'\n\n'}
                You can only regain access if the teacher adds you back or you rejoin using the class code.
              </Text>
              <View style={[styles.logoutButtonsRow, { justifyContent: 'space-between', gap: 10, alignItems: 'center', alignContent: 'center' }]}>
                <Pressable
                  style={[
                    styles.logoutConfirmBtn, 
                    { backgroundColor: '#555', flex: 1, opacity: isLeavingCourse ? 0.5 : 1 }
                  ]}
                  disabled={isLeavingCourse}
                  onPress={() => {
                    setLeaveConfirmModalVisible(false);
                    setCourseToLeave(null);
                  }}
                >
                  <Text style={styles.logoutConfirmText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.logoutConfirmBtn, 
                    { backgroundColor: '#D32F2F', flex: 1, opacity: isLeavingCourse ? 0.8 : 1 }
                  ]}
                  disabled={isLeavingCourse}
                  onPress={confirmLeaveCourse}
                >
                  {isLeavingCourse ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.logoutConfirmText}>Leave Course</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={isLeaveSuccessModalVisible}
          onRequestClose={() => setLeaveSuccessModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.logoutModalContainer}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <MaterialCommunityIcons name="check-circle-outline" size={48} color="#2E7D32" />
              </View>
              <Text style={[styles.logoutModalTitle, { color: '#2E7D32' }]}>Success</Text>
              <Text style={[styles.logoutModalSubtitle, { textAlign: 'center', marginTop: 10 }]}>
                You have successfully left this course.{'\n'}Your access to the class, including its conversations and discussion rooms, has been removed.
              </Text>
              <View style={styles.logoutButtonsRow}>
                <Pressable
                  style={[styles.logoutConfirmBtn, { backgroundColor: '#2E7D32' }]}
                  onPress={() => setLeaveSuccessModalVisible(false)}
                >
                  <Text style={styles.logoutConfirmText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          animationType="fade"
          transparent
          visible={isLeaveErrorModalVisible}
          onRequestClose={() => setLeaveErrorModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.logoutModalContainer}>
              <View style={{ alignItems: 'center', marginBottom: 15 }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#D32F2F" />
              </View>
              <Text style={[styles.logoutModalTitle, { color: '#D32F2F' }]}>Unable to Leave Course</Text>
              <Text style={[styles.logoutModalSubtitle, { textAlign: 'center', marginTop: 10 }]}>
                {leaveErrorMessage || 'Unable to leave the course.\nPlease try again later.'}
              </Text>
              <View style={styles.logoutButtonsRow}>
                <Pressable
                  style={[styles.logoutConfirmBtn, { backgroundColor: '#555' }]}
                  onPress={() => setLeaveErrorModalVisible(false)}
                >
                  <Text style={styles.logoutConfirmText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  safeAreaFullscreen: { backgroundColor: '#000' },
  safeAreaMobileFullscreen: { backgroundColor: '#fff' },
  headerLayer: { position: 'relative', zIndex: 1000, elevation: 1000 },
  contentLayer: { flex: 1, flexDirection: 'row', position: 'relative', zIndex: 1 },
  contentLayerFullscreen: { flexDirection: 'column' },
  contentLayerMobileFullscreen: { flexDirection: 'column' },
  notificationBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 3999, elevation: 3999 },
  notificationPopover: { position: 'absolute', top: 72, right: 20, zIndex: 4000, elevation: 4000 },
  mobileDrawerPortal: { ...StyleSheet.absoluteFillObject, zIndex: 5000, elevation: 5000, flexDirection: 'row' },
  mobileBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  mobileOverlay: { width: 250, height: '100%', backgroundColor: '#FFF', zIndex: 5001, elevation: 5001 },
  floatingChatBtn: { position: 'absolute', bottom: 12, right: 20, zIndex: 20, width: 140, height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#D32F2F', borderRadius: 28, paddingHorizontal: 16 },
  floatingChatBtnSmall: { width: 56, height: 56, borderRadius: 28 },
  chatBtnImage: { width: 22, height: 22, resizeMode: 'contain', tintColor: '#FFFFFF' },
  chatBtnLabel: { fontSize: 12, fontWeight: '600', color: '#FFF' },
  chatClose: { fontSize: 12, fontWeight: '600' },
  generatingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 9000, elevation: 9000, backgroundColor: 'rgba(0,0,0,0.28)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  generatingCard: { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 16 },
  generatingTitle: { marginTop: 14, fontSize: 18, fontWeight: '800', color: '#111', textAlign: 'center' },
  generatingText: { marginTop: 8, fontSize: 14, color: '#555', lineHeight: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  logoutModalContainer: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, width: '88%', maxWidth: 360 },
  logoutModalTitle: { fontSize: 20, fontWeight: '700', color: '#222', textAlign: 'center' },
  logoutModalSubtitle: { fontSize: 14, color: '#777', textAlign: 'center', marginTop: 8 },
  logoutButtonsRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  logoutConfirmBtn: {
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 10,
  backgroundColor: '#D32F2F',

  justifyContent: 'center',
  alignItems: 'center',
},
  logoutConfirmText: {
  color: '#FFF',
  fontWeight: '700',
  textAlign: 'center',
},
});