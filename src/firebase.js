import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4F_sLR59qqLFO8ZrNgyKW6BVvRPdeJyA",
  authDomain: "datum-studio.firebaseapp.com",
  projectId: "datum-studio",
  storageBucket: "datum-studio.firebasestorage.app",
  messagingSenderId: "984256862268",
  appId: "1:984256862268:web:b3b591ac79fda4c3d64b39",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);