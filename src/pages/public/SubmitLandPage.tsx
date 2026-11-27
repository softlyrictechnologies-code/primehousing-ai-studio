import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ImagePlus, ShieldCheck, Trash2 } from 'lucide-react';
import { createSellerSubmission } from '../../services/sellerService';
import { getActiveLocations } from '../../services/locationService';
import { getPublicCategories } from '../../services/publicSiteContent';
import { validateStorageFile } from '../../services/storageService';
import type { AreaUnit, CategoryOption, LocationOption } from '../../types/realEstate';
import { isValidEmail, isValidPhone } from '../../utils/formatters';

interface SelectedImageItem {
  file: File;
  previewUrl: string;
}

export function SubmitLandPage() {
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [districtTownVillage, setDistrictTownVillage] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [area, setArea] = useState('');
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('Acres');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [description, setDescription] = useState('');
  const [roadAccess, setRoadAccess] = useState('');
  const [approvalDetails, setApprovalDetails] = useState('');
  const [selectedImages, setSelectedImages] = useState<SelectedImageItem[]>([]);
  const previewUrlsRef = useRef<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);

  const [error, setError] = useState('');
  const [imageError, setImageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Resale Plots — PRIME HOUSING';
    Promise.all([getActiveLocations(), getPublicCategories()])
      .then(([locs, cats]) => {
        setLocations(locs);
        setCategories(cats);
        if (locs[0]) setLocation(locs[0].name);
        else setLocation('Other');
        if (cats[0]) setPropertyType(cats[0].name);
      })
      .catch((err) => {
        console.error('[SubmitLandPage:init]', err);
      });

    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    };
  }, []);

  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (selectedImages.length + files.length > 6) {
      setImageError('You may upload up to 6 property images per submission.');
      return;
    }

    const added: SelectedImageItem[] = [];
    for (const file of files) {
      const check = validateStorageFile(file);
      if (!check.valid) {
        setImageError(check.error || 'Invalid image file.');
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);
      added.push({ file, previewUrl });
    }

    if (added.length > 0) {
      setSelectedImages((prev) => [...prev, ...added]);
    }
    e.target.value = '';
  };

  const removeImage = (idx: number) => {
    setSelectedImages((prev) => {
      const target = prev[idx];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
        previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== target.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (!ownerName.trim()) {
      setError('Please enter the landowner full name.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Please enter a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210).');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address or leave the email field empty.');
      return;
    }
    if (!location.trim() || !districtTownVillage.trim()) {
      setError('Please specify both the primary location and district / town / village.');
      return;
    }
    if (!propertyType.trim()) {
      setError('Please select a property category.');
      return;
    }
    const parsedArea = Number(area);
    if (!Number.isFinite(parsedArea) || parsedArea <= 0) {
      setError('Land area must be a positive number.');
      return;
    }
    const parsedPrice = Number(expectedPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError('Expected selling price must be a positive number.');
      return;
    }
    if (description.trim().length < 20) {
      setError('Please provide a property description of at least 20 characters.');
      return;
    }
    if (!consentGiven) {
      setError('Please confirm consent for our advisory team to contact you regarding this submission.');
      return;
    }

    setSubmitting(true);
    try {
      const filesToUpload = selectedImages.map((item) => item.file);
      const saved = await createSellerSubmission(
        {
          ownerName: ownerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          location: location.trim(),
          districtTownVillage: districtTownVillage.trim(),
          propertyType: propertyType.trim(),
          area: parsedArea,
          areaUnit,
          expectedPrice: parsedPrice,
          description: description.trim(),
          roadAccess: roadAccess.trim(),
          approvalDetails: approvalDetails.trim(),
          images: [],
          additionalNotes: additionalNotes.trim(),
          consentGiven,
        },
        filesToUpload
      );
      setSubmittedRef(saved.submissionRef);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit your property at this moment. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedRef) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 lg:py-24">
        <div className="bg-white border border-[#EAE1E6] rounded-xl p-8 sm:p-10 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-[#9B0B5E] mx-auto" />
          <h1 className="font-display text-3xl font-medium text-[#1C1F1E]">
            Submission Received for Review
          </h1>
          <p className="text-sm text-[#3D4340] leading-relaxed max-w-lg mx-auto">
            Thank you, {ownerName}. Your land details have been securely logged as{' '}
            <span className="font-medium text-[#1C1F1E]">Pending Verification</span>. Our team will verify ownership documentation and road access before publishing any listing.
          </p>
          <div className="py-2.5 px-4 bg-[#FBF4F8] border border-[#9B0B5E]/20 rounded-lg inline-block">
            <span className="text-xs text-[#646B67] mr-2">Submission Reference:</span>
            <span className="text-sm font-mono font-semibold text-[#9B0B5E]">{submittedRef}</span>
          </div>
          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <Link
              to="/properties"
              className="px-5 py-2.5 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
            >
              Browse Properties
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmittedRef(null);
                setOwnerName('');
                setPhone('');
                setEmail('');
                setDistrictTownVillage('');
                setArea('');
                setExpectedPrice('');
                setDescription('');
                setRoadAccess('');
                setApprovalDetails('');
                selectedImages.forEach((item) => URL.revokeObjectURL(item.previewUrl));
                previewUrlsRef.current = [];
                setSelectedImages([]);
                setAdditionalNotes('');
                setConsentGiven(false);
              }}
              className="px-5 py-2.5 text-sm font-medium text-[#1C1F1E] bg-[#FAF8F9] hover:bg-[#EAE1E6] rounded-lg"
            >
              Submit Another Property
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-medium text-[#9B0B5E] mb-1.5">Resale Plots</p>
        <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#1C1F1E] tracking-tight">
          Resale Plots or Land
        </h1>
        <p className="text-sm text-[#646B67] mt-2 leading-relaxed">
          Provide accurate parcel details below. All submissions are stored privately for administrator verification and are never published automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-8 bg-white border border-[#EAE1E6] rounded-xl p-6 sm:p-8 space-y-6"
        >
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Section 1: Owner Contact */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#1C1F1E] pb-2 border-b border-[#EAE1E6]">
              01. Landowner Contact Information
            </h2>
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Landowner Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                required
                placeholder="Full legal name"
                className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Phone Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Property Specs */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#1C1F1E] pb-2 border-b border-[#EAE1E6]">
              02. Location &amp; Parcel Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Primary Location <span className="text-red-600">*</span>
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>
                      {loc.name} ({loc.district})
                    </option>
                  ))}
                  <option value="Other">Other Location</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  District / Town / Village <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={districtTownVillage}
                  onChange={(e) => setDistrictTownVillage(e.target.value)}
                  required
                  placeholder="e.g. Highland County / Greenvale"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Property Type <span className="text-red-600">*</span>
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
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
                    placeholder="e.g. 5.5"
                    className="w-full px-3 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                  <select
                    value={areaUnit}
                    onChange={(e) => setAreaUnit(e.target.value as AreaUnit)}
                    className="px-2.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  >
                    <option value="Acres">Acres</option>
                    <option value="Perches">Perches</option>
                    <option value="Sq. Ft.">Sq. Ft.</option>
                    <option value="Hectares">Hectares</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Expected Price (₹) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={expectedPrice}
                  onChange={(e) => setExpectedPrice(e.target.value)}
                  required
                  placeholder="e.g. 2500000"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Description & Documentation */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-[#1C1F1E] pb-2 border-b border-[#EAE1E6]">
              03. Property Description &amp; Documentation
            </h2>

            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Property Description <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                placeholder="Describe terrain, boundaries, utilities, water access, and surrounding neighborhood..."
                className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Road Access Information
                </label>
                <input
                  type="text"
                  value={roadAccess}
                  onChange={(e) => setRoadAccess(e.target.value)}
                  placeholder="e.g. 20-ft paved road frontage"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Approval / Title Details
                </label>
                <input
                  type="text"
                  value={approvalDetails}
                  onChange={(e) => setApprovalDetails(e.target.value)}
                  placeholder="e.g. Freehold deed, 2024 survey plan"
                  className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1.5">
                Property Photos (Optional · JPG, PNG, WebP up to 5 MB each, max 6)
              </label>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#D7C8D1] hover:border-[#9B0B5E] rounded-xl bg-[#FAF8F9] cursor-pointer transition-colors">
                <ImagePlus className="w-6 h-6 text-[#9B0B5E] mb-2" />
                <span className="text-xs font-medium text-[#1C1F1E]">
                  Click to upload property photographs
                </span>
                <span className="text-xs text-[#646B67] mt-0.5">
                  Photos help our verification team assess access and terrain
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
              {imageError && <p className="text-xs text-red-600 mt-1.5">{imageError}</p>}

              {selectedImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-3">
                  {selectedImages.map((item, idx) => (
                    <div
                      key={item.previewUrl}
                      className="relative aspect-square rounded-lg overflow-hidden border border-[#EAE1E6] group"
                    >
                      <img
                        src={item.previewUrl}
                        alt={`Upload preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        aria-label="Remove photo"
                        className="absolute top-1 right-1 p-1 rounded bg-black/70 text-white opacity-90 hover:bg-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3D4340] mb-1">
                Additional Notes
              </label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Preferred inspection times or additional context..."
                className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
          </div>

          {/* Consent & Submit */}
          <div className="pt-2 space-y-4">
            <label className="flex items-start gap-3 text-xs text-[#3D4340] cursor-pointer">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#9B0B5E]"
              />
              <span>
                I confirm that I am authorized to submit this property and consent to PRIME HOUSING contacting me to verify ownership documentation and listing terms.
              </span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-7 py-3 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-60 rounded-lg transition-colors"
            >
              {submitting ? 'Submitting Property...' : 'Submit Property for Verification'}
            </button>
          </div>
        </form>

        {/* Verification Process Sidebar */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#EAE1E6] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[#9B0B5E]">
              <ShieldCheck className="w-5 h-5" />
              <h2 className="text-base font-semibold text-[#1C1F1E]">Verification Protocol</h2>
            </div>
            <ol className="space-y-3 text-xs text-[#3D4340] leading-relaxed">
              <li>
                <span className="font-semibold text-[#1C1F1E]">1. Private Intake:</span> Your personal phone and email remain hidden from public visitors.
              </li>
              <li>
                <span className="font-semibold text-[#1C1F1E]">2. Document Check:</span> An administrator reviews your deed summary, access width, and survey details.
              </li>
              <li>
                <span className="font-semibold text-[#1C1F1E]">3. Curated Publication:</span> Only verified listings approved by our desk appear on the public catalogue.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
