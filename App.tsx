import AsyncStorage from '@react-native-async-storage/async-storage'; // Install if missing: npx expo install @react-native-async-storage/async-storage
import Constants from 'expo-constants';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth } from './firebaseConfig';
import AdminApp from './src/AdminApp';
import { useLiveEvents } from './src/hooks/useLiveEvents';
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
const SESSION_ID_KEY = '@session_id';

// Seconds the "signed in on another device" modal waits before auto-logout.
const SESSION_REPLACED_AUTO_LOGOUT_SECONDS = 4;

// Safety-net poll while signed in. The server also rejects every request from
// a replaced session (409), so this only matters for an idle tab.
const SESSION_CHECK_INTERVAL_MS = 30 * 1000;

function generateSessionId() {
  const g: any = globalThis as any;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// Shown on top of whatever screen is open when the account is signed in on
// another device. OK logs out immediately; otherwise it logs out by itself.
function SessionReplacedModal({ visible, onConfirm }: { visible: boolean; onConfirm: () => void }) {
  const [secondsLeft, setSecondsLeft] = useState(SESSION_REPLACED_AUTO_LOGOUT_SECONDS);

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(SESSION_REPLACED_AUTO_LOGOUT_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    const timeout = setTimeout(onConfirm, SESSION_REPLACED_AUTO_LOGOUT_SECONDS * 1000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [visible, onConfirm]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onConfirm}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#222', marginBottom: 8, textAlign: 'center' }}>
            Signed in on another device
          </Text>
          <Text style={{ fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 6 }}>
            Another device just signed in to this account, so you are being logged out here.
          </Text>
          <Text style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
            Logging out in {secondsLeft}s…
          </Text>
          <TouchableOpacity
            onPress={onConfirm}
            style={{ backgroundColor: '#D32F2F', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 40 }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getApiBaseUrl() {
  // Prefer the deployed backend URL on every platform — including native /
  // Expo Go — since EXPO_PUBLIC_ vars are inlined for native builds too, not
  // just web. Only fall back to guessing a local dev server's LAN IP when
  // no URL has been configured (e.g. testing against a backend running on
  // your own machine during local dev).
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    console.warn('EXPO_PUBLIC_API_URL is not set; API calls will fail.');
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

// ─────────────────────────────────────────────────────────────────────────
// SINGLE-DEVICE LOGIN — one session id per browser / incognito window / device.
// Lives at module level (not in component state) so the fetch guard below can
// read it for requests made by StudentApp / TeacherApp / AdminApp too.
// ─────────────────────────────────────────────────────────────────────────
const sessionIdRef: { current: string | null } = { current: null };

// Warm the id from disk so requests made right after a cold start already
// carry it, instead of waiting for the first background verification.
AsyncStorage.getItem(SESSION_ID_KEY)
  .then((stored) => {
    if (stored && !sessionIdRef.current) sessionIdRef.current = stored;
  })
  .catch(() => {});

// Endpoints that must work before this device has claimed its session id.
const SESSION_GUARD_SKIP_PATHS = [
  '/auth/claim-session',
  '/auth/session-login',
  '/auth/session-logout',
  '/auth/lookup-user',
  '/auth/login-failed',
];

// Set by <App/>; called when ANY backend request answers 409 SESSION_REPLACED.
let onSessionReplacedByServer: ((sentSessionId: string | null) => void) | null = null;
let sessionFetchGuardInstalled = false;

// Wraps global fetch once so that EVERY call to our backend (including the
// ones inside the role apps' own apiFetch helpers) sends X-Session-Id and
// reacts to the server saying the session was replaced. Without this, an
// older browser would keep working until a push event or poll noticed.
function installSessionFetchGuard() {
  if (sessionFetchGuardInstalled || typeof globalThis.fetch !== 'function') return;
  sessionFetchGuardInstalled = true;
  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = (async (input: any, init?: any) => {
    const url: string = typeof input === 'string' ? input : input?.url || String(input);
    const isBackendCall = typeof url === 'string' && url.startsWith(API_BASE_URL);
    const skip = isBackendCall && SESSION_GUARD_SKIP_PATHS.some((path) => url.startsWith(`${API_BASE_URL}${path}`));
    if (!isBackendCall || skip) return originalFetch(input, init);

    let nextInit = init;
    let sentSessionId: string | null = sessionIdRef.current;
    try {
      const headers = new Headers(init?.headers ?? (typeof input !== 'string' ? input?.headers : undefined));
      const explicit = headers.get('X-Session-Id');
      if (explicit) {
        sentSessionId = explicit; // e.g. the explicit 'none' used by checkSessionNow
      } else if (sessionIdRef.current) {
        headers.set('X-Session-Id', sessionIdRef.current);
        nextInit = { ...init, headers };
      }
    } catch {
      // Header merge failed: send the request untouched rather than break it.
    }

    const response = await originalFetch(input, nextInit);
    if (response.status === 409) {
      response
        .clone()
        .json()
        .then((body: any) => {
          if (body?.code === 'SESSION_REPLACED') onSessionReplacedByServer?.(sentSessionId);
        })
        .catch(() => {});
    }
    return response;
  }) as typeof fetch;
}

installSessionFetchGuard();

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
  // Latest token for the live stream's (synchronous) header callback.
  const idTokenRef = useRef<string | null>(null);
  idTokenRef.current = idToken;

  // Avoid flashing the landing/login screen if we already restored a cached
  // session and are just waiting on a background verification.
  const hasCachedSessionRef = useRef(false);

  // ✅ NEW: while true, onAuthStateChanged should NOT auto-navigate to the
  // dashboard, even though Firebase already has a signed-in user — this is
  // the window between "temp password accepted" and "real password set"
  // during first-login setup in SignIn.
  const suppressAutoLoginRef = useRef(false);

  // SINGLE-DEVICE LOGIN: this device's own session id (claimed on a fresh
  // login only) and whether another device has since replaced it.
  const [sessionReplaced, setSessionReplaced] = useState(false);
  const isLoggingOutRef = useRef(false);
  // True from the moment a fresh login starts until its new session id has
  // been claimed AND stored. A "session replaced" signal that arrives in that
  // window is about the OLD id (or a stale one left on this device), not about
  // the login that is happening right now, so it must never open the modal.
  const loginInProgressRef = useRef(false);
  const isLoggedInRef = useRef(false);
  isLoggedInRef.current = isLoggedIn;
  // Only a device that is actually signed in (or restored from cache) can be
  // "replaced". The login / landing screens can't, so a stale id or a racing
  // background check can no longer flash the modal there.
  const canBeReplaced = () =>
    !loginInProgressRef.current && (isLoggedInRef.current || hasCachedSessionRef.current);

  // Any backend request answering 409 SESSION_REPLACED lands here. Ignored if
  // this device has claimed a newer session since that request was sent (a
  // fresh login racing an older in-flight request).
  useEffect(() => {
    onSessionReplacedByServer = (sentSessionId) => {
      if (isLoggingOutRef.current || !canBeReplaced()) return;
      if ((sessionIdRef.current || 'none') !== (sentSessionId || 'none')) return;
      setSessionReplaced(true);
    };
    return () => {
      onSessionReplacedByServer = null;
    };
  }, []);

  const getSessionId = useCallback(async () => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = await AsyncStorage.getItem(SESSION_ID_KEY);
    }
    return sessionIdRef.current;
  }, []);

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

      const sessionId = await getSessionId();
      const response = await fetch(`${API_BASE_URL}/auth/session-me`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(sessionId ? { 'X-Session-Id': sessionId } : {}),
        },
      });

      if (response.status === 409) {
        // Another device signed in after this one. Ignore the answer if this
        // device has since claimed a newer session itself (a fresh login
        // racing this background check).
        if (sessionIdRef.current === sessionId && canBeReplaced()) setSessionReplaced(true);
        return;
      }

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
  }, [refreshAuthToken, getSessionId]);

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
        sessionIdRef.current = null;
        await AsyncStorage.removeItem(CACHED_USER_KEY);
        await AsyncStorage.removeItem(SESSION_ID_KEY);
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

  const performLogin = async (user: SignedInUser, freshIdToken?: string) => {
    // SignIn already had to force-refresh the token to open the backend
    // session, and now hands it to us here — reuse it instead of paying for
    // a second forced round-trip to Firebase right before the dashboard
    // renders. Only fall back to refreshing ourselves if it wasn't passed.
    let token: string | null = freshIdToken ?? null;
    if (token) {
      setIdToken(token);
      await AsyncStorage.setItem(CACHED_TOKEN_KEY, token);
    } else {
      token = await refreshAuthToken(true);
    }
    if (token) {
      // SINGLE-DEVICE LOGIN: this fresh login (any browser, incognito window or
      // device) becomes the account's only valid session; every other one is
      // rejected by the server on its next request and told to log out.
      const newSessionId = generateSessionId();

      // Claim BEFORE exposing the id to the fetch guard, otherwise this
      // device's own early requests would be rejected as "not the active
      // session". Retried, because a missed claim means the older browser
      // would never be kicked.
      // Forget any id left over from an earlier session on this device so no
      // request made while logging in carries it (the server would answer 409
      // because it is no longer the account's active id).
      sessionIdRef.current = null;
      let claimed = false;
      for (let attempt = 0; attempt < 3 && !claimed; attempt++) {
        try {
          const claimRes = await fetch(`${API_BASE_URL}/auth/claim-session`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId: newSessionId }),
          });
          claimed = claimRes.ok;
          if (!claimed) {
            console.error('[session] claim-session failed:', claimRes.status, await claimRes.text().catch(() => ''));
          }
        } catch (e) {
          console.error('claim-session failed:', e);
        }
        if (!claimed) await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }

      if (!claimed) {
        // Fail closed: a login that could not claim the session would leave
        // the other browser signed in too.
        const message = 'We could not secure your session. Please check your connection and sign in again.';
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(message);
        else Alert.alert('Sign-in failed', message);
        try { await signOut(auth); } catch {}
        return;
      }

      sessionIdRef.current = newSessionId;
      await AsyncStorage.setItem(SESSION_ID_KEY, newSessionId);
      console.log('[session] claimed session', newSessionId.slice(0, 8));
      isLoggingOutRef.current = false;
      setSessionReplaced(false);
      hasCachedSessionRef.current = true;
      setCurrentUser(user);
      setIsLoggedIn(true);
      setShowLanding(false);
      setShowRegister(false);
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    }
  };

  // Marks the whole login (claim + state updates) as "in progress" so nothing
  // can raise the "signed in on another device" modal in the middle of it.
  const handleLogin = async (user: SignedInUser, freshIdToken?: string) => {
    loginInProgressRef.current = true;
    try {
      await performLogin(user, freshIdToken);
    } finally {
      loginInProgressRef.current = false;
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
      await AsyncStorage.removeItem(SESSION_ID_KEY);
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }

    sessionIdRef.current = null;
    hasCachedSessionRef.current = false;
    setSessionReplaced(false);
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowLanding(true);
    setShowRegister(false);
    setIdToken(null);
  };

  // Called by the "signed in on another device" modal — from the OK button
  // (immediately) or its 4-second timer. Guarded so it only runs once.
  const handleSessionReplacedConfirm = useCallback(() => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;
    void handleLogout().finally(() => {
      isLoggingOutRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-off check against the server. Used when the live stream (re)connects,
  // which covers a login on another device that happened while this one was
  // offline, in the background, or briefly disconnected.
  const checkSessionNow = useCallback(async () => {
    try {
      if (!auth.currentUser) return;
      // A device with no stored id (logged in before this feature) sends
      // "none": it only counts as replaced once someone has claimed a session.
      const sessionId = (await getSessionId()) || 'none';
      const token = await refreshAuthToken(false);
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/auth/session-status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Session-Id': sessionId,
        },
      });
      if (response.status === 409 && canBeReplaced() && (sessionIdRef.current || 'none') === sessionId) {
        setSessionReplaced(true);
      }
    } catch {
      // Offline / transient error: the next reconnect checks again.
    }
  }, [getSessionId, refreshAuthToken]);

  // SAFETY NET #1: re-check on a timer while signed in...
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id || sessionReplaced) return;
    const interval = setInterval(() => void checkSessionNow(), SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLoggedIn, currentUser?.id, sessionReplaced, checkSessionNow]);

  // ...and SAFETY NET #2: the moment this tab / app comes back to the
  // foreground (background tabs get their timers and streams throttled).
  useEffect(() => {
    if (!isLoggedIn || !currentUser?.id || sessionReplaced) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkSessionNow();
    });
    return () => sub.remove();
  }, [isLoggedIn, currentUser?.id, sessionReplaced, checkSessionNow]);

  // INSTANT KICK: the server pushes a "session" event the moment another
  // device logs in to this account. Owned by App.tsx (not StudentApp /
  // TeacherApp) so it also works for admins and while the landing page is
  // showing. onSync = reconnect catch-up + a 2-minute safety check.
  useLiveEvents({
    baseUrl: API_BASE_URL,
    userId: currentUser?.id,
    role: (currentUser?.role || 'student') as 'student' | 'teacher' | 'admin',
    enabled: isLoggedIn && !!currentUser?.id && !sessionReplaced,
    debounceMs: 0,
    getSessionId: () => sessionIdRef.current,
    getHeaders: () => (idTokenRef.current ? { Authorization: `Bearer ${idTokenRef.current}` } : undefined),
    handlers: {
      session: (payload: any) => {
        // Another device claimed the account. A device with no stored id
        // (logged in before this feature) is replaced too.
        const mine = sessionIdRef.current;
        console.log('[session] live event', payload?.sessionId?.slice?.(0, 8), 'mine', mine?.slice?.(0, 8));
        if (payload?.sessionId && payload.sessionId !== mine && canBeReplaced()) setSessionReplaced(true);
      },
    },
    onSync: () => void checkSessionNow(),
  });

  const handleGetStarted = () => {
    setShowLanding(false);
    setShowRegister(false);
  };

  // ✅ NEW: called when the logo in StudentApp/TeacherApp's header is
  // tapped. Unlike handleLogout, this does NOT sign the user out — it just
  // shows the public Landing Page on top of the still-active session, so
  // "Sign In" can be swapped for "Dashboard" and tapping it (via
  // handleGetStarted) simply returns to the dashboard that was already
  // loaded.
  const handleGoToLanding = useCallback(() => {
    setShowLanding(true);
  }, []);

  const handleRegisterSuccess = () => {
    setShowRegister(false);
  };

  const renderScreen = () => {
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
          <LandingPage onGetStarted={handleGetStarted} isSignedIn={isLoggedIn} />
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
      onGoToLanding: handleGoToLanding, // Lets the header logo open the Landing Page
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
  };

  return (
    <>
      {renderScreen()}
      <SessionReplacedModal visible={sessionReplaced} onConfirm={handleSessionReplacedConfirm} />
    </>
  );
}