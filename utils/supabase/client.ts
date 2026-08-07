import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, publicAnonKey, supabaseBaseUrl } from "./info";

export const supabase = isSupabaseConfigured
  ? createClient(supabaseBaseUrl, publicAnonKey)
  : null;
