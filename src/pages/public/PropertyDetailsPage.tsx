import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileCheck2,
  MapPin,
  Route,
  XCircle,
} from 'lucide-react';
import { getPropertyById } from '../../services/propertyService';
import { createInquiry } from '../../services/inquiryService';
import type { Property } from '../../types/realEstate';
import { formatArea, formatCurrency, formatDate, isValidEmail, isValidPhone } from '../../utils/formatters';
import { ResilientImage } from '../../components/ResilientImage';

export function PropertyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Enquiry Form state
  const enquiryNameRef = useRef<HTMLInputElement>(null);
  const [buyerName, setBuyerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        const data = await getPropertyById(id);
        if (active) {
          setProperty(data);
          setActiveImageIdx(0);
          if (data) {
            document.title = `${data.title} (${data.propertyRef}) — PRIME HOUSING`;
          }
        }
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to load property details.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const scrollToEnquiry = () => {
    const el = document.getElementById('enquiry-form');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => enquiryNameRef.current?.focus(), 300);
  };

  const handleEnquirySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!property || submitting) return;
    setFormError('');

    if (!buyerName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!isValidPhone(phone)) {
      setFormError('Please provide a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210).');
      return;
    }
    if (!isValidEmail(email)) {
      setFormError('Please provide a valid email address or leave blank.');
      return;
    }
    if (message.trim().length < 8) {
      setFormError('Please enter an enquiry message (at least 8 characters).');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await createInquiry({
        name: buyerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        propertyId: property.id,
        propertyTitle: property.title,
        message: message.trim(),
        source: 'property-detail',
      });
      setSubmittedRef(saved.enquiryRef);
      setBuyerName('');
      setPhone('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not save your enquiry. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-[460px] rounded-xl bg-white border border-[#EAE1E6] animate-pulse" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-medium text-[#1C1F1E] mb-3">
          {loadError ? 'Unable to Load Property' : 'Property Not Found'}
        </h1>
        <p className="text-sm text-[#646B67] mb-6">
          {loadError ||
            'This listing may have been removed or is not currently published for public viewing.'}
        </p>
        <Link
          to="/properties"
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Properties</span>
        </Link>
      </div>
    );
  }

  const activeImage = property.images[activeImageIdx] || property.images[0];

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="mb-6">
        <Link
          to="/properties"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3D4340] hover:text-[#9B0B5E]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Properties</span>
        </Link>
      </div>

      {/* Title & Summary Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#EAE1E6] mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#646B67] mb-2">
            <span className="font-mono text-[#9B0B5E] font-medium">{property.propertyRef}</span>
            <span aria-hidden="true">·</span>
            <span>{property.propertyType}</span>
            <span aria-hidden="true">·</span>
            <span>
              {property.location}, {property.district}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#1C1F1E] tracking-tight">
            {property.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-6 shrink-0">
          <div>
            <p className="text-xs text-[#646B67]">Asking Price</p>
            <p className="text-2xl sm:text-3xl font-semibold text-[#1C1F1E] tabular-nums">
              {formatCurrency(property.price)}
            </p>
          </div>
          <button
            type="button"
            onClick={scrollToEnquiry}
            disabled={property.status === 'sold'}
            className="px-6 py-3 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:bg-[#D7C8D1] disabled:text-[#646B67] rounded-lg transition-colors"
          >
            {property.status === 'sold' ? 'Property Sold' : 'Enquire About This Property'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Gallery + Dossier Details */}
        <div className="lg:col-span-8 space-y-8">
          {/* Image Gallery */}
          <div className="space-y-3">
            <div className="aspect-[16/10] rounded-xl overflow-hidden bg-[#F7E8F1] border border-[#EAE1E6]">
              <ResilientImage
                src={activeImage}
                alt={property.title}
                fallbackTitle={property.title}
                loading="eager"
                className="w-full h-full object-cover"
              />
            </div>

            {property.images.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {property.images.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                      idx === activeImageIdx
                        ? 'border-[#9B0B5E] opacity-100'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <ResilientImage
                      src={img}
                      alt={`${property.title} view ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Key Specifications Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-white border border-[#EAE1E6] rounded-xl">
            <div>
              <p className="text-xs text-[#646B67] mb-1">Land Area</p>
              <p className="text-base font-semibold text-[#1C1F1E] tabular-nums">
                {formatArea(property.area, property.areaUnit)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#646B67] mb-1">Property Type</p>
              <p className="text-base font-medium text-[#1C1F1E]">{property.propertyType}</p>
            </div>
            <div>
              <p className="text-xs text-[#646B67] mb-1">Availability</p>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                {property.status === 'published' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#9B0B5E]" />
                    <span className="text-[#9B0B5E]">Available</span>
                  </>
                )}
                {property.status === 'sold' && (
                  <>
                    <XCircle className="w-4 h-4 text-[#646B67]" />
                    <span className="text-[#646B67]">Sold</span>
                  </>
                )}
                {property.status === 'unavailable' && (
                  <>
                    <Clock className="w-4 h-4 text-[#9A6B2F]" />
                    <span className="text-[#9A6B2F]">Unavailable</span>
                  </>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-[#646B67] mb-1">Listed On</p>
              <p className="text-sm font-medium text-[#1C1F1E] tabular-nums">
                {formatDate(property.createdAt)}
              </p>
            </div>
          </div>

          {/* Property Description */}
          <section className="bg-white border border-[#EAE1E6] rounded-xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-2xl font-medium text-[#1C1F1E] mb-3">
                Property Overview
              </h2>
              <p className="text-base text-[#3D4340] leading-relaxed whitespace-pre-line">
                {property.description}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-[#EAE1E6]">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1C1F1E] mb-2">
                  <MapPin className="w-4 h-4 text-[#9B0B5E]" />
                  <span>Location &amp; Address</span>
                </h3>
                <p className="text-sm text-[#3D4340]">
                  {property.fullAddress || `${property.village}, ${property.town}, ${property.district}`}
                </p>
                <p className="text-xs text-[#646B67] mt-1">
                  District: {property.district} · Town: {property.town}
                  {property.village ? ` · Village: ${property.village}` : ''}
                </p>
                {property.latitude !== undefined && property.longitude !== undefined && (
                  <p className="text-xs font-mono text-[#646B67] mt-1.5">
                    GPS: {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)}
                  </p>
                )}
              </div>

              {property.roadAccess && (
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1C1F1E] mb-2">
                    <Route className="w-4 h-4 text-[#9B0B5E]" />
                    <span>Road Access</span>
                  </h3>
                  <p className="text-sm text-[#3D4340] leading-relaxed">{property.roadAccess}</p>
                </div>
              )}
            </div>

            {property.approvalDetails && (
              <div className="pt-6 border-t border-[#EAE1E6]">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[#1C1F1E] mb-2">
                  <FileCheck2 className="w-4 h-4 text-[#9B0B5E]" />
                  <span>Verified Approval &amp; Title Documentation</span>
                </h3>
                <p className="text-sm text-[#3D4340] leading-relaxed">
                  {property.approvalDetails}
                </p>
              </div>
            )}

            {property.features.length > 0 && (
              <div className="pt-6 border-t border-[#EAE1E6]">
                <h3 className="text-sm font-semibold text-[#1C1F1E] mb-3">Key Features</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {property.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm text-[#3D4340]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#9B0B5E] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Embedded Buyer Enquiry Form */}
        <aside id="enquiry-form" className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="bg-white border border-[#EAE1E6] rounded-xl p-6">
            <p className="text-xs font-mono text-[#646B67] mb-1">Ref: {property.propertyRef}</p>
            <h2 className="font-display text-2xl font-medium text-[#1C1F1E] mb-2">
              Enquire About This Property
            </h2>
            <p className="text-xs text-[#646B67] leading-relaxed mb-5">
              Request survey plans, title documentation copies, or arrange an accompanied site visit.
            </p>

            {submittedRef ? (
              <div className="p-5 rounded-xl bg-[#FBF4F8] border border-[#9B0B5E]/20 space-y-3">
                <CheckCircle2 className="w-8 h-8 text-[#9B0B5E]" />
                <h3 className="text-base font-semibold text-[#1C1F1E]">
                  Enquiry Submitted Successfully
                </h3>
                <p className="text-xs text-[#3D4340] leading-relaxed">
                  An advisor has received your enquiry for {property.title} and will reach out by phone or email shortly.
                </p>
                <p className="text-xs font-mono text-[#9B0B5E] font-medium">
                  Reference: {submittedRef}
                </p>
                <button
                  type="button"
                  onClick={() => setSubmittedRef(null)}
                  className="text-xs font-medium text-[#9B0B5E] hover:underline pt-1"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    ref={enquiryNameRef}
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    required
                    placeholder="Jane Cooper"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Phone Number <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    placeholder="+1 (555) 234-5678"
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
                    placeholder="jane@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Enquiry Message <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="I would like to schedule a viewing and review the title documents..."
                    className="w-full px-3.5 py-2.5 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || property.status === 'sold'}
                  className="w-full py-3 px-4 text-sm font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:bg-[#D7C8D1] disabled:text-[#646B67] rounded-lg transition-colors"
                >
                  {property.status === 'sold'
                    ? 'Property Sold'
                    : submitting
                      ? 'Submitting Enquiry...'
                      : 'Submit Enquiry'}
                </button>
              </form>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
