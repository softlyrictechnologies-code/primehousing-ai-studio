import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  addCategoryAdmin,
  addLocationAdmin,
  deleteCategoryAdmin,
  deleteLocationAdmin,
  getAllCategoriesAdmin,
  getAllLocationsAdmin,
  toggleCategoryActiveAdmin,
  toggleLocationActiveAdmin,
} from '../../admin/services/adminInquiryService';
import type { CategoryOption, LocationOption } from '../../types/realEstate';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

export function AdminLocationsPage() {
  const { role } = useAdminAuth();
  const normalizedRole = String(role || 'admin').toLowerCase().replace('-', '_');
  const canMutate = normalizedRole !== 'support';
  const canDelete = normalizedRole === 'super_admin' || normalizedRole === 'admin';
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [error, setError] = useState('');

  // Location Form
  const [locName, setLocName] = useState('');
  const [locDistrict, setLocDistrict] = useState('');
  const [locType, setLocType] = useState<LocationOption['type']>('District');

  // Category Form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [deleteLocTarget, setDeleteLocTarget] = useState<LocationOption | null>(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState<CategoryOption | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [locs, cats] = await Promise.all([getAllLocationsAdmin(), getAllCategoriesAdmin()]);
      setLocations(locs);
      setCategories(cats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load locations or categories.');
    }
  }, []);

  useEffect(() => {
    document.title = 'Locations & Categories — PRIME HOUSING Admin';
    load();
  }, [load]);

  const handleAddLocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!canMutate || !locName.trim() || !locDistrict.trim()) return;
    setError('');
    try {
      await addLocationAdmin({
        name: locName.trim(),
        district: locDistrict.trim(),
        type: locType,
        active: true,
      });
      setLocName('');
      setLocDistrict('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add location.');
    }
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!canMutate || !catName.trim()) return;
    setError('');
    try {
      await addCategoryAdmin({
        name: catName.trim(),
        description: catDesc.trim(),
        active: true,
      });
      setCatName('');
      setCatDesc('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add category.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1F1E]">
          Locations &amp; Property Categories
        </h1>
        <p className="text-xs text-[#646B67] mt-1">
          Standardized options managed here automatically populate property forms and public search filters.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Locations Management */}
        <section className="bg-white border border-[#EAE1E6] rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-[#1C1F1E]">Approved Locations</h2>

          <form onSubmit={handleAddLocation} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="Location name"
              required
              className="px-3 py-2 text-xs border border-[#D7C8D1] rounded-lg"
            />
            <input
              type="text"
              value={locDistrict}
              onChange={(e) => setLocDistrict(e.target.value)}
              placeholder="Parent district"
              required
              className="px-3 py-2 text-xs border border-[#D7C8D1] rounded-lg"
            />
            <div className="flex gap-2">
              <select
                value={locType}
                onChange={(e) => setLocType(e.target.value as LocationOption['type'])}
                className="px-2 py-2 text-xs border border-[#D7C8D1] rounded-lg flex-1"
              >
                <option value="District">District</option>
                <option value="Town">Town</option>
                <option value="Village">Village</option>
              </select>
              <button
                type="submit"
                disabled={!canMutate}
                className="inline-flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-45 disabled:cursor-not-allowed rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="divide-y divide-[#EAE1E6] border-t border-[#EAE1E6]">
            {locations.map((loc) => (
              <div key={loc.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-medium text-[#1C1F1E]">{loc.name}</p>
                  <p className="text-[#646B67]">
                    {loc.type} · {loc.district}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={async () => {
                      setError('');
                      try {
                        await toggleLocationActiveAdmin(loc.id, loc.active);
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Unable to update location.');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium disabled:opacity-45 disabled:cursor-not-allowed ${
                      loc.active
                        ? 'bg-[#F7E8F1] text-[#9B0B5E]'
                        : 'bg-[#FAF8F9] text-[#646B67]'
                    }`}
                  >
                    {loc.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => setDeleteLocTarget(loc)}
                    className="p-1.5 text-[#646B67] hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={`Delete ${loc.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Categories Management */}
        <section className="bg-white border border-[#EAE1E6] rounded-xl p-6 space-y-5">
          <h2 className="text-base font-semibold text-[#1C1F1E]">Property Categories</h2>

          <form onSubmit={handleAddCategory} className="space-y-2.5">
            <div className="flex gap-2.5">
              <input
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Category name (e.g. Vineyard Estate)"
                required
                className="flex-1 px-3 py-2 text-xs border border-[#D7C8D1] rounded-lg"
              />
              <button
                type="submit"
                disabled={!canMutate}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-45 disabled:cursor-not-allowed rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
            <input
              type="text"
              value={catDesc}
              onChange={(e) => setCatDesc(e.target.value)}
              placeholder="Brief category description"
              className="w-full px-3 py-2 text-xs border border-[#D7C8D1] rounded-lg"
            />
          </form>

          <div className="divide-y divide-[#EAE1E6] border-t border-[#EAE1E6]">
            {categories.map((cat) => (
              <div key={cat.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-medium text-[#1C1F1E]">{cat.name}</p>
                  {cat.description && (
                    <p className="text-[#646B67] truncate">{cat.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={async () => {
                      setError('');
                      try {
                        await toggleCategoryActiveAdmin(cat.id);
                        await load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Unable to update category.');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium disabled:opacity-45 disabled:cursor-not-allowed ${
                      cat.active
                        ? 'bg-[#F7E8F1] text-[#9B0B5E]'
                        : 'bg-[#FAF8F9] text-[#646B67]'
                    }`}
                  >
                    {cat.active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    type="button"
                    disabled={!canDelete}
                    onClick={() => setDeleteCatTarget(cat)}
                    className="p-1.5 text-[#646B67] hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(deleteLocTarget)}
        title="Delete Location"
        message={`Remove "${deleteLocTarget?.name}" from managed locations?`}
        confirmLabel="Remove"
        onConfirm={async () => {
          setError('');
          try {
            if (deleteLocTarget) {
              await deleteLocationAdmin(deleteLocTarget.id);
              await load();
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete location.');
          } finally {
            setDeleteLocTarget(null);
          }
        }}
        onCancel={() => setDeleteLocTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteCatTarget)}
        title="Delete Category"
        message={`Remove "${deleteCatTarget?.name}" from property categories?`}
        confirmLabel="Remove"
        onConfirm={async () => {
          setError('');
          try {
            if (deleteCatTarget) {
              await deleteCategoryAdmin(deleteCatTarget.id);
              await load();
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to delete category.');
          } finally {
            setDeleteCatTarget(null);
          }
        }}
        onCancel={() => setDeleteCatTarget(null)}
      />
    </div>
  );
}
