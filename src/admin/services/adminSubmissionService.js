import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { formatFirebaseError, toIsoString } from '../../services/firebaseUtils';
import { logAdminAction } from './adminLogService';
import { savePropertyAdmin } from './adminPropertyService';

const SELLER_SUBMISSIONS_COLLECTION = 'sellerSubmissions';

/**
 * @param {any} docSnap
 * @returns {import('../../types/realEstate').LandownerSubmission}
 */
function mapSubmissionDoc(docSnap) {
  const data = docSnap.data() || {};
  const statusRaw = data.reviewStatus || data.status || 'pending';
  return {
    id: docSnap.id,
    submissionRef: data.submissionRef || docSnap.id.slice(0, 10).toUpperCase(),
    ownerName: data.sellerName || data.ownerName || '',
    phone: data.sellerPhone || data.phone || '',
    email: data.sellerEmail || data.email || '',
    location: data.location || '',
    districtTownVillage: data.districtTownVillage || data.location || '',
    propertyType: data.propertyType || 'Residential Land',
    area: typeof data.areaValue === 'number' && data.areaValue > 0
      ? data.areaValue
      : Number(data.areaSqFt || 0),
    areaUnit: /** @type {import('../../types/realEstate').AreaUnit} */ (data.areaUnit || 'Sq. Ft.'),
    expectedPrice: Number(data.expectedPrice || 0),
    description: data.description || '',
    roadAccess: data.roadAccess || '',
    approvalDetails: data.approvalDetails || '',
    images: Array.isArray(data.images) ? data.images : [],
    additionalNotes: data.additionalNotes || '',
    consentGiven: Boolean(data.consentToContact ?? data.consentGiven),
    reviewStatus: /** @type {import('../../types/realEstate').SubmissionReviewStatus} */ (statusRaw),
    adminNotes: data.adminNotes || '',
    submittedAt: toIsoString(data.createdAt),
    reviewedAt: toIsoString(data.reviewedAt || data.updatedAt) || null,
    convertedPropertyId: data.convertedPropertyId || '',
  };
}

export async function getAllSubmissionsAdmin() {
  try {
    const q = query(
      collection(db, SELLER_SUBMISSIONS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(mapSubmissionDoc);
  } catch (error) {
    throw formatFirebaseError(error, 'getAllSubmissionsAdmin', SELLER_SUBMISSIONS_COLLECTION);
  }
}

export async function updateSubmissionReviewAdmin(
  submissionId,
  reviewStatus,
  adminNotes,
  convertedPropertyId
) {
  try {
    const docRef = doc(db, SELLER_SUBMISSIONS_COLLECTION, submissionId);
    const payload = {
      status: reviewStatus,
      reviewStatus,
      adminNotes: (adminNotes || '').trim(),
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (convertedPropertyId) {
      payload.convertedPropertyId = convertedPropertyId;
    }

    await updateDoc(docRef, payload);

    await logAdminAction({
      action: `SUBMISSION_${String(reviewStatus).toUpperCase()}`,
      target: SELLER_SUBMISSIONS_COLLECTION,
      targetId: submissionId,
      details: {
        summary: `Submission ${submissionId} marked as ${reviewStatus}`,
        adminNotes: payload.adminNotes,
        convertedPropertyId: convertedPropertyId || '',
      },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'updateSubmissionReviewAdmin', SELLER_SUBMISSIONS_COLLECTION);
  }
}

export async function approveSubmissionAndCreatePropertyAdmin(
  submissionId,
  adminNotes,
  propertyData,
  imageFiles = []
) {
  // Always create a property DRAFT when approving a landowner submission (never auto-publish)
  const draftPayload = {
    ...propertyData,
    status: 'draft',
    sourceSubmissionId: submissionId,
  };

  const createdProperty = await savePropertyAdmin(draftPayload, imageFiles);
  await updateSubmissionReviewAdmin(submissionId, 'approved', adminNotes, createdProperty.id);

  await logAdminAction({
    action: 'APPROVE_SUBMISSION_TO_DRAFT',
    target: SELLER_SUBMISSIONS_COLLECTION,
    targetId: submissionId,
    details: {
      summary: `Approved ${submissionId} into draft property ${createdProperty.id}`,
      propertyId: createdProperty.id,
    },
  });

  return createdProperty;
}
