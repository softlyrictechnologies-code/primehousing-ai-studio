import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { formatFirebaseError, toIsoString } from './firebaseUtils';

const USERS_COLLECTION = 'users';

export async function getUserProfile(uid) {
  if (!uid) return null;
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (!snap.exists()) return null;
    const data = snap.data() || {};
    return {
      uid: snap.id,
      email: data.email || '',
      name: data.name || '',
      phone: data.phone || '',
      role: data.role || '',
      createdAt: toIsoString(data.createdAt),
      updatedAt: toIsoString(data.updatedAt),
    };
  } catch (error) {
    throw formatFirebaseError(error, 'getUserProfile', USERS_COLLECTION);
  }
}

export async function upsertUserProfile(uid, profile) {
  if (!uid) throw new Error('User ID is required.');
  try {
    const ref = doc(db, USERS_COLLECTION, uid);
    const existing = await getDoc(ref);
    const payload = {
      uid,
      email: (profile.email || '').trim(),
      name: (profile.name || '').trim(),
      phone: (profile.phone || '').trim(),
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      payload.createdAt = serverTimestamp();
    }
    await setDoc(ref, payload, { merge: true });
    return getUserProfile(uid);
  } catch (error) {
    throw formatFirebaseError(error, 'upsertUserProfile', USERS_COLLECTION);
  }
}
