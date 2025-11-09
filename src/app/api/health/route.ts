import { NextResponse } from 'next/server'

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // (Simple init check; not querying DB tables yet)
  return NextResponse.json({
    ok: hasUrl && hasAnon,
    supabaseUrl: hasUrl,
    anonKey: hasAnon,
    envLoaded: true
  })
}
