import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatFirebaseError, normalizePhone } from './firebaseUtils';

const INQUIRIES_COLLECTION = 'inquiries';

export async function createInquiry({
  name,
  phone,
  email = '',
  address = '',
  message,
  propertyId = '',
  propertyTitle = '',
  projectId = '',
  projectName = '',
  projectSlug = '',
  enquiryCategory = '',
  source = 'website',
}) {
  try {
    const payload = {
      name: (name || '').trim(),
      phone: normalizePhone(phone),
      email: (email || '').trim(),
      address: (address || '').trim(),
      message: (message || '').trim(),
      propertyId: propertyId || '',
      propertyTitle: (propertyTitle || projectName || '').trim(),
      projectId: projectId || '',
      projectName: (projectName || '').trim(),
      projectSlug: (projectSlug || '').trim(),
      enquiryCategory: (enquiryCategory || '').trim(),
      source,
      status: 'new',
      createdAt: serverTimestamp(),
    };

    // Public CREATE only: never read document before or after writing
    const docRef = await addDoc(collection(db, INQUIRIES_COLLECTION), payload);
    return {
      id: docRef.id,
      enquiryRef: docRef.id.slice(0, 10).toUpperCase(),
    };
  } catch (error) {
    throw formatFirebaseError(error, 'createInquiry', INQUIRIES_COLLECTION);
  }
}
