import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { toIsoString } from '../../services/firebaseUtils';

const ADMIN_LOGS_COLLECTION = 'adminLogs';

export async function logAdminAction({
  action,
  target,
  targetId = '',
  details = {},
}) {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const payload = {
      action: String(action || 'ADMIN_ACTION').toUpperCase(),
      target: String(target || ''),
      targetId: String(targetId || ''),
      details: details && typeof details === 'object' ? details : { note: String(details || '') },
      adminEmail: user.email || '',
      adminUid: user.uid,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, ADMIN_LOGS_COLLECTION), payload);
    return ref.id;
  } catch (error) {
    // Log error clearly without exposing secrets
    console.error('[AdminLog:write]', error?.code, error?.message);
    return null;
  }
}

export async function getRecentAdminLogs(maxItems = 25) {
  try {
    const q = query(
      collection(db, ADMIN_LOGS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      const detailSummary =
        typeof data.details?.summary === 'string'
          ? data.details.summary
          : data.targetId
            ? `${data.target} (${data.targetId})`
            : data.target || '';
      return {
        id: docSnap.id,
        action: data.action || '',
        detail: detailSummary,
        timestamp: toIsoString(data.createdAt),
        adminEmail: data.adminEmail || '',
      };
    });
  } catch (error) {
    console.error('[AdminLog:read]', error?.code, error?.message);
    return [];
  }
}
