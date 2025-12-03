"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AudioUpload from "@/components/AudioUpload";

type AuthState = "checking" | "authed" | "anon";

export default function EntryPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const entryId = params?.id;
  const [authState, setAuthState] = useState<AuthState>("checking");

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setAuthState("anon");
        router.replace("/login");
        return;
      }
      setAuthState("authed");
    });
  }, [router]);

  if (authState === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">Checking your session…</p>
      </main>
    );
  }

  if (!entryId) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-red-500">Invalid entry URL.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Entry</h1>
          <Link
            href="/casts"
            className="inline-block rounded-full px-4 py-2 border border-gray-400 hover:bg-gray-100 transition text-sm"
          >
            ← Back to My Casts
          </Link>
        </div>

        <p className="text-sm text-zinc-600">
          Attach your audio message for this entry. Once it&apos;s uploaded,
          we&apos;ll handle transcription and summaries for you.
        </p>
      </header>


      <section className="rounded-2xl border border-zinc-300 bg-white p-6 shadow-sm hover:shadow transition">
        <h2 className="text-base font-semibold mb-2">Attach Audio</h2>

        <p className="text-sm text-zinc-600 mb-4">
          Upload a voice memo or audio file from your device. Once it’s uploaded, this
          entry will automatically process the transcription and summary.
        </p>

        <div className="border-t border-zinc-200 pt-4">
          <AudioUpload />
        </div>
      </section>

    </main>
  );
}
