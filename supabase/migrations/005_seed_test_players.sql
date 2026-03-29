-- Seed test players and strike teams for development/testing
-- Creates dummy auth.users entries first (required FK), then players and teams.
-- These users have no real credentials — they're just for testing admin features.

-- Step 1: Create dummy auth users
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token)
values
  ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ghost.wolf@test.local', '', now(), now(), now(), '', ''),
  ('11111111-1111-1111-1111-111111111102', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'iron.hawk@test.local', '', now(), now(), now(), '', ''),
  ('11111111-1111-1111-1111-111111111103', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'night.blade@test.local', '', now(), now(), now(), '', ''),
  ('11111111-1111-1111-1111-111111111104', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'storm.eye@test.local', '', now(), now(), now(), '', ''),
  ('11111111-1111-1111-1111-111111111105', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commander.k@test.local', '', now(), now(), now(), '', ''),
  ('11111111-1111-1111-1111-111111111106', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nova.strike@test.local', '', now(), now(), now(), '', ''),
  ('11111111-1111-1111-1111-111111111107', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'zero.point@test.local', '', now(), now(), now(), '', ''),
  ('11111111-1111-1111-1111-111111111108', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dark.matter@test.local', '', now(), now(), now(), '', '')
on conflict (id) do nothing;

-- Step 2: Create player profiles
insert into players (id, display_name, faction, sectorial, role) values
  ('11111111-1111-1111-1111-111111111101', 'Ghost Wolf', 'Nomads', 'Corregidor', 'player'),
  ('11111111-1111-1111-1111-111111111102', 'Iron Hawk', 'PanOceania', 'Military Orders', 'player'),
  ('11111111-1111-1111-1111-111111111103', 'Night Blade', 'Yu Jing', 'Imperial Service', 'player'),
  ('11111111-1111-1111-1111-111111111104', 'Storm Eye', 'Ariadna', 'Caledonian', 'player'),
  ('11111111-1111-1111-1111-111111111105', 'Commander K', 'Combined Army', 'Onyx Contact Force', 'player'),
  ('11111111-1111-1111-1111-111111111106', 'Nova Strike', 'Haqqislam', 'Hassassin Bahram', 'player'),
  ('11111111-1111-1111-1111-111111111107', 'Zero Point', 'ALEPH', 'Steel Phalanx', 'player'),
  ('11111111-1111-1111-1111-111111111108', 'Dark Matter', 'O-12', null, 'player')
on conflict (id) do nothing;

-- Step 3: Create strike teams
insert into strike_teams (campaign_id, name, player1_id, player2_id) values
  ('00000000-0000-0000-0000-000000000001', 'Crimson Vipers',  '11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111102'),
  ('00000000-0000-0000-0000-000000000001', 'Shadow Protocol', '11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111104'),
  ('00000000-0000-0000-0000-000000000001', 'Steel Phoenix',   '11111111-1111-1111-1111-111111111105', '11111111-1111-1111-1111-111111111106'),
  ('00000000-0000-0000-0000-000000000001', 'Void Walkers',    '11111111-1111-1111-1111-111111111107', '11111111-1111-1111-1111-111111111108')
on conflict do nothing;
