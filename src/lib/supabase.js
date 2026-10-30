import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Set them in .env (local) or Netlify environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Reads the signed-in user's id from the local session (no network call).
// Row Level Security is the real enforcement; explicit user_id filters are a second safeguard.
export const getCurrentUserId = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}
