import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { formatFirebaseError, normalizePhone } from './firebaseUtils';

const CONTACT_MESSAGES_COLLECTION = 'contactMessages';

export async function createContactMessage({
  name,
  email = '',
  phone,
  subject = 'General Contact Enquiry',
  message,
  source = 'contact-page',
}) {
  try {
    const payload = {
      name: (name || '').trim(),
      email: (email || '').trim(),
      phone: normalizePhone(phone),
      subject: (subject || 'General Contact Enquiry').trim(),
      message: (message || '').trim(),
      status: 'new',
      source,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, CONTACT_MESSAGES_COLLECTION), payload);
    return {
      id: docRef.id,
      enquiryRef: docRef.id.slice(0, 10).toUpperCase(),
    };
  } catch (error) {
    throw formatFirebaseError(error, 'createContactMessage', CONTACT_MESSAGES_COLLECTION);
  }
}
