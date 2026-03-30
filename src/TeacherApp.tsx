import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnnouncementModal2, {
  Announcement,
} from './teacher_components/TeacherAnnouncementModal';
import DrawerMenu from './teacher_components/TeacherDrawerMenu';
import Header, { ScreenType } from './teacher_components/TeacherHeader';

import Grades from './teacher_components/Grades';
import Honors from './teacher_components/Honors';
import Coursedetail2 from './teacher_components/TeacherCourseDetail2';
import PostQueryModal2 from './teacher_components/TeacherPostQueryModal';
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

const CURRENT_USER_NAME = 'Ramcee Jade';
const CURRENT_USER_FULL_NAME = 'Ramcee Jade L. Munoz';
const CURRENT_USER_EMAIL = 'teacher@email.com';
const CURRENT_USER_AVATAR = require('../assets/images/avatar.jpg');

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Welcome Back!',
    message: 'Check out the latest updates and announcements from your courses.',
    bannerImage: require('../assets/announcement/1.png'),
  },
  {
    id: '2',
    title: 'Midterm Grading',
    message: 'Please ensure all midterm grades are encoded by the end of the week.',
    bannerImage: require('../assets/announcement/1.png'),
  },
];

const COLORS = {
  background: '#F6F8FB',
  surface: '#FFFFFF',
  border: '#E6EAF0',
  text: '#1F2937',
  subtext: '#6B7280',
  primary: '#D32F2F',
  primarySoft: '#FFF1F1',
  overlay: 'rgba(0,0,0,0.35)',
};

const PAGE_TITLES: Record<ScreenType, string> = {
  home: 'Dashboard',
  game: 'Honors',
  grades: 'Grades',
  videos: 'Announcements',
  myjourney: 'My Journey',
  profile: 'Profile',
  messenger: 'Messages',
  assignments: 'Assignments',
  coursedetail: 'Course Details',
  community: 'Community',
  notification: 'Notifications',
};

const PAGE_SUBTITLES: Partial<Record<ScreenType, string>> = {
  home: 'Overview of your classes, activities, and recent updates.',
  grades: 'Review, encode, and manage student performance.',
  community: 'Ask questions and engage with the teacher community.',
  messenger: 'Stay connected with students and class groups.',
  profile: 'Manage your account and review your posts.',
  videos: 'Create and share announcements with your students.',
  notification: 'See your latest alerts and updates.',
  coursedetail: 'Review lessons, schedules, and related course information.',
};

