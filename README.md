# ProctorExam Lite - From Prototype to Production

This is a Next.js starter project for "ProctorExam Lite", a web-based platform for creating, assigning, proctoring, and evaluating tests. Currently, the app runs with an in-memory data store (`zustand`), making it a great starting point for prototyping.

This guide will walk you through the steps to transition it into a production-ready application by integrating **Firebase Authentication** for user management and **Firestore** for a persistent database.

## Technology Stack

*   **Framework:** [Next.js](https://nextjs.org/) (with App Router)
*   **UI:** [React](https://react.dev/), [ShadCN/UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
*   **AI:** [Google's Genkit](https://firebase.google.com/docs/genkit)
*   **State Management (Prototype):** [Zustand](https://github.com/pmndrs/zustand)

## Step 1: Set Up Your Firebase Project

Before you can integrate Firebase services, you need a Firebase project.

1.  **Create a Firebase Project:**
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click "Add project" and follow the on-screen instructions to create a new project.

2.  **Create a Web App:**
    *   In your new project, go to the Project Overview page.
    *   Click the web icon (`</>`) to add a new web app to your project.
    *   Give your app a nickname and click "Register app".
    *   Firebase will provide you with a `firebaseConfig` object. **Copy this object.**

3.  **Add Firebase Config to Your App:**
    *   Create a new file at the root of your project named `.env.local`.
    *   Add your Firebase configuration to this file. It should look like this:

    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
    NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
    ```

4.  **Create a Firebase Utility:**
    *   Create a file `src/lib/firebase.ts` to initialize Firebase.

    ```typescript
    // src/lib/firebase.ts
    import { initializeApp, getApps } from 'firebase/app';
    import { getAuth } from 'firebase/auth';
    import { getFirestore } from 'firebase/firestore';

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Initialize Firebase
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    export { app, auth, db };
    ```

## Step 2: Implement Firebase Authentication

Next, secure your application by replacing the simulated login with Firebase Authentication.

1.  **Enable Authentication Methods:**
    *   In the Firebase Console, go to **Authentication** > **Sign-in method**.
    *   Enable the sign-in providers you want to use (e.g., Email/Password, Google).

2.  **Create an Auth Context:**
    *   Create a context to provide authentication state to your entire app. Create `src/context/auth-context.tsx`.

    ```tsx
    // src/context/auth-context.tsx
    'use client';
    import { createContext, useContext, useEffect, useState } from 'react';
    import { onAuthStateChanged, User } from 'firebase/auth';
    import { auth } from '@/lib/firebase';

    type AuthContextType = {
      user: User | null;
      loading: boolean;
    };

    const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

    export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
      const [user, setUser] = useState<User | null>(null);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
        });
        return () => unsubscribe();
      }, []);

      return (
        <AuthContext.Provider value={{ user, loading }}>
          {!loading && children}
        </AuthContext.Provider>
      );
    };

    export const useAuth = () => useContext(AuthContext);
    ```
    *   Wrap your `RootLayout` in `src/app/layout.tsx` with this `AuthProvider`.

3.  **Update Login Page:**
    *   Modify `src/app/(auth)/login/page.tsx` to use Firebase for authentication.

    ```tsx
    // Example for email/password login
    import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
    import { auth } from '@/lib/firebase';

    // In your handleAdminLogin function:
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error) {
      // Handle login error
    }
    ```

4.  **Protect Routes with Middleware:**
    *   Use Next.js middleware to protect dashboard and evaluator routes. Create a `middleware.ts` file in your `src` directory.

    ```typescript
    // src/middleware.ts
    import { NextResponse } from 'next/server';
    import type { NextRequest } from 'next/server';

    export function middleware(request: NextRequest) {
      const token = request.cookies.get('firebaseIdToken'); // Or however you store your session
      const { pathname } = request.nextUrl;

      if (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/evaluator'))) {
        return NextResponse.redirect(new URL('/login', request.url));
      }

      return NextResponse.next();
    }

    export const config = {
      matcher: ['/dashboard/:path*', '/evaluator/:path*'],
    };
    ```

## Step 3: Implement Firestore Database

Finally, replace the `zustand` in-memory store with Firestore to persist your data.

1.  **Set Up Firestore:**
    *   In the Firebase Console, go to **Firestore Database** and click "Create database".
    *   Start in **test mode** for now. You can secure it later with Security Rules.

2.  **Create Data Service Files:**
    *   Create files like `src/lib/tests.service.ts` to handle database interactions.

    ```typescript
    // src/lib/tests.service.ts
    import { db } from '@/lib/firebase';
    import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
    import type { Test } from './types';

    const testsCollection = collection(db, 'tests');

    export async function getTests(): Promise<Test[]> {
      const snapshot = await getDocs(testsCollection);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Test));
    }

    export async function addTest(testData: Omit<Test, 'id'>) {
      await addDoc(testsCollection, testData);
    }
    // ... create other functions for update, delete, etc.
    ```

3.  **Replace Zustand Store Logic:**
    *   Go into your components and `zustand` store (`src/lib/store.ts`).
    *   Remove the in-memory data and state management functions.
    *   Instead, use React's `useState` and `useEffect` hooks to fetch data from your new Firestore services.

    **Example in a page component:**
    ```tsx
    // In a page like src/app/(app)/dashboard/tests/page.tsx
    'use client';
    import { useState, useEffect } from 'react';
    import { getTests } from '@/lib/tests.service';
    import type { Test } from '@/lib/types';

    export default function TestsPage() {
      const [tests, setTests] = useState<Test[]>([]);
      const [loading, setLoading] = useState(true);

      useEffect(() => {
        async function fetchTests() {
          const testsData = await getTests();
          setTests(testsData);
          setLoading(false);
        }
        fetchTests();
      }, []);

      if (loading) {
        return <div>Loading tests...</div>;
      }
      // ... rest of your component to display tests
    }
    ```

By following these steps, you will successfully transition your prototype into a robust, scalable application with a secure backend. Good luck!
