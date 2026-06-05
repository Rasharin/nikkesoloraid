-- 80_recommendation_rank.sql
-- solo_raid_recommendations 테이블에 추천 제출 시점의 등수 스냅샷 컬럼 추가.
-- saved_rank      : 제출 시점 내 등수 (1위 = 1)
-- saved_rank_total: 제출 시점 총 참여자 수

alter table public.solo_raid_recommendations
  add column if not exists saved_rank       integer,
  add column if not exists saved_rank_total integer;
