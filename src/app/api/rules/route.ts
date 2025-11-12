import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  // 1) Find a real owner id from your data (any cast’s user_id)
  const { data: castOwner, error: ownerErr } = await supabase
    .from("casts")
    .select("user_id")
    .limit(1)
    .maybeSingle();

  // If no casts exist, we can't seed valid rules (FK would fail). Return empty.
  if (ownerErr) return NextResponse.json({ error: ownerErr.message }, { status: 400 });
  if (!castOwner?.user_id) return NextResponse.json([]);

  const OWNER = castOwner.user_id as string;

  // 2) Check existing rules for this owner
  const { data: existing, error: selErr1 } = await supabase
    .from("rules")
    .select("id")
    .eq("user_id", OWNER);

  if (selErr1) return NextResponse.json({ error: selErr1.message }, { status: 400 });

  // 3) Seed if none yet (now FK is valid)
  if (!existing || existing.length === 0) {
    const seed = [
      { title: "Listen First", description: "Ask before advising.", user_id: OWNER },
      { title: "One Story per Entry", description: "Keep entries focused.", user_id: OWNER },
      { title: "Assume Positive Intent", description: "Lead with empathy.", user_id: OWNER },
    ];
    const up = await supabase.from("rules").upsert(seed, { onConflict: "user_id,title" });
    if (up.error) return NextResponse.json({ error: up.error.message }, { status: 400 });
  }

  // 4) Return rules for this owner
  const { data: out, error: selErr2 } = await supabase
    .from("rules")
    .select("id, title, description")
    .eq("user_id", OWNER)
    .order("title");

  if (selErr2) return NextResponse.json({ error: selErr2.message }, { status: 400 });
  return NextResponse.json(out ?? []);
}
