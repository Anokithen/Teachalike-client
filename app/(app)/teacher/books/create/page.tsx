import { BookOpen } from 'lucide-react';
import { TeacherBookForm } from '@/components/books/TeacherBookForm';
import { PageHeader } from '@/components/ui/PageHeader';

export default function CreateTeacherBookPage() {
  return <div><PageHeader eyebrow="Teacher library" title="Create book" icon={BookOpen} description="Publish a story under your teacher name for TeachAlike readers." /><div className="mt-6"><TeacherBookForm /></div></div>;
}
