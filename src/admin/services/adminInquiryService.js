import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { formatFirebaseError, toIsoString } from '../../services/firebaseUtils';
import { DEFAULT_PROPERTY_CATEGORIES } from '../../services/publicSiteContent';
import { logAdminAction } from './adminLogService';

const INQUIRIES_COLLECTION = 'inquiries';
const CONTACT_MESSAGES_COLLECTION = 'contactMessages';
const LOCATIONS_COLLECTION = 'locations';
const WEBSITE_CONTENT_COLLECTION = 'websiteContent';
const SITE_SETTINGS_COLLECTION = 'siteSettings';

/**
 * @param {any} status
 * @returns {import('../../types/realEstate').EnquiryStatus}
 */
function mapStatusToUi(status) {
  const lower = String(status || 'new').toLowerCase();
  if (lower === 'contacted') return 'Contacted';
  if (lower === 'closed') return 'Closed';
  if (lower === 'follow-up required') return 'Follow-up Required';
  return 'New';
}

function mapStatusToFirestore(uiStatus) {
  const lower = String(uiStatus || 'new').toLowerCase();
  if (lower === 'contacted' || lower === 'follow-up required') return 'contacted';
  if (lower === 'closed') return 'closed';
  return 'new';
}

/** @returns {Promise<import('../../types/realEstate').BuyerEnquiry[]>} */
export async function getAllInquiriesAdmin() {
  try {
    const q = query(collection(db, INQUIRIES_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      return {
        id: docSnap.id,
        enquiryRef: docSnap.id.slice(0, 10).toUpperCase(),
        buyerName: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        propertyId: data.propertyId || null,
        propertyTitle: data.projectName || data.propertyTitle || 'Property Enquiry',
        projectId: data.projectId || null,
        projectName: data.projectName || '',
        projectSlug: data.projectSlug || '',
        enquiryCategory: data.enquiryCategory || '',
        enquiryType: /** @type {'property' | 'project' | 'general'} */ (
          data.projectId ? 'project' : data.propertyId ? 'property' : 'general'
        ),
        message: data.message || '',
        enquiryStatus: mapStatusToUi(data.status),
        followUpNotes: data.adminNotes || '',
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt || data.createdAt),
      };
    });
  } catch (error) {
    throw formatFirebaseError(error, 'getAllInquiriesAdmin', INQUIRIES_COLLECTION);
  }
}

