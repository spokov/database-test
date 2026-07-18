import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Липсват VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Виж README.md за настройка на .env файла.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
