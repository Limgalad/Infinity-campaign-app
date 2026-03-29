import { createClient } from "./server";
import type {
  Campaign,
  Chapter,
  Player,
  StrikeTeam,
  GameResult,
  XpLedgerEntry,
  CommandExperience,
  CebActivation,
  CommanderPromotion,
  PromotionRoll,
  SpecOps,
  Consumable,
} from "@/lib/types/database";

// ─── Auth & Player ──────────────────────────────────────────

export async function getCurrentPlayer(): Promise<Player | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("id", user.id)
    .single();
  return data as Player | null;
}

export async function getAllPlayers(): Promise<Player[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("*")
    .order("display_name");
  return (data as Player[]) ?? [];
}

// ─── Campaigns ──────────────────────────────────────────────

export async function getCampaigns(): Promise<Campaign[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as Campaign[]) ?? [];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .single();
  return data as Campaign | null;
}

// ─── Chapters ───────────────────────────────────────────────

export async function getChapters(campaignId: string): Promise<Chapter[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("chapter_number");
  return (data as Chapter[]) ?? [];
}

export async function getChapter(
  campaignId: string,
  chapterNumber: number
): Promise<Chapter | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chapters")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("chapter_number", chapterNumber)
    .single();
  return data as Chapter | null;
}

// ─── Strike Teams ───────────────────────────────────────────

export async function getStrikeTeams(campaignId: string): Promise<
  (StrikeTeam & { player1: Player | null; player2: Player | null })[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("strike_teams")
    .select("*, player1:players!strike_teams_player1_id_fkey(*), player2:players!strike_teams_player2_id_fkey(*)")
    .eq("campaign_id", campaignId)
    .order("name");
  return (data ?? []) as (StrikeTeam & {
    player1: Player | null;
    player2: Player | null;
  })[];
}

// ─── Game Results ───────────────────────────────────────────

export async function getGameResults(chapterId: string): Promise<GameResult[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_results")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("submitted_at", { ascending: false });
  return (data as GameResult[]) ?? [];
}

export async function getPlayerGameResults(
  playerId: string,
  campaignId: string
): Promise<(GameResult & { chapter: Chapter })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_results")
    .select("*, chapter:chapters!game_results_chapter_id_fkey(*)")
    .eq("player_id", playerId)
    .eq("chapter.campaign_id", campaignId)
    .order("submitted_at", { ascending: false });
  return (data ?? []) as (GameResult & { chapter: Chapter })[];
}

// ─── XP ─────────────────────────────────────────────────────

export async function getPlayerXpSummary(
  playerId: string,
  campaignId: string
): Promise<{ total: number; spent: number; available: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("xp_ledger")
    .select("amount")
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId);

  const entries = (data ?? []) as { amount: number }[];
  const total = entries
    .filter((e) => e.amount > 0)
    .reduce((sum, e) => sum + e.amount, 0);
  const spent = Math.abs(
    entries
      .filter((e) => e.amount < 0)
      .reduce((sum, e) => sum + e.amount, 0)
  );
  return { total, spent, available: total - spent };
}

export async function getXpLedger(
  playerId: string,
  campaignId: string
): Promise<XpLedgerEntry[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("xp_ledger")
    .select("*")
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  return (data as XpLedgerEntry[]) ?? [];
}

// ─── CEB ────────────────────────────────────────────────────

export async function getPlayerCeb(
  playerId: string,
  campaignId: string
): Promise<CommandExperience[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("command_experience")
    .select("*")
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId)
    .order("column_type")
    .order("level");
  return (data as CommandExperience[]) ?? [];
}

export async function getCebActivations(
  playerId: string,
  chapterId: string
): Promise<CebActivation[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ceb_activations")
    .select("*")
    .eq("player_id", playerId)
    .eq("chapter_id", chapterId);
  return (data as CebActivation[]) ?? [];
}

// ─── Commander Promotion ────────────────────────────────────

