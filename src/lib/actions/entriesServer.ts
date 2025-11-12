'use server';

import { createClient } from '@supabase/supabase-js';

/** Write duration_ms once (when it's NULL). */
export async function setEntryDuration(entryId: string, durationMs: number) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const ms = Math.max(0, Math.floor(durationMs));
  const { error } = await supabase
    .from('entries')
    .update({ duration_ms: ms })
    .eq('id', entryId)
    .is('duration_ms', null);

  if (error) throw new Error(error.message);
  return { ok: true, entryId, durationMs: ms };
}
