export type SummaryGBUL = {
  good: string;
  bad: string;
  ugly: string;
  lesson: string;
};

export async function generateSummary(transcript: string): Promise<SummaryGBUL> {
  const res = await fetch("/api/ai/summary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
