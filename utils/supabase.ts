import { createClient } from '@supabase/supabase-js';

// Double-check that our environment variables exist to prevent crashes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase URL or Service Role Key in .env.local');
}

// Create and export the Admin Client
// WARNING: Because this uses the Service Role Key, it has full database access.
// ONLY use this client inside Server Actions or API Routes (never in client-side React components).
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false, // Not needed for a backend bot
  }
});
