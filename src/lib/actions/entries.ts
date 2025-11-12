'use client';

import { createClient } from '@/lib/supabase/client';
import { basename } from '@/lib/storage/paths';
import { buildTrashPath, moveObject } from '@/lib/storage/moveObject';

export async function softDeleteEntry(entryId: string) {
  const supabase = createClient();

  // Load entry (need cast_id, user_id, audio_path)
  const { data: entry, error: readErr } = await supabase
    .from('entries')
    .select('id, cast_id, user_id, audio_path')
    .eq('id', entryId)
    .single();

  if (readErr || !entry) throw readErr || new Error('Entry not found');

  const uid = entry.user_id as string;
  const castId = entry.cast_id as string;
  const fname = basename(entry.audio_path);

  const trashPath = buildTrashPath(uid, castId, fname);

  // 1) move the file under /<uid>/trash/<castId>/<file>
  await moveObject(entry.audio_path, trashPath);

  // 2) mark row as soft-deleted and update audio_path to new location
  const { error: updErr } = await supabase
    .from('entries')
    .update({
      deleted_at: new Date().toISOString(),
      audio_path: trashPath,
      // (optional) title: entry.title ?? 'Untitled Entry',
    })
    .eq('id', entryId);

  if (updErr) throw updErr;

  // Done. Caller can refresh the list or optimistically remove the row.
  return { ok: true, id: entryId };
}

// -----------------------------
// Server-side action (Step 4)
// -----------------------------
'use server';

import { createClient as createServerClient } from '@supabase/supabase-js';

/**
 * Persist duration (ms) for an entry once the audio metadata is known.
 * This only sets it if duration_ms is currently null.
 */
export async function setEntryDuration(entryId: string, durationMs: number) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const ms = Math.max(0, Math.floor(durationMs));

  const { error } = await supabase
    .from('entries')
    .update({ duration_ms: ms })
    .eq('id', entryId)
    .is('duration_ms', null); // write once

  if (error) throw new Error(error.message);
  return { ok: true, entryId, durationMs: ms };
}
