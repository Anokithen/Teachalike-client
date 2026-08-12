'use client';

import { FormEvent, useState } from 'react';
import { Heart, MessageSquareText, Send } from 'lucide-react';
import { userFeedbackApi } from '@/lib/endpoints';
import { ApiErrorShape } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

const INITIAL_FORM = { category: 'general', subject: '', message: '' };

export default function FeedbackPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | string[] | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSent(false);
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Please add a subject and your feedback message.');
      return;
    }
    setSending(true);
    try {
      await userFeedbackApi.create({
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setForm(INITIAL_FORM);
      setSent(true);
    } catch (err) {
      const apiError = err as ApiErrorShape;
      setError(apiError.fields?.length ? apiError.fields : apiError.message);
    } finally {
      setSending(false);
    }
  }

  return <div className="mx-auto max-w-2xl">
    <PageHeader eyebrow="Help TeachAlike grow" title="Send feedback" icon={MessageSquareText} description="Share an idea, report a problem, or tell us what is working well." />
    <Card className="mt-6 overflow-hidden">
      <div className="mb-5 flex items-start gap-3 rounded-2xl bg-brand-400/10 p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-pink shadow-sm"><Heart className="h-5 w-5" fill="currentColor" aria-hidden="true" /></span>
        <div><h2 className="font-bold text-brand-900">We value your thoughts</h2><p className="mt-1 text-sm leading-6 text-muted">Your feedback is sent privately to the TeachAlike administrators.</p></div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <Select label="Feedback type" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
          <option value="general">General feedback</option>
          <option value="suggestion">Suggestion or idea</option>
          <option value="problem">Report a problem</option>
          <option value="compliment">Something I liked</option>
        </Select>
        <Input label="Subject" required maxLength={120} placeholder="A short summary" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
        <Textarea label="Your feedback" required maxLength={2000} rows={7} placeholder="Tell us what you think or what could be improved..." value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        <div className="flex justify-end text-xs text-muted">{form.message.length.toLocaleString()} / 2,000</div>
        <Alert>{error}</Alert>
        {sent && <Alert tone="success">Thank you! Your feedback has been sent to the admin team.</Alert>}
        <Button type="submit" loading={sending} className="w-full sm:w-auto"><Send className="h-4 w-4" aria-hidden="true" />Send feedback</Button>
      </form>
    </Card>
  </div>;
}
