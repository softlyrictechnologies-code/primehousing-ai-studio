import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { formatFirebaseError, toIsoString } from '../../services/firebaseUtils';
import { logAdminAction } from './adminLogService';

const USERS_COLLECTION = 'users';
const ADMINS_COLLECTION = 'admins';

export const ADMIN_ROLE_PERMISSIONS = [
  {
    role: 'super_admin',
    label: 'Super Admin',
    badgeTone: 'bg-[#9B0B5E] text-white',
    description:
      'Full system owner access across all projects, locked layouts, properties, website content, and administrator account registry.',
    permissions: [
      'View & Preview All Projects',
      'Create, Edit & Delete Any Project (including locked)',
      'Publish / Unpublish Projects',
      'Edit Per-Project Permission Locks',
      'Manage Properties, Submissions, Enquiries & Website Content',
      'Add, Update & Remove Admin Registry Access',
    ],
  },
  {
    role: 'admin',
    label: 'Admin',
    badgeTone: 'bg-[#F7E8F1] text-[#9B0B5E]',
    description:
      'Operational administrator access to manage projects, property listings, enquiries, seller submissions, locations, and site content.',
    permissions: [
      'View & Preview All Projects',
      'Create, Edit, Publish & Delete Unlocked Projects',
      'Configure Project Edit Permissions (non-locked projects)',
      'Upload Project Images, Layout Plans & Brochure PDFs',
      'Manage Properties, Submissions, Enquiries & Locations',
    ],
  },
  {
    role: 'editor',
    label: 'Editor',
    badgeTone: 'bg-[#FAF8F9] text-[#3D4340] border border-[#D7C8D1]',
    description:
      'Content & marketing manager access for editing project copy, uploading media/documents, and updating listings where enabled.',
    permissions: [
      'View & Preview All Projects',
      'Edit Project Details & Upload Media (when permitted on project)',
      'Publish / Unpublish (only if enabled on project permissions)',
      'Cannot modify Admin Registry or locked Super Admin projects',
    ],
  },
  {
    role: 'support',
    label: 'Support Staff',
    badgeTone: 'bg-amber-50 text-amber-800 border border-amber-200',
    description:
      'Lead-handling & inquiry review access for following up with buyer enquiries and landowner submissions.',
    permissions: [
      'View Project Management List & Enquiries (Read-Only)',
      'Update Buyer Enquiry & Contact Message Follow-up Status',
      'Review Landowner Submissions',
      'Cannot Create, Edit, Publish, or Delete Projects or Properties',
    ],
  },
];

export async function getAllUsersAdmin() {
  try {
    const q = query(collection(db, USERS_COLLECTION), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data() || {};
      return {
        uid: docSnap.id,
        email: data.email || '',
        name: data.name || '',
        phone: data.phone || '',
        role: data.role || 'user',
        createdAt: toIsoString(data.createdAt),
        updatedAt: toIsoString(data.updatedAt),
      };
    });
  } catch (error) {
    throw formatFirebaseError(error, 'getAllUsersAdmin', USERS_COLLECTION);
  }
}

/** @returns {Promise<import('../../types/realEstate').AdminRegistryMember[]>} */
export async function getAllAdminsList() {
  try {
    const snap = await getDocs(collection(db, ADMINS_COLLECTION));
    return snap.docs
      .map((docSnap) => {
        const data = docSnap.data() || {};
        const roleRaw = String(data.role || 'admin').toLowerCase().replace('-', '_');
        /** @type {import('../../types/realEstate').AdminRoleKey} */
        const role =
          roleRaw === 'super_admin' || roleRaw === 'editor' || roleRaw === 'support'
            ? roleRaw
            : 'admin';
        return {
          uid: docSnap.id,
          email: data.email || '',
          name: data.name || (data.email ? data.email.split('@')[0] : 'Admin User'),
          role,
          active: data.active !== false,
          createdAt: toIsoString(data.createdAt),
          updatedAt: toIsoString(data.updatedAt),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if (error?.code === 'permission-denied') {
      return [];
    }
    throw formatFirebaseError(error, 'getAllAdminsList', ADMINS_COLLECTION);
  }
}

export async function upsertAdminRegistryMember(input) {
  const uid = String(input.uid || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const name = String(input.name || '').trim();
  const role = String(input.role || 'admin').toLowerCase().replace('-', '_');

  if (!uid) {
    throw new Error('Firebase Auth User UID is required to register an admin.');
  }
  if (!email) {
    throw new Error('Administrator email address is required.');
  }

  try {
    await setDoc(
      doc(db, ADMINS_COLLECTION, uid),
      {
        uid,
        email,
        name: name || email.split('@')[0],
        role,
        active: input.active !== false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await logAdminAction({
      action: 'UPSERT_ADMIN_REGISTRY',
      target: ADMINS_COLLECTION,
      targetId: uid,
      details: { summary: `${email} (${role})` },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'upsertAdminRegistryMember', ADMINS_COLLECTION);
  }
}

export async function removeAdminRegistryMember(uid, email = '') {
  if (!uid) throw new Error('UID is required.');
  try {
    await deleteDoc(doc(db, ADMINS_COLLECTION, uid));
    await logAdminAction({
      action: 'REMOVE_ADMIN_REGISTRY',
      target: ADMINS_COLLECTION,
      targetId: uid,
      details: { summary: `Removed ${email || uid} from admins registry` },
    });
  } catch (error) {
    throw formatFirebaseError(error, 'removeAdminRegistryMember', ADMINS_COLLECTION);
  }
}

