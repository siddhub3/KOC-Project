'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function StudentBrowse() {
  const qc=useQueryClient();
  const { data, isLoading } = useQuery({ queryKey:['tournaments'], queryFn:()=>api.get('/tournaments') });
  const joinMut = useMutation({ mutationFn:(id:string)=>api.post(`/tournaments/${id}/join`,{}), onSuccess:()=>qc.invalidateQueries({queryKey:['tournaments']}) });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Student – Browse Tournaments</h1>
      <Card><CardHeader><CardTitle>Open / Ongoing Tournaments</CardTitle></CardHeader><CardContent>
        {isLoading?'Loading...': data?.map((t:any)=><div key={t.id} className="flex justify-between items-center border rounded p-3 mb-2"><div><div className="font-medium">{t.name}</div><div className="text-xs text-gray-500">{t.timeControlInitial/60}+{t.timeControlIncrement} • {t.status}</div></div><div className="flex gap-2"><Button variant="outline" onClick={()=>joinMut.mutate(t.id)}>Join</Button><Link href={`/student/tournaments/${t.id}`} className="px-3 py-2 text-sm bg-[#0f3b5f] text-white rounded">Open</Link></div></div>)}
        {data?.length===0 && <p className="text-sm text-gray-500">No open tournaments. Ask coach to create one.</p>}
      </CardContent></Card>
    </div>
  );
}
