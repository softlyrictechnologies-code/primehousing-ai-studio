import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';

export interface AdminUserProfile {
  uid: string;
  email: string;
  name: string;
  role: string;
  claims: Record<string, unknown>;
}

interface AdminAuthContextValue {
  currentUser: User | null;
  adminProfile: AdminUserProfile | null;
  isAuthorized: boolean;
  role: string | null;
  loading: boolean;
  authError: string;
  login: (email: string, password: string) => Promise<AdminUserProfile>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const ALLOWED_STAFF_ROLES = ['admin', 'super_admin', 'super-admin', 'editor', 'support'];

function mapAuthErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  const rawMessage = (error as { message?: string })?.message || '';

  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (code === 'auth/user-not-found') {
    return 'No administrator account was found for that email address.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed sign-in attempts. Please wait a few minutes before trying again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not authorized in Firebase Authentication. Add it under Authorized domains in the Firebase Console.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/user-disabled') {
    return 'This administrator account has been disabled.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while connecting to Firebase Authentication.';
  }
  return rawMessage || 'Authentication failed. Please try again.';
}

async function verifyAdminClaimsAndDoc(user: User): Promise<AdminUserProfile | null> {
  const tokenResult = await user.getIdTokenResult(true);
  const claims = (tokenResult?.claims || {}) as Record<string, unknown>;

  const claimRole = typeof claims.role === 'string' ? claims.role.toLowerCase() : '';
  const hasAdminClaim =
    claims.admin === true ||
    claims.superAdmin === true ||
    ALLOWED_STAFF_ROLES.includes(claimRole);

  let hasAdminDoc = false;
  let adminDocName = '';
  let adminDocRole = '';
  let isDeactivatedInRegistry = false;
  try {
    const adminSnap = await getDoc(doc(db, 'admins', user.uid));
    if (adminSnap.exists()) {
      const data = adminSnap.data() || {};
      adminDocName = typeof data.name === 'string' ? data.name : '';
      const rawDocRole =
        typeof data.role === 'string' ? data.role.trim().toLowerCase().replace('-', '_') : '';
      if (data.active === false) {
        isDeactivatedInRegistry = true;
      } else if (!rawDocRole || ALLOWED_STAFF_ROLES.includes(rawDocRole)) {
        hasAdminDoc = true;
        adminDocRole = rawDocRole || 'admin';
      }
    }
  } catch {
    // Rules may block reading admins/{uid} for non-admins; rely on claims if readable
  }

  if (isDeactivatedInRegistry || (!hasAdminClaim && !hasAdminDoc)) {
    return null;
  }

  let resolvedRole = 'admin';
  const normalizedClaimRole = claimRole.replace('-', '_');
  if (claims.superAdmin === true || normalizedClaimRole === 'super_admin') {
    resolvedRole = 'super_admin';
  } else if (claims.admin === true || normalizedClaimRole === 'admin') {
    resolvedRole = 'admin';
  } else if (normalizedClaimRole && ALLOWED_STAFF_ROLES.includes(normalizedClaimRole)) {
    resolvedRole = normalizedClaimRole;
  } else if (hasAdminDoc && adminDocRole) {
    resolvedRole = adminDocRole;
  }

  return {
    uid: user.uid,
    email: user.email || '',
    name: user.displayName || adminDocName || (user.email ? user.email.split('@')[0] : 'Administrator'),
    role: resolvedRole,
    claims,
  };
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setAdminProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const verified = await verifyAdminClaimsAndDoc(user);
        if (!verified) {
          await signOut(auth);
          setCurrentUser(null);
          setAdminProfile(null);
          setAuthError('Access denied: this account does not have administrator permissions.');
        } else {
          setCurrentUser(user);
          setAdminProfile(verified);
          setAuthError('');
        }
      } catch (err) {
        console.error('[AdminAuth:verify]', err);
        await signOut(auth).catch(() => undefined);
        setCurrentUser(null);
        setAdminProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (emailInput: string, passwordInput: string): Promise<AdminUserProfile> => {
    setAuthError('');
    const email = (emailInput || '').trim().toLowerCase();
    const password = passwordInput || '';

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const verified = await verifyAdminClaimsAndDoc(credential.user);
      if (!verified) {
        await signOut(auth);
        throw new Error(
          'Access denied: signed-in account lacks required administrator custom claims or admin registry entry.'
        );
      }
      setCurrentUser(credential.user);
      setAdminProfile(verified);
      return verified;
    } catch (error) {
      const friendly = mapAuthErrorMessage(error);
      setAuthError(friendly);
      throw new Error(friendly);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      setAdminProfile(null);
      setAuthError('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        currentUser,
        adminProfile,
        isAuthorized: Boolean(currentUser && adminProfile),
        role: adminProfile?.role || null,
        loading,
        authError,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return ctx;
}
