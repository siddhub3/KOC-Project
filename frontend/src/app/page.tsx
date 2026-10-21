'use client';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
export default function Home() {
  const { data, isLoading } = useAuth();
  const router = useRouter();
  useEffect(()=>{
    if (isLoading) return;
    if (!data) router.replace('/login');
    else if (data.role==='coach') router.replace('/coach/tournaments');
    else router.replace('/student/tournaments');
  },[data,isLoading]);
  return <div className="p-8 text-center">Loading Kingdom of Chess...</div>;
}
