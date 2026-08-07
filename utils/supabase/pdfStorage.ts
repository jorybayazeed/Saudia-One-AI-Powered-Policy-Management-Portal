import { edgeFunctionUrl, isSupabaseConfigured, publicAnonKey, supabaseBaseUrl } from "./info";

const BUCKET = "policy-documents";
const authHeaders = {
  Authorization: `Bearer ${publicAnonKey}`,
  "Content-Type": "application/json",
};

function requireSupabase(): void {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.");
  }
}

export async function ensureBucket(): Promise<void> {
  requireSupabase();
  const res = await fetch(`${edgeFunctionUrl}/storage/setup`, { method: "POST", headers: authHeaders });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Setup failed: ${res.status}`);
  }
}

export async function uploadPdf(fileName: string, blob: Blob): Promise<string | null> {
  requireSupabase();
  const signRes = await fetch(`${edgeFunctionUrl}/storage/signed-upload/${encodeURIComponent(fileName)}`, { headers: authHeaders });
  if (!signRes.ok) throw new Error(`Could not get a signed upload URL: ${signRes.status}`);
  const { signedUrl } = (await signRes.json()) as { signedUrl: string };
  const uploadRes = await fetch(signedUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: blob });
  if (!uploadRes.ok) throw new Error(`PDF upload failed: ${uploadRes.status}`);
  return getPublicUrl(fileName);
}

export function getPublicUrl(fileName: string): string {
  requireSupabase();
  return `${supabaseBaseUrl}/storage/v1/object/public/${BUCKET}/${fileName}`;
}
