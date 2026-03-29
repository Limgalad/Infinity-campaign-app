-- ============================================================
-- MATCHES TABLE
-- Pairs strike teams for matchmaking within a chapter
-- ============================================================

create table matches (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  strike_team_1_id uuid not null references strike_teams(id) on delete cascade,
  strike_team_2_id uuid not null references strike_teams(id) on delete cascade,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  created_at timestamptz not null default now(),
  -- Prevent duplicate pairings in same chapter
  unique (chapter_id, strike_team_1_id, strike_team_2_id),
  -- A team can't play itself
  check (strike_team_1_id <> strike_team_2_id)
);

-- RLS
alter table matches enable row level security;

-- Anyone can read matches
create policy "matches_read" on matches for select using (true);

-- Admin can manage all matches
create policy "matches_admin" on matches for all using (is_admin());
