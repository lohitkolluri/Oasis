import { redirect } from 'next/navigation';

export default function HealthPage() {
  redirect('/admin/health/api');
}
