import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnnouncementModal, { Announcement } from './src/components/AnnouncementModal';
import DrawerMenu from './src/components/DrawerMenu';
import Header from './src/components/Header';
import ProfileModal from './src/components/ProfileModal';
import Analytics from './src/screens/Analytics';
import Assignments from './src/screens/Assignments';
import CourseDetail from './src/screens/CourseDetail';
import Dashboard from './src/screens/Dashboard';
import Game from './src/screens/Game';
import Messenger from './src/screens/Messenger';
import MyJourney from './src/screens/MyJourney';
import SignIn from './src/screens/SignIn';
import Videos from './src/screens/Videos';

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: '1',
    title: 'Welcome Back!',
    message: 'Check out the latest updates and announcements from your courses.',
    bannerImage: require('./assets/images/ctu_argao_banner.jpg'),
  },
  {
    id: '2',
    title: 'New Course Available',
    message: 'Advanced Data Structures is now open for enrollment. Register today!',
    bannerImage: require('./assets/images/ctu_argao_banner.jpg'),
  },
  {
    id: '3',
    title: 'Mid-Term Exams',
    message: 'Mid-term exams are scheduled for next week. Study hard and good luck!',
    bannerImage: require('./assets/images/ctu_argao_banner.jpg'),
  },
];

export default function App() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768; // Tablet/Web breakpoint
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'home' | 'game' | 'videos' | 'analytics' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail'>('home');
  const [lastScreen, setLastScreen] = useState<'home' | 'game' | 'videos' | 'analytics' | 'myjourney' | 'messenger' | 'assignments' | 'coursedetail'>('home');
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <SignIn onLogIn={() => {
          setIsLoggedIn(true);
          setShowAnnouncement(true);
        }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header receives navigation props */}
      <Header 
        isLargeScreen={isLargeScreen}
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          if (screen === 'profile') {
            setLastScreen(activeScreen as any);
            setActiveScreen('profile');
          } else if (screen === 'home') {
            setActiveScreen(screen as any);
            setShowAnnouncement(true);
          } else {
            setActiveScreen(screen as any);
            setShowAnnouncement(false);
          }
        }}
      />

      {/* Floating Hamburger Menu for Mobile - appears below header */}
      {!isLargeScreen && (
        <TouchableOpacity
          style={styles.floatingMenuBtn}
          onPress={() => setMobileDrawerOpen(!isMobileDrawerOpen)}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      )}
      
      <View style={styles.content}>
        {/* Fixed Sidebar for Web/Large Screens */}
        {isLargeScreen && (
          <DrawerMenu
            isFixed={true}
            onNavigate={(s) => {
              if (s === 'profile') { setLastScreen(activeScreen as any); setActiveScreen('profile'); setShowAnnouncement(false); }
              else if (s === 'home') { setActiveScreen(s as any); setShowAnnouncement(true); }
              else { setActiveScreen(s as any); setShowAnnouncement(false); }
            }}
            activeScreen={activeScreen}
            userName="Jade M. Lisondra"
            userEmail="jade.lisondra@gmail.com"
            onAvatarPress={() => console.log('Edit avatar pressed')}
          />
        )}

        {/* Slide-out Overlay for Mobile */}
        {!isLargeScreen && isMobileDrawerOpen && (
          <View style={styles.mobileOverlay}>
            <DrawerMenu
              isFixed={false}
              onClose={() => setMobileDrawerOpen(false)}
              onNavigate={(s) => {
                if (s === 'profile') { setLastScreen(activeScreen as any); setActiveScreen('profile'); setMobileDrawerOpen(false); setShowAnnouncement(false); }
                else if (s === 'home') { setActiveScreen(s as any); setMobileDrawerOpen(false); setShowAnnouncement(true); }
                else { setActiveScreen(s as any); setMobileDrawerOpen(false); setShowAnnouncement(false); }
              }}
              activeScreen={activeScreen}
              userName="Jade M. Lisondra"
              userEmail="jade.lisondra@gmail.com"
              onAvatarPress={() => { setMobileDrawerOpen(false); console.log('Edit avatar (mobile)'); }}
            />
          </View>
        )}
        {activeScreen === 'profile' ? (
          <>
            {/* Render last active screen under the profile modal */}
            {lastScreen === 'home' ? <Dashboard announcements={ANNOUNCEMENTS} /> : lastScreen === 'game' ? <Game /> : lastScreen === 'videos' ? <Videos /> : lastScreen === 'analytics' ? <Analytics /> : <MyJourney />}
            <ProfileModal
              visible={true}
              onClose={() => setActiveScreen(lastScreen)}
              userName="Jade M. Lisondra"
              userEmail="jade.lisondra@gmail.com"
              onAvatarPress={() => { console.log('Edit avatar from modal'); }}
            />
          </>
        ) : (
          activeScreen === 'home' ? <Dashboard announcements={ANNOUNCEMENTS} onCoursePress={() => setActiveScreen('coursedetail')} /> : 
          activeScreen === 'game' ? <Game /> : 
          activeScreen === 'videos' ? <Videos /> : 
          activeScreen === 'analytics' ? <Analytics /> : 
          activeScreen === 'myjourney' ? <MyJourney /> : 
          activeScreen === 'messenger' ? <Messenger /> :
          activeScreen === 'assignments' ? <Assignments /> :
          activeScreen === 'coursedetail' ? <CourseDetail /> :
          <SignIn/>
        )}
      </View>

      {/* Announcement Modal - Shows when navigating to Home Screen */}
      <AnnouncementModal
        visible={activeScreen === 'home' && showAnnouncement}
        onClose={() => setShowAnnouncement(false)}
        announcements={ANNOUNCEMENTS}
      />

      {/* Floating ChatGPT Button at Bottom Right */}
      <TouchableOpacity style={styles.floatingChatBtn} activeOpacity={0.8}>
        <Image
          source={require('./assets/images/ChatGPT.png')}
          style={styles.chatBtnImage}
        />
        <Text style={styles.chatBtnLabel}>Ask anything</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileOverlay: {
    position: 'absolute',
    zIndex: 10,
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#FFF',
    elevation: 5, // Android shadow
    shadowColor: '#000', // iOS shadow
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
  
  },
  floatingMenuBtn: {
    position: 'absolute',
    top: 135,
    left: 16,
    zIndex: 5,
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  menuIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  floatingChatBtn: {
    position: 'absolute',
    bottom: 44,
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  chatBtnImage: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  chatBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
});