export function toIsoString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000).toISOString();
  }
  return '';
}

export function normalizePhone(rawPhone) {
  const raw = String(rawPhone || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 14 && digits.startsWith('0091')) {
    return digits.slice(4);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return raw;
}

export function formatFirebaseError(error, contextLabel, collectionName) {
  const code = error?.code || '';
  const message = error?.message || String(error || 'Unknown error');
  console.error(`[Firebase:${contextLabel}]`, code, message);

  if (code === 'permission-denied' || message.toLowerCase().includes('insufficient permissions')) {
    const target = collectionName ? ` on "${collectionName}"` : '';
    return new Error(`Missing or insufficient permissions${target}.`);
  }
  if (code === 'unavailable') {
    return new Error('Firebase service is temporarily unavailable. Please try again.');
  }
  if (code === 'not-found') {
    return new Error('Requested record was not found.');
  }
  return new Error(message || `Failed during ${contextLabel}.`);
}

/**
 * @param {any} docSnap
 * @returns {import('../types/realEstate').Property}
 */
export function mapPropertyDoc(docSnap) {
  const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data || {};
  const id = docSnap.id;

  const images =
    Array.isArray(data.images) && data.images.length > 0
      ? data.images.filter(Boolean)
      : Array.isArray(data.imageUrls) && data.imageUrls.length > 0
        ? data.imageUrls.filter(Boolean)
        : data.image
          ? [data.image]
          : [];

  /** @type {import('../types/realEstate').PropertyStatus} */
  let uiStatus = 'draft';
  if (data.isSoldOut === true || data.status === 'sold_out') {
    uiStatus = 'sold';
  } else if (data.published === true || data.status === 'published') {
    uiStatus = 'published';
  } else if (data.status === 'unavailable') {
    uiStatus = 'unavailable';
  }

  const areaNum =
    typeof data.areaSqFt === 'number' && data.areaSqFt > 0
      ? data.areaSqFt
      : Number(data.areaSqFt || data.areaValue || 0);

  return {
    id,
    title: data.title || '',
    propertyRef: data.propertyRef || data.approvalNo || id.slice(0, 10).toUpperCase(),
    description: data.description || data.subTitle || '',
    subTitle: data.subTitle || '',
    propertyType: data.propertyType || 'Residential Plot',
    location: data.location || '',
    district: data.district || data.location || '',
    town: data.town || '',
    village: data.village || '',
    fullAddress: data.fullAddress || data.location || '',
    latitude: data.coordinates?.lat ?? data.latitude,
    longitude: data.coordinates?.lng ?? data.longitude,
    area: areaNum,
    areaSqFt: areaNum,
    areaText: data.area || (areaNum ? `${areaNum} Sq. Ft.` : ''),
    areaUnit: data.areaUnit || 'Sq. Ft.',
    price: typeof data.price === 'number' ? data.price : Number(data.price || 0),
    priceLakhs: data.priceLakhs,
    pricePerSqFt: data.pricePerSqFt,
    formattedPrice: data.formattedPrice || '',
    images,
    storagePaths: Array.isArray(data.storagePaths) ? data.storagePaths : [],
    features: Array.isArray(data.amenities) && data.amenities.length > 0
      ? data.amenities
      : Array.isArray(data.features)
        ? data.features
        : [],
    roadAccess: data.roadWidth || data.roadAccess || '',
    approvalDetails: data.approval || data.approvalDetails || '',
    approvalNo: data.approvalNo || '',
    verified: Boolean(data.verified),
    isFeatured: Boolean(data.featured ?? data.isFeatured),
    featured: Boolean(data.featured ?? data.isFeatured),
    published: Boolean(data.published),
    isSoldOut: Boolean(data.isSoldOut),
    status: uiStatus,
    rawStatus: data.status || 'draft',
    sourceSubmissionId: data.sourceSubmissionId || '',
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
  };
}
