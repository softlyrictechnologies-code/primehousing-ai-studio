import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Check,
  CheckCircle2,
  Compass,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  IndianRupee,
  Layers,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  QrCode,
  Route,
  X,
} from 'lucide-react';
import type { Project, ProjectDocumentAsset, ProjectImageAsset, WebsiteContent } from '../types/realEstate';
import { createInquiry } from '../services/inquiryService';
import { isValidEmail, isValidPhone } from '../utils/formatters';
import { ProjectIcon } from './ProjectIcon';

const ENQUIRY_TYPES = [
  'Plot Availability',
  'Pricing Information',
  'Site Visit',
  'Brochure Request',
  'General Enquiry',
] as const;

interface ProjectDetailsTemplateProps {
  project: Project;
  siteContent?: WebsiteContent | null;
  isPreview?: boolean;
  onClosePreview?: () => void;
}

interface LightboxState {
  url: string;
  title: string;
  caption?: string;
}

const HEADING_FONT = { fontFamily: "'Manrope', 'DM Sans', sans-serif" };

function isPdfAsset(docAsset: ProjectDocumentAsset): boolean {
  const ft = (docAsset.fileType || '').toLowerCase();
  const u = (docAsset.url || '').toLowerCase();
  return ft.includes('pdf') || u.includes('.pdf');
}

function splitHeadlineAccent(text: string): { lead: string; accent: string } {
  const clean = text.trim();
  if (!clean) return { lead: '', accent: '' };
  const words = clean.split(/\s+/);
  if (words.length <= 1) return { lead: clean, accent: '' };
  return {
    lead: words.slice(0, -1).join(' '),
    accent: words[words.length - 1],
  };
}

