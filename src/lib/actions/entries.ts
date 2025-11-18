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

export async function restoreEntry(entryId: string) {
  const supabase = createClient();

  // Load the entry so we know current audio_path
  const { data: entry, error: readErr } = await supabase
    .from('entries')
    .select('id, audio_path')
    .eq('id', entryId)
    .single();

  if (readErr || !entry) {
    throw new Error(readErr?.message ?? 'Entry not found');
  }

  const currentPath = entry.audio_path as string | null;

  if (!currentPath) {
    throw new Error('Entry has no audio path to restore');
  }

  const parts = currentPath.split('/');

  // Expect: [ userId, 'trash', castId, ...rest ]
  if (parts.length < 4 || parts[1] !== 'trash') {
    // If it's not in trash, just clear deleted_at and exit gracefully
    const { error: updErr } = await supabase
      .from('entries')
      .update({ deleted_at: null })
      .eq('id', entryId);

    if (updErr) throw new Error(updErr.message);
    return { ok: true, id: entryId, restored: false };
  }

  const [userId, _trash, castId, ...rest] = parts;
  const restoredPath = [userId, castId, ...rest].join('/');

  // TODO: confirm bucket name; adjust if you're using a different one
  const BUCKET = 'audio';

  // Move file back from trash to original location
  const { error: moveErr } = await supabase.storage
    .from(BUCKET)
    .move(currentPath, restoredPath);

  if (moveErr) {
    throw new Error(moveErr.message);
  }

  // Clear deleted_at and update audio_path
  const { error: updErr } = await supabase
    .from('entries')
    .update({
      deleted_at: null,
      audio_path: restoredPath,
    })
    .eq('id', entryId);

  if (updErr) {
    throw new Error(updErr.message);
  }

  return { ok: true, id: entryId, restored: true };
}
