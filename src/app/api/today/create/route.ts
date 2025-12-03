import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { findOrCreateTodayEntry } from "@/lib/actions/entriesServer";

export async function POST() {
  try {
    // IMPORTANT for Next.js 16: cookies() MUST be awaited
    const cookieStore = await cookies();
    const all = cookieStore.getAll();

    const accessToken = all.find(c => c.name === "sb-access-token")?.value;

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Load the user's cast
    const { data: cast } = await supabase
      .from("casts")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!cast) {
      return NextResponse.json(
        { error: "No cast found" },
        { status: 400 }
      );
    }

    // Create or reuse today's entry
    const result = await findOrCreateTodayEntry(cast.id);

    return NextResponse.json({ entryId: result.id });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Internal error" },
      { status: 500 }
    );
  }
}
