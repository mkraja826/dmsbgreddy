import { createClient } from "@supabase/supabase-js";

const runtimeConfig =
  typeof window !== "undefined" && window.DMS_CONFIG ? window.DMS_CONFIG : {};

const supabaseUrl = String(
  import.meta.env.VITE_SUPABASE_URL ||
    runtimeConfig.SUPABASE_URL ||
    runtimeConfig.supabaseUrl ||
    ""
).replace(/\/$/, "");

const supabaseAnonKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
    runtimeConfig.SUPABASE_ANON_KEY ||
    runtimeConfig.supabaseAnonKey ||
    ""
);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
