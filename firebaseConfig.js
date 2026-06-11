import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native"; // Import Platform to detect environment

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "parseit2-4b26d.firebaseapp.com",
  projectId: "parseit2-4b26d",
  storageBucket: "parseit2-4b26d.firebasestorage.app",
  messagingSenderId: "808675748328",
  appId: "1:808675748328:web:040c0b704a93716ec79c5d",
};

const app = initializeApp(firebaseConfig);

// Conditionally set persistence based on the platform
const auth = initializeAuth(app, {
  persistence: Platform.OS === "web" 
    ? browserLocalPersistence 
    : getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { app, auth, db };
