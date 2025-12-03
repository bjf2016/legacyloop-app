'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('userA@test.local');
  const [password, setPassword] = useState('');

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(`Sign-in failed: ${error.message}`);
      return;
    }

    setPassword('');
    router.replace('/today');
  }

  return (
    <main className="mx-auto max-w-sm p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      <form onSubmit={onSignIn} className="space-y-3">
        <input
          className="w-full border rounded p-2"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border rounded p-2"
          placeholder="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button className="w-full rounded bg-black text-white py-2">
          Sign in
        </button>
      </form>

      {/* Future: Forgot password / Forgot user ID */}
    </main>
  );
}
