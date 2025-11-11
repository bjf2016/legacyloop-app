import { createClient } from '@/lib/supabase/client';
import type { CastWithMeta } from '@/types/db';

// Returns all casts for the current user with entry_count + last_entry_at
export async function getMyCasts(): Promise<CastWithMeta[]> {
  const supabase = createClient();

  // 1) get user
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error('Not authenticated');

  // 2) base casts for this user
  const { data: casts, error: castErr } = await supabase
    .from('casts')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (castErr) {
    console.error('getMyCasts error', { userId: user.id, castErr });
    throw castErr;
  }

  // 3) fetch aggregated meta per cast (count + latest)
  //    (Could be optimized into a single SQL view later; fine for now.)
  const results: CastWithMeta[] = [];

  for (const c of casts ?? []) {
    const [countRes, lastRes] = await Promise.all([
      supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .eq('cast_id', c.id)
        .is('deleted_at', null), // ← ignore trashed

      supabase
        .from('entries')
        .select('created_at')
        .eq('cast_id', c.id)
        .is('deleted_at', null)  // ← ignore trashed
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const entry_count = countRes.count ?? 0;
    const last_entry_at = lastRes.data?.[0]?.created_at ?? null;

    results.push({
      ...c,
      entry_count,
      last_entry_at,
    });
  }

  return results;
}
