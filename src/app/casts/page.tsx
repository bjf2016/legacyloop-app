'use client';

import { useEffect, useState } from 'react';
import { getMyCasts } from '@/lib/queries/casts';
import CastCard from '@/components/casts/CastCard';
import type { CastWithMeta } from '@/types/db';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function CastsPage() {
  const [casts, setCasts] = useState<CastWithMeta[] | null>(null);
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
      try {
        const data = await getMyCasts();
        setCasts(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-4">My Casts</h1>
        <div className="animate-pulse rounded-2xl h-24 bg-zinc-900/60 mb-3" />
        <div className="animate-pulse rounded-2xl h-24 bg-zinc-900/60 mb-3" />
      </main>
    );
  }

  if (authed === false) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-2xl font-semibold mb-3">Sign in required</h1>
        <p className="opacity-80 mb-4">You must be signed in to view your casts.</p>
        <Link className="underline" href="/login">Go to Login</Link>
      </main>
    );
  }

return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">My Casts</h1>
          <Link
            href="/today"
            className="rounded-xl border border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-900"
          >
            ← Today
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/trash"
            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
          >
            View Trash
          </Link>

          <Link
            href="/casts/new"
            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
          >
            New Cast
          </Link>
        </div>
      </div>



    {(!casts || casts.length === 0) ? (
      <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
        <p className="mb-2 text-lg font-medium">No casts yet</p>
        <p className="opacity-80">
          Click <span className="underline">New Cast</span> to create your first one.
        </p>
      </div>
    ) : (
      <div className="grid gap-3">
        {casts.map(c => <CastCard key={c.id} cast={c} />)}
      </div>
    )}
  </main>
);
}

