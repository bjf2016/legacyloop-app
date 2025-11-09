'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';


type Cast = { id: string; title: string; visibility: 'private'|'shared'|'public' };

export default function CastDebugPage() {
  const supabase = createClient();
  const [casts, setCasts] = useState<Cast[]>([]);
  const [title, setTitle] = useState('A new cast');

  async function refresh() {
    const { data, error } = await supabase.from('casts').select('id,title,visibility').order('created_at', { ascending: false });
    if (error) alert(error.message);
    else setCasts(data || []);
  }

async function createPrivate() {
  const { data, error } = await supabase
    .from('casts')
    .insert({ title, visibility: 'private' })
    .select()
    .single();

  if (error) return alert(error.message);
  alert(`Created cast ${data.id}`);
  refresh();
}


  async function makePublic(id: string) {
    const { error } = await supabase.from('casts').update({ visibility: 'public' }).eq('id', id);
    if (error) alert(error.message);
    else refresh();
  }

  useEffect(() => { refresh(); }, []);

  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Casts (RLS demo)</h1>
      <div className="flex gap-2">
        <input className="flex-1 border rounded p-2" value={title} onChange={(e)=>setTitle(e.target.value)} />
        <button className="rounded bg-black text-white px-3" onClick={createPrivate}>Create private</button>
      </div>
      <ul className="space-y-2">
        {casts.map(c => (
          <li key={c.id} className="border rounded p-2 flex items-center justify-between">
            <span>{c.title} <em className="opacity-60">[{c.visibility}]</em></span>
            {c.visibility !== 'public' && (
              <button className="rounded border px-3 py-1" onClick={()=>makePublic(c.id)}>Make public</button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
