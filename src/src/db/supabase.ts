import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../logger.js';

let cached: SupabaseClient | null = null;

// Read once at first use. Throws a clear error if env is missing — never falls
// back to mocks in code. Ops surfaces missing config at startup.
export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) {
    throw new Error(
      'Supabase env missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application': 'nusuk-api' } },
  });
  logger.info({ url_host: new URL(url).host }, 'supabase client ready');
  return cached;
}

export const CAPTURES_BUCKET = process.env['SUPABASE_CAPTURES_BUCKET'] ?? 'captures';
