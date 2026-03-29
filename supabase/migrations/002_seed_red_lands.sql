-- Seed data for the Red Lands campaign
-- This creates the campaign and its 6 chapters

-- Note: This seed should be run after a campaign creator signs up.
-- For initial setup, we insert the campaign without a creator,
-- and the first admin user can claim it.

insert into campaigns (id, name, description, total_chapters)
values (
  '00000000-0000-0000-0000-000000000001',
  'Infinity Red Lands',
  'A 6-round Infinity N5 narrative campaign set on Planet Shinju. Strike Teams compete across chapters in the Shinju Deployment.',
  6
);

insert into chapters (campaign_id, chapter_number, name, mission_name, start_date, is_active, is_completed) values
  ('00000000-0000-0000-0000-000000000001', 1, 'Aggressive Recon', 'Aggressive Recon', '2026-02-16', false, true),
  ('00000000-0000-0000-0000-000000000001', 2, 'Proportional Response', 'Proportional Response / Now Get Away with It', '2026-03-30', true, false),
  ('00000000-0000-0000-0000-000000000001', 3, 'X Marks the Spot', 'X Marks the Spot', '2026-05-11', false, false),
  ('00000000-0000-0000-0000-000000000001', 4, 'Packing for the Trip', 'Packing for the Trip / We have Questions', '2026-06-22', false, false),
  ('00000000-0000-0000-0000-000000000001', 5, 'CLASSIFIED', null, '2026-08-10', false, false),
  ('00000000-0000-0000-0000-000000000001', 6, 'CLASSIFIED', null, '2026-09-21', false, false);