export async function getCommanderPromotion(
  playerId: string,
  campaignId: string
): Promise<CommanderPromotion | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("commander_promotions")
    .select("*")
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId)
    .single();
  return data as CommanderPromotion | null;
}

export async function getPromotionRolls(
  playerId: string,
  chapterId: string
): Promise<PromotionRoll[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("promotion_rolls")
    .select("*")
    .eq("player_id", playerId)
    .eq("chapter_id", chapterId)
    .order("created_at", { ascending: false });
  return (data as PromotionRoll[]) ?? [];
}

// ─── Spec-Ops ───────────────────────────────────────────────

export async function getPlayerSpecOps(
  playerId: string,
  campaignId: string
): Promise<SpecOps[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("spec_ops")
    .select("*")
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId)
    .order("created_at");
  return (data as SpecOps[]) ?? [];
}

// ─── Consumables ────────────────────────────────────────────

export async function getPlayerConsumables(
  playerId: string,
  chapterId: string
): Promise<Consumable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("consumables")
    .select("*")
    .eq("player_id", playerId)
    .eq("chapter_id", chapterId);
  return (data as Consumable[]) ?? [];
}

// ─── Standings ──────────────────────────────────────────────

export interface StandingEntry {
  rank: number;
  teamName: string;
  player1Name: string;
  player2Name: string;
  tp: number;
  op: number;
}

export async function getCampaignStandings(
  campaignId: string
): Promise<StandingEntry[]> {
  const supabase = await createClient();

  // Get all strike teams with player names
  const { data: teams } = await supabase
    .from("strike_teams")
    .select(
      "id, name, player1:players!strike_teams_player1_id_fkey(display_name), player2:players!strike_teams_player2_id_fkey(display_name), player1_id, player2_id"
    )
    .eq("campaign_id", campaignId);

  if (!teams || teams.length === 0) return [];

  // Get all chapters for this campaign
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id")
    .eq("campaign_id", campaignId);

  const chapterIds = (chapters ?? []).map((c: { id: string }) => c.id);
  if (chapterIds.length === 0) {
    return teams.map((t, i) => ({
      rank: i + 1,
      teamName: t.name,
      player1Name: (t.player1 as unknown as { display_name: string })?.display_name ?? "Unknown",
      player2Name: (t.player2 as unknown as { display_name: string })?.display_name ?? "Unknown",
      tp: 0,
      op: 0,
    }));
  }

  // Get all game results for these chapters
  const { data: results } = await supabase
    .from("game_results")
    .select("player_id, tournament_points, objective_points")
    .in("chapter_id", chapterIds);

  // Aggregate TP and OP per team
  const teamStats = new Map<string, { tp: number; op: number }>();
  for (const team of teams) {
    teamStats.set(team.id, { tp: 0, op: 0 });
  }

  for (const result of results ?? []) {
    const r = result as { player_id: string; tournament_points: number; objective_points: number };
    for (const team of teams) {
      if (r.player_id === team.player1_id || r.player_id === team.player2_id) {
        const stats = teamStats.get(team.id)!;
        stats.tp += r.tournament_points;
        stats.op += r.objective_points;
      }
    }
  }

  // Sort by TP desc, then OP desc
  const sorted = teams
    .map((t) => {
      const stats = teamStats.get(t.id)!;
      return {
        rank: 0,
        teamName: t.name,
        player1Name: (t.player1 as unknown as { display_name: string })?.display_name ?? "Unknown",
        player2Name: (t.player2 as unknown as { display_name: string })?.display_name ?? "Unknown",
        tp: stats.tp,
        op: stats.op,
      };
    })
    .sort((a, b) => b.tp - a.tp || b.op - a.op);

  sorted.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  return sorted;
}

// ─── Individual Player Rankings ─────────────────────────────

export interface PlayerRanking {
  rank: number;
  playerId: string;
  displayName: string;
  faction: string | null;
  tp: number;
  op: number;
  xpEarned: number;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
}

