import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Eye, HelpCircle, Phone, Mail, X, XCircle } from 'lucide-react';
import {
  approveSubmissionAndCreatePropertyAdmin,
  getAllSubmissionsAdmin,
  updateSubmissionReviewAdmin,
} from '../../admin/services/adminSubmissionService';
import type { LandownerSubmission, SubmissionReviewStatus } from '../../types/realEstate';
import { formatArea, formatCurrency, formatDate, generateReference } from '../../utils/formatters';
import { PropertyFormModal, type PropertyDraftInput } from '../../components/PropertyFormModal';
import { ResilientImage } from '../../components/ResilientImage';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

export function AdminSubmissionsPage() {
  const { role } = useAdminAuth();
  const normalizedRole = String(role || 'admin').toLowerCase().replace('-', '_');
  const canConvertToProperty = normalizedRole !== 'support';
  const [submissions, setSubmissions] = useState<LandownerSubmission[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionReviewStatus>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LandownerSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionError, setActionError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoadError('');
      const data = await getAllSubmissionsAdmin();
      setSubmissions(data);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Unable to load landowner submissions.'
      );
    }
  }, []);

  useEffect(() => {
    document.title = 'Landowner Submissions — PRIME HOUSING Admin';
    load();
  }, [load]);

  const openDetails = (sub: LandownerSubmission) => {
    setSelected(sub);
    setAdminNotes(sub.adminNotes || '');
    setActionError('');
  };

  const filtered = submissions.filter((s) => {
    if (statusFilter !== 'all' && s.reviewStatus !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        s.submissionRef.toLowerCase().includes(q) ||
        s.ownerName.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleRequestClarification = async () => {
    if (!selected) return;
    if (!adminNotes.trim()) {
      setActionError('Please enter internal notes describing what clarification is needed.');
      return;
    }
    try {
      await updateSubmissionReviewAdmin(selected.id, 'clarification_requested', adminNotes.trim());
      setSelected((prev) =>
        prev ? { ...prev, reviewStatus: 'clarification_requested', adminNotes: adminNotes.trim() } : null
      );
      setActionError('');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update submission.');
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!adminNotes.trim()) {
      setActionError('Please record an internal rejection reason in the notes field.');
      return;
    }
    try {
      await updateSubmissionReviewAdmin(selected.id, 'rejected', adminNotes.trim());
      setSelected((prev) =>
        prev ? { ...prev, reviewStatus: 'rejected', adminNotes: adminNotes.trim() } : null
      );
      setActionError('');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to reject submission.');
    }
  };

  const handleSaveNotesOnly = async () => {
    if (!selected) return;
    try {
      await updateSubmissionReviewAdmin(selected.id, selected.reviewStatus, adminNotes.trim());
      setActionError('');
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save notes.');
    }
  };

  const handleCreatePropertyFromApproval = async (
    propertyData: PropertyDraftInput,
    imageFiles: File[]
  ) => {
    if (!selected) return;
    await approveSubmissionAndCreatePropertyAdmin(
      selected.id,
      adminNotes.trim(),
      propertyData,
      imageFiles
    );
    setApprovalModalOpen(false);
    setSelected(null);
    await load();
  };

  const initialPropertyFromSubmission: Partial<PropertyDraftInput> | undefined = selected
    ? {
        title: `${selected.propertyType} in ${selected.location}`,
        propertyRef: generateReference('VLE'),
        propertyType: selected.propertyType,
        description: selected.description,
        location: selected.location,
        district: selected.districtTownVillage,
        town: selected.location,
        village: '',
        fullAddress: `${selected.districtTownVillage}, ${selected.location}`,
        area: selected.area,
        areaUnit: selected.areaUnit,
        price: selected.expectedPrice,
        roadAccess: selected.roadAccess,
        approvalDetails: selected.approvalDetails,
        features: [
          selected.roadAccess ? `Road Access: ${selected.roadAccess}` : '',
          selected.approvalDetails ? `Documentation: ${selected.approvalDetails}` : '',
        ].filter(Boolean),
        images: selected.images,
        isFeatured: false,
        status: 'draft',
      }
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1F1E]">
            Landowner Submissions
          </h1>
          <p className="text-xs text-[#646B67] mt-1">
            Review private landowner intake records, verify documentation, and convert approved parcels into listings.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {loadError}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'clarification_requested', label: 'Clarification' },
              { key: 'approved', label: 'Approved' },
              { key: 'rejected', label: 'Rejected' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === tab.key
                  ? 'bg-[#9B0B5E] text-white'
                  : 'bg-[#FAF8F9] text-[#3D4340] hover:bg-[#EAE1E6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ref, owner, location..."
          className="px-3.5 py-2 text-xs border border-[#D7C8D1] rounded-lg w-full sm:w-64 focus:outline-none focus:border-[#9B0B5E]"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#646B67]">
            No landowner submissions match your selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                <tr>
                  <th className="px-4 py-3 font-medium">Submission ID</th>
                  <th className="px-4 py-3 font-medium">Landowner</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium text-right">Area</th>
                  <th className="px-4 py-3 font-medium text-right">Expected Price</th>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1E6]">
                {filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#FAF8F9]/60">
                    <td className="px-4 py-3 font-mono text-[#9B0B5E]">{sub.submissionRef}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1F1E]">{sub.ownerName}</td>
                    <td className="px-4 py-3 text-[#3D4340]">{sub.phone}</td>
                    <td className="px-4 py-3 text-[#3D4340]">{sub.location}</td>
                    <td className="px-4 py-3 text-[#646B67]">{sub.propertyType}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatArea(sub.area, sub.areaUnit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(sub.expectedPrice)}
                    </td>
                    <td className="px-4 py-3 text-[#646B67] tabular-nums">
                      {formatDate(sub.submittedAt)}
                    </td>
                    <td className="px-4 py-3 capitalize font-medium text-[#3D4340]">
                      {sub.reviewStatus.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDetails(sub)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-md"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Review Modal */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#1D0816]/60 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white border border-[#EAE1E6] rounded-xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-[#EAE1E6] flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-[#9B0B5E]">{selected.submissionRef}</p>
                <h2 className="font-display text-xl font-medium text-[#1C1F1E]">
                  Submission from {selected.ownerName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-[#646B67] hover:bg-[#FAF8F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[78vh] overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] text-xs">
                <div>
                  <p className="text-[#646B67]">Landowner Contact</p>
                  <p className="text-sm font-semibold text-[#1C1F1E] mt-0.5">
                    {selected.ownerName}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    <a
                      href={`tel:${selected.phone}`}
                      className="inline-flex items-center gap-1 text-[#9B0B5E] hover:underline font-medium"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selected.phone}</span>
                    </a>
                    {selected.email && (
                      <a
                        href={`mailto:${selected.email}`}
                        className="inline-flex items-center gap-1 text-[#9B0B5E] hover:underline font-medium"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{selected.email}</span>
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[#646B67]">Parcel Summary</p>
                  <p className="text-sm font-medium text-[#1C1F1E] mt-0.5">
                    {selected.propertyType} · {formatArea(selected.area, selected.areaUnit)}
                  </p>
                  <p className="text-sm font-semibold text-[#9B0B5E] tabular-nums mt-0.5">
                    Expected: {formatCurrency(selected.expectedPrice)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-medium text-[#646B67] mb-1">Location &amp; District</p>
                  <p className="text-sm text-[#1C1F1E]">
                    {selected.location} ({selected.districtTownVillage})
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#646B67] mb-1">Road Access</p>
                  <p className="text-sm text-[#1C1F1E]">{selected.roadAccess || 'Not provided'}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="font-medium text-[#646B67] mb-1">Approval &amp; Title Details</p>
                  <p className="text-sm text-[#1C1F1E]">
                    {selected.approvalDetails || 'Not provided'}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="font-medium text-[#646B67] mb-1">Description</p>
                  <p className="text-sm text-[#3D4340] leading-relaxed">{selected.description}</p>
                </div>
                {selected.additionalNotes && (
                  <div className="sm:col-span-2">
                    <p className="font-medium text-[#646B67] mb-1">Landowner Notes</p>
                    <p className="text-sm text-[#3D4340]">{selected.additionalNotes}</p>
                  </div>
                )}
              </div>

              {selected.images.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#646B67] mb-2">Submitted Photos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selected.images.map((img, i) => (
                      <div
                        key={i}
                        className="aspect-[4/3] rounded-lg overflow-hidden border border-[#EAE1E6]"
                      >
                        <ResilientImage
                          src={img}
                          alt={`Submitted photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Internal Admin Notes */}
              <div className="pt-4 border-t border-[#EAE1E6] space-y-2">
                <label className="block text-xs font-medium text-[#3D4340]">
                  Internal Review Notes / Rejection Reason
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Record verification status, missing documents, or rejection reason..."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
                {actionError && <p className="text-xs text-red-600">{actionError}</p>}
              </div>

              {/* Decision Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveNotesOnly}
                    className="px-3.5 py-2 text-xs font-medium text-[#3D4340] bg-[#FAF8F9] hover:bg-[#EAE1E6] rounded-lg"
                  >
                    Save Notes
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestClarification}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#9A6B2F] bg-amber-50 hover:bg-amber-100 rounded-lg"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Request Clarification</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={!canConvertToProperty}
                  onClick={() => setApprovalModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-45 disabled:cursor-not-allowed rounded-lg"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approve &amp; Create Property Listing</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Property Creation Review Modal triggered on Approval */}
      <PropertyFormModal
        open={approvalModalOpen}
        heading="Review & Create Listing from Approved Submission"
        initialData={initialPropertyFromSubmission}
        submitLabel="Confirm & Save Property"
        onSave={handleCreatePropertyFromApproval}
        onClose={() => setApprovalModalOpen(false)}
      />
    </div>
  );
}
