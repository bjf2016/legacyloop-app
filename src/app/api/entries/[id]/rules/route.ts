import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const bodySchema = z.object({
  ruleIds: z.array(z.string().uuid()).default([]),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ⬅️ Next 16: params is a Promise
) {
  const { id } = await ctx.params; // ⬅️ must await
  if (!id) {
    return NextResponse.json({ error: "Missing entry id" }, { status: 400 });
  }
  // quick UUID sanity check
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json({ error: "Invalid entry id" }, { status: 400 });
  }

  const json = await req.json();
  const { ruleIds } = bodySchema.parse(json);

  // Replace links: delete existing, then insert new set
  const del = await supabase.from("entry_rule_links").delete().eq("entry_id", id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });

  if (ruleIds.length > 0) {
    const ins = await supabase
      .from("entry_rule_links")
      .insert(ruleIds.map((rid) => ({ entry_id: id, rule_id: rid })));
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, entryId: id, ruleIds });
}