export default function TeacherApp({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [lastScreen, setLastScreen] = useState<ScreenType>('home');
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isPostModalVisible, setPostModalVisible] = useState(false);

  const [posts, setPosts] = useState<CommunityPost[]>([
    {
      id: '1',
      userName: CURRENT_USER_NAME,
      avatar: CURRENT_USER_AVATAR,
      content: 'Welcome to the teacher community!',
      dateTime: 'Just now',
      answers: [] as CommunityAnswer[],
    },
  ]);

  const userPosts = useMemo(() => {
    return posts.filter((post) => post.userName === CURRENT_USER_NAME);
  }, [posts]);

  const navigateTo = (screen: ScreenType) => {
    setLastScreen(activeScreen);
    setActiveScreen(screen);

    if (!isLargeScreen) {
      setMobileDrawerOpen(false);
    }
  };

  const openPostModal = () => {
    setPostModalVisible(true);
  };

  const closePostModal = () => {
    setPostModalVisible(false);
  };

  const handleCreatePost = (query: string) => {
    const trimmed = query.trim();

    if (!trimmed) {
      closePostModal();
      return;
    }

    const newPost: CommunityPost = {
      id: Date.now().toString(),
      userName: CURRENT_USER_NAME,
      avatar: CURRENT_USER_AVATAR,
      content: trimmed,
      dateTime: new Date().toLocaleString(),
      answers: [] as CommunityAnswer[],
    };

    setPosts((prevPosts) => [newPost, ...prevPosts]);
    closePostModal();
  };

  const handleSetIsLoggedIn = (val: boolean) => {
    if (!val) {
      onLogout();
    }
  };

  const renderScreen = () => {
    if (activeScreen === 'profile') {
      return (
        <Profile2
          userPosts={userPosts}
          onBack={() => setActiveScreen(lastScreen)}
          onLogout={onLogout}
          onCreatePost={openPostModal}
        />
      );
    }

    if (activeScreen === 'home') {
      return (
        <Dashboard2
          announcements={ANNOUNCEMENTS}
          onOpenCourse={() => setActiveScreen('coursedetail')}
          onCreateClass={() => console.log('Create Class Pressed')}
        />
      );
    }

    if (activeScreen === 'game') {
      return <Honors />;
    }

    if (activeScreen === 'grades') {
      return <Grades />;
    }

    if (activeScreen === 'videos') {
      return <ShareAnnouncement />;
    }

    if (activeScreen === 'community') {
      return (
        <Community2
          posts={posts}
          userName={CURRENT_USER_NAME}
          onCreatePost={openPostModal}
        />
      );
    }

    if (activeScreen === 'messenger') {
      return (
        <TeacherMessenger
          searchQuery=""
          onConversationActiveChange={() => {}}
        />
      );
    }

    if (activeScreen === 'coursedetail') {
      return <Coursedetail2 onBack={() => setActiveScreen('home')} />;
    }

    if (activeScreen === 'notification') {
      return <TeacherNotification />;
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Select a screen from the menu.</Text>
        <Text style={styles.emptySubtitle}>
          Choose a section to continue managing your teacher app.
        </Text>
      </View>
    );
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
          activeOpacity={0.9}
        >
          <Text style={styles.menuIconText}>☰</Text>
        </TouchableOpacity>
      )}

      <View style={styles.contentWrapper}>
        {isLargeScreen && (
          <View style={styles.sidebarWrapper}>
            <DrawerMenu
              isFixed={true}
              activeScreen={activeScreen}
              onNavigate={navigateTo}
              userName={CURRENT_USER_FULL_NAME}
              userEmail={CURRENT_USER_EMAIL}
              setIsLoggedIn={handleSetIsLoggedIn}
            />
          </View>
        )}

        {!isLargeScreen && isMobileDrawerOpen && (
          <>
            <TouchableOpacity
              style={styles.mobileBackdrop}
              onPress={() => setMobileDrawerOpen(false)}
              activeOpacity={1}
            />
            <View style={styles.mobileOverlay}>
              <DrawerMenu
                isFixed={false}
                onClose={() => setMobileDrawerOpen(false)}
                activeScreen={activeScreen}
                onNavigate={navigateTo}
                userName={CURRENT_USER_FULL_NAME}
                userEmail={CURRENT_USER_EMAIL}
                setIsLoggedIn={handleSetIsLoggedIn}
              />
            </View>
          </>
        )}

        <View style={styles.screenContainer}>
          <View style={styles.pageHeaderCard}>
            <Text style={styles.pageTitle}>{PAGE_TITLES[activeScreen]}</Text>
            {!!PAGE_SUBTITLES[activeScreen] && (
              <Text style={styles.pageSubtitle}>
                {PAGE_SUBTITLES[activeScreen]}
              </Text>
            )}
          </View>

          <View style={styles.pageContentCard}>{renderScreen()}</View>
        </View>
      </View>

      <PostQueryModal2
        visible={isPostModalVisible}
        onClose={closePostModal}
        onPost={handleCreatePost}
      />

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
    backgroundColor: COLORS.background,
  },

  contentWrapper: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: COLORS.background,
  },

  sidebarWrapper: {
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  screenContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },

  pageHeaderCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 14,
  },

  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
  },

  pageSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.subtext,
  },

  pageContentCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    overflow: 'hidden',
  },

  floatingMenuBtn: {
    position: 'absolute',
    top: 18,
    left: 16,
    zIndex: 50,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  menuIconText: {
    fontSize: 22,
    color: COLORS.primary,
    fontWeight: '700',
  },

  mobileBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    zIndex: 60,
  },

  mobileOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 70,
    backgroundColor: 'transparent',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },

  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
});