import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type {
  Project,
  ProjectAmenity,
  ProjectDocumentAsset,
  ProjectHighlight,
  ProjectImageAsset,
  ProjectLocationAdvantage,
  ProjectNearbyPlace,
  ProjectNearbyPlaces,
  ProjectOverviewBlock,
  ProjectStatus,
} from '../types/realEstate';
import { createEmptyNearbyPlaces, createEmptyProject } from '../data/initialProjects';
import { slugifyProjectName } from '../services/projectService';
import { deleteStorageFile, uploadProjectAsset } from '../services/storageService';
import { PROJECT_ICON_OPTIONS, ProjectIcon } from './ProjectIcon';

type TabKey =
  | 'basic'
  | 'overview'
  | 'features_nearby'
  | 'pricing'
  | 'images'
  | 'routemap'
  | 'documents'
  | 'publish';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'basic', label: '1. Basic Info' },
  { key: 'overview', label: '2. Overview' },
  { key: 'features_nearby', label: '3. Highlights & Nearby' },
  { key: 'pricing', label: '4. Pricing & Plots' },
  { key: 'images', label: '5. Images' },
  { key: 'routemap', label: '6. Route & QR' },
  { key: 'documents', label: '7. Plans & Docs' },
  { key: 'publish', label: '8. Publish' },
];

const NEARBY_GROUPS: { key: keyof ProjectNearbyPlaces; label: string }[] = [
  { key: 'schools', label: 'Schools' },
  { key: 'colleges', label: 'Colleges' },
  { key: 'hospitals', label: 'Hospitals' },
  { key: 'shoppingCentres', label: 'Shopping Centres' },
  { key: 'supermarkets', label: 'Supermarkets' },
  { key: 'railwayStations', label: 'Railway Stations' },
  { key: 'busTerminals', label: 'Bus Terminals' },
  { key: 'landmarks', label: 'Important Landmarks' },
];

function makeId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function swapItems<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const nextIdx = idx + dir;
  if (nextIdx < 0 || nextIdx >= arr.length) return arr;
  const copy = [...arr];
  const temp = copy[idx];
  copy[idx] = copy[nextIdx];
  copy[nextIdx] = temp;
  return copy;
}

interface ProjectFormModalProps {
  open: boolean;
  heading: string;
  initialProject?: Project | null;
  onSave: (projectData: Project, previousProject: Project | null) => Promise<void>;
  onPreview: (draftProject: Project) => void;
  onClose: () => void;
}

