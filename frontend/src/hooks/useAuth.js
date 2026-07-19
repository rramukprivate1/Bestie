// useAuth.js
//
// Phase 4: real accounts via Firebase Auth (email + password), replacing
// the local-only PIN from Phase 1-3. Your password now does double duty:
// Firebase uses it to verify who you are, and - separately, entirely
// client-side - it's also used to derive the same encryption key used
// since Phase 1, via the same PBKDF2 approach, just now with the salt
// stored in Firestore (not secret) instead of on-device only. This
// means Firebase's own servers still never see your message content or
// your derived key - only your password, which it needs anyway to
// authenticate you, exactly like any account system.
//
// IMPORTANT: there's no password reset flow wired up yet. Firebase
// supports one (sendPasswordResetEmail), but resetting your password
// there would NOT recover your encryption key, since the key is derived
// from the old password. Adding a proper "recovery" story is flagged as
// a real gap in the README, not silently glossed over.

import { useState, useCallback, useEffect } from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../services/firebaseClient';
import { createUserProfile, getUserProfile, updateUserProfile } from '../services/firestoreMessages';
import { generateSaltBase64, deriveKey, encryptText, decryptText } from '../services/crypto';

export function useAuth() {
  const [status, setStatus] = useState('checking'); // checking | signed-out | unlocked
  const [uid, setUid] = useState(null);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [profileSummary, setProfileSummary] = useState('');
  const [error, setError] = useState('');

  // If Firebase already has a session (e.g. page refresh), we still need
  // the password to re-derive the encryption key - Firebase doesn't hand
  // that back to us. So a restored session lands signed-in-but-locked,
  // prompting for the password again just for decryption.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setStatus((prev) => (prev === 'unlocked' ? 'unlocked' : 'signed-out'));
      } else {
        setUid(null);
        setCryptoKey(null);
        setProfileSummary('');
        setStatus('signed-out');
      }
    });
    return unsubscribe;
  }, []);

  const signUp = useCallback(async (email, password, initialProfileText) => {
    setError('');
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const salt = generateSaltBase64();
      const key = await deriveKey(password, salt);
      const profileEncrypted = await encryptText(key, initialProfileText || '');

      await createUserProfile(cred.user.uid, salt, profileEncrypted);

      setUid(cred.user.uid);
      setCryptoKey(key);
      setProfileSummary(initialProfileText || '');
      setStatus('unlocked');
      return true;
    } catch (err) {
      setError(friendlyAuthError(err));
      return false;
    }
  }, []);

  const logIn = useCallback(async (email, password) => {
    setError('');
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await getUserProfile(cred.user.uid);

      if (!profile) {
        setError('Signed in, but no profile found for this account - contact support.');
        return false;
      }

      const key = await deriveKey(password, profile.salt);
      let decryptedProfile;
      try {
        decryptedProfile = await decryptText(key, profile.profileEncrypted);
      } catch {
        // Shouldn't happen if Firebase Auth already accepted this password,
        // but guards against a corrupted profile document.
        setError('Could not unlock your data with this account. Please contact support.');
        return false;
      }

      setUid(cred.user.uid);
      setCryptoKey(key);
      setProfileSummary(decryptedProfile);
      setStatus('unlocked');
      return true;
    } catch (err) {
      setError(friendlyAuthError(err));
      return false;
    }
  }, []);

  const logOut = useCallback(async () => {
    await signOut(auth);
    setCryptoKey(null);
    setProfileSummary('');
    setStatus('signed-out');
  }, []);

  const updateProfile = useCallback(
    async (newProfileText) => {
      if (!cryptoKey || !uid) return;
      const encrypted = await encryptText(cryptoKey, newProfileText);
      await updateUserProfile(uid, encrypted);
      setProfileSummary(newProfileText);
    },
    [cryptoKey, uid]
  );

  return { status, uid, cryptoKey, profileSummary, error, signUp, logIn, logOut, updateProfile };
}

function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code.includes('email-already-in-use')) return 'An account with this email already exists - try logging in instead.';
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'Incorrect email or password.';
  if (code.includes('user-not-found')) return 'No account found with this email.';
  if (code.includes('weak-password')) return 'Password should be at least 6 characters.';
  if (code.includes('invalid-email')) return 'That email address doesn\'t look right.';
  if (code.includes('network-request-failed')) return 'Network error - check your internet connection.';
  return err?.message || 'Something went wrong.';
}
