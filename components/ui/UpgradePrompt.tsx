import Link from 'next/link';
import { Crown } from 'lucide-react';

export function UpgradePrompt({ message, recommendedPlan = 'pro' }: { message: string; recommendedPlan?: string }) {
  return <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:bg-amber-50" role="alert">
    <div className="flex gap-3"><Crown className="h-5 w-5 shrink-0" /><div><p className="font-bold">Plan limit reached</p><p className="mt-1 text-sm">{message}</p>
      <div className="mt-3 flex gap-2"><Link href="/pricing" className="btn-primary">View {recommendedPlan.charAt(0).toUpperCase() + recommendedPlan.slice(1)}</Link></div>
    </div></div>
  </div>;
}
