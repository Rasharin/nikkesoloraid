-- 130_nikke_secondary_element.sql
-- Optional secondary element for dual-element Nikkes.

alter table public.nikkes add column if not exists element2 public.element_type;

create index if not exists idx_nikkes_element2 on public.nikkes (element2);
