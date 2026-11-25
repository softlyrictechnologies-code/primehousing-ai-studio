import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Edit2,
  ExternalLink,
  Eye,
  Globe,
  GlobeLock,
  Lock,
  MessageSquare,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  deleteProjectAdmin,
  getAllProjectsAdmin,
  saveProjectAdmin,
  updateProjectPermissionsAdmin,
  updateProjectStatusAdmin,
} from '../../admin/services/adminProjectService';
import { getAllInquiriesAdmin } from '../../admin/services/adminInquiryService';
import { useAdminAuth } from '../../admin/context/AdminAuthContext';
import {
  canAdminRolePerformProjectAction,
  normalizeProjectEditPermissions,
} from '../../services/projectService';
import type {
  BuyerEnquiry,
  Project,
  ProjectEditPermissions,
  ProjectStatus,
} from '../../types/realEstate';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { ProjectFormModal } from '../../components/ProjectFormModal';
import { ProjectDetailsTemplate } from '../../components/ProjectDetailsTemplate';
import { ProjectPermissionsModal } from '../../components/ProjectPermissionsModal';
import { AdminPermissionsOverviewModal } from '../../components/AdminPermissionsOverviewModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';

export function AdminProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { adminProfile, role } = useAdminAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectEnquiries, setProjectEnquiries] = useState<BuyerEnquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [search, setSearch] = useState('');
  const [enquiryProjectFilter, setEnquiryProjectFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [permissionProject, setPermissionProject] = useState<Project | null>(null);
  const [permissionsOverviewOpen, setPermissionsOverviewOpen] = useState(false);
  const [previewProject, setPreviewProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const normalizedRole = String(role || 'admin').toLowerCase().replace('-', '_');
  const canCreateProject = normalizedRole !== 'support';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projList, allInqs] = await Promise.all([
        getAllProjectsAdmin(),
        getAllInquiriesAdmin().catch(() => []),
      ]);
      setProjects(projList);
      setProjectEnquiries(
        allInqs.filter((inq) => Boolean(inq.projectId || inq.projectName || inq.enquiryType === 'project'))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Project Management — PRIME HOUSING Admin';
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditingProject(null);
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const totalProjects = projects.length;
  const publishedProjects = projects.filter((p) => p.status === 'published').length;
  const draftProjects = projects.filter((p) => p.status === 'draft').length;
  const unpublishedProjects = projects.filter((p) => p.status === 'unpublished').length;
  const totalProjectEnquiries = projectEnquiries.length;

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.approvalType.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredEnquiries = projectEnquiries.filter((inq) => {
    if (enquiryProjectFilter !== 'all') {
      const target = enquiryProjectFilter.toLowerCase();
      const matchesId = (inq.projectId || '').toLowerCase() === target;
      const matchesName = (inq.projectName || inq.propertyTitle || '').toLowerCase() === target;
      if (!matchesId && !matchesName) return false;
    }
    return true;
  });

  const handleSaveProject = async (projectData: Project, previousProject: Project | null) => {
    setActionError('');
    setNotice('');
    const saved = await saveProjectAdmin(projectData, previousProject);
    setNotice(
      `Project "${saved.name}" saved (${saved.status === 'published' ? 'Published live' : saved.status}).`
    );
    await load();
  };

  const handleTogglePublish = async (project: Project) => {
    setActionError('');
    setNotice('');
    const nextStatus: ProjectStatus =
      project.status === 'published' ? 'unpublished' : 'published';
    try {
      await updateProjectStatusAdmin(project, nextStatus);
      setNotice(
        `"${project.name}" is now ${nextStatus === 'published' ? 'Published' : 'Unpublished'}.`
      );
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update project status.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setActionError('');
    setNotice('');
    try {
      await deleteProjectAdmin(deleteTarget);
      setNotice(`Project "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to delete project.');
      setDeleteTarget(null);
    }
  };

  const handleSavePermissions = async (
    project: Project,
    nextPermissions: ProjectEditPermissions
  ) => {
    setActionError('');
    setNotice('');
    await updateProjectPermissionsAdmin(project, nextPermissions);
    setNotice(`Edit permissions updated for "${project.name}".`);
    await load();
  };

  const kpiCards = [
    { label: 'Total Projects', value: totalProjects, tone: 'text-[#1C1F1E]' },
    { label: 'Published Projects', value: publishedProjects, tone: 'text-[#9B0B5E]' },
    { label: 'Draft Projects', value: draftProjects, tone: 'text-[#646B67]' },
    { label: 'Unpublished Projects', value: unpublishedProjects, tone: 'text-amber-700' },
    { label: 'Total Project Enquiries', value: totalProjectEnquiries, tone: 'text-[#9B0B5E]' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1F1E]">
            Project Management
          </h1>
          <p className="text-xs text-[#646B67] mt-1">
            Create unlimited real estate projects, manage project edit permissions, upload visuals &amp; documents, and publish dynamically.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setPermissionsOverviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] rounded-lg transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin &amp; Permissions List</span>
          </button>

          {canCreateProject && (
            <button
              type="button"
              onClick={() => {
                setEditingProject(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Signed-in Admin & Active Role Permissions Bar */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#F7E8F1] text-[#9B0B5E] font-semibold uppercase tracking-wide text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{normalizedRole.replace('_', ' ')}</span>
          </span>
          <span className="text-[#3D4340]">
            Signed in as <strong className="text-[#1C1F1E]">{adminProfile?.name || 'Admin'}</strong>{' '}
            <span className="text-[#646B67]">({adminProfile?.email || 'Authenticated'})</span>
          </span>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white border border-[#EAE1E6] rounded-xl p-4">
            <p className="text-xs text-[#646B67] mb-1">{card.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
          {actionError}
        </div>
      )}
      {notice && (
        <div className="p-3.5 rounded-lg bg-[#F7E8F1] border border-[#9B0B5E]/20 text-xs text-[#9B0B5E]">
          {notice}
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'published', 'draft', 'unpublished'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-[#9B0B5E] text-white'
                  : 'bg-[#FAF8F9] text-[#3D4340] hover:bg-[#EAE1E6]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search project name, location, slug..."
          className="px-3.5 py-2 text-xs border border-[#D7C8D1] rounded-lg w-full sm:w-72 focus:outline-none focus:border-[#9B0B5E]"
        />
      </div>

      {/* Projects Table */}
      <div className="bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#646B67]">Loading projects...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-[#646B67]">No projects match your current filter.</p>
            <button
              type="button"
              onClick={() => {
                setEditingProject(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#9B0B5E] rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Project</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                <tr>
                  <th className="px-4 py-3 font-medium">Project Name</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Edit Permissions</th>
                  <th className="px-4 py-3 font-medium">Created Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1E6]">
                {filteredProjects.map((proj) => {
                  const perms = normalizeProjectEditPermissions(proj.editPermissions);
                  const canEdit = canAdminRolePerformProjectAction(role, proj, 'edit');
                  const canPublish = canAdminRolePerformProjectAction(role, proj, 'publish');
                  const canDelete = canAdminRolePerformProjectAction(role, proj, 'delete');
                  const canManagePerms = canAdminRolePerformProjectAction(
                    role,
                    proj,
                    'manage_permissions'
                  );

                  const permSummaryLabel =
                    perms.accessMode === 'super_admin_only'
                      ? 'Super Admin Only'
                      : perms.accessMode === 'custom_roles'
                        ? `Custom (${perms.allowedRoles.map((r) => r.replace('_', ' ')).join(', ')})`
                        : 'All Admins & Editors';

                  const capabilityList =
                    perms.accessMode === 'super_admin_only'
                      ? 'Locked for other roles'
                      : [
                          perms.allowContentEdit && 'Edit',
                          perms.allowMediaUpload && 'Media',
                          perms.allowPublishToggle && 'Publish',
                          perms.allowDelete && 'Delete',
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'View Only';

                  return (
                    <tr key={proj.id} className="hover:bg-[#FAF8F9]/60">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-[#1C1F1E]">{proj.name}</p>
                        <p className="text-[11px] font-mono text-[#646B67]">
                          /projects/{proj.slug}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-[#3D4340] max-w-[240px]">
                        <p className="truncate">{proj.location || '—'}</p>
                        {proj.approvalType && (
                          <p className="text-[11px] text-[#646B67] truncate">{proj.approvalType}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs font-medium capitalize ${
                            proj.status === 'published'
                              ? 'text-[#9B0B5E]'
                              : proj.status === 'unpublished'
                                ? 'text-amber-700'
                                : 'text-[#646B67]'
                          }`}
                        >
                          {proj.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              perms.accessMode === 'super_admin_only'
                                ? 'text-amber-700'
                                : 'text-[#1C1F1E]'
                            }`}
                          >
                            {perms.accessMode === 'super_admin_only' && (
                              <Lock className="w-3 h-3 shrink-0" />
                            )}
                            <span>{permSummaryLabel}</span>
                          </span>
                          <span className="text-[11px] text-[#646B67]">{capabilityList}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#646B67] tabular-nums whitespace-nowrap">
                        {formatDate(proj.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={!canEdit}
                            title={
                              canEdit
                                ? 'Edit project details'
                                : 'Editing locked by project permissions'
                            }
                            onClick={() => {
                              setEditingProject(proj);
                              setFormOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#9B0B5E] bg-[#F7E8F1] hover:bg-[#EED4E3] disabled:opacity-45 disabled:cursor-not-allowed rounded-md"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPermissionProject(proj)}
                            title={
                              canManagePerms
                                ? 'Edit project permissions'
                                : 'View project permissions'
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1C1F1E] border border-[#D7C8D1] bg-white hover:bg-[#FAF8F9] rounded-md"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#9B0B5E]" />
                            <span>Edit Permission</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPreviewProject(proj)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#3D4340] bg-[#FAF8F9] hover:bg-[#EAE1E6] rounded-md"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>

                          {proj.status === 'published' && (
                            <Link
                              to={`/projects/${proj.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#9B0B5E] border border-[#EAE1E6] hover:bg-[#FAF8F9] rounded-md"
                            >
                              <span>View</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}

                          <button
                            type="button"
                            disabled={!canPublish}
                            onClick={() => handleTogglePublish(proj)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md disabled:opacity-45 disabled:cursor-not-allowed ${
                              proj.status === 'published'
                                ? 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                                : 'text-white bg-[#9B0B5E] hover:bg-[#7A084A]'
                            }`}
                          >
                            {proj.status === 'published' ? (
                              <>
                                <GlobeLock className="w-3.5 h-3.5" />
                                <span>Unpublish</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3.5 h-3.5" />
                                <span>Publish</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={!canDelete}
                            onClick={() => setDeleteTarget(proj)}
                            aria-label={`Delete ${proj.name}`}
                            className="p-1.5 rounded-md text-[#646B67] hover:bg-red-50 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Project Enquiries Section */}
      <section className="bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#EAE1E6] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#9B0B5E]" />
            <h2 className="text-sm font-semibold text-[#1C1F1E]">
              Project Enquiries ({filteredEnquiries.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={enquiryProjectFilter}
              onChange={(e) => setEnquiryProjectFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-[#FAF8F9] border border-[#D7C8D1] rounded-lg focus:outline-none focus:border-[#9B0B5E]"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <Link
              to="/admin/enquiries"
              className="text-xs font-medium text-[#9B0B5E] hover:underline"
            >
              Manage in Enquiries Console
            </Link>
          </div>
        </div>

        {filteredEnquiries.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#646B67]">
            No project enquiries recorded yet. Enquiries submitted from any project page will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ref</th>
                  <th className="px-4 py-2.5 font-medium">Visitor</th>
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-4 py-2.5 font-medium">Enquiry Type</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1E6]">
                {filteredEnquiries.slice(0, 15).map((enq) => (
                  <tr key={enq.id} className="hover:bg-[#FAF8F9]/60">
                    <td className="px-4 py-2.5 font-mono text-[#9B0B5E]">{enq.enquiryRef}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-[#1C1F1E]">{enq.buyerName}</p>
                      <p className="text-[11px] text-[#646B67]">{enq.phone}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[#3D4340]">
                      {enq.projectName || enq.propertyTitle}
                    </td>
                    <td className="px-4 py-2.5 text-[#646B67]">{enq.enquiryCategory || 'General'}</td>
                    <td className="px-4 py-2.5 text-[#646B67] tabular-nums">
                      {formatDateTime(enq.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-[#1C1F1E]">{enq.enquiryStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reusable 12-Tab Add/Edit Project Form */}
      <ProjectFormModal
        open={formOpen}
        heading={editingProject ? `Edit Project — ${editingProject.name}` : 'Add New Project'}
        initialProject={editingProject}
        onSave={handleSaveProject}
        onPreview={(draftProj) => setPreviewProject(draftProj)}
        onClose={() => {
          setFormOpen(false);
          setEditingProject(null);
        }}
      />

      {/* Full-Screen Admin Preview Modal using the exact public ProjectDetailsTemplate */}
      {previewProject && (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto">
          <ProjectDetailsTemplate
            project={previewProject}
            isPreview
            onClosePreview={() => setPreviewProject(null)}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Project"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}" and remove its uploaded project files?`}
        confirmLabel="Delete Project"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Per-Project Edit Permission Modal */}
      <ProjectPermissionsModal
        open={Boolean(permissionProject)}
        project={permissionProject}
        currentRole={role}
        onSave={handleSavePermissions}
        onClose={() => setPermissionProject(null)}
      />

      {/* Admin Roles & Project Permissions Directory Modal */}
      <AdminPermissionsOverviewModal
        open={permissionsOverviewOpen}
        projects={projects}
        currentAdminEmail={adminProfile?.email || ''}
        currentAdminName={adminProfile?.name || 'Administrator'}
        currentAdminRole={role}
        onEditProjectPermission={(proj) => setPermissionProject(proj)}
        onClose={() => setPermissionsOverviewOpen(false)}
      />
    </div>
  );
}
