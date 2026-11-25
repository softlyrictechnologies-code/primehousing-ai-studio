import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { formatFirebaseError } from './firebaseUtils';

const SITE_SETTINGS_COLLECTION = 'siteSettings';
const WEBSITE_CONTENT_COLLECTION = 'websiteContent';

export const EMPTY_WEBSITE_CONTENT = {
  companyName: '',
  tagline: '',
  heroHeadline: '',
  heroSubheadline: '',
  aboutIntro: '',
  aboutBackground: '',
  aboutServices: [],
  aboutValues: [],
  whyChooseUs: [],
  contactAddress: '',
  contactPhone: '',
  contactEmail: '',
  officeHours: '',
  popularLocationNames: [],
  featuredPropertyIds: [],
};

export const DEFAULT_PROPERTY_CATEGORIES = [
  {
    id: 'cat-residential',
    name: 'Residential Land',
    description: 'Surveyed plots zoned for single-family homes and private estates.',
    active: true,
  },
  {
    id: 'cat-estate',
    name: 'Estate & Villa',
    description: 'Established countryside residences with expansive private grounds.',
    active: true,
  },
  {
    id: 'cat-agricultural',
    name: 'Agricultural Land',
    description: 'Fertile terraced acreage suitable for orchards, vineyards, or farming.',
    active: true,
  },
  {
    id: 'cat-waterfront',
    name: 'Waterfront Plot',
    description: 'Lakefront and river-bordering parcels with shoreline frontage.',
    active: true,
  },
  {
    id: 'cat-commercial',
    name: 'Commercial Plot',
    description: 'Cleared arterial and corner parcels zoned for retail or mixed-use.',
    active: true,
  },
  {
    id: 'cat-joint-venture',
    name: 'Joint Venture Plot',
    description: 'Prime development parcels open for builder partnerships and joint development.',
    active: true,
  },
];

function pickNonEmptyString(...values) {
  for (const val of values) {
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }
  return '';
}

function buildWhyChooseUsFromSite(siteData) {
  const featurePairs = [
    [siteData.aboutFeatureOneTitle, siteData.aboutFeatureOneNote],
    [siteData.aboutFeatureTwoTitle, siteData.aboutFeatureTwoNote],
    [siteData.aboutFeatureThreeTitle, siteData.aboutFeatureThreeNote],
    [siteData.aboutFeatureFourTitle, siteData.aboutFeatureFourNote],
  ]
    .filter(([title]) => typeof title === 'string' && title.trim().length > 0)
    .map(([title, description]) => ({
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : '',
    }));

  if (featurePairs.length > 0) return featurePairs;

  return [
    siteData.whyPointOne,
    siteData.whyPointTwo,
    siteData.whyPointThree,
    siteData.whyPointFour,
    siteData.whyPointFive,
    siteData.whyPointSix,
  ]
    .filter((point) => typeof point === 'string' && point.trim().length > 0)
    .map((point) => ({
      title: point.trim(),
      description: '',
    }));
}

function buildAboutServicesFromSite(siteData) {
  return [
    siteData.aboutServiceOne,
    siteData.aboutServiceTwo,
    siteData.aboutServiceThree,
  ]
    .filter((svc) => typeof svc === 'string' && svc.trim().length > 0)
    .map((svc) => ({
      title: svc.trim(),
      description: '',
    }));
}

function isPermissionError(error) {
  const code = error?.code || '';
  const message = String(error?.message || '').toLowerCase();
  return code === 'permission-denied' || message.includes('insufficient permissions');
}

