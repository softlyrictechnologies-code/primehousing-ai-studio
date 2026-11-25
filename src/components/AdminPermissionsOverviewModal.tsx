import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Lock, Plus, ShieldCheck, Trash2, UserCheck, Users, X } from 'lucide-react';
import type { AdminRegistryMember, AdminRoleKey, Project } from '../types/realEstate';
import {
  ADMIN_ROLE_PERMISSIONS,
  getAllAdminsList,
  removeAdminRegistryMember,
  upsertAdminRegistryMember,
} from '../admin/services/adminUserService';
import { normalizeProjectEditPermissions } from '../services/projectService';

interface AdminPermissionsOverviewModalProps {
  open: boolean;
  projects: Project[];
  currentAdminEmail: string;
  currentAdminName: string;
  currentAdminRole: string | null;
  onEditProjectPermission: (project: Project) => void;
  onClose: () => void;
}

type OverviewTab = 'roles' | 'projects' | 'admins';

export function AdminPermissionsOverviewModal({
  open,
  projects,
  currentAdminEmail,
  currentAdminName,
  currentAdminRole,
  onEditProjectPermission,
  onClose,
}: AdminPermissionsOverviewModalProps) {
  const [tab, setTab] = useState<OverviewTab>('roles');
  const [admins, setAdmins] = useState<AdminRegistryMember[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [registryError, setRegistryError] = useState('');
  const [registryNotice, setRegistryNotice] = useState('');

  const [newUid, setNewUid] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<AdminRoleKey>('admin');
  const [savingMember, setSavingMember] = useState(false);

  const isSuperAdmin =
    String(currentAdminRole || '').toLowerCase().replace('-', '_') === 'super_admin';

  const loadAdmins = useCallback(async () => {
    setLoadingAdmins(true);
    setRegistryError('');
    try {
      const list = await getAllAdminsList();
      setAdmins(list);
    } catch (err) {
      setRegistryError(
        err instanceof Error ? err.message : 'Unable to load admin registry from Firestore.'
      );
    } finally {
      setLoadingAdmins(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadAdmins();
      setRegistryNotice('');
      setRegistryError('');
    }
  }, [open, loadAdmins]);

  if (!open) return null;

  const handleSaveAdminMember = async (e: FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || savingMember) return;
    setRegistryError('');
    setRegistryNotice('');
    setSavingMember(true);
    try {
      await upsertAdminRegistryMember({
        uid: newUid.trim(),
        email: newEmail.trim(),
        name: newName.trim(),
        role: newRole,
        active: true,
      });
      setRegistryNotice(`Saved administrator access for ${newEmail.trim()} (${newRole}).`);
      setNewUid('');
      setNewEmail('');
      setNewName('');
      setNewRole('admin');
      await loadAdmins();
    } catch (err) {
      setRegistryError(err instanceof Error ? err.message : 'Unable to save admin entry.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleRemoveAdmin = async (member: AdminRegistryMember) => {
    if (!isSuperAdmin) return;
    setRegistryError('');
    setRegistryNotice('');
    try {
      await removeAdminRegistryMember(member.uid, member.email);
      setRegistryNotice(`Removed ${member.email || member.uid} from admins registry.`);
      await loadAdmins();
    } catch (err) {
      setRegistryError(err instanceof Error ? err.message : 'Unable to remove admin entry.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white border border-[#EAE1E6] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#EAE1E6] flex items-center justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F7E8F1] text-[#9B0B5E]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1E]">
                Admin Access &amp; Project Edit Permissions List
              </h2>
              <p className="text-xs text-[#646B67]">
                Signed in as <strong className="text-[#1C1F1E]">{currentAdminName}</strong> (
                {currentAdminEmail}) · Role:{' '}
                <span className="font-semibold text-[#9B0B5E] uppercase">
                  {String(currentAdminRole || 'admin').replace('_', ' ')}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close permissions list"
            className="p-1.5 rounded-lg text-[#646B67] hover:bg-[#FAF8F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-[#EAE1E6] flex flex-wrap gap-2 bg-[#FAF8F9]">
          {(
            [
              { key: 'roles', label: '1. Admin Roles & Permissions Matrix' },
              { key: 'projects', label: `2. Project Edit Permissions (${projects.length})` },
              { key: 'admins', label: `3. Registered Admins (${admins.length})` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`px-3.5 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors ${
                tab === item.key
                  ? 'border-[#9B0B5E] text-[#9B0B5E] bg-white'
                  : 'border-transparent text-[#646B67] hover:text-[#1C1F1E]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {tab === 'roles' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#FAF8F9] border border-[#EAE1E6] text-xs text-[#3D4340] leading-relaxed">
                <p className="font-semibold text-[#1C1F1E] mb-1">
                  How Admin Login &amp; Roles Work (Firebase Authentication)
                </p>
                <p>
                  Administrator accounts are managed in Firebase Authentication (Project:{' '}
                  <span className="font-mono text-[#9B0B5E]">prime-housing-72330</span>) and verified
                  via custom token claims or the Firestore <span className="font-mono">admins/{'{uid}'}</span>{' '}
                  collection. No passwords are stored in website source code.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ADMIN_ROLE_PERMISSIONS.map((roleItem) => {
                  const isCurrent =
                    String(currentAdminRole || '').toLowerCase().replace('-', '_') === roleItem.role;
                  return (
                    <div
                      key={roleItem.role}
                      className={`p-4 rounded-xl border ${
                        isCurrent
                          ? 'border-[#9B0B5E] bg-[#F7E8F1]/30'
                          : 'border-[#EAE1E6] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${roleItem.badgeTone}`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{roleItem.label}</span>
                        </span>
                        {isCurrent && (
                          <span className="text-[11px] font-semibold text-[#9B0B5E]">
                            Your Current Role
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#646B67] mb-3 leading-relaxed">
                        {roleItem.description}
                      </p>
                      <ul className="space-y-1.5">
                        {roleItem.permissions.map((perm) => (
                          <li key={perm} className="flex items-start gap-2 text-xs text-[#1C1F1E]">
                            <Check className="w-3.5 h-3.5 text-[#9B0B5E] shrink-0 mt-0.5" />
                            <span>{perm}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'projects' && (
            <div className="space-y-4">
              <p className="text-xs text-[#646B67]">
                Review and edit per-project permission policies across your Project Management list.
              </p>

              <div className="border border-[#EAE1E6] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                      <tr>
                        <th className="px-4 py-3 font-medium">Project</th>
                        <th className="px-4 py-3 font-medium">Access Policy</th>
                        <th className="px-4 py-3 font-medium">Allowed Roles</th>
                        <th className="px-4 py-3 font-medium">Edit Options</th>
                        <th className="px-4 py-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE1E6]">
                      {projects.map((proj) => {
                        const perms = normalizeProjectEditPermissions(proj.editPermissions);
                        const modeLabel =
                          perms.accessMode === 'super_admin_only'
                            ? 'Super Admin Only (Locked)'
                            : perms.accessMode === 'custom_roles'
                              ? 'Custom Roles'
                              : 'All Admins & Editors';
                        return (
                          <tr key={proj.id} className="hover:bg-[#FAF8F9]/60">
                            <td className="px-4 py-3">
                              <p className="font-semibold text-[#1C1F1E]">{proj.name}</p>
                              <p className="text-[11px] font-mono text-[#646B67]">
                                /projects/{proj.slug}
                              </p>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${
                                  perms.accessMode === 'super_admin_only'
                                    ? 'bg-amber-50 text-amber-800'
                                    : 'bg-[#F7E8F1] text-[#9B0B5E]'
                                }`}
                              >
                                {perms.accessMode === 'super_admin_only' && (
                                  <Lock className="w-3 h-3" />
                                )}
                                <span>{modeLabel}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[#3D4340]">
                              {perms.allowedRoles
                                .map((r) => r.replace('_', ' ').toUpperCase())
                                .join(', ')}
                            </td>
                            <td className="px-4 py-3 text-[11px] text-[#646B67]">
                              {[
                                perms.allowContentEdit && 'Edit',
                                perms.allowMediaUpload && 'Media',
                                perms.allowPublishToggle && 'Publish',
                                perms.allowDelete && 'Delete',
                              ]
                                .filter(Boolean)
                                .join(' · ') || 'Super Admin Only'}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onEditProjectPermission(proj);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-md"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Edit Permission</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'admins' && (
            <div className="space-y-4">
              {registryError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {registryError}
                </div>
              )}
              {registryNotice && (
                <div className="p-3 rounded-lg bg-[#F7E8F1] border border-[#9B0B5E]/20 text-xs text-[#9B0B5E]">
                  {registryNotice}
                </div>
              )}

              <div className="border border-[#EAE1E6] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#FAF8F9] border-b border-[#EAE1E6] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#9B0B5E]" />
                    <span className="text-xs font-semibold text-[#1C1F1E]">
                      Firestore Admin Registry (`admins` collection)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={loadAdmins}
                    className="text-xs font-medium text-[#9B0B5E] hover:underline"
                  >
                    Refresh List
                  </button>
                </div>

                {loadingAdmins ? (
                  <div className="p-6 text-center text-xs text-[#646B67]">
                    Loading registered admin accounts...
                  </div>
                ) : admins.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#646B67]">
                    No entries returned from `admins` collection (accounts authenticated via Firebase Auth Custom Claims will still have admin access).
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Name / Email</th>
                          <th className="px-4 py-2.5 font-medium">Firebase UID</th>
                          <th className="px-4 py-2.5 font-medium">Role</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                          {isSuperAdmin && (
                            <th className="px-4 py-2.5 font-medium text-right">Remove</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EAE1E6]">
                        {admins.map((member) => (
                          <tr key={member.uid}>
                            <td className="px-4 py-2.5">
                              <p className="font-medium text-[#1C1F1E]">{member.name}</p>
                              <p className="text-[11px] text-[#646B67]">{member.email || '—'}</p>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-[#646B67]">
                              {member.uid}
                            </td>
                            <td className="px-4 py-2.5 uppercase font-semibold text-[#9B0B5E]">
                              {member.role.replace('_', ' ')}
                            </td>
                            <td className="px-4 py-2.5 text-[#3D4340]">
                              {member.active ? 'Active' : 'Inactive'}
                            </td>
                            {isSuperAdmin && (
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAdmin(member)}
                                  aria-label={`Remove ${member.email || member.uid}`}
                                  className="p-1.5 text-[#646B67] hover:text-red-700 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Add / Update Admin Registry Member (Super Admin Only per firestore.rules) */}
              <div className="p-4 rounded-xl border border-[#EAE1E6] bg-[#FAF8F9] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-[#1C1F1E]">
                    Add or Update Staff Admin Registry Role
                  </h3>
                  {!isSuperAdmin && (
                    <span className="text-[11px] font-medium text-amber-700">
                      Super Admin permission required to modify registry
                    </span>
                  )}
                </div>

                <form onSubmit={handleSaveAdminMember} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <input
                    type="text"
                    value={newUid}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setNewUid(e.target.value)}
                    placeholder="Firebase Auth UID"
                    required
                    className="px-3 py-2 text-xs bg-white border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E] disabled:opacity-60"
                  />
                  <input
                    type="email"
                    value={newEmail}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Staff Email"
                    required
                    className="px-3 py-2 text-xs bg-white border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E] disabled:opacity-60"
                  />
                  <input
                    type="text"
                    value={newName}
                    disabled={!isSuperAdmin}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Full Name"
                    className="px-3 py-2 text-xs bg-white border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E] disabled:opacity-60"
                  />
                  <div className="flex gap-2">
                    <select
                      value={newRole}
                      disabled={!isSuperAdmin}
                      onChange={(e) => setNewRole(e.target.value as AdminRoleKey)}
                      className="flex-1 px-3 py-2 text-xs bg-white border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E] disabled:opacity-60"
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="support">Support</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!isSuperAdmin || savingMember}
                      className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-50 rounded-lg shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
