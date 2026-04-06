import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import AnnouncementModal2, {
  Announcement,
} from './teacher_components/TeacherAnnouncementModal';
import DrawerMenu from './teacher_components/TeacherDrawerMenu';
import Header, { ScreenType } from './teacher_components/TeacherHeader';

import Grades from './teacher_components/Grades';
import Honors from './teacher_components/Honors';
import Coursedetail2, {
  CourseDetailData,
} from './teacher_components/TeacherCourseDetail2';
import Profile2 from './teacher_components/TeacherProfile';
import ShareAnnouncement from './teacher_components/TeacherShareAnnouncement';

import Community2, {
  CommunityAnswer,
  CommunityPost,
} from './teacher_components/TeacherCommunity';
import Dashboard2 from './teacher_components/TeacherDashboard';
import TeacherMessenger from './teacher_components/TeacherMessenger';
import TeacherNotification from './teacher_components/TeacherNotification';

interface Props {
  onLogout: () => void;
}

type CourseWithIcon = CourseDetailData & {
  icon?: string;
};

type MessengerCourse = {
  id: string;
  name: string;
  instructor: string;
  semester: string;
  schoolYear: string;
  section?: string;
};

const CURRENT_USER_NAME = 'Ramcee Jade L. Munoz';
const CURRENT_USER_EMAIL = 'teacher@email.com';

const CURRENT_USER_PROFILE_IMAGE = require('../assets/images/avatar.jpg');
const DEFAULT_BANNER_IMAGE = require('../assets/announcement/3.png');
const OTHER_USERS_PROFILE_IMAGE = require('../assets/images/default_profile.png');

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Welcome Back!',
    message: 'Check out the latest updates and announcements.',
    bannerImage: require('../assets/announcement/1.png'),
  },
  {
    id: '2',
    title: 'Midterm Grading',
    message: 'Please ensure all midterm grades are encoded by the end of the week.',
    bannerImage: require('../assets/announcement/2.png'),
  },
  {
    id: '3',
    title: 'Question Answers',
    message: 'Check your Question Answered from community.',
    bannerImage: require('../assets/announcement/3.png'),
  },
];

const INITIAL_COURSES: CourseWithIcon[] = [
  {
    id: '1',
    name: 'Web Development 101',
    courseCode: 'CS-101',
    classCode: 'WD101A1',
    instructor: CURRENT_USER_NAME,
    section: 'A',
    bannerUri: undefined,
    icon: 'web',
  },
  {
    id: '2',
    name: 'Programming Logic',
    courseCode: 'CS-102',
    classCode: 'PL102B2',
    instructor: CURRENT_USER_NAME,
    section: 'B',
    bannerUri: undefined,
    icon: 'code-tags',
  },
  {
    id: '3',
    name: 'Computer Fundamentals',
    courseCode: 'IT-100',
    classCode: 'CF100C3',
    instructor: CURRENT_USER_NAME,
    section: 'C',
    bannerUri: undefined,
    icon: 'desktop-classic',
  },
];

const INITIAL_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: '1',
    userName: 'Maria Santos',
    userEmail: 'maria@email.com',
    avatar: OTHER_USERS_PROFILE_IMAGE,
    content: 'Please double-check your grade submissions before Friday.',
    dateTime: 'Feb 24, 2026 10:30 AM',
    answers: [
      {
        id: 'a1',
        userName: 'John Reyes',
        avatar: OTHER_USERS_PROFILE_IMAGE,
        answeredAt: 'Feb 24, 2026 11:00 AM',
        message: 'Noted, thank you!',
      },
    ],
  },
  {
    id: '2',
    userName: CURRENT_USER_NAME,
    userEmail: CURRENT_USER_EMAIL,
    avatar: CURRENT_USER_PROFILE_IMAGE,
    content: 'Does anyone have a good rubric template for project presentations?',
    dateTime: 'Feb 23, 2026 11:30 AM',
    answers: [
      {
        id: 'a2',
        userName: 'Allan Reyes',
        avatar: OTHER_USERS_PROFILE_IMAGE,
        answeredAt: 'Feb 23, 2026 01:20 PM',
        message: 'I can share mine later.',
      },
    ],
  },
];

