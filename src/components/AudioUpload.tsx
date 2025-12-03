'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

export default function AudioUpload() {
  const params = useParams<{ id?: string }>();
  const entryId = Array.isArray(params?.id) ? params?.id?.[0] : params?.id;

  const supabase = createClient();

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  // Mic-recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordUploading, setRecordUploading] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  /**
   * Shared helper: upload a Blob to Supabase and attach to this entry.
   */
  async function uploadBlobToEntry(blob: Blob, extFallback: string) {
    if (!entryId) {
      setErrorMsg('No entry id in the URL.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        throw new Error(`Auth error: ${userErr?.message ?? 'not signed in'}`);
      }

      console.log('Auth user id:', user.id);

      const objectName = `${crypto.randomUUID()}.${extFallback}`;
      const objectPath = `${user.id}/${objectName}`;

      console.log(
        'Uploading to path:',
        objectPath,
        'type:',
        blob.type,
        'size:',
        blob.size
      );

      const { error: upErr } = await supabase
        .storage
        .from('audio')
        .upload(objectPath, blob, {
          upsert: true,
          contentType: blob.type || `audio/${extFallback}`,
        });

      if (upErr) {
        throw new Error(`Upload error: ${upErr.message}`);
      }

      const { data: signed, error: signErr } = await supabase
        .storage
        .from('audio')
        .createSignedUrl(objectPath, 60 * 60);

      if (signErr || !signed?.signedUrl) {
        throw new Error(
          `Signed URL error: ${signErr?.message ?? 'no signedUrl returned'}`
        );
      }

      const { error: updateErr } = await supabase
        .from('entries')
        .update({
          audio_path: objectPath,
          audio_url: signed.signedUrl,
        })
        .eq('id', entryId);

      if (updateErr) {
        throw new Error(`DB update error: ${updateErr.message}`);
      }

      setSignedUrl(signed.signedUrl);
    } catch (err: any) {
      const msg =
        err?.message ?? (typeof err === 'string' ? err : JSON.stringify(err));
      console.error('Uploader failed:', err);
      setErrorMsg(msg);
    } finally {
      setUploading(false);
    }
  }

  /**
   * File-picker upload (existing behaviour).
   */
  async function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!entryId) {
      setErrorMsg('No entry id in the URL.');
      return;
    }

    const name = file.name || 'audio.webm';
    const dot = name.lastIndexOf('.');
    const ext = dot >= 0 ? name.slice(dot + 1) : 'webm';

    await uploadBlobToEntry(file, ext);

    // reset input so the same file can be picked again if needed
    if (e.currentTarget) e.currentTarget.value = '';
  }

  /**
   * Mic recording: start/stop toggle.
   */
  async function onToggleRecording() {
    // If we are already recording, stop and let onstop handler handle upload.
    if (isRecording) {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        mr.stop();
      }
      setIsRecording(false);
      return;
    }

    // Start recording
    try {
      setRecordingError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      recordedChunksRef.current = [];

      mr.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      mr.onerror = (ev: MediaRecorderErrorEvent) => {
        console.error('MediaRecorder error', ev);
        setRecordingError('Recording failed. Please try again.');
        setIsRecording(false);
      };

      mr.onstop = async () => {
        // stop tracks
        stream.getTracks().forEach((t) => t.stop());

        const chunks = recordedChunksRef.current;
        recordedChunksRef.current = [];

        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (!blob.size) {
          console.warn('Empty recording, nothing to upload.');
          return;
        }

        try {
          setRecordUploading(true);
          await uploadBlobToEntry(blob, 'webm');
        } finally {
          setRecordUploading(false);
        }
      };

      mr.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error('getUserMedia/MediaRecorder failed:', err);
      setRecordingError(
        'Unable to access microphone. Check browser permissions and try again.'
      );
      setIsRecording(false);
    }
  }

  /**
   * Refresh a signed URL using your existing RLS-safe logic.
   */
  async function refreshSignedUrl() {
    try {
      setErrorMsg(null);

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error || !user) throw new Error('Not signed in.');
      if (!entryId) throw new Error('No entry id in the URL.');

      // 1) Try strict read (owned by me)
      let { data: row, error: selErr } = await supabase
        .from('entries')
        .select('audio_path, user_id')
        .eq('id', entryId)
        .eq('user_id', user.id)
        .single();

      // 2) Fallback for legacy rows (and claim ownership if needed)
      if (selErr) {
        const { data: anyRow, error: anyErr } = await supabase
          .from('entries')
          .select('audio_path, user_id')
          .eq('id', entryId)
          .single();

        if (anyErr) throw anyErr;
        if (!anyRow?.audio_path) throw new Error('No audio found for this entry.');

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

      const { data: signed, error: signErr } = await supabase
        .storage
        .from('audio')
        .createSignedUrl(row!.audio_path, 60 * 60);

      if (signErr || !signed?.signedUrl) {
        throw new Error(signErr?.message || 'Could not refresh signed URL.');
      }

      setSignedUrl(signed.signedUrl);

      const { error: updateErr } = await supabase
        .from('entries')
        .update({ audio_url: signed.signedUrl })
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (updateErr) throw updateErr;
    } catch (err: any) {
      const msg =
        err?.message ?? (typeof err === 'string' ? err : JSON.stringify(err));
      console.error('refresh failed:', err);
      setErrorMsg(msg);
    }
  }

  const showBusy = uploading || recordUploading;

  return (
    <div className="space-y-3" aria-busy={showBusy}>
      <label className="block text-sm font-medium">Attach audio</label>

<div className="relative">
  <input
    type="file"
    accept="audio/*"
    onChange={onSelectFile}
    disabled={uploading}
    className="
      block w-full text-sm text-zinc-900 cursor-pointer
      file:mr-4 file:rounded-full file:border-0
      file:bg-black file:px-4 file:py-2
      file:text-sm file:font-semibold file:text-white
      hover:file:bg-zinc-800
      disabled:opacity-50 disabled:cursor-not-allowed
    "
  />

  {uploading && (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-md">
      <div className="flex items-center gap-2 text-sm">
        <svg
          className="animate-spin h-4 w-4 text-black"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          ></path>
        </svg>
        Uploading…
      </div>
    </div>
  )}
</div>


      {uploading && !recordUploading && (
        <p className="text-sm text-zinc-700">
          Uploading your audio… this can take a few seconds. Please don&apos;t
          close the page.
        </p>
      )}

      {/* Mic recording section */}
      <div className="mt-4 border-t border-dashed border-zinc-300 pt-4">
        <p className="text-xs text-zinc-600 mb-2">
          Prefer to record directly from your mic instead of uploading a file?
        </p>

        <button
          type="button"
          onClick={onToggleRecording}
          disabled={recordUploading} // allow click while recording; block only while saving
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition
            ${
              isRecording
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-zinc-400 bg-white text-zinc-800 hover:bg-zinc-50'
            }
            ${recordUploading ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-400'
            }`}
          />
          {isRecording ? 'Stop recording' : 'Record with mic'}
        </button>

        {isRecording && (
          <p className="mt-1 text-xs text-zinc-600">
            Recording… speak now, then click &quot;Stop recording&quot; to
            upload.
          </p>
        )}

        {recordUploading && (
          <p className="mt-1 text-xs text-zinc-600">
            Saving your recording… please keep this page open.
          </p>
        )}

        {recordingError && (
          <p className="mt-1 text-xs text-red-600">{recordingError}</p>
        )}
      </div>

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      {signedUrl && (
        <div className="space-y-2 pt-2">
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