export async function updateInquiryAdmin(enquiryId, uiStatus, adminNotes) {
  try {
    const status = mapStatusToFirestore(uiStatus);
    const docRef = doc(db, INQUIRIES_COLLECTION, enquiryId);
    await updateDoc(docRef, {
      status,
      adminNotes: (adminNotes || '').trim(),
      updatedAt: serverTimestamp(),
    });

    await logAdminAction({
      action: 'UPDATE_INQUIRY',
      target: INQUIRIES_COLLECTION,
      targetId: enquiryId,
      details: {
        summary: `Enquiry ${enquiryId} updated to ${status}`,
        status,
      },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'updateInquiryAdmin', INQUIRIES_COLLECTION);
  }
}

export async function deleteInquiryAdmin(enquiryId) {
  try {
    await deleteDoc(doc(db, INQUIRIES_COLLECTION, enquiryId));
    await logAdminAction({
      action: 'DELETE_INQUIRY',
      target: INQUIRIES_COLLECTION,
      targetId: enquiryId,
      details: { summary: `Deleted enquiry ${enquiryId}` },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'deleteInquiryAdmin', INQUIRIES_COLLECTION);
  }
}

// Contact Messages (contactMessages collection)
/** @returns {Promise<import('../../types/realEstate').BuyerEnquiry[]>} */
export async function getAllContactMessagesAdmin() {
  try {
    const q = query(collection(db, CONTACT_MESSAGES_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      return {
        id: docSnap.id,
        enquiryRef: `MSG-${docSnap.id.slice(0, 6).toUpperCase()}`,
        buyerName: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        propertyId: null,
        propertyTitle: data.subject || 'General Contact Message',
        enquiryType: /** @type {'property' | 'general'} */ ('general'),
        message: data.message || '',
        enquiryStatus: mapStatusToUi(data.status),
        followUpNotes: data.adminNotes || '',
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt || data.createdAt),
        isContactMessage: true,
      };
    });
  } catch (error) {
    throw formatFirebaseError(error, 'getAllContactMessagesAdmin', CONTACT_MESSAGES_COLLECTION);
  }
}

export async function updateContactMessageAdmin(messageId, uiStatus, adminNotes) {
  try {
    const status = mapStatusToFirestore(uiStatus);
    await updateDoc(doc(db, CONTACT_MESSAGES_COLLECTION, messageId), {
      status,
      adminNotes: (adminNotes || '').trim(),
      updatedAt: serverTimestamp(),
    });
    await logAdminAction({
      action: 'UPDATE_CONTACT_MESSAGE',
      target: CONTACT_MESSAGES_COLLECTION,
      targetId: messageId,
      details: { summary: `Contact message ${messageId} marked as ${status}` },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'updateContactMessageAdmin', CONTACT_MESSAGES_COLLECTION);
  }
}

export async function deleteContactMessageAdmin(messageId) {
  try {
    await deleteDoc(doc(db, CONTACT_MESSAGES_COLLECTION, messageId));
    await logAdminAction({
      action: 'DELETE_CONTACT_MESSAGE',
      target: CONTACT_MESSAGES_COLLECTION,
      targetId: messageId,
      details: { summary: `Deleted contact message ${messageId}` },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'deleteContactMessageAdmin', CONTACT_MESSAGES_COLLECTION);
  }
}

// Locations Management
/** @returns {Promise<import('../../types/realEstate').LocationOption[]>} */
export async function getAllLocationsAdmin() {
  try {
    const snap = await getDocs(collection(db, LOCATIONS_COLLECTION));
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      return {
        id: docSnap.id,
        name: data.name || '',
        district: data.district || data.name || '',
        type: /** @type {'District' | 'Town' | 'Village'} */ (data.type || 'District'),
        active: Boolean(data.active),
      };
    });
  } catch (error) {
    throw formatFirebaseError(error, 'getAllLocationsAdmin', LOCATIONS_COLLECTION);
  }
}

export async function addLocationAdmin(payload) {
  try {
    const slug = (payload.name || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const docPayload = {
      name: (payload.name || '').trim(),
      slug,
      district: (payload.district || '').trim(),
      type: payload.type || 'District',
      featured: Boolean(payload.featured),
      avgPricePerSqft: Number(payload.avgPricePerSqft || 0),
      active: payload.active !== false,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, LOCATIONS_COLLECTION), docPayload);
    await logAdminAction({
      action: 'CREATE_LOCATION',
      target: LOCATIONS_COLLECTION,
      targetId: ref.id,
      details: { summary: `${docPayload.name} (${docPayload.district})` },
    });
    return { id: ref.id, ...docPayload };
  } catch (error) {
    throw formatFirebaseError(error, 'addLocationAdmin', LOCATIONS_COLLECTION);
  }
}

export async function toggleLocationActiveAdmin(locationId, currentActive) {
  try {
    const nextActive = !currentActive;
    await updateDoc(doc(db, LOCATIONS_COLLECTION, locationId), {
      active: nextActive,
      updatedAt: serverTimestamp(),
    });
    await logAdminAction({
      action: 'TOGGLE_LOCATION',
      target: LOCATIONS_COLLECTION,
      targetId: locationId,
      details: { summary: `Location ${locationId} active=${nextActive}` },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'toggleLocationActiveAdmin', LOCATIONS_COLLECTION);
  }
}

export async function deleteLocationAdmin(locationId) {
  try {
    await deleteDoc(doc(db, LOCATIONS_COLLECTION, locationId));
    await logAdminAction({
      action: 'DELETE_LOCATION',
      target: LOCATIONS_COLLECTION,
      targetId: locationId,
      details: { summary: `Deleted location ${locationId}` },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'deleteLocationAdmin', LOCATIONS_COLLECTION);
  }
}

// Property Categories (stored inside websiteContent/main.propertyCategories; no extra collection)
export async function getAllCategoriesAdmin() {
  try {
    const snap = await getDoc(doc(db, WEBSITE_CONTENT_COLLECTION, 'main'));
    if (snap.exists()) {
      const data = snap.data() || {};
      if (Array.isArray(data.propertyCategories) && data.propertyCategories.length > 0) {
        return data.propertyCategories;
      }
    }
    return DEFAULT_PROPERTY_CATEGORIES;
  } catch (error) {
    throw formatFirebaseError(error, 'getAllCategoriesAdmin', WEBSITE_CONTENT_COLLECTION);
  }
}

async function saveCategoriesList(categories, action, summary) {
  await setDoc(
    doc(db, WEBSITE_CONTENT_COLLECTION, 'main'),
    {
      propertyCategories: categories,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await logAdminAction({
    action,
    target: WEBSITE_CONTENT_COLLECTION,
    targetId: 'main',
    details: { summary },
  });
}

export async function addCategoryAdmin(payload) {
  try {
    const existing = await getAllCategoriesAdmin();
    const newItem = {
      id: `cat-${Date.now()}`,
      name: (payload.name || '').trim(),
      description: (payload.description || '').trim(),
      active: payload.active !== false,
    };
    const next = [...existing, newItem];
    await saveCategoriesList(next, 'ADD_CATEGORY', `Added category ${newItem.name}`);
    return newItem;
  } catch (error) {
    throw formatFirebaseError(error, 'addCategoryAdmin', WEBSITE_CONTENT_COLLECTION);
  }
}

export async function toggleCategoryActiveAdmin(categoryId) {
  try {
    const existing = await getAllCategoriesAdmin();
    const next = existing.map((cat) =>
      cat.id === categoryId ? { ...cat, active: !cat.active } : cat
    );
    await saveCategoriesList(next, 'TOGGLE_CATEGORY', `Toggled category ${categoryId}`);
  } catch (error) {
    throw formatFirebaseError(error, 'toggleCategoryActiveAdmin', WEBSITE_CONTENT_COLLECTION);
  }
}

export async function deleteCategoryAdmin(categoryId) {
  try {
    const existing = await getAllCategoriesAdmin();
    const next = existing.filter((cat) => cat.id !== categoryId);
    await saveCategoriesList(next, 'DELETE_CATEGORY', `Deleted category ${categoryId}`);
  } catch (error) {
    throw formatFirebaseError(error, 'deleteCategoryAdmin', WEBSITE_CONTENT_COLLECTION);
  }
}

// Website Content & Site Settings
export async function updateWebsiteContentAdmin(content) {
  try {
    const contentDocRef = doc(db, WEBSITE_CONTENT_COLLECTION, 'main');
    const settingsDocRef = doc(db, SITE_SETTINGS_COLLECTION, 'main');

    const contentPayload = {
      companyName: content.companyName || '',
      tagline: content.tagline || '',
      trustLine: content.tagline || '',
      heroTitle: content.heroHeadline || '',
      heroHeadline: content.heroHeadline || '',
      heroSubtitle: content.heroSubheadline || '',
      heroSubheadline: content.heroSubheadline || '',
      aboutIntro: content.aboutIntro || '',
      aboutText: content.aboutIntro || '',
      aboutBackground: content.aboutBackground || '',
      aboutServices: Array.isArray(content.aboutServices) ? content.aboutServices : [],
      aboutValues: Array.isArray(content.aboutValues) ? content.aboutValues : [],
      whyChooseUs: Array.isArray(content.whyChooseUs) ? content.whyChooseUs : [],
      address: content.contactAddress || '',
      contactAddress: content.contactAddress || '',
      phone: content.contactPhone || '',
      contactPhone: content.contactPhone || '',
      email: content.contactEmail || '',
      contactEmail: content.contactEmail || '',
      workingHours: content.officeHours || '',
      officeHours: content.officeHours || '',
      popularLocationNames: Array.isArray(content.popularLocationNames)
        ? content.popularLocationNames
        : [],
      featuredPropertyIds: Array.isArray(content.featuredPropertyIds)
        ? content.featuredPropertyIds
        : [],
      updatedAt: serverTimestamp(),
    };

    const settingsPayload = {
      siteName: content.companyName || '',
      companyName: content.companyName || '',
      trustLine: content.tagline || '',
      address: content.contactAddress || '',
      contactAddress: content.contactAddress || '',
      phone: content.contactPhone || '',
      contactPhone: content.contactPhone || '',
      email: content.contactEmail || '',
      contactEmail: content.contactEmail || '',
      workingHours: content.officeHours || '',
      officeHours: content.officeHours || '',
      updatedAt: serverTimestamp(),
    };

    await setDoc(contentDocRef, contentPayload, { merge: true });

    // Legacy siteSettings/main sync is optional; live rules may restrict writes to websiteContent only
    await setDoc(settingsDocRef, settingsPayload, { merge: true }).catch((settingsErr) => {
      console.warn(
        '[updateWebsiteContentAdmin:siteSettings]',
        settingsErr?.code || settingsErr?.message
      );
    });

    await logAdminAction({
      action: 'UPDATE_WEBSITE_CONTENT',
      target: WEBSITE_CONTENT_COLLECTION,
      targetId: 'main',
      details: { summary: 'Updated websiteContent/main' },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'updateWebsiteContentAdmin', WEBSITE_CONTENT_COLLECTION);
  }
}
