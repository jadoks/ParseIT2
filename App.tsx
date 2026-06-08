import Constants from 'expo-constants';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ⚠️ Make sure this path correctly points to your firebaseConfig file
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

// Re-using the same API URL logic from your SignIn screen
function getApiBaseUrl() {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }
  const possibleHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    '';
  const host = possibleHost.split(':')[0];
  if (host) {
    return `http://${host}:5000`;
  }
  return 'http://192.168.1.5:5000';
}

const API_BASE_URL = getApiBaseUrl();

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLanding, setShowLanding] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<SignedInUser | null>(null);

  // 🔥 PERSISTENT LOGIN LOGIC
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Get the secure Firebase ID token
          const idToken = await firebaseUser.getIdToken();
          
          // 2. Verify with backend and fetch full profile
          const response = await fetch(`${API_BASE_URL}/auth/session-me`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.profile) {
              // 3. Map backend data to our frontend SignedInUser type
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
              // Token valid but no profile found in backend DB
              setIsLoggedIn(false);
              setShowLanding(true);
            }
          } else {
            // Token invalid, expired, or backend rejected it
            setIsLoggedIn(false);
            setShowLanding(true);
          }
        } catch (error) {
          console.error("Error checking session:", error);
          setIsLoggedIn(false);
          setShowLanding(true);
        }
      } else {
        // No user is logged into Firebase
        setIsLoggedIn(false);
        setShowLanding(true);
      }
      
      // Stop showing the loading splash screen
      setIsCheckingAuth(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  const handleLogin = (user: SignedInUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setShowLanding(false);
    setShowRegister(false);
  };

  const handleLogout = async () => {
    // Sign out from Firebase so the app truly forgets them
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase sign out error:", error);
    }
    
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowLanding(true);
    setShowRegister(false);
  };

  const handleGetStarted = () => {
    setShowLanding(false);
    setShowRegister(false); 
  };

  const handleRegisterSuccess = () => {
    setShowRegister(false);
  };

  // 🔄 SHOW LOADING SCREEN WHILE CHECKING FIREBASE AUTH STATE
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

  if (currentUser?.role === 'teacher') {
    return (
      <TeacherApp
        onLogout={handleLogout}
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
        onLogout={handleLogout}
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
        onLogout={handleLogout}
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