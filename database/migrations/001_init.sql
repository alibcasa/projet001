create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'user' check (role in ('super_admin','admin','editor','user')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,full_name)
  values(new.id,new.email,new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  parent_id uuid references public.categories(id) on delete cascade
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  storage_path text,
  mime_type text not null default 'application/pdf',
  file_size bigint not null default 0,
  total_pages int not null default 0,
  language text,
  description text,
  source_type text default 'upload',
  extracted_text text,
  classification_confidence numeric(5,2) default 0,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number int not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  unique(document_id,page_number)
);

create table if not exists public.document_categories (
  document_id uuid references public.documents(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  confidence numeric(5,2),
  primary key(document_id,category_id)
);
create table if not exists public.tags(id uuid primary key default gen_random_uuid(),name text unique not null);
create table if not exists public.document_tags(document_id uuid references public.documents(id) on delete cascade,tag_id uuid references public.tags(id) on delete cascade,primary key(document_id,tag_id));

create table if not exists public.reading_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  last_page int not null default 1,
  highest_page int not null default 1,
  total_pages int not null default 0,
  pages_viewed int[] not null default '{}',
  reading_seconds int not null default 0,
  completion_percent numeric(5,2) not null default 0,
  first_opened_at timestamptz not null default now(),
  last_read_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key(user_id,document_id)
);

create table if not exists public.keynotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  page_number int not null default 1,
  quote text,
  selector jsonb,
  keynote_type text not null default 'important',
  content text,
  comment text,
  importance int not null default 3 check(importance between 1 and 5),
  tags text[] not null default '{}',
  visibility text not null default 'private',
  hypothesis_annotation_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.references_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  type text,
  title text not null,
  authors text,
  year int,
  publisher text,
  doi text,
  isbn text,
  url text,
  abstract text,
  bibtex text,
  csl_json jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  mode text not null default 'practice',
  duration_minutes int,
  created_at timestamptz not null default now()
);
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  question_text text not null,
  source_pages int[] not null default '{}',
  source_excerpt text,
  explanation text,
  difficulty text not null default 'medium',
  question_type text not null default 'multiple_choice',
  validation_status text not null default 'pending',
  generated_by text not null default 'ai',
  created_at timestamptz not null default now()
);
create table if not exists public.question_choices (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  choice_text text not null,
  is_correct boolean not null default false
);
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(5,2),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  front text not null,
  back text not null,
  source_page int,
  due_at timestamptz default now(),
  interval_days int not null default 0,
  ease_factor numeric not null default 2.5,
  repetitions int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.agenda_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  event_type text default 'revision',
  document_id uuid references public.documents(id) on delete set null,
  external_provider text,
  external_id text
);

create table if not exists public.integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(user_id,provider)
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
  primary key(collection_id,document_id)
);

create index if not exists idx_documents_user on public.documents(user_id,created_at desc);
create index if not exists idx_document_pages_document on public.document_pages(document_id,page_number);
create index if not exists idx_keynotes_document on public.keynotes(document_id,page_number);
create index if not exists idx_questions_quiz on public.questions(quiz_id);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.reading_progress enable row level security;
alter table public.keynotes enable row level security;
alter table public.references_library enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_choices enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.flashcards enable row level security;
alter table public.agenda_events enable row level security;
alter table public.integrations enable row level security;
alter table public.collections enable row level security;
alter table public.collection_documents enable row level security;

create policy "profiles self read" on public.profiles for select using(id=auth.uid());
create policy "profiles self update" on public.profiles for update using(id=auth.uid());
create policy "documents own or public" on public.documents for select using(user_id=auth.uid() or is_public=true);
create policy "documents own insert" on public.documents for insert with check(user_id=auth.uid());
create policy "documents own update" on public.documents for update using(user_id=auth.uid());
create policy "documents own delete" on public.documents for delete using(user_id=auth.uid());
create policy "pages via documents" on public.document_pages for select using(exists(select 1 from public.documents d where d.id=document_id and (d.user_id=auth.uid() or d.is_public=true)));
create policy "pages write own" on public.document_pages for all using(exists(select 1 from public.documents d where d.id=document_id and d.user_id=auth.uid())) with check(exists(select 1 from public.documents d where d.id=document_id and d.user_id=auth.uid()));
create policy "progress own" on public.reading_progress for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "keynotes own" on public.keynotes for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "references own" on public.references_library for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "quizzes own" on public.quizzes for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "questions via quiz" on public.questions for all using(exists(select 1 from public.quizzes q where q.id=quiz_id and q.user_id=auth.uid())) with check(exists(select 1 from public.quizzes q where q.id=quiz_id and q.user_id=auth.uid()));
create policy "choices via question" on public.question_choices for all using(exists(select 1 from public.questions q join public.quizzes z on z.id=q.quiz_id where q.id=question_id and z.user_id=auth.uid())) with check(exists(select 1 from public.questions q join public.quizzes z on z.id=q.quiz_id where q.id=question_id and z.user_id=auth.uid()));
create policy "attempts own" on public.quiz_attempts for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "flashcards own" on public.flashcards for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "agenda own" on public.agenda_events for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "integrations own" on public.integrations for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "collections own" on public.collections for all using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy "collection docs own" on public.collection_documents for all using(exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid())) with check(exists(select 1 from public.collections c where c.id=collection_id and c.user_id=auth.uid()));

insert into storage.buckets(id,name,public) values('documents','documents',false) on conflict(id) do nothing;
drop policy if exists "RevisionOS documents select" on storage.objects;
drop policy if exists "RevisionOS documents insert" on storage.objects;
drop policy if exists "RevisionOS documents update" on storage.objects;
drop policy if exists "RevisionOS documents delete" on storage.objects;
create policy "RevisionOS documents select" on storage.objects for select using(bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "RevisionOS documents insert" on storage.objects for insert with check(bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "RevisionOS documents update" on storage.objects for update using(bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]);
create policy "RevisionOS documents delete" on storage.objects for delete using(bucket_id='documents' and auth.uid()::text=(storage.foldername(name))[1]);
