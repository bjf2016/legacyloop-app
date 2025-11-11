// src/lib/tools/normalizePaths.ts
'use client';

import { createClient } from '@/lib/supabase/client';
import { moveObject } from '@/lib/storage/moveObject';

export async function normalizePathsForCast(castId: string) {
  const supabase = createClient();

  // who am I?
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const uid = user.id;

  // fetch all non-trashed entries for this cast
  const { data: rows, error: qErr } = await supabase
    .from('entries')
    .select('id, audio_path')
    .eq('cast_id', castId)
    .is('deleted_at', null);

  if (qErr) throw qErr;

  console.log('[normalize] rows:', rows?.length ?? 0);

  let moved = 0;
  for (const r of rows ?? []) {
    const key = (r.audio_path || '').replace(/^\/+/, '');
    if (!key) {
      console.log('[normalize] skip: empty key', r.id);
      continue;
    }

    const already = key.startsWith(`${uid}/${castId}/`);
    const inTrash  = key.startsWith(`${uid}/trash/`);
    const underUid = key.startsWith(`${uid}/`);
    const underCid = key.startsWith(`${castId}/`);

    console.log('[normalize] inspect', { id: r.id, key, already, inTrash, underUid, underCid });

    if (already) {
      console.log('[normalize] skip: already normalized', key);
      continue;
    }
    if (inTrash) {
      console.log('[normalize] skip: in trash', key);
      continue;
    }

    // Move <uid>/<file>.mp3  →  <uid>/<castId>/<file>.mp3
    if (underUid && !underCid) {
      const filename = key.split('/').pop()!;
      const target = `${uid}/${castId}/${filename}`;
      console.log('[normalize] moving', { from: key, to: target });
      try {
        await moveObject(key, target);
        const { error: updErr } = await supabase
          .from('entries')
          .update({ audio_path: target, updated_at: new Date().toISOString() })
          .eq('id', r.id);
        if (updErr) throw updErr;
        moved += 1;
      } catch (e) {
        console.error('[normalize] move/update failed', { from: key, error: e });
      }
      continue;
    }

    // Move <castId>/<file>.mp3  →  <uid>/<castId>/<file>.mp3
    if (underCid) {
      const filename = key.split('/').pop()!;
      const target = `${uid}/${castId}/${filename}`;
      console.log('[normalize] moving (legacy)', { from: key, to: target });
      try {
        await moveObject(key, target);
        const { error: updErr } = await supabase
          .from('entries')
          .update({ audio_path: target, updated_at: new Date().toISOString() })
          .eq('id', r.id);
        if (updErr) throw updErr;
        moved += 1;
      } catch (e) {
        console.error('[normalize] move/update failed (legacy)', { from: key, error: e });
      }
      continue;
    }

    console.log('[normalize] skip: unexpected pattern', key);
  }

  return { ok: true, moved };
}
