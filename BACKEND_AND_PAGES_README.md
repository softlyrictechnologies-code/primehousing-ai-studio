# PRIME HOUSING — Public Pages, Admin Pages & Backend Architecture README

Complete page-by-page and backend reference for **PRIME HOUSING & PROPERTIES** (`prime-housing-72330`), documenting every public route, admin route, Firebase service module, Firestore collection, Storage path, validation rule, and Express server endpoint.

---

## Table of Contents

- [1. Public Pages & Backend Data Flow](#1-public-pages--backend-data-flow)
  - [Shared Layout (`PublicLayout.tsx`)](#shared-layout-publiclayouttsx)
  - [`/` — `HomePage.tsx`](#--homepagetsx)
  - [`/properties` — `PropertiesPage.tsx`](#properties--propertiespagetsx)
  - [`/properties/:id` — `PropertyDetailsPage.tsx`](#propertiesid--propertydetailspagetsx)
  - [`/projects/:slug` — `ProjectDetailsPage.tsx` & `ProjectDetailsTemplate.tsx`](#projectsslug--projectdetailspagetsx--projectdetailstemplatetsx)
  - [`/submit-land` — `SubmitLandPage.tsx`](#submit-land--submitlandpagetsx)
  - [`/about` — `AboutPage.tsx`](#about--aboutpagetsx)
  - [`/contact` — `ContactPage.tsx`](#contact--contactpagetsx)
- [2. Admin Pages & Backend Operations](#2-admin-pages--backend-operations)
  - [Authentication & Guard (`AdminAuthContext.tsx` & `AdminGuard.tsx`)](#authentication--guard-adminauthcontexttsx--adminguardtsx)
  - [`/admin/login` — `AdminLoginPage.tsx`](#adminlogin--adminloginpagetsx)
  - [`/admin` — `AdminDashboardPage.tsx`](#admin--admindashboardpagetsx)
  - [`/admin/submissions` — `AdminSubmissionsPage.tsx`](#adminsubmissions--adminsubmissionspagetsx)
  - [`/admin/properties` — `AdminPropertiesPage.tsx`](#adminproperties--adminpropertiespagetsx)
  - [`/admin/projects` — `AdminProjectsPage.tsx`](#adminprojects--adminprojectspagetsx)
  - [`/admin/enquiries` — `AdminEnquiriesPage.tsx`](#adminenquiries--adminenquiriespagetsx)
  - [`/admin/locations` — `AdminLocationsPage.tsx`](#adminlocations--adminlocationspagetsx)
  - [`/admin/content` — `AdminContentPage.tsx`](#admincontent--admincontentpagetsx)
- [3. Backend Services Directory (`src/services` & `src/admin/services`)](#3-backend-services-directory-srcservices--srcadminservices)
- [4. Firebase Auth, Firestore Collections & Security Rules](#4-firebase-auth-firestore-collections--security-rules)
- [5. Firebase Storage Paths & File Validation](#5-firebase-storage-paths--file-validation)
- [6. Express Production Server (`server.ts`)](#6-express-production-server-serverts)

---

## 1. Public Pages & Backend Data Flow

All public pages render inside `PublicLayout` (`src/components/PublicLayout.tsx`).

### Shared Layout (`PublicLayout.tsx`)
- **Backend Calls on Mount**:
  - `getPublicSiteContent()` (`src/services/publicSiteContent.js`) → reads company branding, contact info, and CMS copy from `websiteContent` / `siteSettings` / `settings`.
  - `getPublishedProjects()` (`src/services/projectService.js`) → populates the **Projects** dropdown in header & footer (`Thangaraj City` and all published projects from Firestore). Listens for window custom event `prime-housing:projects-updated` so admin edits refresh navigation live.

---

### `/` — `HomePage.tsx`
- **File**: `src/pages/public/HomePage.tsx`
- **Backend Reads**:
  - `getPublicSiteContent()` → loads hero headline, subtitle, CTA copy, `featuredPropertyIds`, `popularLocationNames`, and office contact info.
  - `getPublishedProperties()` → loads all published listings (`properties` where `published == true`, excluding `entityType === 'project'`).
  - `getFeaturedProperties(featuredPropertyIds)` → prioritizes admin-selected featured IDs or featured flags.
  - `getLatestProperties(3)` → loads newest 3 published properties.
  - `getActiveLocations()` (`src/services/locationService.js`) → reads active cities/corridors (`locations` where `active == true`).
  - `getPublicCategories()` → reads active property categories with `DEFAULT_PROPERTY_CATEGORIES` fallback.
- **Backend Writes**:
  - Quick buyer enquiry via `EnquiryModal.tsx` → calls `createInquiry()` (`src/services/inquiryService.js`) writing to Firestore `inquiries`.
- **Navigation Outputs**: Search bar routes to `/properties` with URL query parameters (`q`, `location`, `type`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, `availability`, `sort`).

---

### `/properties` — `PropertiesPage.tsx`
- **File**: `src/pages/public/PropertiesPage.tsx`
- **Backend Reads**:
  - `getActiveLocations()`, `getPublicCategories()`, `getPublishedProperties()` for dynamic filter dropdowns.
  - `queryProperties(filters)` (`src/services/propertyService.js`) with URL-synced filters (`location`, `propertyType`, `availability`, `minPrice`, `maxPrice`, `minArea`, `maxArea`, `sortBy`, `keyword`, `page`, `pageSize: 6`).
- **Backend Writes**:
  - Buyer enquiry modal (`EnquiryModal.tsx`) → `createInquiry()` writing to `inquiries`.

---

### `/properties/:id` — `PropertyDetailsPage.tsx`
- **File**: `src/pages/public/PropertyDetailsPage.tsx`
- **Backend Reads**:
  - `getPropertyById(id)` (`src/services/propertyService.js`) → fetches single published property from `properties/{id}`.
- **Backend Writes**:
  - Property enquiry form validates `buyerName`, 10-digit `phone` (`isValidPhone()`), optional `email` (`isValidEmail()`), and `message` (min 8 chars).
  - Submits via `createInquiry()` → creates a new document in `inquiries` with `status: 'new'`, `propertyId`, `propertyTitle`, and returns generated `enquiryRef`.

---

### `/projects/:slug` — `ProjectDetailsPage.tsx` & `ProjectDetailsTemplate.tsx`
- **Files**: `src/pages/public/ProjectDetailsPage.tsx`, `src/components/ProjectDetailsTemplate.tsx`
- **Backend Reads**:
  - `getProjectBySlug(slug)` (`src/services/projectService.js`):
    1. Queries `projects` where `status == 'published'` (with fallback to `properties` where `published == true` and `entityType == 'project'`).
    2. Checks `websiteContent/main.projectsCatalogManaged`; if `false` and not overridden in Firestore, serves `INITIAL_THANGARAJ_CITY_PROJECT` (`src/data/initialProjects.ts`).
    3. Direct document lookup fallback on `projects/{slug}` or `properties/project_{slug}`.
  - `getPublicSiteContent()` → supplies fallback office phone, email, and address if not overridden on the project document.
- **Template Sections**:
  - Hero with **Plot View** external CTA (`project.plotViewUrl`, e.g., `https://thangarajcity.velken.land/`).
  - Project Overview (`#about`), At-a-Glance stats (`01`–`04`), **Project Amenities** (`#amenities` rendering editable `project.amenities`), Why Choose split section, Photo Gallery (`#gallery`), Location Advantages & Route Map (`#location`), Documents/Approvals/Brochure (`#documents`), Video Tour, and Project Enquiry (`#enquiry`).
- **Backend Writes**:
  - Project enquiry form validates `name`, 10-digit `phone`, optional `email`, optional `enquiryCategory`, and `message`.
  - Calls `createInquiry()` writing to `inquiries` with `projectId`, `projectName`, `projectSlug`, and `source: 'project-details'`.

---

### `/submit-land` — `SubmitLandPage.tsx`
- **File**: `src/pages/public/SubmitLandPage.tsx`
- **Backend Reads**:
  - `getActiveLocations()` and `getPublicCategories()` populate location and property type selectors.
- **Client Validation**:
  - Validates `ownerName`, 10-digit `phone` (`isValidPhone()`), optional `email`, `location`, `districtTownVillage`, positive `area`, non-negative `expectedPrice`, `description`, `consentGiven === true`, and up to 6 images via `validateStorageFile()` (`JPEG/PNG/WebP`, max `5 MB` each).
- **Backend Writes (`createSellerSubmission()` in `src/services/sellerService.js`)**:
  1. Generates new `sellerSubmissions/{submissionId}` reference.
  2. Uploads each selected image to Firebase Storage at `sellerSubmissions/{submissionId}/{timestamp}_{filename}`.
  3. Writes the submission document **once** via `setDoc()` with `status: 'pending'`, `reviewStatus: 'pending'`, `consentToContact: true`, normalized 10-digit `sellerPhone`, converted `areaSqFt`, and Storage download URLs/paths (matching `firestore.rules` create-only rule for public visitors).

---

### `/about` — `AboutPage.tsx`
- **File**: `src/pages/public/AboutPage.tsx`
- **Backend Reads**:
  - `getPublicSiteContent()` → populates `companyName`, `aboutIntro`, `aboutBackground`, and `aboutServices`.

---

### `/contact` — `ContactPage.tsx`
- **File**: `src/pages/public/ContactPage.tsx`
- **Backend Reads**:
  - `getPublicSiteContent()` → populates office address, phone, email, and hours.
- **Backend Writes**:
  - Validates `name`, 10-digit `phone` (`isValidPhone()`), optional `email`, and `message` (min 10 chars).
  - Calls `createContactMessage()` (`src/services/contactService.js`) → creates document in Firestore `contactMessages` with `status: 'new'`, `source: 'contact-page'`, and `serverTimestamp()`.

---

## 2. Admin Pages & Backend Operations

### Authentication & Guard (`AdminAuthContext.tsx` & `AdminGuard.tsx`)
- **Files**: `src/admin/context/AdminAuthContext.tsx`, `src/components/AdminGuard.tsx`, `src/components/AdminLayout.tsx`
- **How Staff Verification Works**:
  1. `onAuthStateChanged(auth, user)` listens to Firebase Authentication state.
  2. `verifyAdminClaimsAndDoc(user)` refreshes ID token claims (`user.getIdTokenResult(true)`) and checks:
     - Token claims: `claims.admin === true`, `claims.superAdmin === true`, or `claims.role` in `['admin', 'super_admin', 'super-admin', 'editor', 'support']`.
     - Firestore document check: `getDoc(doc(db, 'admins', user.uid))`.
  3. Resolves effective role (`super_admin`, `admin`, `editor`, or `support`). Unauthorized signed-in users are signed out and shown an access denial message.
  4. `AdminGuard` redirects unauthenticated/unauthorized users to `/admin/login` while preserving target path in router state (`location.state.from`).

---

### `/admin/login` — `AdminLoginPage.tsx`
- **File**: `src/pages/admin/AdminLoginPage.tsx`
- **Backend Calls**:
  - Calls `login(email, password)` from `useAdminAuth()` → runs `signInWithEmailAndPassword(auth, email, password)`, verifies claims/admin doc, maps Firebase Auth errors (`auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found`, `auth/too-many-requests`, `auth/unauthorized-domain`, etc.) into readable messages, and redirects to `/admin` (or requested destination).

---

### `/admin` — `AdminDashboardPage.tsx`
- **File**: `src/pages/admin/AdminDashboardPage.tsx`
- **Backend Calls (`getAdminDashboardStats()` in `src/admin/services/adminDashboardService.js`)**:
  - Runs parallel reads across:
    - `properties` (excluding `entityType === 'project'`)
    - `getAllProjectsAdmin()` (`projects` + fallback `properties` projects + un-managed initial `Thangaraj City`)
    - `inquiries` (`orderBy('createdAt', 'desc')`)
    - `sellerSubmissions` (`orderBy('createdAt', 'desc')`)
    - `contactMessages` (`orderBy('createdAt', 'desc')`)
    - `users`
    - `getRecentAdminLogs(15)` (`adminLogs`, `orderBy('createdAt', 'desc')`, `limit(15)`)
  - Computes KPI counts (`totalProjects`, `publishedProjects`, `totalProperties`, `publishedProperties`, `draftProperties`, `soldOutProperties`, `pendingSubmissions`, `approvedSubmissions`, `rejectedSubmissions`, `newEnquiries`, `closedEnquiries`, `contactMessagesCount`, `usersCount`) and returns latest 5 records for quick inspection.

---

### `/admin/submissions` — `AdminSubmissionsPage.tsx`
- **File**: `src/pages/admin/AdminSubmissionsPage.tsx`
- **Backend Reads**:
  - `getAllSubmissionsAdmin()` (`src/admin/services/adminSubmissionService.js`) → fetches all `sellerSubmissions`.
- **Backend Writes**:
  - **Request Clarification / Reject**: `updateSubmissionReviewAdmin(id, reviewStatus, adminNotes)` → updates `reviewStatus`, `status`, `adminNotes`, `reviewedAt` in `sellerSubmissions/{id}` and writes an entry to `adminLogs`.
  - **Approve & Publish as Property**: Opens `PropertyFormModal` pre-filled with submission fields & images → calls `approveSubmissionAndCreatePropertyAdmin()` to create a new document in `properties`, mark the submission `approved`, and log to `adminLogs`.

---

### `/admin/properties` — `AdminPropertiesPage.tsx`
- **File**: `src/pages/admin/AdminPropertiesPage.tsx`
- **Backend Reads**:
  - `getAllPropertiesAdmin()` (`src/admin/services/adminPropertyService.js`) → lists all documents in `properties` (excluding `entityType === 'project'`).
- **Backend Writes**:
  - **Create / Edit (`PropertyFormModal.tsx`)**: `savePropertyAdmin(data, imageFiles)` → uploads new images via `uploadPropertyImage()` to `properties/{propertyId}/...`, deletes removed images via `deleteStorageFile()`, saves to `properties/{id}`, and records audit action in `adminLogs`.
  - **Toggle Featured**: `togglePropertyFeaturedAdmin(propertyId)` → toggles `featured` boolean on `properties/{id}`.
  - **Status Change**: `updatePropertyStatusAdmin(propertyId, nextStatus)` → sets `status` (`'published' | 'draft' | 'sold_out'`) and `published` boolean.
  - **Delete**: `deletePropertyAdmin(propertyId)` → removes Firestore document and associated Storage images, then logs deletion to `adminLogs`.

---

### `/admin/projects` — `AdminProjectsPage.tsx`
- **File**: `src/pages/admin/AdminProjectsPage.tsx`
- **Backend Reads**:
  - `getAllProjectsAdmin()` (`src/admin/services/adminProjectService.js`) → merges `projects` collection, `properties` (`entityType === 'project'`), and initial `Thangaraj City` (unless `projectsCatalogManaged` is true or already persisted).
  - `getAllInquiriesAdmin()` → filters project-linked enquiries (`projectId`, `projectName`, or `enquiryType === 'project'`).
  - `canAdminRolePerformProjectAction(role, project, action)` → checks whether the signed-in role (`super_admin`, `admin`, `editor`, `support`) can `edit`, `media`, `publish`, `delete`, or `manage_permissions` on each project.
- **Backend Writes**:
  - **Create / Edit Project (`ProjectFormModal.tsx`)**:
    - Consolidated multi-tab editor: `1. Basic Info`, `2. Overview`, `3. Highlights & Nearby` (highlights, amenities, location advantages, nearby landmarks), `4. Gallery & Media`, `5. Location & Route Map`, `6. Approvals & Docs`, `7. Video & Contact`, `8. Publish`.
    - Uploads images/PDFs via `uploadProjectAsset()` to `projects/{projectId}/{folderCategory}/...`.
    - Calls `saveProjectAdmin(projectData)` → writes to `projects/{id}` (with fallback sync to `properties/project_{id}` if needed), marks `websiteContent/main.projectsCatalogManaged = true`, dispatches `prime-housing:projects-updated`, and writes to `adminLogs`.
  - **Publish / Unpublish**: `updateProjectStatusAdmin(projectId, nextStatus)` → syncs `status` (`'published' | 'unpublished' | 'draft'`) and `published` boolean in Firestore and dispatches `prime-housing:projects-updated`.
  - **Per-Project Edit Permissions (`ProjectPermissionsModal.tsx`)**: `updateProjectPermissionsAdmin(projectId, editPermissions)` → saves `editPermissions` (`accessMode`, `allowedRoles`, `allowContentEdit`, `allowMediaUpload`, `allowPublishToggle`, `allowDelete`, `restrictedNote`).
  - **Role & Admin Registry Overview (`AdminPermissionsOverviewModal.tsx`)**: Uses `src/admin/services/adminUserService.js` (`getAllAdminsRegistry()`, `upsertAdminRegistryMember()`, `removeAdminRegistryMember()`) to manage staff records in `admins/{uid}` (`super_admin` claim required by `firestore.rules` to create/update/delete `admins` docs).
  - **Delete Project**: `deleteProjectAdmin(projectId)` → deletes project document, cleans up Storage files (`collectStoragePaths`), marks catalog managed, and logs action.

---

### `/admin/enquiries` — `AdminEnquiriesPage.tsx`
- **File**: `src/pages/admin/AdminEnquiriesPage.tsx`
- **Backend Reads**:
  - `getAllInquiriesAdmin()` (`inquiries` collection) + `getAllContactMessagesAdmin()` (`contactMessages` collection), merged and sorted newest-first.
- **Backend Writes**:
  - **Update Status & Follow-up Notes**: `updateInquiryAdmin()` or `updateContactMessageAdmin()` → updates `status` (`New`, `Contacted`, `Follow-up Required`, `Closed`), `adminNotes`, and `updatedAt`, plus logs to `adminLogs`.
  - **Delete**: `deleteInquiryAdmin()` or `deleteContactMessageAdmin()` → deletes document and logs action.

---

### `/admin/locations` — `AdminLocationsPage.tsx`
- **File**: `src/pages/admin/AdminLocationsPage.tsx`
- **Backend Reads**:
  - `getAllLocationsAdmin()` (`locations` collection) & `getAllCategoriesAdmin()` (`categories` / settings).
- **Backend Writes** (`src/admin/services/adminInquiryService.js`):
  - `addLocationAdmin()`, `toggleLocationActiveAdmin()`, `deleteLocationAdmin()`
  - `addCategoryAdmin()`, `toggleCategoryActiveAdmin()`, `deleteCategoryAdmin()`

---

### `/admin/content` — `AdminContentPage.tsx`
- **File**: `src/pages/admin/AdminContentPage.tsx`
- **Backend Reads**:
  - `getPublicSiteContent()`, `getAllLocationsAdmin()`, `getAllPropertiesAdmin()` (filters published listings for featured property picker).
- **Backend Writes**:
  - `updateWebsiteContentAdmin(content)` → saves hero text, company details, social/contact info, about sections, `popularLocationNames`, and `featuredPropertyIds` to `websiteContent/main` (and mirrored settings docs as configured), then logs to `adminLogs`.

---

## 3. Backend Services Directory (`src/services` & `src/admin/services`)

### Public Services (`src/services/`)
| Module | Responsibility |
| :--- | :--- |
| `firebaseUtils.js` | Error normalization (`formatFirebaseError`), phone normalization (`normalizePhone` → 10 digits), ISO date conversion (`toIsoString`), and `mapPropertyDoc`. |
| `propertyService.js` | Public queries on `properties`: `getPublishedProperties`, `getFeaturedProperties`, `getLatestProperties`, `getPropertyById`, `queryProperties`, `matchesPropertyCategory`. |
| `projectService.js` | Public project reads (`getPublishedProjects`, `getProjectBySlug`), `mapProjectDoc`, `normalizeProjectEditPermissions`, `canAdminRolePerformProjectAction`, `isProjectsCatalogManaged`. |
| `publicSiteContent.js` | Loads public CMS copy (`getPublicSiteContent`) and categories (`getPublicCategories`) with defaults (`EMPTY_WEBSITE_CONTENT`, `DEFAULT_PROPERTY_CATEGORIES`). |
| `locationService.js` | Reads active locations (`getActiveLocations`) from `locations`. |
| `inquiryService.js` | Public create-only buyer & project enquiries (`createInquiry`) into `inquiries`. |
| `contactService.js` | Public create-only contact form submissions (`createContactMessage`) into `contactMessages`. |
| `sellerService.js` | Public landowner submissions (`createSellerSubmission`) with Storage uploads into `sellerSubmissions`. |
| `storageService.js` | Firebase Storage validation (`validateStorageFile`, `validateProjectAssetFile`), upload (`uploadPropertyImage`, `uploadSellerSubmissionImage`, `uploadProjectAsset`), and cleanup (`deleteStorageFile`). |
| `contentService.js`, `insightService.js`, `userService.js` | Supporting content, market insights, and user profile readers/helpers. |

### Admin Services (`src/admin/services/`)
| Module | Responsibility |
| :--- | :--- |
| `adminDashboardService.js` | Aggregates dashboard counts, recent properties/submissions/enquiries, and `adminLogs`. |
| `adminPropertyService.js` | Admin CRUD (`getAllPropertiesAdmin`, `savePropertyAdmin`, `updatePropertyStatusAdmin`, `togglePropertyFeaturedAdmin`, `deletePropertyAdmin`). |
| `adminProjectService.js` | Admin CRUD (`getAllProjectsAdmin`, `saveProjectAdmin`, `updateProjectStatusAdmin`, `updateProjectPermissionsAdmin`, `deleteProjectAdmin`). |
| `adminSubmissionService.js` | Landowner submission workflow (`getAllSubmissionsAdmin`, `updateSubmissionReviewAdmin`, `approveSubmissionAndCreatePropertyAdmin`). |
| `adminInquiryService.js` | Enquiry/contact message management, location/category CRUD, and website content updates (`updateWebsiteContentAdmin`). |
| `adminUserService.js` | Role matrix (`ADMIN_ROLE_PERMISSIONS`), `users` listing, and `admins` registry CRUD (`getAllAdminsRegistry`, `upsertAdminRegistryMember`, `removeAdminRegistryMember`). |
| `adminLogService.js` | Immutable audit log writer (`logAdminAction`) and reader (`getRecentAdminLogs`) for `adminLogs`. |

---

## 4. Firebase Auth, Firestore Collections & Security Rules

- **Firebase Project**: `prime-housing-72330` (`src/firebase.js`)
- **Phone Rule (`firestore.rules`)**: All public writes (`inquiries`, `contactMessages`, `sellerSubmissions`) enforce `isValidTenDigitPhone(phone)` (`^[0-9]{10}$`). Client forms normalize `+91` / formatted inputs via `isValidPhone()` and `normalizePhone()`.
- **Firestore Collections Summary**:
  - `projects` — Public read when `status == 'published'` or `published == true`; Admin CRUD (`isAdmin()`).
  - `properties` — Public read when `published == true`; Admin CRUD (`isAdmin()`).
  - `websiteContent` — Public `get` for `site`/`main` or `published == true`; Admin CRUD.
  - `siteSettings` / `settings` — Public `get` for `main` / `content`; Admin CRUD.
  - `locations`, `insights` — Public read when active/published; Admin CRUD.
  - `inquiries`, `contactMessages`, `sellerSubmissions` — Public create-only with strict schema & 10-digit phone checks; Staff read/update/delete (`isStaff()`).
  - `admins` — Staff read; `super_admin` claim required for write/delete.
  - `users` — Self or staff read/write.
  - `adminLogs` — Staff read & create; updates and deletes are explicitly denied (`allow update, delete: if false`).

---

## 5. Firebase Storage Paths & File Validation

Configured in `src/services/storageService.js` using bucket `prime-housing-72330.firebasestorage.app`:

| Asset Type | Storage Path Pattern | Allowed MIME Types & Limits |
| :--- | :--- | :--- |
| Property Listing Images | `properties/{propertyId}/{timestamp}_{filename}` | `image/jpeg`, `image/png`, `image/webp` · max `5 MB` |
| Seller Submission Images | `sellerSubmissions/{submissionId}/{timestamp}_{filename}` | `image/jpeg`, `image/png`, `image/webp` · max `5 MB` |
| Project Images (Hero, Entrance, Site, Gallery, Route Map, QR, Amenities) | `projects/{projectId}/{folderCategory}/{timestamp}_{filename}` *(falls back to `properties/project_{projectId}/...` if `projects/*` rule rejects)* | `image/jpeg`, `image/png`, `image/webp` · max `5 MB` |
| Project Documents (Layout Plan, Key Plan, Brochure, Approvals, Additional PDFs) | `projects/{projectId}/{folderCategory}/{timestamp}_{filename}` | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` · max `15 MB` |

---

## 6. Express Production Server (`server.ts`)

`server.ts` is bundled during `npm run build` into `server.js` (`esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.js`) and launched via `npm start` (`node server.js`):

1. Loads `.env` if present via `import 'dotenv/config'`, sets `app.set('trust proxy', true)` and `app.disable('x-powered-by')`.
2. Binds to `0.0.0.0` using `Number(process.env.PORT) || 3000`.
3. Exposes `/api/health` (`200` JSON) and `/healthz` (`200` `ok`).
4. Serves `dist/` with explicit `Content-Type` headers, `Cache-Control: no-cache` for `.html`, and `public, max-age=31536000, immutable` for fingerprinted `dist/assets/*` files.
5. Sends `dist/index.html` strictly for known React Router public and admin routes; returns HTTP `404` for missing assets, `/src/*`, `/assets/*`, `/api/*` misses, and unknown paths.
