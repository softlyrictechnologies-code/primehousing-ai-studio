import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, Mail, Search, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DEFAULT_PROPERTY_CATEGORIES,
  EMPTY_WEBSITE_CONTENT,
  getPublicCategories,
  getPublicSiteContent,
} from '../../services/publicSiteContent';
import {
  getFeaturedProperties,
  getLatestProperties,
  getPublishedProperties,
  matchesPropertyCategory,
} from '../../services/propertyService';
import { getActiveLocations } from '../../services/locationService';
import { ASSET_IMAGES } from '../../assets/media';
import type { CategoryOption, LocationOption, Property, WebsiteContent } from '../../types/realEstate';
import { PropertyCard } from '../../components/PropertyCard';
import { EnquiryModal } from '../../components/EnquiryModal';
import { ResilientImage } from '../../components/ResilientImage';

export function HomePage() {
  const navigate = useNavigate();
  const [content, setContent] = useState<WebsiteContent>(EMPTY_WEBSITE_CONTENT);
  const [allPublished, setAllPublished] = useState<Property[]>([]);
  const [featured, setFeatured] = useState<Property[]>([]);
  const [latest, setLatest] = useState<Property[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [enquireProperty, setEnquireProperty] = useState<Property | null>(null);

  // Search Bar state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchLocation, setSearchLocation] = useState('all');
  const [searchType, setSearchType] = useState('all');
  const [searchMinPrice, setSearchMinPrice] = useState('');
  const [searchMaxPrice, setSearchMaxPrice] = useState('');
  const [searchMinArea, setSearchMinArea] = useState('');
  const [searchMaxArea, setSearchMaxArea] = useState('');
  const [searchAvailability, setSearchAvailability] = useState('all_public');
  const [searchSort, setSearchSort] = useState('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    const brandName =
      !content.companyName || /^(prime housing|verdeland estates?)$/i.test(content.companyName.trim())
        ? 'PRIME HOUSING'
        : content.companyName;
    document.title = `${brandName} — Verified Land & Property Listings`;
  }, [content.companyName]);

  useEffect(() => {
    let active = true;
    const loadAll = async () => {
      let wc = EMPTY_WEBSITE_CONTENT;
      try {
        wc = await getPublicSiteContent();
        if (active) setContent(wc);
      } catch (err) {
        console.error('[HomePage:websiteContent]', err);
      }

      const [pubRes, featRes, latRes, locsRes, catsRes] = await Promise.allSettled([
        getPublishedProperties(),
        getFeaturedProperties(wc.featuredPropertyIds),
        getLatestProperties(3),
        getActiveLocations(),
        getPublicCategories(),
      ]);

      if (!active) return;

      if (pubRes.status === 'fulfilled') {
        setAllPublished(pubRes.value);
      }
      if (featRes.status === 'fulfilled') {
        setFeatured(featRes.value);
      }
      if (latRes.status === 'fulfilled') {
        setLatest(latRes.value);
      }
      if (locsRes.status === 'fulfilled') {
        setLocations(locsRes.value);
      }
      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value);
      } else {
        setCategories(DEFAULT_PROPERTY_CATEGORIES);
      }

      if (featRes.status === 'rejected' && latRes.status === 'rejected') {
        setLoadError(
          featRes.reason instanceof Error
            ? featRes.reason.message
            : 'Unable to load listings from Firebase.'
        );
      }

      setLoading(false);
    };
    loadAll();
    return () => {
      active = false;
    };
  }, []);

  const locationOptions = useMemo(() => {
    const map = new Map<string, { name: string; label: string }>();
    locations.forEach((loc) => {
      if (loc.name) {
        map.set(loc.name.toLowerCase(), {
          name: loc.name,
          label: loc.district && loc.district !== loc.name ? `${loc.name} (${loc.district})` : loc.name,
        });
      }
    });
    allPublished.forEach((p) => {
      const locName = (p.location || p.district || '').trim();
      if (locName && !map.has(locName.toLowerCase())) {
        map.set(locName.toLowerCase(), { name: locName, label: locName });
      }
    });
    return Array.from(map.values());
  }, [locations, allPublished]);

  const popularLocationsList = useMemo(() => {
    if (content.popularLocationNames.length > 0) {
      return content.popularLocationNames;
    }
    return locationOptions.map((o) => o.name);
  }, [content.popularLocationNames, locationOptions]);

  const countPlotsForLocation = (locName: string) => {
    const q = locName.toLowerCase();
    return allPublished.filter(
      (p) =>
        p.location.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.town.toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q)
    ).length;
  };

  const countPlotsForCategory = (catName: string) =>
    allPublished.filter((p) => matchesPropertyCategory(p.propertyType, catName)).length;

  const applyBudgetPreset = (min: string, max: string) => {
    setSearchMinPrice(min);
    setSearchMaxPrice(max);
  };

  const handleHeroSearch = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchKeyword.trim()) params.set('q', searchKeyword.trim());
    if (searchLocation !== 'all') params.set('location', searchLocation);
    if (searchType !== 'all') params.set('type', searchType);
    if (searchMinPrice.trim()) params.set('minPrice', searchMinPrice.trim());
    if (searchMaxPrice.trim()) params.set('maxPrice', searchMaxPrice.trim());
    if (searchMinArea.trim()) params.set('minArea', searchMinArea.trim());
    if (searchMaxArea.trim()) params.set('maxArea', searchMaxArea.trim());
    if (searchAvailability !== 'all_public') params.set('availability', searchAvailability);
    if (searchSort !== 'newest') params.set('sort', searchSort);
    navigate(`/properties${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-[#1D0816] text-white overflow-hidden">
        <div className="absolute inset-0">
          <ResilientImage
            src={ASSET_IMAGES.heroEstateImg}
            alt="Panoramic view of verified green estate land"
            loading="eager"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1D0816]/90 via-[#1D0816]/55 to-[#1D0816]/40" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            {content.tagline && (
              <p className="text-xs font-medium tracking-wide text-[#F2DCE8] mb-3">
                {content.tagline}
              </p>
            )}
            {content.heroHeadline && (
              <h1
                className="font-display font-medium text-white tracking-tight leading-[1.1] mb-5"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.75rem)', textWrap: 'balance' }}
              >
                {content.heroHeadline}
              </h1>
            )}
            {content.heroSubheadline && (
              <p className="text-base sm:text-lg text-[#EAE1E6] leading-relaxed max-w-2xl mb-8">
                {content.heroSubheadline}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-[#1D0816] bg-white hover:bg-[#F7E8F1] rounded-lg transition-colors"
              >
                <span>Explore Properties</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/submit-land"
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white border border-white/40 hover:bg-white/10 rounded-lg transition-colors"
              >
                <span>Sell Your Plots</span>
              </Link>
            </div>
          </div>

          {/* Prominent Property Search Bar */}
          <form
            onSubmit={handleHeroSearch}
            className="mt-12 bg-white text-[#1C1F1E] rounded-xl p-4 sm:p-5 shadow-xl border border-[#EAE1E6] space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
              <div className="lg:col-span-4">
                <label className="block text-xs font-medium text-[#646B67] mb-1.5">
                  Keyword, Locality or Ref ID
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#646B67] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Place, neighbourhood, plot or Ref ID..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
              </div>

              <div className="lg:col-span-3">
                <label className="block text-xs font-medium text-[#646B67] mb-1.5">
                  Location / District
                </label>
                <select
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                >
                  <option value="all">All Locations</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-[#646B67] mb-1.5">
                  Property Category
                </label>
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((prev) => !prev)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-[#1C1F1E] bg-[#FAF8F9] hover:bg-[#F7E8F1] border border-[#EAE1E6] rounded-lg transition-colors h-[42px] shrink-0"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#9B0B5E]" />
                  <span>Filters</span>
                  {showAdvancedFilters ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg transition-colors h-[42px] whitespace-nowrap"
                >
                  <Search className="w-4 h-4" />
                  <span>Search Listings</span>
                </button>
              </div>
            </div>

            {showAdvancedFilters && (
              <div className="pt-4 border-t border-[#EAE1E6] space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#646B67] mb-1">
                      Min Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100000"
                      placeholder="e.g. 1500000"
                      value={searchMinPrice}
                      onChange={(e) => setSearchMinPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#646B67] mb-1">
                      Max Price (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100000"
                      placeholder="e.g. 25000000"
                      value={searchMaxPrice}
                      onChange={(e) => setSearchMaxPrice(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#646B67] mb-1">
                      Min Size (Sq. Ft.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="e.g. 600"
                      value={searchMinArea}
                      onChange={(e) => setSearchMinArea(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#646B67] mb-1">
                      Max Size (Sq. Ft.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="e.g. 10000"
                      value={searchMaxArea}
                      onChange={(e) => setSearchMaxArea(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#646B67] mb-1">
                      Availability
                    </label>
                    <select
                      value={searchAvailability}
                      onChange={(e) => setSearchAvailability(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                    >
                      <option value="all_public">All Listings</option>
                      <option value="published">Available Only</option>
                      <option value="sold">Sold Properties</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#646B67] mb-1">
                      Sort By
                    </label>
                    <select
                      value={searchSort}
                      onChange={(e) => setSearchSort(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                    >
                      <option value="newest">Newest Listed</option>
                      <option value="featured">Featured First</option>
                      <option value="price_asc">Lowest Price</option>
                      <option value="price_desc">Highest Price</option>
                      <option value="area_asc">Size: Small to Large</option>
                      <option value="area_desc">Size: Large to Small</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#646B67] font-medium">Quick Budget:</span>
                  {[
                    { label: 'Any', min: '', max: '' },
                    { label: 'Up to ₹50L', min: '', max: '5000000' },
                    { label: '₹50L – ₹1Cr', min: '5000000', max: '10000000' },
                    { label: '₹1Cr – ₹2Cr', min: '10000000', max: '20000000' },
                    { label: '₹2Cr+', min: '20000000', max: '' },
                  ].map((preset) => {
                    const active = searchMinPrice === preset.min && searchMaxPrice === preset.max;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyBudgetPreset(preset.min, preset.max)}
                        className={`px-2.5 py-1 rounded-md border transition-colors ${
                          active
                            ? 'bg-[#9B0B5E] text-white border-[#9B0B5E]'
                            : 'bg-[#FAF8F9] text-[#3D4340] border-[#EAE1E6] hover:border-[#9B0B5E]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Featured Property Listings */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">Curated Portfolio</p>
            <h2 className="font-display text-3xl font-medium text-[#1C1F1E] tracking-tight">
              Featured Properties
            </h2>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9B0B5E] hover:underline whitespace-nowrap"
          >
            <span>Browse all listings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loadError ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-sm text-red-700">
            {loadError}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-[380px] rounded-xl bg-white border border-[#EAE1E6] animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="p-8 bg-white border border-[#EAE1E6] rounded-xl text-center text-sm text-[#646B67]">
            Featured listings are currently being updated. View our full property catalogue below.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEnquire={setEnquireProperty}
              />
            ))}
          </div>
        )}
      </section>

      {/* Popular Locations & Property Categories */}
      <section className="bg-white border-y border-[#EAE1E6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">Regional Coverage</p>
            <h2 className="font-display text-3xl font-medium text-[#1C1F1E] tracking-tight mb-4">
              Popular Locations
            </h2>
            <p className="text-sm text-[#646B67] leading-relaxed mb-6">
              Explore verified land parcels and private estates across our primary advisory districts and growth corridors.
            </p>
            <div className="divide-y divide-[#EAE1E6] border-y border-[#EAE1E6]">
              {popularLocationsList.map((locName) => {
                const locMeta = locations.find((l) => l.name === locName);
                const plotCount = countPlotsForLocation(locName);
                return (
                  <Link
                    key={locName}
                    to={`/properties?location=${encodeURIComponent(locName)}`}
                    className="flex items-center justify-between py-3.5 text-sm group"
                  >
                    <span className="flex items-center gap-2.5 font-medium text-[#1C1F1E] group-hover:text-[#9B0B5E] transition-colors">
                      <MapPin className="w-4 h-4 text-[#9B0B5E]/70" />
                      <span>{locName}</span>
                      {locMeta && locMeta.district !== locName && (
                        <span className="text-xs font-normal text-[#646B67]">
                          · {locMeta.district}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-2 text-xs text-[#646B67] tabular-nums">
                      <span>
                        {plotCount} {plotCount === 1 ? 'Plot' : 'Plots'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-[#646B67] group-hover:text-[#9B0B5E] transition-colors" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">Land Classifications</p>
            <h2 className="font-display text-3xl font-medium text-[#1C1F1E] tracking-tight mb-4">
              Property Categories
            </h2>
            <p className="text-sm text-[#646B67] leading-relaxed mb-6">
              Filter directly by zoning classification and intended land use.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => {
                const catCount = countPlotsForCategory(cat.name);
                return (
                  <Link
                    key={cat.id}
                    to={`/properties?type=${encodeURIComponent(cat.name)}`}
                    className="p-5 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] hover:border-[#9B0B5E] transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-base font-semibold text-[#1C1F1E] group-hover:text-[#9B0B5E]">
                        {cat.name}
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#646B67] tabular-nums">
                        <span>{catCount}</span>
                        <ArrowRight className="w-4 h-4 text-[#646B67] group-hover:text-[#9B0B5E]" />
                      </span>
                    </div>
                    <p className="text-xs text-[#646B67] leading-relaxed">{cat.description}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Latest Properties */}
      <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">Recently Published</p>
            <h2 className="font-display text-3xl font-medium text-[#1C1F1E] tracking-tight">
              Latest Verified Listings
            </h2>
          </div>
          <Link
            to="/properties?sort=newest"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#9B0B5E] hover:underline whitespace-nowrap"
          >
            <span>See newest additions</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {latest.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onEnquire={setEnquireProperty}
            />
          ))}
        </div>
      </section>

      {/* About & Why Choose Us */}
      <section className="bg-white border-t border-[#EAE1E6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch mb-16">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-[#9B0B5E] mb-2">About {content.companyName}</p>
              <h2 className="font-display text-3xl font-medium text-[#1C1F1E] tracking-tight mb-4">
                Built on verified deeds, clear boundaries, and direct counsel.
              </h2>
              <p className="text-base text-[#3D4340] leading-relaxed mb-4">
                {content.aboutIntro}
              </p>
              <p className="text-sm text-[#646B67] leading-relaxed mb-6">
                {content.aboutBackground}
              </p>
              <div>
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg transition-colors"
                >
                  <span>Read Our Story</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="lg:col-span-6 rounded-xl overflow-hidden border border-[#EAE1E6]">
              <ResilientImage
                src={ASSET_IMAGES.aboutOfficeImg}
                alt="PRIME HOUSING Advisory Studio"
                className="w-full h-full min-h-[320px] object-cover"
              />
            </div>
          </div>

          <div className="pt-12 border-t border-[#EAE1E6]">
            <h3 className="font-display text-2xl font-medium text-[#1C1F1E] mb-8">
              Why Landowners &amp; Buyers Choose Us
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {content.whyChooseUs.map((item) => (
                <div key={item.title} className="p-5 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6]">
                  <h4 className="text-sm font-semibold text-[#1C1F1E] mb-2">{item.title}</h4>
                  <p className="text-xs text-[#646B67] leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Landowner CTA Banner */}
      <section className="bg-[#9B0B5E] text-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#E7BBD4] mb-2">For Property &amp; Land Owners</p>
            <h2 className="font-display text-3xl font-medium tracking-tight mb-3">
              Submit your land for verification and private buyer placement.
            </h2>
            <p className="text-sm text-[#F5E6EF] leading-relaxed">
              Share your parcel details, location, and supporting documentation privately with our review desk. Approved listings are presented cleanly to serious buyers without exposing your personal contact details publicly.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            <Link
              to="/submit-land"
              className="px-6 py-3 text-sm font-medium text-[#9B0B5E] bg-white hover:bg-[#F7E8F1] rounded-lg transition-colors whitespace-nowrap"
            >
              Sell Your Plots
            </Link>
            <Link
              to="/contact"
              className="px-6 py-3 text-sm font-medium text-white border border-white/30 hover:bg-white/10 rounded-lg transition-colors whitespace-nowrap"
            >
              Contact Our Team
            </Link>
          </div>
        </div>
      </section>

      {/* Direct Contact Strip */}
      <section className="bg-[#FAF8F9] border-t border-[#EAE1E6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="font-display text-xl font-medium text-[#1C1F1E]">
              Speak with an Estates Advisor
            </h3>
            <p className="text-sm text-[#646B67] mt-1">{content.contactAddress}</p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm text-[#1C1F1E]">
            <a
              href={`tel:${content.contactPhone}`}
              className="inline-flex items-center gap-2 font-medium hover:text-[#9B0B5E]"
            >
              <Phone className="w-4 h-4 text-[#9B0B5E]" />
              <span>{content.contactPhone}</span>
            </a>
            <a
              href={`mailto:${content.contactEmail}`}
              className="inline-flex items-center gap-2 font-medium hover:text-[#9B0B5E]"
            >
              <Mail className="w-4 h-4 text-[#9B0B5E]" />
              <span>{content.contactEmail}</span>
            </a>
          </div>
        </div>
      </section>

      <EnquiryModal property={enquireProperty} onClose={() => setEnquireProperty(null)} />
    </div>
  );
}
