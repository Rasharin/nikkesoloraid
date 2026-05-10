-- 00_common.sql
-- Shared extensions and enum types.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'element_type'
  ) then
    create type public.element_type as enum ('fire', 'water', 'electric', 'wind', 'iron');
  end if;

  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'nikke_role'
  ) then
    create type public.nikke_role as enum ('attacker', 'supporter', 'defender');
  end if;
end
$$;
