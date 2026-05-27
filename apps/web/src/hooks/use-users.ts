'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { User, CreateUserInput, UpdateUserInput } from '@farmagest/shared';

interface UsersFilter {
  role?: string;
  unitId?: string;
  active?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface PaginatedUsers {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useUsers(filter: UsersFilter = {}) {
  return useQuery({
    queryKey: ['users', filter],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedUsers>('/users', { params: filter });
      return res.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const res = await apiClient.get<User>(`/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const res = await apiClient.post<User>('/users', data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useUpdateUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateUserInput) => {
      const res = await apiClient.patch<User>(`/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/users/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}
