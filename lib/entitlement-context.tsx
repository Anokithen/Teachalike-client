'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { pricingApi } from '@/lib/endpoints';
import { EffectiveEntitlements } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';

interface EntitlementContextValue {
  entitlements: EffectiveEntitlements | null;
  loading: boolean;
  refresh: () => Promise<void>;
  canUse: (feature: string) => boolean;
  limitFor: (feature: string) => number | null;
}

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [entitlements, setEntitlements] = useState<EffectiveEntitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!isAuthenticated) { setEntitlements(null); setLoading(false); return; }
    try { const response = await pricingApi.me(); setEntitlements(response.data.entitlements); }
    catch { setEntitlements(null); }
    finally { setLoading(false); }
  }, [isAuthenticated]);
  useEffect(() => { void refresh(); }, [refresh]);
  return <EntitlementContext.Provider value={{ entitlements, loading, refresh,
    canUse: (feature) => entitlements?.features[feature]?.enabled ?? true,
    limitFor: (feature) => entitlements?.features[feature]?.unlimited ? null : entitlements?.features[feature]?.limit ?? null,
  }}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements() {
  const value = useContext(EntitlementContext);
  if (!value) throw new Error('useEntitlements must be used within EntitlementProvider');
  return value;
}
