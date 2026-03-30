"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  adjustPlayerXp,
  resetPlayerChapter,
  overrideCommanderLevel,
  resetPlayerCebSkills,
} from "../../actions";
import { useToast } from "@/components/toast";
import type {
  Player,
  Campaign,
  Chapter,
  XpLedgerEntry,
  CommandExperience,
  CommanderPromotion,
  SpecOps,
  GameResult,
} from "@/lib/types/database";

export default function PlayerProgressionPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = use(params);
  const [player, setPlayer] = useState<Player | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [xpLedger, setXpLedger] = useState<XpLedgerEntry[]>([]);
  const [xpSummary, setXpSummary] = useState({ total: 0, spent: 0, available: 0 });
  const [cebEntries, setCebEntries] = useState<CommandExperience[]>([]);
  const [promotion, setPromotion] = useState<CommanderPromotion | null>(null);
  const [specOps, setSpecOps] = useState<SpecOps[]>([]);
  const [gameResults, setGameResults] = useState<(GameResult & { chapter_number?: number; chapter_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [showXpAdjust, setShowXpAdjust] = useState(false);
  const [showCommanderOverride, setShowCommanderOverride] = useState(false);
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [cebResetConfirm, setCebResetConfirm] = useState(false);

  async function loadPlayer() {
    const supabase = createClient();
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single();
    setPlayer(data as Player | null);

    // Load campaigns this player participates in (via strike teams or game results)
    const { data: allCampaigns } = await supabase
      .from("campaigns")
      .select("*")
      .order("created_at", { ascending: false });
    setCampaigns((allCampaigns as Campaign[]) ?? []);

    if (allCampaigns && allCampaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(allCampaigns[0].id);
    }
    setLoading(false);
  }

  async function loadCampaignData(campaignId: string) {
    if (!campaignId) return;
    const supabase = createClient();

    const [
      { data: chaps },
      { data: ledger },
      { data: ceb },
      { data: promo },
      { data: specs },
    ] = await Promise.all([
      supabase
        .from("chapters")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("chapter_number"),
      supabase
        .from("xp_ledger")
        .select("*")
        .eq("player_id", playerId)
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false }),
      supabase
        .from("command_experience")
        .select("*")
        .eq("player_id", playerId)
        .eq("campaign_id", campaignId)
        .order("column_type")
        .order("level"),
      supabase
        .from("commander_promotions")
        .select("*")
        .eq("player_id", playerId)
        .eq("campaign_id", campaignId)
        .single(),
      supabase
        .from("spec_ops")
        .select("*")
        .eq("player_id", playerId)
        .eq("campaign_id", campaignId)
        .order("created_at"),
    ]);

    const chaptersData = (chaps as Chapter[]) ?? [];
    setChapters(chaptersData);

    const ledgerData = (ledger as XpLedgerEntry[]) ?? [];
    setXpLedger(ledgerData);

    const totalEarned = ledgerData
      .filter((e) => e.amount > 0)
      .reduce((sum, e) => sum + e.amount, 0);
    const totalSpent = Math.abs(
      ledgerData
        .filter((e) => e.amount < 0)
        .reduce((sum, e) => sum + e.amount, 0)
    );
    setXpSummary({ total: totalEarned, spent: totalSpent, available: totalEarned - totalSpent });

    setCebEntries((ceb as CommandExperience[]) ?? []);
    setPromotion(promo as CommanderPromotion | null);
    setSpecOps((specs as SpecOps[]) ?? []);

    // Load game results across all chapters
    const chapterIds = chaptersData.map((c) => c.id);
    if (chapterIds.length > 0) {
      const { data: results } = await supabase
        .from("game_results")
        .select("*")
        .eq("player_id", playerId)
        .in("chapter_id", chapterIds)
        .order("submitted_at", { ascending: false });

      const enriched = ((results as GameResult[]) ?? []).map((r) => {
        const ch = chaptersData.find((c) => c.id === r.chapter_id);
        return {
          ...r,
          chapter_number: ch?.chapter_number,
          chapter_name: ch?.name,
        };
      });
      setGameResults(enriched);
    } else {
      setGameResults([]);
    }
  }

  useEffect(() => {
    loadPlayer();
  }, [playerId]);

  useEffect(() => {
    if (selectedCampaignId) {
      loadCampaignData(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  async function handleXpAdjust(formData: FormData) {
    formData.set("playerId", playerId);
    formData.set("campaignId", selectedCampaignId);
    const result = await adjustPlayerXp(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("XP adjusted successfully");
      setShowXpAdjust(false);
      loadCampaignData(selectedCampaignId);
    }
  }

  async function handleChapterReset(chapterId: string) {
    const formData = new FormData();
    formData.set("playerId", playerId);
    formData.set("chapterId", chapterId);
    formData.set("campaignId", selectedCampaignId);
    const result = await resetPlayerChapter(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Chapter reset for this player");
      setResetConfirm(null);
      loadCampaignData(selectedCampaignId);
    }
  }

  async function handleCommanderOverride(formData: FormData) {
    formData.set("playerId", playerId);
    formData.set("campaignId", selectedCampaignId);
    const result = await overrideCommanderLevel(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("Commander level updated");
      setShowCommanderOverride(false);
      loadCampaignData(selectedCampaignId);
    }
  }

  async function handleCebReset() {
    const formData = new FormData();
    formData.set("playerId", playerId);
    formData.set("campaignId", selectedCampaignId);
    const result = await resetPlayerCebSkills(formData);
    if (result.error) {
      toast(result.error, "error");
    } else {
      toast("CEB skills reset and XP refunded");
      setCebResetConfirm(false);
      loadCampaignData(selectedCampaignId);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-2 h-2 bg-cyan rounded-full status-dot" />
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary ml-3">
          Loading player data...
        </span>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="panel p-8 text-center">
        <p className="font-[family-name:var(--font-mono)] text-sm text-red">Player not found.</p>
      </div>
    );
  }

  const CEB_LABELS: Record<string, string> = {
    mobile_reserve: "Mobile Reserve",
    logistical_support: "Logistical Support",
    military_intelligence: "Military Intelligence",
    tech_support: "Tech Support",
    recon_intel: "Recon Intel",
    dice_gods: "Dice Gods",
  };

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/dashboard/admin/players"
          className="font-[family-name:var(--font-mono)] text-xs text-text-secondary hover:text-cyan transition-colors cursor-pointer"
        >
          Players
        </Link>
        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">/</span>
        <span className="font-[family-name:var(--font-mono)] text-xs text-cyan">
          {player.display_name}
        </span>
      </div>

      {/* Player Header */}
      <div className="panel p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-surface-bright border border-border flex items-center justify-center">
              <span className="font-[family-name:var(--font-orbitron)] text-lg text-text-secondary">
                {player.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-text-primary">
                {player.display_name.toUpperCase()}
              </h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                  {player.faction ?? "No faction"}
                </span>
                {player.sectorial && (
                  <>
                    <span className="text-text-muted">|</span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                      {player.sectorial}
                    </span>
                  </>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 border font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase ${
                  player.role === "admin"
                    ? "bg-red/10 border-red-dim/30 text-red"
                    : "bg-surface border-border text-text-secondary"
                }`}>
                  {player.role}
                </span>
              </div>
            </div>
          </div>

          {/* Campaign selector */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <label className="font-[family-name:var(--font-mono)] text-xs text-text-muted uppercase tracking-wider">
              Campaign:
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors cursor-pointer"
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-4 mb-6">
        <div className="panel p-4 text-center">
          <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted uppercase tracking-wider mb-1">
            XP Earned
          </div>
          <div className="font-[family-name:var(--font-orbitron)] text-xl text-cyan">
            {xpSummary.total}
          </div>
        </div>
        <div className="panel p-4 text-center">
          <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted uppercase tracking-wider mb-1">
            XP Spent
          </div>
          <div className="font-[family-name:var(--font-orbitron)] text-xl text-red">
            {xpSummary.spent}
          </div>
        </div>
        <div className="panel p-4 text-center">
          <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted uppercase tracking-wider mb-1">
            XP Available
          </div>
          <div className="font-[family-name:var(--font-orbitron)] text-xl text-green">
            {xpSummary.available}
          </div>
        </div>
        <div className="panel p-4 text-center">
          <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted uppercase tracking-wider mb-1">
            Commander Lvl
          </div>
          <div className="font-[family-name:var(--font-orbitron)] text-xl text-amber">
            {promotion?.current_level ?? 0}
          </div>
        </div>
        <div className="panel p-4 text-center">
          <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted uppercase tracking-wider mb-1">
            Games Played
          </div>
          <div className="font-[family-name:var(--font-orbitron)] text-xl text-text-primary">
            {gameResults.length}
          </div>
        </div>
      </div>

      {/* Admin Actions Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6">
        <button
          onClick={() => {
            setShowXpAdjust(!showXpAdjust);
            setShowCommanderOverride(false);
          }}
          className="px-4 py-2.5 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          {showXpAdjust ? "Cancel" : "Adjust XP"}
        </button>
        <button
          onClick={() => {
            setShowCommanderOverride(!showCommanderOverride);
            setShowXpAdjust(false);
          }}
          className="px-4 py-2.5 border border-amber-dim text-amber hover:bg-amber/10 hover:border-amber font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
        >
          {showCommanderOverride ? "Cancel" : "Override Commander Level"}
        </button>
        {cebResetConfirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCebReset}
              className="px-4 py-2.5 bg-red/15 border-2 border-red-dim text-red hover:bg-red/25 hover:border-red font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
            >
              Confirm Reset CEB
            </button>
            <button
              onClick={() => setCebResetConfirm(false)}
              className="px-4 py-2.5 border border-border text-text-secondary font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCebResetConfirm(true)}
            disabled={cebEntries.length === 0}
            className={`px-4 py-2.5 border font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer ${
              cebEntries.length > 0
                ? "border-red-dim/40 text-red hover:bg-red/10 hover:border-red-dim"
                : "border-border/30 text-text-muted/30 cursor-not-allowed"
            }`}
          >
            Reset CEB Skills
          </button>
        )}
      </div>

      {/* XP Adjust Form */}
      {showXpAdjust && (
        <form action={handleXpAdjust} className="panel p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-cyan" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-text-primary uppercase">
              Manual XP Adjustment
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
                Amount *
              </label>
              <input
                name="amount"
                type="number"
                required
                placeholder="e.g. 5 or -3"
                className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
              />
              <p className="font-[family-name:var(--font-mono)] text-xs text-text-muted mt-1">
                Positive to add, negative to deduct
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
                Reason *
              </label>
              <input
                name="reason"
                required
                placeholder="e.g. Correction for missed game bonus"
                className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors"
              />
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-cyan/15 border-2 border-cyan-dim text-cyan hover:bg-cyan/25 hover:border-cyan font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
          >
            Apply Adjustment
          </button>
        </form>
      )}

      {/* Commander Override Form */}
      {showCommanderOverride && (
        <form action={handleCommanderOverride} className="panel p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-amber" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-text-primary uppercase">
              Override Commander Level
            </h3>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div>
              <label className="data-label font-[family-name:var(--font-mono)] block mb-1.5">
                New Level (0-5)
              </label>
              <select
                name="level"
                defaultValue={promotion?.current_level ?? 0}
                className="px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors cursor-pointer"
              >
                {[0, 1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>
                    Level {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted mt-5">
              Current: Level {promotion?.current_level ?? 0}
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-amber/15 border-2 border-amber-dim text-amber hover:bg-amber/25 hover:border-amber font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
          >
            Set Commander Level
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Game Results */}
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-cyan" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-text-primary uppercase">
              Game Results
            </h3>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted ml-auto">
              {gameResults.length} game{gameResults.length !== 1 ? "s" : ""}
            </span>
          </div>

          {gameResults.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {gameResults.map((gr) => (
                <div
                  key={gr.id}
                  className="flex items-center justify-between px-3 py-2 bg-surface/30 border border-border/30"
                >
                  <div>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted mr-2">
                      CH.{gr.chapter_number}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                      {gr.chapter_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                      {gr.objective_points} OP
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                      {gr.tournament_points} TP
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase border ${
                        gr.result === "win"
                          ? "bg-green/10 border-green-dim/30 text-green"
                          : gr.result === "draw"
                            ? "bg-amber/10 border-amber-dim/30 text-amber"
                            : "bg-red/10 border-red-dim/30 text-red"
                      }`}
                    >
                      {gr.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-[family-name:var(--font-mono)] text-xs text-text-muted text-center py-4">
              No game results yet.
            </p>
          )}
        </div>

        {/* CEB Purchases */}
        <div className="panel p-5">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-green" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-text-primary uppercase">
              CEB Purchases
            </h3>
          </div>

          {cebEntries.length > 0 ? (
            <div className="space-y-2">
              {cebEntries.map((ce) => (
                <div
                  key={ce.id}
                  className="flex items-center justify-between px-3 py-2 bg-surface/30 border border-border/30"
                >
                  <div>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">
                      {CEB_LABELS[ce.column_type] ?? ce.column_type}
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted ml-2">
                      L{ce.level}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                      {ce.xp_cost} XP
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">
                      Ch.{ce.purchased_in_chapter}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-[family-name:var(--font-mono)] text-xs text-text-muted text-center py-4">
              No CEB purchases yet.
            </p>
          )}
        </div>
      </div>

      {/* Spec-Ops */}
      {specOps.length > 0 && (
        <div className="panel p-5 mb-6">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-amber" />
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-text-primary uppercase">
              Spec-Ops Units
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specOps.map((so) => (
              <div key={so.id} className="p-4 bg-surface/30 border border-border/30">
                <div className="font-[family-name:var(--font-orbitron)] text-sm text-text-primary mb-2">
                  {so.unit_name.toUpperCase()}
                </div>
                <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary mb-2">
                  Total XP Spent: {so.total_xp_spent}
                </div>
                {so.upgrades && so.upgrades.length > 0 && (
                  <div className="space-y-1">
                    {so.upgrades.map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-2 py-1 bg-surface/50 border border-border/20"
                      >
                        <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">
                          {u.name}
                        </span>
                        <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">
                          {u.xp_cost} XP
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chapter-by-Chapter Reset */}
      <div className="panel p-5 mb-6">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="w-1 h-5 bg-red" />
          <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-text-primary uppercase">
            Chapter Reset
          </h3>
        </div>
        <p className="font-[family-name:var(--font-mono)] text-xs text-text-muted mb-4">
          Reset removes all game results, XP, consumables, CEB activations, and promotion rolls for this player in the selected chapter.
        </p>

        <div className="space-y-2">
          {chapters.map((ch) => {
            const chapterResults = gameResults.filter(
              (gr) => gr.chapter_id === ch.id
            );
            const hasData = chapterResults.length > 0;
            const status = ch.is_completed
              ? "completed"
              : ch.is_active
                ? "active"
                : "upcoming";

            return (
              <div
                key={ch.id}
                className="flex items-center justify-between px-4 py-3 bg-surface/30 border border-border/30"
              >
                <div className="flex items-center gap-3">
                  <span className="font-[family-name:var(--font-orbitron)] text-xs text-text-primary">
                    CH.{ch.chapter_number}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">
                    {ch.name}
                  </span>
                  <span
                    className={`font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase ${
                      status === "completed"
                        ? "text-cyan"
                        : status === "active"
                          ? "text-green"
                          : "text-text-muted"
                    }`}
                  >
                    {status}
                  </span>
                  {hasData && (
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">
                      ({chapterResults.length} game{chapterResults.length !== 1 ? "s" : ""})
                    </span>
                  )}
                </div>

                <div>
                  {resetConfirm === ch.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleChapterReset(ch.id)}
                        className="px-3 py-2.5 bg-red/15 border border-red-dim text-red hover:bg-red/25 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Confirm Reset
                      </button>
                      <button
                        onClick={() => setResetConfirm(null)}
                        className="px-3 py-2.5 border border-border text-text-secondary font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setResetConfirm(ch.id);
                      }}
                      disabled={!hasData}
                      className={`px-3 py-2.5 border font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer ${
                        hasData
                          ? "border-red-dim/40 text-red hover:bg-red/10 hover:border-red-dim"
                          : "border-border/30 text-text-muted/30 cursor-not-allowed"
                      }`}
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {chapters.length === 0 && (
            <p className="font-[family-name:var(--font-mono)] text-xs text-text-muted text-center py-4">
              No chapters in this campaign.
            </p>
          )}
        </div>
      </div>

      {/* XP Ledger (Audit Log) */}
      <div className="panel p-5">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="w-1 h-5 bg-cyan" />
          <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.15em] text-text-primary uppercase">
            XP Ledger
          </h3>
          <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted ml-auto">
            {xpLedger.length} entries
          </span>
        </div>

        {xpLedger.length > 0 ? (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {/* Header */}
            <div className="hidden md:flex items-center px-3 py-2">
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-28">DATE</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-24">SOURCE</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-16 text-right">AMOUNT</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted flex-1 ml-4">DESCRIPTION</span>
            </div>

            {xpLedger.map((entry) => {
              const isAdmin = entry.description?.startsWith("[ADMIN]");
              return (
                <div
                  key={entry.id}
                  className={`flex flex-col md:flex-row md:items-center px-3 py-2 border border-border/20 gap-1 md:gap-0 ${
                    isAdmin ? "bg-red/5 border-red-dim/20" : "bg-surface/20"
                  }`}
                >
                  <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted w-28">
                    {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary w-24">
                    {entry.source}
                  </span>
                  <span
                    className={`font-[family-name:var(--font-mono)] text-sm font-bold w-16 text-right ${
                      entry.amount > 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {entry.amount > 0 ? "+" : ""}
                    {entry.amount}
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary flex-1 ml-4">
                    {entry.description ?? "—"}
                    {isAdmin && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red/10 border border-red-dim/30 text-red text-[9px] tracking-wider uppercase">
                        Admin
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-[family-name:var(--font-mono)] text-xs text-text-muted text-center py-4">
            No XP ledger entries yet.
          </p>
        )}
      </div>
    </div>
  );
}
