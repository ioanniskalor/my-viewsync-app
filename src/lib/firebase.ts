// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDCUglXJ2D4Nmlqr_MlFbI1utZVuKsJA08",
  authDomain: "viewsync-5ero0.firebaseapp.com",
  projectId: "viewsync-5ero0",
  storageBucket: "viewsync-5ero0.firebasestorage.app",
  messagingSenderId: "366709133184",
  appId: "1:366709133184:web:b4fb3ef897acace4533b65"
};

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const storage = getStorage(app);
