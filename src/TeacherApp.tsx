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
import AnnouncementModal, { Announcement } from './components/AnnouncementModal';
import ProfileModal2 from './teacher_components/ProfileModal2';

import DrawerMenu from './teacher_components/TeacherDrawerMenu';
import Header from './teacher_components/TeacherHeader';

// --- Teacher Specific components ---
import Coursedetail2 from './teacher_components/CourseDetail2';
import Grades from './teacher_components/Grades';
import Honors from './teacher_components/Honors';
import ShareAnnouncement from './teacher_components/ShareAnnouncement';

// --- Shared Screens ---
import Assignments from './screens/Assignments';
import Community from './screens/Community';
import Dashboard from './screens/Dashboard';
import Messenger from './screens/Messenger';
import MyJourney from './screens/MyJourney';

interface Props {
  onLogout: () => void;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Welcome Back!',
    message: 'Check out the latest updates and announcements from your courses.',
    bannerImage: require('../assets/announcement/1.png'),
  },
];

export default function TeacherApp({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  // State Management
  const [activeScreen, setActiveScreen] = useState<
    'home' | 'game' | 'grades' | 'videos' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'community' | 'coursedetail'
  >('home');
  
  const [lastScreen, setLastScreen] = useState(activeScreen);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Navigation Helper
  const navigateTo = (screen: any) => {
    setLastScreen(activeScreen);
    setActiveScreen(screen);
    if (!isLargeScreen) setMobileDrawerOpen(false);
  };

  return (
    <SafeAreaView style={styles.mainContainer}>
      
      {/* Header */}
      <Header
        isLargeScreen={isLargeScreen}
        activeScreen={activeScreen}
        onNavigate={navigateTo}
        onSearchChange={() => {}}
      />

      {/* Mobile Hamburger Menu Button */}
      {!isLargeScreen && (
        <TouchableOpacity
          style={styles.floatingMenuBtn}
          onPress={() => setMobileDrawerOpen(!isMobileDrawerOpen)}
        >
          <Text style={styles.menuIconText}>☰</Text>
        </TouchableOpacity>
      )}

      <View style={styles.contentWrapper}>
        
        {/* Desktop Sidebar */}
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

        {/* Mobile Sidebar Overlay */}
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

        {/* Dynamic Content Rendering */}
        <View style={{ flex: 1 }}>
          {activeScreen === 'profile' ? (
            <ProfileModal2
              visible={true}
              onClose={() => setActiveScreen(lastScreen)}
              userName="Ramcee Jade L. Munoz"
              userEmail="teacher@email.com"
              onAvatarPress={() => {}}
            />
          ) : activeScreen === 'home' ? (
            /* Dashboard handles the CourseCards and navigation triggers */
            <Dashboard 
              announcements={ANNOUNCEMENTS} 
              onCoursePress={() => setActiveScreen('coursedetail')}
            />
          ) : activeScreen === 'game' ? (
            <Honors />
          ) : activeScreen === 'grades' ? (
            <Grades />
          ) : activeScreen === 'videos' ? (
            <ShareAnnouncement />
          ) : activeScreen === 'myjourney' ? (
            <MyJourney />
          ) : activeScreen === 'community' ? (
            <Community />
          ) : activeScreen === 'messenger' ? (
            <Messenger searchQuery="" onConversationActiveChange={() => {}} />
          ) : activeScreen === 'coursedetail' ? (
            /* Coursedetail2 is the red header page. It only needs onBack. */
            <Coursedetail2 onBack={() => setActiveScreen('home')} />
          ) : (
            <Assignments />
          )}
        </View>
      </View>

      <AnnouncementModal
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