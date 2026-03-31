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
          <Text style={styles.menuIconText}>☰</Text>
        </TouchableOpacity>
      )}

      <View style={styles.contentWrapper}>
        {isLargeScreen && (
          <DrawerMenu
            isFixed={true}
            activeScreen={activeScreen}
            onNavigate={navigateTo}
            userName={CURRENT_USER_FULL_NAME}
            userEmail={CURRENT_USER_EMAIL}
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
                userName={CURRENT_USER_FULL_NAME}
                userEmail={CURRENT_USER_EMAIL}
                setIsLoggedIn={handleSetIsLoggedIn}
              />
            </View>
          </>
        )}

        <View style={styles.screenContainer}>
          {activeScreen === 'profile' ? (
            <Profile2
              userPosts={userPosts}
              onBack={() => setActiveScreen(lastScreen)}
              onLogout={onLogout}
              onCreatePost={openPostModal}
            />
          ) : activeScreen === 'home' ? (
            <Dashboard2
              announcements={ANNOUNCEMENTS}
              onOpenCourse={() => setActiveScreen('coursedetail')}
              onCreateClass={() => console.log('Create Class Pressed')}
            />
          ) : activeScreen === 'game' ? (
            <Honors />
          ) : activeScreen === 'grades' ? (
            <Grades />
          ) : activeScreen === 'videos' ? (
            <ShareAnnouncement />
          ) : activeScreen === 'community' ? (
            <Community2
              posts={posts}
              userName={CURRENT_USER_NAME}
              onCreatePost={openPostModal}
            />
          ) : activeScreen === 'messenger' ? (
            <TeacherMessenger
              searchQuery=""
              onConversationActiveChange={() => {}}
            />
          ) : activeScreen === 'coursedetail' ? (
            <Coursedetail2 onBack={() => setActiveScreen('home')} />
          ) : activeScreen === 'notification' ? (
            <TeacherNotification />
          ) : (
            <View style={styles.emptyState}>
              <Text>Select a screen from the menu.</Text>
            </View>
          )}
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
  menuIconText: {
    fontSize: 24,
    color: '#D32F2F',
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
    backgroundColor: '#FFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});