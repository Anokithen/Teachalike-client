'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { pricingApi } from '@/lib/endpoints';
import { ApiErrorShape, BillingPayment, BillingSubscription, EffectiveEntitlements } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';

export default function BillingPage() {
  const [data, setData] = useState<{ entitlements: EffectiveEntitlements; subscription: BillingSubscription | null; payments: BillingPayment[] } | null>(null);
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  async function load() { try { setData((await pricingApi.me()).data); } catch (e) { setError((e as ApiErrorShape).message); } }
  useEffect(() => { void load(); }, []);
  async function action(kind: 'cancel' | 'resume' | 'portal') { setBusy(true); setError(null); try {
    const response = kind === 'portal' ? await pricingApi.portal() : await pricingApi.subscriptionAction(kind);
    if (response.data.portal_url) window.location.assign(response.data.portal_url); else await load();
  } catch (e) { setError((e as ApiErrorShape).message); } finally { setBusy(false); } }
  return <div><PageHeader eyebrow="Parent billing" title="Subscription & payments" icon={CreditCard} description="Manage billing securely through Stripe and review confirmed payment history." />
    {error && <div className="mt-5"><Alert>{error}</Alert></div>}
    {data && <div className="mt-6 grid gap-6 lg:grid-cols-3"><Card className="lg:col-span-1"><p className="text-xs font-bold uppercase text-muted">Effective plan</p><h2 className="mt-2 text-2xl font-black capitalize text-brand-900">{data.entitlements.effective_plan}</h2>
      <p className="mt-2 text-sm text-muted">Billing plan: <span className="capitalize">{data.entitlements.billing_plan || 'None'}</span></p><Badge tone={data.entitlements.subscription_status === 'PAYMENT_FAILED' ? 'danger' : 'success'}>{data.entitlements.subscription_status}</Badge>
      {data.subscription && <div className="mt-5 flex flex-wrap gap-2"><Button loading={busy} onClick={() => void action('portal')}>Manage in Stripe</Button><Button variant="secondary" loading={busy} onClick={() => void action(data.subscription?.cancel_at_period_end ? 'resume' : 'cancel')}>{data.subscription.cancel_at_period_end ? 'Resume' : 'Cancel at period end'}</Button></div>}
    </Card><Card className="lg:col-span-2"><h2 className="text-lg font-bold text-brand-900">Payment history</h2>{data.payments.length === 0 ? <p className="mt-4 text-sm text-muted">No Stripe payments recorded yet.</p> : <div className="mt-4 space-y-3">{data.payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-bg p-3"><div><p className="font-bold">{payment.currency} {(payment.amount_minor / 100).toLocaleString()}</p><p className="text-xs text-muted">{new Date(payment.paid_at || payment.created_at).toLocaleDateString()}</p></div><div className="flex gap-2"><Badge tone={payment.status === 'PAID' ? 'success' : 'danger'}>{payment.status}</Badge>{payment.invoice_url && <a className="text-sm font-bold text-brand-600" href={payment.invoice_url} target="_blank" rel="noreferrer">Invoice</a>}</div></div>)}</div>}</Card></div>}
  </div>;
}
