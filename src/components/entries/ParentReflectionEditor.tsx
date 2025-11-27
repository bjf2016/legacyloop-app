'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ParentReflectionEditorProps = {
  entryId: string;
  initialValue?: string | null;
};

export default function ParentReflectionEditor({
  entryId,
  initialValue,
}: ParentReflectionEditorProps) {
  const supabase = createClient();
  const [value, setValue] = useState(initialValue ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAtLeastOnce, setSavedAtLeastOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('entries')
        .update({ parent_reflection: value })
        .eq('id', entryId);

      if (error) {
        console.error(error);
        setError('Failed to save.');
        return;
      }

      setSavedAtLeastOnce(true);
    } finally {
      setSaving(false);
    }
  }

  const disabled = saving;

  return (
    <div className="border border-zinc-800 rounded-2xl p-3 mt-3">
      <div className="mb-2 text-sm font-semibold">Parent Reflection</div>
      <textarea
        className="w-full rounded-xl border border-zinc-700 bg-black/20 p-2 text-sm resize-vertical min-h-[80px]"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Add a short reflection about this entry…"
        disabled={disabled}
      />
      <div className="mt-2 flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={onSave}
          disabled={disabled}
          className="rounded-xl border border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-900/60 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Reflection'}
        </button>

        <div className="text-right">
          {error && <span className="text-red-500">{error}</span>}
          {!error && savedAtLeastOnce && (
            <span className="text-emerald-400">Saved ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}
