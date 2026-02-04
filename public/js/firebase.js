// import firebase from "firebase/app";
// import "firebase/auth";
// import "firebase/firestore";
// import "firebase/storage";

// const firebaseConfig = {
//   apiKey: "AIzaSyCeEFESRjt_xpg4Ay1orAJLNqOeIsatOMk",
//   authDomain: "stayhub-1.firebaseapp.com",
//   projectId: "stayhub-1",
//   storageBucket: "stayhub-1.firebasestorage.app",
//   messagingSenderId: "257533261113",
//   appId: "1:257533261113:web:74e540f11025f23529a4e8",
//   measurementId: "G-C74TJ53YPN"
// }; 

// firebase.initializeApp(firebaseConfig);

// export const auth = firebase.auth();
// export const firestore = firebase.firestore();
// export const storage = firebase.storage();


// public/js/firebase.js
// import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
// import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
// import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// const firebaseConfig = {
//   apiKey: process.env.FIREBASE_API_KEY,
//   authDomain: process.env.FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.FIREBASE_PROJECT_ID,
//   storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.FIREBASE_APP_ID,
//   measurementId: process.env.FIREBASE_MEASUREMENT_ID
// };


// const app = initializeApp(firebaseConfig);

// export const auth = getAuth(app);
// export const firestore = getFirestore(app);
// export const storage = getStorage(app);

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const app = initializeApp(window.firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
