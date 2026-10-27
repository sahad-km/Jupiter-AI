// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API,
    authDomain: "jupiterai-360d1.firebaseapp.com",
    projectId: "jupiterai-360d1",
    storageBucket: "jupiterai-360d1.firebasestorage.app",
    messagingSenderId: "322118656436",
    appId: "1:322118656436:web:cf9fe9ae6bdd0c6c0cd2e1",
    measurementId: "G-DHJKC7HYB1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };