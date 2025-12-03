'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { restoreEntry } from '@/lib/actions/entries';

type TrashEntry = {
  id: string;
  created_at: string | null;
  duration_ms: number | null;
  audio_path: string | null;
};

type AuthState = 'checking' | 'authed' | 'anon';

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString();
}

function fmtDuration(ms?: number | null) {
  if (!ms && ms !== 0) return '—';
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function shortPath(p?: string | null) {
  if (!p) return '—';
  const parts = p.split('/');
  if (parts.length <= 2) return p;
  const last = parts[parts.length - 1];
  const before = parts[parts.length - 2];
  return `…/${before}/${last}`;
}

export default function TrashPage() {
  const router = useRouter();
  const supabase = createClient();

  const [authState, setAuthState] = useState<AuthState>('checking');
  const [entries, setEntries] = useState<TrashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  async function loadTrash(userId: string) {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('id, created_at, duration_ms, audio_path, deleted_at, user_id')
        .eq('user_id', userId)
        .not('deleted_at', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEntries((data as TrashEntry[]) ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load trash');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setAuthState('anon');
        setLoading(false);
        router.replace('/login');
        return;
      }

      setAuthState('authed');
      await loadTrash(data.user.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRestore(id: string) {
    if (!confirm('Restore this entry from Trash?')) return;
    try {
      setBusyId(id);
      await restoreEntry(id);
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        await loadTrash(data.user.id);
      }
      setRestoreMessage('Restored ✓');
      setTimeout(() => {
        setRestoreMessage(null);
      }, 2000);
    } catch (e: any) {
      alert(e?.message ?? 'Failed to restore entry');
    } finally {
      setBusyId(null);
    }
  }

  if (authState === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Checking your session…</p>
      </main>
    );
  }

  if (authState === 'anon') {
    // We already redirected, just a safety fallback
    return null;
  }

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold">Trash</h1>
          <Link
            href="/casts"
            className="rounded-xl border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-900/60"
          >
            Back to My Casts
          </Link>
        </div>

        <button
          onClick={async () => {
            const { data } = await supabase.auth.getUser();
            if (data?.user) {
              await loadTrash(data.user.id);
            }
          }}
          className="rounded-xl border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-900/60"
          disabled={loading}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {restoreMessage && (
        <div className="rounded-xl border border-emerald-600/70 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-300">
          {restoreMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-600/70 bg-red-900/20 px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {loading && entries.length === 0 ? (
        <div className="text-sm opacity-75">Loading trashed entries…</div>
      ) : entries.length === 0 ? (
        <div className="text-sm opacity-75">
          No entries in Trash yet. Entries moved to Trash will appear here.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-zinc-800 p-3 flex items-center justify-between gap-3"
            >
              <div className="text-sm">
                <div className="font-medium">Trashed Entry</div>
                <div className="opacity-75">
                  Created: {fmtDate(entry.created_at)} • Duration:{' '}
                  {fmtDuration(entry.duration_ms)}
                </div>
                <div className="opacity-50 text-xs break-all mt-1">
                  {shortPath(entry.audio_path)}
                </div>
              </div>
              <button
                onClick={() => handleRestore(entry.id)}
                disabled={busyId === entry.id}
                className="rounded-xl border border-emerald-500/70 px-3 py-2 text-sm hover:bg-emerald-900/30 disabled:opacity-60"
              >
                {busyId === entry.id ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