export async function getPlayerRankings(
  campaignId: string
): Promise<PlayerRanking[]> {
  const supabase = await createClient();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id")
    .eq("campaign_id", campaignId);
  const chapterIds = (chapters ?? []).map((c: { id: string }) => c.id);
  if (chapterIds.length === 0) return [];

  const [{ data: results }, { data: players }] = await Promise.all([
    supabase
      .from("game_results")
      .select("player_id, tournament_points, objective_points, xp_earned, result")
      .in("chapter_id", chapterIds),
    supabase.from("players").select("id, display_name, faction").order("display_name"),
  ]);

  const statsMap = new Map<string, { tp: number; op: number; xp: number; games: number; wins: number; draws: number; losses: number }>();

  for (const r of (results ?? []) as { player_id: string; tournament_points: number; objective_points: number; xp_earned: number; result: string }[]) {
    const s = statsMap.get(r.player_id) ?? { tp: 0, op: 0, xp: 0, games: 0, wins: 0, draws: 0, losses: 0 };
    s.tp += r.tournament_points;
    s.op += r.objective_points;
    s.xp += r.xp_earned;
    s.games += 1;
    if (r.result === "win") s.wins += 1;
    else if (r.result === "draw") s.draws += 1;
    else s.losses += 1;
    statsMap.set(r.player_id, s);
  }

  const playerMap = new Map((players ?? []).map((p: { id: string; display_name: string; faction: string | null }) => [p.id, p]));

  const rankings: PlayerRanking[] = Array.from(statsMap.entries())
    .map(([playerId, s]) => {
      const p = playerMap.get(playerId);
      return {
        rank: 0,
        playerId,
        displayName: p?.display_name ?? "Unknown",
        faction: p?.faction ?? null,
        tp: s.tp,
        op: s.op,
        xpEarned: s.xp,
        gamesPlayed: s.games,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
      };
    })
    .sort((a, b) => b.tp - a.tp || b.op - a.op);

  rankings.forEach((r, i) => { r.rank = i + 1; });
  return rankings;
}

// ─── Per-Chapter Breakdown ──────────────────────────────────

export interface ChapterBreakdown {
  chapterNumber: number;
  chapterName: string;
  teams: {
    teamName: string;
    tp: number;
    op: number;
  }[];
}

export async function getChapterBreakdowns(
  campaignId: string
): Promise<ChapterBreakdown[]> {
  const supabase = await createClient();

  const [{ data: chapters }, { data: teams }, { data: results }] = await Promise.all([
    supabase.from("chapters").select("*").eq("campaign_id", campaignId).order("chapter_number"),
    supabase
      .from("strike_teams")
      .select("id, name, player1_id, player2_id")
      .eq("campaign_id", campaignId),
    supabase
      .from("game_results")
      .select("chapter_id, player_id, tournament_points, objective_points")
      .in(
        "chapter_id",
        (await supabase.from("chapters").select("id").eq("campaign_id", campaignId)).data?.map((c: { id: string }) => c.id) ?? []
      ),
  ]);

  if (!chapters || !teams) return [];

  return chapters
    .filter((ch: { is_completed: boolean; is_active: boolean }) => ch.is_completed || ch.is_active)
    .map((ch: { id: string; chapter_number: number; name: string }) => {
      const chapterResults = (results ?? []).filter((r: { chapter_id: string }) => r.chapter_id === ch.id) as {
        player_id: string; tournament_points: number; objective_points: number;
      }[];

      const teamStats = teams.map((t: { id: string; name: string; player1_id: string; player2_id: string }) => {
        const teamResults = chapterResults.filter(
          (r) => r.player_id === t.player1_id || r.player_id === t.player2_id
        );
        return {
          teamName: t.name,
          tp: teamResults.reduce((sum, r) => sum + r.tournament_points, 0),
          op: teamResults.reduce((sum, r) => sum + r.objective_points, 0),
        };
      }).sort((a: { tp: number; op: number }, b: { tp: number; op: number }) => b.tp - a.tp || b.op - a.op);

      return {
        chapterNumber: ch.chapter_number,
        chapterName: ch.name,
        teams: teamStats,
      };
    });
}
