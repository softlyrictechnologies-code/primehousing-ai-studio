import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { INITIAL_THANGARAJ_CITY_PROJECT, createEmptyNearbyPlaces } from '../data/initialProjects';
import { formatFirebaseError, toIsoString } from './firebaseUtils';

export const PROJECTS_COLLECTION = 'projects';
export const FALLBACK_PROPERTIES_COLLECTION = 'properties';
export const WEBSITE_CONTENT_COLLECTION = 'websiteContent';
export const PROJECTS_UPDATED_EVENT = 'prime-housing:projects-updated';

export function slugifyProjectName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** @type {import('../types/realEstate').ProjectEditPermissions} */
export const DEFAULT_PROJECT_EDIT_PERMISSIONS = {
  accessMode: 'all_admins',
  allowedRoles: ['super_admin', 'admin', 'editor'],
  allowContentEdit: true,
  allowMediaUpload: true,
  allowPublishToggle: true,
  allowDelete: true,
  restrictedNote: '',
};

const VALID_ROLE_KEYS = ['super_admin', 'admin', 'editor', 'support'];

/**
 * @param {any} rawPerms
 * @returns {import('../types/realEstate').ProjectEditPermissions}
 */
export function normalizeProjectEditPermissions(rawPerms) {
  if (!rawPerms || typeof rawPerms !== 'object') {
    return {
      ...DEFAULT_PROJECT_EDIT_PERMISSIONS,
      allowedRoles: [...DEFAULT_PROJECT_EDIT_PERMISSIONS.allowedRoles],
    };
  }

  const modeRaw = String(rawPerms.accessMode || 'all_admins').toLowerCase();
  /** @type {import('../types/realEstate').ProjectEditAccessMode} */
  const accessMode =
    modeRaw === 'super_admin_only' || modeRaw === 'custom_roles' ? modeRaw : 'all_admins';

  const inputRoles = Array.isArray(rawPerms.allowedRoles)
    ? rawPerms.allowedRoles
        .map((r) => String(r || '').toLowerCase().replace('-', '_'))
        .filter((r) => VALID_ROLE_KEYS.includes(r))
    : [];

  /** @type {import('../types/realEstate').AdminRoleKey[]} */
  let allowedRoles = ['super_admin', 'admin', 'editor'];
  if (accessMode === 'super_admin_only') {
    allowedRoles = ['super_admin'];
  } else if (accessMode === 'custom_roles') {
    const merged = new Set(['super_admin', ...inputRoles]);
    allowedRoles = /** @type {import('../types/realEstate').AdminRoleKey[]} */ (Array.from(merged));
  }

  return {
    accessMode,
    allowedRoles,
    allowContentEdit: rawPerms.allowContentEdit !== false,
    allowMediaUpload: rawPerms.allowMediaUpload !== false,
    allowPublishToggle: rawPerms.allowPublishToggle !== false,
    allowDelete: rawPerms.allowDelete !== false,
    restrictedNote: typeof rawPerms.restrictedNote === 'string' ? rawPerms.restrictedNote.trim() : '',
  };
}

/**
 * Checks whether a signed-in admin role can perform an action on a project.
 * @param {string | null | undefined} role
 * @param {import('../types/realEstate').Project | null | undefined} project
 * @param {'edit' | 'media' | 'publish' | 'delete' | 'manage_permissions'} action
 * @returns {boolean}
 */
export function canAdminRolePerformProjectAction(role, project, action) {
  const normalizedRole = String(role || 'admin').toLowerCase().replace('-', '_');
  if (normalizedRole === 'super_admin') return true;
  if (normalizedRole === 'support') return false;

  const perms = normalizeProjectEditPermissions(project?.editPermissions);
  if (perms.accessMode === 'super_admin_only') return false;

  if (action === 'manage_permissions') {
    return normalizedRole === 'admin';
  }

  if (!perms.allowedRoles.includes(/** @type {any} */ (normalizedRole))) {
    return false;
  }

  if (action === 'edit') return perms.allowContentEdit;
  if (action === 'media') return perms.allowMediaUpload;
  if (action === 'publish') return perms.allowPublishToggle;
  if (action === 'delete') return normalizedRole === 'admin' && perms.allowDelete;
  return false;
}

function normalizeImageAsset(val) {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed ? { url: trimmed } : null;
  }
  if (typeof val === 'object' && typeof val.url === 'string' && val.url.trim()) {
    return {
      id: val.id || undefined,
      url: val.url.trim(),
      storagePath: val.storagePath || '',
      caption: val.caption || '',
      altText: val.altText || '',
      title: val.title || '',
      description: val.description || '',
      visible: val.visible !== false,
      featured: Boolean(val.featured),
    };
  }
  return null;
}

function normalizeDocAsset(val, fallbackId = 'doc') {
  if (!val) return null;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed
      ? { id: fallbackId, name: fallbackId, description: '', url: trimmed, visible: true }
      : null;
  }
  if (typeof val === 'object' && typeof val.url === 'string' && val.url.trim()) {
    return {
      id: val.id || fallbackId,
      name: val.name || 'Project Document',
      description: val.description || '',
      url: val.url.trim(),
      storagePath: val.storagePath || '',
      fileType: val.fileType || '',
      visible: val.visible !== false,
    };
  }
  return null;
}

