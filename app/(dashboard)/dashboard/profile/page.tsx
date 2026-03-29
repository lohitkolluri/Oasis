import { ProfileSettingsForm } from '@/components/rider/ProfileSettingsForm';
import { createClient } from '@/lib/supabase/server';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function RiderProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      'full_name, phone_number, platform, primary_zone_geofence, government_id_verified, face_verified, auto_renew_enabled, updated_at',
    )
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6 pb-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-[13px] font-medium text-zinc-500 hover:text-zinc-300 active:text-zinc-200 transition-colors min-h-[44px] -ml-1 px-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <ProfileSettingsForm
        key={profile.updated_at}
        userId={user.id}
        initial={{
          full_name: profile.full_name,
          phone_number: profile.phone_number,
          platform: profile.platform as 'zepto' | 'blinkit' | null,
          primary_zone_geofence: profile.primary_zone_geofence as Record<string, unknown> | null,
          government_id_verified: profile.government_id_verified,
          face_verified: profile.face_verified,
          auto_renew_enabled: profile.auto_renew_enabled,
        }}
        email={user.email ?? null}
      />
    </div>
  );
}
