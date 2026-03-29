-- Admin RLS Policies
-- Allow admin users full CRUD access to all campaign-related tables
-- Admin check: EXISTS (SELECT 1 FROM players WHERE id = auth.uid() AND role = 'admin')

-- Helper function to check admin status
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from players where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- Campaigns: admin can create, update, delete any campaign
create policy "campaigns_admin_insert" on campaigns for insert with check (is_admin());
create policy "campaigns_admin_update" on campaigns for update using (is_admin());
create policy "campaigns_admin_delete" on campaigns for delete using (is_admin());

-- Chapters: admin can manage all chapters
create policy "chapters_admin" on chapters for all using (is_admin());

-- Players: admin can update any player (role changes, faction edits)
create policy "players_admin_update" on players for update using (is_admin());

-- Strike teams: admin can create, update, delete any strike team
create policy "strike_teams_admin" on strike_teams for all using (is_admin());

-- Game results: admin can insert, update, delete any game result
create policy "game_results_admin" on game_results for all using (is_admin());

-- XP ledger: admin can insert entries (for adjustments/overrides)
create policy "xp_ledger_admin" on xp_ledger for insert with check (is_admin());
create policy "xp_ledger_admin_delete" on xp_ledger for delete using (is_admin());

-- CEB: admin can manage
create policy "ceb_admin" on command_experience for all using (is_admin());

-- CEB activations: admin can manage
create policy "ceb_act_admin" on ceb_activations for all using (is_admin());

-- Commander promotions: admin can manage
create policy "promo_admin" on commander_promotions for all using (is_admin());

-- Promotion rolls: admin can manage
create policy "promo_rolls_admin" on promotion_rolls for all using (is_admin());

-- Spec-ops: admin can manage
create policy "specops_admin" on spec_ops for all using (is_admin());

-- Consumables: admin can manage
create policy "consumables_admin" on consumables for all using (is_admin());

-- ============================================================
-- Promote your account to admin
-- ============================================================
-- To find your user ID, run in Supabase SQL Editor:
--   SELECT id, email FROM auth.users WHERE email = 'koendeurloo1987@gmail.com';
--
-- Then run (replace YOUR_USER_ID with the actual UUID):
--   UPDATE players SET role = 'admin' WHERE id = 'YOUR_USER_ID';
--   UPDATE campaigns SET created_by = 'YOUR_USER_ID' WHERE id = '00000000-0000-0000-0000-000000000001';
