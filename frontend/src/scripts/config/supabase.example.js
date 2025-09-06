import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and Key are required. Please check the values in supabase.js.");
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
