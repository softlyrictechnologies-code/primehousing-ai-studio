# Firebase Connection Documentation

## 1. Project Overview

This project is a React + Vite + TypeScript/JavaScript web application for **Prime Housing** comprising a public real estate property listing portal and a protected administrator management console. All persistent data, authentication, and media storage are connected directly to the live Firebase backend (`prime-housing-72330`) via the modular Firebase Web SDK.

Firebase is integrated for:

- **Firebase Authentication**: Email/password administrator sign-in, session persistence, and custom-claim / `admins/{uid}` authorization verification.
- **Cloud Firestore**: Public read queries (`properties`, `locations`, `insights`, `siteSettings`, `websiteContent`), public write submissions (`inquiries`, `contactMessages`, `sellerSubmissions`), user profile helpers (`users`), and authenticated administrator CRUD + audit logging (`adminLogs`).
- **Firebase Storage**: Direct client-side image uploads (`properties/<propertyId>/...` and `sellerSubmissions/<submissionId>/...`) with MIME type and 5 MB size validation, download URL retrieval, and file deletion.

Relevant project files in this workspace:

- `src/firebase.js`
- `src/services/firebaseUtils.js`
- `src/services/propertyService.js`
- `src/services/sellerService.js`
- `src/services/submissionService.js`
- `src/services/inquiryService.js`
- `src/services/contactService.js`
- `src/services/locationService.js`
- `src/services/insightService.js`
- `src/services/publicSiteContent.js`
- `src/services/contentService.js`
- `src/services/storageService.js`
- `src/services/userService.js`
- `src/admin/context/AdminAuthContext.tsx`
- `src/admin/utils/RequireAdmin.tsx`
- `src/components/AdminGuard.tsx`
- `src/admin/services/adminDashboardService.js`
- `src/admin/services/adminPropertyService.js`
- `src/admin/services/adminSubmissionService.js`
- `src/admin/services/adminInquiryService.js`
- `src/admin/services/adminLogService.js`
- `src/admin/services/adminUserService.js`
- `src/App.tsx`
- `.env.local`
- `.env.example`
- `package.json`
- `public/.htaccess`

---

## 2. Firebase Project Information

The application connects to the existing live Firebase project:

- **Project ID**: `prime-housing-72330`
- **Auth Domain**: `prime-housing-72330.firebaseapp.com`
- **Storage Bucket**: `prime-housing-72330.firebasestorage.app`
- **Messaging Sender ID**: `109727454488`
- **App ID**: `1:109727454488:web:9e5e35eddb61c577343a6d`
- **Measurement ID**: `G-5QC8ZG3WCC`

All environment configurations (`.env.local`, `.env.example`) and runtime fallbacks in `src/firebase.js` target `prime-housing-72330`.

Status: Implemented and verified against live project `prime-housing-72330`.

---

## 3. Firebase Web Configuration

Firebase is initialized once in `src/firebase.js` using the modular Firebase Web SDK (`firebase/app`, `firebase/firestore`, `firebase/auth`, `firebase/storage`).

File: `src/firebase.js`

