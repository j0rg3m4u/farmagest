'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { canViewAdmin } from '@/lib/permissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user !== undefined && !canViewAdmin(user)) {
      router.replace('/painel');
    }
  }, [user, router]);

  if (!canViewAdmin(user)) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-red-900 text-white px-6 py-3 flex items-center gap-3 shrink-0">
        <ShieldAlert size={20} className="text-red-300" />
        <span className="font-semibold text-sm">Zona de Administração — NodeLab</span>
        <span className="ml-2 text-red-300 text-xs">
          Operações nesta área afetam todo o sistema. Proceda com cautela.
        </span>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
