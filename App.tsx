import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnnouncementModal, { Announcement } from './src/components/AnnouncementModal';
import DrawerMenu from './src/components/DrawerMenu';
import Header from './src/components/Header';
import ProfileModal from './src/components/ProfileModal';
import Assignments from './src/screens/Assignments';
import Community from './src/screens/Community';
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
    bannerImage: require('./assets/announcement/1.png'),
  },
  {
    id: '2',
    title: 'New Course Available',
    message: 'Advanced Data Structures is now open for enrollment. Register today!',
    bannerImage: require('./assets/announcement/2.png'),
  },
  {
    id: '3',
    title: 'Mid-Term Exams',
    message: 'Mid-term exams are scheduled for next week. Study hard and good luck!',
    bannerImage: require('./assets/announcement/3.png'),
  },
];

export default function App() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<
    'home' | 'game' | 'videos' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community'
  >('home');
  const [lastScreen, setLastScreen] = useState<
    'home' | 'game' | 'videos' | 'myjourney' | 'messenger' | 'assignments' | 'coursedetail' | 'community'
  >('home');
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'teacher' | 'admin' | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [activeCourseTab, setActiveCourseTab] = useState<'materials' | 'assignments'>('materials');

  // ── Login handler with role ──
  const handleLogin = (role: 'student' | 'teacher' | 'admin') => {
    setIsLoggedIn(true);
    setUserRole(role);
    setShowAnnouncement(true);
    setActiveScreen('home');
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <SignIn onLogIn={handleLogin} />
      </SafeAreaView>
    );
  }

  // ── Simple placeholder screens for Teacher & Admin ──
  const renderRoleContent = () => {
    if (userRole === 'teacher') {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>
            Teacher Dashboard
          </Text>
          <Text style={{ marginTop: 16, color: '#666' }}>
            (Under development – grade assignments, post materials, etc.)
          </Text>
        </View>
      );
    }

    if (userRole === 'admin') {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#333' }}>
            Admin Panel
          </Text>
          <Text style={{ marginTop: 16, color: '#666' }}>
            (Under development – manage users, courses, announcements, etc.)
          </Text>
        </View>
      );
    }

    // Student → full access (your original flow)
    return (
      <>
        {activeScreen === 'profile' ? (
          <>
            {lastScreen === 'home' ? <Dashboard announcements={ANNOUNCEMENTS} /> : 
             lastScreen === 'game' ? <Game /> : 
             lastScreen === 'videos' ? <Videos /> : 
             <MyJourney />}
            <ProfileModal
              visible={true}
              onClose={() => setActiveScreen(lastScreen)}
              userName="Jade M. Lisondra"
              userEmail="jade.lisondra@gmail.com"
              onAvatarPress={() => console.log('Edit avatar from modal')}
            />
          </>
        ) : (
          activeScreen === 'home' ? (
            <Dashboard
              announcements={ANNOUNCEMENTS}
              onCoursePress={() => {
                setLastScreen(activeScreen);
                setActiveScreen('coursedetail');
                setActiveCourseTab('materials');
              }}
              onAssignmentPress={() => {
                setLastScreen(activeScreen);
                setActiveScreen('coursedetail');
                setActiveCourseTab('assignments');
              }}
            />
          ) : activeScreen === 'game' ? <Game /> :
            activeScreen === 'videos' ? <Videos onVideoActiveChange={setIsVideoActive} /> :
            activeScreen === 'myjourney' ? <MyJourney /> :
            activeScreen === 'messenger' ? <Messenger searchQuery={searchQuery} onConversationActiveChange={setIsConversationActive} /> :
            activeScreen === 'assignments' ? <Assignments /> :
            activeScreen === 'coursedetail' ? <CourseDetail initialTab={activeCourseTab} onBack={() => setActiveScreen(lastScreen)} /> :
            activeScreen === 'community' ? <Community /> :
            <Text style={{ textAlign: 'center', marginTop: 50 }}>Screen not found</Text>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
        onSearchChange={(query) => setSearchQuery(query)}
      />

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
        {isLargeScreen && (
          <DrawerMenu
            isFixed={true}
            onNavigate={(s) => {
              if (s === 'profile') {
                setLastScreen(activeScreen as any);
                setActiveScreen('profile');
                setShowAnnouncement(false);
              } else if (s === 'home') {
                setActiveScreen(s as any);
                setShowAnnouncement(true);
              } else {
                setActiveScreen(s as any);
                setShowAnnouncement(false);
              }
            }}
            activeScreen={activeScreen}
            userName="Jade M. Lisondra"
            userEmail="jade.lisondra@gmail.com"
            onAvatarPress={() => console.log('Edit avatar pressed')}
            setIsLoggedIn={setIsLoggedIn}
          />
        )}

        {!isLargeScreen && isMobileDrawerOpen && (
          <>
            <TouchableOpacity
              style={styles.mobileBackdrop}
              activeOpacity={1}
              onPress={() => setMobileDrawerOpen(false)}
            />
            <View style={styles.mobileOverlay}>
              <DrawerMenu
                isFixed={false}
                onClose={() => setMobileDrawerOpen(false)}
                onNavigate={(s) => {
                  if (s === 'profile') {
                    setLastScreen(activeScreen as any);
                    setActiveScreen('profile');
                    setMobileDrawerOpen(false);
                    setShowAnnouncement(false);
                  } else if (s === 'home') {
                    setActiveScreen(s as any);
                    setMobileDrawerOpen(false);
                    setShowAnnouncement(true);
                  } else {
                    setActiveScreen(s as any);
                    setMobileDrawerOpen(false);
                    setShowAnnouncement(false);
                  }
                }}
                activeScreen={activeScreen}
                userName="Jade M. Lisondra"
                userEmail="jade.lisondra@gmail.com"
                onAvatarPress={() => {
                  setMobileDrawerOpen(false);
                  console.log('Edit avatar (mobile)');
                }}
                setIsLoggedIn={setIsLoggedIn}
              />
            </View>
          </>
        )}

        {renderRoleContent()}
      </View>

      <AnnouncementModal
        visible={activeScreen === 'home' && showAnnouncement && userRole === 'student'}
        onClose={() => setShowAnnouncement(false)}
        announcements={ANNOUNCEMENTS}
      />

      {!(activeScreen === 'messenger' && isConversationActive) &&
        !(activeScreen === 'videos' && isVideoActive) && (
          <TouchableOpacity
            style={styles.floatingChatBtn}
            activeOpacity={0.85}
            onPress={() => setIsChatOpen((prev) => !prev)}
          >
            {isChatOpen ? (
              <Text style={[styles.chatClose, { color: '#fff' }]}>✕</Text>
            ) : (
              <>
                <Image
                  source={require('./assets/images/ChatGPT.png')}
                  style={styles.chatBtnImage}
                />
                <Text style={styles.chatBtnLabel}>Ask anything</Text>
              </>
            )}
          </TouchableOpacity>
        )}

      {isChatOpen &&
        !(activeScreen === 'messenger' && isConversationActive) &&
        !(activeScreen === 'videos' && isVideoActive) && (
          <View style={styles.chatPanel}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Ask anything</Text>
              <TouchableOpacity onPress={() => setIsChatOpen(false)}>
                {/* You can add close icon here if you want */}
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.chatMessages}>
              <View>
                <Text style={styles.chatBubbleOther}>Hello! How can I help you today?</Text>
                <Text style={styles.chatBubbleUser}>Show me my assignments.</Text>
                <Text style={styles.chatBubbleOther}>You have 3 pending assignments due next week.</Text>
              </View>
            </ScrollView>
            <View style={styles.chatInputRow}>
              <TextInput
                placeholder="Type your question..."
                placeholderTextColor="rgba(0, 0, 0, 0.5)"
                style={styles.chatInput}
              />
              <TouchableOpacity style={styles.chatSendBtn}>
                <Text style={{ color: '#fff' }}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
  mobileBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9,
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
  chatPanel: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    zIndex: 30,
    width: 360,
    height: 520,
    backgroundColor: '#fffefe',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#db0c0c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  chatHeader: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(135, 1, 1, 0.43)'
  },
  chatTitle: { color: '#D32F2F', fontWeight: '700', fontSize: 16 },
  chatClose: { color: '#fff', fontSize: 20 },
  chatMessages: { flex: 1, marginVertical: 10 },
  chatBubbleUser: { alignSelf: 'flex-end', backgroundColor: '#D32F2F', color: '#fff', padding: 10, borderRadius: 16, marginVertical: 6, maxWidth: '85%' },
  chatBubbleOther: { alignSelf: 'flex-start', backgroundColor: '#D32F2F', color: '#fff', padding: 10, borderRadius: 16, marginVertical: 6, maxWidth: '85%' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  chatInput: { flex: 1, backgroundColor: '#ffffff', color: '#000000', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderColor: '#a90000dc', borderWidth: 2 },
  chatSendBtn: { marginLeft: 8, backgroundColor: '#D32F2F', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 }
});
