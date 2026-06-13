import { redirect } from 'next/navigation';
import { AdminPanel } from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const params = await searchParams;
  const key = params.key ?? '';
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    redirect('/');
  }
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 font-serif text-2xl">Coloring Book Admin</h1>
      <AdminPanel adminKey={key} />
    </main>
  );
}
