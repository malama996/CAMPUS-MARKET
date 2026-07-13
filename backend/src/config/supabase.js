import { createClient } from '@supabase/supabase-js';

// Fail fast and loud at startup if these are missing, instead of booting
// successfully and only crashing on the first real request with a vague
// "fetch failed" error.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    '[config/supabase] Missing required environment variable(s): ' +
    [
      !SUPABASE_URL && 'SUPABASE_URL',
      !SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean).join(', ') +
    '. Set these in your hosting provider\'s Environment settings before deploying.'
  );
}

// Service-role client: full DB access, used ONLY on the backend, never exposed to the frontend.
// RLS is still the last line of defense (see database/schema.sql) but the backend uses the
// service key so it can perform actions on the user's behalf after verifying their JWT itself.
export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);