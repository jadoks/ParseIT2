import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  getReactNativePersistence,
  indexedDBLocalPersistence,
  initializeAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "parseit2-4b26d.firebaseapp.com",
  projectId: "parseit2-4b26d",
  storageBucket: "parseit2-4b26d.firebasestorage.app",
  messagingSenderId: "808675748328",
  appId: "1:808675748328:web:040c0b704a93716ec79c5d",
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ✅ ENHANCED: Independent persistence for each platform
// This allows simultaneous login on Web AND Expo Go
const auth = initializeAuth(app, {
  persistence: Platform.OS === "web"
    ? indexedDBLocalPersistence   // Persistent login on web (survives browser restart)
    : getReactNativePersistence(AsyncStorage), // Persistent login on mobile
});

const db = getFirestore(app);

// ✅ ENHANCED: Helper to check current auth state
export const getCurrentUser = () => {
  return auth.currentUser;
};

// ✅ ENHANCED: Helper to check if user is authenticated
export const isAuthenticated = () => {
  return auth.currentUser !== null;
};

// ✅ ENHANCED: Get auth token with error handling
export const getIdToken = async (forceRefresh = false) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No user is currently signed in");
    }
    return await user.getIdToken(forceRefresh);
  } catch (error) {
    console.error("Error getting ID token:", error);
    throw error;
  }
};

// ✅ ENHANCED: Sign out with platform-specific cleanup
export const signOutUser = async () => {
  try {
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
    console.log("User signed out successfully");
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};


export { app, auth, db };

