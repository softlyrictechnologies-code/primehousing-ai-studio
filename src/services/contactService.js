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
  const cleanName = String(name || '').trim().slice(0, 120);
  const cleanPhone = normalizePhone(phone);
  const cleanMessage = String(message || '').trim().slice(0, 2000);

  if (!cleanName) {
    throw new Error('Please enter your full name.');
  }
  if (!/^[0-9]{10}$/.test(cleanPhone)) {
    throw new Error('Please provide a valid 10-digit mobile number.');
  }
  if (!cleanMessage) {
    throw new Error('Please enter your message.');
  }

  try {
    const payload = {
      name: cleanName,
      email: String(email || '').trim().slice(0, 254),
      phone: cleanPhone,
      subject: String(subject || 'General Contact Enquiry').trim().slice(0, 200),
      message: cleanMessage,
      status: 'new',
      source: String(source || 'contact-page').trim().slice(0, 80),
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
