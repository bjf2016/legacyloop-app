'use client';

import Link from 'next/link';
import type { CastWithMeta } from '@/types/db';

function fmt(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString();
}

export default function CastCard({ cast }: { cast: CastWithMeta }) {
  return (
    <Link
      href={`/casts/${cast.id}`}
      className="block rounded-2xl border border-zinc-800 p-4 hover:border-zinc-600 transition"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{cast.title || 'Untitled Cast'}</h3>
        <span className="text-xs opacity-70">Created: {fmt(cast.created_at)}</span>
      </div>
      <div className="mt-2 text-sm opacity-80">
        Entries: <b>{cast.entry_count}</b>
        <span className="mx-2">•</span>
        Last entry: {fmt(cast.last_entry_at)}
      </div>
    </Link>
  );
}
