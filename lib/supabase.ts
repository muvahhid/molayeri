import { createClient } from '@supabase/supabase-js'

// Ünlem işaretleri (!) TypeScript'e "Bu değişkenler kesin var, merak etme" demektir.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)