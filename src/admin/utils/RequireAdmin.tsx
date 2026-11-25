import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { currentUser, isAuthorized, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F9] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-sm text-[#3D4340]">
          <Loader2 className="w-5 h-5 animate-spin text-[#9B0B5E]" />
          <span>Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  if (!currentUser || !isAuthorized) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
