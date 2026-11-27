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
      action: (String(action || 'ADMIN_ACTION').trim() || 'ADMIN_ACTION').toUpperCase().slice(0, 80),
      target: String(target || '').trim().slice(0, 80),
      targetId: String(targetId || '').trim().slice(0, 160),
      details:
        details && typeof details === 'object' && !Array.isArray(details)
          ? details
          : { note: String(details || '') },
      adminEmail: String(user.email || '').trim().slice(0, 254),
      adminUid: user.uid,
      userId: user.uid,
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
