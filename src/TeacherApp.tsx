import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- Components & Modals ---
// teacher_components/AnnouncementModal2.tsx
import AnnouncementModal2, { Announcement } from './teacher_components/TeacherAnnouncementModal';

// Ensure the Banner also points to the same folder if it's there
import DrawerMenu from './teacher_components/TeacherDrawerMenu';
import Header from './teacher_components/TeacherHeader';

// --- Teacher Specific components ---
import Grades from './teacher_components/Grades';
import Honors from './teacher_components/Honors';
import Coursedetail2 from './teacher_components/TeacherCourseDetail2';
import PostQueryModal2 from './teacher_components/TeacherPostQueryModal';
import Profile2 from './teacher_components/TeacherProfile';
import ShareAnnouncement from './teacher_components/TeacherShareAnnouncement';

// --- Shared Screens ---
import Messenger from './screens/Messenger';
import Community2 from './teacher_components/TeacherCommunity';
import Dashboard2 from './teacher_components/TeacherDashboard';

interface Props {
  onLogout: () => void;
}

// --- Updated with two announcements ---
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
    bannerImage: require('../assets/announcement/1.png'), // Replace with specific asset if available
  },
];

export default function TeacherApp({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [activeScreen, setActiveScreen] = useState<
    'home' | 'game' | 'grades' | 'videos' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'community' | 'coursedetail'
  >('home');
  
  const [lastScreen, setLastScreen] = useState(activeScreen);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isPostModalVisible, setPostModalVisible] = useState(false);

  const navigateTo = (screen: any) => {
    setLastScreen(activeScreen);
    setActiveScreen(screen);
    if (!isLargeScreen) setMobileDrawerOpen(false);
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      
      <Header
        isLargeScreen={isLargeScreen}
        activeScreen={activeScreen}
        onNavigate={navigateTo}
        onSearchChange={() => {}}
      />

      {!isLargeScreen && (
        <TouchableOpacity
          style={styles.floatingMenuBtn}
          onPress={() => setMobileDrawerOpen(!isMobileDrawerOpen)}
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
            userName="Ramcee Jade L. Munoz"
            userEmail="teacher@email.com"
            setIsLoggedIn={onLogout}
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
                activeScreen={activeScreen}
                onNavigate={navigateTo}
                userName="Ramcee Jade L. Munoz"
                setIsLoggedIn={onLogout}
              />
            </View>
          </>
        )}

        <View style={{ flex: 1 }}>
          {activeScreen === 'profile' ? (
            <Profile2 
              userPosts={[]} 
              onBack={() => setActiveScreen(lastScreen)}
              onLogout={onLogout}
              onCreatePost={() => setPostModalVisible(true)}
            />
          ) : activeScreen === 'home' ? (
            <Dashboard2
  announcements={ANNOUNCEMENTS} 
  onOpenCourse={() => setActiveScreen('coursedetail')}
  onCreateClass={() => console.log("Create Class Pressed")}
/>
          ) : activeScreen === 'game' ? (
            <Honors />
          ) : activeScreen === 'grades' ? (
            <Grades />
          ) : activeScreen === 'videos' ? (
            <ShareAnnouncement />
          ) : activeScreen === 'community' ? (
            <Community2 
               posts={[]} 
               userName="Ramcee Jade" 
               onCreatePost={() => setPostModalVisible(true)} 
            />
          ) : activeScreen === 'messenger' ? (
            <Messenger searchQuery="" onConversationActiveChange={() => {}} />
          ) : activeScreen === 'coursedetail' ? (
            <Coursedetail2 onBack={() => setActiveScreen('home')} />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Select a screen from the menu.</Text>
            </View>
          )}
        </View>
      </View>

      <PostQueryModal2
        visible={isPostModalVisible}
        onClose={() => setPostModalVisible(false)}
        onPost={(query: string) => {
          console.log("New Post:", query);
          setPostModalVisible(false);
        }}
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
  mainContainer: { flex: 1, backgroundColor: '#fff' },
  contentWrapper: { flex: 1, flexDirection: 'row' },
  floatingMenuBtn: {
    position: 'absolute', top: 135, left: 16, zIndex: 50,
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF',
    borderWidth: 1, borderColor: '#D32F2F', justifyContent: 'center', alignItems: 'center',
  },
  menuIconText: { fontSize: 24, color: '#D32F2F' },
  mobileBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 60 },
  mobileOverlay: { position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 70, backgroundColor: '#FFF' },
});