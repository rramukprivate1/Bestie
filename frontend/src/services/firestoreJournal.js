// firestoreJournal.js
//
// Journal entries and saved quotes/reflections both live in the same
// Firestore subcollection, distinguished by a `type` field - encrypted
// exactly like chat messages (see firestoreMessages.js), before ever
// touching Firestore.

import { doc, collection, addDoc, deleteDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseClient';

export async function loadJournalEntries(uid) {
  const ref = collection(db, 'users', uid, 'journal');
  const q = query(ref, orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveJournalEntry(uid, { type, contentEncrypted, timestamp }) {
  const ref = collection(db, 'users', uid, 'journal');
  const docRef = await addDoc(ref, { type, contentEncrypted, timestamp, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function deleteJournalEntry(uid, entryId) {
  await deleteDoc(doc(db, 'users', uid, 'journal', entryId));
}
