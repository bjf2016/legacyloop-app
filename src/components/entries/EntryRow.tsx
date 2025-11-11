'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry } from '@/types/db';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { softDeleteEntry } from '@/lib/actions/entries';

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

export default function EntryRow({ entry }: { entry: Entry }) {
  const { url, loading, error, refreshNow } = useSignedUrl(entry.audio_path, 900);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [busy, setBusy] = useState(false);

  // refresh audio element on new signed URL
  useEffect(() => {
    if (audioRef.current && url) {
      const el = audioRef.current;
      const currentTime = el.currentTime;
      el.src = url;
      const onCanPlay = () => {
        if (currentTime > 0) {
          try {
            el.currentTime = currentTime;
          } catch {}
        }
      };
      el.addEventListener('canplay', onCanPlay, { once: true });
      return () => el.removeEventListener('canplay', onCanPlay);
    }
  }, [url]);

  // refresh on audio error (e.g., expired signed URL)
  const onAudioError = () => {
    refreshNow();
  };

  const subtitle = useMemo(() => {
    const parts = [
      `Created: ${fmtDate(entry.created_at)}`,
      `Duration: ${fmtDuration(entry.duration_ms)}`
    ];
    return parts.join(' • ');
  }, [entry.created_at, entry.duration_ms]);

  // Soft-delete (Move to Trash)
  async function onTrash() {
    if (!confirm('Move this entry to Trash?')) return;
    try {
      setBusy(true);
      await softDeleteEntry(entry.id);
      // reload so the trashed entry disappears from the list
      location.reload();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to move to trash');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold">
            {entry.title || 'Untitled Entry'}
          </div>
          <div className="text-sm opacity-75">{subtitle}</div>
        </div>

        <div className="flex items-center gap-3 min-w-[320px]">
          <div className="min-w-[240px]">
            {loading ? (
              <div className="h-10 rounded-xl bg-zinc-900/60 animate-pulse" />
            ) : error || !url ? (
              <div className="text-sm">
                <span className="opacity-80">Audio unavailable.</span>{' '}
                <button onClick={refreshNow} className="underline underline-offset-2">
                  Retry
                </button>
              </div>
            ) : (
              <audio ref={audioRef} controls className="w-full" onError={onAudioError} />
            )}
          </div>

          <button
            onClick={onTrash}
            disabled={busy}
            className="rounded-xl border border-red-600/70 px-3 py-2 text-sm hover:bg-red-900/30 disabled:opacity-60"
            title="Move to Trash"
          >
            {busy ? 'Moving…' : 'Move to Trash'}
          </button>
        </div>
      </div>
    </div>
  );
}