function SingleImageUploader({
  label,
  helper,
  asset,
  slotKey,
  uploadingSlot,
  uploadProgress,
  showTitleField = false,
  showDescriptionField = false,
  showCaptionField = true,
  showAltField = true,
  onUpload,
  onChangeAsset,
  onDelete,
}: {
  label: string;
  helper?: string;
  asset: ProjectImageAsset | null;
  slotKey: string;
  uploadingSlot: string | null;
  uploadProgress: number;
  showTitleField?: boolean;
  showDescriptionField?: boolean;
  showCaptionField?: boolean;
  showAltField?: boolean;
  onUpload: (file: File) => void;
  onChangeAsset: (updated: ProjectImageAsset) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingSlot === slotKey;

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-[#1C1F1E]">{label}</h4>
          {helper && <p className="text-[11px] text-[#646B67]">{helper}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            disabled={Boolean(uploadingSlot)}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-50 rounded-lg"
          >
            {asset?.url ? <RefreshCw className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
            <span>{asset?.url ? 'Replace Image' : 'Upload Image'}</span>
          </button>
          {asset?.url && (
            <button
              type="button"
              disabled={Boolean(uploadingSlot)}
              onClick={onDelete}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#9B0B5E] font-medium">
            <span>Uploading to Firebase Storage...</span>
            <span className="tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#EAE1E6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#9B0B5E] transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {asset?.url ? (
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
          <div className="sm:col-span-5 rounded-lg overflow-hidden border border-[#EAE1E6] bg-white aspect-[4/3]">
            <img
              src={asset.url}
              alt={asset.altText || label}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain bg-white"
            />
          </div>
          <div className="sm:col-span-7 space-y-2">
            {showTitleField && (
              <div>
                <label className="block text-[11px] font-medium text-[#3D4340] mb-0.5">
                  Image Title
                </label>
                <input
                  type="text"
                  value={asset.title || ''}
                  onChange={(e) => onChangeAsset({ ...asset, title: e.target.value })}
                  placeholder="Enter title..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            )}
            {showCaptionField && (
              <div>
                <label className="block text-[11px] font-medium text-[#3D4340] mb-0.5">
                  Caption
                </label>
                <input
                  type="text"
                  value={asset.caption || ''}
                  onChange={(e) => onChangeAsset({ ...asset, caption: e.target.value })}
                  placeholder="Enter caption..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            )}
            {showAltField && (
              <div>
                <label className="block text-[11px] font-medium text-[#3D4340] mb-0.5">
                  Alt Text (SEO &amp; Accessibility)
                </label>
                <input
                  type="text"
                  value={asset.altText || ''}
                  onChange={(e) => onChangeAsset({ ...asset, altText: e.target.value })}
                  placeholder="Describe this photograph..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            )}
            {showDescriptionField && (
              <div>
                <label className="block text-[11px] font-medium text-[#3D4340] mb-0.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={asset.description || ''}
                  onChange={(e) => onChangeAsset({ ...asset, description: e.target.value })}
                  placeholder="Optional description..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#646B67]">
          No image uploaded yet. Select a JPG, PNG, or WebP file (max 5 MB) from your computer or phone.
        </p>
      )}
    </div>
  );
}

function SingleDocumentUploader({
  label,
  helper,
  docAsset,
  slotKey,
  acceptKind,
  uploadingSlot,
  uploadProgress,
  onUpload,
  onChangeDoc,
  onDelete,
}: {
  label: string;
  helper?: string;
  docAsset: ProjectDocumentAsset | null;
  slotKey: string;
  acceptKind: 'document' | 'pdf';
  uploadingSlot: string | null;
  uploadProgress: number;
  onUpload: (file: File) => void;
  onChangeDoc: (updated: ProjectDocumentAsset) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingSlot === slotKey;

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  };

  return (
    <div className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-[#1C1F1E]">{label}</h4>
          {helper && <p className="text-[11px] text-[#646B67]">{helper}</p>}
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={
              acceptKind === 'pdf'
                ? 'application/pdf'
                : 'application/pdf,image/jpeg,image/png,image/webp'
            }
            onChange={handleFile}
            className="hidden"
          />
          <button
            type="button"
            disabled={Boolean(uploadingSlot)}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-50 rounded-lg"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{docAsset?.url ? 'Replace File' : 'Upload File'}</span>
          </button>
          {docAsset?.url && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-[#9B0B5E] font-medium">
            <span>Uploading file...</span>
            <span className="tabular-nums">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-[#EAE1E6] rounded-full overflow-hidden">
            <div className="h-full bg-[#9B0B5E]" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {docAsset?.url ? (
        <div className="space-y-3 bg-white p-3.5 rounded-lg border border-[#EAE1E6]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <a
              href={docAsset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9B0B5E] hover:underline"
            >
              <FileText className="w-4 h-4" />
              <span>Preview / Open Uploaded File</span>
            </a>
            <label className="inline-flex items-center gap-1.5 text-xs text-[#3D4340] cursor-pointer">
              <input
                type="checkbox"
                checked={docAsset.visible !== false}
                onChange={(e) => onChangeDoc({ ...docAsset, visible: e.target.checked })}
                className="w-3.5 h-3.5 accent-[#9B0B5E]"
              />
              <span>Visible on Public Page</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-[#3D4340] mb-0.5">
                Document Name
              </label>
              <input
                type="text"
                value={docAsset.name}
                onChange={(e) => onChangeDoc({ ...docAsset, name: e.target.value })}
                className="w-full px-3 py-1.5 text-xs border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#3D4340] mb-0.5">
                Description
              </label>
              <input
                type="text"
                value={docAsset.description || ''}
                onChange={(e) => onChangeDoc({ ...docAsset, description: e.target.value })}
                placeholder="Optional document notes..."
                className="w-full px-3 py-1.5 text-xs border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-[#646B67]">No file uploaded yet.</p>
      )}
    </div>
  );
}

export function ProjectFormModal({
  open,
  heading,
  initialProject,
  onSave,
  onPreview,
  onClose,
}: ProjectFormModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('basic');
  const [draftId, setDraftId] = useState('');
  const [form, setForm] = useState<Project>(() => ({
    ...createEmptyProject(),
    id: '',
    createdAt: '',
    updatedAt: '',
  }));
  const [slugTouched, setSlugTouched] = useState(false);

  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadNotice, setUploadNotice] = useState('');
  const [error, setError] = useState('');
  const [savingAction, setSavingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActiveTab('basic');
    setError('');
    setUploadNotice('');
    setUploadingSlot(null);
    setUploadProgress(0);

    if (initialProject) {
      setDraftId(initialProject.id);
      setSlugTouched(true);
      setForm({
        ...createEmptyProject(),
        ...initialProject,
        nearbyPlaces: {
          ...createEmptyNearbyPlaces(),
          ...(initialProject.nearbyPlaces || {}),
        },
        images: {
          heroImage: initialProject.images?.heroImage || null,
          entranceImage: initialProject.images?.entranceImage || null,
          siteImage1: initialProject.images?.siteImage1 || null,
          siteImage2: initialProject.images?.siteImage2 || null,
          gallery: [...(initialProject.images?.gallery || [])],
        },
        routeMap: {
          image: initialProject.routeMap?.image || null,
          qrCode: initialProject.routeMap?.qrCode || null,
          googleMapsUrl: initialProject.routeMap?.googleMapsUrl || '',
          address: initialProject.routeMap?.address || '',
          locationDescription: initialProject.routeMap?.locationDescription || '',
        },
        documents: {
          layoutPlan: initialProject.documents?.layoutPlan || null,
          keyPlan: initialProject.documents?.keyPlan || null,
          brochure: initialProject.documents?.brochure || null,
          approvalDocuments: [...(initialProject.documents?.approvalDocuments || [])],
          additionalPdfs: [...(initialProject.documents?.additionalPdfs || [])],
        },
        seo: {
          title: initialProject.seo?.title || '',
          metaDescription: initialProject.seo?.metaDescription || '',
          slug: initialProject.seo?.slug || initialProject.slug || '',
          ogImage: initialProject.seo?.ogImage || '',
          ogImageAlt: initialProject.seo?.ogImageAlt || '',
        },
      });
    } else {
      const freshId = `proj-${Date.now()}`;
      setDraftId(freshId);
      setSlugTouched(false);
      setForm({
        ...createEmptyProject(),
        id: freshId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [open, initialProject]);

  if (!open) return null;

  const projectStorageId =
    form.id || slugifyProjectName(form.slug || form.name) || draftId || `proj-${Date.now()}`;

  const runAssetUpload = async (
    slotKey: string,
    folderCategory: string,
    kind: 'image' | 'document' | 'pdf',
    file: File,
    onDone: (res: { downloadUrl: string; storagePath: string }) => void
  ) => {
    setError('');
    setUploadNotice('');
    setUploadingSlot(slotKey);
    setUploadProgress(0);
    try {
      const res = await uploadProjectAsset(
        file,
        projectStorageId,
        folderCategory,
        kind,
        (pct: number) => setUploadProgress(pct)
      );
      onDone(res);
      setUploadNotice(`Uploaded "${file.name}" successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed.');
    } finally {
      setUploadingSlot(null);
      setUploadProgress(0);
    }
  };

  const handleDeleteSlotAsset = async (
    currentAsset: { storagePath?: string; url?: string } | null | undefined,
    clearFn: () => void
  ) => {
    // Only delete immediately if it wasn't part of the already-saved initialProject (onSave handles diff cleanup safely)
    const oldPath = currentAsset?.storagePath;
    if (oldPath && !initialProject) {
      await deleteStorageFile(oldPath).catch(() => undefined);
    }
    clearFn();
  };

  const handleGalleryUploadMultiple = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setError('');
    setUploadNotice('');

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      setUploadingSlot('gallery');
      setUploadProgress(0);
      try {
        const res = await uploadProjectAsset(file, projectStorageId, 'gallery', 'image', (pct: number) =>
          setUploadProgress(pct)
        );
        const item: ProjectImageAsset = {
          id: makeId('gal'),
          url: res.downloadUrl,
          storagePath: res.storagePath,
          caption: '',
          altText: `${form.name || 'Project'} gallery image`,
          description: '',
          visible: true,
          featured: false,
        };
        setForm((prev) => ({
          ...prev,
          images: {
            ...prev.images,
            gallery: [...prev.images.gallery, item],
          },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload ${file.name}.`);
      }
    }
    setUploadingSlot(null);
    setUploadProgress(0);
    setUploadNotice(`Uploaded ${files.length} gallery image(s).`);
  };

  const handleMultiDocUpload = async (
    e: ChangeEvent<HTMLInputElement>,
    targetList: 'approvalDocuments' | 'additionalPdfs',
    kind: 'document' | 'pdf'
  ) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;
    setError('');
    setUploadNotice('');

    for (const file of files) {
      setUploadingSlot(targetList);
      setUploadProgress(0);
      try {
        const res = await uploadProjectAsset(file, projectStorageId, 'documents', kind, (pct: number) =>
          setUploadProgress(pct)
        );
        const docItem: ProjectDocumentAsset = {
          id: makeId('doc'),
          name: file.name.replace(/\.[^.]+$/, ''),
          description: '',
          url: res.downloadUrl,
          storagePath: res.storagePath,
          fileType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image'),
          visible: true,
        };
        setForm((prev) => ({
          ...prev,
          documents: {
            ...prev.documents,
            [targetList]: [...prev.documents[targetList], docItem],
          },
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload ${file.name}.`);
      }
    }
    setUploadingSlot(null);
    setUploadProgress(0);
    setUploadNotice(`Uploaded ${files.length} document(s).`);
  };

  const handleSaveWithStatus = async (nextStatus?: ProjectStatus, actionLabel = 'save') => {
    if (savingAction || uploadingSlot) return;
    setError('');

    if (!form.name.trim()) {
      setActiveTab('basic');
      setError('Project Name is required before saving.');
      return;
    }

    const finalSlug = slugifyProjectName(form.slug || form.seo.slug || form.name) || projectStorageId;
    const statusToSave = nextStatus || form.status || 'draft';

    const payload: Project = {
      ...form,
      id: projectStorageId,
      slug: finalSlug,
      status: statusToSave,
      seo: {
        ...form.seo,
        slug: finalSlug,
      },
    };

    setSavingAction(actionLabel);
    try {
      await onSave(payload, initialProject || null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save project.');
    } finally {
      setSavingAction(null);
    }
  };

  const buildPreviewProject = (): Project => {
    const finalSlug = slugifyProjectName(form.slug || form.seo.slug || form.name) || projectStorageId;
    return {
      ...form,
      id: projectStorageId,
      slug: finalSlug,
    };
  };

  const updateName = (val: string) => {
    setForm((prev) => {
      const nextSlug = !slugTouched ? slugifyProjectName(val) : prev.slug;
      return {
        ...prev,
        name: val,
        slug: nextSlug,
        seo: { ...prev.seo, slug: nextSlug },
      };
    });
  };

  const updateSlug = (val: string) => {
    setSlugTouched(true);
    const clean = slugifyProjectName(val);
    setForm((prev) => ({
      ...prev,
      slug: val,
      seo: { ...prev.seo, slug: clean },
    }));
  };

  const addNearbyPlace = (groupKey: keyof ProjectNearbyPlaces) => {
    const entry: ProjectNearbyPlace = { id: makeId(groupKey), name: '', distanceOrTime: '', notes: '' };
    setForm((prev) => ({
      ...prev,
      nearbyPlaces: {
        ...prev.nearbyPlaces,
        [groupKey]: [...prev.nearbyPlaces[groupKey], entry],
      },
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#1D0816]/70">
      <div className="w-full max-w-5xl bg-white border border-[#EAE1E6] rounded-xl shadow-2xl flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#EAE1E6] flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-xl sm:text-2xl font-medium text-[#1C1F1E] truncate">
              {heading}
            </h2>
            <p className="text-xs text-[#646B67] truncate">
              {form.name ? `${form.name} (/projects/${form.slug || slugifyProjectName(form.name) || 'slug'})` : 'Configure all sections for this project'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onPreview(buildPreviewProject())}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close project editor"
              className="p-1.5 rounded-lg text-[#646B67] hover:bg-[#FAF8F9]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 12-Tab Strip */}
        <div className="px-4 py-2.5 bg-[#FAF8F9] border-b border-[#EAE1E6] flex items-center gap-1.5 overflow-x-auto shrink-0">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                activeTab === t.key
                  ? 'bg-[#9B0B5E] text-white'
                  : 'bg-white text-[#3D4340] border border-[#EAE1E6] hover:bg-[#F7E8F1]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Notifications */}
        {(error || uploadNotice) && (
          <div className="px-5 pt-3 shrink-0 space-y-2">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}
            {uploadNotice && (
              <div className="p-3 rounded-lg bg-[#F7E8F1] border border-[#9B0B5E]/20 text-xs text-[#9B0B5E]">
                {uploadNotice}
              </div>
            )}
          </div>
        )}

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Project Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateName(e.target.value)}
                  placeholder="e.g., THANGARAJ CITY"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Project URL Slug
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => updateSlug(e.target.value)}
                  placeholder="thangaraj-city"
                  className="w-full px-3.5 py-2 text-sm font-mono border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Project Category
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Residential Plots"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Property Type
                </label>
                <input
                  type="text"
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                  placeholder="Residential Plots / Villa Plots"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Plot View Link (Interactive Plot Map URL)
                </label>
                <input
                  type="url"
                  value={form.plotViewUrl || ''}
                  onChange={(e) => setForm({ ...form, plotViewUrl: e.target.value })}
                  placeholder="https://thangarajcity.velken.land/"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Project Location
                </label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Chengalpattu – Kalpakkam Road, Nemmel(i), Tamil Nadu"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Full Address &amp; Landmark Reference
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Behind City Union Bank & Indian Oil Petrol Bunk..."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Approval Type
                </label>
                <input
                  type="text"
                  value={form.approvalType}
                  onChange={(e) => setForm({ ...form, approvalType: e.target.value })}
                  placeholder="e.g., DTCP Approved"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Approval Number
                  </label>
                  <input
                    type="text"
                    value={form.approvalNumber}
                    onChange={(e) => setForm({ ...form, approvalNumber: e.target.value })}
                    placeholder="Optional"
                    className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    RERA Number
                  </label>
                  <input
                    type="text"
                    value={form.reraNumber}
                    onChange={(e) => setForm({ ...form, reraNumber: e.target.value })}
                    placeholder="If applicable"
                    className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Project Stage / Status Label
                </label>
                <input
                  type="text"
                  value={form.projectStatusLabel}
                  onChange={(e) => setForm({ ...form, projectStatusLabel: e.target.value })}
                  placeholder="e.g., Ready for Registration / Ongoing"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Starting Price (leave blank if unconfirmed)
                </label>
                <input
                  type="text"
                  value={form.startingPrice}
                  onChange={(e) => setForm({ ...form, startingPrice: e.target.value })}
                  placeholder="e.g., ₹24 Lakhs onwards"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 sm:col-span-2">
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Total Plots
                  </label>
                  <input
                    type="text"
                    value={form.totalPlots}
                    onChange={(e) => setForm({ ...form, totalPlots: e.target.value })}
                    placeholder="e.g., 65"
                    className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Available Plots
                  </label>
                  <input
                    type="text"
                    value={form.availablePlots}
                    onChange={(e) => setForm({ ...form, availablePlots: e.target.value })}
                    placeholder="e.g., 42"
                    className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Plot Sizes
                  </label>
                  <input
                    type="text"
                    value={form.plotSizes}
                    onChange={(e) => setForm({ ...form, plotSizes: e.target.value })}
                    placeholder="e.g., 843 – 2465 Sq. Ft."
                    className="w-full px-3 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Short Description (Hero Summary)
                </label>
                <textarea
                  rows={2}
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  placeholder="Concise summary shown in the project hero banner..."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Full Description
                </label>
                <textarea
                  rows={4}
                  value={form.fullDescription}
                  onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
                  placeholder="Complete project narrative..."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: PROJECT OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Overview Section Heading
                  </label>
                  <input
                    type="text"
                    value={form.overviewHeading}
                    onChange={(e) => setForm({ ...form, overviewHeading: e.target.value })}
                    placeholder="Project Overview"
                    className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Overview Subheading
                  </label>
                  <input
                    type="text"
                    value={form.overviewSubheading}
                    onChange={(e) => setForm({ ...form, overviewSubheading: e.target.value })}
                    placeholder="Subheading..."
                    className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#1C1F1E]">
                  Overview Content Blocks ({form.overviewParagraphs.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const block: ProjectOverviewBlock = { id: makeId('ov'), heading: '', text: '' };
                    setForm({ ...form, overviewParagraphs: [...form.overviewParagraphs, block] });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Content Block</span>
                </button>
              </div>

              <div className="space-y-3">
                {form.overviewParagraphs.map((block, idx) => (
                  <div key={block.id} className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#646B67]">Block #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, overviewParagraphs: swapItems(form.overviewParagraphs, idx, -1) })
                          }
                          className="p-1 rounded hover:bg-[#EAE1E6]"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({ ...form, overviewParagraphs: swapItems(form.overviewParagraphs, idx, 1) })
                          }
                          className="p-1 rounded hover:bg-[#EAE1E6]"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              overviewParagraphs: form.overviewParagraphs.filter((_, i) => i !== idx),
                            })
                          }
                          className="p-1 rounded text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={block.heading || ''}
                      onChange={(e) => {
                        const copy = [...form.overviewParagraphs];
                        copy[idx] = { ...block, heading: e.target.value };
                        setForm({ ...form, overviewParagraphs: copy });
                      }}
                      placeholder="Optional block heading..."
                      className="w-full px-3 py-1.5 text-sm bg-white border border-[#D7C8D1] rounded-lg"
                    />
                    <textarea
                      rows={3}
                      value={block.text}
                      onChange={(e) => {
                        const copy = [...form.overviewParagraphs];
                        copy[idx] = { ...block, text: e.target.value };
                        setForm({ ...form, overviewParagraphs: copy });
                      }}
                      placeholder="Paragraph text..."
                      className="w-full px-3 py-1.5 text-sm bg-white border border-[#D7C8D1] rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: HIGHLIGHTS, WHY CHOOSE, AMENITIES & NEARBY (CONSOLIDATED) */}
          {activeTab === 'features_nearby' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1F1E]">
                    Project Highlights ({form.highlights.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const hl: ProjectHighlight = {
                        id: makeId('hl'),
                        title: '',
                        description: '',
                        icon: 'CheckCircle2',
                      };
                      setForm({ ...form, highlights: [...form.highlights, hl] });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Highlight</span>
                  </button>
                </div>

                {form.highlights.map((hl, idx) => (
                  <div key={hl.id} className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <ProjectIcon name={hl.icon} className="w-4 h-4 text-[#9B0B5E] shrink-0" />
                      <select
                        value={hl.icon}
                        onChange={(e) => {
                          const copy = [...form.highlights];
                          copy[idx] = { ...hl, icon: e.target.value };
                          setForm({ ...form, highlights: copy });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      >
                        {PROJECT_ICON_OPTIONS.map((ic) => (
                          <option key={ic} value={ic}>
                            {ic}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={hl.title}
                        onChange={(e) => {
                          const copy = [...form.highlights];
                          copy[idx] = { ...hl, title: e.target.value };
                          setForm({ ...form, highlights: copy });
                        }}
                        placeholder="Highlight title"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={hl.description}
                        onChange={(e) => {
                          const copy = [...form.highlights];
                          copy[idx] = { ...hl, description: e.target.value };
                          setForm({ ...form, highlights: copy });
                        }}
                        placeholder="Short description"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, highlights: swapItems(form.highlights, idx, -1) })}
                        className="p-1.5 rounded hover:bg-[#EAE1E6]"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, highlights: swapItems(form.highlights, idx, 1) })}
                        className="p-1.5 rounded hover:bg-[#EAE1E6]"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, highlights: form.highlights.filter((_, i) => i !== idx) })
                        }
                        className="p-1.5 rounded text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-[#EAE1E6] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1F1E]">
                    Why Choose This Project? ({form.whyChooseItems.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const item: ProjectHighlight = {
                        id: makeId('why'),
                        title: '',
                        description: '',
                        icon: 'ShieldCheck',
                      };
                      setForm({ ...form, whyChooseItems: [...form.whyChooseItems, item] });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Reason</span>
                  </button>
                </div>

                {form.whyChooseItems.map((item, idx) => (
                  <div key={item.id} className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <ProjectIcon name={item.icon} className="w-4 h-4 text-[#9B0B5E] shrink-0" />
                      <select
                        value={item.icon}
                        onChange={(e) => {
                          const copy = [...form.whyChooseItems];
                          copy[idx] = { ...item, icon: e.target.value };
                          setForm({ ...form, whyChooseItems: copy });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      >
                        {PROJECT_ICON_OPTIONS.map((ic) => (
                          <option key={ic} value={ic}>
                            {ic}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const copy = [...form.whyChooseItems];
                          copy[idx] = { ...item, title: e.target.value };
                          setForm({ ...form, whyChooseItems: copy });
                        }}
                        placeholder="Heading"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const copy = [...form.whyChooseItems];
                          copy[idx] = { ...item, description: e.target.value };
                          setForm({ ...form, whyChooseItems: copy });
                        }}
                        placeholder="Explanation"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, whyChooseItems: swapItems(form.whyChooseItems, idx, -1) })
                        }
                        className="p-1.5 rounded hover:bg-[#EAE1E6]"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, whyChooseItems: swapItems(form.whyChooseItems, idx, 1) })
                        }
                        className="p-1.5 rounded hover:bg-[#EAE1E6]"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            whyChooseItems: form.whyChooseItems.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1.5 rounded text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 border-t border-[#EAE1E6] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1C1F1E]">
                    Project Amenities ({form.amenities.length})
                  </h3>
                <button
                  type="button"
                  onClick={() => {
                    const am: ProjectAmenity = {
                      id: makeId('am'),
                      name: '',
                      description: '',
                      icon: 'Trees',
                    };
                    setForm({ ...form, amenities: [...form.amenities, am] });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Amenity</span>
                </button>
              </div>

              {form.amenities.map((am, idx) => (
                <div key={am.id} className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-3 flex items-center gap-2">
                      <ProjectIcon name={am.icon} className="w-4 h-4 text-[#9B0B5E] shrink-0" />
                      <select
                        value={am.icon}
                        onChange={(e) => {
                          const copy = [...form.amenities];
                          copy[idx] = { ...am, icon: e.target.value };
                          setForm({ ...form, amenities: copy });
                        }}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      >
                        {PROJECT_ICON_OPTIONS.map((ic) => (
                          <option key={ic} value={ic}>
                            {ic}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={am.name}
                        onChange={(e) => {
                          const copy = [...form.amenities];
                          copy[idx] = { ...am, name: e.target.value };
                          setForm({ ...form, amenities: copy });
                        }}
                        placeholder="Amenity name"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={am.description}
                        onChange={(e) => {
                          const copy = [...form.amenities];
                          copy[idx] = { ...am, description: e.target.value };
                          setForm({ ...form, amenities: copy });
                        }}
                        placeholder="Amenity description"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, amenities: swapItems(form.amenities, idx, -1) })}
                        className="p-1.5 rounded hover:bg-[#EAE1E6]"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, amenities: swapItems(form.amenities, idx, 1) })}
                        className="p-1.5 rounded hover:bg-[#EAE1E6]"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, amenities: form.amenities.filter((_, i) => i !== idx) })
                        }
                        className="p-1.5 rounded text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {am.imageUrl && (
                      <img
                        src={am.imageUrl}
                        alt={am.name}
                        className="w-12 h-12 rounded-lg object-cover border border-[#EAE1E6] bg-white"
                      />
                    )}
                    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg cursor-pointer">
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>{am.imageUrl ? 'Replace Amenity Image' : 'Upload Optional Image'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          runAssetUpload(`amenity-${am.id}`, 'amenities', 'image', file, (res) => {
                            setForm((prev) => {
                              const copy = [...prev.amenities];
                              copy[idx] = {
                                ...copy[idx],
                                imageUrl: res.downloadUrl,
                                storagePath: res.storagePath,
                              };
                              return { ...prev, amenities: copy };
                            });
                          });
                        }}
                      />
                    </label>
                    {am.imageUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          const copy = [...form.amenities];
                          copy[idx] = { ...am, imageUrl: '', storagePath: '' };
                          setForm({ ...form, amenities: copy });
                        }}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Remove image
                      </button>
                    )}
                  </div>
                </div>
              ))}
              </div>

              <div className="pt-6 border-t border-[#EAE1E6] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1F1E]">
                      Location Advantages ({form.locationAdvantages.length})
                    </h3>
                    <p className="text-xs text-[#646B67]">
                      Travel-time estimates are displayed publicly as project-provided estimates.
                    </p>
                  </div>
                <button
                  type="button"
                  onClick={() => {
                    const adv: ProjectLocationAdvantage = {
                      id: makeId('adv'),
                      name: '',
                      category: 'School',
                      travelTime: '',
                      description: '',
                      googleMapsUrl: '',
                    };
                    setForm({ ...form, locationAdvantages: [...form.locationAdvantages, adv] });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Location Advantage</span>
                </button>
              </div>

              {form.locationAdvantages.map((adv, idx) => (
                <div key={adv.id} className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={adv.name}
                        onChange={(e) => {
                          const copy = [...form.locationAdvantages];
                          copy[idx] = { ...adv, name: e.target.value };
                          setForm({ ...form, locationAdvantages: copy });
                        }}
                        placeholder="Nearby location name"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={adv.category}
                        onChange={(e) => {
                          const copy = [...form.locationAdvantages];
                          copy[idx] = { ...adv, category: e.target.value };
                          setForm({ ...form, locationAdvantages: copy });
                        }}
                        placeholder="Category (School, Hospital...)"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={adv.travelTime}
                        onChange={(e) => {
                          const copy = [...form.locationAdvantages];
                          copy[idx] = { ...adv, travelTime: e.target.value };
                          setForm({ ...form, locationAdvantages: copy });
                        }}
                        placeholder="e.g., 5 minutes (estimate)"
                        className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2 flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            locationAdvantages: swapItems(form.locationAdvantages, idx, -1),
                          })
                        }
                        className="p-1.5 rounded hover:bg-[#EAE1E6]"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            locationAdvantages: swapItems(form.locationAdvantages, idx, 1),
                          })
                        }
                        className="p-1.5 rounded hover:bg-[#EAE1E6]"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            locationAdvantages: form.locationAdvantages.filter((_, i) => i !== idx),
                          })
                        }
                        className="p-1.5 rounded text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={adv.description}
                      onChange={(e) => {
                        const copy = [...form.locationAdvantages];
                        copy[idx] = { ...adv, description: e.target.value };
                        setForm({ ...form, locationAdvantages: copy });
                      }}
                      placeholder="Short description..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                    />
                    <input
                      type="url"
                      value={adv.googleMapsUrl || ''}
                      onChange={(e) => {
                        const copy = [...form.locationAdvantages];
                        copy[idx] = { ...adv, googleMapsUrl: e.target.value };
                        setForm({ ...form, locationAdvantages: copy });
                      }}
                      placeholder="Google Maps URL (optional)"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                    />
                  </div>
                </div>
              ))}
              </div>

              <div className="pt-6 border-t border-[#EAE1E6] space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1C1F1E]">
                    Nearby Places by Category
                  </h3>
                  <p className="text-xs text-[#646B67]">
                    Schools, colleges, hospitals, shopping, transit hubs, and landmarks near this project.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {NEARBY_GROUPS.map((group) => {
                const items = form.nearbyPlaces[group.key] || [];
                return (
                  <div key={group.key} className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#1C1F1E]">
                        {group.label} ({items.length})
                      </h4>
                      <button
                        type="button"
                        onClick={() => addNearbyPlace(group.key)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {items.length === 0 ? (
                      <p className="text-xs text-[#646B67]">No entries added.</p>
                    ) : (
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={item.id} className="bg-white p-2.5 rounded-lg border border-[#EAE1E6] space-y-1.5">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => {
                                  const next = [...items];
                                  next[idx] = { ...item, name: e.target.value };
                                  setForm({
                                    ...form,
                                    nearbyPlaces: { ...form.nearbyPlaces, [group.key]: next },
                                  });
                                }}
                                placeholder="Place name"
                                className="flex-1 px-2.5 py-1 text-xs border border-[#D7C8D1] rounded"
                              />
                              <input
                                type="text"
                                value={item.distanceOrTime}
                                onChange={(e) => {
                                  const next = [...items];
                                  next[idx] = { ...item, distanceOrTime: e.target.value };
                                  setForm({
                                    ...form,
                                    nearbyPlaces: { ...form.nearbyPlaces, [group.key]: next },
                                  });
                                }}
                                placeholder="5 mins / 2 km"
                                className="w-28 px-2.5 py-1 text-xs border border-[#D7C8D1] rounded"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = items.filter((_, i) => i !== idx);
                                  setForm({
                                    ...form,
                                    nearbyPlaces: { ...form.nearbyPlaces, [group.key]: next },
                                  });
                                }}
                                className="p-1 text-red-700 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => {
                                const next = [...items];
                                next[idx] = { ...item, notes: e.target.value };
                                setForm({
                                  ...form,
                                  nearbyPlaces: { ...form.nearbyPlaces, [group.key]: next },
                                });
                              }}
                              placeholder="Optional notes..."
                              className="w-full px-2.5 py-1 text-[11px] border border-[#EAE1E6] rounded"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PRICING & PLOT DETAILS */}
          {activeTab === 'pricing' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Starting Price
                </label>
                <input
                  type="text"
                  value={form.startingPrice}
                  onChange={(e) => setForm({ ...form, startingPrice: e.target.value })}
                  placeholder="Enter confirmed starting price or leave empty"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Price Per Square Foot
                </label>
                <input
                  type="text"
                  value={form.pricePerSqFt}
                  onChange={(e) => setForm({ ...form, pricePerSqFt: e.target.value })}
                  placeholder="e.g., ₹2,200 / Sq. Ft."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Plot Sizes
                </label>
                <input
                  type="text"
                  value={form.plotSizes}
                  onChange={(e) => setForm({ ...form, plotSizes: e.target.value })}
                  placeholder="e.g., 843 – 2,465 Sq. Ft."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Property Type
                </label>
                <input
                  type="text"
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Plot Availability Summary
                </label>
                <input
                  type="text"
                  value={form.plotAvailabilityNote}
                  onChange={(e) => setForm({ ...form, plotAvailabilityNote: e.target.value })}
                  placeholder="e.g., Corner & East-facing plots available"
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Special Offers
                </label>
                <input
                  type="text"
                  value={form.specialOffers}
                  onChange={(e) => setForm({ ...form, specialOffers: e.target.value })}
                  placeholder="Optional verified offer..."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Pricing Description &amp; Payment Terms
                </label>
                <textarea
                  rows={4}
                  value={form.pricingDescription}
                  onChange={(e) => setForm({ ...form, pricingDescription: e.target.value })}
                  placeholder="Additional pricing notes, registration charges, bank loan availability..."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>
            </div>
          )}

          {/* TAB 8: PROJECT IMAGE MANAGEMENT */}
          {activeTab === 'images' && (
            <div className="space-y-5">
              <SingleImageUploader
                label="A. Main Hero Banner Image"
                helper="Top full-width hero backdrop for this project."
                asset={form.images.heroImage}
                slotKey="hero"
                uploadingSlot={uploadingSlot}
                uploadProgress={uploadProgress}
                onUpload={(file) =>
                  runAssetUpload('hero', 'hero', 'image', file, (res) =>
                    setForm((prev) => ({
                      ...prev,
                      images: {
                        ...prev.images,
                        heroImage: {
                          url: res.downloadUrl,
                          storagePath: res.storagePath,
                          caption: prev.images.heroImage?.caption || '',
                          altText: prev.images.heroImage?.altText || `${prev.name || 'Project'} Hero Banner`,
                        },
                      },
                    }))
                  )
                }
                onChangeAsset={(updated) =>
                  setForm((prev) => ({ ...prev, images: { ...prev.images, heroImage: updated } }))
                }
                onDelete={() =>
                  handleDeleteSlotAsset(form.images.heroImage, () =>
                    setForm((prev) => ({ ...prev, images: { ...prev.images, heroImage: null } }))
                  )
                }
              />

              <div className="pt-2 border-t border-[#EAE1E6] space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-[#1C1F1E]">
                    Three Dedicated Main Project Image Slots
                  </h3>
                  <p className="text-xs text-[#646B67]">
                    Slot 1 renders large on the left (~55%), Slot 2 top-right, and Slot 3 bottom-right on desktop.
                  </p>
                </div>

                <SingleImageUploader
                  label="B. Main Project Entrance Image (Slot 1 — Large Left)"
                  asset={form.images.entranceImage}
                  slotKey="entranceImage"
                  uploadingSlot={uploadingSlot}
                  uploadProgress={uploadProgress}
                  onUpload={(file) =>
                    runAssetUpload('entranceImage', 'main-images', 'image', file, (res) =>
                      setForm((prev) => ({
                        ...prev,
                        images: {
                          ...prev.images,
                          entranceImage: {
                            url: res.downloadUrl,
                            storagePath: res.storagePath,
                            caption: prev.images.entranceImage?.caption || 'Main Project Entrance',
                            altText: prev.images.entranceImage?.altText || `${prev.name || 'Project'} Main Entrance`,
                          },
                        },
                      }))
                    )
                  }
                  onChangeAsset={(updated) =>
                    setForm((prev) => ({
                      ...prev,
                      images: { ...prev.images, entranceImage: updated },
                    }))
                  }
                  onDelete={() =>
                    handleDeleteSlotAsset(form.images.entranceImage, () =>
                      setForm((prev) => ({
                        ...prev,
                        images: { ...prev.images, entranceImage: null },
                      }))
                    )
                  }
                />

                <SingleImageUploader
                  label="C. Project Site Image 1 (Slot 2 — Top Right)"
                  asset={form.images.siteImage1}
                  slotKey="siteImage1"
                  uploadingSlot={uploadingSlot}
                  uploadProgress={uploadProgress}
                  onUpload={(file) =>
                    runAssetUpload('siteImage1', 'main-images', 'image', file, (res) =>
                      setForm((prev) => ({
                        ...prev,
                        images: {
                          ...prev.images,
                          siteImage1: {
                            url: res.downloadUrl,
                            storagePath: res.storagePath,
                            caption: prev.images.siteImage1?.caption || 'Project Site View 1',
                            altText: prev.images.siteImage1?.altText || `${prev.name || 'Project'} Site Image 1`,
                          },
                        },
                      }))
                    )
                  }
                  onChangeAsset={(updated) =>
                    setForm((prev) => ({
                      ...prev,
                      images: { ...prev.images, siteImage1: updated },
                    }))
                  }
                  onDelete={() =>
                    handleDeleteSlotAsset(form.images.siteImage1, () =>
                      setForm((prev) => ({
                        ...prev,
                        images: { ...prev.images, siteImage1: null },
                      }))
                    )
                  }
                />

                <SingleImageUploader
                  label="D. Project Site Image 2 (Slot 3 — Bottom Right)"
                  asset={form.images.siteImage2}
                  slotKey="siteImage2"
                  uploadingSlot={uploadingSlot}
                  uploadProgress={uploadProgress}
                  onUpload={(file) =>
                    runAssetUpload('siteImage2', 'main-images', 'image', file, (res) =>
                      setForm((prev) => ({
                        ...prev,
                        images: {
                          ...prev.images,
                          siteImage2: {
                            url: res.downloadUrl,
                            storagePath: res.storagePath,
                            caption: prev.images.siteImage2?.caption || 'Project Site View 2',
                            altText: prev.images.siteImage2?.altText || `${prev.name || 'Project'} Site Image 2`,
                          },
                        },
                      }))
                    )
                  }
                  onChangeAsset={(updated) =>
                    setForm((prev) => ({
                      ...prev,
                      images: { ...prev.images, siteImage2: updated },
                    }))
                  }
                  onDelete={() =>
                    handleDeleteSlotAsset(form.images.siteImage2, () =>
                      setForm((prev) => ({
                        ...prev,
                        images: { ...prev.images, siteImage2: null },
                      }))
                    )
                  }
                />
              </div>

              {/* E. Additional Project Gallery */}
              <div className="pt-4 border-t border-[#EAE1E6] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1F1E]">
                      E. Additional Project Gallery ({form.images.gallery.length})
                    </h3>
                    <p className="text-xs text-[#646B67]">
                      Select multiple site photographs, manage captions, visibility, featured flag, and display order.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg cursor-pointer">
                    <ImagePlus className="w-4 h-4" />
                    <span>Upload Gallery Photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleGalleryUploadMultiple}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadingSlot === 'gallery' && (
                  <p className="text-xs font-medium text-[#9B0B5E]">
                    Uploading gallery image... {uploadProgress}%
                  </p>
                )}

                <div className="space-y-3">
                  {form.images.gallery.map((img, idx) => (
                    <div
                      key={img.id || `${img.url}-${idx}`}
                      className="p-3.5 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] grid grid-cols-1 sm:grid-cols-12 gap-3 items-start"
                    >
                      <div className="sm:col-span-3 rounded-lg overflow-hidden border border-[#EAE1E6] bg-white aspect-[4/3]">
                        <img
                          src={img.url}
                          alt={img.altText || `Gallery ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="sm:col-span-6 space-y-2">
                        <input
                          type="text"
                          value={img.caption || ''}
                          onChange={(e) => {
                            const next = [...form.images.gallery];
                            next[idx] = { ...img, caption: e.target.value };
                            setForm({ ...form, images: { ...form.images, gallery: next } });
                          }}
                          placeholder="Photo caption..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                        />
                        <input
                          type="text"
                          value={img.description || ''}
                          onChange={(e) => {
                            const next = [...form.images.gallery];
                            next[idx] = { ...img, description: e.target.value };
                            setForm({ ...form, images: { ...form.images, gallery: next } });
                          }}
                          placeholder="Photo description..."
                          className="w-full px-3 py-1.5 text-xs bg-white border border-[#D7C8D1] rounded-lg"
                        />
                      </div>
                      <div className="sm:col-span-3 flex flex-wrap items-center justify-end gap-1.5">
                        <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-white border border-[#EAE1E6] rounded cursor-pointer">
                          <RefreshCw className="w-3 h-3" />
                          <span>Replace</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = '';
                              if (!file) return;
                              runAssetUpload(`gallery-${idx}`, 'gallery', 'image', file, (res) => {
                                setForm((prev) => {
                                  const next = [...prev.images.gallery];
                                  next[idx] = {
                                    ...next[idx],
                                    url: res.downloadUrl,
                                    storagePath: res.storagePath,
                                  };
                                  return { ...prev, images: { ...prev.images, gallery: next } };
                                });
                              });
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...form.images.gallery];
                            next[idx] = { ...img, visible: img.visible === false };
                            setForm({ ...form, images: { ...form.images, gallery: next } });
                          }}
                          title="Toggle visibility"
                          className="p-1.5 rounded bg-white border border-[#EAE1E6]"
                        >
                          {img.visible === false ? (
                            <EyeOff className="w-3.5 h-3.5 text-[#646B67]" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-[#9B0B5E]" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = [...form.images.gallery];
                            next[idx] = { ...img, featured: !img.featured };
                            setForm({ ...form, images: { ...form.images, gallery: next } });
                          }}
                          title="Toggle featured"
                          className={`p-1.5 rounded border ${
                            img.featured
                              ? 'bg-[#9B0B5E] text-white border-[#9B0B5E]'
                              : 'bg-white text-[#646B67] border-[#EAE1E6]'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              images: {
                                ...form.images,
                                gallery: swapItems(form.images.gallery, idx, -1),
                              },
                            })
                          }
                          className="p-1.5 rounded bg-white border border-[#EAE1E6]"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              images: {
                                ...form.images,
                                gallery: swapItems(form.images.gallery, idx, 1),
                              },
                            })
                          }
                          className="p-1.5 rounded bg-white border border-[#EAE1E6]"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              images: {
                                ...form.images,
                                gallery: form.images.gallery.filter((_, i) => i !== idx),
                              },
                            })
                          }
                          className="p-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: ROUTE MAP & QR CODE */}
          {activeTab === 'routemap' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#1C1F1E]">PROJECT ROUTE MAP</h3>
                <p className="text-xs text-[#646B67]">
                  Manually upload the official project route map and location QR code.
                </p>
              </div>

              <SingleImageUploader
                label="Route Map Image"
                helper="Upload the project road connectivity / route map image."
                asset={form.routeMap.image}
                slotKey="routeMap"
                uploadingSlot={uploadingSlot}
                uploadProgress={uploadProgress}
                showTitleField
                showDescriptionField
                showCaptionField={false}
                showAltField={false}
                onUpload={(file) =>
                  runAssetUpload('routeMap', 'route-map', 'image', file, (res) =>
                    setForm((prev) => ({
                      ...prev,
                      routeMap: {
                        ...prev.routeMap,
                        image: {
                          url: res.downloadUrl,
                          storagePath: res.storagePath,
                          title: prev.routeMap.image?.title || `${prev.name || 'Project'} Route Map`,
                          description: prev.routeMap.image?.description || '',
                        },
                      },
                    }))
                  )
                }
                onChangeAsset={(updated) =>
                  setForm((prev) => ({ ...prev, routeMap: { ...prev.routeMap, image: updated } }))
                }
                onDelete={() =>
                  handleDeleteSlotAsset(form.routeMap.image, () =>
                    setForm((prev) => ({ ...prev, routeMap: { ...prev.routeMap, image: null } }))
                  )
                }
              />

              <SingleImageUploader
                label="Location QR Code"
                helper="Displayed publicly with SCAN FOR LOCATION label."
                asset={form.routeMap.qrCode}
                slotKey="qrCode"
                uploadingSlot={uploadingSlot}
                uploadProgress={uploadProgress}
                showCaptionField={false}
                showAltField={false}
                onUpload={(file) =>
                  runAssetUpload('qrCode', 'qr-code', 'image', file, (res) =>
                    setForm((prev) => ({
                      ...prev,
                      routeMap: {
                        ...prev.routeMap,
                        qrCode: {
                          url: res.downloadUrl,
                          storagePath: res.storagePath,
                          altText: `${prev.name || 'Project'} Location QR Code`,
                        },
                      },
                    }))
                  )
                }
                onChangeAsset={(updated) =>
                  setForm((prev) => ({ ...prev, routeMap: { ...prev.routeMap, qrCode: updated } }))
                }
                onDelete={() =>
                  handleDeleteSlotAsset(form.routeMap.qrCode, () =>
                    setForm((prev) => ({ ...prev, routeMap: { ...prev.routeMap, qrCode: null } }))
                  )
                }
              />

              <div className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-3">
                <h4 className="text-sm font-semibold text-[#1C1F1E]">Google Maps Location</h4>
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Google Maps URL
                  </label>
                  <input
                    type="url"
                    value={form.routeMap.googleMapsUrl}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        routeMap: { ...form.routeMap, googleMapsUrl: e.target.value },
                      })
                    }
                    placeholder="https://maps.google.com/..."
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7C8D1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Site Address (Route Section)
                  </label>
                  <input
                    type="text"
                    value={form.routeMap.address}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        routeMap: { ...form.routeMap, address: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7C8D1] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3D4340] mb-1">
                    Approach &amp; Location Description
                  </label>
                  <textarea
                    rows={2}
                    value={form.routeMap.locationDescription}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        routeMap: { ...form.routeMap, locationDescription: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D7C8D1] rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: LAYOUT PLAN & DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-5">
              <SingleDocumentUploader
                label="Master Layout Plan"
                helper="Supports JPG, PNG, WebP, or PDF (max 15 MB)."
                docAsset={form.documents.layoutPlan}
                slotKey="layoutPlan"
                acceptKind="document"
                uploadingSlot={uploadingSlot}
                uploadProgress={uploadProgress}
                onUpload={(file) =>
                  runAssetUpload('layoutPlan', 'documents', 'document', file, (res) =>
                    setForm((prev) => ({
                      ...prev,
                      documents: {
                        ...prev.documents,
                        layoutPlan: {
                          id: 'layout-plan',
                          name: prev.documents.layoutPlan?.name || 'Master Layout Plan',
                          description: prev.documents.layoutPlan?.description || '',
                          url: res.downloadUrl,
                          storagePath: res.storagePath,
                          fileType: file.type,
                          visible: true,
                        },
                      },
                    }))
                  )
                }
                onChangeDoc={(updated) =>
                  setForm((prev) => ({
                    ...prev,
                    documents: { ...prev.documents, layoutPlan: updated },
                  }))
                }
                onDelete={() =>
                  setForm((prev) => ({
                    ...prev,
                    documents: { ...prev.documents, layoutPlan: null },
                  }))
                }
              />

              <SingleDocumentUploader
                label="Key Plan"
                helper="Supports JPG, PNG, WebP, or PDF (max 15 MB)."
                docAsset={form.documents.keyPlan}
                slotKey="keyPlan"
                acceptKind="document"
                uploadingSlot={uploadingSlot}
                uploadProgress={uploadProgress}
                onUpload={(file) =>
                  runAssetUpload('keyPlan', 'documents', 'document', file, (res) =>
                    setForm((prev) => ({
                      ...prev,
                      documents: {
                        ...prev.documents,
                        keyPlan: {
                          id: 'key-plan',
                          name: prev.documents.keyPlan?.name || 'Project Key Plan',
                          description: prev.documents.keyPlan?.description || '',
                          url: res.downloadUrl,
                          storagePath: res.storagePath,
                          fileType: file.type,
                          visible: true,
                        },
                      },
                    }))
                  )
                }
                onChangeDoc={(updated) =>
                  setForm((prev) => ({
                    ...prev,
                    documents: { ...prev.documents, keyPlan: updated },
                  }))
                }
                onDelete={() =>
                  setForm((prev) => ({
                    ...prev,
                    documents: { ...prev.documents, keyPlan: null },
                  }))
                }
              />

              <SingleDocumentUploader
                label="Project Brochure"
                helper="PDF or image brochure downloadable by visitors."
                docAsset={form.documents.brochure}
                slotKey="brochure"
                acceptKind="document"
                uploadingSlot={uploadingSlot}
                uploadProgress={uploadProgress}
                onUpload={(file) =>
                  runAssetUpload('brochure', 'documents', 'document', file, (res) =>
                    setForm((prev) => ({
                      ...prev,
                      documents: {
                        ...prev.documents,
                        brochure: {
                          id: 'brochure',
                          name: prev.documents.brochure?.name || `${prev.name || 'Project'} Brochure`,
                          description: prev.documents.brochure?.description || '',
                          url: res.downloadUrl,
                          storagePath: res.storagePath,
                          fileType: file.type,
                          visible: true,
                        },
                      },
                    }))
                  )
                }
                onChangeDoc={(updated) =>
                  setForm((prev) => ({
                    ...prev,
                    documents: { ...prev.documents, brochure: updated },
                  }))
                }
                onDelete={() =>
                  setForm((prev) => ({
                    ...prev,
                    documents: { ...prev.documents, brochure: null },
                  }))
                }
              />

              {/* Approval Documents & Additional PDFs */}
              {[
                {
                  key: 'approvalDocuments' as const,
                  title: 'Approval Documents',
                  kind: 'document' as const,
                  accept: 'application/pdf,image/jpeg,image/png,image/webp',
                },
                {
                  key: 'additionalPdfs' as const,
                  title: 'Additional PDF Documents',
                  kind: 'pdf' as const,
                  accept: 'application/pdf',
                },
              ].map((group) => {
                const list = form.documents[group.key] || [];
                return (
                  <div key={group.key} className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-sm font-semibold text-[#1C1F1E]">
                        {group.title} ({list.length})
                      </h4>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Files</span>
                        <input
                          type="file"
                          multiple
                          accept={group.accept}
                          className="hidden"
                          onChange={(e) => handleMultiDocUpload(e, group.key, group.kind)}
                        />
                      </label>
                    </div>

                    {list.map((docItem, idx) => (
                      <div key={docItem.id} className="bg-white p-3 rounded-lg border border-[#EAE1E6] space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <a
                            href={docItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9B0B5E] hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Open / Preview</span>
                          </a>
                          <div className="flex items-center gap-2">
                            <label className="inline-flex items-center gap-1 text-xs text-[#3D4340] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={docItem.visible !== false}
                                onChange={(e) => {
                                  const next = [...list];
                                  next[idx] = { ...docItem, visible: e.target.checked };
                                  setForm({
                                    ...form,
                                    documents: { ...form.documents, [group.key]: next },
                                  });
                                }}
                                className="w-3.5 h-3.5 accent-[#9B0B5E]"
                              />
                              <span>Public</span>
                            </label>
                            <label className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-[#FAF8F9] border border-[#EAE1E6] rounded cursor-pointer">
                              <RefreshCw className="w-3 h-3" />
                              <span>Replace</span>
                              <input
                                type="file"
                                accept={group.accept}
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = '';
                                  if (!file) return;
                                  runAssetUpload(
                                    `${group.key}-${idx}`,
                                    'documents',
                                    group.kind,
                                    file,
                                    (res) => {
                                      setForm((prev) => {
                                        const next = [...prev.documents[group.key]];
                                        next[idx] = {
                                          ...next[idx],
                                          url: res.downloadUrl,
                                          storagePath: res.storagePath,
                                          fileType: file.type,
                                        };
                                        return {
                                          ...prev,
                                          documents: { ...prev.documents, [group.key]: next },
                                        };
                                      });
                                    }
                                  );
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const next = list.filter((_, i) => i !== idx);
                                setForm({
                                  ...form,
                                  documents: { ...form.documents, [group.key]: next },
                                });
                              }}
                              className="p-1 text-red-700 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={docItem.name}
                            onChange={(e) => {
                              const next = [...list];
                              next[idx] = { ...docItem, name: e.target.value };
                              setForm({
                                ...form,
                                documents: { ...form.documents, [group.key]: next },
                              });
                            }}
                            placeholder="Document name"
                            className="px-2.5 py-1.5 text-xs border border-[#D7C8D1] rounded"
                          />
                          <input
                            type="text"
                            value={docItem.description || ''}
                            onChange={(e) => {
                              const next = [...list];
                              next[idx] = { ...docItem, description: e.target.value };
                              setForm({
                                ...form,
                                documents: { ...form.documents, [group.key]: next },
                              });
                            }}
                            placeholder="Description"
                            className="px-2.5 py-1.5 text-xs border border-[#D7C8D1] rounded"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 8: PUBLISH SETTINGS */}
          {activeTab === 'publish' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-4">
                <h3 className="text-sm font-semibold text-[#1C1F1E]">
                  Project Contact Overrides (Optional)
                </h3>
                <p className="text-xs text-[#646B67]">
                  Leave blank to automatically inherit your main Website Content office contact details.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#3D4340] mb-1">
                      Project Contact Phone
                    </label>
                    <input
                      type="text"
                      value={form.contactPhone}
                      onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D7C8D1] rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3D4340] mb-1">
                      Project Contact Email
                    </label>
                    <input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D7C8D1] rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#3D4340] mb-1">
                      Project Contact / Office Address
                    </label>
                    <input
                      type="text"
                      value={form.contactAddress}
                      onChange={(e) => setForm({ ...form, contactAddress: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-white border border-[#D7C8D1] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1C1F1E]">
                      Publishing &amp; Visibility Controls
                    </h3>
                    <p className="text-xs text-[#646B67] mt-0.5">
                      Current status:{' '}
                      <span className="font-semibold uppercase text-[#9B0B5E]">{form.status}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPreview(buildPreviewProject())}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#9B0B5E] bg-white border border-[#9B0B5E] hover:bg-[#F7E8F1] rounded-lg"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview Project Page</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  <button
                    type="button"
                    disabled={Boolean(savingAction || uploadingSlot)}
                    onClick={() => handleSaveWithStatus('draft', 'draft')}
                    className="px-4 py-2.5 text-xs font-medium text-[#1C1F1E] bg-white border border-[#D7C8D1] hover:bg-[#EAE1E6] rounded-lg"
                  >
                    {savingAction === 'draft' ? 'Saving...' : 'Save as Draft'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(savingAction || uploadingSlot)}
                    onClick={() => handleSaveWithStatus('published', 'publish')}
                    className="px-4 py-2.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
                  >
                    {savingAction === 'publish' ? 'Publishing...' : 'Publish Project'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(savingAction || uploadingSlot)}
                    onClick={() => handleSaveWithStatus('unpublished', 'unpublish')}
                    className="px-4 py-2.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg"
                  >
                    {savingAction === 'unpublish' ? 'Updating...' : 'Unpublish Project'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(savingAction || uploadingSlot)}
                    onClick={() => handleSaveWithStatus(form.status, 'update')}
                    className="px-4 py-2.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg"
                  >
                    {savingAction === 'update' ? 'Updating...' : 'Update Project'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer Bar */}
        <div className="px-5 py-3.5 border-t border-[#EAE1E6] bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#3D4340] hover:bg-[#FAF8F9] rounded-lg"
          >
            Cancel
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onPreview(buildPreviewProject())}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              disabled={Boolean(savingAction || uploadingSlot)}
              onClick={() => handleSaveWithStatus('draft', 'footer-draft')}
              className="px-4 py-2 text-xs font-medium text-[#1C1F1E] border border-[#D7C8D1] hover:bg-[#FAF8F9] rounded-lg"
            >
              {savingAction === 'footer-draft' ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="button"
              disabled={Boolean(savingAction || uploadingSlot)}
              onClick={() => handleSaveWithStatus('published', 'footer-publish')}
              className="px-4 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
            >
              {savingAction === 'footer-publish'
                ? 'Publishing...'
                : form.status === 'published'
                  ? 'Update Published Project'
                  : 'Publish Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
