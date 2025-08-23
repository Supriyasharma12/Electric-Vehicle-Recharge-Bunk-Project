// src/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCf9qiazKSDCHqYOFg5sZuCN_sFbrKXhBI",
  authDomain: "ev-recharge-bunk-ad45b.firebaseapp.com",
  projectId: "ev-recharge-bunk-ad45b",
  storageBucket: "ev-recharge-bunk-ad45b.firebasestorage.app",
  messagingSenderId: "1037429785993",
  appId: "1:1037429785993:web:da56a19b302e4406d90d58",
  measurementId: "G-HGEXGR4RTL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export {app,  auth, db};