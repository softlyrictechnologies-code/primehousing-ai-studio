import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { formatFirebaseError, normalizePhone } from './firebaseUtils';
import { uploadSellerSubmissionImage } from './storageService';

const SELLER_SUBMISSIONS_COLLECTION = 'sellerSubmissions';

function toAreaSqFt(area, areaUnit) {
  const numeric = Number(area) || 0;
  if (areaUnit === 'Acres') return Math.round(numeric * 43560);
  if (areaUnit === 'Hectares') return Math.round(numeric * 107639);
  if (areaUnit === 'Perches') return Math.round(numeric * 272.25);
  return numeric;
}

export async function createSellerSubmission(input, imageFiles = [], onProgress = () => {}) {
  try {
    const submissionsRef = collection(db, SELLER_SUBMISSIONS_COLLECTION);
    const docRef = doc(submissionsRef);
    const submissionId = docRef.id;

    const uploadedUrls = [];
    const storagePaths = [];

    for (let i = 0; i < imageFiles.length; i += 1) {
      const file = imageFiles[i];
      const { downloadUrl, storagePath } = await uploadSellerSubmissionImage(
        file,
        submissionId,
        (pct) => onProgress({ index: i, total: imageFiles.length, percent: pct })
      );
      uploadedUrls.push(downloadUrl);
      storagePaths.push(storagePath);
    }

    const existingUrls = Array.isArray(input.images)
      ? input.images.filter((url) => typeof url === 'string' && !url.startsWith('data:'))
      : [];
    const finalImages = [...uploadedUrls, ...existingUrls];

    const areaSqFt = toAreaSqFt(input.area, input.areaUnit);
    const title =
      (input.title || '').trim() ||
      `${input.propertyType || 'Land'} in ${input.location || 'Prime Location'}`;

    const payload = {
      title,
      sellerName: (input.ownerName || input.sellerName || '').trim(),
      sellerPhone: normalizePhone(input.phone || input.sellerPhone),
      sellerEmail: (input.email || input.sellerEmail || '').trim(),
      location: (input.location || '').trim(),
      districtTownVillage: (input.districtTownVillage || '').trim(),
      propertyType: (input.propertyType || 'Residential Land').trim(),
      areaSqFt,
      area: `${input.area} ${input.areaUnit || 'Sq. Ft.'}`,
      areaUnit: input.areaUnit || 'Acres',
      areaValue: Number(input.area) || 0,
      expectedPrice: Number(input.expectedPrice) || 0,
      description: (input.description || '').trim(),
      roadAccess: (input.roadAccess || '').trim(),
      approvalDetails: (input.approvalDetails || '').trim(),
      additionalNotes: (input.additionalNotes || '').trim(),
      images: finalImages,
      storagePaths,
      status: 'pending',
      reviewStatus: 'pending',
      consentToContact: Boolean(input.consentGiven ?? input.consentToContact),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (auth.currentUser?.uid) {
      payload.sellerId = auth.currentUser.uid;
    }

    // Write ONCE after images are uploaded (visitors can create but not update)
    await setDoc(docRef, payload);

    return {
      id: submissionId,
      submissionRef: submissionId.slice(0, 10).toUpperCase(),
    };
  } catch (error) {
    throw formatFirebaseError(error, 'createSellerSubmission', SELLER_SUBMISSIONS_COLLECTION);
  }
}
