// ⚠️ GANTI dua nilai di bawah ini dengan punya kamu sendiri.
// Cara dapatnya: Supabase Dashboard > Project Settings > API
//   - "Project URL"      -> SUPABASE_URL
//   - "anon public" key  -> SUPABASE_ANON_KEY
const SUPABASE_URL = "https://ehjmdmmcmablxooocjba.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoam1kbW1jbWFibHhvb29jamJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MjAxODYsImV4cCI6MjEwMjA5NjE4Nn0.PJUAITPT5PcLTjT9jRrLgWcWMlKV-03mjqTQssM8zLQ";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);