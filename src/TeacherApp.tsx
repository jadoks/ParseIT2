import * as FileSystem from 'expo-file-system/legacy';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

// 🔥 UPDATED: use the shared, auto-refreshing apiFetch instead of a local createSecureFetch
import { API_BASE_URL, apiFetch } from './services/api'; // adjust path if your folder layout differs

import Grades from './teacher_components/Grades';
import Honors from './teacher_components/Honors';
import TeacherAnalytics from './teacher_components/TeacherAnalytics';
import { Announcement } from './teacher_components/TeacherAnnouncementModal';
import Community2, { CommunityPost } from './teacher_components/TeacherCommunity';
import Coursedetail2, {
  CourseDetailData,
} from './teacher_components/TeacherCourseDetail2';
import Dashboard2 from './teacher_components/TeacherDashboard';
import TeacherDrawerMenu from './teacher_components/TeacherDrawerMenu';
import TeacherHeader from './teacher_components/TeacherHeader';
import TeacherMessenger from './teacher_components/TeacherMessenger';
import TeacherNotification, {
  NotificationItem,
} from './teacher_components/TeacherNotification';
import Profile2 from './teacher_components/TeacherProfile';
import ShareAnnouncement from './teacher_components/TeacherShareAnnouncement';

interface SignedInTeacher {
  teacherId?: string;
  authUid?: string | null;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string | null;
  bannerImage?: string | null;
  profileImageStoragePath?: string | null;
  bannerImageStoragePath?: string | null;
}

// 🔥 idToken is no longer required here — apiFetch pulls a fresh token from
// Firebase directly. Kept optional so App.tsx doesn't need to change if it
// still passes it down; it's simply ignored.
interface Props {
  onLogout: () => void;
  currentTeacher: SignedInTeacher;
  idToken?: string | null;
  // 👇 NEW: navigates back to the public Landing Page without logging out
  // (tapped from the TeacherHeader logo).
  onGoToLanding?: () => void;
}

type AppScreenType =
  | 'home'
  | 'honors'
  | 'grades'
  | 'announcement'
  | 'profile'
  | 'messenger'
  | 'coursedetail'
  | 'community'
  | 'notification'
  | 'analytics';

type CourseWithIcon = CourseDetailData & {
  icon?: string;
  schoolYear?: string;
  assignedTeacherId?: string;
  assignedTeacherUid?: string;
  instructorEmail?: string;
};


type MessengerCourse = {
  id: string;
  name: string;
  instructor: string;
  semester: string;
  schoolYear: string;
  section?: string;
};

type TeacherClassAnnouncement = Announcement & {
  classIds?: string[];
  bannerKey?: number | null;
  expiresAt?: any;
  createdAt?: any;
  updatedAt?: any;
};

const ANNOUNCEMENT_BANNERS: Record<number, any> = {
  1: require('../assets/images/Banner1.png'),
  2: require('../assets/images/Banner2.png'),
  3: require('../assets/images/Banner3.png'),
  4: require('../assets/images/Banner4.png'),
};

const isAppScreen = (screen: string): screen is AppScreenType => {
  return [
    'home',
    'honors',
    'grades',
    'announcement',
    'profile',
    'messenger',
    'coursedetail',
    'community',
    'notification',
    'analytics',
  ].includes(screen);
};

const normalizeText = (value?: string | null) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

// 🔥 FIX: The backend's /classes response uses `instructorName` / `bannerUrl`,
// not `instructor` / `bannerUri`. TeacherDashboard already renames these on
// its own separate copy of the class list (see its local `mapBackendClass`),
// but this component's `teacherClasses` state was storing the raw response
// unmapped. Anything that read a course from THIS state (e.g. notification
// deep-links via `effectiveCourses.find(...)`) ended up with an undefined
// `instructor`/`bannerUri`, showing "No Instructor" and a blank banner even
// though the same course opened fine from a Dashboard card. Mapping here
// keeps every consumer of `effectiveCourses` consistent with Dashboard.
const mapBackendClass = (item: any, fallbackInstructor: string): CourseWithIcon => ({
  ...item,
  id: item.id,
  name: item.name || '',
  courseCode: item.courseCode || '',
  classCode: item.classCode || '',
  instructor: item.instructorName || fallbackInstructor,
  section: item.section || '',
  bannerUri: item.bannerUrl || item.bannerUri || item.bannerLocalUri || undefined,
  bannerStoragePath: item.bannerStoragePath || null,
  bannerFileName: item.bannerFileName || null,
  bannerMimeType: item.bannerMimeType || null,
  year: item.year || '',
  yearSection: item.yearSection || item.section || '',
  semester: item.semester || '',
  schoolYear: item.schoolYear || null,
  description: item.description || null,
  position: item.position,
  units: typeof item.units === 'number' ? item.units : undefined,
  schedule: Array.isArray(item.schedule) ? item.schedule : [],
});

const TEACHER_ALLOWED_NOTIFICATION_TYPES = new Set([
  'submitted-assignment',
  'community-answer',
  'student-at-risk',
  'class-assigned',
  'assignment-comment', // 👈 ADDED
]);

