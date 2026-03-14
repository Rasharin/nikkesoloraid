alter table public.decks
  add column if not exists deck_key text;

create index if not exists decks_raid_key_deck_key_idx
  on public.decks (raid_key, deck_key);

update public.decks
set deck_key = (
  select string_agg(value, '|' order by value)
  from jsonb_array_elements_text(chars) as value
)
where deck_key is null
  and chars is not null;
