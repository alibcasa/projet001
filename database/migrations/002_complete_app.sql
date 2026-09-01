-- RevisionOS V1 complete application migration
create extension if not exists pgcrypto;

alter table if exists public.documents
  add column if not exists storage_path text,
  add column if not exists mime_type text default 'application/pdf',
  add column if not exists file_size bigint default 0,
  add column if not exists total_pages integer default 0,
  add column if not exists language text,
  add column if not exists extracted_text text,
  add column if not exists classification_confidence numeric(5,2) default 0,
  add column if not exists is_public boolean default false,
  add column if not exists updated_at timestamptz default now();

create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number integer not null,
  content text not null default '',
  created_at timestamptz default now(),
  unique(document_id, page_number)
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.collection_documents (
  collection_id uuid references public.collections(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  primary key(collection_id, document_id)
);

alter table if exists public.reading_progress
  add column if not exists pages_viewed integer[] default '{}',
  add column if not exists reading_seconds integer default 0,
  add column if not exists last_read_at timestamptz default now();

alter table if exists public.keynotes
  add column if not exists page_number integer default 1,
  add column if not exists quote text,
  add column if not exists selector jsonb,
  add column if not exists keynote_type text default 'important',
  add column if not exists importance integer default 3,
  add column if not exists visibility text default 'private';

alter table if exists public.questions
  add column if not exists document_id uuid references public.documents(id) on delete set null,
  add column if not exists source_pages integer[] default '{}',
  add column if not exists explanation text,
  add column if not exists difficulty text default 'medium',
  add column if not exists validation_status text default 'pending',
  add column if not exists generated_by text default 'ai';

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  front text not null,
  back text not null,
  source_page integer,
  due_at timestamptz default now(),
  interval_days integer default 0,
  ease_factor numeric default 2.5,
  repetitions integer default 0,
  created_at timestamptz default now()
);

create index if not exists idx_document_pages_document on public.document_pages(document_id, page_number);
create index if not exists idx_documents_user on public.documents(user_id, created_at desc);
create index if not exists idx_keynotes_document on public.keynotes(document_id, page_number);
create index if not exists idx_questions_document on public.questions(document_id);

alter table public.document_pages enable row level security;
alter table public.collections enable row level security;
alter table public.collection_documents enable row level security;
alter table public.flashcards enable row level security;

create policy "document pages via owned document" on public.document_pages for all using (
  exists(select 1 from public.documents d where d.id=document_id and (d.user_id=auth.uid() or d.is_public=true))
) with check (
  exists(select 1 from public.documents d where d.id=document_id and d.user_id=auth.uid())
);
create policy "own collections" on public.collections for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "own collection documents" on public.collection_documents for all using (
  exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid())
) with check (
  exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid())
);
create policy "own flashcards" on public.flashcards for all using (user_id=auth.uid()) with check (user_id=auth.uid());

insert into storage.buckets (id, name, public) values ('documents','documents',false)
on conflict (id) do nothing;

create policy "documents storage select" on storage.objects for select using (
  bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]
);
create policy "documents storage insert" on storage.objects for insert with check (
  bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]
);
create policy "documents storage update" on storage.objects for update using (
  bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]
);
create policy "documents storage delete" on storage.objects for delete using (
  bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]
);
