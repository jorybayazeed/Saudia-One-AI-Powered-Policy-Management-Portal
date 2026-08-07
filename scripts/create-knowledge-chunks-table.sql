create table if not exists public.knowledge_chunks (
  id text primary key,
  document_title text,
  document_edition text,
  effective_date text,
  record_id text,
  record_type text,
  chapter text,
  section text,
  source_page text,
  item_order integer,
  title text,
  description text,
  responsible_role text,
  system_or_asset text,
  frequency_or_timing text,
  trigger_or_condition text,
  target_or_threshold text,
  evidence_or_record text,
  storage_location text,
  retention_period text,
  reference_or_recipient text,
  chunk_text text,
  retrieval_group_id text,
  group_title text,
  parent_record_id text,
  sequence_path text,
  rag_category text,
  arabic_search_terms text,
  rag_chunk_text text,
  record_status text,
  arabic_keywords text,
  arabic_colloquial_aliases text,
  sample_user_queries_ar text,
  normalized_search_text text,
  hybrid_search_text text,
  created_at timestamptz default now()
);

alter table public.knowledge_chunks enable row level security;

create policy "Knowledge chunks are readable by everyone"
  on public.knowledge_chunks
  for select
  using (true);

create policy "Service role can manage knowledge_chunks"
  on public.knowledge_chunks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
