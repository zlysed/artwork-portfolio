import AdminPanel from './AdminPanel';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main className="admin">
      <AdminPanel />
    </main>
  );
}
