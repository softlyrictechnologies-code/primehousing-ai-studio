import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatFirebaseError, mapPropertyDoc } from './firebaseUtils';

const PROPERTIES_COLLECTION = 'properties';

export async function getPublishedProperties() {
  try {
    const q = query(collection(db, PROPERTIES_COLLECTION), where('published', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .filter((docSnap) => docSnap.data()?.entityType !== 'project')
      .map(mapPropertyDoc);
  } catch (error) {
    throw formatFirebaseError(error, 'getPublishedProperties', PROPERTIES_COLLECTION);
  }
}

export async function getFeaturedProperties(featuredIds = []) {
  const all = await getPublishedProperties();
  const available = all.filter((p) => !p.isSoldOut);
  if (Array.isArray(featuredIds) && featuredIds.length > 0) {
    const selected = available.filter((p) => featuredIds.includes(p.id) || p.isFeatured);
    if (selected.length > 0) return selected.slice(0, 6);
  }
  const flagged = available.filter((p) => p.isFeatured);
  return (flagged.length > 0 ? flagged : available).slice(0, 6);
}

export async function getLatestProperties(limitCount = 4) {
  const all = await getPublishedProperties();
  return [...all]
    .filter((p) => !p.isSoldOut)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, limitCount);
}

export async function getPropertyById(id) {
  if (!id) return null;
  try {
    const snap = await getDoc(doc(db, PROPERTIES_COLLECTION, id));
    if (!snap.exists() || snap.data()?.entityType === 'project') return null;
    const mapped = mapPropertyDoc(snap);
    if (!mapped.published) return null;
    return mapped;
  } catch (error) {
    throw formatFirebaseError(error, 'getPropertyById', PROPERTIES_COLLECTION);
  }
}

export function matchesPropertyCategory(propertyType, filterType) {
  if (!filterType || filterType === 'all') return true;
  const p = String(propertyType || '').toLowerCase().trim();
  const f = String(filterType || '').toLowerCase().trim();
  if (!p) return false;
  if (p === f || p.includes(f) || f.includes(p)) return true;

  const groups = [
    { filter: ['residential'], property: ['residential', 'villa', 'apartment', 'house', 'home'] },
    { filter: ['estate', 'villa'], property: ['estate', 'villa'] },
    { filter: ['agricultural', 'farm'], property: ['agricultural', 'farm', 'agri', 'farmland'] },
    { filter: ['waterfront'], property: ['waterfront', 'beach', 'lake', 'river', 'coastal'] },
    { filter: ['commercial'], property: ['commercial', 'retail', 'office', 'business'] },
    { filter: ['joint venture', 'jv'], property: ['joint venture', 'jv', 'development'] },
  ];

  return groups.some(
    (g) => g.filter.some((kw) => f.includes(kw)) && g.property.some((kw) => p.includes(kw))
  );
}

/**
 * Parses a numeric filter value (number or string) without letting empty strings coerce to 0.
 * Preserves 0 and negative finite numbers, returns undefined for empty/non-finite/NaN values.
 * @param {unknown} value
 * @returns {number | undefined}
 */
export function parseNumericFilter(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  if (typeof value === 'boolean') return undefined;
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Pure filtering, sorting, and pagination pipeline for published property listings.
 * @param {import('../types/realEstate').Property[]} properties
 * @param {import('../types/realEstate').PropertyQueryFilters} [filters]
 * @returns {import('../types/realEstate').PaginatedResult<import('../types/realEstate').Property>}
 */
export function filterAndSortProperties(properties = [], filters = {}) {
  let results = Array.isArray(properties) ? [...properties] : [];

  if (filters.availability === 'published') {
    results = results.filter((p) => p.status === 'published');
  } else if (filters.availability === 'sold') {
    results = results.filter((p) => p.status === 'sold');
  }

  if (filters.location && filters.location !== 'all') {
    const locLower = String(filters.location).toLowerCase();
    results = results.filter(
      (p) =>
        (p.location || '').toLowerCase().includes(locLower) ||
        (p.district || '').toLowerCase().includes(locLower) ||
        (p.town || '').toLowerCase().includes(locLower) ||
        (p.village || '').toLowerCase().includes(locLower) ||
        (p.fullAddress || '').toLowerCase().includes(locLower) ||
        (p.title || '').toLowerCase().includes(locLower)
    );
  }

  if (filters.propertyType && filters.propertyType !== 'all') {
    results = results.filter((p) => matchesPropertyCategory(p.propertyType, filters.propertyType));
  }

  const minPrice = parseNumericFilter(filters.minPrice);
  const maxPrice = parseNumericFilter(filters.maxPrice);
  if (minPrice !== undefined) {
    results = results.filter((p) => Number(p.price) >= minPrice);
  }
  if (maxPrice !== undefined) {
    results = results.filter((p) => Number(p.price) <= maxPrice);
  }

  const minArea = parseNumericFilter(filters.minArea);
  const maxArea = parseNumericFilter(filters.maxArea);
  if (minArea !== undefined) {
    results = results.filter((p) => Number(p.area) >= minArea);
  }
  if (maxArea !== undefined) {
    results = results.filter((p) => Number(p.area) <= maxArea);
  }

  if (filters.search && String(filters.search).trim()) {
    const q = String(filters.search).trim().toLowerCase();
    results = results.filter(
      (p) =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.propertyRef || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q) ||
        (p.district || '').toLowerCase().includes(q) ||
        (p.town || '').toLowerCase().includes(q) ||
        (p.village || '').toLowerCase().includes(q) ||
        (p.fullAddress || '').toLowerCase().includes(q) ||
        (p.propertyType || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.approvalDetails || '').toLowerCase().includes(q) ||
        (p.roadAccess || '').toLowerCase().includes(q) ||
        (Array.isArray(p.features) ? p.features : []).some((f) => String(f).toLowerCase().includes(q))
    );
  }

  const sortBy = filters.sortBy || 'newest';
  results = [...results].sort((a, b) => {
    if (sortBy === 'featured') {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'price_asc') return Number(a.price) - Number(b.price);
    if (sortBy === 'price_desc') return Number(b.price) - Number(a.price);
    if (sortBy === 'area_asc') return Number(a.area) - Number(b.area);
    if (sortBy === 'area_desc') return Number(b.area) - Number(a.area);
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const rawPageSize = Number(filters.pageSize);
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize >= 1 ? Math.floor(rawPageSize) : 6;
  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rawPage = Number(filters.page);
  const requestedPage = Number.isFinite(rawPage) ? Math.floor(rawPage) : 1;
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: results.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function queryProperties(filters = {}) {
  const results = await getPublishedProperties();
  return filterAndSortProperties(results, filters);
}
