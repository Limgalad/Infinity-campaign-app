// Database types for the Infinity Campaign Tracker
// These mirror the Supabase schema

export type CebColumnType =
  | "mobile_reserve"
  | "logistical_support"
  | "military_intelligence"
  | "tech_support"
  | "recon_intel"
  | "dice_gods";

export type ConsumableType =
  | "reinforcements"
  | "emergency_medical"
  | "emergency_tech"
  | "emergency_ordinance"
  | "move_up"
  | "defensive_measures";

export type GameResultType = "win" | "draw" | "lose";
export type PlayerRole = "player" | "admin";
export type XpSource =
  | "game"
  | "donation_received"
  | "donation_given"
  | "ceb_purchase"
  | "consumable_purchase"
  | "specops_upgrade";

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  total_chapters: number;
  created_by: string | null;
  created_at: string;
}

export interface Chapter {
  id: string;
  campaign_id: string;
  chapter_number: number;
  name: string;
  mission_name: string | null;
  start_date: string | null;
  is_active: boolean;
  is_completed: boolean;
}

export interface Player {
  id: string;
  display_name: string;
  faction: string | null;
  sectorial: string | null;
  avatar_url: string | null;
  role: PlayerRole;
  created_at: string;
}

export interface StrikeTeam {
  id: string;
  campaign_id: string;
  name: string;
  player1_id: string;
  player2_id: string;
  created_at: string;
}

export interface GameResult {
  id: string;
  chapter_id: string;
  player_id: string;
  opponent_player_id: string | null;
  objective_points: number;
  army_points_remaining: number | null;
  army_percentage_survived: number | null;
  enemy_percentage_survived: number | null;
  result: GameResultType;
  tournament_points: number;
  xp_earned: number;
  confirmed_by_opponent: boolean;
  submitted_at: string;
}

export interface XpLedgerEntry {
  id: string;
  player_id: string;
  campaign_id: string;
  chapter_id: string;
  source: XpSource;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface CommandExperience {
  id: string;
  player_id: string;
  campaign_id: string;
  column_type: CebColumnType;
  level: number;
  xp_cost: number;
  purchased_in_chapter: number;
  created_at: string;
}

export interface CebActivation {
  id: string;
  player_id: string;
  chapter_id: string;
  column_type: CebColumnType;
  active_level: number;
}

export interface CommanderPromotion {
  id: string;
  player_id: string;
  campaign_id: string;
  current_level: number;
}

export interface PromotionRoll {
  id: string;
  player_id: string;
  chapter_id: string;
  target_number: number;
  roll_result: number;
  modifiers: Record<string, unknown>;
  success: boolean;
  promoted_to_level: number | null;
  created_at: string;
}

export interface SpecOpsUpgrade {
  type: "stat" | "weapon" | "skill" | "equipment";
  name: string;
  xp_cost: number;
  chapter_purchased: number;
}

export interface SpecOps {
  id: string;
  player_id: string;
  campaign_id: string;
  unit_name: string;
  base_profile: Record<string, unknown>;
  total_xp_spent: number;
  upgrades: SpecOpsUpgrade[];
  created_at: string;
  updated_at: string;
}

export type MatchStatus = "scheduled" | "in_progress" | "completed";

export interface Match {
  id: string;
  chapter_id: string;
  strike_team_1_id: string;
  strike_team_2_id: string;
  status: MatchStatus;
  created_at: string;
}

export interface Consumable {
  id: string;
  player_id: string;
  chapter_id: string;
  consumable_type: ConsumableType;
  xp_cost: number;
  used: boolean;
  target_units: unknown[] | null;
  created_at: string;
}
