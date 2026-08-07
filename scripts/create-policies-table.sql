create table if not exists public.policies (
  id text primary key,
  title text not null,
  title_ar text,
  description text,
  description_ar text,
  department text,
  document_type text,
  category text,
  edition integer default 1,
  effective_date text,
  last_updated text,
  status text default 'draft',
  pages integer default 0,
  requires_reading boolean default false,
  views integer default 0,
  document_key text,
  document_name text,
  content text,
  content_ar text,
  keywords text[],
  keywords_ar text[],
  policy_references jsonb default '[]'::jsonb,
  generated_by text default 'text',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.policies enable row level security;

create policy "Policies are readable by everyone"
  on public.policies
  for select
  using (true);

create policy "Policies can be inserted by app clients"
  on public.policies
  for insert
  to anon, authenticated
  with check (true);

create policy "Policies can be updated by app clients"
  on public.policies
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Policies can be deleted by app clients"
  on public.policies
  for delete
  to anon, authenticated
  using (true);
