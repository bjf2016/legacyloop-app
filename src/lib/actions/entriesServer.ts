'use server';

import { createClient } from '@/lib/supabase/client';
import { v4 as uuid } from 'uuid';

/** Write duration_ms once (when it's NULL). */
export async function setEntryDuration(entryId: string, durationMs: number) {
  const supabase = createClient();

  const ms = Math.max(0, Math.floor(durationMs));
  const { error } = await supabase
    .from('entries')
    .update({ duration_ms: ms })
    .eq('id', entryId)
    .is('duration_ms', null);

  if (error) throw new Error(error.message);
  return { ok: true, entryId, durationMs: ms };
}

/** Find or create today's entry for a given cast */
export async function findOrCreateTodayEntry(castId: string) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Normalize today's date as YYYY-MM-DD
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayTag = `${yyyy}-${mm}-${dd}`;

  // 1. Does today's entry already exist?
  const { data: existing, error: selectErr } = await supabase
    .from('entries')
    .select('id')
    .eq('cast_id', castId)
    .eq('entry_date', todayTag)
    .maybeSingle();

  // If an unexpected error, throw
  if (selectErr && selectErr.code !== 'PGRST116') {
    throw selectErr;
  }

  if (existing?.id) {
    return { id: existing.id, created: false };
  }

  // 2. Create new entry
  const newId = uuid();
  const { data: inserted, error: insertErr } = await supabase
    .from('entries')
    .insert([
      {
        id: newId,
        cast_id: castId,
        author_id: user.id,
        entry_date: todayTag,
      },
    ])
    .select('id')
    .single();

  if (insertErr) throw insertErr;

  return { id: inserted.id, created: true };
}
