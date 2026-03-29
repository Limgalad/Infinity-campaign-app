import Link from "next/link";
import { getCampaigns, getChapters } from "@/lib/supabase/queries";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  // Get chapter info for each campaign
  const campaignsWithChapters = await Promise.all(
    campaigns.map(async (campaign) => {
      const chapters = await getChapters(campaign.id);
      const activeChapter = chapters.find((ch) => ch.is_active);
      const completedCount = chapters.filter((ch) => ch.is_completed).length;
      const currentChapter = activeChapter
        ? activeChapter.chapter_number
        : completedCount > 0
          ? completedCount
          : 1;
      return {
        ...campaign,
        currentChapter,
        status: activeChapter ? ("active" as const) : completedCount === chapters.length ? ("completed" as const) : ("upcoming" as const),
      };
    })
  );

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-cyan" />
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-xl tracking-[0.15em] text-text-primary">
              CAMPAIGNS
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-secondary tracking-wider mt-0.5">
              ACTIVE OPERATIONS
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {campaignsWithChapters.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/dashboard/campaigns/${campaign.id}`}
            className="panel panel-glow p-6 hover:border-cyan-dim/50 transition-all duration-300 group block"
          >
            {/* Status badge */}
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan/10 border border-cyan-dim/30 text-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase">
                <span className="w-1.5 h-1.5 bg-cyan rounded-full status-dot" />
                {campaign.status}
              </span>
            </div>

            {/* Campaign info */}
            <h3 className="font-[family-name:var(--font-orbitron)] text-base tracking-wider text-text-primary group-hover:text-cyan transition-colors mb-2">
              {campaign.name.toUpperCase()}
            </h3>
            <p className="font-[family-name:var(--font-mono)] text-sm text-text-secondary mb-4">
              {campaign.description}
            </p>

            {/* Chapter progress */}
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="data-label font-[family-name:var(--font-mono)]">PROGRESS</span>
                <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary font-bold">
                  CH.{campaign.currentChapter}/{campaign.total_chapters}
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: campaign.total_chapters }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-1.5 ${
                      i + 1 < campaign.currentChapter
                        ? "bg-cyan"
                        : i + 1 === campaign.currentChapter
                          ? "bg-cyan/40"
                          : "bg-surface-bright"
                    }`}
                  />
                ))}
              </div>
            </div>
          </Link>
        ))}

        {/* Join/create campaign placeholder */}
        <div className="panel p-6 border-dashed flex flex-col items-center justify-center min-h-[200px] bg-hatch">
          <svg className="w-8 h-8 text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="square" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary tracking-wider uppercase">
            Join Campaign
          </span>
        </div>
      </div>
    </div>
  );
}
