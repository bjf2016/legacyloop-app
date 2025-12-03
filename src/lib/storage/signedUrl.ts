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

export async function getSignedUrl(
  rawPath?: string | null,
  ttlSec = 900
): Promise<string | null> {
  // No path = nothing to sign. Don't even hit Supabase.
  if (!rawPath) {
    return null;
  }

  const supabase = createClient();
  const path = normalizePath(rawPath);

  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .createSignedUrl(path, ttlSec);

  // Real error from Supabase
  if (error) {
    const detail = {
      bucket: BUCKET,
      rawPath,
      normalized: path,
      error: {
        name: error.name,
        message: error.message,
        status: (error as any).status,
      },
    };
    console.error('signedUrl error', detail);
    return null;
  }

  // No error, but no signedUrl either (rare / edge case)
  if (!data?.signedUrl) {
    console.warn('signedUrl missing signedUrl', {
      bucket: BUCKET,
      rawPath,
      normalized: path,
    });
    return null;
  }

  return data.signedUrl;
}
