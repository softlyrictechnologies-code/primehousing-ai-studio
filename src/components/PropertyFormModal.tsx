import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Trash2, X } from 'lucide-react';
import type {
  AreaUnit,
  CategoryOption,
  LocationOption,
  Property,
  PropertyStatus,
} from '../types/realEstate';
import {
  getAllCategoriesAdmin,
  getAllLocationsAdmin,
} from '../admin/services/adminInquiryService';
import { validateStorageFile } from '../services/storageService';
import { generateReference } from '../utils/formatters';

export type PropertyDraftInput = Omit<Property, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
};

interface PendingImageFile {
  file: File;
  previewUrl: string;
}

interface PropertyFormModalProps {
  open: boolean;
  heading: string;
  initialData?: Partial<PropertyDraftInput>;
  submitLabel?: string;
  onSave: (data: PropertyDraftInput, imageFiles: File[]) => Promise<void>;
  onClose: () => void;
}

export function PropertyFormModal({
  open,
  heading,
  initialData,
  submitLabel = 'Save Property',
  onSave,
  onClose,
}: PropertyFormModalProps) {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [title, setTitle] = useState('');
  const [propertyRef, setPropertyRef] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [district, setDistrict] = useState('');
  const [town, setTown] = useState('');
  const [village, setVillage] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('Acres');
  const [price, setPrice] = useState('');
  const [roadAccess, setRoadAccess] = useState('');
  const [approvalDetails, setApprovalDetails] = useState('');
  const [featuresText, setFeaturesText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingImageFile[]>([]);
  const previewUrlsRef = useRef<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState<PropertyStatus>('draft');

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([getAllLocationsAdmin(), getAllCategoriesAdmin()])
      .then(([locs, cats]) => {
        setLocations(locs);
        setCategories(cats);
        if (!initialData?.location && locs[0]) {
          setLocation(locs[0].name);
          setDistrict(locs[0].district);
        }
        if (!initialData?.propertyType && cats[0]) {
          setPropertyType(cats[0].name);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load locations or categories.');
      });
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = [];
    setPendingFiles([]);
    setTitle(initialData?.title || '');
    setPropertyRef(initialData?.propertyRef || generateReference('VLE'));
    setPropertyType(initialData?.propertyType || 'Residential Land');
    setDescription(initialData?.description || '');
    setLocation(initialData?.location || '');
    setDistrict(initialData?.district || '');
    setTown(initialData?.town || '');
    setVillage(initialData?.village || '');
    setFullAddress(initialData?.fullAddress || '');
    setLatitude(initialData?.latitude !== undefined ? String(initialData.latitude) : '');
    setLongitude(initialData?.longitude !== undefined ? String(initialData.longitude) : '');
    setArea(initialData?.area !== undefined ? String(initialData.area) : '');
    setAreaUnit(initialData?.areaUnit || 'Acres');
    setPrice(initialData?.price !== undefined ? String(initialData.price) : '');
    setRoadAccess(initialData?.roadAccess || '');
    setApprovalDetails(initialData?.approvalDetails || '');
    setFeaturesText((initialData?.features || []).join('\n'));
    setImages(initialData?.images || []);
    setIsFeatured(Boolean(initialData?.isFeatured));
    setStatus(initialData?.status || 'draft');
    setError('');

    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, [open, initialData]);

  if (!open) return null;

  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const added: PendingImageFile[] = [];
    for (const file of files) {
      const check = validateStorageFile(file);
      if (!check.valid) {
        setError(check.error || 'Invalid image');
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);
      added.push({ file, previewUrl });
    }
    if (added.length > 0) {
      setPendingFiles((prev) => [...prev, ...added]);
    }
    e.target.value = '';
  };

  const removeExistingImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removePendingFile = (idx: number) => {
    setPendingFiles((prev) => {
      const target = prev[idx];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== target.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: FormEvent, overrideStatus?: PropertyStatus) => {
    e.preventDefault();
    if (saving) return;
    setError('');

    const parsedArea = Number(area);
    const parsedPrice = Number(price);

    if (!title.trim() || !propertyRef.trim()) {
      setError('Property title and reference ID are required.');
      return;
    }
    if (!Number.isFinite(parsedArea) || parsedArea <= 0) {
      setError('Land area must be a positive number.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Asking price must be a positive number.');
      return;
    }
    if (!description.trim()) {
      setError('Property description is required.');
      return;
    }

    const parsedLat = latitude.trim() ? Number(latitude) : undefined;
    const parsedLng = longitude.trim() ? Number(longitude) : undefined;

    setSaving(true);
    try {
      await onSave(
        {
          id: initialData?.id,
          title: title.trim(),
          propertyRef: propertyRef.trim(),
          propertyType: propertyType.trim(),
          description: description.trim(),
          location: location.trim(),
          district: district.trim(),
          town: town.trim(),
          village: village.trim(),
          fullAddress: fullAddress.trim(),
          latitude: Number.isFinite(parsedLat) ? parsedLat : undefined,
          longitude: Number.isFinite(parsedLng) ? parsedLng : undefined,
          area: parsedArea,
          areaUnit,
          price: parsedPrice,
          roadAccess: roadAccess.trim(),
          approvalDetails: approvalDetails.trim(),
          features: featuresText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          images,
          isFeatured,
          verified: initialData?.verified,
          sourceSubmissionId: initialData?.sourceSubmissionId,
          status: overrideStatus ?? status,
        },
        pendingFiles.map((item) => item.file)
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save property.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D0816]/65 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white border border-[#EAE1E6] rounded-xl shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE1E6]">
          <h2 className="font-display text-xl font-medium text-[#1C1F1E]">{heading}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#646B67] hover:bg-[#FAF8F9]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e)} className="p-6 max-h-[80vh] overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Property Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Reference ID <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={propertyRef}
                onChange={(e) => setPropertyRef(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm font-mono border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Asking Price (₹) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Land Area <span className="text-red-600">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                  className="px-2 py-2 text-sm border border-[#D7C8D1] rounded-lg"
                >
                  <option value="Acres">Acres</option>
                  <option value="Perches">Perches</option>
                  <option value="Sq. Ft.">Sq. Ft.</option>
                  <option value="Hectares">Hectares</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">Location</label>
              <select
                value={location}
                onChange={(e) => {
                  const chosen = locations.find((l) => l.name === e.target.value);
                  setLocation(e.target.value);
                  if (chosen) setDistrict(chosen.district);
                }}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">District</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">Town</label>
              <input
                type="text"
                value={town}
                onChange={(e) => setTown(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">Village</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Full Address / Location Description
              </label>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">Lat (Opt.)</label>
                <input
                  type="number"
                  step="any"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-[#D7C8D1] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">Lng (Opt.)</label>
                <input
                  type="number"
                  step="any"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-[#D7C8D1] rounded-lg"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D4340] mb-1">
              Description <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">Road Access</label>
              <input
                type="text"
                value={roadAccess}
                onChange={(e) => setRoadAccess(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Approval &amp; Documentation Status
              </label>
              <input
                type="text"
                value={approvalDetails}
                onChange={(e) => setApprovalDetails(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3D4340] mb-1">
              Property Features (one per line)
            </label>
            <textarea
              rows={3}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              placeholder={'Freehold clear deed\n24-ft paved road frontage\nWater & power available'}
              className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
            />
          </div>

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[#3D4340]">
                Property Images ({images.length + pendingFiles.length})
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg cursor-pointer">
                <ImagePlus className="w-3.5 h-3.5" />
                <span>Upload Images</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            {(images.length > 0 || pendingFiles.length > 0) && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                {images.map((img, i) => (
                  <div
                    key={`saved-${i}`}
                    className="relative aspect-square rounded-lg overflow-hidden border border-[#EAE1E6]"
                  >
                    <img src={img} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      className="absolute top-1 right-1 p-1 rounded bg-black/70 text-white hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {pendingFiles.map((item, i) => (
                  <div
                    key={item.previewUrl}
                    className="relative aspect-square rounded-lg overflow-hidden border border-[#EAE1E6]"
                  >
                    <img
                      src={item.previewUrl}
                      alt={`New property ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      className="absolute top-1 right-1 p-1 rounded bg-black/70 text-white hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publication Status & Featured Flag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#EAE1E6]">
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Listing Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg"
              >
                <option value="draft">Draft (Hidden from Public)</option>
                <option value="published">Published (Live on Website)</option>
                <option value="sold">Sold</option>
                <option value="unavailable">Unavailable</option>
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2.5 text-sm text-[#1C1F1E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 accent-[#9B0B5E]"
                />
                <span>Feature on Homepage</span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#EAE1E6]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#3D4340] hover:bg-[#FAF8F9] rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={(e) => handleSubmit(e, 'draft')}
              className="px-4 py-2 text-sm font-medium text-[#1C1F1E] bg-[#FAF8F9] hover:bg-[#EAE1E6] rounded-lg"
            >
              Save as Draft
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
            >
              {saving ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
