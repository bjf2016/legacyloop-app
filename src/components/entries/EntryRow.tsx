'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry } from '@/types/db';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { softDeleteEntry } from '@/lib/actions/entries';
import SummaryChip from '@/components/SummaryChip';
import RuleLinkPicker from '@/components/RuleLinkPicker';
import EntryImageSection from './EntryImageSection';
import ParentReflectionEditor from './ParentReflectionEditor';


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

const deriveEntryTitle = (entry: {
  title?: string | null;
  transcript?: string | null;
}) => {
  if (entry.title && entry.title.trim().length > 0) {
    return entry.title.trim();
  }

  const text = (entry.transcript || '').trim();
  if (!text) return 'Untitled Entry';

  const words = text.split(/\s+/);
  if (words.length <= 8) return text;
  return words.slice(0, 8).join(' ') + '…';
};

type EntryWithReflection = Entry & {
  parent_reflection?: string | null;
};

export default function EntryRow({ entry }: { entry: EntryWithReflection }) {
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

  // Step 4 (mini): capture duration on first successful play
  useEffect(() => {
    if (!audioRef.current || entry.duration_ms != null) return;
    const el = audioRef.current;

    const onLoadedMeta = () => {
      if (
        entry.duration_ms == null &&
        Number.isFinite(el.duration) &&
        el.duration > 0
      ) {
        import('@/lib/actions/entriesServer')
          .then(({ setEntryDuration }) =>
            setEntryDuration(entry.id, el.duration * 1000).catch(() => {})
          )
          .catch(() => {});
      }
    };

    el.addEventListener('loadedmetadata', onLoadedMeta);
    return () => el.removeEventListener('loadedmetadata', onLoadedMeta);
  }, [entry.id, entry.duration_ms, url]);

  const onAudioError = () => {
    refreshNow();
  };

  const subtitle = useMemo(() => {
    const parts = [
      `Created: ${fmtDate(entry.created_at)}`,
      `Duration: ${fmtDuration(entry.duration_ms)}`,
    ];
    return parts.join(' • ');
  }, [entry.created_at, entry.duration_ms]);

  async function onTrash() {
    if (!confirm('Move this entry to Trash?')) return;
    try {
      setBusy(true);
      await softDeleteEntry(entry.id);
      location.reload();
    } catch (e: any) {
      alert(e?.message ?? 'Failed to move to trash');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 p-4">
      {/* Top row: title + player + trash */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold">
            {deriveEntryTitle(entry)}
          </div>
          <div className="text-sm opacity-75">{subtitle}</div>
        </div>

        <div className="flex flex-col items-end gap-2 min-w-[320px]">
          <div className="flex items-center gap-3 w-full">
            <div className="min-w-[240px]">
              {loading ? (
                <div className="h-10 rounded-xl bg-zinc-900/60 animate-pulse" />
              ) : error || !url ? (
                <div className="text-sm">
                  <span className="opacity-80">Audio unavailable.</span>{' '}
                  <button
                    onClick={refreshNow}
                    className="underline underline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <audio
                  ref={audioRef}
                  controls
                  className="w-full"
                  onError={onAudioError}
                />
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

          {/* Per-entry image section under the audio player */}
          <EntryImageSection
            entryId={entry.id}
            userId={entry.user_id}
            imagePath={entry.image_path}
          />

        </div>
      </div>

      {/* Bottom row: AI Summary + Rule linking */}
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-zinc-800 rounded-2xl p-3">
          <SummaryChip entryId={entry.id} />
        </div>
        <div className="border border-zinc-800 rounded-2xl p-3">
          <RuleLinkPicker entryId={entry.id} />
        </div>
      </div>
        <ParentReflectionEditor
          entryId={entry.id}
          initialValue={entry.parent_reflection ?? ''}
        />
    </div>
    
  );
}
