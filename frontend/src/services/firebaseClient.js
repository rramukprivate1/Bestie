// firebaseClient.js
//
// Initializes Firebase once and exports the two services this app uses:
// Auth (who's signed in) and Firestore (where messages/profile now live).
//
// The values below are NOT secret in the way an API key normally is -
// Firebase's client config is designed to be embedded in shipped apps;
// real protection comes from the Firestore security rules (see
// firestore.rules), not from hiding this config. It's still pulled from
// .env for clean configuration, not because it needs to be secret.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// Lets Firestore keep working (reading cached data, queuing writes) when
// briefly offline - this is what makes IndexedDB "a local cache only"
// from the roadmap, without hand-rolling a custom cache/sync layer.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open at once - persistence only works in one at a time.
    console.warn('Offline persistence unavailable: app is open in another tab.');
  } else if (err.code === 'unimplemented') {
    console.warn('Offline persistence unavailable: this browser does not support it.');
  }
});
