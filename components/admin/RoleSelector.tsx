'use client';

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
      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Role</p>
      {error && <p className="text-sm text-uber-red">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRole('rider')}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl border transition-colors disabled:opacity-50 ${
            currentRole === 'rider'
              ? 'bg-white/5 border-white/10 text-white'
              : 'bg-transparent border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
          }`}
        >
          {loading && currentRole !== 'rider' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
          Rider
        </button>
        <button
          type="button"
          onClick={() => setRole('admin')}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 text-xs py-2 px-3 rounded-xl border transition-colors disabled:opacity-50 ${
            currentRole === 'admin'
              ? 'bg-uber-blue/15 border-uber-blue/40 text-uber-blue'
              : 'bg-transparent border-white/10 text-zinc-400 hover:border-uber-blue/30 hover:text-uber-blue'
          }`}
        >
          {loading && currentRole !== 'admin' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Shield className="h-3.5 w-3.5" />
          )}
          Admin
        </button>
      </div>
    </div>
  );
}
