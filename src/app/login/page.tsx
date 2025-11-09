'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';


export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('userA@test.local');
  const [password, setPassword] = useState('');

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    alert(error ? `Sign-in failed: ${error.message}` : 'Signed in!');
  }

  async function onSignOut() {
    await supabase.auth.signOut();
    alert('Signed out');
  }

  async function onWhoAmI() {
    const { data } = await supabase.auth.getUser();
    alert(data?.user ? `User: ${data.user.id}` : 'No user');
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
        <button className="w-full rounded bg-black text-white py-2">Sign in</button>
      </form>
      <div className="flex gap-2">
        <button className="rounded border px-3 py-2" onClick={onWhoAmI}>Who am I?</button>
        <button className="rounded border px-3 py-2" onClick={onSignOut}>Sign out</button>
      </div>
    </main>
  );
}
