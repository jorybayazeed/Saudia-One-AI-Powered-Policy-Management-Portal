const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";
export const publicAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
export const isSupabaseConfigured = Boolean(supabaseUrl && publicAnonKey);
export const projectId = supabaseUrl ? new URL(supabaseUrl).hostname.split(".")[0] : "";
export const edgeFunctionUrl = isSupabaseConfigured
  ? `${supabaseUrl}/functions/v1/make-server-0942677d`
  : "";
export const supabaseBaseUrl = supabaseUrl;
