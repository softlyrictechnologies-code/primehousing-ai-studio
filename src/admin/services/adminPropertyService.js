import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { formatFirebaseError, mapPropertyDoc } from '../../services/firebaseUtils';
import { deleteStorageFile, uploadPropertyImage } from '../../services/storageService';
import { logAdminAction } from './adminLogService';

const PROPERTIES_COLLECTION = 'properties';

function toAreaSqFt(area, areaUnit) {
  const numeric = Number(area) || 0;
  if (areaUnit === 'Acres') return Math.round(numeric * 43560);
  if (areaUnit === 'Hectares') return Math.round(numeric * 107639);
  if (areaUnit === 'Perches') return Math.round(numeric * 272.25);
  return numeric;
}

function buildStatusFields(uiStatus) {
  if (uiStatus === 'published') {
    return { status: 'published', published: true, isSoldOut: false, soldOutAt: null };
  }
  if (uiStatus === 'sold' || uiStatus === 'sold_out') {
    return { status: 'sold_out', published: true, isSoldOut: true, soldOutAt: serverTimestamp() };
  }
  // 'draft' or 'unavailable' both map to valid Firestore draft state
  return { status: 'draft', published: false, isSoldOut: false, soldOutAt: null };
}

function validatePublishRequirements(payload) {
  const issues = [];
  const title = (payload.title || '').trim();
  const hasLetterAndSpace = /[a-zA-Z]/.test(title) && /\s/.test(title);
  if (title.length < 12 || title.length > 100 || !hasLetterAndSpace) {
    issues.push('Title must be 12–100 characters and contain at least one letter and space.');
  }
  if (!payload.location || !payload.location.trim()) {
    issues.push('Location cannot be empty.');
  }
  if (!(Number(payload.areaSqFt) > 0)) {
    issues.push('Area (areaSqFt) must be greater than 0.');
  }
  if (!(Number(payload.price) > 0)) {
    issues.push('Price must be greater than 0.');
  }
  if (!Array.isArray(payload.images) || payload.images.filter((u) => typeof u === 'string' && u.trim()).length === 0) {
    issues.push('At least one uploaded image URL is required.');
  }
  const approval = (payload.approval || '').trim();
  if (!/(Approved|Verified|Registered)/i.test(approval)) {
    issues.push('Approval text must contain "Approved", "Verified", or "Registered".');
  }
  if (payload.verified !== true) {
    issues.push('Property must be verified (verified == true) before publishing.');
  }

  if (issues.length > 0) {
    throw new Error(`Cannot publish property: ${issues.join(' ')}`);
  }
}

export async function getAllPropertiesAdmin() {
  try {
    const snap = await getDocs(collection(db, PROPERTIES_COLLECTION));
    return snap.docs
      .filter((docSnap) => docSnap.data()?.entityType !== 'project')
      .map(mapPropertyDoc)
      .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  } catch (error) {
    throw formatFirebaseError(error, 'getAllPropertiesAdmin', PROPERTIES_COLLECTION);
  }
}

