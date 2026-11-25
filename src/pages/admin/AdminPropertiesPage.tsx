import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit2, Plus, Star, Trash2 } from 'lucide-react';
import {
  deletePropertyAdmin,
  getAllPropertiesAdmin,
  savePropertyAdmin,
  togglePropertyFeaturedAdmin,
  updatePropertyStatusAdmin,
} from '../../admin/services/adminPropertyService';
import type { Property, PropertyStatus } from '../../types/realEstate';
import { formatArea, formatCurrency } from '../../utils/formatters';
import { PropertyFormModal, type PropertyDraftInput } from '../../components/PropertyFormModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export function AdminPropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | PropertyStatus>('all');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAllPropertiesAdmin();
      setProperties(data);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to load properties.');
    }
  }, []);

  useEffect(() => {
    document.title = 'Property Management — PRIME HOUSING Admin';
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingProperty(null);
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filtered = properties.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.propertyRef.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleSaveProperty = async (data: PropertyDraftInput, imageFiles: File[]) => {
    setActionError('');
    await savePropertyAdmin(data, imageFiles);
    await load();
  };

  const handleToggleFeatured = async (propertyId: string) => {
    setActionError('');
    try {
      await togglePropertyFeaturedAdmin(propertyId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update featured status.');
    }
  };

  const handleStatusChange = async (propertyId: string, nextStatus: PropertyStatus) => {
    setActionError('');
    try {
      await updatePropertyStatusAdmin(propertyId, nextStatus);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update listing status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError('');
    try {
      await deletePropertyAdmin(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete property.');
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1F1E]">
            Property Management
          </h1>
          <p className="text-xs text-[#646B67] mt-1">
            Add, edit, feature, publish, unpublish, mark sold, or remove properties.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingProperty(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Property</span>
        </button>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {actionError}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'published', 'draft', 'sold', 'unavailable'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                statusFilter === status
                  ? 'bg-[#9B0B5E] text-white'
                  : 'bg-[#FAF8F9] text-[#3D4340] hover:bg-[#EAE1E6]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, ref, location..."
          className="px-3.5 py-2 text-xs border border-[#D7C8D1] rounded-lg w-full sm:w-64 focus:outline-none focus:border-[#9B0B5E]"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#646B67]">
            No properties found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                <tr>
                  <th className="px-4 py-3 font-medium">Ref ID</th>
                  <th className="px-4 py-3 font-medium">Title &amp; Location</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium text-right">Area</th>
                  <th className="px-4 py-3 font-medium text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-center">Featured</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1E6]">
                {filtered.map((prop) => (
                  <tr key={prop.id} className="hover:bg-[#FAF8F9]/60">
                    <td className="px-4 py-3 font-mono text-[#9B0B5E]">{prop.propertyRef}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#1C1F1E] max-w-[230px] truncate">
                        {prop.title}
                      </p>
                      <p className="text-[11px] text-[#646B67]">
                        {prop.location} · {prop.district}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[#646B67]">{prop.propertyType}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatArea(prop.area, prop.areaUnit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(prop.price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(prop.id)}
                        title={prop.isFeatured ? 'Remove from featured' : 'Feature on homepage'}
                        className={`p-1.5 rounded-md transition-colors ${
                          prop.isFeatured
                            ? 'text-amber-600 bg-amber-50'
                            : 'text-[#D7C8D1] hover:text-[#646B67]'
                        }`}
                      >
                        <Star className={`w-4 h-4 ${prop.isFeatured ? 'fill-amber-500' : ''}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={prop.status}
                        onChange={(e) =>
                          handleStatusChange(prop.id, e.target.value as PropertyStatus)
                        }
                        className="px-2 py-1 text-xs border border-[#D7C8D1] rounded-md bg-white capitalize"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="sold">Sold</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProperty(prop);
                            setFormOpen(true);
                          }}
                          className="p-1.5 rounded-md text-[#3D4340] hover:bg-[#F7E8F1] hover:text-[#9B0B5E]"
                          aria-label={`Edit ${prop.title}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(prop)}
                          className="p-1.5 rounded-md text-[#646B67] hover:bg-red-50 hover:text-red-700"
                          aria-label={`Delete ${prop.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PropertyFormModal
        open={formOpen}
        heading={editingProperty ? `Edit Property (${editingProperty.propertyRef})` : 'Add New Property'}
        initialData={editingProperty ?? undefined}
        submitLabel={editingProperty ? 'Update Property' : 'Save Property'}
        onSave={handleSaveProperty}
        onClose={() => {
          setFormOpen(false);
          setEditingProperty(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Property Listing"
        message={`Are you sure you want to permanently delete "${deleteTarget?.title}" (${deleteTarget?.propertyRef})? This action cannot be undone.`}
        confirmLabel="Delete Property"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
