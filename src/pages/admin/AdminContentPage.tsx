import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { EMPTY_WEBSITE_CONTENT, getPublicSiteContent } from '../../services/publicSiteContent';
import {
  getAllLocationsAdmin,
  updateWebsiteContentAdmin,
} from '../../admin/services/adminInquiryService';
import { getAllPropertiesAdmin } from '../../admin/services/adminPropertyService';
import type { LocationOption, Property, WebsiteContent } from '../../types/realEstate';

export function AdminContentPage() {
  const [content, setContent] = useState<WebsiteContent>(EMPTY_WEBSITE_CONTENT);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [publishedProperties, setPublishedProperties] = useState<Property[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Website Content — PRIME HOUSING Admin';
    Promise.all([
      getPublicSiteContent(),
      getAllLocationsAdmin(),
      getAllPropertiesAdmin(),
    ])
      .then(([wc, locs, props]) => {
        setContent(wc);
        setLocations(locs);
        setPublishedProperties(props.filter((p) => p.status === 'published'));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load website content.');
      });
  }, []);

  const togglePopularLocation = (name: string) => {
    setContent((prev) => {
      const exists = prev.popularLocationNames.includes(name);
      return {
        ...prev,
        popularLocationNames: exists
          ? prev.popularLocationNames.filter((n) => n !== name)
          : [...prev.popularLocationNames, name],
      };
    });
  };

  const toggleFeaturedProperty = (id: string) => {
    setContent((prev) => {
      const exists = prev.featuredPropertyIds.includes(id);
      return {
        ...prev,
        featuredPropertyIds: exists
          ? prev.featuredPropertyIds.filter((pid) => pid !== id)
          : [...prev.featuredPropertyIds, id],
      };
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSavedNotice(false);
    setError('');
    try {
      await updateWebsiteContentAdmin(content);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save website content.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1F1E]">
          Website Content Management
        </h1>
        <p className="text-xs text-[#646B67] mt-1">
          Update homepage introductions, company contact details, popular locations, and featured listings.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <section className="bg-white border border-[#EAE1E6] rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#1C1F1E] pb-2 border-b border-[#EAE1E6]">
            Company Identity &amp; Homepage Hero
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">Company Name</label>
              <input
                type="text"
                value={content.companyName}
                onChange={(e) => setContent({ ...content, companyName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">Tagline</label>
              <input
                type="text"
                value={content.tagline}
                onChange={(e) => setContent({ ...content, tagline: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D4340] mb-1">Hero Headline</label>
            <input
              type="text"
              value={content.heroHeadline}
              onChange={(e) => setContent({ ...content, heroHeadline: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D4340] mb-1">
              Hero Subheadline / Introduction
            </label>
            <textarea
              rows={2}
              value={content.heroSubheadline}
              onChange={(e) => setContent({ ...content, heroSubheadline: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
            />
          </div>
        </section>

        <section className="bg-white border border-[#EAE1E6] rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-[#1C1F1E] pb-2 border-b border-[#EAE1E6]">
            About Us &amp; Contact Information
          </h2>
          <div>
            <label className="block text-xs font-medium text-[#3D4340] mb-1">
              About Introduction
            </label>
            <textarea
              rows={3}
              value={content.aboutIntro}
              onChange={(e) => setContent({ ...content, aboutIntro: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#3D4340] mb-1">
              Company Background
            </label>
            <textarea
              rows={3}
              value={content.aboutBackground}
              onChange={(e) => setContent({ ...content, aboutBackground: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={content.contactPhone}
                onChange={(e) => setContent({ ...content, contactPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={content.contactEmail}
                onChange={(e) => setContent({ ...content, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Office Address
              </label>
              <input
                type="text"
                value={content.contactAddress}
                onChange={(e) => setContent({ ...content, contactAddress: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Office Hours
              </label>
              <input
                type="text"
                value={content.officeHours}
                onChange={(e) => setContent({ ...content, officeHours: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
          </div>
        </section>

        <section className="bg-white border border-[#EAE1E6] rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-[#1C1F1E] pb-2 border-b border-[#EAE1E6]">
            Homepage Highlights
          </h2>

          <div>
            <p className="text-xs font-medium text-[#3D4340] mb-2">Popular Locations Shown on Homepage</p>
            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => {
                const checked = content.popularLocationNames.includes(loc.name);
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => togglePopularLocation(loc.name)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      checked
                        ? 'bg-[#9B0B5E] text-white border-[#9B0B5E]'
                        : 'bg-[#FAF8F9] text-[#3D4340] border-[#EAE1E6]'
                    }`}
                  >
                    {loc.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-[#3D4340] mb-2">
              Featured Published Properties
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {publishedProperties.map((prop) => {
                const checked = content.featuredPropertyIds.includes(prop.id);
                return (
                  <label
                    key={prop.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg border border-[#EAE1E6] text-xs cursor-pointer hover:bg-[#FAF8F9]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFeaturedProperty(prop.id)}
                      className="w-4 h-4 accent-[#9B0B5E]"
                    />
                    <span className="truncate font-medium text-[#1C1F1E]">{prop.title}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg transition-colors"
          >
            {saving ? 'Saving Changes...' : 'Save Website Content'}
          </button>
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9B0B5E]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Website content updated</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
