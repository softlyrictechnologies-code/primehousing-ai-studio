import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');

type StoredDocs = Map<string, Record<string, unknown>>;

const state = vi.hoisted(() => {
  const docs: StoredDocs = new Map();
  let autoIdCounter = 0;

  const mockAuth: {
    currentUser: { uid: string; email?: string; displayName?: string } | null;
  } = {
    currentUser: null,
  };

  const hooks = {
    permissionDeniedCollections: new Set<string>(),
    permissionDeniedOps: new Set<string>(),
    storageUnauthorizedPaths: new Set<string>(),
    deletedStoragePaths: [] as string[],
    uploadedStoragePaths: [] as string[],
    lastWrites: [] as Array<{ op: string; path: string; data: Record<string, unknown> }>,
  };

  return {
    docs,
    mockAuth,
    hooks,
    nextId: (prefix = 'doc') => {
      autoIdCounter += 1;
      return `${prefix}_${String(autoIdCounter).padStart(6, '0')}`;
    },
    reset: () => {
      docs.clear();
      autoIdCounter = 0;
      mockAuth.currentUser = null;
      hooks.permissionDeniedCollections.clear();
      hooks.permissionDeniedOps.clear();
      hooks.storageUnauthorizedPaths.clear();
      hooks.deletedStoragePaths.length = 0;
      hooks.uploadedStoragePaths.length = 0;
      hooks.lastWrites.length = 0;
    },
  };
});

function makePermissionError(message = 'Missing or insufficient permissions.') {
  const err = new Error(message) as Error & { code?: string };
  err.code = 'permission-denied';
  return err;
}

function makeStorageError(code: string, message: string) {
  const err = new Error(message) as Error & { code?: string };
  err.code = code;
  return err;
}

vi.mock('../src/firebase', () => ({
  app: {},
  db: { __mockDb: true },
  auth: state.mockAuth,
  storage: { __mockStorage: true },
}));

vi.mock('firebase/firestore', () => {
  const SERVER_TIMESTAMP = { __isServerTimestamp: true };

  const collection = (_db: unknown, colName: string) => ({
    __type: 'collection',
    colName,
  });

  const doc = (parentOrDb: any, colOrId?: string, maybeId?: string) => {
    if (parentOrDb?.__type === 'collection') {
      const id = colOrId || state.nextId(parentOrDb.colName);
      return {
        __type: 'doc',
        colName: parentOrDb.colName,
        id,
        path: `${parentOrDb.colName}/${id}`,
      };
    }
    const colName = String(colOrId || '');
    const id = String(maybeId || state.nextId(colName));
    return {
      __type: 'doc',
      colName,
      id,
      path: `${colName}/${id}`,
    };
  };

  const where = (field: string, op: string, value: unknown) => ({
    __type: 'where',
    field,
    op,
    value,
  });

  const orderBy = (field: string, direction = 'asc') => ({
    __type: 'orderBy',
    field,
    direction,
  });

  const limit = (count: number) => ({
    __type: 'limit',
    count,
  });

  const query = (colRef: any, ...constraints: any[]) => ({
    __type: 'query',
    colName: colRef.colName,
    constraints,
  });

  const makeSnap = (docPath: string, data: Record<string, unknown> | undefined) => {
    const id = docPath.split('/').pop() || '';
    return {
      id,
      exists: () => Boolean(data),
      data: () => (data ? { ...data } : undefined),
    };
  };

  const getDoc = async (docRef: any) => {
    if (
      state.hooks.permissionDeniedCollections.has(docRef.colName) ||
      state.hooks.permissionDeniedOps.has(`getDoc:${docRef.path}`)
    ) {
      throw makePermissionError();
    }
    return makeSnap(docRef.path, state.docs.get(docRef.path));
  };

  const getDocs = async (target: any) => {
    const colName = target.colName;
    if (
      state.hooks.permissionDeniedCollections.has(colName) ||
      state.hooks.permissionDeniedOps.has(`getDocs:${colName}`)
    ) {
      throw makePermissionError();
    }

    let entries = Array.from(state.docs.entries())
      .filter(([docPath]) => docPath.startsWith(`${colName}/`))
      .map(([docPath, data]) => ({ docPath, data }));

    const constraints: any[] = target.constraints || [];
    for (const c of constraints) {
      if (c.__type === 'where' && c.op === '==') {
        entries = entries.filter((item) => item.data[c.field] === c.value);
      }
    }

    const orderConstraint = constraints.find((c) => c.__type === 'orderBy');
    if (orderConstraint) {
      entries.sort((a, b) => {
        const av = a.data[orderConstraint.field];
        const bv = b.data[orderConstraint.field];
        const aTime = typeof av === 'string' ? Date.parse(av) || 0 : 0;
        const bTime = typeof bv === 'string' ? Date.parse(bv) || 0 : 0;
        return orderConstraint.direction === 'desc' ? bTime - aTime : aTime - bTime;
      });
    }

    const limitConstraint = constraints.find((c) => c.__type === 'limit');
    if (limitConstraint) {
      entries = entries.slice(0, limitConstraint.count);
    }

    return {
      docs: entries.map((e) => makeSnap(e.docPath, e.data)),
    };
  };

  const addDoc = async (colRef: any, data: Record<string, unknown>) => {
    if (
      state.hooks.permissionDeniedCollections.has(colRef.colName) ||
      state.hooks.permissionDeniedOps.has(`addDoc:${colRef.colName}`)
    ) {
      throw makePermissionError();
    }
    const id = state.nextId(colRef.colName);
    const docPath = `${colRef.colName}/${id}`;
    state.docs.set(docPath, { ...data });
    state.hooks.lastWrites.push({ op: 'addDoc', path: docPath, data: { ...data } });
    return { id, path: docPath };
  };

  const setDoc = async (docRef: any, data: Record<string, unknown>, options?: { merge?: boolean }) => {
    if (
      state.hooks.permissionDeniedCollections.has(docRef.colName) ||
      state.hooks.permissionDeniedOps.has(`setDoc:${docRef.path}`)
    ) {
      throw makePermissionError();
    }
    const prev = options?.merge ? state.docs.get(docRef.path) || {} : {};
    const merged = { ...prev, ...data };
    state.docs.set(docRef.path, merged);
    state.hooks.lastWrites.push({ op: 'setDoc', path: docRef.path, data: { ...data } });
  };

  const updateDoc = async (docRef: any, data: Record<string, unknown>) => {
    if (
      state.hooks.permissionDeniedCollections.has(docRef.colName) ||
      state.hooks.permissionDeniedOps.has(`updateDoc:${docRef.path}`)
    ) {
      throw makePermissionError();
    }
    const prev = state.docs.get(docRef.path);
    if (!prev) {
      const err = new Error('No document to update') as Error & { code?: string };
      err.code = 'not-found';
      throw err;
    }
    const merged = { ...prev, ...data };
    state.docs.set(docRef.path, merged);
    state.hooks.lastWrites.push({ op: 'updateDoc', path: docRef.path, data: { ...data } });
  };

  const deleteDoc = async (docRef: any) => {
    if (
      state.hooks.permissionDeniedCollections.has(docRef.colName) ||
      state.hooks.permissionDeniedOps.has(`deleteDoc:${docRef.path}`)
    ) {
      throw makePermissionError();
    }
    state.docs.delete(docRef.path);
    state.hooks.lastWrites.push({ op: 'deleteDoc', path: docRef.path, data: {} });
  };

  const serverTimestamp = () => SERVER_TIMESTAMP;

  return {
    collection,
    doc,
    where,
    orderBy,
    limit,
    query,
    getDoc,
    getDocs,
    addDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
  };
});

