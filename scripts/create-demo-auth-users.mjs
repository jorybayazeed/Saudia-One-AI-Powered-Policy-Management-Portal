import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const repoRoot = process.cwd();
const envFiles = ['.env.local', '.env'];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value.replace(/^['"]|['"]$/g, '');
  }
  return env;
}

function loadEnv() {
  const env = {};
  for (const file of envFiles) {
    Object.assign(env, loadEnvFile(path.join(repoRoot, file)));
  }
  return { ...process.env, ...env };
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase configuration.');
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_SERVICE_ROLE_KEY) in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const demoUsers = [
  {
    email: 'employee@academy.demo',
    password: '123456',
    user_metadata: { role: 'employee', name: 'Ahmed Al-Rashidi' },
  },
  {
    email: 'academic@academy.demo',
    password: '123456',
    user_metadata: { role: 'academic', name: 'Fatima Al-Zahrani' },
  },
  {
    email: 'admin@academy.demo',
    password: '123456',
    user_metadata: { role: 'admin', name: 'Khalid Bin-Sultan' },
  },
];

for (const user of demoUsers) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: user.user_metadata,
  });

  if (error) {
    console.error(`Failed to create ${user.email}:`, error.message);
    continue;
  }

  console.log(`Created ${user.email} (${data.user?.id ?? 'unknown id'})`);
}
