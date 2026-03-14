'use client';

import { Button } from '@/components/ui/Button';
import { gooeyToast } from 'goey-toast';
import { Loader2, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface RoleSelectorProps {
  profileId: string;
  currentRole: 'rider' | 'admin';
}

export function RoleSelector({ profileId, currentRole }: RoleSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function setRole(role: 'rider' | 'admin') {
    if (role === currentRole) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to update role');
      gooeyToast.success('Role updated', { description: `User is now ${role}` });
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
      gooeyToast.error('Failed to update role', { description: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-medium text-[#555] uppercase tracking-wider">
        Role
      </p>
      {error && <p className="text-sm text-[#ef4444]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRole('rider')}
          disabled={loading}
          className={
            currentRole === 'rider'
              ? 'border-[#2d2d2d] bg-[#1e1e1e] text-white'
              : 'border-[#2d2d2d] bg-transparent text-[#555] hover:text-[#9ca3af]'
          }
        >
          {loading && currentRole !== 'rider' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
          Rider
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRole('admin')}
          disabled={loading}
          className={
            currentRole === 'admin'
              ? 'border-[#7dd3fc]/40 bg-[#7dd3fc]/10 text-[#7dd3fc]'
              : 'border-[#2d2d2d] bg-transparent text-[#555] hover:border-[#7dd3fc]/30 hover:text-[#7dd3fc]'
          }
        >
          {loading && currentRole !== 'admin' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Shield className="h-3.5 w-3.5" />
          )}
          Admin
        </Button>
      </div>
    </div>
  );
}
