import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCampaign,
  getChapters,
  getCampaignStandings,
  getPlayerRankings,
  getChapterBreakdowns,
  getCurrentPlayer,
} from "@/lib/supabase/queries";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = await getCampaign(campaignId);
  if (!campaign) notFound();

  const [standings, playerRankings, chapterBreakdowns, currentPlayer, chapters] = await Promise.all([
    getCampaignStandings(campaignId),
    getPlayerRankings(campaignId),
    getChapterBreakdowns(campaignId),
    getCurrentPlayer(),
    getChapters(campaignId),
  ]);

  const chapterIds = chapters.map((c) => c.id);

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      <RealtimeRefresh chapterIds={chapterIds} />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-amber" />
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-xl tracking-[0.15em] text-text-primary">
              LEADERBOARD
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-secondary tracking-wider mt-0.5">
              {campaign.name.toUpperCase()} // STANDINGS
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/campaigns/${campaignId}`}
          className="px-4 py-2 border border-border text-text-secondary hover:text-cyan hover:border-cyan-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all"
        >
          Back to Campaign
        </Link>
      </div>

      {/* Strike Team Standings */}
      <div className="panel p-6 mb-8">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
          <div className="w-1 h-5 bg-amber" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
            Strike Team Standings
          </h2>
        </div>

        {standings.length > 0 ? (
          <div className="space-y-2">
            {/* Header */}
            <div className="hidden md:flex items-center px-4 py-2">
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-10">#</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted flex-1">STRIKE TEAM</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-16 text-center">TP</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-16 text-center">OP</span>
            </div>

            {standings.map((team, i) => {
              const rankStyles = i === 0
                ? "bg-amber/5 border-amber-dim/20"
                : i === 1
                  ? "bg-surface/50 border-border/50"
                  : i === 2
                    ? "bg-surface/30 border-border/40"
                    : "bg-surface/20 border-border/30";

              return (
                <div
                  key={i}
                  className={`flex flex-col md:flex-row md:items-center px-4 py-4 border ${rankStyles} hover:border-border transition-colors gap-2 md:gap-0`}
                >
                  <span className={`font-[family-name:var(--font-orbitron)] text-lg w-10 ${
                    i === 0 ? "text-amber font-bold" : i === 1 ? "text-text-primary" : i === 2 ? "text-text-secondary" : "text-text-muted"
                  }`}>
                    {team.rank}
                  </span>
                  <div className="flex-1">
                    <div className="font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-text-primary">
                      {team.teamName.toUpperCase()}
                    </div>
                    <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary mt-0.5">
                      {team.player1Name} & {team.player2Name}
                    </div>
                  </div>
                  <span className={`font-[family-name:var(--font-mono)] text-xl font-bold w-16 text-center ${
                    i === 0 ? "text-amber" : "text-text-primary"
                  }`}>
                    {team.tp}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-sm w-16 text-center text-text-secondary">
                    {team.op}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
              No games played yet. Standings will appear after results are submitted.
            </p>
          </div>
        )}
      </div>

      {/* Individual Player Rankings */}
      <div className="panel p-6 mb-8">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
          <div className="w-1 h-5 bg-cyan" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
            Individual Rankings
          </h2>
        </div>

        {playerRankings.length > 0 ? (
          <>
            {/* Header */}
            <div className="hidden md:flex items-center px-4 py-2 mb-1">
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-8">#</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted flex-1">PLAYER</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-24">FACTION</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-12 text-center">TP</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-12 text-center">OP</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-12 text-center">XP</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-20 text-center">W/D/L</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-16 text-center">GAMES</span>
            </div>

            <div className="space-y-1">
              {playerRankings.map((p) => {
                const isCurrentPlayer = currentPlayer?.id === p.playerId;
                return (
                  <div
                    key={p.playerId}
                    className={`flex flex-col md:flex-row md:items-center px-4 py-3 border border-border/30 gap-1 md:gap-0 ${
                      isCurrentPlayer ? "bg-cyan/5 border-cyan-dim/20" : "bg-surface/20"
                    } hover:border-border transition-colors`}
                  >
                    <span className={`font-[family-name:var(--font-mono)] text-sm w-8 ${
                      p.rank === 1 ? "text-amber font-bold" : "text-text-secondary"
                    }`}>
                      {p.rank}
                    </span>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">
                        {p.displayName}
                      </span>
                      {isCurrentPlayer && (
                        <span className="px-1.5 py-0.5 bg-cyan/10 border border-cyan-dim/30 text-cyan font-[family-name:var(--font-mono)] text-[9px] tracking-wider uppercase">
                          You
                        </span>
                      )}
                    </div>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary w-24">
                      {p.faction ?? "—"}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-sm font-bold text-text-primary w-12 text-center">
                      {p.tp}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary w-12 text-center">
                      {p.op}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary w-12 text-center">
                      {p.xpEarned}
                    </span>
                    <div className="w-20 text-center">
                      <span className="font-[family-name:var(--font-mono)] text-xs">
                        <span className="text-green">{p.wins}</span>
                        <span className="text-text-muted">/</span>
                        <span className="text-amber">{p.draws}</span>
                        <span className="text-text-muted">/</span>
                        <span className="text-red">{p.losses}</span>
                      </span>
                    </div>
                    <span className="font-[family-name:var(--font-mono)] text-sm text-text-muted w-16 text-center">
                      {p.gamesPlayed}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
              No individual results yet.
            </p>
          </div>
        )}
      </div>

      {/* Chapter-by-Chapter Breakdown */}
      {chapterBreakdowns.length > 0 && (
        <div className="panel p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-green" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
              Chapter Breakdown
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {chapterBreakdowns.map((ch) => (
              <div key={ch.chapterNumber} className="border border-border/30 p-4">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/20">
                  <span className="font-[family-name:var(--font-orbitron)] text-xs text-cyan">
                    CH.{ch.chapterNumber}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                    {ch.chapterName}
                  </span>
                </div>

                {ch.teams.length > 0 ? (
                  <div className="space-y-1.5">
                    {ch.teams.map((t, i) => (
                      <div key={i} className="flex items-center justify-between px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-[family-name:var(--font-mono)] text-xs w-5 ${
                            i === 0 ? "text-amber font-bold" : "text-text-muted"
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">
                            {t.teamName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                            {t.tp} TP
                          </span>
                          <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">
                            {t.op} OP
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-[family-name:var(--font-mono)] text-xs text-text-muted text-center py-2">
                    No results
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
