'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createUserSchema, USER_ROLE_LABELS, UserRole, type CreateUserInput } from '@farmagest/shared';
import { useCreateUser } from '@/hooks/use-users';
import { useUnits } from '@/hooks/use-units';
import { useSectors } from '@/hooks/use-sectors';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

export default function NovoUsuarioPage() {
  const router = useRouter();
  const createUser = useCreateUser();
  const { data: unitsData } = useUnits({ active: 'true', limit: 100 });
  const { data: sectorsData } = useSectors({ active: 'true', limit: 100 });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
  });

  const selectedRole = watch('role');

  async function onSubmit(data: CreateUserInput) {
    try {
      await createUser.mutateAsync(data);
      toast.success('Usuário criado com sucesso');
      router.push('/usuarios');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar usuário');
    }
  }

  const needsUnit = selectedRole === UserRole.UNIT;
  const needsSector = [UserRole.COORDINATION, UserRole.ADMIN, UserRole.ASSISTANT].includes(
    selectedRole as UserRole,
  );

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Novo Usuário" />

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
          <Input placeholder="Ex: João da Silva" {...register('name')} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>E-mail institucional</Label>
          <Input type="email" placeholder="usuario@duquedecaxias.rj.gov.br" {...register('email')} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Senha inicial</Label>
          <Input type="password" placeholder="Mínimo 8 caracteres" {...register('password')} />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Perfil</Label>
          <Select onValueChange={(v) => setValue('role', v as UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o perfil" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(USER_ROLE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
        </div>

        {needsSector && (
          <div className="space-y-1.5">
            <Label>Setor</Label>
            <Select onValueChange={(v) => setValue('sectorId', (v as string) || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {sectorsData?.data.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.sectorId && <p className="text-xs text-red-600">{errors.sectorId.message}</p>}
          </div>
        )}

        {needsUnit && (
          <div className="space-y-1.5">
            <Label>Unidade</Label>
            <Select onValueChange={(v) => setValue('unitId', (v as string) || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {unitsData?.data.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.unitId && <p className="text-xs text-red-600">{errors.unitId.message}</p>}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
            disabled={createUser.isPending}
          >
            {createUser.isPending ? 'Salvando…' : 'Criar Usuário'}
          </Button>
        </div>
      </form>
    </div>
  );
}
