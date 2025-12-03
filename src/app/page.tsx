import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default async function RootPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated → go to login
  if (!user) {
    redirect("/login");
  }

  // Authenticated → go to Today page (we'll implement /today next)
  redirect("/today");

  // Fallback: should never render because of redirects above
  return null;
}
