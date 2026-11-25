import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatFirebaseError } from './firebaseUtils';

const LOCATIONS_COLLECTION = 'locations';

/** @returns {Promise<import('../types/realEstate').LocationOption[]>} */
export async function getActiveLocations() {
  try {
    const q = query(collection(db, LOCATIONS_COLLECTION), where('active', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      return {
        id: docSnap.id,
        name: data.name || '',
        district: data.district || data.name || '',
        type: /** @type {'District' | 'Town' | 'Village'} */ (data.type || 'District'),
        active: Boolean(data.active),
      };
    });
  } catch (error) {
    throw formatFirebaseError(error, 'getActiveLocations', LOCATIONS_COLLECTION);
  }
}
