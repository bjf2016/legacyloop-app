"use client";

import { useEffect, useState } from "react";

type Rule = { id: string; title: string; description?: string | null };
type Props = { entryId: string };

export default function RuleLinkPicker({ entryId }: Props) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState<null | { entryId: string; ruleIds: string[] }>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/rules")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setRules(Array.isArray(d) ? d : []);
      })
      .catch((e) => setErr(e?.message || "Failed loading rules"));
    return () => {
      alive = false;
    };
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    setErr("");
    setSaved(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/entries/${entryId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleIds: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      console.log("Rule links saved:", data);
      setSaved({ entryId: data.entryId, ruleIds: data.ruleIds || [] });
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs opacity-70">Link to Rules</div>

      {rules.length === 0 ? (
        <div className="text-sm opacity-70">
          No rules yet. They’ll appear here automatically — try again in a moment.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {rules.map((r) => (
            <button
              key={r.id}
              onClick={() => toggle(r.id)}
              className={`px-3 py-1 rounded-full border text-sm ${
                selected.includes(r.id)
                  ? "bg-zinc-900 text-white border-zinc-700"
                  : "hover:bg-zinc-900/30"
              }`}
              title={r.description || ""}
            >
              {r.title}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 rounded border bg-black text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Links"}
        </button>

        {saved && (
          <span className="text-sm text-green-600">
            Saved ✓ ({saved.ruleIds.length} linked)
          </span>
        )}
        {err && <span className="text-sm text-red-500">Error: {err}</span>}
      </div>
    </div>
  );
}
