import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Menu, X } from 'lucide-react';
import { EMPTY_WEBSITE_CONTENT, getPublicSiteContent } from '../services/publicSiteContent';
import { PROJECTS_UPDATED_EVENT, getPublishedProjects } from '../services/projectService';
import type { Project, WebsiteContent } from '../types/realEstate';
import { SocialSidebar } from './SocialSidebar';

const BRAND_NAME = 'PRIME HOUSING';
const LOGO_URL =
  'https://firebasestorage.googleapis.com/v0/b/prime-housing-72330.firebasestorage.app/o/logo.png?alt=media&token=1f4ff1d7-9db1-44dd-b7fb-92740bb7b1b7';

export function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopPropsOpen, setDesktopPropsOpen] = useState(false);
  const [desktopProjectsOpen, setDesktopProjectsOpen] = useState(false);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);
  const [mobileProjectsOpen, setMobileProjectsOpen] = useState(true);

  const [content, setContent] = useState<WebsiteContent>(EMPTY_WEBSITE_CONTENT);
  const [publishedProjects, setPublishedProjects] = useState<Project[]>([]);

  const location = useLocation();
  const displayBrandName =
    !content.companyName || /^(prime housing|verdeland estates?)$/i.test(content.companyName.trim())
      ? BRAND_NAME
      : content.companyName;

  useEffect(() => {
    setMobileMenuOpen(false);
    setDesktopPropsOpen(false);
    setDesktopProjectsOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    let active = true;
    getPublicSiteContent()
      .then((data) => {
        if (active) setContent(data);
      })
      .catch((err) => {
        console.error('[PublicLayout:siteContent]', err);
      });

    const loadProjects = () => {
      getPublishedProjects()
        .then((list) => {
          if (active) setPublishedProjects(list);
        })
        .catch((err) => {
          console.error('[PublicLayout:projects]', err);
        });
    };

    loadProjects();
    window.addEventListener(PROJECTS_UPDATED_EVENT, loadProjects);

    return () => {
      active = false;
      window.removeEventListener(PROJECTS_UPDATED_EVENT, loadProjects);
    };
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 border-b-2 ${
      isActive
        ? 'text-[#9B0B5E] border-[#9B0B5E]'
        : 'text-[#3D4340] border-transparent hover:text-[#9B0B5E] hover:border-[#9B0B5E]/40'
    }`;

  const isPropertiesSectionActive =
    location.pathname.startsWith('/properties') ||
    location.pathname.startsWith('/projects') ||
    location.pathname.startsWith('/submit-land');

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F9] text-[#1C1F1E]">
      {/* Sticky Top Bar following strict 3-zone contract */}
      <header className="sticky top-0 z-40 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#EAE1E6]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[92px] sm:h-[120px] flex items-center justify-between gap-8">
          {/* Zone 1: Brand Logo */}
          <Link to="/" className="inline-flex items-center shrink-0">
            <img
              src={LOGO_URL}
              alt="PRIME HOUSING logo"
              className="w-[132px] sm:w-[180px] h-auto object-contain shrink-0"
            />
          </Link>

          {/* Zone 2: Concise single-line navigation links with Properties dropdown */}
          <nav className="hidden md:flex items-center gap-7">
            <NavLink to="/" end className={navLinkClass}>
              Home
            </NavLink>

            {/* Properties Hover & Click Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setDesktopPropsOpen(true)}
              onMouseLeave={() => {
                setDesktopPropsOpen(false);
                setDesktopProjectsOpen(false);
              }}
            >
              <div className="inline-flex items-center gap-1">
                <NavLink
                  to="/properties"
                  className={() =>
                    `whitespace-nowrap shrink-0 text-sm font-medium transition-colors py-1 border-b-2 ${
                      isPropertiesSectionActive
                        ? 'text-[#9B0B5E] border-[#9B0B5E]'
                        : 'text-[#3D4340] border-transparent hover:text-[#9B0B5E] hover:border-[#9B0B5E]/40'
                    }`
                  }
                >
                  Properties
                </NavLink>
                <button
                  type="button"
                  aria-label="Toggle Properties menu"
                  aria-expanded={desktopPropsOpen}
                  onClick={() => setDesktopPropsOpen((prev) => !prev)}
                  className="p-0.5 text-[#3D4340] hover:text-[#9B0B5E]"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      desktopPropsOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>

              {desktopPropsOpen && (
                <div className="absolute left-0 top-full pt-2 w-56 z-50">
                  <div className="bg-white border border-[#EAE1E6] rounded-xl shadow-lg py-1.5">
                    {/* Option 1: Projects (Nested Hover & Click Dropdown) */}
                    <div
                      className="relative"
                      onMouseEnter={() => setDesktopProjectsOpen(true)}
                      onMouseLeave={() => setDesktopProjectsOpen(false)}
                    >
                      <button
                        type="button"
                        onClick={() => setDesktopProjectsOpen((prev) => !prev)}
                        aria-expanded={desktopProjectsOpen}
                        className="w-full px-4 py-2.5 text-left text-sm font-medium text-[#1C1F1E] hover:bg-[#FAF8F9] hover:text-[#9B0B5E] flex items-center justify-between gap-2 transition-colors"
                      >
                        <span>Projects</span>
                        <ChevronRight className="w-4 h-4 text-[#646B67]" />
                      </button>

                      {desktopProjectsOpen && (
                        <div className="absolute left-full top-0 pl-1.5 w-64 z-50">
                          <div className="bg-white border border-[#EAE1E6] rounded-xl shadow-lg py-1.5 max-h-80 overflow-y-auto">
                            {publishedProjects.length === 0 ? (
                              <div className="px-4 py-2.5 text-xs text-[#646B67]">
                                No published projects available
                              </div>
                            ) : (
                              publishedProjects.map((project) => (
                                <Link
                                  key={project.id}
                                  to={`/projects/${project.slug}`}
                                  className="block px-4 py-2.5 text-sm font-medium text-[#1C1F1E] hover:bg-[#F7E8F1] hover:text-[#9B0B5E] transition-colors truncate"
                                >
                                  {project.name}
                                </Link>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Option 2: Sell Your Plots */}
                    <Link
                      to="/submit-land"
                      className="block px-4 py-2.5 text-sm font-medium text-[#1C1F1E] hover:bg-[#FAF8F9] hover:text-[#9B0B5E] transition-colors"
                    >
                      Sell Your Plots
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <NavLink to="/about" className={navLinkClass}>
              About Us
            </NavLink>
            <NavLink to="/contact" className={navLinkClass}>
              Contact Us
            </NavLink>
          </nav>

          {/* Zone 3: Primary Action CTA + Mobile menu toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/submit-land"
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-[#9B0B5E] hover:bg-[#7A084A] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Sell Your Plots
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-[#1C1F1E] hover:bg-[#FAF8F9]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-[#EAE1E6] px-4 py-4 space-y-1.5 max-h-[80vh] overflow-y-auto">
            <NavLink
              to="/"
              end
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#1C1F1E] hover:bg-[#FAF8F9]"
            >
              Home
            </NavLink>

            {/* Mobile Properties Expandable Dropdown */}
            <div className="rounded-lg border border-[#EAE1E6]/70 bg-[#FAF8F9]/50">
              <div className="flex items-center justify-between pr-2">
                <NavLink
                  to="/properties"
                  className="flex-1 px-3 py-2.5 text-sm font-medium text-[#1C1F1E] hover:text-[#9B0B5E]"
                >
                  Properties
                </NavLink>
                <button
                  type="button"
                  onClick={() => setMobilePropsOpen((prev) => !prev)}
                  aria-label="Toggle Properties submenu"
                  aria-expanded={mobilePropsOpen}
                  className="p-2 text-[#3D4340]"
                >
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${mobilePropsOpen ? 'rotate-180' : ''}`}
                  />
                </button>
              </div>

              {mobilePropsOpen && (
                <div className="pl-3 pr-2 pb-2.5 space-y-1.5 border-t border-[#EAE1E6]">
                  {/* Mobile Projects Dropdown */}
                  <div>
                    <button
                      type="button"
                      onClick={() => setMobileProjectsOpen((prev) => !prev)}
                      aria-expanded={mobileProjectsOpen}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-[#9B0B5E] hover:bg-white"
                    >
                      <span>Projects</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          mobileProjectsOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {mobileProjectsOpen && (
                      <div className="pl-3 mt-1 space-y-1 border-l border-[#D7C8D1] ml-3">
                        {publishedProjects.length === 0 ? (
                          <span className="block px-3 py-1.5 text-xs text-[#646B67]">
                            No published projects
                          </span>
                        ) : (
                          publishedProjects.map((project) => (
                            <Link
                              key={project.id}
                              to={`/projects/${project.slug}`}
                              className="block px-3 py-2 rounded-lg text-sm font-medium text-[#1C1F1E] hover:bg-[#F7E8F1] hover:text-[#9B0B5E]"
                            >
                              {project.name}
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Mobile Sell Your Plots */}
                  <NavLink
                    to="/submit-land"
                    className="block px-3 py-2 rounded-lg text-sm font-medium text-[#9B0B5E] bg-[#F7E8F1]"
                  >
                    Sell Your Plots
                  </NavLink>
                </div>
              )}
            </div>

            <NavLink
              to="/about"
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#1C1F1E] hover:bg-[#FAF8F9]"
            >
              About Us
            </NavLink>
            <NavLink
              to="/contact"
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[#1C1F1E] hover:bg-[#FAF8F9]"
            >
              Contact Us
            </NavLink>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <SocialSidebar contactPhone={content.contactPhone} />

      {/* Quiet Editorial Footer */}
      <footer className="bg-[#1D0816] text-[#EAE1E6] border-t border-[#2B302E]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-10 border-b border-white/10">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={LOGO_URL}
                  alt="PRIME HOUSING logo"
                  className="h-9 w-auto object-contain shrink-0"
                />
                <p className="font-display text-xl font-semibold text-white">
                  {displayBrandName}
                </p>
              </div>
              {content.tagline && (
                <p className="text-sm text-[#A3ABA6] leading-relaxed">{content.tagline}</p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wider text-white mb-4">Navigation</h3>
              <ul className="space-y-2.5 text-sm text-[#A3ABA6]">
                <li>
                  <Link to="/" className="hover:text-white transition-colors">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/properties" className="hover:text-white transition-colors">
                    Explore Properties
                  </Link>
                </li>
                {publishedProjects.slice(0, 3).map((project) => (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.slug}`}
                      className="hover:text-white transition-colors"
                    >
                      {project.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/submit-land" className="hover:text-white transition-colors">
                    Sell Your Plots
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-white transition-colors">
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wider text-white mb-4">
                Popular Locations
              </h3>
              <ul className="space-y-2.5 text-sm text-[#A3ABA6]">
                {content.popularLocationNames.slice(0, 5).map((loc) => (
                  <li key={loc}>
                    <Link
                      to={`/properties?location=${encodeURIComponent(loc)}`}
                      className="hover:text-white transition-colors"
                    >
                      {loc}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold tracking-wider text-white mb-4">
                Advisory Office
              </h3>
              <div className="space-y-2.5 text-sm text-[#A3ABA6]">
                {content.contactAddress && <p>{content.contactAddress}</p>}
                {content.contactPhone && (
                  <p>
                    <a
                      href={`tel:${content.contactPhone}`}
                      className="hover:text-white transition-colors"
                    >
                      {content.contactPhone}
                    </a>
                  </p>
                )}
                {content.contactEmail && (
                  <p>
                    <a
                      href={`mailto:${content.contactEmail}`}
                      className="hover:text-white transition-colors"
                    >
                      {content.contactEmail}
                    </a>
                  </p>
                )}
                {content.officeHours && (
                  <p className="text-xs text-[#7D8580]">{content.officeHours}</p>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7D8580]">
            <p>
              © {new Date().getFullYear()} {displayBrandName}. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link to="/submit-land" className="hover:text-white transition-colors">
                Sell Your Plots
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
