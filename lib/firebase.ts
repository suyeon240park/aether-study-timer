import { initializeApp, getApps, FirebaseApp } from "firebase/app"
import { getAuth, Auth } from "firebase/auth"
import { getDatabase, Database } from "firebase/database"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Check if Firebase config has required values
const hasValidConfig = () => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
};

// Initialize Firebase only on client-side and when config is valid
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let database: Database | undefined;

if (typeof window !== 'undefined') {
  if (hasValidConfig()) {
    try {
      // Check if already initialized
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }
      auth = getAuth(app);
      database = getDatabase(app);
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }
}

// Export with type assertions for components that expect non-undefined values
// Components should handle the case where these might be undefined
export { app, auth, database }
export const isFirebaseConfigured = () => !!app && !!auth && !!database;

