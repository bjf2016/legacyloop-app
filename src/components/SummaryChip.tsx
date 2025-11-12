"use client";

import { useState } from "react";
import { generateSummary, SummaryGBUL } from "@/lib/ai/summary";

type Props = {
  entryId: string;
};

export default function SummaryChip({ entryId }: Props) {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<SummaryGBUL | null>(null);

  const onRun = async () => {
    setErr("");
    setResult(null);
    setLoading(true);
    try {
      const out = await generateSummary(transcript);
      setResult(out);
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-1 text-sm rounded-full border hover:bg-gray-50"
        title="Paste transcript and generate Good/Bad/Ugly/Lesson"
      >
        {open ? "Close Summary" : "Summarize"}
      </button>

      {open && (
        <div className="p-3 border rounded-lg w-full max-w-2xl">
          <label className="block text-sm mb-2">
            Paste transcript for this entry:
          </label>
          <textarea
            className="w-full h-32 border rounded p-2"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste text transcript here..."
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={onRun}
              disabled={loading || transcript.trim().length < 10}
              className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Summary"}
            </button>
            <span className="text-xs opacity-60">
              Requires ≥ 10 chars (mock mode via NEXT_PUBLIC_MOCK_AI=1)
            </span>
          </div>

          {err && (
            <div className="mt-3 text-sm text-red-600">Error: {err}</div>
          )}

          {result && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border rounded p-2">
                <div className="text-xs font-semibold opacity-60 mb-1">Good</div>
                <div>{result.good}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs font-semibold opacity-60 mb-1">Bad</div>
                <div>{result.bad}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs font-semibold opacity-60 mb-1">Ugly</div>
                <div>{result.ugly}</div>
              </div>
              <div className="border rounded p-2">
                <div className="text-xs font-semibold opacity-60 mb-1">Lesson</div>
                <div>{result.lesson}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
