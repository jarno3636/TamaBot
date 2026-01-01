// lib/supabaseAdmin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("Missing env: SUPABASE_URL");
if (!serviceKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

// Admin client (service role) — NEVER use on the client
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
