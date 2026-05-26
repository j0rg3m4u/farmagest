'use client';
import { useAuthStore } from '@/stores/auth-store';
import { USER_ROLE_LABELS, UserRole } from '@farmagest/shared';

export default function PainelPage() {
  const user = useAuthStore((s) => s.user);
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">
        Bem-vindo{user?.name?.split(' ')[0] ? `, ${user.name.split(' ')[0]}` : ''}!
      </h1>
      <p className="text-slate-500 text-sm">
        Perfil: {user?.role && USER_ROLE_LABELS[user.role as UserRole]}
      </p>
      <p className="text-slate-400 text-sm mt-4">
        Os indicadores de estoque aparecem aqui a partir da Sprint 3.
      </p>
    </div>
  );
}
