import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || 'AIzaSyAyz1if2QntTkbcXc6cucm3QvlGRxTRxlM',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'prime-housing-72330.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || 'prime-housing-72330',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'prime-housing-72330.firebasestorage.app',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '109727454488',
  appId: getEnv('VITE_FIREBASE_APP_ID') || '1:109727454488:web:9e5e35eddb61c577343a6d',
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || 'G-5QC8ZG3WCC',
};

const existingApps = getApps();
export const app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
