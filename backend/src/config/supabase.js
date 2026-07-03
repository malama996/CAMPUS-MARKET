import { createClient } from '@supabase/supabase-js';

// Service-role client: full DB access, used ONLY on the backend, never exposed to the frontend.
// RLS is still the last line of defense (see database/schema.sql) but the backend uses the
// service key so it can perform actions on the user's behalf after verifying their JWT itself.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