/**
 * @param {any} docSnap
 * @returns {import('../types/realEstate').Project}
 */
export function mapProjectDoc(docSnap) {
  const raw = typeof docSnap.data === 'function' ? docSnap.data() : docSnap.data || docSnap;
  const data = raw?.projectData && typeof raw.projectData === 'object' ? raw.projectData : raw || {};
  const rawId = docSnap.id || data.id || '';
  const cleanId = rawId.startsWith('project_') ? rawId.replace(/^project_/, '') : rawId;

  const imagesObj = data.images || {};
  const routeMapObj = data.routeMap || {};
  const docsObj = data.documents || {};
  const seoObj = data.seo || {};
  const nearbyObj = data.nearbyPlaces || {};
  const emptyNearby = createEmptyNearbyPlaces();

  const rawStatus = String(raw?.status || data.status || '').toLowerCase();
  /** @type {import('../types/realEstate').ProjectStatus} */
  let status = 'draft';
  if (rawStatus === 'published') {
    status = 'published';
  } else if (rawStatus === 'unpublished') {
    status = 'unpublished';
  } else if (rawStatus === 'draft') {
    status = 'draft';
  } else if (data.published === true || raw?.published === true) {
    status = 'published';
  }

  const name = data.name || raw?.title || '';
  const slug = data.slug || seoObj.slug || slugifyProjectName(name) || cleanId;

  return {
    id: cleanId || slug,
    name,
    slug,
    category: data.category || data.propertyType || 'Residential Plots',
    location: data.location || '',
    address: data.address || '',
    shortDescription: data.shortDescription || '',
    fullDescription: data.fullDescription || data.description || '',
    propertyType: data.propertyType || data.category || 'Residential Plots',
    approvalType: data.approvalType || '',
    approvalNumber: data.approvalNumber || '',
    reraNumber: data.reraNumber || '',
    projectStatusLabel: data.projectStatusLabel || (status === 'published' ? 'Available' : 'Draft'),
    status,
    startingPrice: data.startingPrice || '',
    pricePerSqFt: data.pricePerSqFt || '',
    totalPlots: data.totalPlots || '',
    availablePlots: data.availablePlots || '',
    plotSizes: data.plotSizes || '',
    plotAvailabilityNote: data.plotAvailabilityNote || '',
    specialOffers: data.specialOffers || '',
    pricingDescription: data.pricingDescription || '',
    overviewHeading: data.overviewHeading || 'Project Overview',
    overviewSubheading: data.overviewSubheading || '',
    overviewParagraphs: Array.isArray(data.overviewParagraphs) ? data.overviewParagraphs : [],
    whyChooseItems: Array.isArray(data.whyChooseItems) ? data.whyChooseItems : [],
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    amenities: Array.isArray(data.amenities) ? data.amenities : [],
    locationAdvantages: Array.isArray(data.locationAdvantages) ? data.locationAdvantages : [],
    nearbyPlaces: {
      schools: Array.isArray(nearbyObj.schools) ? nearbyObj.schools : emptyNearby.schools,
      colleges: Array.isArray(nearbyObj.colleges) ? nearbyObj.colleges : emptyNearby.colleges,
      hospitals: Array.isArray(nearbyObj.hospitals) ? nearbyObj.hospitals : emptyNearby.hospitals,
      shoppingCentres: Array.isArray(nearbyObj.shoppingCentres)
        ? nearbyObj.shoppingCentres
        : emptyNearby.shoppingCentres,
      supermarkets: Array.isArray(nearbyObj.supermarkets)
        ? nearbyObj.supermarkets
        : emptyNearby.supermarkets,
      railwayStations: Array.isArray(nearbyObj.railwayStations)
        ? nearbyObj.railwayStations
        : emptyNearby.railwayStations,
      busTerminals: Array.isArray(nearbyObj.busTerminals)
        ? nearbyObj.busTerminals
        : emptyNearby.busTerminals,
      landmarks: Array.isArray(nearbyObj.landmarks) ? nearbyObj.landmarks : emptyNearby.landmarks,
    },
    images: {
      heroImage: normalizeImageAsset(imagesObj.heroImage),
      entranceImage: normalizeImageAsset(imagesObj.entranceImage),
      siteImage1: normalizeImageAsset(imagesObj.siteImage1),
      siteImage2: normalizeImageAsset(imagesObj.siteImage2),
      gallery: Array.isArray(imagesObj.gallery)
        ? imagesObj.gallery.map(normalizeImageAsset).filter(Boolean)
        : [],
    },
    routeMap: {
      image: normalizeImageAsset(routeMapObj.image),
      qrCode: normalizeImageAsset(routeMapObj.qrCode),
      googleMapsUrl: routeMapObj.googleMapsUrl || '',
      address: routeMapObj.address || data.address || '',
      locationDescription: routeMapObj.locationDescription || '',
    },
    documents: {
      layoutPlan: normalizeDocAsset(docsObj.layoutPlan, 'layout-plan'),
      keyPlan: normalizeDocAsset(docsObj.keyPlan, 'key-plan'),
      brochure: normalizeDocAsset(docsObj.brochure, 'brochure'),
      approvalDocuments: Array.isArray(docsObj.approvalDocuments)
        ? docsObj.approvalDocuments.map((d, i) => normalizeDocAsset(d, `approval-${i}`)).filter(Boolean)
        : [],
      additionalPdfs: Array.isArray(docsObj.additionalPdfs)
        ? docsObj.additionalPdfs.map((d, i) => normalizeDocAsset(d, `pdf-${i}`)).filter(Boolean)
        : [],
    },
    seo: {
      title: seoObj.title || '',
      metaDescription: seoObj.metaDescription || '',
      slug: seoObj.slug || slug,
      ogImage: seoObj.ogImage || '',
      ogImageAlt: seoObj.ogImageAlt || '',
    },
    contactPhone: data.contactPhone || '',
    contactEmail: data.contactEmail || '',
    contactAddress: data.contactAddress || '',
    plotViewUrl: data.plotViewUrl || '',
    editPermissions: normalizeProjectEditPermissions(data.editPermissions || raw?.editPermissions),
    createdAt: toIsoString(data.createdAt || raw?.createdAt),
    updatedAt: toIsoString(data.updatedAt || raw?.updatedAt),
  };
}

