'use client';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { USER_ROLE_LABELS, UserRole } from '@farmagest/shared';
import { apiClient } from '@/lib/api-client';
import { clearTokens, getRefreshToken } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User } from 'lucide-react';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const initials = user?.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'U';

  async function handleLogout() {
    try {
      const refresh = getRefreshToken();
      if (refresh) await apiClient.post('/auth/logout', { refreshToken: refresh });
    } catch {
      // logout mesmo se o request falhar
    }
    clearTokens();
    logout();
    router.replace('/login');
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div className="text-sm text-slate-500">
        {user?.sector && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-pmdc-gold inline-block" />
            <span className="font-medium text-slate-700">{user.sector.name}</span>
            <span className="text-slate-400">·</span>
            <span className="font-mono text-xs text-slate-400">{user.sector.code}</span>
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100 transition-colors outline-none">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-pmdc-blue text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-medium text-slate-900 leading-tight">{user?.name}</div>
            <div className="text-xs text-slate-500">
              {user?.role && USER_ROLE_LABELS[user.role as UserRole]}
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled className="gap-2">
            <User size={14} />
            Meu perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600 focus:text-red-600">
            <LogOut size={14} />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
