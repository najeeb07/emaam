// js/firebaseConfig.js
// Firebase configuration and initialization (v8 SDK)

export const firebaseConfig = {
  apiKey: "AIzaSyBozFwTNyNCGH8KBi0-D4OrxbRwrtIRfUw",
  authDomain: "emaam-digitalbow.firebaseapp.com",
  projectId: "emaam-digitalbow",
  storageBucket: "emaam-digitalbow.firebasestorage.app",
  messagingSenderId: "490328842174",
  appId: "1:490328842174:web:120dbc482d2be0288a63ef"
};

let _firebaseContext = null;

/**
 * Initialize Firebase app once and reuse auth/firestore/storage.
 */
export function initFirebase() {
  if (_firebaseContext) return _firebaseContext;

  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const auth = firebase.auth();
  const firestore = firebase.firestore();
  const storage = firebase.storage();

  _firebaseContext = { auth, firestore, storage };
  return _firebaseContext;
}