import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { formatFirebaseError, normalizePhone } from './firebaseUtils';
import { deleteStorageFile, uploadSellerSubmissionImage } from './storageService';

const SELLER_SUBMISSIONS_COLLECTION = 'sellerSubmissions';

function toAreaSqFt(area, areaUnit) {
  const numeric = Number(area) || 0;
  if (areaUnit === 'Acres') return Math.round(numeric * 43560);
  if (areaUnit === 'Hectares') return Math.round(numeric * 107639);
  if (areaUnit === 'Perches') return Math.round(numeric * 272.25);
  return numeric;
}

export async function createSellerSubmission(input, imageFiles = [], onProgress = () => {}) {
  const sellerName = String(input?.ownerName || input?.sellerName || '').trim().slice(0, 120);
  const sellerPhone = normalizePhone(input?.phone || input?.sellerPhone);
  const sellerEmail = String(input?.email || input?.sellerEmail || '').trim().slice(0, 254);
  const location = String(input?.location || '').trim().slice(0, 160);
  const districtTownVillage = String(input?.districtTownVillage || '').trim().slice(0, 160);
  const propertyType = String(input?.propertyType || 'Residential Land').trim().slice(0, 80);
  const areaUnit = String(input?.areaUnit || 'Acres').trim().slice(0, 40);
  const areaValue = Number(input?.area) || 0;
  const areaSqFt = toAreaSqFt(areaValue, areaUnit);
  const expectedPrice = Number(input?.expectedPrice) || 0;
  const description = String(input?.description || '').trim().slice(0, 2000);
  const consentToContact = Boolean(input?.consentGiven ?? input?.consentToContact);

  if (!sellerName) throw new Error('Landowner full name is required.');
  if (!/^[0-9]{10}$/.test(sellerPhone)) throw new Error('A valid 10-digit mobile number is required.');
  if (!location || !districtTownVillage) {
    throw new Error('Primary location and district / town / village are required.');
  }
  if (!propertyType) throw new Error('Property category is required.');
  if (!(areaValue > 0) || !(areaSqFt > 0)) throw new Error('Land area must be greater than 0.');
  if (!(expectedPrice > 0)) throw new Error('Expected price must be greater than 0.');
  if (!description) throw new Error('Property description is required.');
  if (!consentToContact) throw new Error('Consent to contact is required.');

  const storagePaths = [];
  try {
    const submissionsRef = collection(db, SELLER_SUBMISSIONS_COLLECTION);
    const docRef = doc(submissionsRef);
    const submissionId = docRef.id;

    const uploadedUrls = [];

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

    const existingUrls = Array.isArray(input?.images)
      ? input.images.filter((url) => typeof url === 'string' && !url.startsWith('data:'))
      : [];
    const finalImages = [...uploadedUrls, ...existingUrls].slice(0, 10);

    const title = (
      String(input?.title || '').trim() ||
      `${propertyType || 'Land'} in ${location || 'Prime Location'}`
    ).slice(0, 200);

    const payload = {
      title,
      sellerName,
      sellerPhone,
      sellerEmail,
      location,
      districtTownVillage,
      propertyType,
      areaSqFt,
      area: `${areaValue} ${areaUnit}`.slice(0, 80),
      areaUnit,
      areaValue,
      expectedPrice,
      description,
      roadAccess: String(input?.roadAccess || '').trim().slice(0, 160),
      approvalDetails: String(input?.approvalDetails || '').trim().slice(0, 200),
      additionalNotes: String(input?.additionalNotes || '').trim().slice(0, 1000),
      images: finalImages,
      storagePaths: storagePaths.slice(0, 10),
      status: 'pending',
      reviewStatus: 'pending',
      consentToContact,
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
    for (const uploadedPath of storagePaths) {
      await deleteStorageFile(uploadedPath).catch(() => undefined);
    }
    throw formatFirebaseError(error, 'createSellerSubmission', SELLER_SUBMISSIONS_COLLECTION);
  }
}
