const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
// Prefer the service role key on the server (bypasses RLS for admin CRUD).
// Falls back to the anon key so the app still boots if only that is set.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

let client = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
  });
}

/**
 * Whether Supabase is configured. When false, routes fall back to local
 * JSON-file storage so the app still runs during local development before
 * a Supabase project exists.
 */
function isEnabled() {
  return client !== null;
}

module.exports = { supabase: client, isEnabled };
