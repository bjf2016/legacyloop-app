import { createClient } from '@/lib/supabase/client';

const BUCKET = 'audio'; // your actual bucket name

function normalizePath(p: string) {
  let path = (p || '').replace(/^\/+/, '');
  // if DB accidentally stored "audio/..." strip bucket prefix
  if (path.toLowerCase().startsWith(`${BUCKET}/`)) {
    path = path.slice(BUCKET.length + 1);
  }
  return path;
}

export async function getSignedUrl(rawPath: string, ttlSec = 900): Promise<string | null> {
  const supabase = createClient();
  const path = normalizePath(rawPath);

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttlSec);

  if (error || !data?.signedUrl) {
    const detail = {
      bucket: BUCKET,
      rawPath,
      normalized: path,
      error: error ? { name: error.name, message: error.message, status: (error as any).status } : null,
    };
    console.error('signedUrl error', detail);
    return null;
  }
  return data.signedUrl;
}
