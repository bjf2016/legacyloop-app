'use client';

import { useRef, useState, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

type EntryImageSectionProps = {
  entryId: string;
  userId: string;
  imagePath?: string | null;
};

export default function EntryImageSection({
  entryId,
  userId,
  imagePath,
}: EntryImageSectionProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [thumbError, setThumbError] = useState<string | null>(null);

  const onChooseFile = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const key = `${userId}/${entryId}/main.${ext}`;

      // 1) Upload to entry_images bucket
      const { error: uploadError } = await supabase
        .storage
        .from('entry_images')
        .upload(key, file, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        alert('Failed to upload image.');
        return;
      }

      // 2) Save storage path to entries.image_path
      const { error: updateError } = await supabase
        .from('entries')
        .update({ image_path: key })
        .eq('id', entryId);

      if (updateError) {
        console.error(updateError);
        alert('Image uploaded, but failed to save reference.');
        return;
      }

      // 3) Reload to pick up new image_path in EntryRow
      location.reload();
    } finally {
      setUploading(false);
      // allow re-selecting the same file later
      e.target.value = '';
    }
  };

  // Create a signed URL for thumbnail (TTL 900s = 15m)
  useEffect(() => {
    let cancelled = false;

    async function loadThumb() {
      if (!imagePath) {
        setThumbUrl(null);
        setThumbError(null);
        return;
      }

      const { data, error } = await supabase
        .storage
        .from('entry_images')
        .createSignedUrl(imagePath, 900);

      if (cancelled) return;

      if (error || !data?.signedUrl) {
        console.error(error);
        setThumbUrl(null);
        setThumbError('preview-unavailable');
      } else {
        setThumbUrl(data.signedUrl);
        setThumbError(null);
      }
    }

    loadThumb();

    return () => {
      cancelled = true;
    };
  }, [imagePath, supabase]);

  if (uploading) {
    return (
      <div className="mt-2 text-xs opacity-80">
        Uploading image…
      </div>
    );
  }

  if (imagePath) {
    return (
      <div className="mt-2 text-xs">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt="Entry image"
            className="mb-1 h-20 w-auto rounded-xl object-cover border border-zinc-800"
          />
        ) : (
          <div className="mb-1 opacity-70">
            {thumbError
              ? 'Image attached (preview unavailable)'
              : 'Image attached (loading preview…)'}
          </div>
        )}

        <button
          type="button"
          className="mt-1 rounded-xl border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-900/60"
          onClick={onChooseFile}
        >
          Change Image
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onFileSelected}
        />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="mt-2 rounded-xl border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-900/60"
        onClick={onChooseFile}
      >
        Add Image
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileSelected}
      />
    </>
  );
}
