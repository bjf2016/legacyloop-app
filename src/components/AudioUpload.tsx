'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';


// type Props = { entryId: string; };

// export default function AudioUpload({ entryId }: Props) {
export default function AudioUpload() {
  const params = useParams<{ id?: string }>();
  const entryId = Array.isArray(params?.id) ? params?.id?.[0] : params?.id;  
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

    async function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (!entryId) {
        setErrorMsg('No entry id in the URL.');
      return;
  }

      setUploading(true);
      setErrorMsg(null);

      try {
        const { data: { user }, error: userErr } = await supabase.auth.getUser();
        if (userErr || !user) throw new Error(`Auth error: ${userErr?.message ?? 'not signed in'}`);

        // show who we are (helps confirm RLS owner)
        console.log('Auth user id:', user.id);

        const name = file.name || 'audio.webm';
        const dot = name.lastIndexOf('.');
        const ext = dot >= 0 ? name.slice(dot + 1) : 'webm';

        const objectName = `${crypto.randomUUID()}.${ext}`;
        const objectPath = `${user.id}/${objectName}`;
        console.log('Uploading to path:', objectPath, 'type:', file.type, 'size:', file.size);

        const { error: upErr } = await supabase
          .storage
          .from('audio')
          .upload(objectPath, file, {
            upsert: true,
            contentType: file.type || 'audio/webm',
          });
        if (upErr) throw new Error(`Upload error: ${upErr.message}`);

        const { data: signed, error: signErr } = await supabase
          .storage
          .from('audio')
          .createSignedUrl(objectPath, 60 * 60);
        if (signErr || !signed?.signedUrl) {
          throw new Error(`Signed URL error: ${signErr?.message ?? 'no signedUrl returned'}`);
        }

        const { error: updateErr } = await supabase
          .from('entries')
          .update({
            audio_path: objectPath,
            audio_url: signed.signedUrl,
          })
          .eq('id', entryId); // (user_id check temporarily removed)
        if (updateErr) throw new Error(`DB update error: ${updateErr.message}`);

        setSignedUrl(signed.signedUrl);
      } catch (err: any) {
        const msg =
          err?.message ??
          (typeof err === 'string' ? err : JSON.stringify(err));
        console.error('Uploader failed:', err);
        setErrorMsg(msg);
      } finally {
        setUploading(false);
        if (e.currentTarget) e.currentTarget.value = '';
      }
    }

  

async function refreshSignedUrl() {
  try {
    setErrorMsg(null);

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('Not signed in.');
    if (!entryId) throw new Error('No entry id in the URL.');

    // 1) Try strict read (owned by me)
    let { data: row, error: selErr } = await supabase
      .from('entries')
      .select('audio_path, user_id')
      .eq('id', entryId)
      .eq('user_id', user.id)
      .single();

    // 2) Fallback: read without owner filter (for legacy rows),
    //    and claim ownership if either NULL or mine.
    if (selErr) {
      const { data: anyRow, error: anyErr } = await supabase
        .from('entries')
        .select('audio_path, user_id')
        .eq('id', entryId)
        .single();

      if (anyErr) throw anyErr;
      if (!anyRow?.audio_path) throw new Error('No audio found for this entry.');

      // If no owner yet, claim it
      if (!anyRow.user_id) {
        await supabase
          .from('entries')
          .update({ user_id: user.id })
          .eq('id', entryId)
          .is('user_id', null);
        row = { ...anyRow, user_id: user.id };
      } else if (anyRow.user_id !== user.id) {
        throw new Error('This entry belongs to another user.');
      } else {
        row = anyRow;
      }
    }

    // 3) Generate a fresh 1-hour signed URL
    const { data: signed, error: signErr } = await supabase
      .storage
      .from('audio')
      .createSignedUrl(row!.audio_path, 60 * 60);

    if (signErr || !signed?.signedUrl)
      throw new Error(signErr?.message || 'Could not refresh signed URL.');

    setSignedUrl(signed.signedUrl);

    // 4) Persist refreshed URL with owner guard
    const { error: updateErr } = await supabase
      .from('entries')
      .update({ audio_url: signed.signedUrl })
      .eq('id', entryId)
      .eq('user_id', user.id);
    if (updateErr) throw updateErr;
} catch (err: any) {
  const msg =
    err?.message ??
    (typeof err === 'string' ? err : JSON.stringify(err));
  console.error('refresh failed:', err);
  setErrorMsg(msg);
}

}


  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">Attach audio</label>
      <input
        type="file"
        accept="audio/*"
        onChange={onSelectFile}
        disabled={uploading}
        className="block w-full"
      />
      {uploading && <p className="text-sm">Uploading…</p>}
      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      {signedUrl && (
        <div className="space-y-2">
          <audio controls src={signedUrl} className="w-full" />
          <button
            type="button"
            onClick={refreshSignedUrl}
            className="rounded-md px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300"
          >
            Refresh playback link
          </button>
        </div>
      )}
    </div>
  );
}
