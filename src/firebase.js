import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC11BKLRPm1N-LxOO1tQhEdBGrEFkYI-f0",
  authDomain: "thecircle-c5b2a.firebaseapp.com",
  projectId: "thecircle-c5b2a",
  storageBucket: "thecircle-c5b2a.firebasestorage.app",
  messagingSenderId: "1032759577324",
  appId: "1:1032759577324:web:ad092e3e3b50f70a4df3c9",
  measurementId: "G-TSVV87YH3B"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);