export async function savePropertyAdmin(propertyInput, imageFiles = [], onProgress = () => {}) {
  const uploadedPaths = [];
  try {
    const user = auth.currentUser;
    const isUpdate = Boolean(propertyInput.id);
    const docRef = isUpdate
      ? doc(db, PROPERTIES_COLLECTION, propertyInput.id)
      : doc(collection(db, PROPERTIES_COLLECTION));
    const propertyId = docRef.id;

    let existingData = null;
    if (isUpdate) {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        existingData = existingSnap.data();
      }
    }

    const uploadedUrls = [];
    for (let i = 0; i < imageFiles.length; i += 1) {
      const file = imageFiles[i];
      const { downloadUrl, storagePath } = await uploadPropertyImage(file, propertyId, (pct) =>
        onProgress({ index: i, total: imageFiles.length, percent: pct })
      );
      uploadedUrls.push(downloadUrl);
      uploadedPaths.push(storagePath);
    }

    const retainedUrls = Array.isArray(propertyInput.images)
      ? propertyInput.images.filter((u) => typeof u === 'string' && !u.startsWith('data:') && u.trim())
      : [];
    const finalImages = [...retainedUrls, ...uploadedUrls];

    const previousImages = Array.isArray(existingData?.images) ? existingData.images : [];
    const previousPaths = Array.isArray(existingData?.storagePaths) ? existingData.storagePaths : [];
    const removedUrls = previousImages.filter((url) => !retainedUrls.includes(url));

    const areaSqFt = toAreaSqFt(propertyInput.area, propertyInput.areaUnit || 'Sq. Ft.');
    const price = Number(propertyInput.price) || 0;
    const statusFields = buildStatusFields(propertyInput.status || 'draft');
    const wasPublished = Boolean(existingData?.published);
    const willBePublished = statusFields.published;

    const verifiedFlag =
      typeof propertyInput.verified === 'boolean'
        ? propertyInput.verified
        : Boolean(existingData?.verified);

    const payload = {
      title: (propertyInput.title || '').trim(),
      propertyRef: (propertyInput.propertyRef || propertyId.slice(0, 10).toUpperCase()).trim(),
      subTitle: (propertyInput.subTitle || '').trim(),
      description: (propertyInput.description || '').trim(),
      location: (propertyInput.location || '').trim(),
      district: (propertyInput.district || '').trim(),
      town: (propertyInput.town || '').trim(),
      village: (propertyInput.village || '').trim(),
      fullAddress: (propertyInput.fullAddress || '').trim(),
      propertyType: (propertyInput.propertyType || 'Residential Plot').trim(),
      price,
      priceLakhs: Number((price / 100000).toFixed(2)),
      pricePerSqFt: areaSqFt > 0 ? Math.round(price / areaSqFt) : 0,
      formattedPrice: `₹${price.toLocaleString('en-IN')}`,
      areaSqFt,
      area: `${propertyInput.area} ${propertyInput.areaUnit || 'Sq. Ft.'}`,
      areaUnit: propertyInput.areaUnit || 'Sq. Ft.',
      roadWidth: (propertyInput.roadAccess || '').trim(),
      approval: (propertyInput.approvalDetails || '').trim(),
      approvalNo: (propertyInput.propertyRef || '').trim(),
      verified: verifiedFlag,
      images: finalImages,
      imageUrls: finalImages,
      image: finalImages[0] || '',
      storagePaths: [...previousPaths.filter((p) => !removedUrls.some((u) => u.includes(p))), ...uploadedPaths],
      amenities: Array.isArray(propertyInput.features) ? propertyInput.features : [],
      featured: Boolean(propertyInput.isFeatured),
      coordinates:
        propertyInput.latitude !== undefined && propertyInput.longitude !== undefined
          ? { lat: Number(propertyInput.latitude), lng: Number(propertyInput.longitude) }
          : existingData?.coordinates || null,
      statusChangedBy: user?.email || user?.uid || 'admin',
      updatedAt: serverTimestamp(),
      ...statusFields,
    };

    if (propertyInput.sourceSubmissionId) {
      payload.sourceSubmissionId = propertyInput.sourceSubmissionId;
    }

    if (!wasPublished && willBePublished) {
      validatePublishRequirements(payload);
    }

    if (existingData) {
      await updateDoc(docRef, payload);
      // Clean up removed Storage images only after Firestore update succeeds
      for (const removedUrl of removedUrls) {
        await deleteStorageFile(removedUrl).catch(() => undefined);
      }
      await logAdminAction({
        action: 'UPDATE_PROPERTY',
        target: 'properties',
        targetId: propertyId,
        details: {
          summary: `${payload.propertyRef} · ${payload.title} (${payload.status})`,
          status: payload.status,
        },
      });
    } else {
      payload.createdBy = user?.uid || '';
      payload.createdAt = serverTimestamp();
      await setDoc(docRef, payload);
      await logAdminAction({
        action: 'CREATE_PROPERTY',
        target: 'properties',
        targetId: propertyId,
        details: {
          summary: `${payload.propertyRef} · ${payload.title} (${payload.status})`,
          status: payload.status,
        },
      });
    }

    const updatedSnap = await getDoc(docRef);
    return mapPropertyDoc(updatedSnap);
  } catch (error) {
    for (const uploadedPath of uploadedPaths) {
      await deleteStorageFile(uploadedPath).catch(() => undefined);
    }
    if (error instanceof Error && error.message.startsWith('Cannot publish property:')) {
      throw error;
    }
    throw formatFirebaseError(error, 'savePropertyAdmin', PROPERTIES_COLLECTION);
  }
}

export async function updatePropertyStatusAdmin(propertyId, uiStatus) {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('Property record not found.');
    }
    const existing = snap.data();
    const statusFields = buildStatusFields(uiStatus);

    if (!existing.published && statusFields.published) {
      validatePublishRequirements({ ...existing, ...statusFields });
    }

    const user = auth.currentUser;
    await updateDoc(docRef, {
      ...statusFields,
      statusChangedBy: user?.email || user?.uid || 'admin',
      updatedAt: serverTimestamp(),
    });

    await logAdminAction({
      action:
        statusFields.status === 'published'
          ? 'PUBLISH_PROPERTY'
          : statusFields.status === 'sold_out'
            ? 'MARK_SOLD_OUT'
            : 'UNPUBLISH_PROPERTY',
      target: 'properties',
      targetId: propertyId,
      details: {
        summary: `${existing.propertyRef || propertyId} marked as ${statusFields.status}`,
        status: statusFields.status,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot publish property:')) {
      throw error;
    }
    throw formatFirebaseError(error, 'updatePropertyStatusAdmin', PROPERTIES_COLLECTION);
  }
}

export async function togglePropertyFeaturedAdmin(propertyId) {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const existing = snap.data();
    const nextFeatured = !Boolean(existing.featured);

    await updateDoc(docRef, {
      featured: nextFeatured,
      updatedAt: serverTimestamp(),
    });

    await logAdminAction({
      action: nextFeatured ? 'FEATURE_PROPERTY' : 'UNFEATURE_PROPERTY',
      target: 'properties',
      targetId: propertyId,
      details: {
        summary: `${existing.propertyRef || propertyId} · ${existing.title}`,
        featured: nextFeatured,
      },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'togglePropertyFeaturedAdmin', PROPERTIES_COLLECTION);
  }
}

export async function deletePropertyAdmin(propertyId) {
  try {
    const docRef = doc(db, PROPERTIES_COLLECTION, propertyId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const existing = snap.data();
    const paths = Array.isArray(existing.storagePaths) ? existing.storagePaths : [];
    const imageUrls = Array.isArray(existing.images) ? existing.images : [];

    await deleteDoc(docRef);

    for (const path of paths) {
      await deleteStorageFile(path).catch(() => undefined);
    }
    for (const url of imageUrls) {
      await deleteStorageFile(url).catch(() => undefined);
    }

    await logAdminAction({
      action: 'DELETE_PROPERTY',
      target: 'properties',
      targetId: propertyId,
      details: {
        summary: `${existing.propertyRef || propertyId} · ${existing.title}`,
      },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'deletePropertyAdmin', PROPERTIES_COLLECTION);
  }
}