export function ProjectDetailsTemplate({
  project,
  siteContent,
  isPreview = false,
  onClosePreview,
}: ProjectDetailsTemplateProps) {
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  // Project Enquiry Form State
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [enquiryCategory, setEnquiryCategory] = useState<string>(ENQUIRY_TYPES[0]);
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  const contactPhone = project.contactPhone || siteContent?.contactPhone || '';
  const contactEmail = project.contactEmail || siteContent?.contactEmail || '';
  const contactAddress =
    project.contactAddress || project.address || project.location || siteContent?.contactAddress || '';

  const mainEntrance = project.images.entranceImage?.url ? project.images.entranceImage : null;
  const siteImg1 = project.images.siteImage1?.url ? project.images.siteImage1 : null;
  const siteImg2 = project.images.siteImage2?.url ? project.images.siteImage2 : null;
  const heroBgUrl = project.images.heroImage?.url || mainEntrance?.url || '';

  const visibleGallery = (project.images.gallery || []).filter(
    (img) => img && img.url && img.visible !== false
  );

  const combinedGalleryFigures: { asset: ProjectImageAsset; label: string }[] = [
    ...(mainEntrance ? [{ asset: mainEntrance, label: mainEntrance.caption || 'Main Project Entrance' }] : []),
    ...(siteImg1 ? [{ asset: siteImg1, label: siteImg1.caption || 'Project Site View 1' }] : []),
    ...(siteImg2 ? [{ asset: siteImg2, label: siteImg2.caption || 'Project Site View 2' }] : []),
    ...visibleGallery.map((g, idx) => ({
      asset: g,
      label: g.caption || g.description || g.title || `${project.name} View ${idx + 1}`,
    })),
  ];

  const overviewVisual =
    mainEntrance || siteImg1 || siteImg2 || project.images.heroImage || visibleGallery[0] || null;
  const whySectionVisual =
    siteImg1 || siteImg2 || mainEntrance || visibleGallery[0] || project.images.heroImage || null;

  const hasPricing = Boolean(
    project.startingPrice ||
      project.pricePerSqFt ||
      project.specialOffers ||
      project.pricingDescription
  );

  const hasPlotDetails = Boolean(
    project.totalPlots ||
      project.availablePlots ||
      project.plotSizes ||
      project.plotAvailabilityNote ||
      project.propertyType
  );

  const quickItems = [
    project.propertyType
      ? { label: 'PROPERTY TYPE', value: project.propertyType, icon: Building2 }
      : null,
    project.totalPlots || project.availablePlots
      ? {
          label: project.totalPlots ? 'TOTAL PLOTS' : 'AVAILABLE PLOTS',
          value: project.totalPlots || project.availablePlots,
          icon: Layers,
        }
      : project.plotSizes
      ? { label: 'PLOT SIZES', value: project.plotSizes, icon: Layers }
      : null,
    project.startingPrice || project.pricePerSqFt
      ? {
          label: project.startingPrice ? 'STARTING PRICE' : 'PRICE / SQ.FT',
          value: project.startingPrice || project.pricePerSqFt,
          icon: IndianRupee,
        }
      : project.category
      ? { label: 'CATEGORY', value: project.category, icon: Compass }
      : null,
    project.approvalType || project.reraNumber
      ? {
          label: 'APPROVAL STATUS',
          value: [project.approvalType, project.reraNumber ? 'RERA' : '']
            .filter(Boolean)
            .join(' · '),
          icon: FileCheck2,
        }
      : project.projectStatusLabel
      ? { label: 'PROJECT STATUS', value: project.projectStatusLabel, icon: FileCheck2 }
      : null,
  ].filter(Boolean) as { label: string; value: string; icon: typeof Building2 }[];

  const glanceCards = [
    (project.totalPlots || project.availablePlots || project.plotSizes) && {
      num: '01',
      title: project.totalPlots || project.availablePlots || project.plotSizes,
      subtitle: project.totalPlots
        ? 'Total layout plots'
        : project.availablePlots
        ? 'Plots available'
        : 'Plot dimensions',
    },
    project.amenities.length > 0 && {
      num: '02',
      title: `${project.amenities.length}+`,
      subtitle: 'Planned features & amenities',
    },
    project.approvalType && {
      num: '03',
      title: project.approvalType,
      subtitle: project.approvalNumber ? `Ref: ${project.approvalNumber}` : 'Layout approval status',
    },
    (project.reraNumber || project.locationAdvantages.length > 0) && {
      num: '04',
      title: project.reraNumber ? project.reraNumber : `${project.locationAdvantages.length}+`,
      subtitle: project.reraNumber ? 'RERA registration' : 'Key location advantages',
    },
  ].filter(Boolean) as { num: string; title: string; subtitle: string }[];

  const visibleApprovalDocs = (project.documents.approvalDocuments || []).filter(
    (d) => d && d.url && d.visible !== false
  );
  const visibleAdditionalPdfs = (project.documents.additionalPdfs || []).filter(
    (d) => d && d.url && d.visible !== false
  );
  const layoutPlan =
    project.documents.layoutPlan?.url && project.documents.layoutPlan.visible !== false
      ? project.documents.layoutPlan
      : null;
  const keyPlan =
    project.documents.keyPlan?.url && project.documents.keyPlan.visible !== false
      ? project.documents.keyPlan
      : null;
  const brochure =
    project.documents.brochure?.url && project.documents.brochure.visible !== false
      ? project.documents.brochure
      : null;

  const hasDocuments = Boolean(
    layoutPlan || keyPlan || brochure || visibleApprovalDocs.length > 0 || visibleAdditionalPdfs.length > 0
  );

  const hasLocationSection = Boolean(
    project.locationAdvantages.length > 0 ||
      project.routeMap.image?.url ||
      project.routeMap.qrCode?.url ||
      project.routeMap.googleMapsUrl ||
      project.routeMap.address ||
      project.routeMap.locationDescription
  );

  const whyItems =
    project.whyChooseItems.length > 0
      ? project.whyChooseItems
      : project.highlights.map((h) => ({
          id: h.id,
          title: h.title,
          description: h.description,
          icon: h.icon,
        }));

  const nameParts = splitHeadlineAccent(project.name);

  const openImageLightbox = (asset: ProjectImageAsset, fallbackTitle: string) => {
    setLightbox({
      url: asset.url,
      title: asset.title || asset.altText || fallbackTitle,
      caption: asset.caption || asset.description || '',
    });
  };

  const scrollToEnquiry = () => {
    const el = document.getElementById('enquiry');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => nameInputRef.current?.focus(), 300);
  };

  const handleEnquirySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError('');

    if (isPreview) {
      setFormError('Preview mode: publish this project to enable live visitor enquiries.');
      return;
    }
    if (!fullName.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!isValidPhone(mobileNumber)) {
      setFormError('Please provide a valid 10-digit mobile number (e.g. 9876543210 or +91 9876543210).');
      return;
    }
    if (!isValidEmail(emailAddress)) {
      setFormError('Please enter a valid email address or leave blank.');
      return;
    }
    if (!message.trim()) {
      setFormError('Please enter your message or plot requirement.');
      return;
    }

    setSubmitting(true);
    try {
      const saved = await createInquiry({
        name: fullName.trim(),
        phone: mobileNumber.trim(),
        email: emailAddress.trim(),
        projectId: project.id,
        projectName: project.name,
        projectSlug: project.slug,
        propertyTitle: `${project.name} — ${enquiryCategory}`,
        enquiryCategory,
        message: `[${enquiryCategory}] ${message.trim()}`,
        source: 'project-detail',
      });
      setSubmittedRef(saved.enquiryRef);
      setFullName('');
      setMobileNumber('');
      setEmailAddress('');
      setMessage('');
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to submit enquiry. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const navAnchorLinks = [
    (project.fullDescription || project.overviewParagraphs.length > 0) && {
      href: '#overview',
      label: 'Overview',
    },
    project.amenities.length > 0 && { href: '#amenities', label: 'Amenities' },
    (hasPricing || hasPlotDetails) && { href: '#pricing', label: 'Pricing' },
    hasLocationSection && { href: '#location', label: 'Location & Map' },
    hasDocuments && { href: '#plans', label: 'Layout & Docs' },
    combinedGalleryFigures.length > 0 && { href: '#gallery', label: 'Gallery' },
    { href: '#enquiry', label: 'Enquiry' },
  ].filter(Boolean) as { href: string; label: string }[];

  const priceDisplayValue = project.startingPrice || project.pricePerSqFt || 'On Request';

  return (
    <div className="bg-white text-[#1F181C] pb-14 md:pb-0">
      {isPreview && (
        <div className="sticky top-0 z-50 bg-[#240A1B] text-white px-4 py-2.5 flex items-center justify-between gap-4 border-b border-[#F3C98B]/40">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="font-semibold text-[#F3C98B]">Admin Project Preview</span>
            <span className="text-[#DECED8]" aria-hidden="true">·</span>
            <span className="text-[#E9DAE3] capitalize">Status: {project.status}</span>
          </div>
          {onClosePreview && (
            <button
              type="button"
              onClick={onClosePreview}
              className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-[#9B0B5E] text-white hover:bg-[#7A084A] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Preview</span>
            </button>
          )}
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section
        className="relative min-h-[580px] sm:min-h-[620px] flex items-center text-white overflow-hidden"
        style={{
          backgroundColor: '#240A1B',
          backgroundImage: heroBgUrl
            ? `linear-gradient(90deg, rgba(29,8,22,0.94), rgba(29,8,22,0.72) 55%, rgba(29,8,22,0.22)), url("${heroBgUrl}")`
            : 'linear-gradient(120deg, #180512 0%, #240A1B 55%, #38122B 100%)',
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="w-[min(1160px,90%)] mx-auto py-16 sm:py-20 pb-24 relative z-10">
          {!isPreview && (
            <div className="mb-6">
              <Link
                to="/properties"
                className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-[#E9DAE3] hover:text-[#F3C98B] transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>BACK TO PROPERTIES</span>
              </Link>
            </div>
          )}

          <div className="inline-flex items-center gap-2.5 text-[#F3C98B] text-[11px] font-bold tracking-[2px] uppercase mb-5">
            <span className="w-2 h-2 rounded-full bg-[#F3C98B] shrink-0" />
            <span>
              {[project.approvalType, project.category || project.propertyType, project.projectStatusLabel]
                .filter(Boolean)
                .join(' · ') || 'RESIDENTIAL PLOTS'}
            </span>
          </div>

          <h1
            style={HEADING_FONT}
            className="text-[clamp(40px,6vw,72px)] font-extrabold tracking-[-2.5px] leading-[1.06] mb-5 text-white"
          >
            {nameParts.accent ? (
              <>
                {nameParts.lead}{' '}
                <span className="text-[#F3C98B]">{nameParts.accent}</span>
              </>
            ) : (
              project.name
            )}
          </h1>

          {project.shortDescription && (
            <p className="text-[#F2EAF0] max-w-[560px] text-[15px] leading-[1.75]">
              {project.shortDescription}
            </p>
          )}

          {(project.location || project.address) && (
            <div className="flex items-start gap-2.5 text-[13px] text-[#eee] my-5 max-w-[600px]">
              <MapPin className="w-4 h-4 text-[#F3C98B] shrink-0 mt-0.5" />
              <span>{project.location || project.address}</span>
            </div>
          )}

          {(project.approvalNumber || project.reraNumber) && (
            <div className="flex flex-wrap gap-5 text-xs font-mono text-[#F3C98B] mb-6">
              {project.approvalNumber && <span>Approval No: {project.approvalNumber}</span>}
              {project.reraNumber && <span>RERA No: {project.reraNumber}</span>}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {(() => {
              const rawUrl = String(project.plotViewUrl || '').trim();
              let safePlotUrl = '';
              if (rawUrl) {
                try {
                  const parsed = new URL(rawUrl);
                  if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                    safePlotUrl = parsed.toString();
                  }
                } catch {
                  safePlotUrl = '';
                }
              } else if (project.slug === 'thangaraj-city' || project.id === 'thangaraj-city') {
                safePlotUrl = 'https://thangarajcity.velken.land/';
              }

              return (
                <a
                  href={safePlotUrl || '#overview'}
                  target={safePlotUrl ? '_blank' : undefined}
                  rel={safePlotUrl ? 'noopener noreferrer' : undefined}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#9B0B5E] hover:bg-[#7A084A] text-white text-[13px] font-bold transition-all hover:-translate-y-0.5"
                >
                  <span>Plot View</span>
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              );
            })()}
            {project.routeMap.googleMapsUrl && (
              <a
                href={project.routeMap.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-transparent border border-[#F2DCE8]/60 hover:bg-white hover:text-[#240A1B] text-[#F2DCE8] text-[13px] font-bold transition-all"
              >
                <MapPin className="w-4 h-4" />
                <span>Google Maps</span>
              </a>
            )}
            {brochure && (
              <a
                href={brochure.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-transparent border border-white/50 hover:bg-white hover:text-[#240A1B] text-white text-[13px] font-bold transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Brochure</span>
              </a>
            )}
          </div>
        </div>

        <div className="absolute bottom-5 left-[5%] right-[5%] flex justify-between items-center text-[10px] tracking-[1.7px] text-[#E9DAE3] z-10">
          <span>{project.approvalType ? `${project.approvalType.toUpperCase()} PROJECT` : '01 / FEATURED PROJECT'}</span>
          <span>PRIME HOUSING &amp; PROPERTIES</span>
        </div>
      </section>

      {/* STICKY PROJECT SECTION JUMP STRIP */}
      {navAnchorLinks.length > 0 && (
        <div className="bg-white border-b border-[#EAE1E6]">
          <div className="w-[min(1160px,90%)] mx-auto flex items-center gap-7 overflow-x-auto py-3.5">
            {navAnchorLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[12px] font-semibold text-[#240A1B] hover:text-[#9B0B5E] whitespace-nowrap shrink-0 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 2. QUICK FACTS BAR */}
      {quickItems.length > 0 && (
        <section className="py-7 border-b border-[#EAE1E6] bg-white">
          <div
            className={`w-[min(1160px,90%)] mx-auto grid grid-cols-2 ${
              quickItems.length >= 4
                ? 'md:grid-cols-4'
                : quickItems.length === 3
                ? 'md:grid-cols-3'
                : 'md:grid-cols-2'
            } gap-4 md:gap-0`}
          >
            {quickItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`flex items-center gap-3.5 py-2 md:px-5 ${
                    idx === 0 ? 'md:pl-0' : ''
                  } ${idx < quickItems.length - 1 ? 'md:border-r md:border-[#EAE1E6]' : ''}`}
                >
                  <span className="h-[46px] w-[46px] shrink-0 rounded-full bg-[#F7E8F1] text-[#9B0B5E] grid place-items-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <small className="block text-[9px] tracking-[1px] text-[#877680] font-bold uppercase">
                      {item.label}
                    </small>
                    <h3
                      style={HEADING_FONT}
                      className="text-[14px] sm:text-[15px] font-bold text-[#240A1B] mt-0.5 truncate"
                    >
                      {item.value}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. PROJECT OVERVIEW SPLIT SECTION */}
      {(project.fullDescription || project.overviewParagraphs.length > 0 || overviewVisual) && (
        <section id="overview" className="py-16 sm:py-[90px] bg-white">
          <div className="w-[min(1160px,90%)] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
            {overviewVisual && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => openImageLightbox(overviewVisual, project.name)}
                  className="block w-full text-left overflow-hidden rounded-[4px] group"
                >
                  <img
                    src={overviewVisual.url}
                    alt={overviewVisual.altText || overviewVisual.caption || project.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-[340px] sm:h-[460px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </button>
                {(project.totalPlots || project.availablePlots || project.approvalType) && (
                  <div className="absolute right-2 sm:-right-4 bottom-6 bg-[#240A1B] text-white px-7 py-5 border-b-4 border-[#F3C98B] shadow-xl">
                    <b
                      style={HEADING_FONT}
                      className="block text-[28px] sm:text-[34px] font-extrabold text-[#F3C98B] leading-none"
                    >
                      {project.availablePlots || project.totalPlots || project.approvalType}
                    </b>
                    <span className="block text-[11px] leading-[1.45] text-[#E9DAE3] mt-1.5">
                      {project.availablePlots
                        ? 'Available Plots'
                        : project.totalPlots
                        ? 'Residential Plots'
                        : project.category || 'Verified Layout'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className={overviewVisual ? '' : 'md:col-span-2 max-w-3xl'}>
              <span className="block text-[11px] tracking-[2px] font-bold text-[#9B0B5E] uppercase mb-4">
                ABOUT THE PROJECT
              </span>
              <h2
                style={HEADING_FONT}
                className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.2px] leading-[1.18] text-[#240A1B]"
              >
                {project.overviewHeading || 'Project Overview'}
              </h2>
              {project.overviewSubheading && (
                <p className="text-[15px] font-semibold text-[#38122B] mt-3">
                  {project.overviewSubheading}
                </p>
              )}

              {project.fullDescription && (
                <p className="text-[14px] text-[#63555D] mt-4 leading-[1.85] whitespace-pre-line">
                  {project.fullDescription}
                </p>
              )}

              {project.overviewParagraphs.map((block) => (
                <div key={block.id} className="mt-4">
                  {block.heading && (
                    <h3
                      style={HEADING_FONT}
                      className="text-[15px] font-bold text-[#240A1B] mb-1"
                    >
                      {block.heading}
                    </h3>
                  )}
                  <p className="text-[14px] text-[#63555D] leading-[1.85] whitespace-pre-line">
                    {block.text}
                  </p>
                </div>
              ))}

              {project.highlights.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
                  {project.highlights.slice(0, 4).map((hl) => (
                    <span
                      key={hl.id}
                      className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#240A1B]"
                    >
                      <Check className="w-3.5 h-3.5 text-[#9B0B5E] shrink-0" />
                      <span>{hl.title}</span>
                    </span>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={scrollToEnquiry}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#9B0B5E] hover:bg-[#7A084A] text-white text-[13px] font-bold transition-all hover:-translate-y-0.5 mt-2"
              >
                <span>Get Project Details</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 4. PROJECT AT A GLANCE (DARK NAVY STATS) */}
      {glanceCards.length > 0 && (
        <section className="py-16 sm:py-[90px] bg-[#240A1B] text-white">
          <div className="w-[min(1160px,90%)] mx-auto">
            <div className="text-center">
              <span className="block text-[11px] tracking-[2px] font-bold text-[#F3C98B] uppercase mb-4">
                PROJECT AT A GLANCE
              </span>
              <h2
                style={HEADING_FONT}
                className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.2px] leading-[1.18] text-white"
              >
                Key Details About <span className="text-[#F3C98B]">{project.name}</span>
              </h2>
              <p className="text-[14px] text-[#DECED8] mt-3 max-w-[560px] mx-auto">
                Verified project specifications to help you evaluate plot options and layout credentials.
              </p>
            </div>

            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                glanceCards.length >= 4
                  ? 'lg:grid-cols-4'
                  : glanceCards.length === 3
                  ? 'lg:grid-cols-3'
                  : 'lg:grid-cols-2'
              } gap-4 mt-10`}
            >
              {glanceCards.map((card) => (
                <div
                  key={card.num}
                  className="p-7 border border-white/15 hover:bg-[#38122B] hover:border-[#F3C98B] transition-all hover:-translate-y-1"
                >
                  <small className="text-[#F3C98B] font-bold text-xs tracking-wider">
                    {card.num}
                  </small>
                  <h3
                    style={HEADING_FONT}
                    className="text-[24px] sm:text-[26px] font-extrabold text-white mt-5 mb-2 break-words"
                  >
                    {card.title}
                  </h3>
                  <p className="text-[12px] text-[#DECED8]">{card.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. AMENITIES CARDS (.light) */}
      {project.amenities.length > 0 && (
        <section id="amenities" className="py-16 sm:py-[90px] bg-[#FAF5F8]">
          <div className="w-[min(1160px,90%)] mx-auto">
            <span className="block text-[11px] tracking-[2px] font-bold text-[#9B0B5E] uppercase mb-4">
              DESIGNED FOR BETTER LIVING
            </span>
            <h2
              style={HEADING_FONT}
              className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.2px] leading-[1.18] text-[#240A1B]"
            >
              Project <span className="text-[#9B0B5E]">Amenities.</span>
            </h2>
            <p className="text-[14px] text-[#63555D] mt-3 max-w-[580px]">
              Explore the essential amenities and layout facilities of {project.name}.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
              {project.amenities.map((am) => (
                <article
                  key={am.id}
                  className="bg-white p-7 border border-[#EAE1E6] hover:border-[#9B0B5E] hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  {am.imageUrl ? (
                    <img
                      src={am.imageUrl}
                      alt={am.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-[#EAE1E6] mb-5"
                    />
                  ) : (
                    <div className="w-[50px] h-[50px] rounded-full bg-[#F7E8F1] text-[#9B0B5E] grid place-items-center mb-5">
                      <ProjectIcon name={am.icon} className="w-5 h-5" />
                    </div>
                  )}
                  <h3 style={HEADING_FONT} className="text-[16px] font-bold text-[#240A1B] mb-2">
                    {am.name}
                  </h3>
                  {am.description && (
                    <p className="text-[12px] text-[#63555D] leading-[1.7]">{am.description}</p>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. WHY CHOOSE THIS PROJECT (WHITE SPLIT WITH NUMBERED LIST) */}
      {whyItems.length > 0 && (
        <section className="py-16 sm:py-[90px] bg-white">
          <div className="w-[min(1160px,90%)] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className={whySectionVisual ? '' : 'md:col-span-2 max-w-3xl'}>
              <span className="block text-[11px] tracking-[2px] font-bold text-[#9B0B5E] uppercase mb-4">
                THE PRIME ADVANTAGE
              </span>
              <h2
                style={HEADING_FONT}
                className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.2px] leading-[1.18] text-[#240A1B]"
              >
                Why Choose <span className="text-[#9B0B5E]">{project.name}.</span>
              </h2>
              <p className="text-[14px] text-[#63555D] mt-3">
                Review the connectivity, approvals, and development features before planning your site visit.
              </p>

              <div className="mt-6">
                {whyItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="flex gap-4 py-4 border-b border-[#EAE1E6]"
                  >
                    <span className="text-[#9B0B5E] font-bold text-sm shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 style={HEADING_FONT} className="text-[15px] font-bold text-[#240A1B]">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-[12px] text-[#63555D] mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {whySectionVisual && (
              <button
                type="button"
                onClick={() => openImageLightbox(whySectionVisual, project.name)}
                className="block w-full overflow-hidden rounded-[4px] group"
              >
                <img
                  src={whySectionVisual.url}
                  alt={whySectionVisual.altText || whySectionVisual.caption || project.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-[340px] sm:h-[500px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </button>
            )}
          </div>
        </section>
      )}

      {/* 7. PRICING & PLOT DETAILS (.price-area warm cream) */}
      {(hasPricing || hasPlotDetails) && (
        <section id="pricing" className="py-16 sm:py-[90px] bg-[#F5EEF2]">
          <div className="w-[min(1160px,90%)] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="block text-[11px] tracking-[2px] font-bold text-[#9B0B5E] uppercase mb-4">
                PLOT DETAILS &amp; PRICING
              </span>
              <h2
                style={HEADING_FONT}
                className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.2px] leading-[1.18] text-[#240A1B]"
              >
                Plot Specifications &amp; <span className="text-[#9B0B5E]">Availability.</span>
              </h2>
              <p className="text-[14px] text-[#63555D] mt-3 leading-relaxed">
                {project.pricingDescription ||
                  project.plotAvailabilityNote ||
                  `Contact our sales advisory team for current plot availability, dimensions, and pricing schedule for ${project.name}.`}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                {project.propertyType && (
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#240A1B]">
                    <Check className="w-3.5 h-3.5 text-[#9B0B5E] shrink-0" />
                    <span>Type: {project.propertyType}</span>
                  </span>
                )}
                {project.approvalType && (
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#240A1B]">
                    <Check className="w-3.5 h-3.5 text-[#9B0B5E] shrink-0" />
                    <span>{project.approvalType}</span>
                  </span>
                )}
                {project.plotSizes && (
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#240A1B]">
                    <Check className="w-3.5 h-3.5 text-[#9B0B5E] shrink-0" />
                    <span>Sizes: {project.plotSizes}</span>
                  </span>
                )}
                {project.specialOffers && (
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-[#240A1B]">
                    <Check className="w-3.5 h-3.5 text-[#9B0B5E] shrink-0" />
                    <span>{project.specialOffers}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#240A1B] text-white p-8 sm:p-9 w-full md:max-w-[430px] md:ml-auto">
              <span className="block text-[11px] tracking-[2px] font-bold text-[#F3C98B] uppercase">
                {project.startingPrice
                  ? 'STARTING PRICE'
                  : project.pricePerSqFt
                  ? 'PRICE PER SQ. FT.'
                  : 'PRICING SCHEDULE'}
              </span>
              <div
                style={HEADING_FONT}
                className="text-[34px] sm:text-[42px] font-extrabold text-white mt-3 leading-tight"
              >
                {priceDisplayValue}
              </div>
              <p className="text-[12px] text-[#DECED8] mt-1">
                {project.startingPrice && project.pricePerSqFt
                  ? `${project.pricePerSqFt} · Confirm current availability`
                  : project.startingPrice || project.pricePerSqFt
                  ? 'Indicative project rate'
                  : 'Request official pricing & plot cost sheet'}
              </p>

              <div className="h-px bg-white/15 my-6" />

              {project.propertyType && (
                <div className="flex justify-between py-2.5 border-b border-white/15 text-[12px]">
                  <span className="text-[#DECED8]">Property type</span>
                  <strong>{project.propertyType}</strong>
                </div>
              )}
              {project.approvalType && (
                <div className="flex justify-between py-2.5 border-b border-white/15 text-[12px]">
                  <span className="text-[#DECED8]">Approval</span>
                  <strong>{project.approvalType}</strong>
                </div>
              )}
              {project.totalPlots && (
                <div className="flex justify-between py-2.5 border-b border-white/15 text-[12px]">
                  <span className="text-[#DECED8]">Total plots</span>
                  <strong className="tabular-nums">{project.totalPlots}</strong>
                </div>
              )}
              {project.availablePlots && (
                <div className="flex justify-between py-2.5 border-b border-white/15 text-[12px]">
                  <span className="text-[#DECED8]">Available plots</span>
                  <strong className="tabular-nums">{project.availablePlots}</strong>
                </div>
              )}
              {project.plotSizes && (
                <div className="flex justify-between py-2.5 border-b border-white/15 text-[12px]">
                  <span className="text-[#DECED8]">Plot sizes</span>
                  <strong className="tabular-nums">{project.plotSizes}</strong>
                </div>
              )}
              {project.reraNumber && (
                <div className="flex justify-between py-2.5 border-b border-white/15 text-[12px]">
                  <span className="text-[#DECED8]">RERA No.</span>
                  <strong className="font-mono">{project.reraNumber}</strong>
                </div>
              )}

              <button
                type="button"
                onClick={scrollToEnquiry}
                className="w-full mt-6 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#9B0B5E] hover:bg-[#7A084A] text-white text-[13px] font-bold transition-all"
              >
                <span>Enquire For Pricing</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <p className="text-[10px] text-[#DECED8] mt-3 leading-relaxed">
                Confirm current price, plot dimensions, registration charges, and availability directly with our advisory team.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 8. LOCATION ADVANTAGES, GOOGLE MAPS, ROUTE MAP & QR CODE (.dark navy) */}
      {hasLocationSection && (
        <section id="location" className="py-16 sm:py-[90px] bg-[#240A1B] text-white">
          <div className="w-[min(1160px,90%)] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            <div className="lg:col-span-5">
              <span className="block text-[11px] tracking-[2px] font-bold text-[#F3C98B] uppercase mb-4">
                LOCATION ADVANTAGE &amp; ROUTE MAP
              </span>
              <h2
                style={HEADING_FONT}
                className="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1.2px] leading-[1.18] text-white"
              >
                A Location That Keeps You <span className="text-[#F3C98B]">Connected.</span>
              </h2>
              <p className="text-[14px] text-[#DECED8] mt-3 leading-relaxed">
                {project.routeMap.locationDescription ||
                  project.routeMap.address ||
                  `Situated at ${project.location}.`}
              </p>

              {project.locationAdvantages.length > 0 && (
                <div className="mt-6">
                  {project.locationAdvantages.map((adv) => (
                    <div
                      key={adv.id}
                      className="flex items-start justify-between gap-3 py-3.5 border-b border-white/15"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-9 h-9 bg-[#38122B] text-[#F3C98B] grid place-items-center shrink-0">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <div>
                          <strong className="block text-[13px] font-semibold text-white">
                            {adv.name}
                          </strong>
                          <small className="block text-[11px] text-[#D3C0CC]">
                            {[adv.category, adv.travelTime].filter(Boolean).join(' · ')}
                          </small>
                        </div>
                      </div>
                      {adv.googleMapsUrl && (
                        <a
                          href={adv.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-[#F3C98B] hover:underline shrink-0 mt-1"
                        >
                          Map ↗
                        </a>
                      )}
                    </div>
                  ))}
                  <p className="text-[11px] text-[#B9A4B1] mt-3">
                    Travel-time figures are project-provided estimates and not independently verified.
                  </p>
                </div>
              )}

              {project.routeMap.googleMapsUrl && (
                <a
                  href={project.routeMap.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 mt-6 bg-[#9B0B5E] hover:bg-[#7A084A] text-white text-[13px] font-bold transition-all"
                >
                  <Route className="w-4 h-4" />
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            <div className="lg:col-span-7 space-y-5">
              {project.routeMap.image?.url && (
                <div className="border-[7px] border-white/10 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      openImageLightbox(
                        project.routeMap.image!,
                        project.routeMap.image?.title || `${project.name} Route Map`
                      )
                    }
                    className="block w-full text-left group"
                  >
                    <img
                      src={project.routeMap.image.url}
                      alt={
                        project.routeMap.image.altText ||
                        project.routeMap.image.title ||
                        `${project.name} Route Map`
                      }
                      referrerPolicy="no-referrer"
                      className="w-full max-h-[420px] object-contain bg-white transition-transform duration-300 group-hover:scale-[1.01]"
                    />
                    <div className="px-4 py-3 bg-[#38122B] text-white flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold">
                        {project.routeMap.image.title ||
                          project.routeMap.image.caption ||
                          `${project.name} Route Map`}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[#F3C98B] shrink-0">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Click to enlarge</span>
                      </span>
                    </div>
                  </button>
                </div>
              )}

              {project.routeMap.qrCode?.url && (
                <div className="bg-[#38122B] border border-white/15 p-5 flex flex-col sm:flex-row items-center gap-5">
                  <button
                    type="button"
                    onClick={() =>
                      openImageLightbox(
                        project.routeMap.qrCode!,
                        `${project.name} Location QR Code`
                      )
                    }
                    className="bg-white p-2.5 shrink-0 hover:ring-2 hover:ring-[#F3C98B] transition-all"
                  >
                    <img
                      src={project.routeMap.qrCode.url}
                      alt={`${project.name} Location QR Code`}
                      referrerPolicy="no-referrer"
                      className="w-28 h-28 object-contain"
                    />
                  </button>
                  <div className="text-center sm:text-left">
                    <div className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[1.5px] text-[#F3C98B]">
                      <QrCode className="w-4 h-4" />
                      <span>SCAN FOR LOCATION</span>
                    </div>
                    <p className="text-xs text-[#E9DAE3] mt-1.5 leading-relaxed">
                      Scan with your mobile camera for direct navigation directions to {project.name}.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 10. LAYOUT PLAN, KEY PLAN & PROJECT DOCUMENTS (.light) */}
      {hasDocuments && (
        <section id="plans" className="py-16 sm:py-[90px] bg-[#FAF5F8]">
          <div className="w-[min(1160px,90%)] mx-auto space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div>
                <span className="block text-[11px] tracking-[2px] font-bold text-[#9B0B5E] uppercase mb-4">
                  PLAN YOUR PROPERTY
                </span>
                <h2
                  style={HEADING_FONT}
                  className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.2px] leading-[1.18] text-[#240A1B]"
                >
                  Explore The <span className="text-[#9B0B5E]">Layout Plan.</span>
                </h2>
                <p className="text-[14px] text-[#63555D] mt-3 leading-relaxed">
                  {layoutPlan?.description ||
                    keyPlan?.description ||
                    'View the official project layout plan, plot dimensions, internal road widths, and supporting documents.'}
                </p>

                <div className="flex flex-wrap gap-3 mt-6">
                  {layoutPlan && (
                    <a
                      href={layoutPlan.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#9B0B5E] hover:bg-[#7A084A] text-white text-[13px] font-bold transition-all"
                    >
                      <span>View {layoutPlan.name || 'Layout Plan'}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </a>
                  )}
                  {brochure && (
                    <a
                      href={brochure.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#240A1B] hover:bg-[#38122B] text-white text-[13px] font-bold transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Brochure</span>
                    </a>
                  )}
                </div>
              </div>

              {(layoutPlan || keyPlan) && (
                <div className="p-3 bg-white shadow-xl border border-[#EAE1E6]">
                  {(() => {
                    const primaryPlan = layoutPlan && !isPdfAsset(layoutPlan) ? layoutPlan : keyPlan;
                    if (!primaryPlan || isPdfAsset(primaryPlan)) return null;
                    return (
                      <button
                        type="button"
                        onClick={() =>
                          setLightbox({
                            url: primaryPlan.url,
                            title: primaryPlan.name,
                            caption: primaryPlan.description,
                          })
                        }
                        className="block w-full text-left group"
                      >
                        <img
                          src={primaryPlan.url}
                          alt={primaryPlan.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-[320px] sm:h-[380px] object-contain bg-white"
                        />
                        <div className="pt-2.5 flex items-center justify-between text-xs text-[#63555D]">
                          <span className="font-semibold text-[#240A1B]">{primaryPlan.name}</span>
                          <span className="inline-flex items-center gap-1 text-[#9B0B5E] font-semibold">
                            <Maximize2 className="w-3.5 h-3.5" />
                            <span>Enlarge</span>
                          </span>
                        </div>
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>

            {(keyPlan || brochure || visibleApprovalDocs.length > 0 || visibleAdditionalPdfs.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {[
                  ...(keyPlan ? [keyPlan] : []),
                  ...(brochure ? [brochure] : []),
                  ...visibleApprovalDocs,
                  ...visibleAdditionalPdfs,
                ].map((docItem) => (
                  <a
                    key={docItem.id}
                    href={docItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-5 bg-white border border-[#EAE1E6] hover:border-[#9B0B5E] flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="p-2.5 bg-[#F7E8F1] text-[#9B0B5E] shrink-0">
                        <FileText className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#240A1B] truncate">
                          {docItem.name}
                        </p>
                        {docItem.description && (
                          <p className="text-[11px] text-[#63555D] truncate mt-0.5">
                            {docItem.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-[#9B0B5E] shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 11. PROJECT GALLERY (MAIN ENTRANCE + SITE 1 + SITE 2 + ADDITIONAL GALLERY) */}
      {combinedGalleryFigures.length > 0 && (
        <section id="gallery" className="py-16 sm:py-[90px] bg-white">
          <div className="w-[min(1160px,90%)] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="block text-[11px] tracking-[2px] font-bold text-[#9B0B5E] uppercase mb-3">
                  PROJECT GALLERY
                </span>
                <h2
                  style={HEADING_FONT}
                  className="text-[clamp(28px,4vw,44px)] font-extrabold tracking-[-1.2px] leading-[1.18] text-[#240A1B]"
                >
                  Take A Closer <span className="text-[#9B0B5E]">Look.</span>
                </h2>
              </div>
              <p className="text-[13px] text-[#63555D]">
                Click any project image to view full resolution.
              </p>
            </div>

            {combinedGalleryFigures.length >= 3 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr] auto-rows-[210px] sm:auto-rows-[220px] gap-3">
                {combinedGalleryFigures.map((item, idx) => (
                  <button
                    key={`${item.asset.url}-${idx}`}
                    type="button"
                    onClick={() => openImageLightbox(item.asset, item.label)}
                    className={`group relative overflow-hidden bg-[#240A1B] text-left ${
                      idx === 0 ? 'sm:col-span-2 lg:col-span-1 lg:row-span-2' : ''
                    }`}
                  >
                    <img
                      src={item.asset.url}
                      alt={item.asset.altText || item.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
                    <span className="absolute bottom-3.5 left-4 right-4 text-white text-xs font-bold flex items-center justify-between gap-2">
                      <span className="truncate">{item.label}</span>
                      <Maximize2 className="w-3.5 h-3.5 shrink-0 opacity-85" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 ${
                  combinedGalleryFigures.length === 2 ? 'md:grid-cols-2' : 'max-w-3xl'
                } gap-4`}
              >
                {combinedGalleryFigures.map((item, idx) => (
                  <button
                    key={`${item.asset.url}-${idx}`}
                    type="button"
                    onClick={() => openImageLightbox(item.asset, item.label)}
                    className="group relative overflow-hidden bg-[#240A1B] text-left aspect-[16/10]"
                  >
                    <img
                      src={item.asset.url}
                      alt={item.asset.altText || item.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
                    <span className="absolute bottom-3.5 left-4 right-4 text-white text-xs font-bold flex items-center justify-between gap-2">
                      <span className="truncate">{item.label}</span>
                      <Maximize2 className="w-3.5 h-3.5 shrink-0 opacity-85" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 12. ENQUIRY FORM & ADVISORY CONTACT SECTION (.dark navy) */}
      <section id="enquiry" className="py-16 sm:py-[90px] bg-[#240A1B] text-white">
        <div className="w-[min(1160px,90%)] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <span className="block text-[11px] tracking-[2px] font-bold text-[#F3C98B] uppercase mb-4">
              LET&apos;S FIND YOUR DREAM PLOT
            </span>
            <h2
              style={HEADING_FONT}
              className="text-[clamp(30px,4vw,44px)] font-extrabold tracking-[-1.2px] leading-[1.15] text-white"
            >
              Your Future Starts With{' '}
              <span className="text-[#F3C98B]">One Conversation.</span>
            </h2>
            <p className="text-[14px] text-[#DECED8] mt-4 leading-relaxed max-w-md">
              Interested in {project.name}? Share your details and our advisory desk will assist with plot availability, pricing schedules, documents, and guided site visits.
            </p>

            <div className="mt-7 divide-y divide-white/15">
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex items-center gap-3.5 py-4 hover:text-[#F3C98B] transition-colors"
                >
                  <span className="w-10 h-10 bg-[#38122B] text-[#F3C98B] grid place-items-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </span>
                  <div>
                    <small className="block text-[10px] tracking-[1px] text-[#D3C0CC] uppercase">
                      CALL OUR TEAM
                    </small>
                    <strong className="text-sm text-white">{contactPhone}</strong>
                  </div>
                </a>
              )}

              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex items-center gap-3.5 py-4 hover:text-[#F3C98B] transition-colors"
                >
                  <span className="w-10 h-10 bg-[#38122B] text-[#F3C98B] grid place-items-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </span>
                  <div>
                    <small className="block text-[10px] tracking-[1px] text-[#D3C0CC] uppercase">
                      EMAIL ADVISORY DESK
                    </small>
                    <strong className="text-sm text-white">{contactEmail}</strong>
                  </div>
                </a>
              )}

              {contactAddress && (
                <div className="flex items-start gap-3.5 py-4">
                  <span className="w-10 h-10 bg-[#38122B] text-[#F3C98B] grid place-items-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <div>
                    <small className="block text-[10px] tracking-[1px] text-[#D3C0CC] uppercase">
                      SITE LOCATION
                    </small>
                    <strong className="text-xs sm:text-sm font-medium text-[#F2EAF0] leading-relaxed">
                      {contactAddress}
                    </strong>
                    {project.routeMap.googleMapsUrl && (
                      <a
                        href={project.routeMap.googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#F3C98B] hover:underline mt-1.5"
                      >
                        <span>Open in Google Maps</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white text-[#240A1B] p-7 sm:p-9 shadow-xl">
            {submittedRef ? (
              <div className="text-center py-8 space-y-3">
                <CheckCircle2 className="w-11 h-11 text-[#9B0B5E] mx-auto" />
                <h3 style={HEADING_FONT} className="text-xl font-bold text-[#240A1B]">
                  Enquiry Submitted
                </h3>
                <p className="text-xs text-[#63555D]">
                  Reference: <span className="font-mono font-bold text-[#240A1B]">{submittedRef}</span>
                </p>
                <p className="text-xs text-[#63555D] leading-relaxed max-w-sm mx-auto">
                  Thank you for your interest in {project.name}. Our team will get in touch with you shortly.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmittedRef(null)}
                  className="mt-3 px-5 py-2.5 text-xs font-bold bg-[#240A1B] text-white hover:bg-[#38122B] transition-colors"
                >
                  Send Another Enquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnquirySubmit}>
                <h3 style={HEADING_FONT} className="text-[22px] font-bold text-[#240A1B]">
                  Enquire About {project.name}
                </h3>
                <p className="text-[12px] text-[#63555D] mt-1.5 mb-5">
                  Fill in your details and our team will contact you with complete project information.
                </p>

                {formError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700">
                    {formError}
                  </div>
                )}

                <label htmlFor="proj-enq-name" className="block text-[11px] font-bold mt-3 mb-1.5">
                  Full Name *
                </label>
                <input
                  ref={nameInputRef}
                  id="proj-enq-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full p-3 border border-[#EAE1E6] bg-[#FAF8F9] text-[13px] focus:outline-none focus:border-[#9B0B5E]"
                />

                <label htmlFor="proj-enq-phone" className="block text-[11px] font-bold mt-3.5 mb-1.5">
                  Mobile Number *
                </label>
                <input
                  id="proj-enq-phone"
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Enter your mobile number"
                  className="w-full p-3 border border-[#EAE1E6] bg-[#FAF8F9] text-[13px] focus:outline-none focus:border-[#9B0B5E]"
                />

                <label htmlFor="proj-enq-email" className="block text-[11px] font-bold mt-3.5 mb-1.5">
                  Email Address
                </label>
                <input
                  id="proj-enq-email"
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full p-3 border border-[#EAE1E6] bg-[#FAF8F9] text-[13px] focus:outline-none focus:border-[#9B0B5E]"
                />

                <label htmlFor="proj-enq-type" className="block text-[11px] font-bold mt-3.5 mb-1.5">
                  Interested In
                </label>
                <select
                  id="proj-enq-type"
                  value={enquiryCategory}
                  onChange={(e) => setEnquiryCategory(e.target.value)}
                  className="w-full p-3 border border-[#EAE1E6] bg-[#FAF8F9] text-[13px] focus:outline-none focus:border-[#9B0B5E]"
                >
                  {ENQUIRY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <label htmlFor="proj-enq-msg" className="block text-[11px] font-bold mt-3.5 mb-1.5">
                  Message *
                </label>
                <textarea
                  id="proj-enq-msg"
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Share preferred plot size or site visit plan for ${project.name}...`}
                  className="w-full p-3 border border-[#EAE1E6] bg-[#FAF8F9] text-[13px] min-h-[84px] focus:outline-none focus:border-[#9B0B5E]"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-5 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-60 text-white text-[13px] font-bold transition-all"
                >
                  <span>{submitting ? 'Submitting Enquiry...' : 'Submit Enquiry'}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
                <small className="block text-[#877680] text-[10px] mt-2.5">
                  Your contact information is used solely by PRIME HOUSING to respond to your enquiry.
                </small>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* STICKY MOBILE BOTTOM ACTION BAR */}
      {!isPreview && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid grid-cols-2 shadow-[0_-4px_18px_rgba(0,0,0,0.14)]">
          {contactPhone ? (
            <a
              href={`tel:${contactPhone}`}
              className="py-3.5 text-center text-[13px] font-bold bg-white text-[#240A1B] border-t border-[#EAE1E6]"
            >
              Call Now
            </a>
          ) : project.routeMap.googleMapsUrl ? (
            <a
              href={project.routeMap.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 text-center text-[13px] font-bold bg-white text-[#240A1B] border-t border-[#EAE1E6]"
            >
              Google Maps
            </a>
          ) : (
            <Link
              to="/contact"
              className="py-3.5 text-center text-[13px] font-bold bg-white text-[#240A1B] border-t border-[#EAE1E6]"
            >
              Contact Us
            </Link>
          )}
          <a
            href="#enquiry"
            className="py-3.5 text-center text-[13px] font-bold bg-[#9B0B5E] text-white"
          >
            Enquire Now ↗
          </a>
        </div>
      )}

      {/* IMAGE ZOOM LIGHTBOX MODAL */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-white overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[#EAE1E6] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#240A1B] truncate">{lightbox.title}</h3>
                {lightbox.caption && (
                  <p className="text-xs text-[#63555D] truncate">{lightbox.caption}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Close image preview"
                className="p-1.5 text-[#63555D] hover:bg-[#FAF5F8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-[#240A1B] flex items-center justify-center">
              <img
                src={lightbox.url}
                alt={lightbox.title}
                referrerPolicy="no-referrer"
                className="max-h-[80vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
