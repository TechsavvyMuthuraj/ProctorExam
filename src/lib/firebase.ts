// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth, signInAnonymously } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseEnabled = !!firebaseConfig.apiKey;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (isFirebaseEnabled) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    // Provide mock objects if Firebase is not enabled
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
}

const signInAsCandidate = async () => {
    if (!isFirebaseEnabled) return null;
    try {
        const userCredential = await signInAnonymously(auth);
        return userCredential.user;
    } catch (error: any) {
        if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/admin-restricted-operation') {
            console.error("Firebase Anonymous Sign-In Error: This operation is not allowed. Please make sure Anonymous sign-in is enabled in your Firebase Console's Authentication section.");
            throw new Error("Anonymous sign-in is not enabled in Firebase. Please enable it in the Firebase console.");
        }
        console.error("Anonymous sign-in error:", error);
        return null;
    }
}


export { app, auth, db, signInAsCandidate };
