import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatFirebaseError, toIsoString } from './firebaseUtils';

const INSIGHTS_COLLECTION = 'insights';

export async function getPublishedInsights() {
  try {
    const q = query(collection(db, INSIGHTS_COLLECTION), where('published', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data() || {};
        return {
          id: docSnap.id,
          title: data.title || '',
          excerpt: data.excerpt || '',
          content: data.content || '',
          category: data.category || '',
          image: data.image || '',
          published: Boolean(data.published),
          createdAt: toIsoString(data.createdAt),
        };
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  } catch (error) {
    throw formatFirebaseError(error, 'getPublishedInsights', INSIGHTS_COLLECTION);
  }
}
