import { createClient } from '@/lib/supabase/client';
import { joinPath } from './paths';

const BUCKET = 'audio';

function normalize(p: string) {
  let x = (p || '').replace(/^\/+/, '');
  if (x.toLowerCase().startsWith(`${BUCKET}/`)) x = x.slice(BUCKET.length + 1);
  return x;
}

/** Move an object inside the audio bucket. Returns the new key on success. */
export async function moveObject(oldPath: string, newPath: string): Promise<string> {
  const supabase = createClient();
  const from = normalize(oldPath);
  const to = normalize(newPath);

  const { error } = await supabase.storage.from(BUCKET).move(from, to);
  if (error) {
    console.error('storage.move error', { from, to, error });
    throw error;
  }
  return to;
}

/** Build a trash key like: <uid>/trash/<cast_id>/<filename> */
export function buildTrashPath(uid: string, castId: string, filename: string) {
  return joinPath(uid, 'trash', castId, filename);
}
