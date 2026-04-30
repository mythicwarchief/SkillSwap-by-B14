import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBGodtdAjcw2UXBqP6I-lMzJBMxUIszfNY",
  authDomain: "skillswap-63e80.firebaseapp.com",
  projectId: "skillswap-63e80",
  storageBucket: "skillswap-63e80.firebasestorage.app",
  messagingSenderId: "410112800784",
  appId: "1:410112800784:web:9dc180173c0e33afe93295",
  measurementId: "G-EX4QJ5EQ41"
};

const app = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);
