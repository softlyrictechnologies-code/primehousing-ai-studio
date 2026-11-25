export type PropertyStatus = 'draft' | 'published' | 'sold' | 'unavailable';

export type AreaUnit = 'Acres' | 'Sq. Ft.' | 'Perches' | 'Hectares';

export type SubmissionReviewStatus =
  | 'pending'
  | 'clarification_requested'
  | 'approved'
  | 'rejected';

export type EnquiryStatus = 'New' | 'Contacted' | 'Follow-up Required' | 'Closed';

export interface Property {
  id: string;
  title: string;
  propertyRef: string;
  description: string;
  propertyType: string;
  location: string;
  district: string;
  town: string;
  village: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  area: number;
  areaUnit: AreaUnit;
  price: number;
  images: string[];
  features: string[];
  roadAccess: string;
  approvalDetails: string;
  isFeatured: boolean;
  verified?: boolean;
  sourceSubmissionId?: string;
  status: PropertyStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LandownerSubmission {
  id: string;
  submissionRef: string;
  ownerName: string;
  phone: string;
  email: string;
  location: string;
  districtTownVillage: string;
  propertyType: string;
  area: number;
  areaUnit: AreaUnit;
  expectedPrice: number;
  description: string;
  roadAccess: string;
  approvalDetails: string;
  images: string[];
  additionalNotes: string;
  consentGiven: boolean;
  reviewStatus: SubmissionReviewStatus;
  adminNotes: string;
  submittedAt: string;
  reviewedAt: string | null;
  convertedPropertyId?: string;
}

export interface BuyerEnquiry {
  id: string;
  enquiryRef: string;
  buyerName: string;
  phone: string;
  email: string;
  propertyId: string | null;
  propertyTitle: string;
  projectId?: string | null;
  projectName?: string;
  projectSlug?: string;
  enquiryCategory?: string;
  enquiryType: 'property' | 'project' | 'general';
  message: string;
  enquiryStatus: EnquiryStatus;
  followUpNotes: string;
  createdAt: string;
  updatedAt: string;
  isContactMessage?: boolean;
}

export interface LocationOption {
  id: string;
  name: string;
  district: string;
  type: 'District' | 'Town' | 'Village';
  active: boolean;
}

export interface CategoryOption {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

export interface ContentBlock {
  title: string;
  description: string;
}

export interface WebsiteContent {
  companyName: string;
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  aboutIntro: string;
  aboutBackground: string;
  aboutServices: ContentBlock[];
  aboutValues: ContentBlock[];
  whyChooseUs: ContentBlock[];
  contactAddress: string;
  contactPhone: string;
  contactEmail: string;
  officeHours: string;
  popularLocationNames: string[];
  featuredPropertyIds: string[];
}

export interface ActivityLogItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
}

export interface PropertyQueryFilters {
  location?: string;
  propertyType?: string;
  availability?: 'all_public' | 'published' | 'sold';
  minPrice?: number;
  maxPrice?: number;
  minArea?: number;
  maxArea?: number;
  sortBy?: 'newest' | 'oldest' | 'featured' | 'price_asc' | 'price_desc' | 'area_asc' | 'area_desc';
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface DashboardStats {
  totalProperties: number;
  publishedProperties: number;
  draftProperties: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  newEnquiries: number;
  closedEnquiries: number;
  totalProjects?: number;
  publishedProjects?: number;
}

// Dynamic Project Management System Types
export type ProjectStatus = 'draft' | 'published' | 'unpublished';

export interface ProjectImageAsset {
  id?: string;
  url: string;
  storagePath?: string;
  caption?: string;
  altText?: string;
  title?: string;
  description?: string;
  visible?: boolean;
  featured?: boolean;
}

export interface ProjectDocumentAsset {
  id: string;
  name: string;
  description?: string;
  url: string;
  storagePath?: string;
  fileType?: string;
  visible: boolean;
}

export interface ProjectOverviewBlock {
  id: string;
  heading?: string;
  text: string;
}

export interface ProjectHighlight {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface ProjectAmenity {
  id: string;
  name: string;
  description: string;
  icon: string;
  imageUrl?: string;
  storagePath?: string;
}

export interface ProjectLocationAdvantage {
  id: string;
  name: string;
  category: string;
  travelTime: string;
  description: string;
  googleMapsUrl?: string;
}

export interface ProjectNearbyPlace {
  id: string;
  name: string;
  distanceOrTime: string;
  notes?: string;
}

export interface ProjectNearbyPlaces {
  schools: ProjectNearbyPlace[];
  colleges: ProjectNearbyPlace[];
  hospitals: ProjectNearbyPlace[];
  shoppingCentres: ProjectNearbyPlace[];
  supermarkets: ProjectNearbyPlace[];
  railwayStations: ProjectNearbyPlace[];
  busTerminals: ProjectNearbyPlace[];
  landmarks: ProjectNearbyPlace[];
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  category: string;
  location: string;
  address: string;
  shortDescription: string;
  fullDescription: string;
  propertyType: string;
  approvalType: string;
  approvalNumber: string;
  reraNumber: string;
  projectStatusLabel: string;
  status: ProjectStatus;
  startingPrice: string;
  pricePerSqFt: string;
  totalPlots: string;
  availablePlots: string;
  plotSizes: string;
  plotAvailabilityNote: string;
  specialOffers: string;
  pricingDescription: string;
  overviewHeading: string;
  overviewSubheading: string;
  overviewParagraphs: ProjectOverviewBlock[];
  whyChooseItems: ProjectHighlight[];
  highlights: ProjectHighlight[];
  amenities: ProjectAmenity[];
  locationAdvantages: ProjectLocationAdvantage[];
  nearbyPlaces: ProjectNearbyPlaces;
  images: {
    heroImage: ProjectImageAsset | null;
    entranceImage: ProjectImageAsset | null;
    siteImage1: ProjectImageAsset | null;
    siteImage2: ProjectImageAsset | null;
    gallery: ProjectImageAsset[];
  };
  routeMap: {
    image: ProjectImageAsset | null;
    qrCode: ProjectImageAsset | null;
    googleMapsUrl: string;
    address: string;
    locationDescription: string;
  };
  documents: {
    layoutPlan: ProjectDocumentAsset | null;
    keyPlan: ProjectDocumentAsset | null;
    brochure: ProjectDocumentAsset | null;
    approvalDocuments: ProjectDocumentAsset[];
    additionalPdfs: ProjectDocumentAsset[];
  };
  seo: {
    title: string;
    metaDescription: string;
    slug: string;
    ogImage: string;
    ogImageAlt: string;
  };
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  plotViewUrl?: string;
  editPermissions?: ProjectEditPermissions;
  createdAt: string;
  updatedAt: string;
  isInitialSeed?: boolean;
}

export type AdminRoleKey = 'super_admin' | 'admin' | 'editor' | 'support';

export type ProjectEditAccessMode = 'all_admins' | 'custom_roles' | 'super_admin_only';

export interface ProjectEditPermissions {
  accessMode: ProjectEditAccessMode;
  allowedRoles: AdminRoleKey[];
  allowContentEdit: boolean;
  allowMediaUpload: boolean;
  allowPublishToggle: boolean;
  allowDelete: boolean;
  restrictedNote?: string;
}

export interface AdminRegistryMember {
  uid: string;
  email: string;
  name: string;
  role: AdminRoleKey;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}


