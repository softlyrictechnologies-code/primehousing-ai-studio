import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Eye, Mail, Phone, Trash2, X } from 'lucide-react';
import {
  deleteContactMessageAdmin,
  deleteInquiryAdmin,
  getAllContactMessagesAdmin,
  getAllInquiriesAdmin,
  updateContactMessageAdmin,
  updateInquiryAdmin,
} from '../../admin/services/adminInquiryService';
import type { BuyerEnquiry, EnquiryStatus } from '../../types/realEstate';
import { formatDateTime } from '../../utils/formatters';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';

const STATUS_OPTIONS: EnquiryStatus[] = ['New', 'Contacted', 'Follow-up Required', 'Closed'];

export function AdminEnquiriesPage() {
  const { role } = useAdminAuth();
  const normalizedRole = String(role || 'admin').toLowerCase().replace('-', '_');
  const canDelete = normalizedRole === 'super_admin' || normalizedRole === 'admin';
  const [enquiries, setEnquiries] = useState<BuyerEnquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | EnquiryStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<BuyerEnquiry | null>(null);
  const [editStatus, setEditStatus] = useState<EnquiryStatus>('New');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<BuyerEnquiry | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [inqs, msgs] = await Promise.all([
        getAllInquiriesAdmin(),
        getAllContactMessagesAdmin().catch(() => []),
      ]);
      const combined = [...inqs, ...msgs].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      setEnquiries(combined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load enquiries.');
    }
  }, []);

  useEffect(() => {
    document.title = 'Buyer Enquiries — PRIME HOUSING Admin';
    load();
  }, [load]);

  const openEnquiry = (enq: BuyerEnquiry) => {
    setSelected(enq);
    setEditStatus(enq.enquiryStatus);
    setFollowUpNotes(enq.followUpNotes || '');
  };

  const handleSave = async () => {
    if (!selected || saving) return;
    setSaving(true);
    setError('');
    try {
      if (selected.isContactMessage) {
        await updateContactMessageAdmin(selected.id, editStatus, followUpNotes.trim());
      } else {
        await updateInquiryAdmin(selected.id, editStatus, followUpNotes.trim());
      }
      setSelected(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update enquiry.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setError('');
    try {
      if (deleteTarget.isContactMessage) {
        await deleteContactMessageAdmin(deleteTarget.id);
      } else {
        await deleteInquiryAdmin(deleteTarget.id);
      }
      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete enquiry.');
      setDeleteTarget(null);
    }
  };

  const projectFilterOptions = Array.from(
    new Map(
      enquiries
        .filter((e) => e.projectName || e.projectId || e.enquiryType === 'project')
        .map((e) => [
          e.projectId || e.projectSlug || e.projectName || 'project',
          e.projectName || e.propertyTitle,
        ])
    ).entries()
  );

  const filtered = enquiries.filter((e) => {
    if (statusFilter !== 'all' && e.enquiryStatus !== statusFilter) return false;
    if (sourceFilter === 'projects_only') {
      if (!(e.projectId || e.projectName || e.enquiryType === 'project')) return false;
    } else if (sourceFilter !== 'all') {
      const key = e.projectId || e.projectSlug || e.projectName || '';
      if (key !== sourceFilter) return false;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        e.enquiryRef.toLowerCase().includes(q) ||
        e.buyerName.toLowerCase().includes(q) ||
        e.propertyTitle.toLowerCase().includes(q) ||
        (e.projectName || '').toLowerCase().includes(q) ||
        (e.enquiryCategory || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1F1E]">
          Buyer &amp; Contact Enquiries
        </h1>
        <p className="text-xs text-[#646B67] mt-1">
          Track buyer questions, log follow-up notes, and update enquiry progress.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', ...STATUS_OPTIONS] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-[#9B0B5E] text-white'
                  : 'bg-[#FAF8F9] text-[#3D4340] hover:bg-[#EAE1E6]'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Filter by source or project"
            className="px-3 py-2 text-xs border border-[#D7C8D1] rounded-lg bg-[#FAF8F9] text-[#1C1F1E] focus:outline-none focus:border-[#9B0B5E]"
          >
            <option value="all">All Sources</option>
            <option value="projects_only">All Project Enquiries</option>
            {projectFilterOptions.map(([key, label]) => (
              <option key={key} value={key}>
                Project: {label}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ref, buyer, property or project..."
            className="px-3.5 py-2 text-xs border border-[#D7C8D1] rounded-lg w-full sm:w-64 focus:outline-none focus:border-[#9B0B5E]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#646B67]">
            No enquiries match your current filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                <tr>
                  <th className="px-4 py-3 font-medium">Enquiry ID</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Related Property</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1E6]">
                {filtered.map((enq) => (
                  <tr key={enq.id} className="hover:bg-[#FAF8F9]/60">
                    <td className="px-4 py-3 font-mono text-[#9B0B5E]">{enq.enquiryRef}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1F1E]">{enq.buyerName}</td>
                    <td className="px-4 py-3 text-[#3D4340]">{enq.phone}</td>
                    <td className="px-4 py-3 text-[#3D4340] max-w-[240px]">
                      <p className="truncate font-medium text-[#1C1F1E]">
                        {enq.projectName || enq.propertyTitle}
                      </p>
                      {(enq.enquiryCategory || enq.enquiryType === 'project') && (
                        <p className="text-[11px] text-[#9B0B5E] truncate">
                          {enq.enquiryCategory || 'Project Enquiry'}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#646B67] tabular-nums">
                      {formatDateTime(enq.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#1C1F1E]">{enq.enquiryStatus}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEnquiry(enq)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-md"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                        <button
                          type="button"
                          disabled={!canDelete}
                          onClick={() => setDeleteTarget(enq)}
                          aria-label={`Delete ${enq.enquiryRef}`}
                          className="p-1.5 rounded-md text-[#646B67] hover:bg-red-50 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
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

      {/* Enquiry Detail & Follow-up Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D0816]/60">
          <div className="w-full max-w-xl bg-white border border-[#EAE1E6] rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAE1E6] flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-[#9B0B5E]">{selected.enquiryRef}</p>
                <h2 className="font-display text-xl font-medium text-[#1C1F1E]">
                  Enquiry from {selected.buyerName}
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

            <div className="p-6 space-y-5 text-sm">
              <div className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-[#1C1F1E]">
                      {selected.projectName || selected.propertyTitle}
                    </span>
                    {selected.enquiryCategory && (
                      <p className="text-xs text-[#9B0B5E] mt-0.5">{selected.enquiryCategory}</p>
                    )}
                  </div>
                  {selected.projectSlug ? (
                    <Link
                      to={`/projects/${selected.projectSlug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#9B0B5E] hover:underline"
                    >
                      <span>View Project</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : selected.propertyId ? (
                    <Link
                      to={`/properties/${selected.propertyId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#9B0B5E] hover:underline"
                    >
                      <span>View Property</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-4 text-xs">
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
                <p className="text-xs font-medium text-[#646B67] mb-1">Buyer Message</p>
                <p className="text-sm text-[#1C1F1E] leading-relaxed bg-[#FAF8F9] p-3.5 rounded-lg">
                  {selected.message}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Enquiry Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setEditStatus(st)}
                      className={`px-2.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                        editStatus === st
                          ? 'bg-[#9B0B5E] text-white border-[#9B0B5E]'
                          : 'bg-white text-[#3D4340] border-[#D7C8D1] hover:bg-[#FAF8F9]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3D4340] mb-1">
                  Follow-up Notes
                </label>
                <textarea
                  rows={3}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Record call outcomes, scheduled site visits, or document requests..."
                  className="w-full px-3.5 py-2 text-sm border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-4 py-2 text-xs font-medium text-[#3D4340] hover:bg-[#FAF8F9] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="px-5 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg"
                >
                  {saving ? 'Saving...' : 'Update Enquiry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Enquiry"
        message={`Permanently delete enquiry ${deleteTarget?.enquiryRef} from ${deleteTarget?.buyerName}?`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
