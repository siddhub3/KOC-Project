'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
export function useAuth() {
  return useQuery({ queryKey: ['me'], queryFn: ()=>api.get('/auth/me'), retry: false });
}
