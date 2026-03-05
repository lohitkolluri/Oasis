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
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRole('rider')}
          disabled={loading}
          className={`inline-flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg border transition-colors disabled:opacity-50 ${
            currentRole === 'rider'
              ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
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
          className={`inline-flex items-center gap-1.5 text-xs py-2 px-3 rounded-lg border transition-colors disabled:opacity-50 ${
            currentRole === 'admin'
              ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-violet-500/30 hover:text-violet-300'
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