export async function getPublicSiteContent() {
  let contentPermissionError = null;

  const readDocSafely = async (docRef, trackContentError = false) => {
    try {
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() || {} : null;
    } catch (error) {
      if (trackContentError && isPermissionError(error)) {
        contentPermissionError = error;
      }
      return null;
    }
  };

  try {
    const [mainData, siteData, settingsMainData, legacyData] = await Promise.all([
      readDocSafely(doc(db, WEBSITE_CONTENT_COLLECTION, 'main'), true),
      readDocSafely(doc(db, WEBSITE_CONTENT_COLLECTION, 'site'), true),
      readDocSafely(doc(db, SITE_SETTINGS_COLLECTION, 'main')),
      readDocSafely(doc(db, 'settings', 'content')),
    ]);

    let publishedContentData = {};
    if (!mainData && !siteData && !contentPermissionError) {
      try {
        const publishedSnap = await getDocs(
          query(collection(db, WEBSITE_CONTENT_COLLECTION), where('published', '==', true))
        );
        publishedContentData = publishedSnap.docs.reduce((acc, docSnap) => {
          const data = docSnap.data();
          return data && typeof data === 'object' ? { ...acc, ...data } : acc;
        }, {});
      } catch (error) {
        if (isPermissionError(error)) {
          contentPermissionError = error;
        }
      }
    }

    if (!mainData && !siteData && !settingsMainData && !legacyData && Object.keys(publishedContentData).length === 0 && contentPermissionError) {
      throw contentPermissionError;
    }

    const main = mainData || {};
    const site = { ...publishedContentData, ...(siteData || {}) };
    const settings = settingsMainData || {};
    const legacy = legacyData || {};

    const resolvedAboutIntro = pickNonEmptyString(
      main.aboutIntro,
      main.aboutText,
      site.aboutIntro,
      site.aboutText,
      site.intro,
      site.aboutDescription,
      legacy.aboutIntro
    );

    const resolvedAboutBackground = pickNonEmptyString(
      main.aboutBackground,
      site.aboutBackground,
      site.aboutDescription && site.aboutDescription.trim() !== resolvedAboutIntro
        ? site.aboutDescription
        : '',
      legacy.aboutBackground
    );

    const mainWhyChooseUs = Array.isArray(main.whyChooseUs) && main.whyChooseUs.length > 0
      ? main.whyChooseUs
      : null;
    const siteWhyChooseUs = Array.isArray(site.whyChooseUs) && site.whyChooseUs.length > 0
      ? site.whyChooseUs
      : buildWhyChooseUsFromSite(site);

    const mainAboutServices = Array.isArray(main.aboutServices) && main.aboutServices.length > 0
      ? main.aboutServices
      : null;
    const siteAboutServices = Array.isArray(site.aboutServices) && site.aboutServices.length > 0
      ? site.aboutServices
      : buildAboutServicesFromSite(site);

    const mainAboutValues = Array.isArray(main.aboutValues) && main.aboutValues.length > 0
      ? main.aboutValues
      : null;
    const siteAboutValues = Array.isArray(site.aboutValues) && site.aboutValues.length > 0
      ? site.aboutValues
      : [];

    const popularLocations =
      Array.isArray(main.popularLocationNames) && main.popularLocationNames.length > 0
        ? main.popularLocationNames
        : Array.isArray(site.popularLocationNames)
          ? site.popularLocationNames
          : [];

    const featuredIds =
      Array.isArray(main.featuredPropertyIds) && main.featuredPropertyIds.length > 0
        ? main.featuredPropertyIds
        : Array.isArray(site.featuredPropertyIds)
          ? site.featuredPropertyIds
          : [];

    const propertyCategories =
      Array.isArray(main.propertyCategories) && main.propertyCategories.length > 0
        ? main.propertyCategories
        : Array.isArray(site.propertyCategories) && site.propertyCategories.length > 0
          ? site.propertyCategories
          : null;

    const hasExplicitMainTagline =
      mainData !== null && Object.prototype.hasOwnProperty.call(main, 'tagline');

    const resolvedTagline = hasExplicitMainTagline
      ? pickNonEmptyString(settings.tagline, settings.trustLine, main.tagline, main.trustLine)
      : pickNonEmptyString(
          settings.tagline,
          settings.trustLine,
          main.tagline,
          main.trustLine,
          site.tagline,
          site.trustLine,
          site.heroEyebrow,
          legacy.tagline
        );

    return {
      companyName: pickNonEmptyString(
        settings.companyName,
        settings.siteName,
        settings.brandName,
        main.companyName,
        main.siteName,
        site.companyName,
        site.siteName,
        legacy.companyName
      ),
      tagline: resolvedTagline,
      heroHeadline: pickNonEmptyString(
        main.heroHeadline,
        main.heroTitle,
        settings.heroHeadline,
        settings.heroTitle,
        site.heroHeadline,
        site.heroTitle,
        legacy.heroHeadline,
        legacy.heroTitle
      ),
      heroSubheadline: pickNonEmptyString(
        main.heroSubheadline,
        main.heroSubtitle,
        main.heroValueProposition,
        settings.heroSubheadline,
        settings.heroSubtitle,
        site.heroSubheadline,
        site.heroSubtitle,
        site.heroValueProposition,
        site.heroDescription,
        legacy.heroSubheadline,
        legacy.heroSubtitle
      ),
      aboutIntro: resolvedAboutIntro,
      aboutBackground: resolvedAboutBackground,
      aboutServices: mainAboutServices || siteAboutServices,
      aboutValues: mainAboutValues || siteAboutValues,
      whyChooseUs: mainWhyChooseUs || siteWhyChooseUs,
      contactAddress: pickNonEmptyString(
        settings.contactAddress,
        settings.address,
        main.contactAddress,
        main.address,
        site.contactAddress,
        site.address,
        site.location,
        legacy.contactAddress
      ),
      contactPhone: pickNonEmptyString(
        settings.contactPhone,
        settings.phone,
        main.contactPhone,
        main.phone,
        site.contactPhone,
        site.phone,
        legacy.contactPhone
      ),
      contactEmail: pickNonEmptyString(
        settings.contactEmail,
        settings.email,
        main.contactEmail,
        main.email,
        site.contactEmail,
        site.email,
        legacy.contactEmail
      ),
      officeHours: pickNonEmptyString(
        settings.officeHours,
        settings.workingHours,
        main.officeHours,
        main.workingHours,
        site.officeHours,
        site.workingHours,
        legacy.officeHours
      ),
      popularLocationNames: popularLocations,
      featuredPropertyIds: featuredIds,
      propertyCategories,
    };
  } catch (error) {
    throw formatFirebaseError(error, 'getPublicSiteContent', WEBSITE_CONTENT_COLLECTION);
  }
}

export async function getPublicCategories() {
  try {
    const siteContent = await getPublicSiteContent();
    const list =
      Array.isArray(siteContent.propertyCategories) && siteContent.propertyCategories.length > 0
        ? siteContent.propertyCategories
        : DEFAULT_PROPERTY_CATEGORIES;
    return list.filter((c) => c && c.active !== false);
  } catch (error) {
    console.warn('[getPublicCategories] Falling back to default categories:', error?.message || error);
    return DEFAULT_PROPERTY_CATEGORIES;
  }
}
