// firestoreMessages.js
//
// All reads/writes to Firestore live here - the rest of the app doesn't
// know or care that it's Firestore specifically. Messages are stored
// encrypted (see crypto.js) exactly as they were in IndexedDB during
// Phase 1-3; Firestore only ever sees ciphertext.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  orderBy,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebaseClient';

export async function createUserProfile(uid, salt, profileEncrypted) {
  await setDoc(doc(db, 'users', uid), {
    salt,
    profileEncrypted,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, profileEncrypted) {
  await updateDoc(doc(db, 'users', uid), { profileEncrypted });
}

export async function loadAllMessages(uid) {
  const messagesRef = collection(db, 'users', uid, 'messages');
  const q = query(messagesRef, orderBy('timestamp', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveMessage(uid, { role, sessionId, timestamp, contentEncrypted }) {
  const messagesRef = collection(db, 'users', uid, 'messages');
  const docRef = await addDoc(messagesRef, {
    role,
    sessionId,
    timestamp,
    contentEncrypted,
    pinned: false,
  });
  return docRef.id;
}

export async function deleteMessage(uid, messageId) {
  await deleteDoc(doc(db, 'users', uid, 'messages', messageId));
}

export async function setMessagePinned(uid, messageId, pinned) {
  await updateDoc(doc(db, 'users', uid, 'messages', messageId), { pinned });
}
