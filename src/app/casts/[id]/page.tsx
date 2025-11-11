'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Entry } from '@/types/db';
import { getEntriesByCastId } from '@/lib/queries/entries';
import EntryRow from '@/components/entries/EntryRow';
import { importOrphansForCast } from '@/lib/tools/importOrphans';
import { normalizePathsForCast } from '@/lib/tools/normalizePaths';

export default function CastDetailPage() {
  const params = useParams<{ id: string }>();
  const castId = params?.id as string;
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [castTitle, setCastTitle] = useState<string>('Cast');
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setAuthed(!!user);
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: cast } = await supabase
        .from('casts')
        .select('title')
        .eq('id', castId)
        .single();
      if (cast?.title) setCastTitle(cast.title);

      try {
        const data = await getEntriesByCastId(castId);
        setEntries(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [castId]);

  async function onImport() {
    try {
      const res = await importOrphansForCast(castId);
      alert(`Imported ${res.imported} orphan file(s).`);
      location.reload();
    } catch (e: any) {
      alert(e?.message ?? 'Import failed');
    }
  }

  async function onNormalize() {
    try {
      const res = await normalizePathsForCast(castId);
      alert(`Normalized ${res.moved} file path(s).`);
      location.reload();
    } catch (e: any) {
      alert(e?.message ?? 'Normalize failed');
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="text-2xl font-bold">{castTitle}</div>
          <div className="flex items-center gap-2">
            <button onClick={onNormalize} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
              Normalize Paths
            </button>
            <button onClick={onImport} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
              Quick Import Orphans
            </button>
            <Link href="/casts" className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">Back</Link>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="h-24 rounded-2xl bg-zinc-900/60 animate-pulse" />
          <div className="h-24 rounded-2xl bg-zinc-900/60 animate-pulse" />
        </div>
      </main>
    );
  }

  if (authed === false) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-2xl font-semibold mb-3">Sign in required</h1>
        <p className="opacity-80 mb-4">You must be signed in to view entries.</p>
        <Link className="underline" href="/login">Go to Login</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="text-2xl font-bold">{castTitle}</div>
        <div className="flex items-center gap-2">
          <button onClick={onNormalize} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
            Normalize Paths
          </button>
          <button onClick={onImport} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
            Quick Import Orphans
          </button>
          <Link href="/casts" className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">Back</Link>
        </div>
      </div>

      {!entries || entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
          <p className="mb-2 text-lg font-medium">No entries</p>
          <p className="opacity-80">Record your first entry to see it here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((e) => <EntryRow key={e.id} entry={e} />)}
        </div>
      )}
    </main>
  );
}
