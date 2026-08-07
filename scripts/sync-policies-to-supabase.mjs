import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const repoRoot = process.cwd();
const envPath = path.join(repoRoot, '.env.local');
let env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
}

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase config. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

const policies = JSON.parse(fs.readFileSync(path.join(repoRoot, 'src/data/policies.json'), 'utf8'));

const { error: tableError } = await supabase.from('policies').select('id').limit(1);
if (tableError) {
  console.error('Policies table is not available or not accessible:', tableError.message);
  process.exit(1);
}

for (const policy of policies) {
  const { error } = await supabase.from('policies').upsert({
    id: policy.id,
    title: policy.title,
    title_ar: policy.titleAr,
    description: policy.description,
    description_ar: policy.descriptionAr,
    department: policy.department,
    document_type: policy.documentType,
    category: policy.category,
    edition: policy.edition,
    effective_date: policy.effectiveDate,
    last_updated: policy.lastUpdated,
    status: policy.status,
    pages: policy.pages,
    requires_reading: policy.requiresReading,
    views: policy.views,
    document_key: policy.documentKey ?? null,
    document_name: policy.documentName ?? null,
    content: policy.content ?? null,
    content_ar: policy.contentAr ?? null,
    keywords: policy.keywords ?? [],
    keywords_ar: policy.keywordsAr ?? [],
    policy_references: policy.references ?? [],
    generated_by: policy.generatedBy ?? 'text',
  }, { onConflict: 'id' });

  if (error) {
    console.error(`Failed to upsert ${policy.id}:`, error.message);
  } else {
    console.log(`Synced ${policy.id}`);
  }
}
