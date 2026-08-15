// ⚠️ GANTI dua nilai di bawah ini dengan punya kamu sendiri.
// Cara dapatnya: Supabase Dashboard > Project Settings > API
//   - "Project URL"      -> SUPABASE_URL
//   - "anon public" key  -> SUPABASE_ANON_KEY
const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "isi-anon-key-kamu-disini";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
