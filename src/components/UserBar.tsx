"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type UserInfo = {
  email: string | null;
  name: string | null;
};

function mapUser(sessionUser: any): UserInfo {
  if (!sessionUser) {
    return { email: null, name: null };
  }
  const meta = (sessionUser.user_metadata as any) || {};
  return {
    email: sessionUser.email ?? null,
    name: meta.full_name ?? meta.name ?? null,
  };
}

export default function UserBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function fetchUser() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!mounted) return;

        if (error || !data.user) {
          setUser(null);
        } else {
          setUser(mapUser(data.user));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        setUser(null);
      } else {
        setUser(mapUser(session.user));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // While checking auth, or if no user -> show nothing
  if (loading || !user) {
    return null;
  }

  const displayName = user.name || user.email || "Signed in";

  async function handleSignOut() {
    if (
      !confirm(
        "Are you sure you want to sign out? If you're in the middle of recording or updating an entry, make sure you've saved it first."
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (e) {
      alert("Failed to sign out. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Hide the bar on the login page itself
  if (pathname === "/login") {
    return null;
  }

  return (
    <div className="w-full border-b border-zinc-800 bg-black/80 text-zinc-100">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2 text-sm">
        <div className="truncate">
          <span className="opacity-70">Signed in as </span>
          <span className="font-medium">{displayName}</span>
        </div>
        <button
          onClick={handleSignOut}
          disabled={busy}
          className="rounded-xl border border-zinc-600 px-3 py-1 text-xs hover:bg-zinc-900 disabled:opacity-60"
        >
          {busy ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </div>
  );
}
