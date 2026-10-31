// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC24CHxB5NGn15l3A6ubsP6B7MMpO404-Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hire-ai-7f6f3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hire-ai-7f6f3",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "438742505631",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:438742505631:web:368b73e19e28e6750d6aaa",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-20M7QYFHY4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth(app);

export default app;
