'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, accountApi } from '@/lib/endpoints';
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '@/lib/api';
import { Account, ParentRegistrationPayload, RegistrationResponse, Role } from '@/lib/types';

interface AuthContextValue {
  account: Account | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | undefined;
  isAdmin: boolean;
  isTeacher: boolean;
  isParent: boolean;
  login: (payload: { email: string; password: string }) => Promise<Account>;
  register: (payload: ParentRegistrationPayload | FormData) => Promise<RegistrationResponse>;
  logout: () => Promise<void>;
  refreshAccount: () => Promise<Account>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null); // the "parent" object (parent | teacher | admin)
  const [isLoading, setIsLoading] = useState(true); // true until we've tried to hydrate from storage
  const router = useRouter();

  const hydrate = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setAccount(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await accountApi.me();
      setAccount(res.data.parent);
    } catch (err) {
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const res = await authApi.login({ email, password });
    setTokens({ access_token: res.data.access_token, refresh_token: res.data.refresh_token });
    setAccount(res.data.parent);
    return res.data.parent as Account;
  }, []);

  const register = useCallback(async (payload: ParentRegistrationPayload | FormData) => {
    const res = await authApi.register(payload);
    return res.data as RegistrationResponse;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(getRefreshToken());
    } catch {
      // Clear local credentials even if the API is temporarily unavailable.
    }
    clearTokens();
    setAccount(null);
    router.push('/login');
  }, [router]);

  const refreshAccount = useCallback(async () => {
    const res = await accountApi.me();
    setAccount(res.data.parent);
    return res.data.parent as Account;
  }, []);

  const value: AuthContextValue = {
    account,
    isAuthenticated: !!account,
    isLoading,
    role: account?.role,
    isAdmin: account?.role === 'admin',
    isTeacher: account?.role === 'teacher',
    isParent: account?.role === 'parent',
    login,
    register,
    logout,
    refreshAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
