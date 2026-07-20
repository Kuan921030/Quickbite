import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const isConfigured = !!firebaseConfig.apiKey;

if (!isConfigured) {
  console.warn(
    'Firebase is not configured yet. Please set VITE_FIREBASE_* environment variables in your settings.'
  );
}

// Initialize Firebase with fallback to prevent crashes if config is blank initially
const app = initializeApp(
  isConfigured
    ? firebaseConfig
    : {
        apiKey: "placeholder-key",
        authDomain: "placeholder.firebaseapp.com",
        projectId: "placeholder-id",
        storageBucket: "placeholder.appspot.com",
        messagingSenderId: "000000000000",
        appId: "1:000000000000:web:0000000000000000000000"
      }
);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export { isConfigured };