```js
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || 'AIzaSyAyz1if2QntTkbcXc6cucm3QvlGRxTRxlM',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'prime-housing-72330.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || 'prime-housing-72330',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'prime-housing-72330.firebasestorage.app',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '109727454488',
  appId: getEnv('VITE_FIREBASE_APP_ID') || '1:109727454488:web:9e5e35eddb61c577343a6d',
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || 'G-5QC8ZG3WCC',
};

const existingApps = getApps();
export const app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

Status: Implemented and verified.

---

## 4. Firebase API Key and Public Configuration Reference

The following public client configuration keys are configured in `.env.local` and `.env.example` and resolved via `getEnv(key)` in `src/firebase.js`:

| Key | Value | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | `AIzaSyAyz1if2QntTkbcXc6cucm3QvlGRxTRxlM` | Public Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `prime-housing-72330.firebaseapp.com` | Public auth domain |
| `VITE_FIREBASE_PROJECT_ID` | `prime-housing-72330` | Target Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `prime-housing-72330.firebasestorage.app` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `109727454488` | Public sender ID |
| `VITE_FIREBASE_APP_ID` | `1:109727454488:web:9e5e35eddb61c577343a6d` | Public Firebase Web App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | `G-5QC8ZG3WCC` | Analytics measurement ID |

Security note: A Firebase Web API key is a public client identifier, not an authorization secret. Data protection and write validation are enforced server-side by Firebase Authentication, Firestore Security Rules, and Storage Security Rules on `prime-housing-72330`.

---

## 5. Environment Variables

Root environment files present in this workspace:

- `.env.local` (gitignored via `.gitignore` pattern `.env*`)
- `.env.example` (committed template)

### Public Firebase variables in `.env.local`

```env
VITE_FIREBASE_API_KEY=AIzaSyAyz1if2QntTkbcXc6cucm3QvlGRxTRxlM
VITE_FIREBASE_AUTH_DOMAIN=prime-housing-72330.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=prime-housing-72330
VITE_FIREBASE_STORAGE_BUCKET=prime-housing-72330.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=109727454488
VITE_FIREBASE_APP_ID=1:109727454488:web:9e5e35eddb61c577343a6d
VITE_FIREBASE_MEASUREMENT_ID=G-5QC8ZG3WCC
```

### Non-Firebase placeholder variables in `.env.example`

- `GEMINI_API_KEY="MY_GEMINI_API_KEY"` (template placeholder; no secret stored in `.env.example` or `.env.local`)
- `APP_URL="MY_APP_URL"` (template placeholder)

No Firebase Admin credentials, private keys, service account JSON files, or hardcoded passwords exist anywhere in the repository.

Status: Verified.

---

## 6. Firebase SDK Installation and Dependencies

`package.json` uses the modular Firebase client SDK (`firebase`) only. No `firebase-admin` package is installed or imported.

From `package.json`:

```json
"dependencies": {
  "firebase": "^13.3.0",
  "react": "^19.0.1",
  "react-dom": "^19.0.1",
  "react-router-dom": "^7.18.5"
}
```

Installed resolved version in `node_modules/firebase/package.json`: `13.3.0`.

Status: Installed and verified.

---

## 7. Firebase Initialization

Singleton initialization in `src/firebase.js` prevents duplicate app registration during development or module re-evaluation:

```js
const existingApps = getApps();
export const app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
```

All services (`src/services/*` and `src/admin/services/*`) import `db`, `auth`, and `storage` from `src/firebase.js`. No legacy `localStorage`, `sessionStorage`, `IndexedDB`, or mock seed data stores remain in `src/`.

Status: Implemented and verified.

---

## 8. Firebase Authentication

### Implementation

File: `src/admin/context/AdminAuthContext.tsx`

Uses `firebase/auth` modular APIs:

- `signInWithEmailAndPassword(auth, email, password)`
- `signOut(auth)`
- `onAuthStateChanged(auth, callback)`
- `user.getIdTokenResult(true)` (forces token refresh to read up-to-date custom claims)

### Auth Error Mapping

`mapAuthErrorMessage` maps Firebase Auth error codes cleanly to user-facing messages for:

- `auth/wrong-password` / `auth/invalid-credential`
- `auth/user-not-found`
- `auth/too-many-requests`
- `auth/unauthorized-domain`
- `auth/invalid-email`
- `auth/user-disabled`
- `auth/network-request-failed`

### Public Registration

There is no public sign-up or self-registration UI in this application. Public website visitors browse listings and submit enquiries, contact messages, and land submissions without creating an account. `src/services/userService.js` provides `getUserProfile(uid)` and `upsertUserProfile(uid, profile)` for reading/updating `users/{uid}` when an authenticated user exists.

Status: Implemented and verified (`signInWithEmailAndPassword` verified live against `prime-housing-72330` for negative invalid-credential handling; valid admin sign-in requires interactive admin credentials not stored in code).

---

## 9. Admin Authentication and Route Protection

### Authorization Verification

In `src/admin/context/AdminAuthContext.tsx`, `verifyAdminClaimsAndDoc(user)` enforces administrator authorization before granting admin state:

1. Refreshes ID token (`await user.getIdTokenResult(true)`) and inspects `claims`:
   - `claims.admin === true`
   - `claims.superAdmin === true`
   - `claims.role` in `['admin', 'super_admin', 'super-admin', 'editor', 'support']`
2. Checks Firestore registry document `admins/{user.uid}` via `getDoc(doc(db, 'admins', user.uid))`.
3. If neither custom claims nor an `admins/{uid}` document grants staff/admin access, `AdminAuthContext` immediately calls `signOut(auth)` and rejects access.

### Protected Routes

- `src/App.tsx` wraps the entire router inside `<AdminAuthProvider>`.
- `/admin/login` renders `AdminLoginPage` (`src/pages/admin/AdminLoginPage.tsx`), with no prefilled or hardcoded credentials.
- `/admin/*` routes (`AdminDashboardPage`, `AdminSubmissionsPage`, `AdminPropertiesPage`, `AdminEnquiriesPage`, `AdminLocationsPage`, `AdminContentPage`) are wrapped in `<AdminGuard>`, which delegates to `<RequireAdmin>` (`src/admin/utils/RequireAdmin.tsx`).
- `<RequireAdmin>` shows a verification spinner while `loading` is true and redirects unauthenticated or unauthorized users to `/admin/login`.

Status: Implemented and verified in code and TypeScript build.

---

## 10. Cloud Firestore Configuration

Cloud Firestore is accessed directly via `export const db = getFirestore(app)` in `src/firebase.js`.

- No local `firebase.json`, `firestore.rules`, `firestore.indexes.json`, or Firebase emulator configuration exists inside this frontend repository.
- Firestore security rules and indexes are managed externally on the live `prime-housing-72330` Firebase project.

Status: Connected to live Cloud Firestore on `prime-housing-72330`.

---

## 11. Firestore Collections and Data Structures

### Active Collections Used by the App

| Collection | Access Pattern | Primary Source Files |
|---|---|---|
| `properties` | Public read (`where('published', '==', true)`), Admin full CRUD | `src/services/propertyService.js`, `src/admin/services/adminPropertyService.js`, `src/admin/services/adminDashboardService.js` |
| `sellerSubmissions` | Public create once (`setDoc`), Admin read & review update | `src/services/sellerService.js`, `src/admin/services/adminSubmissionService.js`, `src/admin/services/adminDashboardService.js` |
| `inquiries` | Public create (`addDoc`), Admin read, status/notes update, delete | `src/services/inquiryService.js`, `src/admin/services/adminInquiryService.js`, `src/admin/services/adminDashboardService.js` |
| `contactMessages` | Public create (`addDoc`), Admin read, status/notes update, delete | `src/services/contactService.js`, `src/admin/services/adminInquiryService.js`, `src/admin/services/adminDashboardService.js` |
| `locations` | Public read (`where('active', '==', true)`), Admin read/create/toggle/delete | `src/services/locationService.js`, `src/admin/services/adminInquiryService.js` |
| `insights` | Public read (`where('published', '==', true)`) | `src/services/insightService.js` |
| `siteSettings` | Public read, Admin merge write (`siteSettings/main`) | `src/services/publicSiteContent.js`, `src/admin/services/adminInquiryService.js` |
| `websiteContent` | Public read, Admin merge write (`websiteContent/main`, including `propertyCategories`) | `src/services/publicSiteContent.js`, `src/admin/services/adminInquiryService.js` |
| `settings` | Legacy read fallback (`settings/content`) in `publicSiteContent.js` | `src/services/publicSiteContent.js` |
| `users` | Profile get/upsert (`users/{uid}`), Admin list read | `src/services/userService.js`, `src/admin/services/adminUserService.js`, `src/admin/services/adminDashboardService.js` |
| `admins` | Auth check read (`admins/{uid}`) | `src/admin/context/AdminAuthContext.tsx` |
| `adminLogs` | Admin action audit writes (`addDoc`) and recent log queries | `src/admin/services/adminLogService.js`, `src/admin/services/adminDashboardService.js` |

Note on Property Categories: There is no separate `categories` Firestore collection. Categories are stored in `websiteContent/main.propertyCategories` with `DEFAULT_PROPERTY_CATEGORIES` in `src/services/publicSiteContent.js` used as a read-only fallback when `propertyCategories` is unset.

### Document Field Schemas

- **`properties`**: `title` (12–100 chars, includes letter and space), `propertyRef`, `subTitle`, `description`, `location`, `district`, `town`, `village`, `fullAddress`, `propertyType`, `price`, `priceLakhs`, `pricePerSqFt`, `formattedPrice`, `areaSqFt`, `area`, `areaUnit`, `roadWidth`, `approval`, `approvalNo`, `verified` (boolean), `images`, `imageUrls`, `image`, `storagePaths`, `amenities`, `featured`, `published` (boolean), `isSoldOut` (boolean), `status` (`draft` | `published` | `sold_out`), `coordinates`, `sourceSubmissionId`, `statusChangedBy`, `soldOutAt`, `createdBy`, `createdAt`, `updatedAt`.
- **`sellerSubmissions`**: `title`, `sellerName`, `sellerPhone` (10-digit normalized), `sellerEmail`, `location`, `districtTownVillage`, `propertyType`, `areaSqFt`, `area`, `areaUnit`, `areaValue`, `expectedPrice`, `description`, `roadAccess`, `approvalDetails`, `additionalNotes`, `images`, `storagePaths`, `status` (`pending` | `approved` | `rejected` | `clarification_requested`), `reviewStatus`, `consentToContact`, `adminNotes`, `convertedPropertyId`, `sellerId` (if signed in), `createdAt`, `updatedAt`, `reviewedAt`.
- **`inquiries`**: `name`, `phone` (10-digit normalized), `email`, `address`, `message`, `propertyId`, `propertyTitle`, `source` (`website` | `property-card` | `property-detail`), `status` (`new` | `contacted` | `closed`), `adminNotes`, `createdAt`, `updatedAt`.
- **`contactMessages`**: `name`, `email`, `phone` (10-digit normalized), `subject`, `message`, `status` (`new` | `contacted` | `closed`), `source`, `adminNotes`, `createdAt`, `updatedAt`.
- **`locations`**: `name`, `slug`, `district`, `type` (`District` | `Town` | `Village`), `featured`, `avgPricePerSqft`, `active`, `createdAt`, `updatedAt`.
- **`insights`**: `title`, `excerpt`, `content`, `category`, `image`, `published`, `createdAt`.
- **`adminLogs`**: `action`, `target`, `targetId`, `details`, `adminEmail`, `adminUid`, `createdAt`.

---

## 12. Firestore CRUD Operations

### Public Services (`src/services/`)

- **Properties (`propertyService.js`)**:
  - `getPublishedProperties()` queries `where('published', '==', true)` and maps via `mapPropertyDoc`.
  - `getPropertyById(id)` reads `properties/{id}` and returns `null` if missing or `published !== true`.
  - `getFeaturedProperties(featuredIds)`, `getLatestProperties(limitCount)`, and `queryProperties(filters)` filter, sort, and paginate published listings client-side without requiring composite index changes.
- **Buyer Enquiries (`inquiryService.js`)**:
  - `createInquiry(...)` normalizes the phone number via `normalizePhone()` and writes once via `addDoc(collection(db, 'inquiries'), ...)` with `status: 'new'` and `serverTimestamp()`.
- **Contact Messages (`contactService.js`)**:
  - `createContactMessage(...)` normalizes the phone number via `normalizePhone()` and writes once via `addDoc(collection(db, 'contactMessages'), ...)`.
- **Seller Submissions (`sellerService.js` & `submissionService.js`)**:
  - `createSellerSubmission(input, imageFiles, onProgress)` generates a Firestore doc ID (`doc(collection(db, 'sellerSubmissions'))`), uploads each image file to Storage under `sellerSubmissions/<submissionId>/...`, normalizes `sellerPhone` via `normalizePhone()`, and writes the Firestore document once with `setDoc` (since public visitors have create-only permission and cannot update after creation).
- **Locations, Insights, Site Content (`locationService.js`, `insightService.js`, `publicSiteContent.js`)**:
  - `getActiveLocations()` queries `where('active', '==', true)`.
  - `getPublishedInsights()` queries `where('published', '==', true)`.
  - `getPublicSiteContent()` and `getPublicCategories()` read `siteSettings`, `websiteContent`, and legacy `settings/content`.

### Admin Services (`src/admin/services/`)

- **Properties (`adminPropertyService.js`)**: `getAllPropertiesAdmin()`, `savePropertyAdmin()`, `updatePropertyStatusAdmin()`, `togglePropertyFeaturedAdmin()`, `deletePropertyAdmin()`. Enforces `validatePublishRequirements` before transitioning a listing to published (`title` 12–100 chars with letter+space, non-empty `location`, `areaSqFt > 0`, `price > 0`, at least one uploaded image URL, `approval` containing `Approved`/`Verified`/`Registered`, and `verified === true`). Deletes removed/deleted Storage files via `deleteStorageFile()` and logs actions via `logAdminAction()`.
- **Submissions (`adminSubmissionService.js`)**: `getAllSubmissionsAdmin()`, `updateSubmissionReviewAdmin()`, `approveSubmissionAndCreatePropertyAdmin()`. Approving a submission always creates a **`draft`** property listing (`status: 'draft'`, `sourceSubmissionId`) rather than auto-publishing.
- **Enquiries, Contact Messages, Locations, Categories & CMS (`adminInquiryService.js`)**: CRUD methods for `inquiries`, `contactMessages`, `locations`, `websiteContent/main` (including `propertyCategories`), and `siteSettings/main`, each recording an entry in `adminLogs`.
- **Dashboard & Logs (`adminDashboardService.js`, `adminLogService.js`, `adminUserService.js`)**: Aggregates collection counts, recent items, and recent `adminLogs` entries.

### Error Handling

`formatFirebaseError(error, contextLabel, collectionName)` in `src/services/firebaseUtils.js` surfaces permission and network failures explicitly (for example, `Missing or insufficient permissions on "<collection>".`) without silently falling back to local storage or mock data.

---

## 13. Firestore Security Rules Behavior

Firestore rules are enforced server-side on `prime-housing-72330` (not edited or deployed by this project). Observed live rule behavior during testing:

- **Public reads**: Allowed on `properties` (`where('published', '==', true)`), `locations` (`where('active', '==', true)`), `insights` (`where('published', '==', true)`), `siteSettings`, and `websiteContent`.
- **Public creates**:
  - `inquiries`: Allowed when required fields and **10-digit phone number** (`normalizePhone` strips `+91` / leading `0` / spaces/dashes) match server validation rules. Formatted numbers such as `+91 90000 00000` are rejected by rules with `permission-denied` unless normalized to 10 digits.
  - `sellerSubmissions`: Allowed with **10-digit phone number**, `status: 'pending'`, `reviewStatus: 'pending'`, and `consentToContact: true`.
  - `contactMessages`: Allowed for unauthenticated public submissions.
- **Public deletes**: Blocked with `permission-denied` across `inquiries`, `contactMessages`, and `sellerSubmissions`.

---

## 14. Firebase Storage Configuration

Firebase Storage is initialized in `src/firebase.js`:

```js
export const storage = getStorage(app);
```

Configured Storage bucket: `prime-housing-72330.firebasestorage.app`.

---

## 15. Image Upload and Management

File: `src/services/storageService.js`

Uses `ref`, `uploadBytesResumable`, `getDownloadURL`, and `deleteObject` from `firebase/storage`:

- **Validation (`validateStorageFile`)**:
  - `ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']`
  - `MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024` (5 MB)
- **Property image uploads (`uploadPropertyImage`)**:
  - Storage path: `properties/${propertyId}/${Date.now()}_${safeFileName}`
- **Seller submission image uploads (`uploadSellerSubmissionImage`)**:
  - Storage path: `sellerSubmissions/${submissionId}/${Date.now()}_${safeFileName}`
- **Deletion (`deleteStorageFile`)**:
  - Accepts either a Storage path or a Firebase Storage HTTPS download URL (`/o/<encodedPath>`), parses the object path, and calls `deleteObject`.

Status: Implemented and verified (`uploadSellerSubmissionImage` tested live against `prime-housing-72330.firebasestorage.app`).

---

## 16. Storage Security Rules Behavior

Storage rules are enforced server-side on `prime-housing-72330`.

- Public `sellerSubmissions/<submissionId>/...` image upload and `getDownloadURL()` succeeded live with a `image/png` file under 5 MB.
- Admin property image uploads (`properties/<propertyId>/...`) and deletions require authenticated admin/staff permissions per server rules.

---

## 17. Data Mapping & Frontend Architecture

- `mapPropertyDoc(docSnap)` in `src/services/firebaseUtils.js` normalizes Firestore `properties` documents (`images`/`imageUrls`/`image`, `amenities`/`features`, `roadWidth`/`roadAccess`, `approval`/`approvalDetails`, `coordinates`, `published`/`isSoldOut`/`status`, `Timestamp` fields via `toIsoString`) into the TypeScript `Property` interface (`src/types/realEstate.ts`).
- `normalizePhone(rawPhone)` in `src/services/firebaseUtils.js` normalizes user-entered phone strings (stripping formatting and optional `+91` or leading `0` prefixes to 10 digits) before writing to `inquiries`, `sellerSubmissions`, and `contactMessages`.
- No custom backend server or Cloud Functions exist in this repository; all Firebase communication occurs directly from the browser via the modular Firebase Web SDK.

---

## 18. Project Folder Structure

```text
.
├── .env.example
├── .env.local
├── .gitignore
├── firebase_connection.md
├── index.html
├── metadata.json
├── package.json
├── public/
│   └── .htaccess
├── src/
│   ├── App.tsx
│   ├── firebase.js
│   ├── index.css
│   ├── main.tsx
│   ├── admin/
│   │   ├── context/AdminAuthContext.tsx
│   │   ├── services/
│   │   │   ├── adminDashboardService.js
│   │   │   ├── adminInquiryService.js
│   │   │   ├── adminLogService.js
│   │   │   ├── adminPropertyService.js
│   │   │   ├── adminSubmissionService.js
│   │   │   └── adminUserService.js
│   │   └── utils/RequireAdmin.tsx
│   ├── assets/
│   │   ├── media.ts
│   │   └── images/
│   ├── components/
│   │   ├── AdminGuard.tsx
│   │   ├── AdminLayout.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── EnquiryModal.tsx
│   │   ├── PropertyCard.tsx
│   │   ├── PropertyFormModal.tsx
│   │   ├── PublicLayout.tsx
│   │   └── ResilientImage.tsx
│   ├── pages/
│   │   ├── admin/
│   │   │   ├── AdminContentPage.tsx
│   │   │   ├── AdminDashboardPage.tsx
│   │   │   ├── AdminEnquiriesPage.tsx
│   │   │   ├── AdminLocationsPage.tsx
│   │   │   ├── AdminLoginPage.tsx
│   │   │   ├── AdminPropertiesPage.tsx
│   │   │   └── AdminSubmissionsPage.tsx
│   │   └── public/
│   │       ├── AboutPage.tsx
│   │       ├── ContactPage.tsx
│   │       ├── HomePage.tsx
│   │       ├── PropertiesPage.tsx
│   │       ├── PropertyDetailsPage.tsx
│   │       └── SubmitLandPage.tsx
│   ├── services/
│   │   ├── contactService.js
│   │   ├── contentService.js
│   │   ├── firebaseUtils.js
│   │   ├── inquiryService.js
│   │   ├── insightService.js
│   │   ├── locationService.js
│   │   ├── propertyService.js
│   │   ├── publicSiteContent.js
│   │   ├── sellerService.js
│   │   ├── storageService.js
│   │   ├── submissionService.js
│   │   └── userService.js
│   ├── types/realEstate.ts
│   └── utils/formatters.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 19. Important Firebase Source Files

| File | Role |
|---|---|
| `src/firebase.js` | Singleton Firebase App, Firestore, Auth, and Storage initialization |
| `src/services/firebaseUtils.js` | `toIsoString`, `normalizePhone`, `formatFirebaseError`, `mapPropertyDoc` |
| `src/services/propertyService.js` | Public `properties` queries and client-side filtering/pagination |
| `src/services/sellerService.js` | Landowner submission workflow (Storage upload + single `setDoc` write) |
| `src/services/inquiryService.js` | Public buyer enquiry creation in `inquiries` |
| `src/services/contactService.js` | Public contact form creation in `contactMessages` |
| `src/services/locationService.js` | Active `locations` reads |
| `src/services/insightService.js` | Published `insights` reads |
| `src/services/publicSiteContent.js` | Reads `siteSettings`, `websiteContent`, and fallback categories |
| `src/services/storageService.js` | File validation, resumable Storage uploads, download URLs, deletes |
| `src/services/userService.js` | `users/{uid}` read and upsert helpers |
| `src/admin/context/AdminAuthContext.tsx` | Admin email/password sign-in, `onAuthStateChanged`, claims & `admins/{uid}` check |
| `src/admin/utils/RequireAdmin.tsx` | Route guard redirecting unauthorized sessions to `/admin/login` |
| `src/admin/services/adminPropertyService.js` | Admin property CRUD, publish validation gate, Storage cleanup |
| `src/admin/services/adminSubmissionService.js` | Admin submission review & draft property conversion |
| `src/admin/services/adminInquiryService.js` | Admin CRUD for `inquiries`, `contactMessages`, `locations`, `websiteContent`, `siteSettings` |
| `src/admin/services/adminDashboardService.js` | Admin KPI stats and recent activity aggregation |
| `src/admin/services/adminLogService.js` | Audit log writes and reads on `adminLogs` |
| `src/admin/services/adminUserService.js` | Admin read of `users` collection |

---

## 20. Build & Static Hosting Configuration

The project builds to a pure static SPA bundle (`dist/`) suitable for Hostinger Apache/HTML static hosting with zero Node.js server dependency after build:

- `npm run build` (`vite build`) produces `dist/index.html`, `dist/.htaccess`, and hashed bundles in `dist/assets/`.
- `public/.htaccess` is copied directly to `dist/.htaccess` to rewrite non-file SPA routes (e.g., `/properties/...`, `/admin/...`) to `/index.html`.
- `npm run lint` (`tsc --noEmit`) validates TypeScript and JSDoc-checked JavaScript modules cleanly.

---

## 21. Live Firebase Connection Verification Results

Live end-to-end tests were executed directly against `prime-housing-72330` using the project's Firebase Web SDK services (`npx tsx` verification run, temporary test script removed after completion):

### Verified Passing Operations

- **Public Reads**:
  - `getPublishedProperties()` (`properties` where `published == true`): **Passed** (`count=1`, fetched `sample-property-1`)
  - `getPropertyById('sample-property-1')`: **Passed** (`title="Sample 3BHK Apartment"`)
  - `getActiveLocations()` (`locations` where `active == true`): **Passed** (`count=1`)
  - `getPublishedInsights()` (`insights` where `published == true`): **Passed** (`count=4`)
  - `getPublicSiteContent()` (`siteSettings` / `websiteContent`): **Passed** (`companyName="Prime Housing"`, `contactPhone="+91 98400 40327"`)
  - `getPublicCategories()`: **Passed** (`count=5`)
- **Public Writes & Storage Upload**:
  - `createInquiry(...)` -> `inquiries`: **Passed** (created doc `YnfvOZUz38kDPu8fWwf6`)
  - `createContactMessage(...)` -> `contactMessages`: **Passed** (created doc `fnJvaedCip4X8ySYWhoW`)
  - `createSellerSubmission(...)` with 1x1 PNG `File` -> Firebase Storage `sellerSubmissions/<id>/...` + Firestore `sellerSubmissions`: **Passed** (created doc `zRF7dKBRSRyXtCWVGSbF`)
- **Security Rule Enforcement**:
  - Anonymous `deleteDoc` cleanup attempts on `inquiries`, `contactMessages`, and `sellerSubmissions` all returned `permission-denied` (`7 PERMISSION_DENIED`), confirming live Firestore security rules block unauthenticated deletes.
- **Firebase Auth Check**:
  - `signInWithEmailAndPassword` with a non-existent test credential returned `auth/invalid-credential` cleanly.

### Not Executed (Requires Live Admin Credentials)

- Authenticated Admin Dashboard, Property CRUD, Submission Review/Approval, Enquiry/Contact Update/Delete, Location CRUD, Website Content update, `adminLogs` write/read, and `users` read tests were **not executed** because no admin email/password credentials exist in the codebase or were supplied.

### Build & Lint Verification

- `npm run build` (`vite build`): **Passed**.
- `npm run lint` (`tsc --noEmit`): **Passed** with 0 errors.

---

## 22. Existing Configuration Status & Recommendations

| Service / Capability | Status |
|---|---|
| Firebase Web SDK (`firebase` 13.3.0) | Implemented and verified |
| Public Firestore Reads (`properties`, `locations`, `insights`, `siteSettings`, `websiteContent`) | Live-tested and verified |
| Public Firestore Writes (`inquiries`, `contactMessages`, `sellerSubmissions`) | Live-tested and verified |
| Firebase Storage Seller Image Upload | Live-tested and verified |
| Firebase Auth Error Handling (`signInWithEmailAndPassword`) | Live-tested (negative credential check) and verified |
| Admin Auth Guard & Claims/Registry Check | Implemented and type-checked; runtime login requires live admin account |
| Admin Firestore CRUD & `adminLogs` | Implemented and type-checked; runtime execution requires signed-in admin |
| Static Production Build (`dist/` + `.htaccess`) | Built and verified (`vite build`, `tsc --noEmit`) |

### Operational Notes & Recommendations

1. Keep Firestore and Storage rules enforced on `prime-housing-72330`; ensure any future admin accounts have the required Firebase custom claim (`admin: true` / `superAdmin: true` / `role`) or an `admins/{uid}` document.
2. Remove the three `[TEST]` verification records created during live smoke testing (`inquiries/YnfvOZUz38kDPu8fWwf6`, `contactMessages/fnJvaedCip4X8ySYWhoW`, `sellerSubmissions/zRF7dKBRSRyXtCWVGSbF` plus diagnostic test docs) from the Admin Console once signed in.
3. No Firebase Realtime Database, Firebase Cloud Messaging, or public user sign-up UI is configured in this codebase.
