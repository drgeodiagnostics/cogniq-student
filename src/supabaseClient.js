import { createClient } from '@supabase/supabase-js'

// 🔒 PATCHED: Dynamically pulling environment variables to satisfy SQB Protocol
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error("CRITICAL FAILURE: Missing Supabase Environment Variables.")
}

export const supabase = createClient(supabaseUrl, supabaseKey)