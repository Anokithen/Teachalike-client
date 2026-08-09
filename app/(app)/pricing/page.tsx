'use client';

import { useEffect, useState } from 'react';
import { Check, Crown, Sparkles } from 'lucide-react';
import { pricingApi } from '@/lib/endpoints';
import { ApiErrorShape, PricingPlan } from '@/lib/types';
import { useEntitlements } from '@/lib/entitlement-context';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';

const labels: Record<string, string> = { children: 'Child profiles', voice_profiles: 'Custom voice profiles', personalized_narration: 'Personalized narration', reading_reports: 'Enhanced reading reports', advanced_analytics: 'Advanced analytics', premium_books: 'Premium content', report_export: 'Report export' };

export default function PricingPage() {
  const { entitlements, refresh } = useEntitlements();
  const [plans, setPlans] = useState<PricingPlan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { pricingApi.plans().then((r) => setPlans(r.data.plans)).catch((e: ApiErrorShape) => setError(e.message)); }, []);
  async function choose(plan: PricingPlan) {
    if (plan.slug === 'free') return;
    setBusy(plan.slug); setError(null);
    try {
      const response = await pricingApi.checkout(plan.slug);
      if (response.data.checkout_url) window.location.assign(response.data.checkout_url);
      else { await refresh(); setError('Your plan change is waiting for Stripe confirmation. This page will update shortly.'); }
    } catch (e) { setError((e as ApiErrorShape).message); } finally { setBusy(null); }
  }
  return <div>
    <PageHeader eyebrow="Plans for every family" title="TeachAlike pricing" icon={Crown} description="Plan prices and limits are managed securely by TeachAlike. Stripe confirms paid access." />
    {error && <div className="mt-5"><Alert>{error}</Alert></div>}
    {!plans && !error && <div className="flex justify-center py-16"><Spinner /></div>}
    <div className="mt-6 grid gap-5 lg:grid-cols-3">{plans?.map((plan) => {
      const current = entitlements?.effective_plan === plan.slug;
      const benefits = Object.entries(plan.features).filter(([, value]) => value.enabled).slice(0, 7);
      return <Card key={plan.id} className={`relative flex flex-col ${plan.recommended ? 'ring-2 ring-brand-400' : ''}`}>
        {plan.recommended && <span className="absolute right-4 top-4 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white">Recommended</span>}
        <Sparkles className="h-7 w-7 text-amber-500" /><h2 className="mt-3 text-2xl font-black text-brand-900">{plan.name}</h2>
        <p className="mt-1 text-sm text-muted">{plan.description}</p><p className="mt-5 text-3xl font-black text-brand-900">{plan.currency} {(plan.price_minor / 100).toLocaleString()}</p>
        <p className="text-sm text-muted">{plan.price_minor ? `per ${plan.billing_interval}` : 'No payment required'}</p>
        <ul className="my-6 flex-1 space-y-3">{benefits.map(([key, value]) => <li key={key} className="flex gap-2 text-sm"><Check className="h-5 w-5 shrink-0 text-success" />
          <span>{value.unlimited ? 'Unlimited' : value.limit !== null ? `Up to ${value.limit}` : ''} {labels[key] || key.replaceAll('_', ' ')}</span></li>)}</ul>
        <Button className="w-full" variant={current ? 'secondary' : 'primary'} disabled={current || plan.slug === 'free' || entitlements?.pricing_mode === 'PRICING_DISABLED'} loading={busy === plan.slug} onClick={() => void choose(plan)}>
          {current ? 'Current plan' : entitlements?.pricing_mode === 'PRICING_DISABLED' ? 'Pricing currently disabled' : plan.cta_text || `Choose ${plan.name}`}
        </Button>
      </Card>;
    })}</div>
  </div>;
}
