import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const PROJECT_ID = 'demo-prime-housing-test';
const FIRESTORE_RULES = fs.readFileSync(path.join(ROOT_DIR, 'firestore.rules'), 'utf8');

let testEnv: RulesTestEnvironment;

function serverTs() {
  return firebase.firestore.FieldValue.serverTimestamp();
}

function validInquiryPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Buyer',
    phone: '9876543210',
    email: 'buyer@example.com',
    address: 'Madurai',
    message: 'Interested in visiting this residential plot.',
    propertyId: 'prop-1',
    propertyTitle: 'Green Valley Plot',
    projectId: '',
    projectName: '',
    projectSlug: '',
    enquiryCategory: '',
    source: 'property-detail',
    status: 'new',
    createdAt: serverTs(),
    ...overrides,
  };
}

function validContactPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Visitor',
    email: 'visitor@example.com',
    phone: '9876543210',
    subject: 'General Contact Enquiry',
    message: 'Requesting information about approved residential plots.',
    status: 'new',
    source: 'contact-page',
    createdAt: serverTs(),
    ...overrides,
  };
}

function validSellerSubmissionPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Agricultural Land in Pollachi',
    sellerName: 'Test Landowner',
    sellerPhone: '9876543210',
    sellerEmail: 'owner@example.com',
    location: 'Pollachi',
    districtTownVillage: 'Coimbatore',
    propertyType: 'Agricultural Land',
    areaSqFt: 43560,
    area: '1 Acres',
    areaUnit: 'Acres',
    areaValue: 1,
    expectedPrice: 3500000,
    description: 'Fertile agricultural parcel with clear patta and 30ft road access.',
    roadAccess: '30 ft Tar Road',
    approvalDetails: 'Clear Patta',
    additionalNotes: '',
    images: [],
    storagePaths: [],
    status: 'pending',
    reviewStatus: 'pending',
    consentToContact: true,
    createdAt: serverTs(),
    updatedAt: serverTs(),
    ...overrides,
  };
}

