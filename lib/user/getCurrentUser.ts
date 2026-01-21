import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getCurrentUserContext() {
  const supabase = await createSupabaseServerClient();

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) return { user: null, profile: null, settings: null };

  const user = userRes.user;

  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  return { user, profile, settings };
}
