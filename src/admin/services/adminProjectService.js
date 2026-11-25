import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { INITIAL_THANGARAJ_CITY_PROJECT } from '../../data/initialProjects';
import { formatFirebaseError } from '../../services/firebaseUtils';
import {
  FALLBACK_PROPERTIES_COLLECTION,
  PROJECTS_COLLECTION,
  PROJECTS_UPDATED_EVENT,
  WEBSITE_CONTENT_COLLECTION,
  isProjectsCatalogManaged,
  mapProjectDoc,
  normalizeProjectEditPermissions,
  slugifyProjectName,
} from '../../services/projectService';
import { deleteStorageFile } from '../../services/storageService';
import { logAdminAction } from './adminLogService';

function notifyProjectsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(PROJECTS_UPDATED_EVENT));
  }
}

async function markProjectsCatalogManaged() {
  try {
    await setDoc(
      doc(db, WEBSITE_CONTENT_COLLECTION, 'main'),
      {
        projectsCatalogManaged: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[adminProjectService:markManaged]', err?.message);
  }
}

function collectStoragePaths(project) {
  const paths = new Set();
  const pushAsset = (asset) => {
    if (asset?.storagePath) paths.add(asset.storagePath);
    else if (asset?.url && asset.url.includes('firebasestorage')) paths.add(asset.url);
  };

  if (!project) return paths;
  pushAsset(project.images?.heroImage);
  pushAsset(project.images?.entranceImage);
  pushAsset(project.images?.siteImage1);
  pushAsset(project.images?.siteImage2);
  (project.images?.gallery || []).forEach(pushAsset);
  pushAsset(project.routeMap?.image);
  pushAsset(project.routeMap?.qrCode);
  pushAsset(project.documents?.layoutPlan);
  pushAsset(project.documents?.keyPlan);
  pushAsset(project.documents?.brochure);
  (project.documents?.approvalDocuments || []).forEach(pushAsset);
  (project.documents?.additionalPdfs || []).forEach(pushAsset);
  (project.amenities || []).forEach((am) => {
    if (am?.storagePath) paths.add(am.storagePath);
    else if (am?.imageUrl && am.imageUrl.includes('firebasestorage')) paths.add(am.imageUrl);
  });
  return paths;
}

function sanitizeProjectPayload(input, docId) {
  const name = (input.name || '').trim();
  const slug = slugifyProjectName(input.slug || input.seo?.slug || name || docId) || docId;
  const status =
    input.status === 'published' || input.status === 'unpublished' ? input.status : 'draft';

  const cleanData = {
    id: docId,
    name,
    slug,
    category: (input.category || 'Residential Plots').trim(),
    location: (input.location || '').trim(),
    address: (input.address || '').trim(),
    shortDescription: (input.shortDescription || '').trim(),
    fullDescription: (input.fullDescription || '').trim(),
    propertyType: (input.propertyType || input.category || 'Residential Plots').trim(),
    approvalType: (input.approvalType || '').trim(),
    approvalNumber: (input.approvalNumber || '').trim(),
    reraNumber: (input.reraNumber || '').trim(),
    projectStatusLabel: (input.projectStatusLabel || '').trim(),
    status,
    published: status === 'published',
    startingPrice: (input.startingPrice || '').trim(),
    pricePerSqFt: (input.pricePerSqFt || '').trim(),
    totalPlots: (input.totalPlots || '').trim(),
    availablePlots: (input.availablePlots || '').trim(),
    plotSizes: (input.plotSizes || '').trim(),
    plotAvailabilityNote: (input.plotAvailabilityNote || '').trim(),
    specialOffers: (input.specialOffers || '').trim(),
    pricingDescription: (input.pricingDescription || '').trim(),
    overviewHeading: (input.overviewHeading || 'Project Overview').trim(),
    overviewSubheading: (input.overviewSubheading || '').trim(),
    overviewParagraphs: Array.isArray(input.overviewParagraphs) ? input.overviewParagraphs : [],
    whyChooseItems: Array.isArray(input.whyChooseItems) ? input.whyChooseItems : [],
    highlights: Array.isArray(input.highlights) ? input.highlights : [],
    amenities: Array.isArray(input.amenities) ? input.amenities : [],
    locationAdvantages: Array.isArray(input.locationAdvantages) ? input.locationAdvantages : [],
    nearbyPlaces: input.nearbyPlaces || {},
    images: {
      heroImage: input.images?.heroImage || null,
      entranceImage: input.images?.entranceImage || null,
      siteImage1: input.images?.siteImage1 || null,
      siteImage2: input.images?.siteImage2 || null,
      gallery: Array.isArray(input.images?.gallery) ? input.images.gallery : [],
    },
    routeMap: {
      image: input.routeMap?.image || null,
      qrCode: input.routeMap?.qrCode || null,
      googleMapsUrl: (input.routeMap?.googleMapsUrl || '').trim(),
      address: (input.routeMap?.address || '').trim(),
      locationDescription: (input.routeMap?.locationDescription || '').trim(),
    },
    documents: {
      layoutPlan: input.documents?.layoutPlan || null,
      keyPlan: input.documents?.keyPlan || null,
      brochure: input.documents?.brochure || null,
      approvalDocuments: Array.isArray(input.documents?.approvalDocuments)
        ? input.documents.approvalDocuments
        : [],
      additionalPdfs: Array.isArray(input.documents?.additionalPdfs)
        ? input.documents.additionalPdfs
        : [],
    },
    seo: {
      title: (input.seo?.title || '').trim(),
      metaDescription: (input.seo?.metaDescription || '').trim(),
      slug,
      ogImage: (input.seo?.ogImage || '').trim(),
      ogImageAlt: (input.seo?.ogImageAlt || '').trim(),
    },
    contactPhone: (input.contactPhone || '').trim(),
    contactEmail: (input.contactEmail || '').trim(),
    contactAddress: (input.contactAddress || '').trim(),
    plotViewUrl: (input.plotViewUrl || '').trim(),
    editPermissions: normalizeProjectEditPermissions(input.editPermissions),
  };

  return cleanData;
}

/**
 * Fetches all projects (draft, published, unpublished) for Admin.
 * Ensures Thangaraj City initial project is available to edit until managed in Firestore.
 * @returns {Promise<import('../../types/realEstate').Project[]>}
 */
export async function getAllProjectsAdmin() {
  const byId = new Map();

  try {
    const snap = await getDocs(collection(db, PROJECTS_COLLECTION));
    snap.docs.forEach((docSnap) => {
      const mapped = mapProjectDoc(docSnap);
      byId.set(mapped.id, mapped);
    });
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('[getAllProjectsAdmin:projects]', err?.message);
    }
  }

  try {
    const fbSnap = await getDocs(collection(db, FALLBACK_PROPERTIES_COLLECTION));
    fbSnap.docs.forEach((docSnap) => {
      const raw = docSnap.data() || {};
      if (raw.entityType === 'project') {
        const mapped = mapProjectDoc(docSnap);
        if (!byId.has(mapped.id)) {
          byId.set(mapped.id, mapped);
        }
      }
    });
  } catch (err) {
    throw formatFirebaseError(err, 'getAllProjectsAdmin', FALLBACK_PROPERTIES_COLLECTION);
  }

  const managed = await isProjectsCatalogManaged();
  if (!managed && !byId.has(INITIAL_THANGARAJ_CITY_PROJECT.id)) {
    const hasSlug = Array.from(byId.values()).some(
      (p) => p.slug.toLowerCase() === INITIAL_THANGARAJ_CITY_PROJECT.slug
    );
    if (!hasSlug) {
      byId.set(INITIAL_THANGARAJ_CITY_PROJECT.id, INITIAL_THANGARAJ_CITY_PROJECT);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()
  );
}

/**
 * Creates or updates a project independently in Firestore, writes audit log, and refreshes dropdown.
 * @param {any} projectInput
 * @param {any} [previousProject]
 */
export async function saveProjectAdmin(projectInput, previousProject = null) {
  try {
    const user = auth.currentUser;
    const desiredId =
      projectInput.id ||
      slugifyProjectName(projectInput.slug || projectInput.name) ||
      `proj-${Date.now()}`;
    const cleanPayload = sanitizeProjectPayload(projectInput, desiredId);

    if (!cleanPayload.name) {
      throw new Error('Project Name is required.');
    }

    // Ensure unique slug across existing projects (excluding current id)
    const existingList = await getAllProjectsAdmin();
    const duplicateSlug = existingList.find(
      (p) => p.id !== desiredId && p.slug.toLowerCase() === cleanPayload.slug.toLowerCase()
    );
    if (duplicateSlug) {
      cleanPayload.slug = `${cleanPayload.slug}-${Date.now().toString().slice(-4)}`;
      cleanPayload.seo.slug = cleanPayload.slug;
    }

    const firestorePayload = {
      ...cleanPayload,
      updatedBy: user?.email || user?.uid || 'admin',
      updatedAt: serverTimestamp(),
      ...(previousProject && !previousProject.isInitialSeed ? {} : { createdAt: serverTimestamp() }),
    };

    let savedVia = PROJECTS_COLLECTION;
    try {
      await setDoc(doc(db, PROJECTS_COLLECTION, desiredId), firestorePayload, { merge: true });
    } catch (err) {
      if (err?.code === 'permission-denied' || String(err?.message || '').toLowerCase().includes('permission')) {
        savedVia = FALLBACK_PROPERTIES_COLLECTION;
        const fallbackId = `project_${desiredId}`;
        await setDoc(
          doc(db, FALLBACK_PROPERTIES_COLLECTION, fallbackId),
          {
            entityType: 'project',
            title: cleanPayload.name,
            location: cleanPayload.location,
            propertyType: cleanPayload.propertyType,
            published: cleanPayload.status === 'published',
            status: cleanPayload.status,
            slug: cleanPayload.slug,
            projectData: cleanPayload,
            updatedBy: user?.email || user?.uid || 'admin',
            updatedAt: serverTimestamp(),
            ...(previousProject && !previousProject.isInitialSeed
              ? {}
              : { createdAt: serverTimestamp() }),
          },
          { merge: true }
        );
      } else {
        throw err;
      }
    }

    // Safely clean up any replaced or removed Storage assets
    if (previousProject) {
      const prevPaths = collectStoragePaths(previousProject);
      const nextPaths = collectStoragePaths(cleanPayload);
      for (const oldPath of prevPaths) {
        if (!nextPaths.has(oldPath)) {
          await deleteStorageFile(oldPath).catch(() => undefined);
        }
      }
    }

    await markProjectsCatalogManaged();
    await logAdminAction({
      action: previousProject ? 'UPDATE_PROJECT' : 'CREATE_PROJECT',
      target: savedVia,
      targetId: desiredId,
      details: {
        summary: `${cleanPayload.name} (${cleanPayload.status})`,
        slug: cleanPayload.slug,
      },
    });

    notifyProjectsUpdated();
    return {
      ...cleanPayload,
      createdAt: previousProject?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw formatFirebaseError(error, 'saveProjectAdmin', PROJECTS_COLLECTION);
  }
}

export async function updateProjectStatusAdmin(project, nextStatus) {
  try {
    if (project.isInitialSeed) {
      return await saveProjectAdmin({ ...project, status: nextStatus }, project);
    }

    const updatedPayload = {
      status: nextStatus,
      published: nextStatus === 'published',
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, PROJECTS_COLLECTION, project.id), updatedPayload);
    } catch (err) {
      if (err?.code === 'permission-denied' || err?.code === 'not-found') {
        const fbRef = doc(db, FALLBACK_PROPERTIES_COLLECTION, `project_${project.id}`);
        await setDoc(
          fbRef,
          {
            entityType: 'project',
            title: project.name,
            location: project.location,
            propertyType: project.propertyType,
            slug: project.slug,
            published: nextStatus === 'published',
            status: nextStatus,
            projectData: {
              ...project,
              status: nextStatus,
              published: nextStatus === 'published',
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        throw err;
      }
    }

    await markProjectsCatalogManaged();
    await logAdminAction({
      action: 'UPDATE_PROJECT_STATUS',
      target: PROJECTS_COLLECTION,
      targetId: project.id,
      details: { summary: `${project.name} -> ${nextStatus}` },
    });

    notifyProjectsUpdated();
  } catch (error) {
    throw formatFirebaseError(error, 'updateProjectStatusAdmin', PROJECTS_COLLECTION);
  }
}

export async function deleteProjectAdmin(project) {
  try {
    await markProjectsCatalogManaged();

    if (!project.isInitialSeed) {
      try {
        await deleteDoc(doc(db, PROJECTS_COLLECTION, project.id));
      } catch (err) {
        if (err?.code !== 'permission-denied' && err?.code !== 'not-found') {
          throw err;
        }
      }

      try {
        await deleteDoc(doc(db, FALLBACK_PROPERTIES_COLLECTION, `project_${project.id}`));
      } catch (err) {
        if (err?.code !== 'permission-denied' && err?.code !== 'not-found') {
          throw err;
        }
      }
    }

    // Delete uploaded project assets from Firebase Storage safely
    const paths = collectStoragePaths(project);
    for (const path of paths) {
      await deleteStorageFile(path).catch(() => undefined);
    }

    await logAdminAction({
      action: 'DELETE_PROJECT',
      target: PROJECTS_COLLECTION,
      targetId: project.id,
      details: { summary: `Deleted project ${project.name}` },
    });

    notifyProjectsUpdated();
  } catch (error) {
    throw formatFirebaseError(error, 'deleteProjectAdmin', PROJECTS_COLLECTION);
  }
}

export async function updateProjectPermissionsAdmin(project, nextPermissions) {
  try {
    const cleanPermissions = normalizeProjectEditPermissions(nextPermissions);
    if (project.isInitialSeed) {
      return await saveProjectAdmin({ ...project, editPermissions: cleanPermissions }, project);
    }

    const user = auth.currentUser;
    const patchPayload = {
      editPermissions: cleanPermissions,
      updatedBy: user?.email || user?.uid || 'admin',
      updatedAt: serverTimestamp(),
    };

    try {
      await updateDoc(doc(db, PROJECTS_COLLECTION, project.id), patchPayload);
    } catch (err) {
      if (err?.code === 'permission-denied' || err?.code === 'not-found') {
        const fbRef = doc(db, FALLBACK_PROPERTIES_COLLECTION, `project_${project.id}`);
        await setDoc(
          fbRef,
          {
            entityType: 'project',
            title: project.name,
            location: project.location,
            propertyType: project.propertyType,
            slug: project.slug,
            published: project.status === 'published',
            status: project.status,
            editPermissions: cleanPermissions,
            projectData: {
              ...project,
              editPermissions: cleanPermissions,
            },
            updatedBy: user?.email || user?.uid || 'admin',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        throw err;
      }
    }

    await markProjectsCatalogManaged();
    await logAdminAction({
      action: 'UPDATE_PROJECT_PERMISSIONS',
      target: PROJECTS_COLLECTION,
      targetId: project.id,
      details: {
        summary: `${project.name} permissions -> ${cleanPermissions.accessMode} (${cleanPermissions.allowedRoles.join(', ')})`,
      },
    });

    notifyProjectsUpdated();
    return {
      ...project,
      editPermissions: cleanPermissions,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw formatFirebaseError(error, 'updateProjectPermissionsAdmin', PROJECTS_COLLECTION);
  }
}
