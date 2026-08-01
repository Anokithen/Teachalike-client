'use client';
/* eslint-disable @next/next/no-img-element */

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { GraduationCap, UserRoundSearch } from 'lucide-react';
import { adminApi } from '@/lib/endpoints';
import { ApiErrorShape, TeacherApplication, TeacherApprovalStatus } from '@/lib/types';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';

const FILTERS: TeacherApprovalStatus[] = ['pending', 'approved', 'rejected'];
const statusTone = (status: TeacherApprovalStatus) => status === 'approved' ? 'success' : status === 'pending' ? 'warning' : 'danger';
const teacherTypeLabel = (value: TeacherApplication['teacher_type']) => value === 'private_tuition' ? 'Private tuition teacher' : value === 'school' ? 'School teacher' : 'Not supplied';

export default function AdminTeachersPage() {
  const [status, setStatus] = useState<TeacherApprovalStatus>('pending');
  const [teachers, setTeachers] = useState<TeacherApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<TeacherApplication | null>(null);
  const [rejecting, setRejecting] = useState<TeacherApplication | null>(null);
  const [deleting, setDeleting] = useState<TeacherApplication | null>(null);
  const [reason, setReason] = useState('');
  const [rowLoading, setRowLoading] = useState<number | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setTeachers(null);
    try {
      const response = await adminApi.listTeachers(status);
      setTeachers(response.data.teachers);
    } catch (err) {
      setError((err as ApiErrorShape).message);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);

  async function runAction(teacher: TeacherApplication, action: () => Promise<unknown>, message: string) {
    setRowLoading(teacher.id);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(message);
      setSelected(null);
      await load();
    } catch (err) {
      setError((err as ApiErrorShape).message);
    } finally {
      setRowLoading(null);
    }
  }

  async function createTeacher(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      await adminApi.createTeacher(createForm);
      setCreateForm({ name: '', email: '', password: '' });
      setStatus('approved');
      setSuccess('Approved teacher account created successfully.');
      if (status === 'approved') await load();
    } catch (err) {
      setError((err as ApiErrorShape).message);
    } finally {
      setCreating(false);
    }
  }

  async function confirmReject() {
    if (!rejecting) return;
    const teacher = rejecting;
    await runAction(teacher, () => adminApi.rejectTeacher(teacher.id, reason.trim() || undefined), `${teacher.name}'s application was rejected.`);
    setRejecting(null);
    setReason('');
  }

  async function confirmDelete() {
    if (!deleting) return;
    const teacher = deleting;
    await runAction(teacher, () => adminApi.deleteTeacher(teacher.id), `${teacher.name}'s account was deleted.`);
    setDeleting(null);
  }

  const openApplication = (teacher: TeacherApplication) => setSelected(teacher);

  const actions = (teacher: TeacherApplication) => (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="ghost" onClick={() => openApplication(teacher)}><UserRoundSearch className="h-4 w-4" aria-hidden="true" />Details</Button>
      {teacher.approval_status !== 'approved' && <Button variant="secondary" loading={rowLoading === teacher.id} onClick={() => runAction(teacher, () => adminApi.approveTeacher(teacher.id), `${teacher.name} was approved.`)}>Approve</Button>}
      {teacher.approval_status !== 'rejected' && <Button variant="ghost" className="text-danger" onClick={() => { setRejecting(teacher); setReason(''); }}>Reject</Button>}
      <Button variant="ghost" loading={rowLoading === teacher.id} onClick={() => runAction(teacher, () => teacher.is_banned ? adminApi.unbanTeacher(teacher.id) : adminApi.banTeacher(teacher.id), `${teacher.name} was ${teacher.is_banned ? 'unbanned' : 'banned'}.`)}>{teacher.is_banned ? 'Unban' : 'Ban'}</Button>
      <Button variant="ghost" className="text-danger" onClick={() => setDeleting(teacher)}>Delete</Button>
    </div>
  );

  return (
    <div>
      <PageHeader eyebrow="Admin workspace" title="Teacher applications" icon={GraduationCap} description="Review public applications and manage approved teacher accounts." />
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter teacher applications">
        {FILTERS.map((filter) => <Button key={filter} variant={status === filter ? 'primary' : 'secondary'} onClick={() => setStatus(filter)} className="capitalize">{filter}</Button>)}
      </div>
      {success && <div className="mb-4"><Alert tone="success">{success}</Alert></div>}
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label={`${status} teacher applications`}>
          {!teachers && !error && <div className="flex justify-center py-16"><Spinner size={28} /></div>}
          {teachers?.length === 0 && <EmptyState title={`No ${status} teacher applications`} description="Applications will appear here when their status matches this filter." />}
          {teachers && teachers.length > 0 && <>
            <div className="hidden md:block">
              <Table columns={['Teacher', 'Type', 'Applied', 'Status', 'Actions']}>
                {teachers.map((teacher) => <tr key={teacher.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3">{teacher.profile_image_url ? <img src={teacher.profile_image_url} alt="" className="h-11 w-11 rounded-full object-cover" /> : <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-400/10"><GraduationCap className="h-5 w-5 text-brand-600" /></span>}<div><button type="button" className="text-left font-semibold text-brand-900 underline-offset-4 hover:text-brand-600 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" onClick={() => openApplication(teacher)} aria-label={`View ${teacher.name}'s teacher application`}>{teacher.name}</button><p className="text-xs text-muted">{teacher.email}</p></div></div></td>
                  <td className="px-4 py-3 text-muted">{teacherTypeLabel(teacher.teacher_type)}</td>
                  <td className="px-4 py-3 text-muted">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(teacher.created_at))}</td>
                  <td className="px-4 py-3"><div className="space-y-1"><Badge tone={statusTone(teacher.approval_status)} className="capitalize">{teacher.approval_status}</Badge>{teacher.is_banned && <div><Badge tone="danger">Banned</Badge></div>}</div></td>
                  <td className="px-4 py-3">{actions(teacher)}</td>
                </tr>)}
              </Table>
            </div>
            <div className="grid gap-4 md:hidden">{teachers.map((teacher) => <Card key={teacher.id}><div className="flex gap-3">{teacher.profile_image_url && <img src={teacher.profile_image_url} alt="" className="h-14 w-14 rounded-full object-cover" />}<div className="min-w-0"><button type="button" className="block max-w-full truncate text-left font-semibold text-brand-900 underline-offset-4 hover:text-brand-600 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400" onClick={() => openApplication(teacher)} aria-label={`View ${teacher.name}'s teacher application`}>{teacher.name}</button><p className="break-all text-sm text-muted">{teacher.email}</p><Badge tone={statusTone(teacher.approval_status)} className="mt-2 capitalize">{teacher.approval_status}</Badge></div></div><div className="mt-4">{actions(teacher)}</div></Card>)}</div>
          </>}
        </section>

        <Card className="h-fit">
          <h2 className="mb-1 font-semibold text-brand-900">Create approved teacher</h2>
          <p className="mb-4 text-xs text-muted">Admin-created teachers are approved immediately.</p>
          <form onSubmit={createTeacher} className="space-y-4">
            <Input label="Name" required maxLength={120} value={createForm.name} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} />
            <Input label="Email" type="email" required maxLength={120} value={createForm.email} onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })} />
            <Input label="Password" type="password" required minLength={8} maxLength={128} value={createForm.password} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} />
            <Button type="submit" loading={creating} className="w-full">Create teacher</Button>
          </form>
        </Card>
      </div>

      <TeacherDetails
        teacher={selected}
        loading={rowLoading === selected?.id}
        onClose={() => setSelected(null)}
        onApprove={(teacher) => runAction(teacher, () => adminApi.approveTeacher(teacher.id), `${teacher.name} was approved.`)}
        onReject={(teacher) => { setRejecting(teacher); setReason(''); }}
      />
      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={`Reject ${rejecting?.name || 'teacher'}?`} dismissible={rowLoading === null} footer={<><Button variant="ghost" disabled={rowLoading !== null} onClick={() => setRejecting(null)}>Cancel</Button><Button variant="danger" loading={rowLoading === rejecting?.id} onClick={confirmReject}>Reject application</Button></>}>
        <p className="mb-4 text-muted">The teacher will be unable to log in. You may provide a reason they can safely see.</p>
        <Textarea label="Rejection reason (optional)" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
      </Modal>
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} onConfirm={confirmDelete} loading={rowLoading === deleting?.id} title={`Delete ${deleting?.name || 'teacher'}?`} description="This permanently removes the teacher account and its stored assets." confirmLabel="Delete teacher" />
    </div>
  );
}

