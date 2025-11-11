'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSignedUrl } from '@/lib/storage/signedUrl';

/**
 * Returns a short-lived signed URL for a storage path and auto-refreshes it:
 * - refreshes ~60s before expiry
 * - refreshes if consumer calls onAuthError() (e.g., audio 403)
 */
export function useSignedUrl(path: string, ttlSec = 900) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);
  const refreshTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const u = await getSignedUrl(path, ttlSec);
      
      // adding a debug log in the hook so to see refresh events.
      console.log('[signed-url] issued', { path, ttlSec, at: new Date().toISOString() });
      
      setUrl(u);
      if (!u) setErr('Failed to create signed URL');
    } catch (e: any) {
      setErr(e?.message ?? 'Signed URL error');
    } finally {
      setLoading(false);
    }
  }, [path, ttlSec]);

  // initial + schedule refresh (ttlSec - 60s)
  useEffect(() => {
    load();
    if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    const next = Math.max(5, ttlSec - 60) * 1000;
    refreshTimer.current = window.setTimeout(load, next);
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [load, ttlSec]);

  // manual refresh trigger (e.g., on 403)
  const refreshNow = useCallback(() => load(), [load]);

  return { url, loading, error: err, refreshNow };
}
