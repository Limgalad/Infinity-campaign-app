import Link from "next/link";
import { getCurrentPlayer } from "@/lib/supabase/queries";
import { getCampaigns, getChapters, getCampaignStandings, getPlayerXpSummary, getCommanderPromotion, getPlayerGameResults } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const player = await getCurrentPlayer();
  const campaigns = await getCampaigns();
  const campaign = campaigns[0]; // Primary active campaign

  let chapters: { number: number; name: string; status: "completed" | "active" | "upcoming" | "locked" }[] = [];
  let playerStats = { totalXP: 0, spentXP: 0, availableXP: 0, commanderLevel: 0, tournamentPoints: 0 };
  let recentResults: { chapter: number; opponent: string; result: "win" | "draw" | "lose"; op: number; tp: number }[] = [];
  let activeMatch: {
    chapterNumber: number;
    chapterName: string;
    status: string;
    yourTeam: { name: string; player1: string; player2: string; faction1: string | null; faction2: string | null };
    opponentTeam: { name: string; player1: string; player2: string; faction1: string | null; faction2: string | null };
  } | null = null;

  if (campaign) {
    const rawChapters = await getChapters(campaign.id);
    chapters = rawChapters.map((ch) => ({
      number: ch.chapter_number,
      name: ch.name,
      status: ch.is_completed ? "completed" : ch.is_active ? "active" : "upcoming",
    }));

    if (player) {
      const xp = await getPlayerXpSummary(player.id, campaign.id);
      const promotion = await getCommanderPromotion(player.id, campaign.id);
      const gameResults = await getPlayerGameResults(player.id, campaign.id);

      const totalTp = gameResults.reduce((sum, r) => sum + r.tournament_points, 0);

      playerStats = {
        totalXP: xp.total,
        spentXP: xp.spent,
        availableXP: xp.available,
        commanderLevel: promotion?.current_level ?? 0,
        tournamentPoints: totalTp,
      };

      // Get all players for opponent names
      const { getAllPlayers } = await import("@/lib/supabase/queries");
      const allPlayers = await getAllPlayers();
      const playerMap = new Map(allPlayers.map((p) => [p.id, p.display_name]));

      recentResults = gameResults.slice(0, 5).map((r) => ({
        chapter: r.chapter?.chapter_number ?? 0,
        opponent: playerMap.get(r.opponent_player_id ?? "") ?? "Unknown",
        result: r.result,
        op: r.objective_points,
        tp: r.tournament_points,
      }));

      // Load active match for active chapter
      const activeChapter = rawChapters.find((ch) => ch.is_active);
      if (activeChapter) {
        const supabase = await createClient();

        // Find player's strike team
        const { data: playerTeams } = await supabase
          .from("strike_teams")
          .select("*, player1:players!strike_teams_player1_id_fkey(display_name, faction), player2:players!strike_teams_player2_id_fkey(display_name, faction)")
          .eq("campaign_id", campaign.id)
          .or(`player1_id.eq.${player.id},player2_id.eq.${player.id}`);

        if (playerTeams && playerTeams.length > 0) {
          const myTeam = playerTeams[0];

          // Find match for this chapter
          const { data: allMatches } = await supabase
            .from("matches")
            .select("*")
            .eq("chapter_id", activeChapter.id);

          const myMatch = (allMatches ?? []).find(
            (m: { strike_team_1_id: string; strike_team_2_id: string }) =>
              m.strike_team_1_id === myTeam.id || m.strike_team_2_id === myTeam.id
          );

          if (myMatch) {
            const opponentTeamId = myMatch.strike_team_1_id === myTeam.id
              ? myMatch.strike_team_2_id
              : myMatch.strike_team_1_id;

            const { data: oppTeam } = await supabase
              .from("strike_teams")
              .select("*, player1:players!strike_teams_player1_id_fkey(display_name, faction), player2:players!strike_teams_player2_id_fkey(display_name, faction)")
              .eq("id", opponentTeamId)
              .single();

            const p1 = myTeam.player1 as unknown as { display_name: string; faction: string | null } | null;
            const p2 = myTeam.player2 as unknown as { display_name: string; faction: string | null } | null;
            const o1 = oppTeam?.player1 as unknown as { display_name: string; faction: string | null } | null;
            const o2 = oppTeam?.player2 as unknown as { display_name: string; faction: string | null } | null;

            activeMatch = {
              chapterNumber: activeChapter.chapter_number,
              chapterName: activeChapter.name,
              status: myMatch.status,
              yourTeam: {
                name: myTeam.name,
                player1: p1?.display_name ?? "Unknown",
                player2: p2?.display_name ?? "Unknown",
                faction1: p1?.faction ?? null,
                faction2: p2?.faction ?? null,
              },
              opponentTeam: {
                name: oppTeam?.name ?? "Unknown",
                player1: o1?.display_name ?? "Unknown",
                player2: o2?.display_name ?? "Unknown",
                faction1: o1?.faction ?? null,
                faction2: o2?.faction ?? null,
              },
            };
          }
        }
      }
    }
  }

  const currentChapter = chapters.find((ch) => ch.status === "active")?.number ?? 1;

  const resultColors = {
    win: "text-green",
    draw: "text-amber",
    lose: "text-red",
  };

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-cyan" />
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl tracking-[0.15em] text-text-primary">
            COMMAND CENTER
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-sm text-text-secondary tracking-wider mt-0.5">
            OPERATIONAL OVERVIEW // {new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }).toUpperCase()}
          </p>
        </div>
      </div>

      {campaign ? (
        <>
          {/* Active campaign banner */}
          <div className="panel panel-glow p-6 mb-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="data-label font-[family-name:var(--font-mono)] mb-1">ACTIVE CAMPAIGN</div>
                <h2 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-text-primary">
                  {campaign.name.toUpperCase()}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan/10 border border-cyan-dim/30 text-cyan font-[family-name:var(--font-mono)] text-xs">
                    <span className="w-1.5 h-1.5 bg-cyan rounded-full status-dot" />
                    CH.{currentChapter} ACTIVE
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary">
                    {chapters[currentChapter - 1]?.name ?? ""}
                  </span>
                </div>
              </div>
              <Link
                href={`/dashboard/campaigns/${campaign.id}`}
                className="px-5 py-2.5 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan hover:text-glow hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] font-[family-name:var(--font-mono)] text-sm tracking-wider uppercase transition-all"
              >
                View Campaign
              </Link>
            </div>

            {/* Chapter progress bar */}
            <div className="mt-5 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                {chapters.map((chapter) => {
                  const isCompleted = chapter.status === "completed";
                  const isActive = chapter.status === "active";
                  const isClickable = isCompleted || isActive;

                  const inner = (
                    <div className="flex-1 flex flex-col items-center gap-1.5">
                      <div
                        className={`w-full h-2 ${
                          isCompleted
                            ? "bg-cyan"
                            : isActive
                              ? "bg-cyan/40"
                              : "bg-surface-bright"
                        } transition-colors`}
                      />
                      <span
                        className={`font-[family-name:var(--font-mono)] text-xs ${
                          isActive ? "text-cyan font-bold" : isCompleted ? "text-text-primary" : "text-text-muted"
                        }`}
                      >
                        CH.{chapter.number}
                      </span>
                      <span
                        className={`font-[family-name:var(--font-mono)] text-[11px] leading-tight text-center ${
                          isActive ? "text-cyan/80" : isCompleted ? "text-text-secondary" : "text-text-muted/60"
                        }`}
                      >
                        {chapter.name}
                      </span>
                    </div>
                  );

                  return isClickable ? (
                    <Link
                      key={chapter.number}
                      href={`/dashboard/campaigns/${campaign.id}/chapters/${chapter.number}`}
                      className="flex-1 hover:opacity-80 transition-opacity"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div key={chapter.number} className="flex-1 cursor-not-allowed">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: "TOTAL XP", value: playerStats.totalXP, color: "text-cyan" },
              { label: "AVAILABLE XP", value: playerStats.availableXP, color: "text-green" },
              { label: "CMD LEVEL", value: playerStats.commanderLevel, color: "text-amber" },
              { label: "TOURNAMENT PTS", value: playerStats.tournamentPoints, color: "text-text-primary" },
            ].map((stat) => (
              <div key={stat.label} className="panel p-4">
                <div className="data-label font-[family-name:var(--font-mono)] mb-2">{stat.label}</div>
                <div className={`font-[family-name:var(--font-mono)] text-3xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Active match */}
          {activeMatch && (
            <Link
              href={`/dashboard/campaigns/${campaign.id}/chapters/${activeMatch.chapterNumber}`}
              className="block panel panel-glow p-5 mb-8 border-amber-dim/40 hover:border-amber transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
                <div className="w-1 h-5 bg-amber" />
                <h3 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
                  Your Match — CH.{activeMatch.chapterNumber}
                </h3>
                <span className={`ml-auto inline-flex items-center px-2 py-0.5 border font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase ${
                  activeMatch.status === "completed"
                    ? "border-cyan-dim/30 text-cyan"
                    : activeMatch.status === "in_progress"
                      ? "border-green-dim/30 text-green"
                      : "border-amber-dim/30 text-amber"
                }`}>
                  {activeMatch.status.replace("_", " ")}
                </span>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                {/* Your team */}
                <div className="p-3 bg-surface/30 border border-cyan-dim/20">
                  <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-cyan mb-2">
                    {activeMatch.yourTeam.name.toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-cyan rounded-full shrink-0" />
                      <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{activeMatch.yourTeam.player1}</span>
                      {activeMatch.yourTeam.faction1 && (
                        <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-muted">{activeMatch.yourTeam.faction1}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-cyan rounded-full shrink-0" />
                      <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{activeMatch.yourTeam.player2}</span>
                      {activeMatch.yourTeam.faction2 && (
                        <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-muted">{activeMatch.yourTeam.faction2}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* VS */}
                <div className="text-center">
                  <span className="font-[family-name:var(--font-orbitron)] text-lg text-text-muted tracking-wider">VS</span>
                </div>

                {/* Opponent team */}
                <div className="p-3 bg-surface/30 border border-red-dim/20">
                  <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-red mb-2">
                    {activeMatch.opponentTeam.name.toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red rounded-full shrink-0" />
                      <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{activeMatch.opponentTeam.player1}</span>
                      {activeMatch.opponentTeam.faction1 && (
                        <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-muted">{activeMatch.opponentTeam.faction1}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red rounded-full shrink-0" />
                      <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{activeMatch.opponentTeam.player2}</span>
                      {activeMatch.opponentTeam.faction2 && (
                        <span className="font-[family-name:var(--font-mono)] text-[10px] text-text-muted">{activeMatch.opponentTeam.faction2}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-end">
                <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted group-hover:text-cyan transition-colors tracking-wider uppercase">
                  Open Campaign Sheet →
                </span>
              </div>
            </Link>
          )}

          {/* Recent results */}
          <div className="panel p-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
              <div className="w-1 h-5 bg-amber" />
              <h3 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
                Recent After-Action Reports
              </h3>
            </div>

            {recentResults.length > 0 ? (
              <div className="space-y-3">
                {recentResults.map((result, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 bg-surface/50 border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary w-12">
                        CH.{result.chapter}
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">
                        vs {result.opponent}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary">
                        {result.op} OP
                      </span>
                      <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary">
                        {result.tp} TP
                      </span>
                      <span
                        className={`font-[family-name:var(--font-orbitron)] text-sm tracking-wider uppercase font-bold ${resultColors[result.result]}`}
                      >
                        {result.result}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
                  No game results yet. Play your first game to see reports here.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="panel p-8 text-center">
          <p className="font-[family-name:var(--font-mono)] text-sm text-text-secondary">
            No active campaigns. Join or create a campaign to get started.
          </p>
        </div>
      )}
    </div>
  );
}
