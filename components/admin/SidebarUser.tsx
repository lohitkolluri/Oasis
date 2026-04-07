import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';

interface SidebarUserProps {
  name: string;
  role?: string | null;
  email?: string | null;
  className?: string;
  collapsed?: boolean;
}

export function SidebarUser({ name, email, className, collapsed = false }: SidebarUserProps) {
  const displayName = name || email || 'Oasis Admin';
  const avatarSeed = email || name || 'oasis-admin';

  return (
    <div
      className={cn(
        'w-full flex items-center justify-between gap-3 px-3 py-3 rounded-xl',
        'bg-zinc-900/90 border border-zinc-800 shadow-sm',
        collapsed && 'px-2',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar seed={avatarSeed} size={32} className="h-8 w-8" />
        {!collapsed && (
          <span className="text-sm font-medium leading-snug truncate">{displayName}</span>
        )}
      </div>
      <form action="/api/auth/signout" method="post">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-full p-1.5 text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors duration-150"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
