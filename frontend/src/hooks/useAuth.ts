'use client';
import { useQuery } from '@tanstack/react-query';
import { api, User } from '@/lib/api';
export function useAuth() {
  return useQuery<User>({ queryKey: ['me'], queryFn: () => api.get('/auth/me'), retry: false });
}
