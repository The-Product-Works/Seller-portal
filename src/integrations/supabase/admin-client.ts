// Admin client for server-side operations (runs in browser with publishable key)
// Note: This uses the publishable key, same as regular client
// For true admin operations, use a backend API endpoint instead

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// In browser environment, we use the same client as regular supabase
// The authenticated user context is maintained through auth state
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
