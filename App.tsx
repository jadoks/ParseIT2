import AsyncStorage from '@react-native-async-storage/async-storage'; // Install if missing: npx expo install @react-native-async-storage/async-storage
import Constants from 'expo-constants';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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

const CACHED_USER_KEY = '@cached_user';
const CACHED_TOKEN_KEY = '@auth_token';

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

function mapProfileToUser(data: any): SignedInUser {
  return {
    role: data.role,
    id: data.id,
    email: data.email,
    authUid: data.uid,
    studentId: data.role === 'student' ? data.id : undefined,
    teacherId: data.role === 'teacher' ? data.id : undefined,
    adminId: data.role === 'admin' ? data.id : undefined,
    firstName: data.profile?.firstName,
    lastName: data.profile?.lastName,
    profileImage: data.profile?.profileImage,
    bannerImage: data.profile?.bannerImage,
  };
}

// 🔥 GLOBAL AUTH STATE MANAGEMENT
export default function App() {
  // isCheckingAuth now only blocks the UI until we've checked local cache,
  // NOT until the network round-trips finish. This is what makes launch feel instant.
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showLanding, setShowLanding] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<SignedInUser | null>(null);

  // Store the latest valid ID Token for manual injection
  const [idToken, setIdToken] = useState<string | null>(null);

  // Avoid flashing the landing/login screen if we already restored a cached
  // session and are just waiting on a background verification.
  const hasCachedSessionRef = useRef(false);

  // ✅ NEW: while true, onAuthStateChanged should NOT auto-navigate to the
  // dashboard, even though Firebase already has a signed-in user — this is
  // the window between "temp password accepted" and "real password set"
  // during first-login setup in SignIn.
  const suppressAutoLoginRef = useRef(false);

  // 🔥 REFRESH TOKEN — cached/instant by default, only hits network if expired.
  // Pass forceRefresh=true only when you specifically need a brand-new token
  // (e.g. right after login, or on the 50-minute interval below).
  const refreshAuthToken = useCallback(async (forceRefresh = false) => {
    const user = auth.currentUser;
    if (!user) return null;
    try {
      const token = await user.getIdToken(forceRefresh);
      setIdToken(token);
      await AsyncStorage.setItem(CACHED_TOKEN_KEY, token);
      return token;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    }
  }, []);

  // Verifies the session against the backend and updates state.
  // Runs in the background — does NOT gate the UI once a cached user is showing.
  const verifySessionInBackground = useCallback(async (forceRefresh = false) => {
    try {
      const token = await refreshAuthToken(forceRefresh);
      if (!token) throw new Error("Failed to retrieve ID token");

      // Establish backend session (for web compatibility / future proofing)
      fetch(`${API_BASE_URL}/auth/session-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken: token, deviceId: Platform.OS }),
      }).catch((e) => console.error("session-login failed:", e));

      const response = await fetch(`${API_BASE_URL}/auth/session-me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          const user = mapProfileToUser(data);
          setCurrentUser(user);
          setIsLoggedIn(true);
          setShowLanding(false);
          await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
        } else if (!hasCachedSessionRef.current) {
          // Only kick to landing if we weren't already showing a cached session.
          setIsLoggedIn(false);
          setShowLanding(true);
        }
      } else if (!hasCachedSessionRef.current) {
        setIsLoggedIn(false);
        setShowLanding(true);
      }
      // If the request fails but we have a cached session on screen, do nothing —
      // stay on the cached dashboard rather than bouncing the user to login.
    } catch (error) {
      console.error("Error checking session:", error);
      if (!hasCachedSessionRef.current) {
        setIsLoggedIn(false);
        setShowLanding(true);
      }
    } finally {
      setIsCheckingAuth(false);
    }
  }, [refreshAuthToken]);

  // 🔥 MAIN AUTH CHECKER
  useEffect(() => {
    let cancelled = false;

    // 1. Instantly restore last-known user from disk so the UI renders
    //    right away, before any network call resolves.
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHED_USER_KEY);
        if (cached && !cancelled) {
          const user: SignedInUser = JSON.parse(cached);
          hasCachedSessionRef.current = true;
          setCurrentUser(user);
          setIsLoggedIn(true);
          setShowLanding(false);
          setIsCheckingAuth(false); // render the dashboard now
        }
      } catch (e) {
        console.error("Failed to read cached user:", e);
      }
    })();

    // 2. Verify the real session in the background (Firebase + backend).
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;

      if (firebaseUser) {
        // ✅ NEW: if SignIn is currently in the middle of a first-login
        // password-setup flow, don't auto-verify/navigate — Firebase Auth
        // already has a session (from the temp-password sign-in check),
        // but the account isn't "really" logged in until the new password
        // has been set.
        if (suppressAutoLoginRef.current) {
          setIsCheckingAuth(false);
          return;
        }

        await verifySessionInBackground(false); // non-forced: instant if token still valid
      } else {
        hasCachedSessionRef.current = false;
        await AsyncStorage.removeItem(CACHED_USER_KEY);
        setIsLoggedIn(false);
        setShowLanding(true);
        setIsCheckingAuth(false);
      }
    });

    // 🔥 FORCE-REFRESH TOKEN EVERY 50 MINUTES (Firebase tokens expire in 1 hour)
    const interval = setInterval(() => refreshAuthToken(true), 50 * 60 * 1000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshAuthToken, verifySessionInBackground]);

  const handleLogin = async (user: SignedInUser) => {
    const token = await refreshAuthToken(true); // force-fresh right after login
    if (token) {
      hasCachedSessionRef.current = true;
      setCurrentUser(user);
      setIsLoggedIn(true);
      setShowLanding(false);
      setShowRegister(false);
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    }
  };

  // ✅ NEW: called by SignIn right before it signs in with a temp password
  // for an account that still needs first-login setup. Tells the auth
  // listener above to hold off on auto-navigating to the dashboard.
  const handleFirstLoginPending = useCallback(() => {
    suppressAutoLoginRef.current = true;
  }, []);

  // ✅ NEW: called by SignIn once first-login setup is fully resolved
  // (password successfully set, OR the user backed out / an error occurred).
  // Lets the auth listener resume normal behavior.
  const handleFirstLoginResolved = useCallback(() => {
    suppressAutoLoginRef.current = false;
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/session-logout`, {
        method: 'POST',
        credentials: 'include',
      });
      await AsyncStorage.removeItem(CACHED_TOKEN_KEY);
      await AsyncStorage.removeItem(CACHED_USER_KEY);
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }

    hasCachedSessionRef.current = false;
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
          onFirstLoginPending={handleFirstLoginPending}
          onFirstLoginResolved={handleFirstLoginResolved}
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