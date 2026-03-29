"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createMatch,
  updateMatchStatus,
  deleteMatch,
  submitGameResult,
  deleteGameResult,
} from "../actions";
import { useToast } from "@/components/toast";
import type { Campaign, Chapter, StrikeTeam, Player, Match, GameResult } from "@/lib/types/database";

type StrikeTeamWithPlayers = StrikeTeam & {
  player1: Player | null;
  player2: Player | null;
};

type MatchWithTeams = Match & {
  team1: StrikeTeamWithPlayers | null;
  team2: StrikeTeamWithPlayers | null;
};

export default function AdminMatchmakingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [teams, setTeams] = useState<StrikeTeamWithPlayers[]>([]);
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [gameResults, setGameResults] = useState<(GameResult & { player: Player | null; opponent: Player | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [showSubmitResult, setShowSubmitResult] = useState<string | null>(null); // matchId
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { toast } = useToast();

  const supabase = createClient();

  async function loadInitial() {
    const { data: camps } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns((camps as Campaign[]) ?? []);
    if (camps && camps.length > 0) {
      setSelectedCampaignId(camps[0].id);
    }
    setLoading(false);
  }

  async function loadChapters(campaignId: string) {
    const [{ data: chaps }, { data: stTeams }] = await Promise.all([
      supabase.from("chapters").select("*").eq("campaign_id", campaignId).order("chapter_number"),
      supabase
        .from("strike_teams")
        .select("*, player1:players!strike_teams_player1_id_fkey(*), player2:players!strike_teams_player2_id_fkey(*)")
        .eq("campaign_id", campaignId)
        .order("name"),
    ]);
    setChapters((chaps as Chapter[]) ?? []);
    setTeams((stTeams ?? []) as StrikeTeamWithPlayers[]);

    // Auto-select active chapter
    const active = (chaps as Chapter[] | null)?.find((c) => c.is_active);
    if (active) {
      setSelectedChapterId(active.id);
    } else if (chaps && chaps.length > 0) {
      setSelectedChapterId(chaps[0].id);
    }
  }

  async function loadMatches(chapterId: string) {
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("created_at");

    const matchesWithTeams: MatchWithTeams[] = ((matchData as Match[]) ?? []).map((m) => ({
      ...m,
      team1: teams.find((t) => t.id === m.strike_team_1_id) ?? null,
      team2: teams.find((t) => t.id === m.strike_team_2_id) ?? null,
    }));
    setMatches(matchesWithTeams);

    // Load game results for this chapter
    const { data: results } = await supabase
      .from("game_results")
      .select("*, player:players!game_results_player_id_fkey(*), opponent:players!game_results_opponent_player_id_fkey(*)")
      .eq("chapter_id", chapterId)
      .order("submitted_at", { ascending: false });
    setGameResults((results ?? []) as (GameResult & { player: Player | null; opponent: Player | null })[]);
  }

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedCampaignId) {
      loadChapters(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    if (selectedChapterId && teams.length >= 0) {
      loadMatches(selectedChapterId);
    }
  }, [selectedChapterId, teams]);

  // Which teams are already matched in this chapter
  const matchedTeamIds = new Set(matches.flatMap((m) => [m.strike_team_1_id, m.strike_team_2_id]));
  const unmatchedTeams = teams.filter((t) => !matchedTeamIds.has(t.id));

  async function handleCreateMatch(formData: FormData) {
    formData.set("chapterId", selectedChapterId);
    formData.set("campaignId", selectedCampaignId);
    const result = await createMatch(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Match created");
      setShowCreateMatch(false);
      loadMatches(selectedChapterId);
    }
  }

  async function handleStatusChange(matchId: string, status: string) {
    const formData = new FormData();
    formData.set("id", matchId);
    formData.set("campaignId", selectedCampaignId);
    formData.set("status", status);
    const result = await updateMatchStatus(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast(`Match ${status}`);
      loadMatches(selectedChapterId);
    }
  }

  async function handleDeleteMatch(matchId: string) {
    const formData = new FormData();
    formData.set("id", matchId);
    formData.set("campaignId", selectedCampaignId);
    const result = await deleteMatch(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Match deleted");
      setDeleteConfirm(null);
      loadMatches(selectedChapterId);
    }
  }

  async function handleSubmitResult(formData: FormData) {
    formData.set("chapterId", selectedChapterId);
    formData.set("campaignId", selectedCampaignId);
    const result = await submitGameResult(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Game result submitted");
      setShowSubmitResult(null);
      loadMatches(selectedChapterId);
    }
  }

  async function handleDeleteResult(resultId: string) {
    const formData = new FormData();
    formData.set("id", resultId);
    formData.set("campaignId", selectedCampaignId);
    const result = await deleteGameResult(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Game result removed");
      loadMatches(selectedChapterId);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-2 h-2 bg-cyan rounded-full status-dot" />
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary ml-3">Loading...</span>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">No campaigns found.</p>
      </div>
    );
  }

  const selectedChapter = chapters.find((c) => c.id === selectedChapterId);

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      {/* Campaign + Chapter selectors */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label className="data-label font-[family-name:var(--font-mono)]">CAMPAIGN</label>
          <select
            value={selectedCampaignId}
            onChange={(e) => {
              setSelectedCampaignId(e.target.value);
              setShowCreateMatch(false);
            }}
            className="px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none cursor-pointer"
          >
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="data-label font-[family-name:var(--font-mono)]">CHAPTER</label>
          <select
            value={selectedChapterId}
            onChange={(e) => {
              setSelectedChapterId(e.target.value);
              setShowCreateMatch(false);
            }}
            className="px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none cursor-pointer"
          >
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                CH.{c.chapter_number} — {c.name}
                {c.is_active ? " (ACTIVE)" : c.is_completed ? " (DONE)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Match section */}
      <div className="panel p-6 mb-8">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-amber" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
              Matchups — {selectedChapter?.name ?? ""}
            </h2>
          </div>
          {unmatchedTeams.length >= 2 && (
            <button
              onClick={() => {
                setShowCreateMatch(!showCreateMatch);
              }}
              className="px-4 py-2 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
            >
              {showCreateMatch ? "Cancel" : "Create Match"}
            </button>
          )}
        </div>

        {/* Unmatched teams notice */}
        {unmatchedTeams.length > 0 && (
          <div className="mb-4 px-4 py-3 bg-amber/5 border border-amber-dim/20">
            <span className="font-[family-name:var(--font-mono)] text-xs text-amber uppercase tracking-wider">
              Unmatched Teams:{" "}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
              {unmatchedTeams.map((t) => t.name).join(", ")}
            </span>
          </div>
        )}

        {/* Create match form */}
        {showCreateMatch && (
          <form action={handleCreateMatch} className="mb-6 p-4 bg-surface/30 border border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">Team 1</label>
                <select
                  name="strikeTeam1Id"
                  required
                  className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none cursor-pointer"
                >
                  <option value="">Select team...</option>
                  {unmatchedTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.player1?.display_name} & {t.player2?.display_name})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">Team 2</label>
                <select
                  name="strikeTeam2Id"
                  required
                  className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none cursor-pointer"
                >
                  <option value="">Select team...</option>
                  {unmatchedTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.player1?.display_name} & {t.player2?.display_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
            >
              Create Match
            </button>
          </form>
        )}

        {/* Match list */}
        <div className="space-y-4">
          {matches.map((match) => {
            const statusColors = {
              scheduled: { bg: "bg-amber/10", border: "border-amber-dim/30", text: "text-amber" },
              in_progress: { bg: "bg-green/10", border: "border-green-dim/30", text: "text-green" },
              completed: { bg: "bg-cyan/10", border: "border-cyan-dim/30", text: "text-cyan" },
            };
            const sc = statusColors[match.status];

            // Get game results for players in this match
            const matchPlayerIds = [
              match.team1?.player1_id, match.team1?.player2_id,
              match.team2?.player1_id, match.team2?.player2_id,
            ].filter(Boolean);
            const matchResults = gameResults.filter((r) => matchPlayerIds.includes(r.player_id));

            return (
              <div key={match.id} className={`border ${sc.border} ${sc.bg} p-5`}>
                {/* Match header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 border ${sc.border} ${sc.text} font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase`}>
                      {match.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {match.status === "scheduled" && (
                      <button
                        onClick={() => handleStatusChange(match.id, "in_progress")}
                        className="px-3 py-1.5 border border-green-dim/40 text-green hover:bg-green/10 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Start
                      </button>
                    )}
                    {match.status === "in_progress" && (
                      <button
                        onClick={() => handleStatusChange(match.id, "completed")}
                        className="px-3 py-1.5 border border-cyan-dim/40 text-cyan hover:bg-cyan/10 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Complete
                      </button>
                    )}
                    {match.status !== "completed" && (
                      <button
                        onClick={() => setShowSubmitResult(showSubmitResult === match.id ? null : match.id)}
                        className="px-3 py-1.5 border border-amber-dim/40 text-amber hover:bg-amber/10 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Submit Result
                      </button>
                    )}
                    {deleteConfirm === match.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteMatch(match.id)}
                          className="px-3 py-1.5 bg-red/15 border border-red-dim text-red hover:bg-red/25 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 border border-border text-text-secondary font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(match.id)}
                        className="px-3 py-1.5 border border-border text-text-secondary hover:text-red hover:border-red-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Teams vs display */}
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-center">
                  <TeamCard team={match.team1} />
                  <div className="text-center">
                    <span className="font-[family-name:var(--font-orbitron)] text-lg text-text-muted tracking-wider">VS</span>
                  </div>
                  <TeamCard team={match.team2} />
                </div>

                {/* Game result submission form */}
                {showSubmitResult === match.id && (
                  <GameResultForm
                    match={match}
                    onSubmit={handleSubmitResult}
                    onCancel={() => setShowSubmitResult(null)}
                  />
                )}

                {/* Submitted results for this match */}
                {matchResults.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <div className="data-label font-[family-name:var(--font-mono)] mb-2">RESULTS</div>
                    <div className="space-y-2">
                      {matchResults.map((r) => (
                        <div key={r.id} className="flex items-center justify-between px-3 py-2 bg-surface/30 border border-border/30">
                          <div className="flex items-center gap-4">
                            <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">
                              {r.player?.display_name ?? "Unknown"}
                            </span>
                            <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                              vs {r.opponent?.display_name ?? "Unknown"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">{r.objective_points} OP</span>
                            <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">{r.tournament_points} TP</span>
                            <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">{r.xp_earned} XP</span>
                            <span className={`font-[family-name:var(--font-orbitron)] text-xs tracking-wider uppercase font-bold ${
                              r.result === "win" ? "text-green" : r.result === "lose" ? "text-red" : "text-amber"
                            }`}>
                              {r.result}
                            </span>
                            <button
                              onClick={() => handleDeleteResult(r.id)}
                              className="px-2 py-1 text-text-muted hover:text-red font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase transition-colors cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {matches.length === 0 && (
            <div className="text-center py-8">
              <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
                No matches scheduled for this chapter yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* All chapter results */}
      {gameResults.length > 0 && (
        <div className="panel p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-cyan" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
              All Results — {selectedChapter?.name ?? ""}
            </h2>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">
              {gameResults.length} result{gameResults.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Header */}
          <div className="hidden md:flex items-center px-4 py-2 mb-1">
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted flex-1">PLAYER</span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted flex-1">OPPONENT</span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-12 text-center">OP</span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-12 text-center">TP</span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-12 text-center">XP</span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-16 text-center">RESULT</span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-20 text-right">ACTIONS</span>
          </div>

          <div className="space-y-1">
            {gameResults.map((r) => (
              <div key={r.id} className="flex flex-col md:flex-row md:items-center px-4 py-3 bg-surface/30 border border-border/30 gap-2 md:gap-0">
                <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary flex-1">
                  {r.player?.display_name ?? "Unknown"}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary flex-1">
                  vs {r.opponent?.display_name ?? "Unknown"}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary w-12 text-center">{r.objective_points}</span>
                <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary w-12 text-center">{r.tournament_points}</span>
                <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary w-12 text-center">{r.xp_earned}</span>
                <span className={`font-[family-name:var(--font-orbitron)] text-xs tracking-wider uppercase font-bold w-16 text-center ${
                  r.result === "win" ? "text-green" : r.result === "lose" ? "text-red" : "text-amber"
                }`}>
                  {r.result}
                </span>
                <div className="w-20 flex justify-end">
                  <button
                    onClick={() => handleDeleteResult(r.id)}
                    className="px-2 py-1 border border-border text-text-muted hover:text-red hover:border-red-dim font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase transition-all cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team }: { team: StrikeTeamWithPlayers | null }) {
  if (!team) return <div className="text-text-muted">Unknown team</div>;
  return (
    <div className="p-3 bg-surface/30 border border-border/30">
      <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-text-primary mb-2">
        {team.name.toUpperCase()}
      </div>
      <div className="space-y-1">
        {[team.player1, team.player2].map((player, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-5 bg-surface-bright border border-border flex items-center justify-center shrink-0">
              <span className="font-[family-name:var(--font-mono)] text-[9px] text-text-secondary">
                {player?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">
              {player?.display_name ?? "Unknown"}
            </span>
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-muted">
              {player?.faction ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GameResultForm({
  match,
  onSubmit,
  onCancel,
}: {
  match: MatchWithTeams;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  // All 4 players from both teams
  const allPlayers = [
    match.team1?.player1, match.team1?.player2,
    match.team2?.player1, match.team2?.player2,
  ].filter((p): p is Player => p !== null && p !== undefined);

  const [playerId, setPlayerId] = useState("");
  const selectedPlayer = allPlayers.find((p) => p.id === playerId);

  // Opponent is anyone from the other team
  const playerTeam = match.team1?.player1_id === playerId || match.team1?.player2_id === playerId
    ? match.team1
    : match.team2;
  const opponentTeam = playerTeam === match.team1 ? match.team2 : match.team1;
  const opponents = [opponentTeam?.player1, opponentTeam?.player2].filter(
    (p): p is Player => p !== null && p !== undefined
  );

  return (
    <form action={onSubmit} className="mt-4 pt-4 border-t border-border/30 space-y-4">
      <div className="data-label font-[family-name:var(--font-mono)]">SUBMIT GAME RESULT</div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">Player *</label>
          <select
            name="playerId"
            required
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none cursor-pointer"
          >
            <option value="">Select player...</option>
            {allPlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">Opponent *</label>
          <select
            name="opponentPlayerId"
            required
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none cursor-pointer"
          >
            <option value="">Select opponent...</option>
            {opponents.map((p) => (
              <option key={p.id} value={p.id}>{p.display_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">Result *</label>
          <select
            name="result"
            required
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none cursor-pointer"
          >
            <option value="">Select...</option>
            <option value="win">Win</option>
            <option value="draw">Draw</option>
            <option value="lose">Lose</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">Objective Points (0-10)</label>
          <input
            name="objectivePoints"
            type="number"
            min={0}
            max={10}
            defaultValue={0}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">Army Survived %</label>
          <input
            name="armySurvived"
            type="number"
            min={0}
            max={100}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none"
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">Enemy Survived %</label>
          <input
            name="enemySurvived"
            type="number"
            min={0}
            max={100}
            className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none"
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-4 py-2 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          Submit Result
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-border text-text-secondary hover:text-text-primary font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
