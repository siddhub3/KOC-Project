'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
export function Navbar() {
  const { data, isLoading } = useAuth();
  const router = useRouter();
  const logout = async () => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
    router.push('/login');
    window.location.reload();
  };
  return (
    <header className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="font-black text-xl tracking-tight"><span className="text-orange-500">KINGDOM</span> <span className="text-[#0f3b5f]">OF CHESS</span></Link>
        <div className="flex gap-3 items-center text-sm">
          {!isLoading && data && <><span className="font-medium">{data.name} ({data.role})</span><button onClick={logout} className="px-3 py-1 border rounded hover:bg-gray-50">Logout</button></>}
          {!isLoading && !data && <Link href="/login" className="px-3 py-1 bg-[#0f3b5f] text-white rounded">Login</Link>}
        </div>
      </div>
    </header>
  );
}
