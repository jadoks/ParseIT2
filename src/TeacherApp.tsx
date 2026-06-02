import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import AnnouncementModal2, {
  Announcement,
} from './teacher_components/TeacherAnnouncementModal';
import TeacherDrawerMenu from './teacher_components/TeacherDrawerMenu';
import TeacherHeader from './teacher_components/TeacherHeader';

import Grades from './teacher_components/Grades';
import Honors from './teacher_components/Honors';
import Coursedetail2, {
  CourseDetailData,
} from './teacher_components/TeacherCourseDetail2';
import Profile2 from './teacher_components/TeacherProfile';
import ShareAnnouncement from './teacher_components/TeacherShareAnnouncement';

import TeacherAnalytics from './teacher_components/TeacherAnalytics';
import Community2, { CommunityPost } from './teacher_components/TeacherCommunity';
import Dashboard2 from './teacher_components/TeacherDashboard';
import TeacherMessenger from './teacher_components/TeacherMessenger';
import TeacherNotification, {
  NotificationItem,
} from './teacher_components/TeacherNotification';

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

interface Props {
  onLogout: () => void;
  currentTeacher: SignedInTeacher;
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

const apiFetch = (url: string, options: any = {}) =>
  fetch(url, {
    credentials: 'include',
    ...options,
  });

const TEACHER_ALLOWED_NOTIFICATION_TYPES = new Set([
  'submitted-assignment',
  'community-answer',
  'student-at-risk',
  'class-assigned',
]);

export default function TeacherApp({ onLogout, currentTeacher }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLargeScreen = width >= 768;
  const isMobile = width < 768;

  const [activeScreen, setActiveScreen] = useState<AppScreenType>('home');
  const [lastScreen, setLastScreen] = useState<AppScreenType>('home');
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [courses, setCourses] = useState<CourseWithIcon[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<CourseWithIcon[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithIcon | null>(null);

  const [selectedAnalyticsClass, setSelectedAnalyticsClass] = useState<string>('All');
  const [analyticsStudents, setAnalyticsStudents] = useState<any[]>([]);

  const [teacherProfile, setTeacherProfile] = useState<SignedInTeacher | null>(null);
  const [teacherNotifications, setTeacherNotifications] = useState<NotificationItem[]>([]);
  const [teacherAnnouncements, setTeacherAnnouncements] = useState<TeacherClassAnnouncement[]>([]);

  const currentTeacherData: SignedInTeacher = teacherProfile || currentTeacher;

  const teacherFullName = useMemo(() => {
    const first = normalizeText(currentTeacherData?.firstName);
    const last = normalizeText(currentTeacherData?.lastName);
    return `${first} ${last}`.trim() || 'Teacher';
  }, [currentTeacherData]);

  const teacherEmail = useMemo(() => {
    return normalizeText(currentTeacherData?.email);
  }, [currentTeacherData]);

  const teacherIdentity = useMemo(() => {
    return (
      normalizeText(currentTeacherData?.teacherId) ||
      normalizeText(currentTeacherData?.authUid || '') ||
      teacherEmail ||
      teacherFullName
    );
  }, [currentTeacherData, teacherEmail, teacherFullName]);

  const initialAvatar = currentTeacherData?.profileImage
    ? { uri: currentTeacherData.profileImage }
    : null;

  const initialBanner = currentTeacherData?.bannerImage
    ? { uri: currentTeacherData.bannerImage }
    : null;

  const [currentUserAvatar, setCurrentUserAvatar] = useState<any>(initialAvatar);
  const [currentUserBanner, setCurrentUserBanner] = useState<any>(initialBanner);

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);

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

  useEffect(() => {
    if (currentTeacherData?.profileImage) {
      setCurrentUserAvatar({ uri: currentTeacherData.profileImage });
    }
  }, [currentTeacherData?.profileImage]);

  useEffect(() => {
    if (currentTeacherData?.bannerImage) {
      setCurrentUserBanner({ uri: currentTeacherData.bannerImage });
    }
  }, [currentTeacherData?.bannerImage]);

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

  const loadTeacherProfile = async () => {
    const teacherId =
      currentTeacher.teacherId ||
      currentTeacher.authUid ||
      currentTeacher.email;

    if (!teacherId) return;

    try {
      const response = await apiFetch(`${API_BASE_URL}/auth/user-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  };

  const loadTeacherNotifications = useCallback(async () => {
    const teacherId =
      normalizeText(currentTeacherData?.teacherId) ||
      normalizeText(currentTeacher?.teacherId);

    if (!teacherId) {
      setTeacherNotifications([]);
      return;
    }

    try {
      const response = await apiFetch(
        `${API_BASE_URL}/notifications?userId=${encodeURIComponent(
          teacherId
        )}&role=teacher`
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
  }, [currentTeacher?.teacherId, currentTeacherData?.teacherId]);

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
      const response = await apiFetch(`${API_BASE_URL}/classes`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load classes.');
      }

      const allClasses = Array.isArray(data) ? data : [];

      const filteredClasses = allClasses.filter((item: any) => {
        return (
          item.assignedTeacherId === currentTeacherData?.teacherId ||
          item.assignedTeacherUid === currentTeacherData?.authUid ||
          item.instructorEmail === currentTeacherData?.email
        );
      });

      setTeacherClasses(filteredClasses);
    } catch (error) {
      console.log('LOAD TEACHER CLASSES ERROR =>', error);
      setTeacherClasses([]);
    }
  }, [
    currentTeacherData?.teacherId,
    currentTeacherData?.authUid,
    currentTeacherData?.email,
  ]);

  const loadTeacherAnalytics = useCallback(async () => {
    const teacherId =
      normalizeText(currentTeacherData?.teacherId) ||
      normalizeText(currentTeacher?.teacherId) ||
      normalizeText(currentTeacherData?.authUid || '') ||
      normalizeText(currentTeacherData?.email);

    if (!teacherId) {
      setAnalyticsStudents([]);
      return;
    }

    try {
      const response = await apiFetch(
        `${API_BASE_URL}/teacher-analytics/${encodeURIComponent(teacherId)}`
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
    currentTeacherData?.teacherId,
    currentTeacherData?.authUid,
    currentTeacherData?.email,
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
        const response = await apiFetch(`${API_BASE_URL}/class-announcements/${classId}`);
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
    (
      activeScreen === 'coursedetail' ||
      activeScreen === 'messenger' ||
      activeScreen === 'notification'
    );

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

  const normalizeCommunityAvatar = (avatar: any) => {
    if (!avatar) return null;
    if (typeof avatar === 'string') return avatar;
    if (avatar?.uri) return avatar.uri;
    return null;
  };

  const loadCommunityPosts = async () => {
    try {
      const response = await apiFetch(`${API_BASE_URL}/community-posts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load community posts.');
      }

      setCommunityPosts(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.log('LOAD TEACHER COMMUNITY POSTS ERROR =>', error);
    }
  };

  useEffect(() => {
    loadTeacherProfile();
    loadCommunityPosts();
  }, [currentTeacher?.teacherId, currentTeacher?.authUid, currentTeacher?.email]);

  useEffect(() => {
    loadTeacherNotifications();
  }, [loadTeacherNotifications]);

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

  const handleSearchChange = (_query: string) => {};

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
      currentTeacherData?.teacherId ||
      currentTeacherData?.authUid ||
      currentTeacherData?.email
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

    const response = await apiFetch(`${API_BASE_URL}/auth/update-user-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      const response = await apiFetch(`${API_BASE_URL}/community-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmedQuery,
          authorId: currentTeacherData?.teacherId || teacherIdentity,
          authorUid: currentTeacherData?.authUid || null,
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
      const response = await apiFetch(`${API_BASE_URL}/community-posts/${postId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedMessage,
          authorId: currentTeacherData?.teacherId || teacherIdentity,
          authorUid: currentTeacherData?.authUid || null,
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
      const response = await apiFetch(`${API_BASE_URL}/community-posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await apiFetch(`${API_BASE_URL}/community-posts/${postId}`, {
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
      await loadTeacherNotifications();
    } catch (error: any) {
      Alert.alert('Update Failed', error?.message || 'Unable to update answer.');
    }
  };

  const handleDeleteCommunityAnswer = async (postId: string, answerId: string) => {
    try {
      const response = await apiFetch(
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
      await loadTeacherNotifications();
    } catch (error: any) {
      Alert.alert('Delete Failed', error?.message || 'Unable to delete answer.');
    }
  };

  const handleDrawerEmailUpdated = (nextEmail: string) => {
    setTeacherProfile((prev) => ({
      ...(prev || currentTeacherData || {}),
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

  return (
    <SafeAreaView
      style={styles.mainContainer}
      edges={
        shouldHideMobileHeader
          ? ['left', 'right', 'bottom']
          : ['top', 'left', 'right', 'bottom']
      }
    >
      {!shouldHideMobileHeader && (
        <View style={styles.headerWrapper}>
          <TeacherHeader
            isLargeScreen={isLargeScreen}
            activeScreen={activeScreen}
            onNavigate={handleHeaderNavigate}
            onSearchChange={handleSearchChange}
            onMenuPress={() => {
              if (!isProfileScreen) {
                setMobileDrawerOpen((prev) => !prev);
              }
            }}
            notificationCount={unreadNotificationCount}
            onNotificationPress={handleNotificationPress}
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
            <TeacherDrawerMenu
              isFixed={true}
              activeScreen={activeScreen}
              onNavigate={handleDrawerNavigate}
              userName={teacherFullName}
              userEmail={teacherEmail}
              userAvatar={currentUserAvatar}
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
              onChangeProfileImage={handleChangeProfileImage}
              onChangeBannerImage={handleChangeBannerImage}
            />
          ) : activeScreen === 'home' ? (
            <Dashboard2
              announcements={teacherAnnouncements}
              courses={effectiveCourses}
              onOpenCourse={(course: CourseDetailData) => handleOpenCourse(course)}
              onCreateClass={(course: CourseDetailData) => handleCreateClass(course)}
              onDeleteCourse={handleDeleteCourse}
              currentTeacher={currentTeacherData}
            />
          ) : activeScreen === 'honors' ? (
            <Honors />
          ) : activeScreen === 'grades' ? (
            <Grades />
          ) : activeScreen === 'announcement' ? (
            <ShareAnnouncement
              apiBaseUrl={API_BASE_URL}
              currentTeacher={currentTeacherData}
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
                setShowAnnouncement(true);
                setActiveScreen('home');
              }}
            />
          ) : activeScreen === 'community' ? (
            <Community2
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
            />
          ) : activeScreen === 'messenger' ? (
            <TeacherMessenger
              searchQuery=""
              onConversationActiveChange={() => {}}
              currentUser={teacherIdentity}
              currentUserName={teacherFullName}
              courses={messengerCourses}
              onBack={() => setActiveScreen(lastScreen)}
            />
          ) : activeScreen === 'coursedetail' ? (
            <Coursedetail2
              onBack={() => setActiveScreen(lastScreen)}
              course={selectedCourse || undefined}
              currentTeacher={currentTeacherData}
              availableCourses={effectiveCourses}
            />
          ) : activeScreen === 'notification' ? (
            <TeacherNotification
              mode="screen"
              notifications={teacherNotifications}
              apiBaseUrl={API_BASE_URL}
              userId={teacherIdentity}
              role="teacher"
              onNotificationsUpdated={setTeacherNotifications}
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

      {!isLargeScreen && isMobileDrawerOpen && !isProfileScreen && (
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
            <TeacherDrawerMenu
              isFixed={false}
              onClose={() => setMobileDrawerOpen(false)}
              activeScreen={activeScreen}
              onNavigate={handleDrawerNavigate}
              userName={teacherFullName}
              userEmail={teacherEmail}
              userAvatar={currentUserAvatar}
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

      <AnnouncementModal2
        visible={
          activeScreen === 'home' &&
          showAnnouncement &&
          teacherAnnouncements.length > 0
        }
        onClose={() => setShowAnnouncement(false)}
        announcements={teacherAnnouncements}
      />
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
