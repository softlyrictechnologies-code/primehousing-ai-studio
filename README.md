# PRIME HOUSING & PROPERTIES

Verified real estate property listing, project showcase, landowner submission, buyer enquiry, and admin management web application built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Express**, and **Firebase** (`prime-housing-72330`).

---

## Table of Contents

- [Routes Reference](#routes-reference)
  - [Public Website Routes](#public-website-routes)
  - [Admin Portal Routes](#admin-portal-routes)
  - [Express Server & API Routes](#express-server--api-routes)
- [Project Architecture & Directory Structure](#project-architecture--directory-structure)
- [Firebase Backend & Security Rules](#firebase-backend--security-rules)
- [Role-Based & Per-Project Permissions](#role-based--per-project-permissions)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Deployment Configurations](#deployment-configurations)

---

## Routes Reference

### Public Website Routes

All public routes are wrapped in `src/components/PublicLayout.tsx` (shared header navigation, footer, and `SocialSidebar`).

| Path | Page Component | Purpose & Key Features |
| :--- | :--- | :--- |
| `/` | `src/pages/public/HomePage.tsx` | Landing page featuring hero showcase, featured verified properties, featured projects (including `Thangaraj City`), market insights, and advisory overview. |
| `/properties` | `src/pages/public/PropertiesPage.tsx` | Searchable and filterable catalog of published residential, commercial, agricultural, and waterfront listings. |
| `/properties/:id` | `src/pages/public/PropertyDetailsPage.tsx` | Detailed view for a single property listing with media gallery, pricing/dimensions, highlights, and direct buyer enquiry form. |
| `/projects/:slug` | `src/pages/public/ProjectDetailsPage.tsx` (`ProjectDetailsTemplate.tsx`) | Dynamic layout project page (e.g., `/projects/thangaraj-city`) featuring hero with Plot View CTA, Project Overview, At-a-Glance metrics, Project Amenities, Why Choose section, Gallery, Location Advantages & Route Map, Approvals/Documents/Brochure, and Project Enquiry form. |
| `/submit-land` | `src/pages/public/SubmitLandPage.tsx` | Landowner submission form with 10-digit phone validation and contact consent; stores submissions in Firestore `sellerSubmissions`. |
| `/about` | `src/pages/public/AboutPage.tsx` | Brand overview, verification methodology, and real estate consultancy background. |
| `/contact` | `src/pages/public/ContactPage.tsx` | Office contact details and visitor message form writing to Firestore `contactMessages`. |
| `*` | `<Navigate to="/" replace />` | Unknown routes inside React Router redirect cleanly to `/`. |

---

### Admin Portal Routes

Protected `/admin/*` routes are wrapped in `src/components/AdminGuard.tsx` and `src/components/AdminLayout.tsx`, backed by `src/admin/context/AdminAuthContext.tsx`.

| Path | Page Component | Purpose & Key Features |
| :--- | :--- | :--- |
| `/admin/login` | `src/pages/admin/AdminLoginPage.tsx` | Staff/Admin sign-in page using Firebase Authentication (`email` & `password`). |
| `/admin` | `src/pages/admin/AdminDashboardPage.tsx` | Admin summary dashboard displaying counts and status metrics for properties, projects, landowner submissions, enquiries, and recent logs. |
| `/admin/submissions` | `src/pages/admin/AdminSubmissionsPage.tsx` | Review, approve, reject, or convert landowner submissions (`sellerSubmissions`) into property listings. |
| `/admin/properties` | `src/pages/admin/AdminPropertiesPage.tsx` | Create, edit, publish/unpublish, and delete property listings via `PropertyFormModal.tsx`. |
| `/admin/projects` | `src/pages/admin/AdminProjectsPage.tsx` | Manage dynamic layout projects (`ProjectFormModal.tsx`), upload project images/PDFs to Firebase Storage, toggle publish status, and configure per-project/role edit permissions (`ProjectPermissionsModal.tsx`, `AdminPermissionsOverviewModal.tsx`). |
| `/admin/enquiries` | `src/pages/admin/AdminEnquiriesPage.tsx` | View, update status, and manage buyer property/project enquiries (`inquiries`) and visitor contact messages (`contactMessages`). |
| `/admin/locations` | `src/pages/admin/AdminLocationsPage.tsx` | Create, edit, activate/deactivate, and manage target locations (`locations`). |
| `/admin/content` | `src/pages/admin/AdminContentPage.tsx` | Manage CMS copy, hero banners, and site settings (`websiteContent`, `siteSettings`, `settings`). |

---

### Express Server & API Routes

Defined in `server.ts` (compiled to `server.js` by `esbuild` during `npm run build`):

| Route / Pattern | Method | Response & Behavior |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Returns `200 OK` JSON `{ "status": "ok" }`. |
| `/healthz` | `GET` | Returns `200 OK` plain response `ok` for container/hosting health checks. |
| `/assets/*` (existing files in `dist/assets/`) | `GET` | Serves compiled JS, CSS, and media with explicit MIME types and `Cache-Control: public, max-age=31536000, immutable`. |
| `/favicon.ico`, `/favicon.svg` | `GET` | Serves Prime Housing icons from `dist/` with `image/x-icon` / `image/svg+xml`. |
| Valid frontend SPA routes (`/`, `/properties`, `/properties/:id`, `/projects/:slug`, `/submit-land`, `/about`, `/contact`, `/admin`, `/admin/login`, `/admin/submissions`, `/admin/properties`, `/admin/projects`, `/admin/enquiries`, `/admin/locations`, `/admin/content`) | `GET` / `HEAD` | Serves `dist/index.html` with `Content-Type: text/html; charset=utf-8` and `Cache-Control: no-cache`. |
| `/api/*` misses, `/assets/*` misses, `/src/*`, any file extension (`.js`, `.ts`, `.tsx`, `.css`, `.png`, `.ico`, `.woff2`, etc.), or unknown paths | Any | Returns `HTTP 404` (`Not found`) — never returns `index.html` for missing assets. |

---

## Project Architecture & Directory Structure

```text
.
├── .github/workflows/
│   └── deploy.yml                  # GitHub Pages static build & deploy workflow
├── public/
│   ├── .htaccess                   # Apache/LiteSpeed MIME & SPA rewrite rules (excludes assets)
│   ├── CNAME                       # Custom domain entry (primehousing.co.in)
│   ├── favicon.ico                 # Prime Housing ICO favicon
│   ├── favicon.svg                 # Prime Housing SVG favicon
│   └── assets/aistudio/            # Bundled static project images
├── src/
│   ├── admin/
│   │   ├── context/                # AdminAuthContext.tsx (Firebase Auth + admin role resolution)
│   │   ├── services/               # Admin CRUD & audit logging services
│   │   └── utils/                  # Admin helper utilities
│   ├── assets/                     # Bundled local images imported by components
│   ├── components/                 # Shared UI, guards, modals, ProjectDetailsTemplate, ProjectFormModal
│   ├── data/
│   │   └── initialProjects.ts      # Initial Thangaraj City project template data
│   ├── pages/
│   │   ├── admin/                  # Admin dashboard & management pages
│   │   └── public/                 # Public pages
│   ├── services/                   # Public Firestore, Auth, and Firebase Storage services
│   ├── types/
│   │   └── realEstate.ts           # TypeScript interfaces for Property, Project, Permissions, Enquiries
│   ├── utils/
│   │   └── formatters.ts           # Price, area, slug, and 10-digit phone validation helpers
│   ├── App.tsx                     # React Router route tree
│   ├── firebase.js                 # Firebase App, Firestore, Auth, and Storage initialization
│   ├── index.css                   # Tailwind CSS v4 entry & theme styles
│   └── main.tsx                    # React 19 createRoot entry
├── firestore.rules                 # Cloud Firestore security rules
├── index.html                      # Vite HTML entry point with favicon & metadata
├── metadata.json                   # AI Studio applet metadata
├── package.json                    # Scripts, dependencies, and Node engine (>=22.12.0)
├── server.ts                       # Production Express server for dist/ & health endpoints
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite 8 build, alias (@ -> .), and preview configuration
```

---

## Firebase Backend & Security Rules

- **Firebase Project ID**: `prime-housing-72330`
- **Auth Domain**: `prime-housing-72330.firebaseapp.com`
- **Storage Bucket**: `prime-housing-72330.firebasestorage.app`

### Firestore Collections (`firestore.rules`)

| Collection | Public Access | Staff / Admin Access | Notes |
| :--- | :--- | :--- | :--- |
| `projects` | Read where `status == 'published'` or `published == true` | Full CRUD (`isAdmin()`) | Dynamic projects (e.g., `Thangaraj City`), amenities, gallery, documents, and `editPermissions`. |
| `properties` | Read where `published == true` | Full CRUD (`isAdmin()`) | Verified property listings and fallback project docs (`entityType == 'project'`). |
| `websiteContent` | Get `site` / `main` or `published == true` | Full CRUD (`isAdmin()`) | Homepage & site-wide CMS copy (`projectsCatalogManaged`, etc.). |
| `siteSettings` / `settings` | Get `main` / `content` | Full CRUD (`isAdmin()`) | Global configuration documents. |
| `locations` | Read where `active == true` | Full CRUD (`isAdmin()`) | Managed cities and corridors. |
| `insights` | Read where `published == true` | Full CRUD (`isAdmin()`) | Market articles and insights. |
| `inquiries` | Create-only (`name`, 10-digit `phone`, `status == 'new'`) | Read, Update, Delete (`isStaff()`) | Buyer property and project enquiries. |
| `contactMessages` | Create-only (`name`, 10-digit `phone`, `message`, `status == 'new'`) | Read, Update, Delete (`isStaff()`) | Contact page submissions. |
| `sellerSubmissions` | Create-only (`sellerName`, 10-digit `sellerPhone`, `status == 'pending'`, `reviewStatus == 'pending'`, `consentToContact == true`) | Read, Update, Delete (`isStaff()`) | Landowner property submissions. |
| `admins` | None | Get/List (`isStaff()`), Write (`super_admin` claim only) | Registered staff directory and roles. |
| `users` | Read/Write own UID | Read/Write (`isStaff()`) | Authenticated user profiles. |
| `adminLogs` | None | Read & Create (`isStaff()`), immutable | Admin audit trail (updates/deletes blocked). |

---

## Role-Based & Per-Project Permissions

Managed in `src/services/projectService.js`, `src/admin/services/adminUserService.js`, `ProjectPermissionsModal.tsx`, and `AdminPermissionsOverviewModal.tsx`:

- **Supported Roles**: `super_admin`, `admin`, `editor`, `support`
- **Per-Project `editPermissions`**:
  - `accessMode`: `'all_admins'` | `'custom_roles'` | `'super_admin_only'`
  - `allowedRoles`: Array of permitted roles
  - Granular toggles: `allowContentEdit`, `allowMediaUpload`, `allowPublishToggle`, `allowDelete`
  - `restrictedNote`: Optional restriction note shown in the Admin Projects workspace

---

## Environment Variables

Configure public web variables in `.env.local` (development), Hostinger Environment Variables, or GitHub Actions build environment (see `.env.example`):

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `PORT` | Server | Port bound by `server.ts` on `0.0.0.0` (defaults to `3000`). |
| `NODE_ENV` | Server | Set to `production` in deployed Node.js environments. |
| `APP_URL` | Server | Public domain URL (e.g., `https://primehousing.co.in`). |
| `VITE_FIREBASE_API_KEY` | Client (build-time) | Firebase Web API key. |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client (build-time) | Firebase Auth domain (`prime-housing-72330.firebaseapp.com`). |
| `VITE_FIREBASE_PROJECT_ID` | Client (build-time) | Firebase project ID (`prime-housing-72330`). |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client (build-time) | Firebase Storage bucket (`prime-housing-72330.firebasestorage.app`). |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Client (build-time) | Firebase Cloud Messaging sender ID. |
| `VITE_FIREBASE_APP_ID` | Client (build-time) | Firebase Web App ID. |
| `VITE_FIREBASE_MEASUREMENT_ID` | Client (build-time) | Google Analytics / Firebase Measurement ID. |

> **Important**: Add `primehousing.co.in` and `www.primehousing.co.in` under **Firebase Console → Authentication → Settings → Authorized domains** so Admin login works on your custom domain.

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite development server on port `3000` (`0.0.0.0`). |
| `npm run build` | Builds client bundle into `dist/` via `vite build` and bundles `server.ts` into `server.js` via `esbuild`. |
| `npm start` | Runs production Express server (`node server.js`). |
| `npm run preview` | Starts Vite preview server on `0.0.0.0`. |
| `npm run lint` | Runs TypeScript type-checking (`tsc --noEmit`). |
| `npm run clean` | Removes `dist/` and `server.js`. |

---

## Deployment Configurations

### 1. Hostinger Node.js Web App
- **Node.js Version**: `>= 22.12.0` (Node 22 LTS recommended)
- **Install Command**: `npm ci`
- **Build Command**: `npm run build` (outputs `dist/` and `server.js`)
- **Start Command**: `npm start` (executes `node server.js`, listening on `0.0.0.0:$PORT`)

### 2. GitHub Pages (Static Site)
- Configured in `.github/workflows/deploy.yml` (runs on pushes to `main` and manual `workflow_dispatch`):
  - Runs `npm ci` → `npx vite build` → `cp dist/index.html dist/404.html` → uploads `dist/` artifact → deploys via `actions/deploy-pages@v4`.
- Custom domain `primehousing.co.in` is configured in `public/CNAME` (copied to `dist/CNAME` on build).
