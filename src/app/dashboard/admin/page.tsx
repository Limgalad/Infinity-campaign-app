import { getCampaigns, getChapters, getAllPlayers } from "@/lib/supabase/queries";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const [campaigns, players] = await Promise.all([
    getCampaigns(),
    getAllPlayers(),
  ]);

  const adminCount = players.filter((p) => p.role === "admin").length;

  // Get chapter stats for primary campaign
  const primaryCampaign = campaigns[0];
  let activeChapterName = "None";
  let completedChapters = 0;
  let totalChapters = 0;

  if (primaryCampaign) {
    const chapters = await getChapters(primaryCampaign.id);
    totalChapters = chapters.length;
    completedChapters = chapters.filter((ch) => ch.is_completed).length;
    const active = chapters.find((ch) => ch.is_active);
    if (active) activeChapterName = active.name;
  }

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "CAMPAIGNS", value: campaigns.length, color: "text-cyan" },
          { label: "PLAYERS", value: players.length, color: "text-green" },
          { label: "ADMINS", value: adminCount, color: "text-amber" },
          { label: "CHAPTERS DONE", value: `${completedChapters}/${totalChapters}`, color: "text-text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="panel p-4">
            <div className="data-label font-[family-name:var(--font-mono)] mb-2">{stat.label}</div>
            <div className={`font-[family-name:var(--font-mono)] text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="panel p-6 mb-8">
        <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
          <div className="w-1 h-5 bg-amber" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/admin/campaigns"
            className="p-4 bg-surface/30 border border-border/50 hover:border-cyan-dim transition-all group"
          >
            <div className="font-[family-name:var(--font-mono)] text-sm text-text-primary group-hover:text-cyan transition-colors mb-1">
              Manage Campaigns
            </div>
            <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
              Create, edit, and manage campaign chapters
            </div>
          </Link>

          <Link
            href="/dashboard/admin/players"
            className="p-4 bg-surface/30 border border-border/50 hover:border-cyan-dim transition-all group"
          >
            <div className="font-[family-name:var(--font-mono)] text-sm text-text-primary group-hover:text-cyan transition-colors mb-1">
              Manage Players
            </div>
            <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
              Edit player details, assign roles
            </div>
          </Link>

          <Link
            href="/dashboard/admin/strike-teams"
            className="p-4 bg-surface/30 border border-border/50 hover:border-cyan-dim transition-all group"
          >
            <div className="font-[family-name:var(--font-mono)] text-sm text-text-primary group-hover:text-cyan transition-colors mb-1">
              Strike Teams
            </div>
            <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
              Create teams and assign players
            </div>
          </Link>
        </div>
      </div>

      {/* Campaign status */}
      {primaryCampaign && (
        <div className="panel p-6">
          <div className="flex items-center gap-3 mb-5 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-cyan" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">
              Active Campaign
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border border-border/50">
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary uppercase">Campaign</span>
              <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">{primaryCampaign.name}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border border-border/50">
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary uppercase">Active Chapter</span>
              <span className="font-[family-name:var(--font-mono)] text-sm text-cyan">{activeChapterName}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border border-border/50">
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary uppercase">Progress</span>
              <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">{completedChapters}/{totalChapters} chapters completed</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-surface/50 border border-border/50">
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary uppercase">Players</span>
              <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">{players.length} registered</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
