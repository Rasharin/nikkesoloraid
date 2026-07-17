-- Preserve the exact deck composition and score shown in moderation notices.

alter table public.recommendation_moderation_notices
  add column if not exists deck_chars text[],
  add column if not exists deck_score bigint;