vi.mock('firebase/storage', () => {
  const ref = (_storage: unknown, fullPath: string) => ({
    fullPath,
  });

  const uploadBytesResumable = (storageRef: { fullPath: string }, file: { size?: number }) => ({
    on(
      _event: string,
      onProgress: (snap: { bytesTransferred: number; totalBytes: number }) => void,
      onError: (err: Error) => void,
      onComplete: () => void
    ) {
      if (
        Array.from(state.hooks.storageUnauthorizedPaths).some((prefix) =>
          storageRef.fullPath.startsWith(prefix)
        )
      ) {
        onError(makeStorageError('storage/unauthorized', 'User is not authorized.'));
        return;
      }
      const total = Number(file?.size || 100);
      onProgress({ bytesTransferred: total, totalBytes: total });
      state.hooks.uploadedStoragePaths.push(storageRef.fullPath);
      onComplete();
    },
    snapshot: { ref: storageRef },
  });

  const getDownloadURL = async (storageRef: { fullPath: string }) =>
    `https://firebasestorage.googleapis.com/v0/b/prime-housing-72330.firebasestorage.app/o/${encodeURIComponent(
      storageRef.fullPath
    )}?alt=media`;

  const deleteObject = async (storageRef: { fullPath: string }) => {
    if (storageRef.fullPath.includes('missing-object')) {
      throw makeStorageError('storage/object-not-found', 'Object not found.');
    }
    state.hooks.deletedStoragePaths.push(storageRef.fullPath);
  };

  return {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
  };
});

