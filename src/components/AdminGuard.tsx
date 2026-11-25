import type { ReactNode } from 'react';
import { RequireAdmin } from '../admin/utils/RequireAdmin';

export function AdminGuard({ children }: { children: ReactNode }) {
  return <RequireAdmin>{children}</RequireAdmin>;
}
