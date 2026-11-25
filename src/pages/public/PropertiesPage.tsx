import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw, Search, X } from 'lucide-react';
import { getPublishedProperties, queryProperties } from '../../services/propertyService';
import { getActiveLocations } from '../../services/locationService';
import { getPublicCategories } from '../../services/publicSiteContent';
import type {
  CategoryOption,
  LocationOption,
  PaginatedResult,
  Property,
  PropertyQueryFilters,
} from '../../types/realEstate';
import { PropertyCard } from '../../components/PropertyCard';
import { EnquiryModal } from '../../components/EnquiryModal';
import { formatCurrency } from '../../utils/formatters';

export function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [allPublished, setAllPublished] = useState<Property[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [result, setResult] = useState<PaginatedResult<Property>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 6,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enquireProperty, setEnquireProperty] = useState<Property | null>(null);

  // Filter values synced with URL query parameters
  const locationFilter = searchParams.get('location') || 'all';
  const typeFilter = searchParams.get('type') || 'all';
  const availabilityFilter =
    (searchParams.get('availability') as PropertyQueryFilters['availability']) || 'all_public';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const minArea = searchParams.get('minArea') || '';
  const maxArea = searchParams.get('maxArea') || '';
  const sortBy = (searchParams.get('sort') as PropertyQueryFilters['sortBy']) || 'newest';
  const keyword = searchParams.get('q') || '';
  const page = Math.max(1, Number(searchParams.get('page') || '1'));

  useEffect(() => {
    document.title = 'Properties Catalogue — PRIME HOUSING';
  }, []);

  useEffect(() => {
    Promise.all([getActiveLocations(), getPublicCategories(), getPublishedProperties()])
      .then(([locs, cats, props]) => {
        setLocations(locs);
        setCategories(cats);
        setAllPublished(props);
      })
      .catch((err) => {
        console.error('[PropertiesPage:filters]', err);
      });
  }, []);

  const locationOptions = useMemo(() => {
    const map = new Map<string, { name: string; label: string }>();
    locations.forEach((loc) => {
      if (loc.name) {
        map.set(loc.name.toLowerCase(), {
          name: loc.name,
          label: loc.district && loc.district !== loc.name ? `${loc.name} · ${loc.district}` : loc.name,
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

  useEffect(() => {
    let active = true;
    const runQuery = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await queryProperties({
          location: locationFilter,
          propertyType: typeFilter,
          availability: availabilityFilter,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          minArea: minArea ? Number(minArea) : undefined,
          maxArea: maxArea ? Number(maxArea) : undefined,
          sortBy,
          search: keyword,
          page,
          pageSize: 6,
        });
        if (active) setResult(res);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load property listings. Please refresh and try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    runQuery();
    return () => {
      active = false;
    };
  }, [
    locationFilter,
    typeFilter,
    availabilityFilter,
    minPrice,
    maxPrice,
    minArea,
    maxArea,
    sortBy,
    keyword,
    page,
  ]);

  const updateParam = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all' || (key === 'availability' && value === 'all_public')) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (resetPage && key !== 'page') {
      next.delete('page');
    }
    setSearchParams(next);
  };

  const updateMultipleParams = (updates: Record<string, string>, resetPage = true) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === 'all' || (key === 'availability' && value === 'all_public')) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    if (resetPage) {
      next.delete('page');
    }
    setSearchParams(next);
  };

  const resetAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Array.from(searchParams.keys()).some((k) => k !== 'page');

  const activeFilterChips = [
    keyword ? { key: 'q', label: `Keyword: ${keyword}` } : null,
    locationFilter !== 'all' ? { key: 'location', label: `Location: ${locationFilter}` } : null,
    typeFilter !== 'all' ? { key: 'type', label: `Category: ${typeFilter}` } : null,
    availabilityFilter !== 'all_public'
      ? {
          key: 'availability',
          label: availabilityFilter === 'published' ? 'Available Only' : 'Sold Properties',
        }
      : null,
    minPrice ? { key: 'minPrice', label: `Min: ${formatCurrency(Number(minPrice))}` } : null,
    maxPrice ? { key: 'maxPrice', label: `Max: ${formatCurrency(Number(maxPrice))}` } : null,
    minArea ? { key: 'minArea', label: `Min Size: ${minArea} Sq. Ft.` } : null,
    maxArea ? { key: 'maxArea', label: `Max Size: ${maxArea} Sq. Ft.` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="mb-8">
        <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">Verified Catalogue</p>
        <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#1C1F1E] tracking-tight">
          Browse Available Properties &amp; Land
        </h1>
        <p className="text-sm text-[#646B67] mt-2">
          Search across approved residential, estate, agricultural, waterfront, and commercial holdings.
        </p>
      </div>

      {/* Combined Filter Panel */}
      <section className="bg-white border border-[#EAE1E6] rounded-xl p-5 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#646B67] mb-1">Keyword or Ref ID</label>
            <div className="relative">
              <Search className="w-4 h-4 text-[#646B67] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => updateParam('q', e.target.value)}
                placeholder="Search title, ref, district..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#646B67] mb-1">Location</label>
            <select
              value={locationFilter}
              onChange={(e) => updateParam('location', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
            >
              <option value="all">All Locations</option>
              {locationOptions.map((loc) => (
                <option key={loc.name} value={loc.name}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#646B67] mb-1">Property Type</label>
            <select
              value={typeFilter}
              onChange={(e) => updateParam('type', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#646B67] mb-1">Availability</label>
            <select
              value={availabilityFilter}
              onChange={(e) => updateParam('availability', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
            >
              <option value="all_public">All Public Listings</option>
              <option value="published">Available Only</option>
              <option value="sold">Sold Properties</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#646B67] mb-1">Min Price (₹)</label>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => updateParam('minPrice', e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#646B67] mb-1">Max Price (₹)</label>
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => updateParam('maxPrice', e.target.value)}
              placeholder="Any"
              className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-[#646B67] mb-1">Min Size (Sq. Ft.)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={minArea}
                onChange={(e) => updateParam('minArea', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#646B67] mb-1">Max Size (Sq. Ft.)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={maxArea}
                onChange={(e) => updateParam('maxArea', e.target.value)}
                placeholder="Any"
                className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#646B67] mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[#FAF8F9] border border-[#EAE1E6] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
            >
              <option value="newest">Newest Listed</option>
              <option value="featured">Featured First</option>
              <option value="price_asc">Lowest Price First</option>
              <option value="price_desc">Highest Price First</option>
              <option value="area_asc">Size: Small to Large</option>
              <option value="area_desc">Size: Large to Small</option>
              <option value="oldest">Oldest Listed</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#EAE1E6] text-xs">
          <span className="text-[#646B67] font-medium">Quick Budget:</span>
          {[
            { label: 'Any', min: '', max: '' },
            { label: 'Up to ₹50L', min: '', max: '5000000' },
            { label: '₹50L – ₹1Cr', min: '5000000', max: '10000000' },
            { label: '₹1Cr – ₹2Cr', min: '10000000', max: '20000000' },
            { label: '₹2Cr+', min: '20000000', max: '' },
          ].map((preset) => {
            const active = minPrice === preset.min && maxPrice === preset.max;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => updateMultipleParams({ minPrice: preset.min, maxPrice: preset.max })}
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

        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-4 border-t border-[#EAE1E6]">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs text-[#646B67] tabular-nums mr-2">
              Showing {result.items.length} of {result.total} verified{' '}
              {result.total === 1 ? 'property' : 'properties'}
            </p>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => updateParam(chip.key, '')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#FAF8F9] text-[#1C1F1E] border border-[#EAE1E6] rounded-md hover:border-[#9B0B5E]"
              >
                <span>{chip.label}</span>
                <X className="w-3 h-3 text-[#646B67]" />
              </button>
            ))}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9B0B5E] hover:underline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>
      </section>

      {/* Results State Handling */}
      {error ? (
        <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-[380px] rounded-xl bg-white border border-[#EAE1E6] animate-pulse" />
          ))}
        </div>
      ) : result.items.length === 0 ? (
        <div className="p-12 bg-white border border-[#EAE1E6] rounded-xl text-center max-w-xl mx-auto">
          <h2 className="font-display text-2xl font-medium text-[#1C1F1E] mb-2">
            No Properties Match Your Filters
          </h2>
          <p className="text-sm text-[#646B67] mb-6">
            Try widening your price or area range, selecting a broader district, or clearing active filters.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg transition-colors"
          >
            View All Properties
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.items.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onEnquire={setEnquireProperty}
              />
            ))}
          </div>

          {/* Pagination */}
          {result.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={result.page <= 1}
                onClick={() => updateParam('page', String(result.page - 1), false)}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium bg-white border border-[#EAE1E6] rounded-lg hover:bg-[#FAF8F9] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
              <span className="px-3 text-xs text-[#646B67] tabular-nums">
                Page {result.page} of {result.totalPages}
              </span>
              <button
                type="button"
                disabled={result.page >= result.totalPages}
                onClick={() => updateParam('page', String(result.page + 1), false)}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium bg-white border border-[#EAE1E6] rounded-lg hover:bg-[#FAF8F9] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      <EnquiryModal property={enquireProperty} onClose={() => setEnquireProperty(null)} />
    </div>
  );
}
