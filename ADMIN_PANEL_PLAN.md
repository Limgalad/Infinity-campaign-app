# Admin Panel Plan — Infinity Campaign App

> Phased implementation plan for campaign administration features.
> Created: 2026-03-29

---

## Phase 0: Foundation — Wire Up Supabase & Admin Guard ✅ DONE

**Goal:** Replace all mock data with live Supabase queries and protect admin routes.

### Tasks
- [ ] Create data-fetching functions in `src/lib/supabase/queries.ts` for all tables (campaigns, chapters, players, strike teams, game results, standings)
- [ ] Replace mock data in `/dashboard`, `/campaigns`, `/campaigns/[id]` with live Supabase queries
- [ ] Add admin role check to middleware — new route group `/dashboard/admin/` blocked for non-admins
- [ ] Create admin layout with nav (separate from player dashboard)
- [ ] Add "Admin" link in sidebar (visible only to admin users)
- [ ] Promote Koen's account to `role: 'admin'` in Supabase
- [ ] Claim the seeded Red Lands campaign (`created_by` → Koen's user ID)

**Outcome:** App runs on real data. Admin routes are protected. Foundation for all admin features.

---

## Phase 1: Campaign & Chapter Management ✅ DONE

**Goal:** Admin can create/edit campaigns and manage chapters.

### Tasks
- [ ] **Campaign CRUD page** (`/dashboard/admin/campaigns`)
  - List all campaigns
  - Create new campaign (name, description, total chapters)
  - Edit campaign details
  - Delete campaign (with confirmation)
- [ ] **Chapter management** (`/dashboard/admin/campaigns/[id]/chapters`)
  - List all chapters for a campaign
  - Create/edit chapter (name, mission name, start date)
  - Toggle chapter status: upcoming → active → completed
  - Reset a chapter (clear all game results, XP, consumables for that chapter)
- [ ] Server actions for all mutations (`src/app/dashboard/admin/actions.ts`)

**Outcome:** Admin can set up and manage the campaign structure without touching Supabase directly.

---

## Phase 2: Player & Strike Team Management ✅ DONE

**Goal:** Admin can register players and assign them to strike teams.

### Tasks
- [ ] **Player management page** (`/dashboard/admin/players`)
  - List all registered players (name, faction, sectorial, role)
  - Edit player details (faction, sectorial, display name)
  - Promote/demote player role (player ↔ admin)
  - View player's campaign progression summary
- [ ] **Strike team management page** (`/dashboard/admin/strike-teams`)
  - List all strike teams with their players
  - Create new strike team: pick name + assign 2 players from dropdown
  - Edit strike team (rename, swap players)
  - Delete strike team
  - Visual indicator: unassigned players (not in any team)
- [ ] Validation: a player can only be in 1 strike team per campaign
- [ ] Server actions for player & strike team mutations

**Outcome:** Admin can onboard players and form strike teams for matchmaking.

---

## Phase 3: Matchmaking & Game Result Management ✅ DONE

**Goal:** Admin can pair strike teams for matches and manage game results.

### Tasks
- [ ] **Matchmaking page** (`/dashboard/admin/campaigns/[id]/matchmaking`)
  - Select active chapter
  - Drag-and-drop or select to pair strike teams against each other
  - Show which teams have already been paired / played
  - Generate round pairings (manual assignment)
  - Visual bracket/matchup display
- [ ] **New DB table: `matches`**
  ```sql
  matches (
    id uuid PK,
    chapter_id uuid FK → chapters,
    strike_team_1_id uuid FK → strike_teams,
    strike_team_2_id uuid FK → strike_teams,
    status: 'scheduled' | 'in_progress' | 'completed',
    created_at timestamp
  )
  ```
- [ ] **Game result submission** (player-facing, but admin can also submit/edit)
  - Link game results to a match
  - Both players in a match submit their results
  - Admin can confirm/override results
  - Auto-calculate: TP, XP earned, strike team bonus
- [ ] **Chapter results overview** — admin sees all game results for a chapter at a glance
- [ ] Server actions for match creation, result submission, result override

**Outcome:** Admin can organize matches, players submit results, XP flows automatically.

---

## Phase 4: Leaderboard & Standings ✅ DONE

**Goal:** Live leaderboard with multiple ranking views.

### Tasks
- [ ] **Leaderboard page** (player-facing: `/dashboard/campaigns/[id]/leaderboard`)
  - **Strike team standings**: ranked by total TP, then OP tiebreaker
  - **Individual player rankings**: by TP, XP earned, win rate
  - **Chapter-by-chapter breakdown**: results per chapter
  - Highlight current user's position
- [ ] **Leaderboard data queries**
  - Aggregate game_results by strike team → total TP, total OP
  - Aggregate by player → individual stats
  - Per-chapter breakdown
- [ ] **Admin leaderboard controls** (`/dashboard/admin/campaigns/[id]/standings`)
  - Manual TP adjustment (with reason logged to xp_ledger)
  - Recalculate standings from raw game results
  - Export standings (CSV or clipboard)
- [ ] Add leaderboard summary widget to campaign detail page
- [ ] Add leaderboard link to sidebar nav

**Outcome:** Players see live standings. Admin can adjust and export.

---

## Phase 5: Chapter Reset & Player Progression Admin ✅ DONE

**Goal:** Admin can manage per-player chapter state and progression.

### Tasks
- [ ] **Player chapter admin** (`/dashboard/admin/campaigns/[id]/players/[playerId]`)
  - View full progression: XP ledger, CEB purchases, commander level, spec-ops, consumables
  - Reset a specific chapter for a player:
    - Remove game results for that chapter
    - Reverse XP earned in that chapter (via xp_ledger)
    - Remove consumables purchased for that chapter
    - Remove CEB activations for that chapter
  - Manually adjust XP (add/deduct with reason)
  - Override commander promotion level
- [ ] **Bulk chapter reset** — reset an entire chapter for all players (e.g., chapter needs to be replayed)
- [ ] Confirmation dialogs for all destructive actions
- [ ] Audit log view — show xp_ledger entries with admin overrides highlighted

**Outcome:** Admin has full control over player progression with safe, auditable operations.

---

## Phase 6: Polish & Quality of Life ✅ DONE (core items)

**Goal:** Refinements across the admin and player experience.

### Tasks
- [x] Wire up chapter page with real Supabase data (replaced all mock data)
- [x] Player-facing actions: submit after-action report, CEB purchase, consumable purchase, promotion roll
- [x] Delete old `/my-sheet` route (replaced by combined chapter page)
- [x] **Notifications** — toast notification system (`src/components/toast.tsx`) replacing inline banners across all pages
- [x] **Real-time updates** — Supabase realtime subscriptions on leaderboard & campaign detail pages (auto-refresh on game result changes)
- [x] **Mobile responsive** — admin layout (stacking header, icon-only tabs on mobile), chapters page (wrapping action buttons), player progression page (responsive header, stats, actions)
- [ ] **Dashboard widgets** — campaign health: active players, pending results, chapter progress (deferred)
- [ ] **Bulk operations** — multi-select players for team assignment (deferred)
- [ ] **Campaign cloning** — duplicate a campaign structure for a new season (deferred)

**Outcome:** Polished, production-ready admin panel.

---

## Route Structure Summary

```
/dashboard/admin/                         → Admin overview
/dashboard/admin/campaigns/               → Campaign list & CRUD
/dashboard/admin/campaigns/[id]/chapters  → Chapter management
/dashboard/admin/campaigns/[id]/matchmaking → Pair strike teams
/dashboard/admin/campaigns/[id]/standings → Standings admin
/dashboard/admin/campaigns/[id]/players/[playerId] → Player progression admin
/dashboard/admin/players/                 → All players list
/dashboard/admin/strike-teams/            → Strike team management
```

---

## New Database Objects Needed

| Object | Phase | Purpose |
|--------|-------|---------|
| `matches` table | Phase 3 | Link strike team pairings to chapters |
| Admin RLS policies | Phase 0 | Allow admins full CRUD on all tables |
| `xp_ledger` admin entries | Phase 5 | Track admin overrides with source = 'admin_adjustment' |

---

## Dependencies Between Phases

```
Phase 0 (Foundation) ← required by all others
Phase 1 (Campaigns) ← required by Phase 3, 4, 5
Phase 2 (Players/Teams) ← required by Phase 3
Phase 3 (Matchmaking) ← required by Phase 4
Phase 4 (Leaderboard) — can start after Phase 3
Phase 5 (Chapter Reset) — can start after Phase 1
Phase 6 (Polish) — after all others
```
