import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cgyazwnwrhegiqubdiso.supabase.co'
const supabaseAnonKey = 'sb_publishable_twxFF1NVzgp6ejO1ufy0yA_3UH9w5n3'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)