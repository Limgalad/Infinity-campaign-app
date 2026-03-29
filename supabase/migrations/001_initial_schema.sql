-- Infinity Campaign Tracker - Initial Schema
-- Based on Red Lands campaign rules (Shinju Deployment NC78)

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- CAMPAIGNS
-- ============================================================
create table campaigns (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  total_chapters int not null default 6,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- CHAPTERS
-- ============================================================
create table chapters (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  chapter_number int not null,
  name text not null,
  mission_name text,
  start_date date,
  is_active boolean not null default false,
  is_completed boolean not null default false,
  unique (campaign_id, chapter_number)
);

-- ============================================================
-- PLAYERS (extends auth.users)
-- ============================================================
create table players (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  faction text,
  sectorial text,
  avatar_url text,
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- STRIKE TEAMS (2-player teams)
-- ============================================================
create table strike_teams (
  id uuid primary key default uuid_generate_v4(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  name text not null,
  player1_id uuid not null references players(id) on delete cascade,
  player2_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (player1_id != player2_id)
);

-- ============================================================
-- GAME RESULTS
-- ============================================================
create table game_results (
  id uuid primary key default uuid_generate_v4(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  opponent_player_id uuid references players(id) on delete set null,
  objective_points int not null default 0 check (objective_points >= 0 and objective_points <= 10),
  army_points_remaining int,
  army_percentage_survived int check (army_percentage_survived >= 0 and army_percentage_survived <= 100),
  enemy_percentage_survived int check (enemy_percentage_survived >= 0 and enemy_percentage_survived <= 100),
  result text not null check (result in ('win', 'draw', 'lose')),
  tournament_points int not null generated always as (
    case result
      when 'win' then 3
      when 'draw' then 2
      when 'lose' then 1
    end
  ) stored,
  xp_earned int not null default 0,
  confirmed_by_opponent boolean not null default false,
  submitted_at timestamptz not null default now(),
  unique (chapter_id, player_id)
);

-- ============================================================
-- XP LEDGER (audit trail for all XP transactions)
-- ============================================================
create table xp_ledger (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  source text not null check (source in ('game', 'donation_received', 'donation_given', 'ceb_purchase', 'consumable_purchase', 'specops_upgrade')),
  amount int not null, -- negative for spending
  description text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- COMMAND EXPERIENCE (CEB) - 6 columns x 5 levels
-- ============================================================
create table command_experience (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  column_type text not null check (column_type in (
    'mobile_reserve', 'logistical_support', 'military_intelligence',
    'tech_support', 'recon_intel', 'dice_gods'
  )),
  level int not null check (level >= 1 and level <= 5),
  xp_cost int not null,
  purchased_in_chapter int not null,
  created_at timestamptz not null default now(),
  unique (player_id, campaign_id, column_type, level)
);

-- ============================================================
-- CEB ACTIVATION (which bonuses are active per chapter)
-- ============================================================
create table ceb_activations (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  column_type text not null check (column_type in (
    'mobile_reserve', 'logistical_support', 'military_intelligence',
    'tech_support', 'recon_intel', 'dice_gods'
  )),
  active_level int not null check (active_level >= 1 and active_level <= 5),
  unique (player_id, chapter_id, column_type)
);

-- ============================================================
-- COMMANDER PROMOTION (level 0-5)
-- ============================================================
create table commander_promotions (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  current_level int not null default 0 check (current_level >= 0 and current_level <= 5),
  unique (player_id, campaign_id)
);

-- ============================================================
-- PROMOTION ROLL LOG
-- ============================================================
create table promotion_rolls (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  target_number int not null,
  roll_result int not null check (roll_result >= 1 and roll_result <= 20),
  modifiers jsonb not null default '{}',
  success boolean not null,
  promoted_to_level int,
  created_at timestamptz not null default now(),
  unique (player_id, chapter_id)
);

-- ============================================================
-- SPEC-OPS (single veteran unit per player)
-- ============================================================
create table spec_ops (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id) on delete cascade,
  campaign_id uuid not null references campaigns(id) on delete cascade,
  unit_name text not null,
  base_profile jsonb not null default '{}',
  total_xp_spent int not null default 3, -- starts with 3 XP
  upgrades jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, campaign_id)
);

-- ============================================================
-- CONSUMABLES (one-time chapter buffs)
-- ============================================================
create table consumables (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id) on delete cascade,
  chapter_id uuid not null references chapters(id) on delete cascade,
  consumable_type text not null check (consumable_type in (
    'reinforcements', 'emergency_medical', 'emergency_tech',
    'emergency_ordinance', 'move_up', 'defensive_measures'
  )),
  xp_cost int not null check (xp_cost in (2, 4)),
  used boolean not null default false,
  target_units jsonb,
  created_at timestamptz not null default now(),
  unique (player_id, chapter_id, consumable_type)
);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
alter table campaigns enable row level security;
alter table chapters enable row level security;
alter table players enable row level security;
alter table strike_teams enable row level security;
alter table game_results enable row level security;
alter table xp_ledger enable row level security;
alter table command_experience enable row level security;
alter table ceb_activations enable row level security;
alter table commander_promotions enable row level security;
alter table promotion_rolls enable row level security;
alter table spec_ops enable row level security;
alter table consumables enable row level security;

-- Campaigns: anyone can read, creators can update
create policy "campaigns_read" on campaigns for select using (true);
create policy "campaigns_insert" on campaigns for insert with check (auth.uid() = created_by);
create policy "campaigns_update" on campaigns for update using (auth.uid() = created_by);

-- Chapters: anyone can read, campaign creator can manage
create policy "chapters_read" on chapters for select using (true);
create policy "chapters_manage" on chapters for all using (
  exists (select 1 from campaigns where campaigns.id = chapters.campaign_id and campaigns.created_by = auth.uid())
);

-- Players: anyone can read, own profile only for write
create policy "players_read" on players for select using (true);
create policy "players_own" on players for insert with check (auth.uid() = id);
create policy "players_update" on players for update using (auth.uid() = id);

-- Strike Teams: anyone in campaign can read
create policy "strike_teams_read" on strike_teams for select using (true);
create policy "strike_teams_insert" on strike_teams for insert with check (
  auth.uid() = player1_id or auth.uid() = player2_id
);

-- Game Results: anyone can read, own results for write
create policy "game_results_read" on game_results for select using (true);
create policy "game_results_own" on game_results for insert with check (auth.uid() = player_id);
create policy "game_results_update" on game_results for update using (auth.uid() = player_id);

-- XP Ledger: anyone can read, own entries for write
create policy "xp_ledger_read" on xp_ledger for select using (true);
create policy "xp_ledger_own" on xp_ledger for insert with check (auth.uid() = player_id);

-- Progression tables: anyone can read, own data for write
create policy "ceb_read" on command_experience for select using (true);
create policy "ceb_own" on command_experience for insert with check (auth.uid() = player_id);

create policy "ceb_act_read" on ceb_activations for select using (true);
create policy "ceb_act_own" on ceb_activations for all using (auth.uid() = player_id);

create policy "promo_read" on commander_promotions for select using (true);
create policy "promo_own" on commander_promotions for all using (auth.uid() = player_id);

create policy "promo_rolls_read" on promotion_rolls for select using (true);
create policy "promo_rolls_own" on promotion_rolls for insert with check (auth.uid() = player_id);

create policy "specops_read" on spec_ops for select using (true);
create policy "specops_own" on spec_ops for all using (auth.uid() = player_id);

create policy "consumables_read" on consumables for select using (true);
create policy "consumables_own" on consumables for all using (auth.uid() = player_id);
