'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client-side için browser client kullan (cookie'leri otomatik yönetir)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