function TeacherDetails({
  teacher,
  loading,
  onClose,
  onApprove,
  onReject,
}: {
  teacher: TeacherApplication | null;
  loading: boolean;
  onClose: () => void;
  onApprove: (teacher: TeacherApplication) => Promise<void>;
  onReject: (teacher: TeacherApplication) => void;
}) {
  if (!teacher) return <Modal open={false} onClose={onClose} />;
  const fields = [
    ['Email', teacher.email], ['Phone number', teacher.phone_number || 'Not supplied'], ['Address', teacher.address || 'Not supplied'],
    ['Teacher type', teacherTypeLabel(teacher.teacher_type)], ['School name', teacher.school_name || 'Not supplied'], ['Tuition name', teacher.tuition_name || 'Not supplied'],
    ['Application date', new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(teacher.created_at))],
    ['Review date', teacher.reviewed_at ? new Intl.DateTimeFormat(undefined, { dateStyle: 'long', timeStyle: 'short' }).format(new Date(teacher.reviewed_at)) : 'Not reviewed'],
    ['Rejection reason', teacher.rejection_reason || 'None'],
  ];
  const canApprove = teacher.approval_status !== 'approved';
  const canReject = teacher.approval_status !== 'rejected';
  return <Modal
    open
    onClose={onClose}
    title={`${teacher.name}'s application`}
    dismissible={!loading}
    footer={<>
      <Button variant="ghost" disabled={loading} onClick={onClose}>Close</Button>
      {canReject && <Button variant="danger" disabled={loading} onClick={() => onReject(teacher)}>Reject</Button>}
      {canApprove && <Button loading={loading} onClick={() => void onApprove(teacher)}>Approve teacher</Button>}
    </>}
  >
    <div className="mb-5 flex items-center gap-4">
      {teacher.profile_image_url ? <img src={teacher.profile_image_url} alt={`${teacher.name}'s professional profile`} className="h-24 w-24 rounded-3xl object-cover shadow-card" /> : <span className="grid h-24 w-24 place-items-center rounded-3xl bg-brand-400/10"><GraduationCap className="h-10 w-10 text-brand-600" /></span>}
      <div>
        <Badge tone={statusTone(teacher.approval_status)} className="capitalize">{teacher.approval_status}</Badge>
        <p className="mt-2 text-xs text-muted">Submitted teacher registration</p>
      </div>
    </div>
    <dl className="space-y-3">{fields.map(([label, value]) => <div key={label}><dt className="text-xs font-bold uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-brand-900">{value}</dd></div>)}</dl>
  </Modal>;
}
