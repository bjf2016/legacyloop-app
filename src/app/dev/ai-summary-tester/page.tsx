"use client";

import { useState } from "react";

export default function AiSummaryTester() {
  const [transcript, setTranscript] = useState(
    "Today I told my son how proud I am of his effort. I spoke over him a couple of times though. Next time I’ll ask more questions first."
  );
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string>("");

  const run = async () => {
    setErr("");
    setOut(null);
    try {
      const res = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || `HTTP ${res.status}`);
      } else {
        setOut(data);
      }
    } catch (e: any) {
      setErr(e?.message || "Unknown error");
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">AI Summary Tester</h1>
      <p className="text-sm opacity-80">
        Must be signed in (Supabase cookie). Toggle mock mode via
        <code className="px-1"> NEXT_PUBLIC_MOCK_AI=1 </code> in <code>.env.local</code>.
      </p>
      <textarea
        className="w-full border rounded p-3 h-40"
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
      />
      <button
        onClick={run}
        className="px-4 py-2 rounded bg-black text-white"
      >
        Generate Summary
      </button>

      {err && (
        <pre className="whitespace-pre-wrap text-red-600 border p-3 rounded">
          Error: {err}
        </pre>
      )}
      {out && (
        <pre className="whitespace-pre-wrap border p-3 rounded bg-gray-50">
{JSON.stringify(out, null, 2)}
        </pre>
      )}
    </main>
  );
}