import { formatFirebaseError, mapPropertyDoc, normalizePhone, toIsoString } from '../src/services/firebaseUtils.js';
import { createInquiry } from '../src/services/inquiryService.js';
import { createContactMessage } from '../src/services/contactService.js';
import { createSellerSubmission } from '../src/services/sellerService.js';
import { createSellerSubmission as reexportedCreateSellerSubmission } from '../src/services/submissionService.js';
import {
  deleteStorageFile,
  uploadProjectAsset,
  uploadPropertyImage,
  uploadSellerSubmissionImage,
  validateProjectAssetFile,
  validateStorageFile,
} from '../src/services/storageService.js';
import { getUserProfile, upsertUserProfile } from '../src/services/userService.js';
import {
  canAdminRolePerformProjectAction,
  getProjectBySlug,
  getPublishedProjects,
  isProjectsCatalogManaged,
  mapProjectDoc,
  normalizeProjectEditPermissions,
  slugifyProjectName,
} from '../src/services/projectService.js';
import {
  getFeaturedProperties as fetchFeaturedProperties,
  getLatestProperties as fetchLatestProperties,
  getPropertyById,
  getPublishedProperties,
  queryProperties,
} from '../src/services/propertyService.js';
import { getActiveLocations } from '../src/services/locationService.js';
import { getPublishedInsights } from '../src/services/insightService.js';
import { getPublicCategories, getPublicSiteContent } from '../src/services/publicSiteContent.js';
import { getPublicSiteContent as reexportedGetPublicSiteContent } from '../src/services/contentService.js';
import { getRecentAdminLogs, logAdminAction } from '../src/admin/services/adminLogService.js';
import {
  addCategoryAdmin,
  addLocationAdmin,
  deleteCategoryAdmin,
  deleteContactMessageAdmin,
  deleteInquiryAdmin,
  deleteLocationAdmin,
  getAllCategoriesAdmin,
  getAllContactMessagesAdmin,
  getAllInquiriesAdmin,
  getAllLocationsAdmin,
  toggleCategoryActiveAdmin,
  toggleLocationActiveAdmin,
  updateContactMessageAdmin,
  updateInquiryAdmin,
  updateWebsiteContentAdmin,
} from '../src/admin/services/adminInquiryService.js';
import {
  deletePropertyAdmin,
  getAllPropertiesAdmin,
  savePropertyAdmin,
  togglePropertyFeaturedAdmin,
  updatePropertyStatusAdmin,
} from '../src/admin/services/adminPropertyService.js';
import {
  deleteProjectAdmin,
  getAllProjectsAdmin,
  saveProjectAdmin,
  updateProjectPermissionsAdmin,
  updateProjectStatusAdmin,
} from '../src/admin/services/adminProjectService.js';
import {
  approveSubmissionAndCreatePropertyAdmin,
  getAllSubmissionsAdmin,
  updateSubmissionReviewAdmin,
} from '../src/admin/services/adminSubmissionService.js';
import {
  getAllAdminsList,
  getAllUsersAdmin,
  removeAdminRegistryMember,
  upsertAdminRegistryMember,
} from '../src/admin/services/adminUserService.js';
import { getAdminDashboardStats } from '../src/admin/services/adminDashboardService.js';
import {
  formatArea,
  formatCurrency,
  formatDate,
  formatDateTime,
  generateReference,
  isValidEmail,
  isValidPhone,
} from '../src/utils/formatters';

function extractRuleWhitelist(collectionName: string): string[] {
  const rulesText = fs.readFileSync(path.join(ROOT_DIR, 'firestore.rules'), 'utf8');
  const blockMatch = rulesText.match(
    new RegExp(`match /${collectionName}/\\{[^}]+\\}[\\s\\S]*?hasOnly\\(\\[([\\s\\S]*?)\\]\\)`)
  );
  if (!blockMatch) {
    throw new Error(`Could not find hasOnly whitelist for ${collectionName} in firestore.rules`);
  }
  return Array.from(blockMatch[1].matchAll(/'([^']+)'/g)).map((m) => m[1]);
}

