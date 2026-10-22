'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function RoleGate({ role, children }: { role: 'coach' | 'student'; children: React.ReactNode }) {
  const { data, isLoading, isError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (isError || !data) router.replace('/login');
    else if (data.role !== role) router.replace(data.role === 'coach' ? '/coach/tournaments' : '/student/tournaments');
  }, [data, isError, isLoading, role, router]);

  if (isLoading || isError || !data || data.role !== role) {
    return <div className="route-transition" role="status"><span className="loading-chess-piece">♞</span><strong>Opening your chess room…</strong></div>;
  }
  return children;
}
