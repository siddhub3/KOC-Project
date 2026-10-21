'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function CoachTournaments() {
  const qc = useQueryClient();
  const { data: tournaments, isLoading } = useQuery({ queryKey:['tournaments'], queryFn:()=>api.get('/tournaments') });
  const [form,setForm]=useState({ name:'Kingdom Cup', timeControlInitial:300, timeControlIncrement:0, startDate: new Date(Date.now()+86400000).toISOString().slice(0,16), status:'open' });
  const createMut = useMutation({ mutationFn:(body:any)=>api.post('/tournaments', body), onSuccess:()=>qc.invalidateQueries({queryKey:['tournaments']}) });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Coach – Tournament Management</h1>
      <Card>
        <CardHeader><CardTitle>Create Tournament</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
          <div className="flex gap-2"><Input type="number" value={form.timeControlInitial} onChange={e=>setForm({...form,timeControlInitial: parseInt(e.target.value)})} placeholder="Initial sec (300 = 5min)" /><Input type="number" value={form.timeControlIncrement} onChange={e=>setForm({...form,timeControlIncrement: parseInt(e.target.value)})} placeholder="Increment sec" /></div>
          <Input type="datetime-local" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})} />
          <select className="border rounded px-3 py-2 text-sm" value={form.status} onChange={e=>setForm({...form,status:e.target.value as any})}><option value="draft">draft</option><option value="open">open</option><option value="ongoing">ongoing</option><option value="completed">completed</option></select>
          <Button onClick={()=>createMut.mutate({ ...form, startDate: new Date(form.startDate).toISOString() })} disabled={createMut.isPending}>{createMut.isPending?'Creating...':'Create'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tournaments</CardTitle></CardHeader>
        <CardContent>
          {isLoading? 'Loading...' : (
            <div className="space-y-2">
              {tournaments?.map((t:any)=><div key={t.id} className="flex justify-between items-center border rounded p-3"><div><div className="font-medium">{t.name}</div><div className="text-xs text-gray-500">{t.timeControlInitial/60}+{t.timeControlIncrement} • {new Date(t.startDate).toLocaleString()} • <Badge variant={t.status==='open'?'green': t.status==='ongoing'?'orange':'gray'}>{t.status}</Badge></div></div><Link href={`/coach/tournaments/${t.id}`} className="text-sm underline">View stats</Link></div>)}
              {tournaments?.length===0 && <p className="text-sm text-gray-500">No tournaments yet. Create one above.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
