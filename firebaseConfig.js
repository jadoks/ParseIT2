import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbAofFm_8ncGMRB0X2szfKC9TMvmcrzXo",
  authDomain: "parseit2-4b26d.firebaseapp.com",
  projectId: "parseit2-4b26d",
  storageBucket: "parseit2-4b26d.firebasestorage.app",
  messagingSenderId: "808675748328",
  appId: "1:808675748328:web:040c0b704a93716ec79c5d",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
