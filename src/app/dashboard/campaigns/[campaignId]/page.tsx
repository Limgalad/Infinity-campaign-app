import Link from "next/link";
import { getCampaign, getChapters, getCampaignStandings, getStrikeTeams } from "@/lib/supabase/queries";
import { notFound } from "next/navigation";
import { RealtimeRefresh } from "@/components/realtime-refresh";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const campaign = await getCampaign(campaignId);
  if (!campaign) notFound();

  const [chapters, standings, strikeTeams] = await Promise.all([
    getChapters(campaignId),
    getCampaignStandings(campaignId),
    getStrikeTeams(campaignId),
  ]);

  const chapterData = chapters.map((ch) => ({
    number: ch.chapter_number,
    name: ch.name,
    date: ch.start_date
      ? new Date(ch.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "TBD",
    status: (ch.is_completed ? "completed" : ch.is_active ? "active" : "upcoming") as
      | "completed"
      | "active"
      | "upcoming"
      | "locked",
  }));

  const statusStyles = {
    completed: { bg: "bg-cyan/10", border: "border-cyan-dim/30", text: "text-cyan", dot: "bg-cyan" },
    active: { bg: "bg-green/10", border: "border-green-dim/30", text: "text-green", dot: "bg-green" },
    upcoming: { bg: "bg-amber/10", border: "border-amber-dim/30", text: "text-amber", dot: "bg-amber" },
    locked: { bg: "bg-surface", border: "border-border", text: "text-text-muted", dot: "bg-text-muted" },
  };

  const activeChapter = chapterData.find((ch) => ch.status === "active");

  const chapterIds = chapters.map((c) => c.id);

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      <RealtimeRefresh chapterIds={chapterIds} />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-cyan" />
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-xl tracking-[0.15em] text-text-primary">
              {campaign.name.toUpperCase()}
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-secondary tracking-wider mt-0.5">
              PLANET SHINJU // NARRATIVE CAMPAIGN
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/campaigns/${campaignId}/leaderboard`}
            className="px-4 py-2.5 border border-amber-dim text-amber hover:bg-amber/10 hover:border-amber font-[family-name:var(--font-mono)] text-sm tracking-wider uppercase transition-all"
          >
            Leaderboard
          </Link>
          {activeChapter && (
            <Link
              href={`/dashboard/campaigns/${campaignId}/chapters/${activeChapter.number}`}
              className="px-5 py-2.5 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan hover:text-glow hover:shadow-[0_0_16px_rgba(0,229,255,0.2)] font-[family-name:var(--font-mono)] text-sm tracking-wider uppercase transition-all"
            >
              My Campaign Sheet
            </Link>
          )}
        </div>
      </div>

      {/* Chapter Timeline */}
      <div className="panel p-6 mb-8">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
          <div className="w-1 h-5 bg-amber" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
            Chapter Timeline
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {chapterData.map((chapter) => {
            const style = statusStyles[chapter.status];
            const isPlayable = chapter.status === "active" || chapter.status === "completed";

            const content = (
              <>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${style.dot} ${chapter.status === "active" ? "status-dot" : ""}`} />
                  <span className={`font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase ${style.text}`}>
                    {chapter.status}
                  </span>
                </div>
                <div className="font-[family-name:var(--font-orbitron)] text-sm text-text-primary mb-1">
                  CH.{chapter.number}
                </div>
                <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary mb-2 leading-snug">
                  {chapter.name}
                </div>
                <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted">
                  {chapter.date}
                </div>
              </>
            );

            const className = `p-4 border ${style.border} ${style.bg} ${
              isPlayable ? "hover:border-cyan-dim" : ""
            } transition-all`;

            return isPlayable ? (
              <Link
                key={chapter.number}
                href={`/dashboard/campaigns/${campaignId}/chapters/${chapter.number}`}
                className={className}
              >
                {content}
              </Link>
            ) : (
              <div key={chapter.number} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Standings */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 bg-cyan" />
              <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
                Standings
              </h2>
            </div>
            <Link
              href={`/dashboard/campaigns/${campaignId}/leaderboard`}
              className="font-[family-name:var(--font-mono)] text-xs text-cyan hover:text-cyan/80 tracking-wider uppercase transition-colors"
            >
              Full Leaderboard →
            </Link>
          </div>

          {standings.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center px-4 py-2">
                <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-8">#</span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted flex-1">STRIKE TEAM</span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-16 text-right">TP</span>
              </div>

              {standings.map((team, i) => (
                <div
                  key={i}
                  className={`flex items-center px-4 py-3 border border-border/50 ${
                    i === 0 ? "bg-amber/5 border-amber-dim/20" : "bg-surface/30"
                  } hover:border-border transition-colors`}
                >
                  <span className={`font-[family-name:var(--font-mono)] text-sm w-8 ${i === 0 ? "text-amber font-bold" : "text-text-secondary"}`}>
                    {team.rank}
                  </span>
                  <div className="flex-1">
                    <div className="font-[family-name:var(--font-mono)] text-sm text-text-primary">{team.teamName}</div>
                    <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                      {team.player1Name} & {team.player2Name}
                    </div>
                  </div>
                  <span className={`font-[family-name:var(--font-mono)] text-lg font-bold w-16 text-right ${i === 0 ? "text-amber" : "text-text-primary"}`}>
                    {team.tp}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
                No standings yet. Games need to be played first.
              </p>
            </div>
          )}
        </div>

        {/* Strike Teams */}
        <div className="panel p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-green" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
              Strike Teams
            </h2>
          </div>

          {strikeTeams.length > 0 ? (
            <div className="space-y-3">
              {strikeTeams.map((team) => (
                <div key={team.id} className="p-4 bg-surface/30 border border-border/50">
                  <div className="font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-text-primary mb-3">
                    {team.name.toUpperCase()}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[team.player1, team.player2].map((player, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-surface-bright border border-border flex items-center justify-center">
                          <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                            {player?.display_name?.charAt(0) ?? "?"}
                          </span>
                        </div>
                        <div>
                          <div className="font-[family-name:var(--font-mono)] text-sm text-text-primary">
                            {player?.display_name ?? "Unassigned"}
                          </div>
                          <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                            {player?.faction ?? "No faction"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted">
                No strike teams formed yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
