import { createClient } from '@supabase/supabase-js'

// VITE REQUIRES THIS EXACT SYNTAX: import.meta.env.VITE_YOUR_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)