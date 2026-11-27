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
    throw new Error('Please enter an enquiry message.');
  }

  try {
    const payload = {
      name: cleanName,
      phone: cleanPhone,
      email: String(email || '').trim().slice(0, 254),
      address: String(address || '').trim().slice(0, 300),
      message: cleanMessage,
      propertyId: String(propertyId || '').trim().slice(0, 120),
      propertyTitle: String(propertyTitle || projectName || '').trim().slice(0, 200),
      projectId: String(projectId || '').trim().slice(0, 120),
      projectName: String(projectName || '').trim().slice(0, 200),
      projectSlug: String(projectSlug || '').trim().slice(0, 160),
      enquiryCategory: String(enquiryCategory || '').trim().slice(0, 120),
      source: String(source || 'website').trim().slice(0, 80),
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
