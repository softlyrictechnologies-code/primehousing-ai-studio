import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { getAdminDashboardStats } from '../../admin/services/adminDashboardService';
import type {
  ActivityLogItem,
  BuyerEnquiry,
  DashboardStats,
  LandownerSubmission,
  Property,
} from '../../types/realEstate';
import { formatArea, formatCurrency, formatDate } from '../../utils/formatters';

export function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<LandownerSubmission[]>([]);
  const [recentEnquiries, setRecentEnquiries] = useState<BuyerEnquiry[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    document.title = 'Admin Dashboard — PRIME HOUSING';
    let active = true;
    const load = async () => {
      try {
        const data = await getAdminDashboardStats();
        if (!active) return;
        setStats(data.stats);
        setRecentProperties(data.recentProperties);
        setRecentSubmissions(data.recentSubmissions);
        setRecentEnquiries(data.recentEnquiries);
        setActivityLog(data.activityLog);
      } catch (err) {
        if (active) {
          setLoadError(
            err instanceof Error ? err.message : 'Unable to load dashboard statistics.'
          );
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div key={n} className="h-24 bg-white border border-[#EAE1E6] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const statCards = [
    { label: 'Total Projects', value: stats.totalProjects, tone: 'text-[#1C1F1E]' },
    { label: 'Published Projects', value: stats.publishedProjects, tone: 'text-[#9B0B5E]' },
    { label: 'Total Properties', value: stats.totalProperties, tone: 'text-[#1C1F1E]' },
    { label: 'Published Listings', value: stats.publishedProperties, tone: 'text-[#9B0B5E]' },
    { label: 'Draft Properties', value: stats.draftProperties, tone: 'text-[#646B67]' },
    { label: 'Pending Submissions', value: stats.pendingSubmissions, tone: 'text-[#B45309]' },
    { label: 'Approved Submissions', value: stats.approvedSubmissions, tone: 'text-[#9B0B5E]' },
    { label: 'Rejected Submissions', value: stats.rejectedSubmissions, tone: 'text-[#B91C1C]' },
    { label: 'New Buyer Enquiries', value: stats.newEnquiries, tone: 'text-[#9B0B5E]' },
    { label: 'Closed Enquiries', value: stats.closedEnquiries, tone: 'text-[#646B67]' },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-medium text-[#1C1F1E]">
            Operations Dashboard
          </h1>
          <p className="text-xs text-[#646B67] mt-1">
            Live overview of projects, property inventory, landowner verifications, and buyer enquiries.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/projects"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manage Projects</span>
          </Link>
          <Link
            to="/admin/properties?new=1"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1C1F1E] bg-white border border-[#EAE1E6] hover:bg-[#FAF8F9] rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Property</span>
          </Link>
          <Link
            to="/admin/submissions"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1C1F1E] bg-white border border-[#EAE1E6] hover:bg-[#FAF8F9] rounded-lg transition-colors"
          >
            <span>Review Submissions</span>
          </Link>
          <Link
            to="/admin/enquiries"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1C1F1E] bg-white border border-[#EAE1E6] hover:bg-[#FAF8F9] rounded-lg transition-colors"
          >
            <span>Manage Enquiries</span>
          </Link>
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-[#EAE1E6] rounded-xl p-4 sm:p-5"
          >
            <p className="text-xs text-[#646B67] mb-1.5">{card.label}</p>
            <p className={`text-2xl sm:text-3xl font-semibold tabular-nums ${card.tone}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main Tables Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Latest Landowner Submissions */}
        <section className="xl:col-span-6 bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAE1E6] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1C1F1E]">Latest Landowner Submissions</h2>
            <Link
              to="/admin/submissions"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9B0B5E] hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ref</th>
                  <th className="px-4 py-2.5 font-medium">Owner</th>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium text-right">Expected</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1E6]">
                {recentSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#FAF8F9]/60">
                    <td className="px-4 py-3 font-mono text-[#9B0B5E]">{sub.submissionRef}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1F1E]">{sub.ownerName}</td>
                    <td className="px-4 py-3 text-[#646B67]">{sub.location}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(sub.expectedPrice)}
                    </td>
                    <td className="px-4 py-3 capitalize text-[#3D4340]">
                      {sub.reviewStatus.replace('_', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Buyer Enquiries */}
        <section className="xl:col-span-6 bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAE1E6] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1C1F1E]">Recent Buyer Enquiries</h2>
            <Link
              to="/admin/enquiries"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9B0B5E] hover:underline"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ref</th>
                  <th className="px-4 py-2.5 font-medium">Buyer</th>
                  <th className="px-4 py-2.5 font-medium">Related Property</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1E6]">
                {recentEnquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-[#FAF8F9]/60">
                    <td className="px-4 py-3 font-mono text-[#9B0B5E]">{enq.enquiryRef}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1F1E]">{enq.buyerName}</td>
                    <td className="px-4 py-3 text-[#646B67] truncate max-w-[180px]">
                      {enq.propertyTitle}
                    </td>
                    <td className="px-4 py-3 text-[#3D4340]">{enq.enquiryStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recently Added Properties */}
        <section className="xl:col-span-7 bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAE1E6] flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1C1F1E]">Recently Added Properties</h2>
            <Link
              to="/admin/properties"
              className="inline-flex items-center gap-1 text-xs font-medium text-[#9B0B5E] hover:underline"
            >
              <span>Manage all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F9] text-[#646B67] border-b border-[#EAE1E6]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Ref</th>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium text-right">Area</th>
                  <th className="px-4 py-2.5 font-medium text-right">Price</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE1E6]">
                {recentProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-[#FAF8F9]/60">
                    <td className="px-4 py-3 font-mono text-[#9B0B5E]">{prop.propertyRef}</td>
                    <td className="px-4 py-3 font-medium text-[#1C1F1E] truncate max-w-[200px]">
                      {prop.title}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[#646B67]">
                      {formatArea(prop.area, prop.areaUnit)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      {formatCurrency(prop.price)}
                    </td>
                    <td className="px-4 py-3 capitalize text-[#3D4340]">{prop.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Activity Log */}
        <section className="xl:col-span-5 bg-white border border-[#EAE1E6] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#EAE1E6]">
            <h2 className="text-sm font-semibold text-[#1C1F1E]">Recent Activity</h2>
          </div>
          <div className="divide-y divide-[#EAE1E6]">
            {activityLog.slice(0, 6).map((item) => (
              <div key={item.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-[#1C1F1E]">{item.action}</p>
                  <span className="text-[11px] text-[#646B67] tabular-nums shrink-0">
                    {formatDate(item.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-[#646B67] mt-0.5 truncate">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