// 🔥 How often to re-pull the teacher profile purely to refresh the signed
// avatar/banner URLs. TeacherCommunity already refreshes OTHER users'
// avatars on this same cadence — this keeps the CURRENT user's own avatar
// in sync too, since Community.tsx intentionally skips refreshing "own"
// avatars (it assumes the `userAvatar` prop is always fresh).
const PROFILE_IMAGE_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // every 5 min

export default function TeacherApp({ onLogout, currentTeacher, onGoToLanding }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLargeScreen = width >= 768;
  const isMobile = width < 768;

 const loadCommunityPosts = useCallback(async () => {
  try {
    const response = await apiFetch('/community-posts');
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to load community posts.');
    }
    setCommunityPosts(Array.isArray(data?.data) ? data.data : []);
  } catch (error) {
    console.log('LOAD TEACHER COMMUNITY POSTS ERROR =>', error);
  }
}, []);
  const handleClearGlobalSearch = () => {
    setGlobalSearchQuery('');
  };

  const safeAreaEdges = ['top', 'right', 'bottom', 'left'] as const;

  const [activeScreen, setActiveScreen] = useState<AppScreenType>('home');
  const [lastScreen, setLastScreen] = useState<AppScreenType>('home');
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // 👇 GLOBAL SEARCH STATE
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  const [courses, setCourses] = useState<CourseWithIcon[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<CourseWithIcon[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithIcon | null>(null);
  const [selectedAnalyticsClass, setSelectedAnalyticsClass] = useState<string>('All');
  const [analyticsStudents, setAnalyticsStudents] = useState<any[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<SignedInTeacher | null>(null);
  const [teacherNotifications, setTeacherNotifications] = useState<NotificationItem[]>([]);
  const [teacherAnnouncements, setTeacherAnnouncements] = useState<TeacherClassAnnouncement[]>([]);

  // Loading states to prevent the initial empty-state flash on the dashboard
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);

  // 👇 MESSENGER UNREAD COUNT STATE
  const [messengerUnreadCount, setMessengerUnreadCount] = useState(0);

  // 🔥 FIX: Derive active profile from teacherProfile first, fallback to currentTeacher
  // This ensures storage paths are always available after profile loads or updates
  const activeProfile = teacherProfile || currentTeacher;

  const teacherFullName = useMemo(() => {
    const first = normalizeText(activeProfile?.firstName);
    const last = normalizeText(activeProfile?.lastName);
    return `${first} ${last}`.trim() || 'Teacher';
  }, [activeProfile]);

  const teacherEmail = useMemo(() => {
    return normalizeText(activeProfile?.email);
  }, [activeProfile]);

  const teacherIdentity = useMemo(() => {
    return (
      normalizeText(activeProfile?.teacherId) ||
      normalizeText(activeProfile?.authUid || '') ||
      teacherEmail ||
      teacherFullName
    );
  }, [activeProfile, teacherEmail, teacherFullName]);

  // Initialize with safe values derived from activeProfile
  const initialAvatar = activeProfile?.profileImage
    ? { uri: activeProfile.profileImage }
    : null;
  const initialBanner = activeProfile?.bannerImage
    ? { uri: activeProfile.bannerImage }
    : null;

  const [currentUserAvatar, setCurrentUserAvatar] = useState<any>(initialAvatar);
  const [currentUserBanner, setCurrentUserBanner] = useState<any>(initialBanner);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);

  // 👇 ADDED: Deep-link targets set when a notification is tapped, so the
  // destination screen knows exactly what to open once it mounts/loads.
  const [pendingAssignmentId, setPendingAssignmentId] = useState<string | null>(null);
  // 👇 ADDED: which student's comment thread to auto-open once the
  // submissions screen for the related assignment is showing.
  const [pendingCommentStudentId, setPendingCommentStudentId] = useState<string | null>(null);
  const [pendingCommunityPostId, setPendingCommunityPostId] = useState<string | null>(null);

  const isProfileScreen = activeScreen === 'profile';

  const unreadNotificationCount = useMemo(
    () => teacherNotifications.filter((item) => !item.read).length,
    [teacherNotifications]
  );

  const effectiveCourses = useMemo<CourseWithIcon[]>(() => {
    const merged = [...teacherClasses, ...courses];
    const seen = new Set<string>();
    return merged.filter((course) => {
      if (!course?.id) return false;
      if (seen.has(course.id)) return false;
      seen.add(course.id);
      return true;
    });
  }, [teacherClasses, courses]);

  // 🔥 FIX: Sync avatar when activeProfile updates (after load or image save)
  useEffect(() => {
    if (activeProfile?.profileImage) {
      setCurrentUserAvatar({ uri: activeProfile.profileImage });
    }
  }, [activeProfile?.profileImage]);

  // 🔥 FIX: Sync banner when activeProfile updates
  useEffect(() => {
    if (activeProfile?.bannerImage) {
      setCurrentUserBanner({ uri: activeProfile.bannerImage });
    }
  }, [activeProfile?.bannerImage]);

  useEffect(() => {
    if (!isLargeScreen) {
      setIsNotificationOpen(false);
    }
  }, [isLargeScreen]);

  useEffect(() => {
    if (activeScreen === 'notification') {
      setIsNotificationOpen(false);
    }
  }, [activeScreen]);

  const loadTeacherProfile = useCallback(async () => {
    const teacherId =
      currentTeacher.teacherId ||
      currentTeacher.authUid ||
      currentTeacher.email;
    if (!teacherId) return;
    try {
      const response = await apiFetch('/auth/user-profile', {
        method: 'POST',
        body: JSON.stringify({
          id: teacherId,
          role: 'teacher',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load teacher profile.');
      }

      setTeacherProfile({
        teacherId: data?.data?.teacherId ?? undefined,
        authUid: data?.data?.authUid ?? null,
        firstName: data?.data?.firstName ?? undefined,
        lastName: data?.data?.lastName ?? undefined,
        email: data?.data?.email ?? undefined,
        profileImage: data?.data?.profileImage ?? null,
        bannerImage: data?.data?.bannerImage ?? null,
        profileImageStoragePath: data?.data?.profileImageStoragePath ?? null,
        bannerImageStoragePath: data?.data?.bannerImageStoragePath ?? null,
      });
    } catch (error) {
      console.log('LOAD TEACHER PROFILE ERROR =>', error);
    }
  }, [currentTeacher?.teacherId, currentTeacher?.authUid, currentTeacher?.email]);

  const loadTeacherNotifications = useCallback(async () => {
    const teacherId =
      normalizeText(activeProfile?.teacherId) ||
      normalizeText(currentTeacher?.teacherId);
    if (!teacherId) {
      setTeacherNotifications([]);
      return;
    }
    try {
      const response = await apiFetch(
        `/notifications?userId=${encodeURIComponent(teacherId)}&role=teacher`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load notifications.');
      }

      const teacherOnlyNotifications = Array.isArray(data?.data)
        ? data.data.filter((item: NotificationItem) =>
            TEACHER_ALLOWED_NOTIFICATION_TYPES.has(item.type)
          )
        : [];

      setTeacherNotifications(teacherOnlyNotifications);
    } catch (error) {
      console.log('LOAD TEACHER NOTIFICATIONS ERROR =>', error);
    }
  }, [currentTeacher?.teacherId, activeProfile?.teacherId]);

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

  const loadTeacherClasses = useCallback(async () => {
    try {
      const response = await apiFetch('/classes');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load classes.');
      }
      const allClasses = Array.isArray(data) ? data : [];

      const filteredClasses = allClasses.filter((item: any) => {
        return (
          item.assignedTeacherId === activeProfile?.teacherId ||
          item.assignedTeacherUid === activeProfile?.authUid ||
          item.instructorEmail === activeProfile?.email
        );
      });

      // 🔥 FIX: normalize raw backend fields (instructorName/bannerUrl, etc.)
      // into the instructor/bannerUri shape the rest of the app expects —
      // matches TeacherDashboard's own mapBackendClass so every consumer of
      // `effectiveCourses` (notification deep-links, messenger, analytics,
      // announcements) sees the same fully-populated course objects that
      // Dashboard cards already show.
      const mappedClasses = filteredClasses.map((item: any) =>
        mapBackendClass(item, teacherFullName)
      );

      setTeacherClasses(mappedClasses);
    } catch (error) {
      console.log('LOAD TEACHER CLASSES ERROR =>', error);
      setTeacherClasses([]);
    } finally {
      setIsLoadingClasses(false);
    }
  }, [
    activeProfile?.teacherId,
    activeProfile?.authUid,
    activeProfile?.email,
    teacherFullName,
  ]);

  const loadTeacherAnalytics = useCallback(async () => {
    const teacherId =
      normalizeText(activeProfile?.teacherId) ||
      normalizeText(currentTeacher?.teacherId) ||
      normalizeText(activeProfile?.authUid || '') ||
      normalizeText(activeProfile?.email);
    if (!teacherId) {
      setAnalyticsStudents([]);
      return;
    }
    try {
      const response = await apiFetch(
        `/teacher-analytics/${encodeURIComponent(teacherId)}`
      );

      const rawText = await response.text();
      const data = rawText ? JSON.parse(rawText) : {};

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load teacher analytics.');
      }

      setAnalyticsStudents(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.log('LOAD TEACHER ANALYTICS ERROR =>', error);
      setAnalyticsStudents([]);
    }
  }, [
    currentTeacher?.teacherId,
    activeProfile?.teacherId,
    activeProfile?.authUid,
    activeProfile?.email,
  ]);

  const loadTeacherAnnouncements = useCallback(async () => {
    try {
      const classIds = effectiveCourses.map((item) => item.id).filter(Boolean);
      if (!classIds.length) {
        setTeacherAnnouncements([]);
        return;
      }
      const groupedAnnouncements = await Promise.all(
        classIds.map(async (classId) => {
          const response = await apiFetch(`/class-announcements/${classId}`);
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

      const mappedAnnouncements: TeacherClassAnnouncement[] = Array.from(
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

      setTeacherAnnouncements(mappedAnnouncements);
    } catch (error) {
      console.log('LOAD TEACHER ANNOUNCEMENTS ERROR =>', error);
      setTeacherAnnouncements([]);
    } finally {
      setIsLoadingAnnouncements(false);
    }
  }, [effectiveCourses]);

  const hydratedCommunityPosts = useMemo<CommunityPost[]>(() => {
    return communityPosts.map((post) => ({
      ...post,
      avatar:
        post.userEmail === teacherEmail || post.userName === teacherFullName
          ? currentUserAvatar
          : post.avatar,
      answers: post.answers.map((answer) => ({
        ...answer,
        avatar:
          answer.userName === teacherFullName
            ? currentUserAvatar
            : answer.avatar,
      })),
    }));
  }, [communityPosts, currentUserAvatar, teacherEmail, teacherFullName]);

  const currentUserPosts = useMemo(() => {
    return hydratedCommunityPosts.filter(
      (post) =>
        post.userName === teacherFullName ||
        post.userEmail === teacherEmail
    );
  }, [hydratedCommunityPosts, teacherEmail, teacherFullName]);

  const messengerCourses = useMemo<MessengerCourse[]>(
    () =>
      effectiveCourses.map((course) => ({
        id: course.id,
        name: `${course.courseCode} - ${course.name}`,
        instructor: course.instructor || teacherFullName,
        semester: course.semester || '1st Semester',
        schoolYear: course.schoolYear || '2025-2026',
        section: course.section,
      })),
    [effectiveCourses, teacherFullName]
  );

  const shouldHideMobileHeader =
    isMobile &&
    (activeScreen === 'coursedetail' ||
      activeScreen === 'messenger' ||
      activeScreen === 'notification');

  const navigateTo = (screen: AppScreenType) => {
    setLastScreen(activeScreen);
    setActiveScreen(screen);
    setIsNotificationOpen(false);
    if (screen === 'analytics') {
      setSelectedAnalyticsClass('All');
    }
    if (!isLargeScreen) {
      setMobileDrawerOpen(false);
    }
  };

  const handleHeaderNavigate = (screen: string) => {
    if (isAppScreen(screen)) {
      navigateTo(screen);
    }
  };

  const handleDrawerNavigate = (screen: string) => {
    if (isAppScreen(screen)) {
      navigateTo(screen);
    }
  };

  const handleNotificationPress = () => {
    if (isLargeScreen) {
      setIsNotificationOpen((prev) => !prev);
    } else {
      setLastScreen(activeScreen);
      setActiveScreen('notification');
    }
  };

  // 👇 BACK BUTTON HISTORY: keeps a stack of every screen we've navigated
  // away from, so the Android hardware back button can step back through
  // them one at a time instead of immediately exiting the app.
  const screenHistoryRef = useRef<AppScreenType[]>([]);
  const prevScreenRef = useRef<AppScreenType>(activeScreen);

  useEffect(() => {
    if (prevScreenRef.current !== activeScreen) {
      screenHistoryRef.current.push(prevScreenRef.current);
      // Cap the stack so it can't grow forever on a long session.
      if (screenHistoryRef.current.length > 20) {
        screenHistoryRef.current.shift();
      }
      prevScreenRef.current = activeScreen;
    }
  }, [activeScreen]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onHardwareBackPress = () => {
      // Close whatever overlay is open first, tap by tap, before touching
      // the underlying screen stack.
      if (isMobileDrawerOpen) {
        setMobileDrawerOpen(false);
        return true;
      }
      if (isNotificationOpen) {
        setIsNotificationOpen(false);
        return true;
      }

      // Step back through the in-app navigation history.
      if (screenHistoryRef.current.length > 0) {
        const previous = screenHistoryRef.current.pop() as AppScreenType;
        prevScreenRef.current = previous;
        setLastScreen(activeScreen);
        setActiveScreen(previous);
        return true;
      }

      // No history left — fall back to Home instead of exiting.
      if (activeScreen !== 'home') {
        prevScreenRef.current = 'home';
        setActiveScreen('home');
        return true;
      }

      // Already on Home with nothing to go back to: let the system handle
      // it (this exits the app), matching normal Android behavior.
      return false;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBackPress
    );

    return () => subscription.remove();
  }, [activeScreen, isMobileDrawerOpen, isNotificationOpen]);

  const normalizeCommunityAvatar = (avatar: any) => {
    if (!avatar) return null;
    if (typeof avatar === 'string') return avatar;
    if (avatar?.uri) return avatar.uri;
    return null;
  };



  useEffect(() => {
  // Run profile + classes together (classes still needs the resolved
  // teacher identity from currentTeacher directly — it doesn't have to
  // wait for the *profile fetch* to resolve teacherId/authUid/email
  // first, since currentTeacher already has those from login).
  loadTeacherProfile();
  loadCommunityPosts();
  loadTeacherClasses();   // now keyed off currentTeacher, not activeProfile
  loadTeacherAnalytics();

  const profileRefreshInterval = setInterval(loadTeacherProfile, PROFILE_IMAGE_REFRESH_INTERVAL_MS);
  return () => clearInterval(profileRefreshInterval);
}, []); // run once on mount, not chained to activeProfile changes

  useEffect(() => {
    loadTeacherNotifications();
  }, [loadTeacherNotifications]);

  // 🔥 Silent background refresh — same "live" polling pattern used in
  // TeacherCommunity: silently re-fetch notifications on an interval so new
  // ones (e.g. a student's assignment comment) show up without the teacher
  // needing to navigate away and back. Paused while the notification
  // popover/screen is actually open so an incoming refresh never resets
  // scroll position or collapses "see all" mid-read.
  const isNotificationViewOpen = isNotificationOpen || activeScreen === 'notification';
  useEffect(() => {
    const interval = setInterval(() => {
      if (isNotificationViewOpen) return; // paused — user is looking at it
      loadTeacherNotifications();
    }, 8000);
    return () => clearInterval(interval);
  }, [loadTeacherNotifications, isNotificationViewOpen]);

  useEffect(() => {
    loadTeacherClasses();
  }, [loadTeacherClasses]);

  useEffect(() => {
    loadTeacherAnalytics();
  }, [loadTeacherAnalytics]);

  useEffect(() => {
    if (activeScreen === 'analytics') {
      loadTeacherClasses();
      loadTeacherAnalytics();
    }
  }, [activeScreen, loadTeacherClasses, loadTeacherAnalytics]);

  useEffect(() => {
    loadTeacherAnnouncements();
  }, [loadTeacherAnnouncements]);

  const handleSearchChange = (query: string) => {
    setGlobalSearchQuery(query);
  };

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
      activeProfile?.teacherId ||
      activeProfile?.authUid ||
      activeProfile?.email
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
      throw new Error('Teacher ID is missing.');
    }
    const body: any = {};

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

    const response = await apiFetch('/auth/update-user-images', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Failed to save teacher images.');
    }

    return data?.data || {};
  };

  const handleChangeProfileImage = async (image: any) => {
    const previousAvatar = currentUserAvatar;
    try {
      setCurrentUserAvatar(image);
      if (!image?.uri) return;

      const savedData = await saveUserImagesToFirestore({
        profileImage: image,
      });

      if (!savedData?.profileImage) {
        throw new Error('Backend did not return the saved profile image URL.');
      }

      setCurrentUserAvatar({ uri: savedData.profileImage });

      // 🔥 Update teacherProfile so activeProfile gets new storage path
      setTeacherProfile((prev) => ({
        ...(prev || {}),
        profileImage: savedData.profileImage,
        profileImageStoragePath:
          savedData.profileImageStoragePath ||
          prev?.profileImageStoragePath ||
          null,
      }));
    } catch (error: any) {
      setCurrentUserAvatar(previousAvatar);
      console.log('SAVE TEACHER PROFILE IMAGE ERROR =>', error);
      Alert.alert(
        'Save Failed',
        error?.message || 'Unable to save profile image.'
      );
    }
  };

  const handleChangeBannerImage = async (image: any) => {
    const previousBanner = currentUserBanner;
    try {
      setCurrentUserBanner(image);
      if (!image?.uri) return;

      const savedData = await saveUserImagesToFirestore({
        bannerImage: image,
      });

      if (!savedData?.bannerImage) {
        throw new Error('Backend did not return the saved banner image URL.');
      }

      setCurrentUserBanner({ uri: savedData.bannerImage });

      // 🔥 Update teacherProfile so activeProfile gets new storage path
      setTeacherProfile((prev) => ({
        ...(prev || {}),
        bannerImage: savedData.bannerImage,
        bannerImageStoragePath:
          savedData.bannerImageStoragePath ||
          prev?.bannerImageStoragePath ||
          null,
      }));
    } catch (error: any) {
      setCurrentUserBanner(previousBanner);
      console.log('SAVE TEACHER BANNER IMAGE ERROR =>', error);
      Alert.alert(
        'Save Failed',
        error?.message || 'Unable to save banner image.'
      );
    }
  };

  const handleCreateCommunityPost = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;
    try {
      const response = await apiFetch('/community-posts', {
        method: 'POST',
        body: JSON.stringify({
          content: trimmedQuery,
          authorId: activeProfile?.teacherId || teacherIdentity,
          authorUid: activeProfile?.authUid || null,
          authorRole: 'teacher',
          userName: teacherFullName,
          userEmail: teacherEmail,
          avatar: normalizeCommunityAvatar(currentUserAvatar),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create post.');
      }

      await loadCommunityPosts();
      await loadTeacherNotifications();
    } catch (error: any) {
      Alert.alert('Post Failed', error?.message || 'Unable to create post.');
    }
  };

  const handleAddCommunityAnswer = async (postId: string, message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    try {
      const response = await apiFetch(`/community-posts/${postId}/answers`, {
        method: 'POST',
        body: JSON.stringify({
          message: trimmedMessage,
          authorId: activeProfile?.teacherId || teacherIdentity,
          authorUid: activeProfile?.authUid || null,
          authorRole: 'teacher',
          userName: teacherFullName,
          avatar: normalizeCommunityAvatar(currentUserAvatar),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to add answer.');
      }

      await loadCommunityPosts();
      await loadTeacherNotifications();
    } catch (error: any) {
      Alert.alert('Answer Failed', error?.message || 'Unable to post answer.');
    }
  };

  const handleEditCommunityPost = async (postId: string, content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    try {
      const response = await apiFetch(`/community-posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ content: trimmedContent }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update post.');
      }

      await loadCommunityPosts();
      await loadTeacherNotifications();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update post.');
    }
  };

  const handleDeleteCommunityPost = async (postId: string) => {
    try {
      const response = await apiFetch(`/community-posts/${postId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete post.');
      }

      await loadCommunityPosts();
      await loadTeacherNotifications();
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
      const response = await apiFetch(
        `/community-posts/${postId}/answers/${answerId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ message: trimmedMessage }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update answer.');
      }

      await loadCommunityPosts();
      await loadTeacherNotifications();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update answer.');
    }
  };

  const handleDeleteCommunityAnswer = async (postId: string, answerId: string) => {
    try {
      const response = await apiFetch(
        `/community-posts/${postId}/answers/${answerId}`,
        {
          method: 'DELETE',
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete answer.');
      }

      await loadCommunityPosts();
      await loadTeacherNotifications();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Unable to delete answer.');
    }
  };

  const handleDrawerEmailUpdated = (nextEmail: string) => {
    setTeacherProfile((prev) => ({
      ...(prev || activeProfile || {}),
      email: nextEmail,
    }));
  };

  const handleSetIsLoggedIn = (val: boolean) => {
    if (!val) {
      onLogout();
    }
  };

  const handleOpenCourse = (course?: CourseDetailData) => {
    if (course) {
      setSelectedCourse(course as CourseWithIcon);
    }
    setLastScreen(activeScreen);
    setActiveScreen('coursedetail');
    setIsNotificationOpen(false);
  };

  // 👇 ADDED: Route a tapped notification to wherever it actually happened —
  // mirrors the "tap a Facebook notification -> jump to that post/comment"
  // pattern. Uses the notification's relatedId/relatedType/classId to decide
  // the destination screen and what to auto-open once there.
  const handleNotificationNavigate = (item: NotificationItem) => {
    setIsNotificationOpen(false);

    switch (item.type) {
      case 'submitted-assignment': {
        const targetClassId = item.classId;
        const course = targetClassId
          ? effectiveCourses.find((c) => c.id === targetClassId)
          : undefined;

        if (!course) {
          Alert.alert(
            'Class not found',
            'This class is no longer available.'
          );
          return;
        }

        setPendingAssignmentId(item.relatedId || null);
        handleOpenCourse(course);
        break;
      }

      // 👇 ADDED: a student commented on their own assignment — jump to
      // that assignment's submissions view and auto-open their thread.
      case 'assignment-comment': {
        const targetClassId = item.classId;
        const course = targetClassId
          ? effectiveCourses.find((c) => c.id === targetClassId)
          : undefined;

        if (!course) {
          Alert.alert(
            'Class not found',
            'This class is no longer available.'
          );
          return;
        }

        setPendingAssignmentId(item.relatedId || null);
        // The comment author (actorId) is the student whose thread we
        // want auto-expanded once the submissions screen opens.
        setPendingCommentStudentId(item.actorId || null);
        handleOpenCourse(course);
        break;
      }

      case 'class-assigned': {
        const targetClassId = item.classId || item.relatedId;
        const course = targetClassId
          ? effectiveCourses.find((c) => c.id === targetClassId)
          : undefined;

        if (!course) {
          Alert.alert(
            'Class not found',
            'This class is no longer available.'
          );
          return;
        }

        handleOpenCourse(course);
        break;
      }

      case 'community-answer': {
        // A teacher's own posts live on their Profile screen (not the
        // Community feed), so "someone answered your post" routes there —
        // mirrors tapping a Facebook notification and landing on the post
        // itself rather than the general feed.
        setPendingCommunityPostId(item.relatedId || null);
        navigateTo('profile');
        break;
      }

      case 'student-at-risk': {
        const course = item.classId
          ? effectiveCourses.find((c) => c.id === item.classId)
          : undefined;
        setSelectedAnalyticsClass(course?.name || 'All');
        navigateTo('analytics');
        break;
      }

      default:
        break;
    }
  };

  const handleCreateClass = (newCourse: CourseDetailData) => {
    const getCourseIcon = (courseName: string) => {
      const normalized = courseName.toLowerCase();
      if (normalized.includes('web')) return 'web';
      if (normalized.includes('program')) return 'code-tags';
      if (normalized.includes('computer')) return 'desktop-classic';
      if (normalized.includes('network')) return 'lan';
      if (normalized.includes('database')) return 'database';
      if (normalized.includes('design')) return 'palette';
      if (normalized.includes('math')) return 'calculator';
      if (normalized.includes('science')) return 'flask-outline';
      return 'book-education';
    };

    const courseWithIcon: CourseWithIcon = {
      ...newCourse,
      instructor: teacherFullName,
      icon: getCourseIcon(newCourse.name),
      year: newCourse.year || '1st Year',
      semester: newCourse.semester || '1st Semester',
      schoolYear: (newCourse as any).schoolYear || '2025-2026',
    };

    setCourses((prev) => [courseWithIcon, ...prev]);

    setTimeout(() => {
      loadTeacherNotifications();
      loadTeacherClasses();
      loadTeacherAnalytics();
      loadTeacherAnnouncements();
    }, 500);
  };

  const handleDeleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== id));
    setTeacherClasses((prev) => prev.filter((course) => course.id !== id));
    setSelectedCourse((prev) => (prev?.id === id ? null : prev));
    setTimeout(() => {
      loadTeacherNotifications();
      loadTeacherClasses();
      loadTeacherAnalytics();
      loadTeacherAnnouncements();
    }, 500);
  };

  const loadMessengerUnreadCount = useCallback(async () => {
    try {
      const response = await apiFetch(
        `/messenger-unread-count?role=teacher&userId=${encodeURIComponent(
          activeProfile?.teacherId || ''
        )}&userUid=${encodeURIComponent(
          activeProfile?.authUid || ''
        )}`
      );

      const data = await response.json();

      if (response.ok) {
        setMessengerUnreadCount(Number(data?.count || 0));
      }
    } catch (error) {
      console.log('LOAD MESSENGER UNREAD ERROR =>', error);
    }
  }, [activeProfile?.teacherId, activeProfile?.authUid]);

  useEffect(() => {
    loadMessengerUnreadCount();
    const interval = setInterval(loadMessengerUnreadCount, 10000); // poll every 10 seconds
    return () => clearInterval(interval);
  }, [loadMessengerUnreadCount]);

  return (
    <SafeAreaView style={styles.mainContainer} edges={safeAreaEdges}>
      {!shouldHideMobileHeader && (
        <View style={styles.headerWrapper}>
          <TeacherHeader
            isLargeScreen={isLargeScreen}
            activeScreen={activeScreen}
            onNavigate={handleHeaderNavigate}
            onSearchChange={handleSearchChange}
            searchValue={globalSearchQuery}
            onMenuPress={() => {
              setMobileDrawerOpen((prev) => !prev);
            }}
            notificationCount={unreadNotificationCount}
            messengerUnreadCount={messengerUnreadCount}
            onNotificationPress={handleNotificationPress}
            onLogoPress={() => navigateTo('home')}
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
            <TeacherNotification
              mode="popover"
              notifications={teacherNotifications}
              apiBaseUrl={API_BASE_URL}
              userId={teacherIdentity}
              role="teacher"
              onNotificationsUpdated={setTeacherNotifications}
              onNavigate={handleNotificationNavigate}
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

      <View style={styles.contentWrapper}>
        {isLargeScreen && !isProfileScreen && activeScreen !== 'notification' && (
          <View style={styles.desktopDrawer}>
            {/* 🔥 FIX: Pass userAvatarStoragePath to desktop drawer */}
            <TeacherDrawerMenu
              isFixed={true}
              activeScreen={activeScreen}
              onNavigate={handleDrawerNavigate}
              userName={teacherFullName}
              userEmail={teacherEmail}
              userAvatar={currentUserAvatar}
              userAvatarStoragePath={activeProfile?.profileImageStoragePath || null}
              userId={teacherIdentity}
              userRole="teacher"
              apiBaseUrl={API_BASE_URL}
              onAvatarPress={() => navigateTo('profile')}
              onEmailUpdated={handleDrawerEmailUpdated}
              setIsLoggedIn={handleSetIsLoggedIn}
            />
          </View>
        )}

        <View style={styles.screenContainer}>
          {activeScreen === 'profile' ? (
            /* 🔥 FIX: Pass storage paths to Profile2 */
            <Profile2
            userPosts={currentUserPosts}
            onCreatePost={handleCreateCommunityPost}
            onAddAnswer={handleAddCommunityAnswer}
            onEditPost={handleEditCommunityPost}
            onDeletePost={handleDeleteCommunityPost}
            onEditAnswer={handleEditCommunityAnswer}
            onDeleteAnswer={handleDeleteCommunityAnswer}
            userName={teacherFullName}
            userEmail={teacherEmail}
            profileImage={currentUserAvatar}
            bannerImage={currentUserBanner}
            profileImageStoragePath={activeProfile?.profileImageStoragePath || null}
            bannerImageStoragePath={activeProfile?.bannerImageStoragePath || null}
            onChangeProfileImage={handleChangeProfileImage}
            onChangeBannerImage={handleChangeBannerImage}
            onRefresh={loadCommunityPosts}
            refreshIntervalMs={8000}
            initialPostId={pendingCommunityPostId}
            onInitialPostHandled={() => setPendingCommunityPostId(null)}
          />
          ) : activeScreen === 'home' ? (
            <Dashboard2
              announcements={teacherAnnouncements}
              courses={effectiveCourses}
              onOpenCourse={(course: CourseDetailData) => handleOpenCourse(course)}
              onCreateClass={(course: CourseDetailData) => handleCreateClass(course)}
              onDeleteCourse={handleDeleteCourse}
              currentTeacher={activeProfile}
              isLoading={isLoadingClasses || isLoadingAnnouncements}
              showVerticalIndicator={true}
            />
          ) : activeScreen === 'honors' ? (
            <Honors apiBaseUrl={API_BASE_URL} />
          ) : activeScreen === 'grades' ? (
            <Grades apiBaseUrl={API_BASE_URL} />
          ) : activeScreen === 'announcement' ? (
            <ShareAnnouncement
              apiBaseUrl={API_BASE_URL}
              currentTeacher={activeProfile}
              classes={effectiveCourses.map((course) => ({
                id: course.id,
                name: course.name,
                courseCode: course.courseCode,
                classCode: course.classCode,
                section: course.section,
                year: course.year,
                semester: course.semester,
              }))}
              onShared={async () => {
                await loadTeacherAnnouncements();
                await loadTeacherNotifications();
                setActiveScreen('home');
              }}
            />
          ) : activeScreen === 'community' ? (
            <Community2
            searchQuery={globalSearchQuery}
            posts={hydratedCommunityPosts}
            userName={teacherFullName}
            userEmail={teacherEmail}
            userAvatar={currentUserAvatar}
            onCreatePost={handleCreateCommunityPost}
            onAddAnswer={handleAddCommunityAnswer}
            onEditPost={handleEditCommunityPost}
            onDeletePost={handleDeleteCommunityPost}
            onEditAnswer={handleEditCommunityAnswer}
            onDeleteAnswer={handleDeleteCommunityAnswer}
            onRefresh={loadCommunityPosts}
            refreshIntervalMs={8000}
          />
          ) : activeScreen === 'messenger' ? (
            <TeacherMessenger
              onBack={() => setActiveScreen(lastScreen)}
              searchQuery={globalSearchQuery}
              onClearSearch={handleClearGlobalSearch}
              currentUser={activeProfile?.teacherId || ''}
              currentUserUid={activeProfile?.authUid || ''}
              currentUserName={teacherFullName}
              courses={messengerCourses}
              onUnreadCountChanged={loadMessengerUnreadCount}
            />
          ) : activeScreen === 'coursedetail' ? (
            <Coursedetail2
              onBack={() => setActiveScreen(lastScreen)}
              course={selectedCourse || undefined}
              currentTeacher={activeProfile}
              availableCourses={effectiveCourses}
              initialAssignmentId={pendingAssignmentId}
              onInitialAssignmentHandled={() => setPendingAssignmentId(null)}
              initialCommentStudentId={pendingCommentStudentId}
              onInitialCommentStudentHandled={() => setPendingCommentStudentId(null)}
            />
          ) : activeScreen === 'notification' ? (
            <TeacherNotification
              mode="screen"
              notifications={teacherNotifications}
              apiBaseUrl={API_BASE_URL}
              userId={teacherIdentity}
              role="teacher"
              onNotificationsUpdated={setTeacherNotifications}
              onNavigate={handleNotificationNavigate}
              onBack={() => setActiveScreen(lastScreen)}
            />
          ) : activeScreen === 'analytics' ? (
            <TeacherAnalytics
              teacherName={teacherFullName}
              selectedCourseName={selectedCourse?.name || 'Academic Analytics'}
              selectedClass={selectedAnalyticsClass}
              onChangeSelectedClass={setSelectedAnalyticsClass}
              availableCourses={effectiveCourses}
              students={analyticsStudents}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Select a screen from the menu.</Text>
            </View>
          )}
        </View>
      </View>

      {!isLargeScreen && isMobileDrawerOpen && (
        <View style={styles.mobileDrawerLayer} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.mobileBackdrop}
            onPress={() => setMobileDrawerOpen(false)}
            activeOpacity={1}
          />

          <View
            style={[
              styles.mobileOverlay,
              {
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
              },
            ]}
          >
            {/* 🔥 FIX: Pass userAvatarStoragePath to mobile drawer */}
            <TeacherDrawerMenu
              isFixed={false}
              onClose={() => setMobileDrawerOpen(false)}
              activeScreen={activeScreen}
              onNavigate={handleDrawerNavigate}
              userName={teacherFullName}
              userEmail={teacherEmail}
              userAvatar={currentUserAvatar}
              userAvatarStoragePath={activeProfile?.profileImageStoragePath || null}
              userId={teacherIdentity}
              userRole="teacher"
              apiBaseUrl={API_BASE_URL}
              onAvatarPress={() => {
                setMobileDrawerOpen(false);
                navigateTo('profile');
              }}
              onEmailUpdated={handleDrawerEmailUpdated}
              setIsLoggedIn={handleSetIsLoggedIn}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerWrapper: {
    zIndex: 20,
    backgroundColor: '#fff',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopDrawer: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: '#EEE',
    backgroundColor: '#FFF',
  },
  screenContainer: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFF',
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
  mobileDrawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  mobileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  mobileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    maxWidth: '82%',
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 3, height: 0 },
    elevation: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
});