'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function LoginPage() {
  const [email,setEmail]=useState('coach@kingdom.test');
  const [pass,setPass]=useState('Coach123!');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const router=useRouter();
  const submit=async (e:any)=>{
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.post('/auth/login',{ email, password: pass });
      window.location.href='/';
    } catch(err:any){ setError(err.message); } finally{ setLoading(false); }
  };
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Login to Kingdom of Chess</CardTitle><p className="text-xs text-gray-500 mt-1">Seed: coach@kingdom.test / Coach123! | student1@kingdom.test / Student123!</p></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
            <Input placeholder="Password" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">{loading?'Logging in...':'Login'}</Button>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Button type="button" variant="outline" onClick={()=>{setEmail('coach@kingdom.test'); setPass('Coach123!');}}>Use Coach</Button>
              <Button type="button" variant="outline" onClick={()=>{setEmail('student1@kingdom.test'); setPass('Student123!');}}>Use Student1</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
