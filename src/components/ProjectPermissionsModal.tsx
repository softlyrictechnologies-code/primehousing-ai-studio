import { useEffect, useState, type FormEvent } from 'react';
import { Check, Lock, ShieldCheck, Unlock, Users, X } from 'lucide-react';
import type {
  AdminRoleKey,
  Project,
  ProjectEditAccessMode,
  ProjectEditPermissions,
} from '../types/realEstate';
import {
  DEFAULT_PROJECT_EDIT_PERMISSIONS,
  normalizeProjectEditPermissions,
} from '../services/projectService';

interface ProjectPermissionsModalProps {
  open: boolean;
  project: Project | null;
  currentRole: string | null;
  onSave: (project: Project, nextPermissions: ProjectEditPermissions) => Promise<void>;
  onClose: () => void;
}

const ROLE_OPTIONS: { key: AdminRoleKey; label: string; hint: string }[] = [
  { key: 'super_admin', label: 'Super Admin', hint: 'Always has full edit & lock control' },
  { key: 'admin', label: 'Admin', hint: 'Standard operational administrator' },
  { key: 'editor', label: 'Editor', hint: 'Content & media manager' },
  { key: 'support', label: 'Support Staff', hint: 'View-only on projects by server rules' },
];

const ACCESS_MODE_OPTIONS: {
  mode: ProjectEditAccessMode;
  title: string;
  description: string;
}[] = [
  {
    mode: 'all_admins',
    title: 'All Admins & Editors',
    description: 'Super Admin, Admin, and Editor roles can manage this project based on toggles below.',
  },
  {
    mode: 'custom_roles',
    title: 'Custom Role Selection',
    description: 'Select specific admin roles allowed to edit, upload files, publish, or delete.',
  },
  {
    mode: 'super_admin_only',
    title: 'Super Admin Only (Locked)',
    description: 'Locks this project against edits, unpublishing, or deletion by standard Admins & Editors.',
  },
];