export async function isProjectsCatalogManaged() {
  try {
    const snap = await getDoc(doc(db, WEBSITE_CONTENT_COLLECTION, 'main'));
    if (snap.exists()) {
      const data = snap.data() || {};
      return Boolean(data.projectsCatalogManaged);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Fetches published projects from `projects` collection and/or `properties` (entityType === 'project').
 * Includes the verified initial Thangaraj City project until admin explicitly manages/overrides it in Firestore.
 * @returns {Promise<import('../types/realEstate').Project[]>}
 */
export async function getPublishedProjects() {
  const bySlug = new Map();

  try {
    const q = query(collection(db, PROJECTS_COLLECTION), where('status', '==', 'published'));
    const snap = await getDocs(q);
    snap.docs.forEach((docSnap) => {
      const mapped = mapProjectDoc(docSnap);
      if (mapped.slug && mapped.status === 'published') {
        bySlug.set(mapped.slug.toLowerCase(), mapped);
      }
    });
  } catch (err) {
    const code = err?.code || '';
    if (code !== 'permission-denied') {
      console.warn('[getPublishedProjects:projects]', err?.message);
    }
  }

  try {
    const qFallback = query(collection(db, FALLBACK_PROPERTIES_COLLECTION), where('published', '==', true));
    const snapFallback = await getDocs(qFallback);
    snapFallback.docs.forEach((docSnap) => {
      const raw = docSnap.data() || {};
      if (raw.entityType === 'project') {
        const mapped = mapProjectDoc(docSnap);
        if (mapped.slug && mapped.status === 'published' && !bySlug.has(mapped.slug.toLowerCase())) {
          bySlug.set(mapped.slug.toLowerCase(), mapped);
        }
      }
    });
  } catch (err) {
    throw formatFirebaseError(err, 'getPublishedProjects', FALLBACK_PROPERTIES_COLLECTION);
  }

  const managed = await isProjectsCatalogManaged();
  if (!managed && !bySlug.has(INITIAL_THANGARAJ_CITY_PROJECT.slug.toLowerCase())) {
    bySlug.set(INITIAL_THANGARAJ_CITY_PROJECT.slug.toLowerCase(), INITIAL_THANGARAJ_CITY_PROJECT);
  }

  return Array.from(bySlug.values()).sort((a, b) => {
    if (a.slug === 'thangaraj-city') return -1;
    if (b.slug === 'thangaraj-city') return 1;
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

/**
 * Fetches a single published project by SEO slug or project ID.
 * @param {string} slugOrId
 * @returns {Promise<import('../types/realEstate').Project | null>}
 */
export async function getProjectBySlug(slugOrId) {
  if (!slugOrId) return null;
  const target = slugOrId.trim().toLowerCase();

  try {
    const projects = await getPublishedProjects();
    const matched = projects.find(
      (p) => p.slug.toLowerCase() === target || p.id.toLowerCase() === target
    );
    if (matched) return matched;
  } catch (err) {
    console.warn('[getProjectBySlug:list]', err?.message);
  }

  // Direct doc lookup fallback if query missed
  try {
    const directSnap = await getDoc(doc(db, PROJECTS_COLLECTION, slugOrId));
    if (directSnap.exists()) {
      const mapped = mapProjectDoc(directSnap);
      if (mapped.status === 'published') return mapped;
    }
  } catch {
    // Ignore permission-denied on projects collection
  }

  try {
    const fbSnap = await getDoc(doc(db, FALLBACK_PROPERTIES_COLLECTION, `project_${slugOrId}`));
    if (fbSnap.exists() && fbSnap.data()?.entityType === 'project') {
      const mapped = mapProjectDoc(fbSnap);
      if (mapped.status === 'published') return mapped;
    }
  } catch {
    // Ignore permission-denied on unpublished doc
  }

  return null;
}
