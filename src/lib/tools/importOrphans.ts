'use client';

import { createClient } from '@/lib/supabase/client';

const BUCKET = 'audio';

type FileObj = { name: string; id?: string };

async function listFolder(supabase: ReturnType<typeof createClient>, folder: string) {
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 1000,
    search: '',
  });
  if (error) {
    console.warn('list error', { folder, error });
    return [] as FileObj[];
  }
  return (data ?? []) as FileObj[];
}

export async function importOrphansForCast(castId: string) {
  const supabase = createClient();

  // who am I
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const uid = user.id;

  // scan these folders (to match your current bucket layout)
  const foldersToScan = [
    `${uid}/${castId}`, // preferred future layout
    `${castId}`,        // legacy possibility
    `${uid}`,           // your current layout (all mp3s under UID)
  ];

  // existing entries for this cast (ignore trashed)
  const { data: rows, error: qErr } = await supabase
    .from('entries')
    .select('audio_path')
    .eq('cast_id', castId)
    .is('deleted_at', null);
  if (qErr) throw qErr;

  const existing = new Set((rows ?? []).map(r => (r.audio_path || '').replace(/^\/+/, '')));
  let imported = 0;

  for (const folder of foldersToScan) {
    const files = await listFolder(supabase, folder);

    for (const f of files) {
      const isMp3 = /\.mp3$/i.test(f.name);
      if (!isMp3) continue;

      const key = `${folder}/${f.name}`;
      if (existing.has(key)) continue;

      // Build required fields for your schema
      const now = new Date();
      const iso = now.toISOString();
      const entry_date = iso.slice(0, 10); // YYYY-MM-DD

      // Try without explicit id first (assumes DB default for id=uuid)
      const payload: Record<string, any> = {
        cast_id: castId,
        author_id: uid,            // REQUIRED (NOT NULL)
        user_id: uid,              // keep for compatibility
        entry_date,                // REQUIRED (NOT NULL, date)
        created_at: iso,           // some schemas default this; we set explicitly
        updated_at: iso,           // REQUIRED (NOT NULL)
        // title: null,
        content: null,
        audio_path: key,           // relative to bucket root
        audio_url: null,
      };

      let { error: insErr } = await supabase.from('entries').insert(payload);

      // If the DB complains about missing id default, generate one client-side
      if (insErr) {
        try {
          const id = (globalThis.crypto?.randomUUID?.() as string) || `${uid}-${now.getTime()}`;
          const withId = { id, ...payload };
          const retry = await supabase.from('entries').insert(withId);
          insErr = retry.error || null;
        } catch (e) {
          console.error('importOrphans uuid generation failed', e);
        }
      }

      if (!insErr) {
        imported += 1;
        existing.add(key);
      } else {
        console.error('importOrphans insert error', {
            key,
            message: insErr?.message,
            details: (insErr as any)?.details,
            hint: (insErr as any)?.hint,
            code: (insErr as any)?.code,
          });

      }
    }
  }

  return { ok: true, imported };
}
