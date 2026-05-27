'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@farmagest/shared';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { setTokens } from '@/lib/auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await apiClient.post('/auth/login', data);
      return res.data;
    },
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      router.push('/painel');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Erro ao fazer login');
    },
  });

  return (
    <div className="min-h-screen bg-pmdc-blue flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Cabeçalho */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-pmdc-blue rounded-2xl mb-4">
              <span className="text-pmdc-gold font-bold text-2xl">F</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">FarmaGest</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">
              Sistema de Gestão e controle de Medicamentos e Correlatos
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail institucional</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-pmdc-blue hover:bg-pmdc-blue-dark text-white"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Acesso restrito a usuários autorizados
          </p>
        </div>
      </div>
    </div>
  );
}
