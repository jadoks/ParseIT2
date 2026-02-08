import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DrawerMenu from './src/components/DrawerMenu';
import Header from './src/components/Header';
import ProfileModal from './src/components/ProfileModal';
import Analytics from './src/screens/Analytics';
import Dashboard from './src/screens/Dashboard';
import Game from './src/screens/Game';
import Messenger from './src/screens/Messenger';
import MyJourney from './src/screens/MyJourney';
import SignIn from './src/screens/SignIn';
import Videos from './src/screens/Videos';

export default function App() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768; // Tablet/Web breakpoint
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'home' | 'game' | 'videos' | 'analytics' | 'myjourney' | 'profile' | 'messenger'>('home');
  const [lastScreen, setLastScreen] = useState<'home' | 'game' | 'videos' | 'analytics' | 'myjourney' | 'messenger'>('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.container}>
        <SignIn onLogIn={() => setIsLoggedIn(true)} />
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
          } else {
            setActiveScreen(screen as any);
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
              if (s === 'profile') { setLastScreen(activeScreen as any); setActiveScreen('profile'); }
              else { setActiveScreen(s as any); }
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
                if (s === 'profile') { setLastScreen(activeScreen as any); setActiveScreen('profile'); setMobileDrawerOpen(false); }
                else { setActiveScreen(s as any); setMobileDrawerOpen(false); }
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
            {lastScreen === 'home' ? <Dashboard /> : lastScreen === 'game' ? <Game /> : lastScreen === 'videos' ? <Videos /> : lastScreen === 'analytics' ? <Analytics /> : <MyJourney />}
            <ProfileModal
              visible={true}
              onClose={() => setActiveScreen(lastScreen)}
              userName="Jade M. Lisondra"
              userEmail="jade.lisondra@gmail.com"
              onAvatarPress={() => { console.log('Edit avatar from modal'); }}
            />
          </>
        ) : (
          activeScreen === 'home' ? <Dashboard /> : activeScreen === 'game' ? <Game /> : activeScreen === 'videos' ? <Videos /> : activeScreen === 'analytics' ? <Analytics /> : activeScreen === 'myjourney' ? <MyJourney /> : activeScreen === 'messenger' ? <Messenger /> : <SignIn/>
        )}
      </View>

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