import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const PROJECT_ID = 'demo-prime-housing-test';
const FIRESTORE_RULES = fs.readFileSync(path.join(ROOT_DIR, 'firestore.rules'), 'utf8');
const STORAGE_RULES = fs.readFileSync(path.join(ROOT_DIR, 'storage.rules'), 'utf8');

let testEnv: RulesTestEnvironment;

function makeBytes(size: number): Uint8Array {
  return new Uint8Array(size);
}

describe('Firebase Storage Security Rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules: FIRESTORE_RULES,
      },
      storage: {
        host: '127.0.0.1',
        port: 9199,
        rules: STORAGE_RULES,
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
    await testEnv.clearStorage();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.doc('admins/admin-uid').set({ role: 'admin', active: true });
      await db.doc('admins/editor-uid').set({ role: 'editor', active: true });
      await db.doc('admins/support-uid').set({ role: 'support', active: true });
      await db.doc('admins/disabled-uid').set({ role: 'admin', active: false });

      const storage = context.storage();
      await storage.ref('properties/prop-1/cover.jpg').put(makeBytes(64), { contentType: 'image/jpeg' });
      await storage
        .ref('projects/thangaraj/gallery/view.webp')
        .put(makeBytes(64), { contentType: 'image/webp' });
      await storage
        .ref('sellerSubmissions/sub-1/parcel.jpg')
        .put(makeBytes(64), { contentType: 'image/jpeg' });
    });
  });

  it('allows public reads on property and project assets while keeping sellerSubmissions private', async () => {
    const anonStorage = testEnv.unauthenticatedContext().storage();
    const userStorage = testEnv.authenticatedContext('regular-user').storage();
    const supportStorage = testEnv.authenticatedContext('support-uid').storage();

    await assertSucceeds(anonStorage.ref('properties/prop-1/cover.jpg').getDownloadURL());
    await assertSucceeds(anonStorage.ref('projects/thangaraj/gallery/view.webp').getDownloadURL());

    await assertFails(anonStorage.ref('sellerSubmissions/sub-1/parcel.jpg').getDownloadURL());
    await assertFails(userStorage.ref('sellerSubmissions/sub-1/parcel.jpg').getDownloadURL());
    await assertSucceeds(supportStorage.ref('sellerSubmissions/sub-1/parcel.jpg').getDownloadURL());
  });

  it('allows authorized editor and admin uploads and restricts deletions properly', async () => {
    const editorStorage = testEnv.authenticatedContext('editor-uid').storage();
    const adminStorage = testEnv.authenticatedContext('admin-uid').storage();

    await assertSucceeds(
      Promise.resolve(
        editorStorage
          .ref('properties/prop-2/photo.png')
          .put(makeBytes(128), { contentType: 'image/png' })
      )
    );

    await assertSucceeds(
      Promise.resolve(
        editorStorage
          .ref('projects/thangaraj/documents/brochure.pdf')
          .put(makeBytes(256), { contentType: 'application/pdf' })
      )
    );

    await assertSucceeds(editorStorage.ref('properties/prop-1/cover.jpg').delete());
    await assertFails(editorStorage.ref('sellerSubmissions/sub-1/parcel.jpg').delete());
    await assertSucceeds(adminStorage.ref('sellerSubmissions/sub-1/parcel.jpg').delete());
  });

  it('denies unauthenticated writes, non-staff writes, support writes, and deactivated admins', async () => {
    const anonStorage = testEnv.unauthenticatedContext().storage();
    const userStorage = testEnv.authenticatedContext('regular-user').storage();
    const supportStorage = testEnv.authenticatedContext('support-uid').storage();
    const disabledStorage = testEnv
      .authenticatedContext('disabled-uid', { admin: true, role: 'admin' })
      .storage();

    await assertFails(
      Promise.resolve(
        anonStorage.ref('properties/prop-1/hack.jpg').put(makeBytes(64), { contentType: 'image/jpeg' })
      )
    );
    await assertFails(
      Promise.resolve(
        anonStorage
          .ref('sellerSubmissions/sub-new/photo.jpg')
          .put(makeBytes(64), { contentType: 'image/jpeg' })
      )
    );
    await assertFails(
      Promise.resolve(
        userStorage.ref('properties/prop-1/hack.jpg').put(makeBytes(64), { contentType: 'image/jpeg' })
      )
    );
    await assertFails(
      Promise.resolve(
        supportStorage
          .ref('properties/prop-1/support.jpg')
          .put(makeBytes(64), { contentType: 'image/jpeg' })
      )
    );
    await assertFails(
      Promise.resolve(
        disabledStorage
          .ref('properties/prop-1/disabled.jpg')
          .put(makeBytes(64), { contentType: 'image/jpeg' })
      )
    );

    await assertFails(anonStorage.ref('properties/prop-1/cover.jpg').delete());
    await assertFails(userStorage.ref('properties/prop-1/cover.jpg').delete());
    await assertFails(supportStorage.ref('properties/prop-1/cover.jpg').delete());
  });

  it('denies invalid MIME types, oversized files, and unsupported storage paths', async () => {
    const adminStorage = testEnv.authenticatedContext('admin-uid').storage();

    // Invalid MIME types
    await assertFails(
      Promise.resolve(
        adminStorage
          .ref('properties/prop-1/script.txt')
          .put(makeBytes(64), { contentType: 'text/plain' })
      )
    );
    await assertFails(
      Promise.resolve(
        adminStorage
          .ref('properties/prop-1/vector.svg')
          .put(makeBytes(64), { contentType: 'image/svg+xml' })
      )
    );
    await assertFails(
      Promise.resolve(
        adminStorage
          .ref('properties/prop-1/doc.pdf')
          .put(makeBytes(64), { contentType: 'application/pdf' })
      )
    );

    // Oversized image (> 5 MB) on properties/
    await assertFails(
      Promise.resolve(
        adminStorage
          .ref('properties/prop-1/huge.jpg')
          .put(makeBytes(5 * 1024 * 1024 + 1), { contentType: 'image/jpeg' })
      )
    );

    // Oversized PDF (> 15 MB) on projects/
    await assertFails(
      Promise.resolve(
        adminStorage
          .ref('projects/thangaraj/documents/huge.pdf')
          .put(makeBytes(15 * 1024 * 1024 + 1), { contentType: 'application/pdf' })
      )
    );

    // Unsupported paths
    await assertFails(
      Promise.resolve(
        adminStorage.ref('unapproved/folder/test.jpg').put(makeBytes(64), { contentType: 'image/jpeg' })
      )
    );
    await assertFails(
      Promise.resolve(
        adminStorage.ref('logo.png').put(makeBytes(64), { contentType: 'image/png' })
      )
    );
  });
});
