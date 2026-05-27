'use client';
import { use } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateUserSchema, USER_ROLE_LABELS, UserRole, type UpdateUserInput } from '@farmagest/shared';
import { useUser, useUpdateUser } from '@/hooks/use-users';
import { useUnits } from '@/hooks/use-units';
import { useSectors } from '@/hooks/use-sectors';
import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

export default function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const canManageUsers = currentUser?.role === UserRole.COORDINATION || currentUser?.role === UserRole.MANAGER;

  const { data: profile, isLoading } = useUser(id);
  const updateUser = useUpdateUser(id);
  const { data: unitsData } = useUnits({ active: 'true', limit: 100 });
  const { data: sectorsData } = useSectors({ active: 'true', limit: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    values: profile
      ? {
          name: profile.name,
          email: profile.email,
          role: profile.role as UserRole,
          unitId: profile.unitId ?? undefined,
          sectorId: profile.sectorId ?? undefined,
          active: profile.active,
        }
      : undefined,
  });

  async function onSubmit(data: UpdateUserInput) {
    try {
      await updateUser.mutateAsync(data);
      toast.success('Usuário atualizado com sucesso');
      router.push('/usuarios');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao atualizar usuário');
    }
  }

  if (isLoading) return <div className="p-6 text-slate-400">Carregando…</div>;
  if (!profile) return <div className="p-6 text-slate-400">Usuário não encontrado</div>;

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title={profile.name}
        description={profile.email}
        action={
          <Badge className={profile.active ? 'bg-status-success-bg text-status-success border-0' : 'bg-slate-100 text-slate-500 border-0'}>
            {profile.active ? 'Ativo' : 'Inativo'}
          </Badge>
        }
      />

      <Button
        variant="ghost"
        size="sm"
        className="mb-6 gap-1.5 text-slate-500"
        onClick={() => router.back()}
      >
        <ArrowLeft size={16} /> Voltar
      </Button>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-lg border p-6 space-y-5">
        <div className="space-y-1.5">
          <Label>Nome completo</Label>
          <Input {...register('name')} disabled={!canManageUsers} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>E-mail</Label>
          <Input type="email" {...register('email')} disabled={!canManageUsers} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>

        {canManageUsers && (
          <>
            <div className="space-y-1.5">
              <Label>Perfil</Label>
              <Select
                defaultValue={profile.role}
                onValueChange={(v) => setValue('role', v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_ROLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Setor <span className="text-slate-400 text-xs">(opcional)</span></Label>
              <Select
                defaultValue={profile.sectorId ?? ''}
                onValueChange={(v) => setValue('sectorId', v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem setor</SelectItem>
                  {sectorsData?.data.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Unidade <span className="text-slate-400 text-xs">(opcional)</span></Label>
              <Select
                defaultValue={profile.unitId ?? ''}
                onValueChange={(v) => setValue('unitId', v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem unidade</SelectItem>
                  {unitsData?.data.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                defaultValue={profile.active ? 'true' : 'false'}
                onValueChange={(v) => setValue('active', v === 'true')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Ativo</SelectItem>
                  <SelectItem value="false">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {canManageUsers && (
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? 'Salvando…' : 'Salvar Alterações'}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
