import type { Metadata } from 'next';
import AdminDashboardView from './admin-dashboard-view';

export const metadata: Metadata = {
  title: 'SPICE Admin Dashboard',
  description: 'Unlinked admin dashboard prototype for SPICE account and service operations.',
};

export default function AdminDashboardPage() {
  return <AdminDashboardView />;
}
