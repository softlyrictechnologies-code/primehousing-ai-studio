import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, storage } from '../firebase';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE_BYTES = 15 * 1024 * 1024;

function cleanFileName(name = 'file') {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
}

export function validateStorageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `"${file.name}" must be a JPEG, PNG, or WebP image.`,
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" exceeds the 5 MB file size limit.`,
    };
  }
  return { valid: true };
}

export function validateProjectAssetFile(file, kind = 'image') {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }
  const fileType = (file.type || '').toLowerCase();
  const isPdfByExt = file.name?.toLowerCase().endsWith('.pdf');

  if (kind === 'pdf') {
    if (fileType !== 'application/pdf' && !isPdfByExt) {
      return {
        valid: false,
        error: `"${file.name}" must be a PDF document.`,
      };
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return {
        valid: false,
        error: `"${file.name}" exceeds the 15 MB PDF size limit.`,
      };
    }
    return { valid: true };
  }

  if (kind === 'document') {
    const allowed = ALLOWED_DOCUMENT_MIME_TYPES.includes(fileType) || isPdfByExt;
    if (!allowed) {
      return {
        valid: false,
        error: `"${file.name}" must be a PDF, JPEG, PNG, or WebP file.`,
      };
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      return {
        valid: false,
        error: `"${file.name}" exceeds the 15 MB file size limit.`,
      };
    }
    return { valid: true };
  }

  return validateStorageFile(file);
}

function uploadToFirebaseStorage(file, storagePath, onProgress = () => {}, metadata = {}, skipImageCheck = false) {
  if (!skipImageCheck) {
    const check = validateStorageFile(file);
    if (!check.valid) {
      return Promise.reject(new Error(check.error));
    }
  }

  return new Promise((resolve, reject) => {
    const currentUser = auth.currentUser;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || (file.name?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
      customMetadata: {
        ...metadata,
        uploadedBy: currentUser?.uid || 'public-seller',
      },
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        console.error('[Storage:upload]', error?.code, error?.message);
        const err = new Error(error?.message || 'Failed to upload file to Firebase Storage.');
        /** @type {any} */ (err).code = error?.code;
        reject(err);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ downloadUrl, storagePath });
        } catch (err) {
          console.error('[Storage:getDownloadURL]', err);
          reject(new Error('File uploaded, but failed to retrieve download URL.'));
        }
      }
    );
  });
}

export async function uploadPropertyImage(file, propertyId = 'general', onProgress = () => {}) {
  const safeFileName = cleanFileName(file.name);
  const storagePath = `properties/${propertyId}/${Date.now()}_${safeFileName}`;
  return uploadToFirebaseStorage(file, storagePath, onProgress, { propertyId });
}

export async function uploadSellerSubmissionImage(file, submissionId = 'temp', onProgress = () => {}) {
  const safeFileName = cleanFileName(file.name);
  const storagePath = `sellerSubmissions/${submissionId}/${Date.now()}_${safeFileName}`;
  return uploadToFirebaseStorage(file, storagePath, onProgress, { submissionId });
}

/**
 * Uploads a project image or document to projects/{projectId}/{folderCategory}/...
 * Falls back to properties/project_{projectId}/... only if storage rules deny projects/*
 * @param {File} file
 * @param {string} [projectId]
 * @param {string} [folderCategory]
 * @param {'image'|'document'|'pdf'} [kind]
 * @param {(pct: number) => void} [onProgress]
 * @returns {Promise<{ downloadUrl: string, storagePath: string }>}
 */
export async function uploadProjectAsset(
  file,
  projectId = 'general',
  folderCategory = 'gallery',
  kind = 'image',
  onProgress = () => {}
) {
  const check = validateProjectAssetFile(file, kind);
  if (!check.valid) {
    throw new Error(check.error);
  }

  const safeProjectId = cleanFileName(projectId || 'general');
  const safeFolder = cleanFileName(folderCategory || 'gallery');
  const safeFileName = cleanFileName(file.name || 'asset');
  const timestamp = Date.now();
  const primaryPath = `projects/${safeProjectId}/${safeFolder}/${timestamp}_${safeFileName}`;

  try {
    return await uploadToFirebaseStorage(
      file,
      primaryPath,
      onProgress,
      { projectId: safeProjectId, folderCategory: safeFolder },
      true
    );
  } catch (err) {
    const code = /** @type {any} */ (err)?.code || '';
    const msg = String(/** @type {any} */ (err)?.message || '').toLowerCase();
    if (code === 'storage/unauthorized' || msg.includes('unauthorized') || msg.includes('permission')) {
      const fallbackPath = `properties/project_${safeProjectId}/${safeFolder}_${timestamp}_${safeFileName}`;
      return uploadToFirebaseStorage(
        file,
        fallbackPath,
        onProgress,
        { projectId: safeProjectId, folderCategory: safeFolder },
        true
      );
    }
    throw err;
  }
}

export async function deleteStorageFile(storagePathOrUrl) {
  if (!storagePathOrUrl) return;
  if (storagePathOrUrl.startsWith('/assets/')) return;
  try {
    let targetRef;
    if (storagePathOrUrl.startsWith('http://') || storagePathOrUrl.startsWith('https://')) {
      const urlObj = new URL(storagePathOrUrl);
      const match = urlObj.pathname.match(/\/o\/(.+)$/);
      if (!match) return;
      const decodedPath = decodeURIComponent(match[1]);
      targetRef = ref(storage, decodedPath);
    } else {
      const normalizedPath = storagePathOrUrl.replace(/^\/+/, '');
      targetRef = ref(storage, normalizedPath);
    }
    await deleteObject(targetRef);
  } catch (error) {
    const code = error?.code || '';
    if (code === 'storage/object-not-found') {
      return;
    }
    console.error('[Storage:delete]', code, error?.message);
    throw new Error(error?.message || 'Failed to delete file from Firebase Storage.');
  }
}