describe('Backend & Firebase Service Audit Suite', () => {
  beforeEach(() => {
    state.reset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('firebaseUtils & formatters', () => {
    it('normalizes Indian mobile numbers cleanly across +91, 0091, and 0 prefixes', () => {
      expect(normalizePhone('90424 61234')).toBe('9042461234');
      expect(normalizePhone('+91 90424-61234')).toBe('9042461234');
      expect(normalizePhone('09042461234')).toBe('9042461234');
      expect(normalizePhone('0091 9042461234')).toBe('9042461234');
      expect(normalizePhone('12345')).toBe('12345');

      expect(isValidPhone('90424 61234')).toBe(true);
      expect(isValidPhone('+91 90424 61234')).toBe(true);
      expect(isValidPhone('09042461234')).toBe(true);
      expect(isValidPhone('0091 9042461234')).toBe(true);
      expect(isValidPhone('12345')).toBe(false);
    });

    it('converts timestamps, formats Firebase errors, and validates helper formatters', () => {
      expect(toIsoString('2026-11-24T00:00:00.000Z')).toBe('2026-11-24T00:00:00.000Z');
      expect(toIsoString({ toDate: () => new Date('2026-05-01T12:00:00.000Z') })).toBe(
        '2026-05-01T12:00:00.000Z'
      );
      expect(toIsoString({ seconds: 1700000000 })).toBe(new Date(1700000000 * 1000).toISOString());
      expect(toIsoString(null)).toBe('');

      expect(
        formatFirebaseError(makePermissionError(), 'createInquiry', 'inquiries').message
      ).toBe('Missing or insufficient permissions on "inquiries".');
      expect(
        formatFirebaseError(makeStorageError('unavailable', 'down'), 'test', 'properties').message
      ).toContain('temporarily unavailable');
      expect(
        formatFirebaseError(makeStorageError('not-found', 'missing'), 'test', 'properties').message
      ).toContain('not found');

      expect(formatCurrency(1500000)).toContain('15,00,000');
      expect(formatArea(1200, 'Sq. Ft.')).toBe('1,200 Sq. Ft.');
      expect(formatDate('')).toBe('—');
      expect(formatDateTime('2026-05-01T10:30:00.000Z')).not.toBe('—');
      expect(generateReference('INQ')).toMatch(/^INQ-[A-Z2-9]{6}$/);
      expect(isValidEmail('')).toBe(true);
      expect(isValidEmail('buyer@primehousing.co.in')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
    });

    it('maps Firestore property documents into normalized UI Property objects', () => {
      const mapped = mapPropertyDoc({
        id: 'abcdef1234567890',
        data: () => ({
          title: 'Sunrise Highway Plot',
          propertyType: 'Commercial Plot',
          location: 'Chengalpattu',
          price: '2500000',
          areaSqFt: 2400,
          published: true,
          status: 'published',
          featured: true,
          verified: true,
          amenities: ['Corner Plot', '30ft Road'],
          image: 'https://example.com/main.jpg',
          coordinates: { lat: 12.69, lng: 79.97 },
        }),
      });

      expect(mapped.propertyRef).toBe('ABCDEF1234');
      expect(mapped.images).toEqual(['https://example.com/main.jpg']);
      expect(mapped.status).toBe('published');
      expect(mapped.isFeatured).toBe(true);
      expect(mapped.latitude).toBe(12.69);
      expect(mapped.features).toEqual(['Corner Plot', '30ft Road']);
    });
  });

  describe('Public enquiry, contact, and seller submission services vs firestore.rules', () => {
    it('creates Thangaraj City project inquiry matching exact firestore.rules inquiries whitelist & constraints', async () => {
      const result = await createInquiry({
        name: '  Arjun Kumar  ',
        phone: '+91 90424 61234',
        email: ' arjun@example.com ',
        projectId: 'thangaraj-city',
        projectName: 'THANGARAJ CITY',
        projectSlug: 'thangaraj-city',
        propertyTitle: 'THANGARAJ CITY — Plot Availability',
        enquiryCategory: 'Plot Availability',
        message: '[Plot Availability] Looking for a 1200 sq.ft corner plot.',
        source: 'project-detail',
      });

      expect(result.id).toBeTruthy();
      expect(result.enquiryRef).toHaveLength(10);

      const write = state.hooks.lastWrites.find((w) => w.path.startsWith('inquiries/'));
      expect(write).toBeTruthy();

      const allowedKeys = extractRuleWhitelist('inquiries');
      const writtenKeys = Object.keys(write!.data);
      for (const k of writtenKeys) {
        expect(allowedKeys).toContain(k);
      }

      expect(write!.data.phone).toBe('9042461234');
      expect(write!.data.status).toBe('new');
      expect(write!.data.projectId).toBe('thangaraj-city');
      expect(write!.data.projectSlug).toBe('thangaraj-city');
      expect((write!.data.name as string).length).toBeLessThanOrEqual(120);
      expect((write!.data.message as string).length).toBeLessThanOrEqual(2000);
    });

    it('rejects invalid enquiry fields upfront and maps Firestore permission-denied cleanly', async () => {
      await expect(
        createInquiry({ name: '', phone: '9042461234', message: 'Hello' })
      ).rejects.toThrow('full name');
      await expect(
        createInquiry({ name: 'Arjun', phone: '1234', message: 'Hello' })
      ).rejects.toThrow('10-digit mobile');
      await expect(
        createInquiry({ name: 'Arjun', phone: '9042461234', message: '   ' })
      ).rejects.toThrow('enquiry message');

      state.hooks.permissionDeniedCollections.add('inquiries');
      await expect(
        createInquiry({
          name: 'Arjun',
          phone: '9042461234',
          projectId: 'thangaraj-city',
          projectName: 'THANGARAJ CITY',
          projectSlug: 'thangaraj-city',
          message: '[Plot Availability] Test message',
          source: 'project-detail',
        })
      ).rejects.toThrow('Missing or insufficient permissions on "inquiries".');
    });

    it('creates contactMessages matching exact firestore.rules whitelist & bounds', async () => {
      const res = await createContactMessage({
        name: 'Meena R',
        phone: '09042461234',
        email: 'meena@example.com',
        subject: 'Site Visit',
        message: 'Please call me back regarding Chengalpattu plots.',
      });

      expect(res.id).toBeTruthy();
      const write = state.hooks.lastWrites.find((w) => w.path.startsWith('contactMessages/'));
      const allowedKeys = extractRuleWhitelist('contactMessages');
      for (const key of Object.keys(write!.data)) {
        expect(allowedKeys).toContain(key);
      }
      expect(write!.data.phone).toBe('9042461234');
      expect(write!.data.status).toBe('new');
    });

    it('creates sellerSubmissions with storage upload, schema compliance, and orphan cleanup on Firestore failure', async () => {
      expect(reexportedCreateSellerSubmission).toBe(createSellerSubmission);

      const mockFile = { name: 'plot photo.jpg', type: 'image/jpeg', size: 1024 } as unknown as File;
      const saved = await createSellerSubmission(
        {
          ownerName: 'Selvam',
          phone: '+91 98765 43210',
          email: 'selvam@example.com',
          location: 'Chengalpattu',
          districtTownVillage: 'Nemmeli',
          propertyType: 'Residential Land',
          area: 2,
          areaUnit: 'Acres',
          expectedPrice: 4500000,
          description: 'Clear DTCP approved residential parcel with 30ft tar road.',
          consentGiven: true,
        },
        [mockFile]
      );

      expect(saved.id).toBeTruthy();
      const write = state.hooks.lastWrites.find((w) => w.path.startsWith('sellerSubmissions/'));
      const allowedKeys = extractRuleWhitelist('sellerSubmissions');
      for (const key of Object.keys(write!.data)) {
        expect(allowedKeys).toContain(key);
      }
      expect(write!.data.areaSqFt).toBe(87120);
      expect(write!.data.sellerPhone).toBe('9876543210');
      expect(write!.data.status).toBe('pending');
      expect(write!.data.reviewStatus).toBe('pending');
      expect(write!.data.sellerId).toBeUndefined();

      // Verify orphan upload cleanup if Firestore setDoc fails
      state.hooks.permissionDeniedCollections.add('sellerSubmissions');
      await expect(
        createSellerSubmission(
          {
            ownerName: 'Selvam',
            phone: '9876543210',
            location: 'Chengalpattu',
            districtTownVillage: 'Nemmeli',
            propertyType: 'Residential Land',
            area: 1,
            areaUnit: 'Acres',
            expectedPrice: 2000000,
            description: 'Valid description over twenty characters long.',
            consentGiven: true,
          },
          [mockFile]
        )
      ).rejects.toThrow('Missing or insufficient permissions on "sellerSubmissions".');
      expect(state.hooks.deletedStoragePaths.length).toBe(1);
    });
  });

  describe('Storage service & User profile service', () => {
    it('validates image/PDF files, falls back on unauthorized project upload, and deletes decoded URLs', async () => {
      const goodJpg = { name: 'a.jpg', type: 'image/jpeg', size: 1024 } as unknown as File;
      const bigJpg = { name: 'big.jpg', type: 'image/jpeg', size: 6 * 1024 * 1024 } as unknown as File;
      const badTxt = { name: 'note.txt', type: 'text/plain', size: 100 } as unknown as File;
      const goodPdf = { name: 'layout.pdf', type: 'application/pdf', size: 2048 } as unknown as File;

      expect(validateStorageFile(goodJpg).valid).toBe(true);
      expect(validateStorageFile(bigJpg).valid).toBe(false);
      expect(validateStorageFile(badTxt).valid).toBe(false);
      expect(validateProjectAssetFile(goodPdf, 'pdf').valid).toBe(true);
      expect(validateProjectAssetFile(goodPdf, 'document').valid).toBe(true);

      const propUpload = await uploadPropertyImage(goodJpg, 'prop-1');
      expect(propUpload.storagePath).toContain('properties/prop-1/');

      const sellerUpload = await uploadSellerSubmissionImage(goodJpg, 'sub-1');
      expect(sellerUpload.storagePath).toContain('sellerSubmissions/sub-1/');

      state.hooks.storageUnauthorizedPaths.add('projects/');
      const projFallback = await uploadProjectAsset(goodPdf, 'thangaraj-city', 'documents', 'pdf');
      expect(projFallback.storagePath).toContain('properties/project_thangaraj-city/');

      await deleteStorageFile('/assets/local.png');
      await deleteStorageFile('properties/missing-object/1.jpg');
      await deleteStorageFile(propUpload.downloadUrl);
      expect(state.hooks.deletedStoragePaths).toContain(propUpload.storagePath);
    });

    it('creates and updates user profiles without sending createdAt on updates', async () => {
      state.mockAuth.currentUser = { uid: 'u-1', email: 'buyer@example.com' };

      const created = await upsertUserProfile('u-1', {
        email: 'buyer@example.com',
        name: 'Buyer One',
        phone: '9042461234',
      });
      expect(created?.uid).toBe('u-1');
      const createKeys = Object.keys(state.hooks.lastWrites[0].data);
      expect(createKeys).toEqual(
        expect.arrayContaining(['uid', 'email', 'name', 'phone', 'createdAt', 'updatedAt'])
      );

      state.hooks.lastWrites.length = 0;
      const updated = await upsertUserProfile('u-1', {
        email: 'buyer@example.com',
        name: 'Buyer Updated',
        phone: '9042461234',
      });
      expect(updated?.name).toBe('Buyer Updated');
      const updateKeys = Object.keys(state.hooks.lastWrites[0].data);
      expect(updateKeys).not.toContain('createdAt');
      expect(await getUserProfile('u-1')).toMatchObject({ name: 'Buyer Updated' });
      expect(await getUserProfile('')).toBeNull();
    });
  });

  describe('Public catalog services (projects, properties, locations, insights, siteContent)', () => {
    it('loads published projects, falls back cleanly on permission-denied, and enforces RBAC helpers', async () => {
      expect(slugifyProjectName('Thangaraj City Phase II!')).toBe('thangaraj-city-phase-ii');

      const defaultPerms = normalizeProjectEditPermissions(null);
      expect(defaultPerms.accessMode).toBe('all_admins');

      expect(
        canAdminRolePerformProjectAction('editor', { editPermissions: { accessMode: 'super_admin_only' } } as any, 'edit')
      ).toBe(false);
      expect(
        canAdminRolePerformProjectAction('super_admin', { editPermissions: { accessMode: 'super_admin_only' } } as any, 'delete')
      ).toBe(true);
      expect(canAdminRolePerformProjectAction('support', {} as any, 'edit')).toBe(false);

      // With empty Firestore and unmanaged catalog, Thangaraj City seed loads cleanly
      expect(await isProjectsCatalogManaged()).toBe(false);
      const seededList = await getPublishedProjects();
      expect(seededList.some((p) => p.slug === 'thangaraj-city')).toBe(true);
      const tc = await getProjectBySlug('thangaraj-city');
      expect(tc?.name).toBe('THANGARAJ CITY');

      // Permission denied on projects falls back to properties(entityType === 'project')
      state.hooks.permissionDeniedCollections.add('projects');
      state.docs.set('properties/project_custom', {
        entityType: 'project',
        published: true,
        status: 'published',
        projectData: {
          id: 'custom',
          name: 'Fallback Project',
          slug: 'fallback-project',
          status: 'published',
        },
      });
      const fallbackProjects = await getPublishedProjects();
      expect(fallbackProjects.some((p) => p.slug === 'fallback-project')).toBe(true);

      const mapped = mapProjectDoc({
        id: 'project_alpha',
        data: () => ({
          published: true,
          title: 'Alpha Enclave',
        }),
      });
      expect(mapped.id).toBe('alpha');
      expect(mapped.status).toBe('published');
    });

    it('loads published properties, featured/latest lists, single property, locations, insights, and siteContent', async () => {
      state.docs.set('properties/p1', {
        title: 'Published Residential Plot',
        published: true,
        status: 'published',
        featured: true,
        price: 1500000,
        areaSqFt: 1200,
        location: 'Madurai',
        createdAt: '2026-02-01T00:00:00.000Z',
      });
      state.docs.set('properties/p2', {
        title: 'Sold Plot',
        published: true,
        isSoldOut: true,
        status: 'sold_out',
        price: 1200000,
        areaSqFt: 1000,
        createdAt: '2026-03-01T00:00:00.000Z',
      });
      state.docs.set('properties/project_ignored', {
        entityType: 'project',
        published: true,
        title: 'Project Wrapper',
      });
      state.docs.set('properties/p_draft', {
        title: 'Draft Plot',
        published: false,
        status: 'draft',
      });
      state.docs.set('locations/l1', { name: 'Chengalpattu', district: 'Chengalpattu', active: true });
      state.docs.set('locations/l2', { name: 'Inactive', active: false });
      state.docs.set('insights/i1', { title: 'Old Insight', published: true, createdAt: '2026-01-01T00:00:00.000Z' });
      state.docs.set('insights/i2', { title: 'New Insight', published: true, createdAt: '2026-04-01T00:00:00.000Z' });
      state.docs.set('websiteContent/main', {
        companyName: 'PRIME HOUSING',
        tagline: 'Verified Plots',
        heroHeadline: 'Find Verified Land',
        contactPhone: '90424 61234',
      });
      state.docs.set('siteSettings/main', {
        contactEmail: 'info@primehousing.co.in',
      });

      const published = await getPublishedProperties();
      expect(published.map((p) => p.id)).toEqual(['p1', 'p2']);

      const featured = await fetchFeaturedProperties();
      expect(featured.map((p) => p.id)).toEqual(['p1']);

      const latest = await fetchLatestProperties(1);
      expect(latest.map((p) => p.id)).toEqual(['p1']);

      const queried = await queryProperties({ location: 'Madurai' });
      expect(queried.total).toBe(1);

      expect((await getPropertyById('p1'))?.id).toBe('p1');
      expect(await getPropertyById('p_draft')).toBeNull();
      expect(await getPropertyById('project_ignored')).toBeNull();

      expect((await getActiveLocations()).map((l) => l.name)).toEqual(['Chengalpattu']);
      expect((await getPublishedInsights()).map((i) => i.id)).toEqual(['i2', 'i1']);

      expect(reexportedGetPublicSiteContent).toBe(getPublicSiteContent);
      const siteContent = await getPublicSiteContent();
      expect(siteContent.companyName).toBe('PRIME HOUSING');
      expect(siteContent.contactEmail).toBe('info@primehousing.co.in');
      const categories = await getPublicCategories();
      expect(categories.length).toBeGreaterThan(0);
    });
  });

  describe('Admin services (logs, inquiries, properties, projects, submissions, users, dashboard)', () => {
    beforeEach(() => {
      state.mockAuth.currentUser = { uid: 'admin-1', email: 'admin@primehousing.co.in' };
    });

    it('writes compliant adminLogs and reads recent activity safely', async () => {
      const logId = await logAdminAction({
        action: 'update_property',
        target: 'properties',
        targetId: 'prop-1',
        details: ['not-a-map'] as unknown as Record<string, unknown>,
      });
      expect(logId).toBeTruthy();

      const write = state.hooks.lastWrites.find((w) => w.path.startsWith('adminLogs/'));
      const allowedKeys = extractRuleWhitelist('adminLogs');
      for (const k of Object.keys(write!.data)) {
        expect(allowedKeys).toContain(k);
      }
      expect(write!.data.action).toBe('UPDATE_PROPERTY');
      expect(write!.data.adminUid).toBe('admin-1');
      expect(write!.data.userId).toBe('admin-1');
      expect(Array.isArray(write!.data.details)).toBe(false);

      const logs = await getRecentAdminLogs(10);
      expect(logs).toHaveLength(1);

      state.mockAuth.currentUser = null;
      expect(await logAdminAction({ action: 'NO_OP', target: 'x' })).toBeNull();
    });

    it('manages inquiries, contact messages, locations, categories, and website content', async () => {
      state.docs.set('inquiries/inq-1', {
        name: 'Buyer',
        phone: '9042461234',
        projectId: 'thangaraj-city',
        projectName: 'THANGARAJ CITY',
        message: 'Need plot availability',
        status: 'new',
        createdAt: '2026-05-01T00:00:00.000Z',
      });
      state.docs.set('contactMessages/msg-1', {
        name: 'Visitor',
        phone: '9042461234',
        subject: 'Support',
        message: 'General question',
        status: 'new',
        createdAt: '2026-05-01T00:00:00.000Z',
      });

      const inqs = await getAllInquiriesAdmin();
      expect(inqs[0].enquiryType).toBe('project');
      await updateInquiryAdmin('inq-1', 'Contacted', 'Called back');
      expect(state.docs.get('inquiries/inq-1')?.status).toBe('contacted');
      await deleteInquiryAdmin('inq-1');
      expect(state.docs.has('inquiries/inq-1')).toBe(false);

      const msgs = await getAllContactMessagesAdmin();
      expect(msgs[0].isContactMessage).toBe(true);
      await updateContactMessageAdmin('msg-1', 'Closed', 'Resolved');
      expect(state.docs.get('contactMessages/msg-1')?.status).toBe('closed');
      await deleteContactMessageAdmin('msg-1');
      expect(state.docs.has('contactMessages/msg-1')).toBe(false);

      const addedLoc = await addLocationAdmin({ name: 'Tambaram', district: 'Chengalpattu' });
      expect((await getAllLocationsAdmin()).some((l) => l.id === addedLoc.id)).toBe(true);
      await toggleLocationActiveAdmin(addedLoc.id, true);
      expect(state.docs.get(`locations/${addedLoc.id}`)?.active).toBe(false);
      await deleteLocationAdmin(addedLoc.id);
      expect(state.docs.has(`locations/${addedLoc.id}`)).toBe(false);

      const addedCat = await addCategoryAdmin({ name: 'Villa Plot', description: 'Gated' });
      expect((await getAllCategoriesAdmin()).some((c: any) => c.id === addedCat.id)).toBe(true);
      await toggleCategoryActiveAdmin(addedCat.id);
      await deleteCategoryAdmin(addedCat.id);

      await updateWebsiteContentAdmin({
        companyName: 'PRIME HOUSING',
        tagline: 'Verified Plots',
        heroHeadline: 'Trusted Land Advisory',
        contactPhone: '90424 61234',
      });
      expect(state.docs.get('websiteContent/main')?.contactPhone).toBe('90424 61234');
    });

    it('enforces publish gates, storage cleanup, and lifecycle ops on properties and projects', async () => {
      // Publishing without verification/requirements throws descriptive error
      await expect(
        savePropertyAdmin({
          title: 'Short',
          location: '',
          area: 0,
          price: 0,
          status: 'published',
        })
      ).rejects.toThrow('Cannot publish property:');

      const draft = await savePropertyAdmin({
        title: 'Verified Chengalpattu Residential Plot',
        location: 'Chengalpattu',
        area: 1200,
        areaUnit: 'Sq. Ft.',
        price: 1800000,
        approvalDetails: 'DTCP Approved',
        verified: true,
        images: [
          'https://firebasestorage.googleapis.com/v0/b/prime-housing-72330.firebasestorage.app/o/properties%2Fdemo%2Fimg1.jpg?alt=media',
        ],
        status: 'draft',
      });
      expect(draft.status).toBe('draft');

      // Manually attach storagePaths to verify URL-decoded pruning on image removal
      const existing = state.docs.get(`properties/${draft.id}`)!;
      state.docs.set(`properties/${draft.id}`, {
        ...existing,
        storagePaths: ['properties/demo/img1.jpg'],
      });

      const updated = await savePropertyAdmin({
        ...draft,
        images: ['https://example.com/replacement.jpg'],
        approvalDetails: 'DTCP Approved',
        verified: true,
        status: 'published',
      });
      expect(updated.status).toBe('published');
      expect(state.docs.get(`properties/${draft.id}`)?.storagePaths).toEqual([]);

      await togglePropertyFeaturedAdmin(draft.id);
      await updatePropertyStatusAdmin(draft.id, 'sold');
      expect((await getAllPropertiesAdmin()).length).toBe(1);
      await deletePropertyAdmin(draft.id);
      expect(state.docs.has(`properties/${draft.id}`)).toBe(false);

      // Projects CRUD & fallback
      const savedProj = await saveProjectAdmin({
        name: 'Emerald Enclave',
        location: 'Chengalpattu',
        status: 'draft',
      });
      expect(savedProj.slug).toBe('emerald-enclave');
      await updateProjectStatusAdmin(savedProj, 'published');
      expect(state.docs.get(`projects/${savedProj.id}`)?.published).toBe(true);
      await updateProjectPermissionsAdmin(savedProj, { accessMode: 'super_admin_only' });
      expect((await getAllProjectsAdmin()).some((p) => p.id === savedProj.id)).toBe(true);
      await deleteProjectAdmin(savedProj);
      expect(state.docs.has(`projects/${savedProj.id}`)).toBe(false);
    });

    it('manages seller submission review, draft conversion, users, admins registry, and dashboard stats', async () => {
      state.docs.set('sellerSubmissions/sub-1', {
        sellerName: 'Ramesh',
        sellerPhone: '9042461234',
        location: 'Madurai',
        propertyType: 'Residential Land',
        areaValue: 1,
        areaUnit: 'Acres',
        expectedPrice: 2500000,
        status: 'pending',
        reviewStatus: 'pending',
        consentToContact: true,
        createdAt: '2026-05-01T00:00:00.000Z',
      });
      state.docs.set('users/u-1', {
        email: 'u1@example.com',
        name: 'User 1',
        createdAt: '2026-05-01T00:00:00.000Z',
      });

      const subs = await getAllSubmissionsAdmin();
      expect(subs).toHaveLength(1);

      const createdDraft = await approveSubmissionAndCreatePropertyAdmin('sub-1', 'Verified deed', {
        title: 'Approved Madurai Residential Plot',
        location: 'Madurai',
        area: 1200,
        areaUnit: 'Sq. Ft.',
        price: 2500000,
      });
      expect(createdDraft.status).toBe('draft');
      expect(state.docs.get('sellerSubmissions/sub-1')?.reviewStatus).toBe('approved');
      expect(state.docs.get('sellerSubmissions/sub-1')?.convertedPropertyId).toBe(createdDraft.id);

      await updateSubmissionReviewAdmin('sub-1', 'clarification_requested', 'Need FMB sketch');
      expect(state.docs.get('sellerSubmissions/sub-1')?.reviewStatus).toBe('clarification_requested');

      await upsertAdminRegistryMember({
        uid: 'staff-1',
        email: 'staff@primehousing.co.in',
        name: 'Staff Editor',
        role: 'editor',
      });
      expect((await getAllAdminsList()).some((a) => a.uid === 'staff-1')).toBe(true);
      await removeAdminRegistryMember('staff-1', 'staff@primehousing.co.in');
      expect((await getAllAdminsList()).some((a) => a.uid === 'staff-1')).toBe(false);

      expect(await getAllUsersAdmin()).toHaveLength(1);

      const dashboard = await getAdminDashboardStats();
      expect(dashboard.stats.totalProperties).toBe(1);
      expect(dashboard.stats.draftProperties).toBe(1);
      expect(dashboard.stats.pendingSubmissions).toBe(1);
      expect(dashboard.stats.usersCount).toBe(1);
    });
  });
});
