import { createClient } from '@/lib/supabase/client';
import type { Entry } from '@/types/db';

export async function getEntriesByCastId(castId: string): Promise<Entry[]> {
  const supabase = createClient();

  // Ensure auth present; RLS enforces owner_id = auth.uid()
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('cast_id', castId)
    .is('deleted_at', null)  
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Entry[];
}