export function ProjectPermissionsModal({
  open,
  project,
  currentRole,
  onSave,
  onClose,
}: ProjectPermissionsModalProps) {
  const [form, setForm] = useState<ProjectEditPermissions>(DEFAULT_PROJECT_EDIT_PERMISSIONS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && project) {
      setForm(normalizeProjectEditPermissions(project.editPermissions));
      setError('');
    }
  }, [open, project]);

  if (!open || !project) return null;

  const isSuperAdmin = String(currentRole || '').toLowerCase().replace('-', '_') === 'super_admin';
  const wasLockedToSuperAdmin =
    normalizeProjectEditPermissions(project.editPermissions).accessMode === 'super_admin_only';
  const isLockedForCurrentUser = wasLockedToSuperAdmin && !isSuperAdmin;

  const handleModeChange = (mode: ProjectEditAccessMode) => {
    if (mode === 'super_admin_only') {
      setForm((prev) => ({
        ...prev,
        accessMode: 'super_admin_only',
        allowedRoles: ['super_admin'],
      }));
      return;
    }
    if (mode === 'all_admins') {
      setForm((prev) => ({
        ...prev,
        accessMode: 'all_admins',
        allowedRoles: ['super_admin', 'admin', 'editor'],
      }));
      return;
    }
    setForm((prev) => ({
      ...prev,
      accessMode: 'custom_roles',
      allowedRoles: prev.allowedRoles.includes('super_admin')
        ? prev.allowedRoles
        : ['super_admin', ...prev.allowedRoles],
    }));
  };

  const toggleRole = (roleKey: AdminRoleKey) => {
    if (roleKey === 'super_admin') return;
    setForm((prev) => {
      const exists = prev.allowedRoles.includes(roleKey);
      const next = exists
        ? prev.allowedRoles.filter((r) => r !== roleKey)
        : [...prev.allowedRoles, roleKey];
      return {
        ...prev,
        accessMode: 'custom_roles',
        allowedRoles: next.includes('super_admin') ? next : ['super_admin', ...next],
      };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving || isLockedForCurrentUser) return;
    setError('');
    setSaving(true);
    try {
      await onSave(project, form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save project permissions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-white border border-[#EAE1E6] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl z-10">
        <div className="px-6 py-4 border-b border-[#EAE1E6] flex items-center justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-[#F7E8F1] text-[#9B0B5E] shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#1C1F1E] truncate">
                Edit Permission — {project.name}
              </h2>
              <p className="text-[11px] font-mono text-[#646B67] truncate">
                /projects/{project.slug} · Status: {project.status}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close permissions dialog"
            className="p-1.5 rounded-lg text-[#646B67] hover:bg-[#FAF8F9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {isLockedForCurrentUser && (
            <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Locked by Super Admin</p>
                <p className="mt-0.5">
                  This project is set to Super Admin Only. Only a Super Admin can modify these permissions.
                </p>
              </div>
            </div>
          )}

          {/* 1. Access Mode Selection */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#646B67]">
              1. Who Can Edit This Project
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {ACCESS_MODE_OPTIONS.map((opt) => {
                const selected = form.accessMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    disabled={isLockedForCurrentUser}
                    onClick={() => handleModeChange(opt.mode)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors flex items-start justify-between gap-3 ${
                      selected
                        ? 'border-[#9B0B5E] bg-[#F7E8F1]/60'
                        : 'border-[#EAE1E6] bg-white hover:bg-[#FAF8F9]'
                    } disabled:opacity-60`}
                  >
                    <div className="flex items-start gap-2.5">
                      {opt.mode === 'super_admin_only' ? (
                        <Lock className="w-4 h-4 text-[#9B0B5E] mt-0.5 shrink-0" />
                      ) : opt.mode === 'custom_roles' ? (
                        <Users className="w-4 h-4 text-[#9B0B5E] mt-0.5 shrink-0" />
                      ) : (
                        <Unlock className="w-4 h-4 text-[#9B0B5E] mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-[#1C1F1E]">{opt.title}</p>
                        <p className="text-[11px] text-[#646B67] mt-0.5">{opt.description}</p>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        selected ? 'border-[#9B0B5E] bg-[#9B0B5E] text-white' : 'border-[#D7C8D1]'
                      }`}
                    >
                      {selected && <Check className="w-2.5 h-2.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Allowed Roles List */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#646B67]">
              2. Allowed Admin Roles List
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ROLE_OPTIONS.map((item) => {
                const checked = form.allowedRoles.includes(item.key);
                const disabled =
                  isLockedForCurrentUser ||
                  item.key === 'super_admin' ||
                  form.accessMode === 'super_admin_only' ||
                  item.key === 'support';
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                      checked
                        ? 'border-[#9B0B5E]/40 bg-[#FAF8F9]'
                        : 'border-[#EAE1E6] bg-white'
                    } ${disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-[#FAF8F9]'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleRole(item.key)}
                      className="mt-0.5 accent-[#9B0B5E]"
                    />
                    <div>
                      <p className="font-semibold text-[#1C1F1E]">{item.label}</p>
                      <p className="text-[11px] text-[#646B67]">{item.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Granular Edit Action Permissions */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#646B67]">
              3. Granular Project Action Options (For Admin &amp; Editor Roles)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(
                [
                  {
                    key: 'allowContentEdit',
                    label: 'Allow Edit Project Details',
                    hint: 'Edit overview, pricing, nearby places, SEO & layout',
                  },
                  {
                    key: 'allowMediaUpload',
                    label: 'Allow Image & PDF Uploads',
                    hint: 'Upload or replace hero photos, route map, brochure & plans',
                  },
                  {
                    key: 'allowPublishToggle',
                    label: 'Allow Publish / Unpublish',
                    hint: 'Change visibility status on the public website',
                  },
                  {
                    key: 'allowDelete',
                    label: 'Allow Delete Project',
                    hint: 'Permanently delete project and its Storage assets',
                  },
                ] as const
              ).map((toggle) => {
                const disabled =
                  isLockedForCurrentUser || form.accessMode === 'super_admin_only';
                return (
                  <label
                    key={toggle.key}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border border-[#EAE1E6] text-xs ${
                      disabled ? 'opacity-60 cursor-not-allowed bg-[#FAF8F9]' : 'cursor-pointer hover:bg-[#FAF8F9]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form[toggle.key]}
                      disabled={disabled}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [toggle.key]: e.target.checked }))
                      }
                      className="mt-0.5 accent-[#9B0B5E]"
                    />
                    <div>
                      <p className="font-semibold text-[#1C1F1E]">{toggle.label}</p>
                      <p className="text-[11px] text-[#646B67]">{toggle.hint}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. Optional Restriction Note */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#646B67] mb-1.5">
              4. Internal Permission Note (Optional)
            </label>
            <input
              type="text"
              value={form.restrictedNote || ''}
              disabled={isLockedForCurrentUser}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, restrictedNote: e.target.value }))
              }
              placeholder="e.g. Live approved project — contact Super Admin before changing layout plan"
              className="w-full px-3.5 py-2 text-xs border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E] disabled:bg-[#FAF8F9]"
            />
          </div>

          <div className="pt-2 border-t border-[#EAE1E6] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#3D4340] bg-[#FAF8F9] hover:bg-[#EAE1E6] rounded-lg"
            >
              Cancel
            </button>
            {!isLockedForCurrentUser && (
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] disabled:opacity-60 rounded-lg"
              >
                {saving ? 'Saving Permissions...' : 'Save Edit Permissions'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
