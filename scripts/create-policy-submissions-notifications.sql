create table if not exists public.policy_submissions (
  id text primary key,
  policy_id text not null,
  policy_title text,
  policy_title_ar text,
  policy_description text,
  policy_description_ar text,
  department text,
  document_type text,
  category text,
  edition integer default 1,
  effective_date text,
  last_updated text,
  status text default 'pending',
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
  submitted_by text,
  submitted_by_email text,
  submitted_by_role text,
  submitted_at text,
  generation_method text,
  ai_prompt text,
  text_content text,
  text_content_ar text,
  pdf_name text,
  admin_note text,
  status_history jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.policy_submissions enable row level security;

create policy "Policy submissions are readable by everyone"
  on public.policy_submissions
  for select
  using (true);

create policy "Policy submissions can be inserted by app clients"
  on public.policy_submissions
  for insert
  to anon, authenticated
  with check (true);

create policy "Policy submissions can be updated by app clients"
  on public.policy_submissions
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Policy submissions can be deleted by app clients"
  on public.policy_submissions
  for delete
  to anon, authenticated
  using (true);

create table if not exists public.policy_notifications (
  id text primary key,
  user_email text,
  type text default 'info',
  title text,
  title_ar text,
  message text,
  message_ar text,
  date text,
  read boolean default false,
  policy_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.policy_notifications enable row level security;

create policy "Policy notifications are readable by everyone"
  on public.policy_notifications
  for select
  using (true);

create policy "Policy notifications can be inserted by app clients"
  on public.policy_notifications
  for insert
  to anon, authenticated
  with check (true);

create policy "Policy notifications can be updated by app clients"
  on public.policy_notifications
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Policy notifications can be deleted by app clients"
  on public.policy_notifications
  for delete
  to anon, authenticated
  using (true);
