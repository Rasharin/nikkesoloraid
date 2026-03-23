create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists contact_inquiries_created_at_idx
  on public.contact_inquiries (created_at desc);

create index if not exists contact_inquiries_user_id_created_at_idx
  on public.contact_inquiries (user_id, created_at desc);

alter table public.contact_inquiries enable row level security;

drop policy if exists "contact_inquiries_insert_all" on public.contact_inquiries;
drop policy if exists "contact_inquiries_select_master_only" on public.contact_inquiries;
drop policy if exists "contact_inquiries_delete_master_only" on public.contact_inquiries;

create policy "contact_inquiries_insert_all"
on public.contact_inquiries
for insert
to anon, authenticated
with check (
  user_id is null or auth.uid() = user_id
);

create policy "contact_inquiries_select_master_only"
on public.contact_inquiries
for select
to authenticated
using (
  exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
);

create policy "contact_inquiries_delete_master_only"
on public.contact_inquiries
for delete
to authenticated
using (
  exists (
    select 1
    from public.app_config
    where public.app_config.master_user_id = auth.uid()
  )
);
