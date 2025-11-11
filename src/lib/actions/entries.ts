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
