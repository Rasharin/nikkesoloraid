-- 60_storage.sql
-- Public buckets and storage policies used by the app.

insert into storage.buckets (id, name, public)
values
  ('nikke-images', 'nikke-images', true),
  ('boss-images', 'boss-images', true),
  ('usage-board-images', 'usage-board-images', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "boss_images_select_all" on storage.objects;
drop policy if exists "boss_images_insert_master_only" on storage.objects;
drop policy if exists "boss_images_update_master_only" on storage.objects;
drop policy if exists "boss_images_delete_master_only" on storage.objects;

create policy "boss_images_select_all" on storage.objects for select to anon, authenticated using (bucket_id = 'boss-images');
create policy "boss_images_insert_master_only" on storage.objects for insert to authenticated with check (bucket_id = 'boss-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "boss_images_update_master_only" on storage.objects for update to authenticated using (bucket_id = 'boss-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())) with check (bucket_id = 'boss-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "boss_images_delete_master_only" on storage.objects for delete to authenticated using (bucket_id = 'boss-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

drop policy if exists "nikke_images_select_all" on storage.objects;
drop policy if exists "nikke_images_insert_master_only" on storage.objects;
drop policy if exists "nikke_images_update_master_only" on storage.objects;
drop policy if exists "nikke_images_delete_master_only" on storage.objects;

create policy "nikke_images_select_all" on storage.objects for select to anon, authenticated using (bucket_id = 'nikke-images');
create policy "nikke_images_insert_master_only" on storage.objects for insert to authenticated with check (bucket_id = 'nikke-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "nikke_images_update_master_only" on storage.objects for update to authenticated using (bucket_id = 'nikke-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())) with check (bucket_id = 'nikke-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "nikke_images_delete_master_only" on storage.objects for delete to authenticated using (bucket_id = 'nikke-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));

drop policy if exists "usage_board_images_select_all" on storage.objects;
drop policy if exists "usage_board_images_insert_master_only" on storage.objects;
drop policy if exists "usage_board_images_update_master_only" on storage.objects;
drop policy if exists "usage_board_images_delete_master_only" on storage.objects;

create policy "usage_board_images_select_all" on storage.objects for select to anon, authenticated using (bucket_id = 'usage-board-images');
create policy "usage_board_images_insert_master_only" on storage.objects for insert to authenticated with check (bucket_id = 'usage-board-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "usage_board_images_update_master_only" on storage.objects for update to authenticated using (bucket_id = 'usage-board-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid())) with check (bucket_id = 'usage-board-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
create policy "usage_board_images_delete_master_only" on storage.objects for delete to authenticated using (bucket_id = 'usage-board-images' and exists (select 1 from public.app_config where public.app_config.master_user_id = auth.uid()));
