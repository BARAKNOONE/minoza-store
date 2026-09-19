const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xvrvgnfqctsfsxdpothk.supabase.co';
// Prefer the service role key on the server (bypasses RLS for admin CRUD).
// Falls back to the anon key so the app still boots if only that is set.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cnZnbmZxY3RzZnN4ZHBvdGhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTc2MTM1NSwiZXhwIjoyMTA1MzM3MzU1fQ.JTACeDXSZNOy1u8M-EtxBMnYxj8_GQegmlC19bStyBc';

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
