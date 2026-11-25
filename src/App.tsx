import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { AdminLayout } from './components/AdminLayout';
import { AdminGuard } from './components/AdminGuard';
import { HomePage } from './pages/public/HomePage';
import { PropertiesPage } from './pages/public/PropertiesPage';
import { PropertyDetailsPage } from './pages/public/PropertyDetailsPage';
import { ProjectDetailsPage } from './pages/public/ProjectDetailsPage';
import { SubmitLandPage } from './pages/public/SubmitLandPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminSubmissionsPage } from './pages/admin/AdminSubmissionsPage';
import { AdminPropertiesPage } from './pages/admin/AdminPropertiesPage';
import { AdminProjectsPage } from './pages/admin/AdminProjectsPage';
import { AdminEnquiriesPage } from './pages/admin/AdminEnquiriesPage';
import { AdminLocationsPage } from './pages/admin/AdminLocationsPage';
import { AdminContentPage } from './pages/admin/AdminContentPage';
import { AdminAuthProvider } from './admin/context/AdminAuthContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public Website */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/properties" element={<PropertiesPage />} />
            <Route path="/properties/:id" element={<PropertyDetailsPage />} />
            <Route path="/projects/:slug" element={<ProjectDetailsPage />} />
            <Route path="/submit-land" element={<SubmitLandPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Route>

          {/* Admin Authentication */}
          <Route path="/admin/login" element={<AdminLoginPage />} />

          {/* Protected Admin Workspace */}
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="submissions" element={<AdminSubmissionsPage />} />
            <Route path="properties" element={<AdminPropertiesPage />} />
            <Route path="projects" element={<AdminProjectsPage />} />
            <Route path="enquiries" element={<AdminEnquiriesPage />} />
            <Route path="locations" element={<AdminLocationsPage />} />
            <Route path="content" element={<AdminContentPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
