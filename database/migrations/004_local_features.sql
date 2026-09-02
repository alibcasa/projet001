-- RevisionOS local feature/security completion.
-- Complète le CRUD des catégories sous RLS sans toucher aux données existantes.

alter table public.categories enable row level security;

drop policy if exists "categories insert" on public.categories;
drop policy if exists "categories update" on public.categories;
drop policy if exists "categories delete" on public.categories;

create policy "categories insert" on public.categories
for insert to authenticated
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin','admin','editor')
  )
);

create policy "categories update" on public.categories
for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin','admin','editor')
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin','admin','editor')
  )
);

create policy "categories delete" on public.categories
for delete to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin','admin','editor')
  )
);