export default function TeacherApp({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [lastScreen, setLastScreen] = useState<ScreenType>('home');
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [courses, setCourses] = useState<CourseWithIcon[]>(INITIAL_COURSES);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithIcon | null>(
    INITIAL_COURSES[0]
  );

  const [currentUserAvatar, setCurrentUserAvatar] = useState<any>(
    CURRENT_USER_PROFILE_IMAGE
  );
  const [currentUserBanner, setCurrentUserBanner] = useState<any>(
    DEFAULT_BANNER_IMAGE
  );

  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(
    INITIAL_COMMUNITY_POSTS
  );

  const hydratedCommunityPosts = useMemo<CommunityPost[]>(() => {
    return communityPosts.map((post) => ({
      ...post,
      avatar:
        post.userEmail === CURRENT_USER_EMAIL || post.userName === CURRENT_USER_NAME
          ? currentUserAvatar
          : post.avatar,
      answers: post.answers.map((answer) => ({
        ...answer,
        avatar:
          answer.userName === CURRENT_USER_NAME
            ? currentUserAvatar
            : answer.avatar,
      })),
    }));
  }, [communityPosts, currentUserAvatar]);

  const currentUserPosts = useMemo(() => {
    return hydratedCommunityPosts.filter(
      (post) =>
        post.userName === CURRENT_USER_NAME ||
        post.userEmail === CURRENT_USER_EMAIL
    );
  }, [hydratedCommunityPosts]);

  const messengerCourses = useMemo<MessengerCourse[]>(
    () =>
      courses.map((course) => ({
        id: course.id,
        name: course.name,
        instructor: course.instructor,
        semester: '2nd Semester',
        schoolYear: '2025-2026',
        section: course.section,
      })),
    [courses]
  );

  const navigateTo = (screen: ScreenType) => {
    setLastScreen(activeScreen);
    setActiveScreen(screen);

    if (!isLargeScreen) {
      setMobileDrawerOpen(false);
    }
  };

  const handleChangeProfileImage = (image: any) => {
    setCurrentUserAvatar(image);
  };

  const handleChangeBannerImage = (image: any) => {
    setCurrentUserBanner(image);
  };

  const handleCreateCommunityPost = (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    const newPost: CommunityPost = {
      id: `community-post-${Date.now()}`,
      userName: CURRENT_USER_NAME,
      userEmail: CURRENT_USER_EMAIL,
      avatar: currentUserAvatar,
      dateTime: new Date().toLocaleString(),
      content: trimmedQuery,
      answers: [],
    };

    setCommunityPosts((prev) => [newPost, ...prev]);
  };

  const handleAddCommunityAnswer = (postId: string, message: string) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const newAnswer: CommunityAnswer = {
      id: `community-answer-${Date.now()}`,
      userName: CURRENT_USER_NAME,
      avatar: currentUserAvatar,
      answeredAt: new Date().toLocaleString(),
      message: trimmedMessage,
    };

    setCommunityPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, answers: [...post.answers, newAnswer] }
          : post
      )
    );
  };

  const handleEditCommunityPost = (postId: string, content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    setCommunityPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, content: trimmedContent } : post
      )
    );
  };

  const handleDeleteCommunityPost = (postId: string) => {
    setCommunityPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const handleEditCommunityAnswer = (
    postId: string,
    answerId: string,
    message: string
  ) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    setCommunityPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              answers: post.answers.map((answer) =>
                answer.id === answerId
                  ? { ...answer, message: trimmedMessage }
                  : answer
              ),
            }
          : post
      )
    );
  };

  const handleDeleteCommunityAnswer = (postId: string, answerId: string) => {
    setCommunityPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              answers: post.answers.filter((answer) => answer.id !== answerId),
            }
          : post
      )
    );
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
    setActiveScreen('coursedetail');
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
      instructor: CURRENT_USER_NAME,
      icon: getCourseIcon(newCourse.name),
    };

    setCourses((prev) => [courseWithIcon, ...prev]);
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      <Header
        isLargeScreen={isLargeScreen}
        activeScreen={activeScreen}
        onNavigate={navigateTo}
        onSearchChange={(_query) => {}}
      />

      {!isLargeScreen && (
        <TouchableOpacity
          style={styles.floatingMenuBtn}
          onPress={() => setMobileDrawerOpen((prev) => !prev)}
        >
          <MaterialCommunityIcons name="menu" size={24} color="#D32F2F" />
        </TouchableOpacity>
      )}

      <View style={styles.contentWrapper}>
        {isLargeScreen && (
          <DrawerMenu
            isFixed={true}
            activeScreen={activeScreen}
            onNavigate={navigateTo}
            userName={CURRENT_USER_NAME}
            userEmail={CURRENT_USER_EMAIL}
            userAvatar={currentUserAvatar}
            onAvatarPress={() => navigateTo('profile')}
            setIsLoggedIn={handleSetIsLoggedIn}
          />
        )}

        {!isLargeScreen && isMobileDrawerOpen && (
          <>
            <TouchableOpacity
              style={styles.mobileBackdrop}
              onPress={() => setMobileDrawerOpen(false)}
            />
            <View style={styles.mobileOverlay}>
              <DrawerMenu
                isFixed={false}
                onClose={() => setMobileDrawerOpen(false)}
                activeScreen={activeScreen}
                onNavigate={navigateTo}
                userName={CURRENT_USER_NAME}
                userEmail={CURRENT_USER_EMAIL}
                userAvatar={currentUserAvatar}
                onAvatarPress={() => {
                  setMobileDrawerOpen(false);
                  navigateTo('profile');
                }}
                setIsLoggedIn={handleSetIsLoggedIn}
              />
            </View>
          </>
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
              userName={CURRENT_USER_NAME}
              userEmail={CURRENT_USER_EMAIL}
              profileImage={currentUserAvatar}
              bannerImage={currentUserBanner}
              onChangeProfileImage={handleChangeProfileImage}
              onChangeBannerImage={handleChangeBannerImage}
            />
          ) : activeScreen === 'home' ? (
            <Dashboard2
              announcements={ANNOUNCEMENTS}
              courses={courses}
              onOpenCourse={(course: CourseDetailData) => handleOpenCourse(course)}
              onCreateClass={(course: CourseDetailData) => handleCreateClass(course)}
            />
          ) : activeScreen === 'game' ? (
            <Honors />
          ) : activeScreen === 'grades' ? (
            <Grades />
          ) : activeScreen === 'videos' ? (
            <ShareAnnouncement />
          ) : activeScreen === 'community' ? (
            <Community2
              posts={hydratedCommunityPosts}
              userName={CURRENT_USER_NAME}
              userEmail={CURRENT_USER_EMAIL}
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
              currentUser={CURRENT_USER_NAME}
              courses={messengerCourses}
              onBack={() => setActiveScreen(lastScreen)}
            />
          ) : activeScreen === 'coursedetail' ? (
            <Coursedetail2
              onBack={() => setActiveScreen(lastScreen)}
              course={selectedCourse || undefined}
            />
          ) : activeScreen === 'notification' ? (
            <TeacherNotification />
          ) : (
            <View style={styles.emptyState}>
              <Text>Select a screen from the menu.</Text>
            </View>
          )}
        </View>
      </View>

      <AnnouncementModal2
        visible={activeScreen === 'home' && showAnnouncement}
        onClose={() => setShowAnnouncement(false)}
        announcements={ANNOUNCEMENTS}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
  screenContainer: {
    flex: 1,
  },
  floatingMenuBtn: {
    position: 'absolute',
    top: 135,
    left: 16,
    zIndex: 50,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 60,
  },
  mobileOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 70,
    backgroundColor: '#ffffff22',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});