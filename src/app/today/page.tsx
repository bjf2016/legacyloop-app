'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getMyCasts } from '@/lib/queries/casts';
import type { CastWithMeta } from '@/types/db';

function formatTodayLabel() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

export default function TodayPage() {
  const router = useRouter();
  const [casts, setCasts] = useState<CastWithMeta[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const primaryCast = casts && casts.length > 0 ? casts[0] : null;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setAuthed(false);
          setLoading(false);
        }
        return;
      }

      setAuthed(true);

      try {
        const data = await getMyCasts();
        if (!cancelled) {
          setCasts(data);
        }
      } catch (err) {
        console.error('Failed to load casts', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleCreateTodayEntry() {
    if (!primaryCast || creating) return;

    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Not authenticated');
        return;
      }

      // Normalize to YYYY-MM-DD (local date is fine for FatherCast use-case)
      const todayTag = new Date().toISOString().slice(0, 10);

      // 1) See if an entry for today already exists for this cast
      const { data: existing, error: selectErr } = await supabase
        .from('entries')
        .select('id')
        .eq('cast_id', primaryCast.id)
        .eq('entry_date', todayTag)
        .maybeSingle();

      if (selectErr && selectErr.code !== 'PGRST116') {
        console.error('Failed checking today entry', selectErr);
        alert('Could not check for today’s entry. Please try again.');
        return;
      }

      let entryId = existing?.id as string | undefined;

      // 2) If not, create one
      if (!entryId) {
        const { data: inserted, error: insertErr } = await supabase
          .from('entries')
          .insert({
            cast_id: primaryCast.id,
            author_id: user.id,
            entry_date: todayTag,
          })
          .select('id')
          .single();

        if (insertErr || !inserted) {
          console.error('Failed creating today entry', insertErr);
          alert('Could not create today’s entry. Please try again.');
          return;
        }

        entryId = inserted.id as string;
      }

      // 3) Go straight to the recording page for that entry
      router.push(`/entries/${entryId}`);
    } finally {
      setCreating(false);
    }
  }

  // --- Render states ---

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl p-6 space-y-6">
        <h1 className="text-3xl font-bold">Today</h1>
        <p className="opacity-70">{formatTodayLabel()}</p>

        <div className="mt-4 h-28 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 animate-pulse" />
        <div className="h-28 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 animate-pulse" />
      </main>
    );
  }

  if (authed === false) {
    return (
      <main className="mx-auto max-w-md p-6 text-center">
        <h1 className="text-2xl font-semibold mb-3">Sign in required</h1>
        <p className="opacity-80 mb-4">
          You must be signed in to view your FatherCast for today.
        </p>
        <Link className="underline" href="/login">
          Go to Login
        </Link>
      </main>
    );
  }

  const todayLabel = formatTodayLabel();

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Today</h1>
        <p className="opacity-70">{todayLabel}</p>
      </div>

      {/* FatherCast summary card */}
      <section className="rounded-2xl border border-zinc-700 p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Your FatherCast</h2>
          {primaryCast ? (
            <>
              <p className="text-sm opacity-80">
                Jump back into your main cast and record today&apos;s entry.
              </p>
              <p className="mt-2 text-sm">
                <span className="font-medium">{primaryCast.title}</span>
                <span className="ml-2 opacity-70">
                  Entries: {primaryCast.entry_count ?? 0} • Last entry:{' '}
                  {primaryCast.last_entry_at
                    ? new Date(primaryCast.last_entry_at).toLocaleString()
                    : '—'}
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm opacity-80 mt-1">
              No casts yet. Create your first cast on the My Casts page.
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-2 md:mt-0">
          <Link
            href="/casts"
            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
          >
            View all casts
          </Link>
          {primaryCast && (
            <Link
              href={`/casts/${primaryCast.id}`}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900"
            >
              Open current cast
            </Link>
          )}
        </div>
      </section>

      {/* Today’s Entry card */}
      <section className="rounded-2xl border border-dashed border-zinc-700 p-5">
        {primaryCast ? (
          <>
            <h2 className="text-lg font-semibold">Today&apos;s Entry</h2>
            <p className="mt-1 text-sm opacity-80">
              Create today&apos;s entry for your main cast and go straight to
              the recording page to attach your audio.
            </p>
            <button
              onClick={handleCreateTodayEntry}
              disabled={creating}
              className="mt-4 rounded-xl bg-black text-white px-4 py-2 text-sm disabled:opacity-60"
            >
              {creating ? 'Working…' : "Create today’s entry"}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold">Next up: Today&apos;s Entry</h2>
            <p className="mt-1 text-sm opacity-80">
              Once you create your first FatherCast, you&apos;ll be able to
              create a one-tap entry for today from this screen.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
