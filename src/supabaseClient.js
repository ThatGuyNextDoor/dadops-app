import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud in dev, doesn't crash the build — App.jsx shows a friendly setup screen instead.
  console.warn("Supabase env vars missing. Copy .env.example to .env and fill in your project URL + anon key.");
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
