import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DrawerMenu from './src/components/DrawerMenu';
import Header from './src/components/Header';
import Dashboard from './src/screens/Dashboard';
import Game from './src/screens/Game';
import SignIn from './src/screens/SignIn';
import Videos from './src/screens/Videos';

export default function App() {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768; // Tablet/Web breakpoint
  const [isMobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeScreen, setActiveScreen] = useState<'home' | 'game' | 'videos'>('home');
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
        onNavigate={(screen) => setActiveScreen(screen)}
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
        {isLargeScreen && <DrawerMenu isFixed={true} />}

        {/* Slide-out Overlay for Mobile */}
        {!isLargeScreen && isMobileDrawerOpen && (
          <View style={styles.mobileOverlay}>
            <DrawerMenu isFixed={false} onClose={() => setMobileDrawerOpen(false)} />
          </View>
        )}

        {activeScreen === 'home' ? <Dashboard /> : activeScreen === 'game' ? <Game /> : activeScreen === 'videos' ? <Videos /> :<SignIn/>}
      </View>
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
    top: 72,
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
  }
});