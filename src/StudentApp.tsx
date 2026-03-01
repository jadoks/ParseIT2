import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnnouncementModal, { Announcement } from './components/AnnouncementModal';
import DrawerMenu from './components/DrawerMenu';
import Header from './components/Header';
import ProfileModal from './components/ProfileModal';
import Assignments from './screens/Assignments';
import Community from './screens/Community';
import CourseDetail from './screens/CourseDetail';
import Dashboard from './screens/Dashboard';
import Game from './screens/Game';
import Messenger from './screens/Messenger';
import MyJourney from './screens/MyJourney';
import Videos from './screens/Videos';

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

export default function StudentApp({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [activeScreen, setActiveScreen] = useState<
    'home' | 'game' | 'videos' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community'
  >('home');

  const [lastScreen, setLastScreen] = useState<'home' | 'game' | 'videos' | 'myjourney' | 'profile' | 'messenger' | 'assignments' | 'coursedetail' | 'community'>('home');

  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);

  // Course tab state
  const [activeCourseTab, setActiveCourseTab] = useState<'materials' | 'assignments'>('materials');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header */}
      <Header
        isLargeScreen={isLargeScreen}
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          if (screen === 'profile') {
            setLastScreen(activeScreen);
            setActiveScreen('profile');
          } else {
            setActiveScreen(screen as any);
          }
        }}
        onSearchChange={() => {}}
      />

      {/* Mobile Hamburger */}
      {!isLargeScreen && (
        <TouchableOpacity
          style={styles.floatingMenuBtn}
          onPress={() => setMobileDrawerOpen(!isMobileDrawerOpen)}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      )}

      <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* Drawer Menu */}
        {isLargeScreen && (
          <DrawerMenu
            isFixed={true}
            activeScreen={activeScreen}
            onNavigate={(s) => {
              if (s === 'profile') {
                setLastScreen(activeScreen);
                setActiveScreen('profile');
              } else {
                setActiveScreen(s as any);
              }
            }}
            userName="Student Name"
            userEmail="student@email.com"
            onAvatarPress={() => {
              setLastScreen(activeScreen);
              setActiveScreen('profile');
            }}
            setIsLoggedIn={onLogout}
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
                activeScreen={activeScreen}
                onNavigate={(s) => {
                  if (s === 'profile') {
                    setLastScreen(activeScreen);
                    setActiveScreen('profile');
                  } else {
                    setActiveScreen(s as any);
                  }
                  setMobileDrawerOpen(false);
                }}
                userName="Student Name"
                userEmail="student@email.com"
                onAvatarPress={() => {
                  setMobileDrawerOpen(false);
                  setLastScreen(activeScreen);
                  setActiveScreen('profile');
                }}
                setIsLoggedIn={onLogout}
              />
            </View>
          </>
        )}

        <View style={{ flex: 1 }}>
          {/* Profile Modal */}
          {activeScreen === 'profile' ? (
            <ProfileModal
              visible={true}
              onClose={() => setActiveScreen(lastScreen)}
              userName="Student Name"
              userEmail="student@email.com"
              onAvatarPress={() => console.log('Edit avatar from modal')}
            />
          ) : activeScreen === 'home' ? (
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
          ) : activeScreen === 'game' ? (
            <Game />
          ) : activeScreen === 'videos' ? (
            <Videos onVideoActiveChange={setIsVideoActive} />
          ) : activeScreen === 'myjourney' ? (
            <MyJourney />
          ) : activeScreen === 'assignments' ? (
            <Assignments />
          ) : activeScreen === 'community' ? (
            <Community />
          ) : activeScreen === 'messenger' ? (
            <Messenger searchQuery="" onConversationActiveChange={setIsConversationActive} />
          ) : activeScreen === 'coursedetail' ? (
            <CourseDetail initialTab={activeCourseTab} onBack={() => setActiveScreen(lastScreen)} />
          ) : (
            <Text style={{ textAlign: 'center', marginTop: 50 }}>Screen not found</Text>
          )}
        </View>
      </View>

      {/* Announcement Modal */}
      <AnnouncementModal
        visible={activeScreen === 'home' && showAnnouncement}
        onClose={() => setShowAnnouncement(false)}
        announcements={ANNOUNCEMENTS}
      />

      {/* Floating Chat Button */}
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
                  source={require('../assets/images/ChatGPT.png')}
                  style={styles.chatBtnImage}
                />
                <Text style={styles.chatBtnLabel}>Ask anything</Text>
              </>
            )}
          </TouchableOpacity>
        )}

      {/* Chat Panel */}
      {isChatOpen &&
        !(activeScreen === 'messenger' && isConversationActive) &&
        !(activeScreen === 'videos' && isVideoActive) && (
          <View style={styles.chatPanel}>
            <View style={styles.chatHeader}>
              <Text style={styles.chatTitle}>Ask anything</Text>
              <TouchableOpacity onPress={() => setIsChatOpen(false)} />
            </View>
            <ScrollView style={styles.chatMessages}>
              <View>
                <Text style={styles.chatBubbleOther}>Hello! How can I help you today?</Text>
                <Text style={styles.chatBubbleUser}>Show me my assignments.</Text>
                <Text style={styles.chatBubbleOther}>
                  You have 3 pending assignments due next week.
                </Text>
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
  menuIcon: { fontSize: 24, fontWeight: 'bold', color: '#000' },
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
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
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
  chatBtnImage: { width: 24, height: 24, resizeMode: 'contain', tintColor: '#FFFFFF' },
  chatBtnLabel: { fontSize: 14, fontWeight: '600', color: '#FFF' },
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
  chatHeader: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(135, 1, 1, 0.43)' },
  chatTitle: { color: '#D32F2F', fontWeight: '700', fontSize: 16 },
  chatClose: { color: '#fff', fontSize: 20 },
  chatMessages: { flex: 1, marginVertical: 10 },
  chatBubbleUser: { alignSelf: 'flex-end', backgroundColor: '#D32F2F', color: '#fff', padding: 10, borderRadius: 16, marginVertical: 6, maxWidth: '85%' },
  chatBubbleOther: { alignSelf: 'flex-start', backgroundColor: '#D32F2F', color: '#fff', padding: 10, borderRadius: 16, marginVertical: 6, maxWidth: '85%' },
  chatInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  chatInput: { flex: 1, backgroundColor: '#ffffff', color: '#000000', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, borderColor: '#a90000dc', borderWidth: 2 },
  chatSendBtn: { marginLeft: 8, backgroundColor: '#D32F2F', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
});