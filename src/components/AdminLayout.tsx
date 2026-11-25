import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  ClipboardCheck,
  ExternalLink,
  FileEdit,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../admin/context/AdminAuthContext';

const LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/prime-housing-72330.firebasestorage.app/o/logo.png?alt=media&token=1f4ff1d7-9db1-44dd-b7fb-92740bb7b1b7';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/projects', label: 'Project Management', icon: FolderKanban, end: false },
  { to: '/admin/submissions', label: 'Submissions', icon: ClipboardCheck, end: false },
  { to: '/admin/properties', label: 'Properties', icon: Building2, end: false },
  { to: '/admin/enquiries', label: 'Buyer Enquiries', icon: MessageSquare, end: false },
  { to: '/admin/locations', label: 'Locations & Categories', icon: MapPin, end: false },
  { to: '/admin/content', label: 'Website Content', icon: FileEdit, end: false },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminProfile: session, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeNav =
    NAV_ITEMS.find((item) =>
      item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
    ) || NAV_ITEMS[0];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-[#9B0B5E] text-white'
        : 'text-[#3D4340] hover:bg-[#F7E8F1] hover:text-[#9B0B5E]'
    }`;

  return (
    <div className="min-h-screen bg-[#FAF8F9] text-[#1C1F1E] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-[260px] shrink-0 bg-white border-r border-[#EAE1E6] sticky top-0 h-screen">
        <div className="min-h-16 px-4 py-2 flex items-center border-b border-[#EAE1E6]">
          <Link
            to="/admin"
            className="flex items-center gap-2.5 min-w-0 w-full font-display text-base font-semibold text-[#9B0B5E] leading-tight"
          >
            <img
              src={LOGO_URL}
              alt="PRIME HOUSING logo"
              className="h-8 w-auto object-contain shrink-0"
            />
            <span className="min-w-0 break-words">PRIME HOUSING Admin</span>
          </Link>
        </div>

        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-[#EAE1E6] space-y-1.5">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-medium text-[#3D4340] hover:bg-[#FAF8F9]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Public Website</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-[260px] bg-white h-full flex flex-col z-10 shadow-xl">
            <div className="min-h-16 px-4 py-2 flex items-center justify-between gap-2 border-b border-[#EAE1E6]">
              <Link
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2.5 min-w-0 flex-1 font-display text-base font-semibold text-[#9B0B5E] leading-tight"
              >
                <img
                  src={LOGO_URL}
                  alt="PRIME HOUSING logo"
                  className="h-8 w-auto object-contain shrink-0"
                />
                <span className="min-w-0 break-words">PRIME HOUSING Admin</span>
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close admin menu"
                className="p-1.5 rounded-lg text-[#646B67] shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={navClass}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-3.5 border-t border-[#EAE1E6] space-y-1.5">
              <Link
                to="/"
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-medium text-[#3D4340] hover:bg-[#FAF8F9]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Public Website</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-[#EAE1E6] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-2 rounded-lg text-[#1C1F1E] hover:bg-[#FAF8F9]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#646B67] truncate">
              <span>Admin</span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-[#1C1F1E] truncate">{activeNav.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-xs font-medium text-[#1C1F1E]">{session?.name}</p>
              <p className="text-[11px] text-[#646B67]">{session?.email}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