describe('Firestore Security Rules & RBAC', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: FIRESTORE_RULES,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await db.doc('admins/super-uid').set({ role: 'super_admin', active: true, name: 'Super Admin' });
      await db.doc('admins/admin-uid').set({ role: 'admin', active: true, name: 'Ops Admin' });
      await db.doc('admins/editor-uid').set({ role: 'editor', active: true, name: 'Catalog Editor' });
      await db.doc('admins/support-uid').set({ role: 'support', active: true, name: 'Support Desk' });
      await db.doc('admins/deactivated-uid').set({
        role: 'super_admin',
        active: false,
        name: 'Disabled Account',
      });

      await db.doc('websiteContent/main').set({
        companyName: 'PRIME HOUSING',
        published: true,
      });
      await db.doc('properties/prop-pub').set({
        title: 'Published Plot',
        published: true,
        status: 'published',
      });
      await db.doc('properties/prop-draft').set({
        title: 'Draft Plot',
        published: false,
        status: 'draft',
      });
      await db.doc('projects/proj-open').set({
        name: 'Open Project',
        slug: 'open-project',
        status: 'published',
        published: true,
        editPermissions: {
          accessMode: 'all_admins',
          allowedRoles: ['super_admin', 'admin', 'editor'],
        },
      });
      await db.doc('projects/proj-locked').set({
        name: 'Locked Project',
        slug: 'locked-project',
        status: 'draft',
        published: false,
        editPermissions: {
          accessMode: 'super_admin_only',
          allowedRoles: ['super_admin'],
        },
      });
      await db.doc('projects/proj-custom-admin').set({
        name: 'Admin Only Custom Project',
        slug: 'admin-custom',
        status: 'published',
        published: true,
        editPermissions: {
          accessMode: 'custom_roles',
          allowedRoles: ['super_admin', 'admin'],
        },
      });
      await db.doc('locations/loc-active').set({ name: 'Madurai', active: true });
      await db.doc('locations/loc-inactive').set({ name: 'Hidden', active: false });
      await db.doc('inquiries/inq-1').set({
        name: 'Seed Buyer',
        phone: '9876543210',
        message: 'Sample test enquiry',
        status: 'new',
      });
      await db.doc('contactMessages/msg-1').set({
        name: 'Seed Contact',
        phone: '9876543210',
        message: 'Sample contact message',
        status: 'new',
      });
      await db.doc('sellerSubmissions/sub-1').set({
        sellerName: 'Seed Seller',
        sellerPhone: '9876543210',
        status: 'pending',
        reviewStatus: 'pending',
        consentToContact: true,
      });
      await db.doc('adminLogs/log-1').set({
        action: 'SEED',
        userId: 'super-uid',
        adminUid: 'super-uid',
      });
      await db.doc('users/user-a').set({
        uid: 'user-a',
        name: 'User A',
        email: 'a@example.com',
        phone: '9876543210',
      });
      await db.doc('users/user-b').set({
        uid: 'user-b',
        name: 'User B',
        email: 'b@example.com',
        phone: '9876543210',
      });
    });
  });

  it('enforces public read visibility on published catalog only and blocks private reads', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(anonDb.doc('websiteContent/main').get());
    await assertSucceeds(anonDb.doc('properties/prop-pub').get());
    await assertSucceeds(anonDb.doc('projects/proj-open').get());
    await assertSucceeds(anonDb.doc('locations/loc-active').get());

    await assertFails(anonDb.doc('properties/prop-draft').get());
    await assertFails(anonDb.doc('projects/proj-locked').get());
    await assertFails(anonDb.doc('locations/loc-inactive').get());
    await assertFails(anonDb.doc('inquiries/inq-1').get());
    await assertFails(anonDb.doc('contactMessages/msg-1').get());
    await assertFails(anonDb.doc('sellerSubmissions/sub-1').get());
    await assertFails(anonDb.doc('admins/super-uid').get());
    await assertFails(anonDb.doc('adminLogs/log-1').get());
    await assertFails(anonDb.doc('users/user-a').get());
    await assertFails(anonDb.doc('unknownCollection/item-1').get());
  });

  it('validates strict schemas for public inquiry, contact, and seller submission creation', async () => {
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(anonDb.collection('inquiries').add(validInquiryPayload()));
    await assertFails(anonDb.collection('inquiries').add(validInquiryPayload({ phone: '12345' })));
    await assertFails(anonDb.collection('inquiries').add(validInquiryPayload({ status: 'closed' })));
    await assertFails(anonDb.collection('inquiries').add(validInquiryPayload({ extraAdminFlag: true })));

    await assertSucceeds(anonDb.collection('contactMessages').add(validContactPayload()));
    await assertFails(anonDb.collection('contactMessages').add(validContactPayload({ message: '' })));
    await assertFails(anonDb.collection('contactMessages').add(validContactPayload({ role: 'admin' })));

    await assertSucceeds(anonDb.collection('sellerSubmissions').add(validSellerSubmissionPayload()));
    await assertFails(
      anonDb.collection('sellerSubmissions').add(validSellerSubmissionPayload({ consentToContact: false }))
    );
    await assertFails(
      anonDb.collection('sellerSubmissions').add(validSellerSubmissionPayload({ expectedPrice: 0 }))
    );
    await assertFails(
      anonDb.collection('sellerSubmissions').add(validSellerSubmissionPayload({ sellerId: 'forged-uid' }))
    );
  });

  it('prevents normal authenticated users from escalating privileges or accessing staff collections', async () => {
    const userADb = testEnv.authenticatedContext('user-a').firestore();

    await assertSucceeds(userADb.doc('users/user-a').get());
    await assertSucceeds(
      userADb.doc('users/user-a').update({
        uid: 'user-a',
        name: 'Updated User A',
        updatedAt: serverTs(),
      })
    );

    await assertFails(
      userADb.doc('users/user-a').update({
        role: 'super_admin',
        updatedAt: serverTs(),
      })
    );
    await assertFails(userADb.doc('users/user-b').get());
    await assertFails(userADb.doc('admins/user-a').set({ role: 'super_admin', active: true }));
    await assertFails(userADb.doc('properties/prop-new').set({ title: 'Unauthorized', published: true }));
    await assertFails(userADb.collection('inquiries').get());
    await assertFails(userADb.collection('adminLogs').get());
  });

  it('rejects deactivated admin accounts even if they hold legacy custom claims', async () => {
    const deactivatedDb = testEnv
      .authenticatedContext('deactivated-uid', { superAdmin: true, role: 'super_admin' })
      .firestore();

    await assertFails(deactivatedDb.doc('properties/prop-draft').get());
    await assertFails(deactivatedDb.doc('properties/prop-pub').update({ title: 'Tampered' }));
    await assertFails(deactivatedDb.collection('inquiries').get());
    await assertFails(
      deactivatedDb.collection('adminLogs').add({
        action: 'ATTEMPT',
        target: 'properties',
        targetId: 'prop-pub',
        details: {},
        adminEmail: 'disabled@example.com',
        adminUid: 'deactivated-uid',
        userId: 'deactivated-uid',
        createdAt: serverTs(),
      })
    );
  });

  it('enforces support, editor, admin, and super_admin permissions accurately', async () => {
    const supportDb = testEnv.authenticatedContext('support-uid').firestore();
    const editorDb = testEnv.authenticatedContext('editor-uid').firestore();
    const adminDb = testEnv.authenticatedContext('admin-uid').firestore();
    const superDb = testEnv.authenticatedContext('super-uid').firestore();

    // Support: read & update enquiries/submissions, cannot write catalog or delete anything
    await assertSucceeds(supportDb.doc('inquiries/inq-1').get());
    await assertSucceeds(supportDb.doc('inquiries/inq-1').update({ status: 'contacted' }));
    await assertSucceeds(supportDb.doc('sellerSubmissions/sub-1').update({ reviewStatus: 'rejected' }));
    await assertFails(supportDb.doc('inquiries/inq-1').delete());
    await assertFails(supportDb.doc('properties/prop-pub').update({ title: 'Support Blocked' }));
    await assertFails(supportDb.doc('locations/loc-active').update({ active: false }));

    // Editor: create/update properties & open projects; blocked from deleting or touching admin-custom/locked projects
    await assertSucceeds(editorDb.doc('properties/prop-pub').update({ title: 'Editor Updated Plot' }));
    await assertSucceeds(editorDb.doc('projects/proj-open').update({ location: 'Madurai South' }));
    await assertFails(editorDb.doc('properties/prop-pub').delete());
    await assertFails(editorDb.doc('inquiries/inq-1').delete());
    await assertFails(editorDb.doc('projects/proj-custom-admin').update({ name: 'Blocked For Editor' }));
    await assertFails(editorDb.doc('projects/proj-locked').update({ name: 'Blocked For Editor' }));

    // Admin: can delete properties/inquiries & edit custom-admin projects; blocked from super_admin_only projects & admins registry
    await assertSucceeds(adminDb.doc('projects/proj-custom-admin').update({ location: 'Coimbatore' }));
    await assertSucceeds(adminDb.doc('properties/prop-draft').delete());
    await assertSucceeds(adminDb.doc('inquiries/inq-1').delete());
    await assertFails(adminDb.doc('projects/proj-locked').update({ name: 'Admin Blocked' }));
    await assertFails(adminDb.doc('projects/proj-locked').delete());
    await assertFails(adminDb.doc('admins/editor-uid').update({ role: 'super_admin' }));

    // Super Admin: full access including locked projects and admins registry
    await assertSucceeds(superDb.doc('projects/proj-locked').update({ name: 'Super Admin Unlocked' }));
    await assertSucceeds(superDb.doc('admins/new-staff').set({ role: 'editor', active: true }));
    await assertSucceeds(superDb.doc('projects/proj-locked').delete());
  });

  it('enforces immutable append-only adminLogs bound to the caller uid', async () => {
    const editorDb = testEnv.authenticatedContext('editor-uid').firestore();
    const superDb = testEnv.authenticatedContext('super-uid').firestore();

    await assertSucceeds(
      editorDb.collection('adminLogs').add({
        action: 'UPDATE_PROPERTY',
        target: 'properties',
        targetId: 'prop-pub',
        details: { summary: 'Updated listing' },
        adminEmail: 'editor@example.com',
        adminUid: 'editor-uid',
        userId: 'editor-uid',
        createdAt: serverTs(),
      })
    );

    // Forged userId/adminUid rejected
    await assertFails(
      editorDb.collection('adminLogs').add({
        action: 'FORGED',
        target: 'properties',
        targetId: 'prop-pub',
        details: {},
        adminEmail: 'super@example.com',
        adminUid: 'super-uid',
        userId: 'super-uid',
        createdAt: serverTs(),
      })
    );

    // Update & delete denied even for super_admin
    await assertFails(superDb.doc('adminLogs/log-1').update({ action: 'TAMPERED' }));
    await assertFails(superDb.doc('adminLogs/log-1').delete());
  });
});
