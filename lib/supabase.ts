import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side (safe, limited access)
export const supabase = createClient(url, anon);

// Server-side only (full access, never expose to client)
export const supabaseAdmin = createClient(url, service);
