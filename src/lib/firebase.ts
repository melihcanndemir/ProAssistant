
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
// measurementId is optional for basic Firebase functionality

let firebaseConfigIsValid = true;
const placeholderErrorMsg = " is missing, a placeholder, or invalid. Firebase will likely not work correctly. Please ensure it is set correctly in your .env file and RESTART the Next.js development server.";

if (!apiKey || apiKey.includes("YOUR_") || apiKey.length < 10) {
  console.error(
    `CRITICAL: Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY)${placeholderErrorMsg}`
  );
  firebaseConfigIsValid = false;
}
if (!authDomain || authDomain.includes("YOUR_") || !authDomain.includes(".firebaseapp.com")) {
  console.error(
    `CRITICAL: Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)${placeholderErrorMsg}`
  );
  firebaseConfigIsValid = false;
}
if (!projectId || projectId.includes("YOUR_") || projectId.length < 4) {
  console.error(
    `CRITICAL: Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID)${placeholderErrorMsg}`
  );
  firebaseConfigIsValid = false;
}
if (!storageBucket || storageBucket.includes("YOUR_") || !storageBucket.includes(".appspot.com")) {
  console.warn( // Storage bucket might not be immediately fatal for all apps, so warn
    `Warning: Firebase Storage Bucket (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) appears to be missing, a placeholder, or invalid. File uploads/storage may fail.`
  );
  // Do not set firebaseConfigIsValid to false for this one unless strictly needed by the app
}
if (!messagingSenderId || messagingSenderId.includes("YOUR_") || messagingSenderId.length < 6) {
    console.warn( // Messaging Sender ID might not be immediately fatal
    `Warning: Firebase Messaging Sender ID (NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) appears to be missing, a placeholder, or invalid. FCM may not work.`
  );
}
if (!appId || appId.includes("YOUR_") || !appId.startsWith("1:")) {
    console.warn( // App ID might not be immediately fatal
    `Warning: Firebase App ID (NEXT_PUBLIC_FIREBASE_APP_ID) appears to be missing, a placeholder, or invalid.`
  );
}


if (!firebaseConfigIsValid) {
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("! Firebase configuration seems INVALID due to issues listed above.             !");
  console.error("! Please check your .env file and ensure all NEXT_PUBLIC_FIREBASE_...          !");
  console.error("! variables are set with your ACTUAL Firebase project credentials.             !");
  console.error("!                                                                            !");
  console.error("! IMPORTANT: After updating .env, YOU MUST RESTART your Next.js dev server.    !");
  console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
}

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
// Initialize Firebase
// The SDK will throw its own errors if config is fundamentally broken (e.g., completely missing)
// Our checks above are to guide the user.
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (error) {
    console.error("CRITICAL: Firebase failed to initialize. This is often due to invalid configuration.", error);
    // You might want to throw the error or handle it in a way that stops app execution
    // if Firebase is absolutely critical for the app to even start.
    // For now, we let it proceed so Auth/DB objects can be exported, though they won't work.
    // This matches the original behavior of initializing even with potentially bad config.
    // A more robust approach would be to conditionally initialize or throw.
    
    // Fallback to a minimal app object to prevent crashes on getAuth/getFirestore if init fails catastrophically
    // This is a defensive measure; the console errors are the primary feedback.
    app = {} as FirebaseApp; 
  }
} else {
  app = getApp();
}

let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  auth = getAuth(app);
} catch (e) {
  console.error("Failed to get Auth instance. Check Firebase initialization.", e);
  auth = {} as Auth; // Fallback
}

try {
  db = getFirestore(app);
} catch (e) {
  console.error("Failed to get Firestore instance. Check Firebase initialization.", e);
  db = {} as Firestore; // Fallback
}

try {
  storage = getStorage(app);
} catch (e) {
  console.error("Failed to get Storage instance. Check Firebase initialization.", e);
  storage = {} as FirebaseStorage; // Fallback
}

export { app, auth, db, storage };

//git
