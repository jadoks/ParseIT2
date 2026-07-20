import AsyncStorage from '@react-native-async-storage/async-storage'; // Install if missing: npx expo install @react-native-async-storage/async-storage
import Constants from 'expo-constants';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from './firebaseConfig';
import AdminApp from './src/AdminApp';
import LandingPage from './src/screens/LandingPage';
import Register from './src/screens/Register';
import SignIn from './src/screens/SignIn';
import StudentApp from './src/StudentApp';
import TeacherApp from './src/TeacherApp';

type UserRole = 'student' | 'teacher' | 'admin';

type SignedInUser = {
  role: UserRole;
  id: string;
  email: string | null;
  authUid?: string | null;
  studentId?: string;
  teacherId?: string;
  adminId?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: any;
  bannerImage?: any;
};

function getApiBaseUrl() {
  if (Platform.OS === "web") {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  const host = possibleHost.split(":")[0];

  return host
    ? `http://${host}:5000`
    : "http://192.168.1.5:5000";
}

const API_BASE_URL = getApiBaseUrl();

// 🔥 GLOBAL AUTH STATE MANAGEMENT
export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLanding, setShowLanding] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<SignedInUser | null>(null);
  
  // Store the latest valid ID Token for manual injection
  const [idToken, setIdToken] = useState<string | null>(null);

  // 🔥 REFRESH TOKEN SILENTLY
  const refreshAuthToken = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      // Force refresh ensures we get a fresh token even if the old one is technically still valid
      const freshToken = await user.getIdToken(true);
      setIdToken(freshToken);
      
      // Optional: Persist token for offline resilience or quick re-auth
      await AsyncStorage.setItem('@auth_token', freshToken);
      return freshToken;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  }, []);

  // 🔥 MAIN AUTH CHECKER
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await refreshAuthToken();
          if (!token) throw new Error("Failed to retrieve ID token");

          // Establish backend session (for web compatibility / future proofing)
          await fetch(`${API_BASE_URL}/auth/session-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ idToken: token, deviceId: Platform.OS }),
          });

          // Verify profile using Bearer token instead of relying solely on cookies
          const response = await fetch(`${API_BASE_URL}/auth/session-me`, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`, //  INJECT TOKEN HERE
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.profile) {
              const user: SignedInUser = {
                role: data.role,
                id: data.id,
                email: data.email,
                authUid: data.uid,
                studentId: data.role === 'student' ? data.id : undefined,
                teacherId: data.role === 'teacher' ? data.id : undefined,
                adminId: data.role === 'admin' ? data.id : undefined,
                firstName: data.profile.firstName,
                lastName: data.profile.lastName,
                profileImage: data.profile.profileImage,
                bannerImage: data.profile.bannerImage,
              };
              
              setCurrentUser(user);
              setIsLoggedIn(true);
              setShowLanding(false);
            } else {
              setIsLoggedIn(false);
              setShowLanding(true);
            }
          } else {
            setIsLoggedIn(false);
            setShowLanding(true);
          }
        } catch (error) {
          console.error("Error checking session:", error);
          setIsLoggedIn(false);
          setShowLanding(true);
        }
      } else {
        setIsLoggedIn(false);
        setShowLanding(true);
      }
      setIsCheckingAuth(false);
    });

    // 🔥 AUTO-REFRESH TOKEN EVERY 50 MINUTES (Firebase tokens expire in 1 hour)
    const interval = setInterval(refreshAuthToken, 50 * 60 * 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshAuthToken]);

  const handleLogin = async (user: SignedInUser) => {
    const token = await refreshAuthToken();
    if (token) {
      setCurrentUser(user);
      setIsLoggedIn(true);
      setShowLanding(false);
      setShowRegister(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/session-logout`, {
        method: 'POST',
        credentials: 'include',
      });
      await AsyncStorage.removeItem('@auth_token');
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
    
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowLanding(true);
    setShowRegister(false);
    setIdToken(null);
  };

  const handleGetStarted = () => {
    setShowLanding(false);
    setShowRegister(false); 
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
  };

  if (isCheckingAuth) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size="large" color="#D32F2F" />
      </SafeAreaView>
    );
  }

  if (showLanding) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LandingPage onGetStarted={handleGetStarted} />
      </SafeAreaView>
    );
  }

  if (showRegister) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <Register
          onBack={() => setShowRegister(false)}
          onRegisterSuccess={handleRegisterSuccess}
          onGoToLanding={() => setShowLanding(true)}
        />
      </SafeAreaView>
    );
  }

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <SignIn
          onLogIn={handleLogin}
          onGoToLanding={() => setShowLanding(true)}
          onGoToRegister={() => setShowRegister(true)}
        />
      </SafeAreaView>
    );
  }

  // 🔥 PASS THE TOKEN DOWN TO YOUR APPS SO THEY CAN USE IT FOR API CALLS
  const commonProps = {
    onLogout: handleLogout,
    idToken: idToken, // Pass this to StudentApp, TeacherApp, AdminApp
  };

  if (currentUser?.role === 'teacher') {
    return (
      <TeacherApp
        {...commonProps}
        currentTeacher={{
          teacherId: currentUser.teacherId || currentUser.id,
          authUid: currentUser.authUid || null,
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
          profileImage: currentUser.profileImage || null,
          bannerImage: currentUser.bannerImage || null,
        }}
      />
    );
  }

  if (currentUser?.role === 'student') {
    return (
      <StudentApp
        {...commonProps}
        currentStudent={{
          studentId: currentUser.studentId || currentUser.id,
          authUid: currentUser.authUid || null,
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
          profileImage: currentUser.profileImage || null,
          bannerImage: currentUser.bannerImage || null,
        }}
      />
    );
  }

  if (currentUser?.role === 'admin') {
    return (
      <AdminApp
        {...commonProps}
        currentAdmin={{
          adminId: currentUser.adminId || currentUser.id,
          authUid: currentUser.authUid || null,
          firstName: currentUser.firstName || '',
          lastName: currentUser.lastName || '',
          email: currentUser.email || '',
        }}
      />
    );
  }

  return null;
}