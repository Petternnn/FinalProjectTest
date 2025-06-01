// src/services/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDQ0bsEM9B2KSJ1ZbFNHgVC584__jCqrag",
  authDomain: "tapblast-cd5d4.firebaseapp.com",
  databaseURL: "https://tapblast-cd5d4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tapblast-cd5d4",
  storageBucket: "tapblast-cd5d4.firebasestorage.app",
  messagingSenderId: "663574982860",
  appId: "1:663574982860:web:00a2c234b564c45c5d1269",
  measurementId: "G-GSYZLNWC1K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export services in need
export const auth = getAuth(app);
export const db = getFirestore(app);
export const realtimeDB = getDatabase(app);
export { analytics };
