"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import {
  submitAfterActionReport,
  submitPromotionRoll,
  purchaseCebLevel,
  removeCebLevel,
  selectFreeCebSkill,
  purchaseConsumable,
  addSpecOpsSkill,
} from "../../../actions";
import {
  calculateGameXP,
  calculatePromotionTN,
  isPromotionSuccess,
  CEB_LEVEL_COSTS,
  PROMOTION_BENEFITS,
  getCebActivationLimits,
  getFreeCebSkillsPerLevel,
} from "@/lib/utils/xp-calculator";
import type {
  GameResultType,
  CebColumnType,
  ConsumableType,
  Campaign,
  Chapter,
  GameResult,
  CommandExperience,
  CommanderPromotion,
  SpecOps,
  Consumable,
} from "@/lib/types/database";

// CEB column definitions with descriptions
const CEB_COLUMNS: {
  key: CebColumnType;
  label: string;
  shortLabel: string;
  levels: string[];
}[] = [
  {
    key: "mobile_reserve",
    label: "Mobile Reserve",
    shortLabel: "MOB RES",
    levels: ["+5 Army Points", "+10 Army Points", "+10 Army Points", "+15 Army Points"],
  },
  {
    key: "logistical_support",
    label: "Logistical Support",
    shortLabel: "LOG SUP",
    levels: ["+1 to all disposable weapons", "+1 to all disposable & +1 SWC", "+1 CR turret in friendly DZ", "+1 Baggage Bot for Free"],
  },
  {
    key: "military_intelligence",
    label: "Military Intelligence",
    shortLabel: "MIL INT",
    levels: ["+3 Initiative Roll, +3 Promotion", "Enemy has AD? +3 Promotion", "Enemy has Hidden Deploy?", "Copy enemy list, +3 Promotion"],
  },
  {
    key: "tech_support",
    label: "Tech Support",
    shortLabel: "TECH",
    levels: ["All REMs gain +3 BTS", "All HI may reroll reset rolls", "All Hackers gain +3 BTS", "FOs may FO in ZoC w/o LoS"],
  },
  {
    key: "recon_intel",
    label: "Recon Intelligence",
    shortLabel: "RECON",
    levels: ["Draw 3 Classifieds, keep 1", "Auto pass 1 objective roll", "Enemy reveals Classifieds", "Trigger sensor 2x after deploy"],
  },
  {
    key: "dice_gods",
    label: "The Dice Gods",
    shortLabel: "DICE",
    levels: ["Reroll 1 die per game", "+3 success value, 1 roll/chapter", "Auto crit 1 roll per chapter", "Auto crit 1 roll per game round"],
  },
];

const CONSUMABLE_DEFS: {
  key: ConsumableType;
  label: string;
  cost: number;
  description: string;
}[] = [
  { key: "reinforcements", label: "Reinforcements", cost: 2, description: "+8 AP, +0.5 SWC for next chapter" },
  { key: "emergency_medical", label: "Emergency Medical", cost: 2, description: "2 S2 units <25pts gain Medikit" },
  { key: "emergency_tech", label: "Emergency Tech", cost: 2, description: "2 S2 units <25pts gain Gizmokit" },
  { key: "emergency_ordinance", label: "Emergency Ordinance", cost: 4, description: "2 S2 units <18pts gain Panzerfaust" },
  { key: "move_up", label: "Move Up", cost: 4, description: '2 S2 units <18pts gain FD+8"' },
  { key: "defensive_measures", label: "Defensive Measures", cost: 4, description: "2 S2 units <20pts gain Mines + Minelayer" },
];

export default function ChapterPage({
  params,
}: {
  params: Promise<{ campaignId: string; chapterNum: string }>;
}) {
  const { campaignId, chapterNum } = use(params);
  const chapterNumber = parseInt(chapterNum);

  // Data state
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [existingResult, setExistingResult] = useState<GameResult | null>(null);
  const [purchasedCEB, setPurchasedCEB] = useState<Record<string, { level: number; xp_cost: number }[]>>({});
  const [commanderLevel, setCommanderLevel] = useState(0);
  const [specOps, setSpecOps] = useState<SpecOps[]>([]);
  const [purchasedConsumables, setPurchasedConsumables] = useState<ConsumableType[]>([]);
  const [xpSummary, setXpSummary] = useState({ total: 0, spent: 0, available: 0 });
  const [matchInfo, setMatchInfo] = useState<{
    status: string;
    yourTeam: { name: string; player1: string; player2: string; faction1: string | null; faction2: string | null };
    opponentTeam: { name: string; player1: string; player2: string; faction1: string | null; faction2: string | null };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // After-Action Report state
  const [objectivePoints, setObjectivePoints] = useState(0);
  const [result, setResult] = useState<GameResultType>("win");
  const [armySurvived, setArmySurvived] = useState(150);
  const [enemySurvived, setEnemySurvived] = useState(150);
  const [strikeTeamWin, setStrikeTeamWin] = useState(false);
  const [promotionRoll, setPromotionRoll] = useState<number | null>(null);

  // Spec-Ops form state
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillXpCost, setNewSkillXpCost] = useState(1);

  // UI state
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [
      { data: camp },
      { data: chap },
      { data: ceb },
      { data: promo },
      { data: specs },
    ] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", campaignId).single(),
      supabase.from("chapters").select("*").eq("campaign_id", campaignId).eq("chapter_number", chapterNumber).single(),
      supabase.from("command_experience").select("*").eq("player_id", user.id).eq("campaign_id", campaignId).order("column_type").order("level"),
      supabase.from("commander_promotions").select("*").eq("player_id", user.id).eq("campaign_id", campaignId).single(),
      supabase.from("spec_ops").select("*").eq("player_id", user.id).eq("campaign_id", campaignId).order("created_at"),
    ]);

    setCampaign(camp as Campaign | null);
    setChapter(chap as Chapter | null);
    setCommanderLevel((promo as CommanderPromotion | null)?.current_level ?? 0);
    setSpecOps((specs as SpecOps[]) ?? []);

    // Build CEB map with xp_cost info
    const cebMap: Record<string, { level: number; xp_cost: number }[]> = {};
    for (const entry of (ceb as CommandExperience[]) ?? []) {
      if (!cebMap[entry.column_type]) cebMap[entry.column_type] = [];
      cebMap[entry.column_type].push({ level: entry.level, xp_cost: entry.xp_cost });
    }
    setPurchasedCEB(cebMap);

    if (chap) {
      const chapData = chap as Chapter;
      const [{ data: gameResult }, { data: consumables }] = await Promise.all([
        supabase.from("game_results").select("*").eq("player_id", user.id).eq("chapter_id", chapData.id).limit(1).single(),
        supabase.from("consumables").select("*").eq("player_id", user.id).eq("chapter_id", chapData.id),
      ]);

      setExistingResult(gameResult as GameResult | null);
      setPurchasedConsumables(((consumables as Consumable[]) ?? []).map((c) => c.consumable_type));

      // Load match info
      const { data: allMatches } = await supabase.from("matches").select("*").eq("chapter_id", chapData.id);
      if (allMatches && allMatches.length > 0) {
        const { data: playerTeams } = await supabase
          .from("strike_teams")
          .select("*, player1:players!strike_teams_player1_id_fkey(display_name, faction), player2:players!strike_teams_player2_id_fkey(display_name, faction)")
          .eq("campaign_id", campaignId)
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`);

        if (playerTeams && playerTeams.length > 0) {
          const myTeam = playerTeams[0];
          const myMatch = allMatches.find(
            (m: { strike_team_1_id: string; strike_team_2_id: string }) =>
              m.strike_team_1_id === myTeam.id || m.strike_team_2_id === myTeam.id
          );
          if (myMatch) {
            const opponentTeamId = myMatch.strike_team_1_id === myTeam.id ? myMatch.strike_team_2_id : myMatch.strike_team_1_id;
            const { data: oppTeam } = await supabase
              .from("strike_teams")
              .select("*, player1:players!strike_teams_player1_id_fkey(display_name, faction), player2:players!strike_teams_player2_id_fkey(display_name, faction)")
              .eq("id", opponentTeamId)
              .single();
            const p1 = myTeam.player1 as unknown as { display_name: string; faction: string | null } | null;
            const p2 = myTeam.player2 as unknown as { display_name: string; faction: string | null } | null;
            const o1 = oppTeam?.player1 as unknown as { display_name: string; faction: string | null } | null;
            const o2 = oppTeam?.player2 as unknown as { display_name: string; faction: string | null } | null;
            setMatchInfo({
              status: myMatch.status,
              yourTeam: { name: myTeam.name, player1: p1?.display_name ?? "Unknown", player2: p2?.display_name ?? "Unknown", faction1: p1?.faction ?? null, faction2: p2?.faction ?? null },
              opponentTeam: { name: oppTeam?.name ?? "Unknown", player1: o1?.display_name ?? "Unknown", player2: o2?.display_name ?? "Unknown", faction1: o1?.faction ?? null, faction2: o2?.faction ?? null },
            });
          }
        }
      }

      if (gameResult) {
        const gr = gameResult as GameResult;
        setObjectivePoints(gr.objective_points);
        setResult(gr.result);
        setArmySurvived(gr.army_percentage_survived != null ? Math.round((gr.army_percentage_survived / 100) * 300) : 150);
        setEnemySurvived(gr.enemy_percentage_survived != null ? Math.round((gr.enemy_percentage_survived / 100) * 300) : 150);
      }
    }

    // Load XP summary
    const { data: ledger } = await supabase.from("xp_ledger").select("amount").eq("player_id", user.id).eq("campaign_id", campaignId);
    const entries = (ledger ?? []) as { amount: number }[];
    const totalEarned = entries.filter((e) => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const totalSpent = Math.abs(entries.filter((e) => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
    setXpSummary({ total: totalEarned, spent: totalSpent, available: totalEarned - totalSpent });

    setLoading(false);
  }

  useEffect(() => { loadData(); }, [campaignId, chapterNumber]);

  const activationLimits = getCebActivationLimits(commanderLevel);
  const freeSkillSlots = getFreeCebSkillsPerLevel(commanderLevel);

  const xpEarned = useMemo(
    () => calculateGameXP(objectivePoints, result, strikeTeamWin),
    [objectivePoints, result, strikeTeamWin]
  );

  const promotionCalc = useMemo(
    () => calculatePromotionTN({
      result,
      objectivePoints,
      armyPointsSurvived: armySurvived,
      enemyPointsSurvived: enemySurvived,
      currentLevel: commanderLevel,
    }),
    [result, objectivePoints, armySurvived, enemySurvived, commanderLevel]
  );

  const promotionSuccess = promotionRoll !== null ? isPromotionSuccess(promotionRoll, promotionCalc.targetNumber) : null;

  // Count free picks per level
  const freePicksCount = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const col of Object.values(purchasedCEB)) {
      for (const entry of col) {
        if (entry.xp_cost === 0) {
          counts[entry.level] = (counts[entry.level] ?? 0) + 1;
        }
      }
    }
    return counts;
  }, [purchasedCEB]);

  // Helper to check if a CEB level is purchased
  function isCebPurchased(colKey: string, level: number): boolean {
    return purchasedCEB[colKey]?.some((e) => e.level === level) ?? false;
  }

  function isCebFree(colKey: string, level: number): boolean {
    return purchasedCEB[colKey]?.some((e) => e.level === level && e.xp_cost === 0) ?? false;
  }

  async function handleSubmitReport() {
    if (!chapter) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.set("chapterId", chapter.id);
    formData.set("campaignId", campaignId);
    formData.set("objectivePoints", objectivePoints.toString());
    formData.set("result", result);
    formData.set("armySurvived", Math.round((armySurvived / 300) * 100).toString());
    formData.set("enemySurvived", Math.round((enemySurvived / 300) * 100).toString());
    formData.set("strikeTeamWin", strikeTeamWin.toString());

    const res = await submitAfterActionReport(formData);
    setSubmitting(false);

    if (res.error) {
      toast(res.error, "error");
    } else {
      toast("After-action report submitted!");
      if (promotionRoll !== null) {
        const promoForm = new FormData();
        promoForm.set("chapterId", chapter.id);
        promoForm.set("campaignId", campaignId);
        promoForm.set("roll", promotionRoll.toString());
        promoForm.set("targetNumber", promotionCalc.targetNumber.toString());
        await submitPromotionRoll(promoForm);
      }
      loadData();
    }
  }

  async function handleToggleCEB(columnType: string, level: number) {
    if (!chapter) return;
    const isPurchased = isCebPurchased(columnType, level);

    if (isPurchased) {
      // Deselect
      const formData = new FormData();
      formData.set("campaignId", campaignId);
      formData.set("columnType", columnType);
      formData.set("level", level.toString());
      formData.set("chapterId", chapter.id);
      const res = await removeCebLevel(formData);
      if (res.error) {
        toast(res.error, "error");
      } else {
        toast(`Removed ${columnType.replace(/_/g, " ")} L${level}`);
        loadData();
      }
    } else {
      // Check if this qualifies as a free pick
      const freeSlot = freeSkillSlots.find((s) => s.level === level);
      const currentFreeCount = freePicksCount[level] ?? 0;
      const isFree = freeSlot && currentFreeCount < freeSlot.count;

      if (isFree) {
        const formData = new FormData();
        formData.set("campaignId", campaignId);
        formData.set("columnType", columnType);
        formData.set("level", level.toString());
        formData.set("chapterNumber", chapterNumber.toString());
        const res = await selectFreeCebSkill(formData);
        if (res.error) {
          toast(res.error, "error");
        } else {
          toast(`Free skill: ${columnType.replace(/_/g, " ")} L${level}`);
          loadData();
        }
      } else {
        // Paid purchase
        const xpCost = CEB_LEVEL_COSTS[level];
        const formData = new FormData();
        formData.set("campaignId", campaignId);
        formData.set("columnType", columnType);
        formData.set("level", level.toString());
        formData.set("xpCost", xpCost.toString());
        formData.set("chapterNumber", chapterNumber.toString());
        formData.set("chapterId", chapter.id);
        const res = await purchaseCebLevel(formData);
        if (res.error) {
          toast(res.error, "error");
        } else {
          toast(`Purchased ${columnType.replace(/_/g, " ")} L${level}`);
          loadData();
        }
      }
    }
  }

  async function handlePurchaseConsumable(consumableType: ConsumableType, cost: number) {
    if (!chapter) return;
    const formData = new FormData();
    formData.set("campaignId", campaignId);
    formData.set("chapterId", chapter.id);
    formData.set("consumableType", consumableType);
    formData.set("xpCost", cost.toString());
    const res = await purchaseConsumable(formData);
    if (res.error) {
      toast(res.error, "error");
    } else {
      toast(`Purchased ${consumableType.replace(/_/g, " ")}`);
      loadData();
    }
  }

  async function handleAddSkill() {
    if (!chapter || !newSkillName.trim()) return;
    const formData = new FormData();
    formData.set("campaignId", campaignId);
    formData.set("chapterId", chapter.id);
    formData.set("chapterNumber", chapterNumber.toString());
    formData.set("skillName", newSkillName.trim());
    formData.set("xpCost", newSkillXpCost.toString());
    const res = await addSpecOpsSkill(formData);
    if (res.error) {
      toast(res.error, "error");
    } else {
      toast(`Added skill: ${newSkillName.trim()}`);
      setNewSkillName("");
      setNewSkillXpCost(1);
      setShowAddSkill(false);
      loadData();
    }
  }

  const resultOptions: { value: GameResultType; label: string; color: string }[] = [
    { value: "win", label: "VICTORY", color: "text-green border-green-dim bg-green/10" },
    { value: "draw", label: "DRAW", color: "text-amber border-amber-dim bg-amber/10" },
    { value: "lose", label: "DEFEAT", color: "text-red border-red-dim bg-red/10" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-2 h-2 bg-cyan rounded-full status-dot" />
        <span className="font-[family-name:var(--font-mono)] text-sm text-text-secondary ml-3">Loading chapter data...</span>
      </div>
    );
  }

  if (!campaign || !chapter) {
    return (
      <div className="panel p-8 text-center">
        <p className="font-[family-name:var(--font-mono)] text-sm text-red">Chapter not found.</p>
        <Link href={`/dashboard/campaigns/${campaignId}`} className="inline-block mt-4 px-4 py-2 border border-border text-text-secondary hover:text-cyan hover:border-cyan-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer">
          Back to Campaign
        </Link>
      </div>
    );
  }

  const hasSubmitted = existingResult !== null;
  const step1Complete = objectivePoints > 0;
  const step2Complete = promotionRoll !== null && promotionRoll >= 1 && promotionRoll <= 20;

  return (
    <div style={{ animation: "slide-up 0.5s ease-out" }} className="pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-green" />
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-base sm:text-xl tracking-[0.15em] text-text-primary">
              CHAPTER {chapterNumber} — {chapter.name.toUpperCase()}
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-xs sm:text-sm text-text-secondary tracking-wider mt-0.5">
              AFTER-ACTION REPORT & CAMPAIGN SHEET // {campaign.name.toUpperCase()}
            </p>
          </div>
        </div>
        <Link href={`/dashboard/campaigns/${campaignId}`} className="px-4 py-2 border border-border text-text-secondary hover:text-cyan hover:border-cyan-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all cursor-pointer">
          Back
        </Link>
      </div>

      {/* Match-up card */}
      {matchInfo && (
        <div className="panel panel-glow p-4 sm:p-5 mb-8 border-amber-dim/40">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-amber" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Your Match</h2>
            <span className={`ml-auto inline-flex items-center px-2 py-0.5 border font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase ${
              matchInfo.status === "completed" ? "border-cyan-dim/30 text-cyan" : matchInfo.status === "in_progress" ? "border-green-dim/30 text-green" : "border-amber-dim/30 text-amber"
            }`}>{matchInfo.status.replace("_", " ")}</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
            <div className="p-3 bg-surface/30 border border-cyan-dim/20">
              <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-cyan mb-2">{matchInfo.yourTeam.name.toUpperCase()}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan rounded-full shrink-0" /><span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{matchInfo.yourTeam.player1}</span></div>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan rounded-full shrink-0" /><span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{matchInfo.yourTeam.player2}</span></div>
              </div>
            </div>
            <div className="text-center"><span className="font-[family-name:var(--font-orbitron)] text-lg text-text-muted tracking-wider">VS</span></div>
            <div className="p-3 bg-surface/30 border border-red-dim/20">
              <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-red mb-2">{matchInfo.opponentTeam.name.toUpperCase()}</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red rounded-full shrink-0" /><span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{matchInfo.opponentTeam.player1}</span></div>
                <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-red rounded-full shrink-0" /><span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{matchInfo.opponentTeam.player2}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
      {!matchInfo && !loading && (
        <div className="mb-8 px-4 py-3 bg-surface/30 border border-border/30 font-[family-name:var(--font-mono)] text-xs text-text-muted">No match scheduled for you in this chapter yet.</div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* GAME OUTCOME — AFTER-ACTION REPORT                     */}
      {/* ═══════════════════════════════════════════════════════ */}

      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-dim/40 to-transparent" />
        <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-cyan">AFTER-ACTION REPORT</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-dim/40 to-transparent" />
      </div>

      {/* Submitted banner */}
      {hasSubmitted && (
        <div className="mb-6 px-4 py-3 bg-cyan/10 border border-cyan-dim/30 font-[family-name:var(--font-mono)] text-sm text-cyan">
          After-action report submitted and locked. Result:{" "}
          <span className="uppercase font-bold">{existingResult.result}</span> — {existingResult.objective_points} OP, {existingResult.tournament_points} TP, {existingResult.xp_earned} XP
        </div>
      )}

      {/* Progress indicator */}
      {!hasSubmitted && (
        <div className="flex items-center gap-2 mb-6">
          {[
            { num: 1, label: "GAME OUTCOME", done: step1Complete, active: true },
            { num: 2, label: "PROMOTION ROLL", done: step2Complete, active: step1Complete },
            { num: 3, label: "SUBMIT REPORT", done: false, active: step2Complete },
          ].map((step, i) => (
            <div key={step.num} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-2 px-3 py-2 border transition-all flex-1 ${
                step.done ? "border-cyan-dim/40 bg-cyan/10" : step.active ? "border-amber-dim/40 bg-amber/5" : "border-border/30 opacity-40"
              }`}>
                <span className={`font-[family-name:var(--font-orbitron)] text-xs ${step.done ? "text-cyan" : step.active ? "text-amber" : "text-text-muted"}`}>{step.num}</span>
                <span className={`font-[family-name:var(--font-mono)] text-xs tracking-wider ${step.done ? "text-cyan" : step.active ? "text-text-primary" : "text-text-muted"}`}>{step.label}</span>
                {step.done && <svg className="w-3 h-3 text-cyan ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="square" d="M5 13l4 4L19 7" /></svg>}
              </div>
              {i < 2 && <div className={`w-4 h-px shrink-0 ${step.done ? "bg-cyan-dim" : "bg-border/30"}`} />}
            </div>
          ))}
        </div>
      )}

      {/* STEP 1: GAME OUTCOME */}
      <div className={`panel panel-glow p-4 sm:p-5 mb-6 border-cyan-dim/40 ${hasSubmitted ? "opacity-60 pointer-events-none" : ""}`}>
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="w-1 h-5 bg-cyan" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Game Outcome</h2>
          <span className="ml-auto font-[family-name:var(--font-mono)] text-xs text-cyan tracking-wider">STEP 1</span>
        </div>

        {/* Result buttons including Strike Team Win */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          {resultOptions.map((opt) => (
            <button key={opt.value} onClick={() => { setResult(opt.value); if (opt.value !== "win") setStrikeTeamWin(false); }}
              className={`py-3 border font-[family-name:var(--font-orbitron)] text-sm tracking-wider transition-all cursor-pointer ${
                result === opt.value && !strikeTeamWin ? opt.color : "border-border text-text-muted hover:border-border-bright hover:text-text-secondary"
              }`}>
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => { setResult("win"); setStrikeTeamWin(!strikeTeamWin); }}
            className={`py-3 border font-[family-name:var(--font-orbitron)] text-sm tracking-wider transition-all cursor-pointer ${
              strikeTeamWin ? "text-green border-green-dim bg-green/15" : "border-border text-text-muted hover:border-border-bright hover:text-text-secondary"
            }`}
          >
            TEAM WIN
          </button>
        </div>

        {strikeTeamWin && (
          <div className="mb-4 px-3 py-2 bg-green/5 border border-green-dim/30">
            <p className="font-[family-name:var(--font-mono)] text-xs text-green">Strike Team Win: Both players won — +3 XP bonus instead of +1</p>
          </div>
        )}

        {/* Objective Points */}
        <div className="mb-6">
          <label className="data-label font-[family-name:var(--font-mono)] block mb-3">OBJECTIVE POINTS (0-10)</label>
          <div className="flex flex-wrap items-center gap-1">
            {Array.from({ length: 11 }).map((_, i) => (
              <button key={i} onClick={() => setObjectivePoints(i)}
                className={`w-10 h-10 border font-[family-name:var(--font-mono)] text-sm transition-all cursor-pointer ${
                  i <= objectivePoints ? "bg-cyan/15 border-cyan-dim/40 text-cyan" : "border-border text-text-muted hover:border-border-bright hover:text-text-secondary"
                }`}>{i}</button>
            ))}
          </div>
        </div>

        {/* Army Survived — 0-300 army points */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="data-label font-[family-name:var(--font-mono)] block mb-2">YOUR ARMY REMAINING (0-300 pts)</label>
            <input type="number" min="0" max="300" step="1" value={armySurvived} onChange={(e) => setArmySurvived(Math.max(0, Math.min(300, Math.floor(Number(e.target.value) || 0))))} placeholder="0-300" className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors" />
            <div className="flex justify-between mt-1">
              <span className="font-[family-name:var(--font-mono)] text-xs text-red">&lt;75 pts penalty</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-green">&gt;225 pts bonus</span>
            </div>
          </div>
          <div>
            <label className="data-label font-[family-name:var(--font-mono)] block mb-2">ENEMY REMAINING (0-300 pts)</label>
            <input type="number" min="0" max="300" step="1" value={enemySurvived} onChange={(e) => setEnemySurvived(Math.max(0, Math.min(300, Math.floor(Number(e.target.value) || 0))))} placeholder="0-300" className="w-full px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-sm focus:border-cyan-dim focus:outline-none transition-colors" />
            <div className="flex justify-between mt-1">
              <span className="font-[family-name:var(--font-mono)] text-xs text-green">&le;75 pts bonus</span>
              <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">&nbsp;</span>
            </div>
          </div>
        </div>

        {/* Live calculations */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center p-2 sm:p-3 bg-surface/30 border border-border/20">
              <div className="data-label font-[family-name:var(--font-mono)] mb-1">XP EARNED</div>
              <div className="font-[family-name:var(--font-mono)] text-2xl font-bold text-cyan">{xpEarned}</div>
              <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary mt-1">
                {objectivePoints} OP{result === "win" ? (strikeTeamWin ? " + 3 TEAM" : " + 1 WIN") : ""}
              </div>
            </div>
            <div className="text-center p-3 bg-surface/30 border border-border/20">
              <div className="data-label font-[family-name:var(--font-mono)] mb-1">TOURNAMENT PTS</div>
              <div className={`font-[family-name:var(--font-mono)] text-2xl font-bold ${result === "win" ? "text-green" : result === "draw" ? "text-amber" : "text-red"}`}>
                {result === "win" ? 3 : result === "draw" ? 2 : 1}
              </div>
            </div>
            <div className="text-center p-3 bg-surface/30 border border-border/20">
              <div className="data-label font-[family-name:var(--font-mono)] mb-1">PROMOTION TN</div>
              <div className="font-[family-name:var(--font-mono)] text-2xl font-bold text-amber">{promotionCalc.targetNumber}+</div>
              <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary mt-1">on D20</div>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: PROMOTION ROLL */}
      <div className={`panel p-4 sm:p-5 mb-6 transition-all duration-300 ${
        hasSubmitted ? "opacity-60 pointer-events-none" : !step1Complete ? "opacity-30 pointer-events-none" : ""
      }`}>
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <div className="w-1 h-5 bg-amber" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Commander Promotion Roll</h2>
          <span className="ml-auto font-[family-name:var(--font-mono)] text-xs text-amber tracking-wider">STEP 2</span>
        </div>
        {!step1Complete && !hasSubmitted && (
          <div className="text-center py-6"><p className="font-[family-name:var(--font-mono)] text-xs text-text-muted">Complete Step 1 to unlock promotion roll.</p></div>
        )}
        {(step1Complete || hasSubmitted) && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="space-y-2">
                <div className="data-label font-[family-name:var(--font-mono)]">MODIFIERS</div>
                {Object.entries(promotionCalc.modifiers).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between px-3 py-1.5 bg-surface/50 border border-border/30">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary capitalize">{key.replace(/_/g, " ")}</span>
                    <span className={`font-[family-name:var(--font-mono)] text-xs font-bold ${value >= 0 ? "text-green" : "text-red"}`}>{value >= 0 ? "+" : ""}{value}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-surface/30 border border-amber-dim/30">
                <div className="data-label font-[family-name:var(--font-mono)] mb-2">TARGET NUMBER</div>
                <div className="font-[family-name:var(--font-orbitron)] text-4xl sm:text-5xl font-bold text-amber">{promotionCalc.targetNumber}</div>
                <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary mt-2">ROLL D20 &le; {promotionCalc.targetNumber}</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <label className="data-label font-[family-name:var(--font-mono)] shrink-0">YOUR ROLL:</label>
              <input type="number" min="1" max="20" value={promotionRoll ?? ""} onChange={(e) => setPromotionRoll(e.target.value ? Number(e.target.value) : null)} placeholder="1-20" className="w-full sm:w-24 px-3 py-2 bg-surface border border-border text-text-primary font-[family-name:var(--font-mono)] text-center text-lg focus:border-cyan-dim focus:outline-none transition-colors" />
              {promotionSuccess !== null && (
                <div className={`flex-1 px-4 py-2 border font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-center ${
                  promotionSuccess ? "bg-green/10 border-green-dim text-green" : "bg-red/10 border-red-dim text-red"
                }`}>{promotionSuccess ? "PROMOTED!" : "FAILED"}</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* STEP 3: SUBMIT */}
      {!hasSubmitted && (
        <div className={`panel panel-glow p-4 sm:p-5 mb-8 transition-all duration-300 ${!step2Complete ? "opacity-30 pointer-events-none border-border/30" : "border-cyan-dim/40"}`}>
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
            <div className="w-1 h-5 bg-green" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Review & Submit</h2>
            <span className="ml-auto font-[family-name:var(--font-mono)] text-xs text-green tracking-wider">STEP 3</span>
          </div>
          {!step2Complete && (
            <div className="text-center py-6"><p className="font-[family-name:var(--font-mono)] text-xs text-text-muted">Complete Steps 1 & 2 to submit your report.</p></div>
          )}
          {step2Complete && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5">
                <div className="px-3 py-2 bg-surface/30 border border-border/20">
                  <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted mb-1">RESULT</div>
                  <div className={`font-[family-name:var(--font-orbitron)] text-sm uppercase ${result === "win" ? "text-green" : result === "draw" ? "text-amber" : "text-red"}`}>
                    {strikeTeamWin ? "TEAM WIN" : result}
                  </div>
                </div>
                <div className="px-3 py-2 bg-surface/30 border border-border/20">
                  <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted mb-1">OBJ. POINTS</div>
                  <div className="font-[family-name:var(--font-mono)] text-sm text-cyan">{objectivePoints}</div>
                </div>
                <div className="px-3 py-2 bg-surface/30 border border-border/20">
                  <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted mb-1">XP EARNED</div>
                  <div className="font-[family-name:var(--font-mono)] text-sm text-cyan">{xpEarned}</div>
                </div>
                <div className="px-3 py-2 bg-surface/30 border border-border/20">
                  <div className="font-[family-name:var(--font-mono)] text-xs text-text-muted mb-1">PROMOTION</div>
                  <div className={`font-[family-name:var(--font-orbitron)] text-sm ${promotionSuccess ? "text-green" : "text-red"}`}>{promotionSuccess ? "PROMOTED" : "FAILED"}</div>
                </div>
              </div>
              <div className="p-3 bg-amber/5 border border-amber-dim/30 mb-5">
                <p className="font-[family-name:var(--font-mono)] text-xs text-amber">Once submitted, your game result will be locked and cannot be edited.</p>
              </div>
              <button onClick={handleSubmitReport} disabled={submitting}
                className="w-full px-8 py-4 bg-cyan/20 border-2 border-cyan text-cyan font-[family-name:var(--font-orbitron)] text-sm sm:text-base tracking-[0.2em] uppercase hover:bg-cyan/30 hover:shadow-[0_0_24px_rgba(0,229,255,0.25)] transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50">
                {submitting ? "SUBMITTING..." : "SUBMIT AFTER-ACTION REPORT"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CAMPAIGN SHEET — XP, CEB, SPEC-OPS, CONSUMABLES        */}
      {/* ═══════════════════════════════════════════════════════ */}

      <div className="flex items-center gap-4 my-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-dim/40 to-transparent" />
        <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-amber">CAMPAIGN SHEET</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-dim/40 to-transparent" />
      </div>

      {/* XP OVERVIEW */}
      <div className="panel panel-glow p-4 sm:p-5 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-5 bg-cyan" />
          <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Experience Points</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-6">
          <div>
            <div className="data-label font-[family-name:var(--font-mono)] mb-1">TOTAL EARNED</div>
            <div className="font-[family-name:var(--font-mono)] text-2xl sm:text-3xl font-bold text-cyan">{xpSummary.total}</div>
          </div>
          <div>
            <div className="data-label font-[family-name:var(--font-mono)] mb-1">SPENT</div>
            <div className="font-[family-name:var(--font-mono)] text-2xl sm:text-3xl font-bold text-red">{xpSummary.spent}</div>
          </div>
          <div>
            <div className="data-label font-[family-name:var(--font-mono)] mb-1">AVAILABLE</div>
            <div className="font-[family-name:var(--font-mono)] text-2xl sm:text-3xl font-bold text-green">{xpSummary.available}</div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="h-2 bg-surface-bright relative overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan to-cyan-dim absolute left-0 top-0" style={{ width: `${Math.min((xpSummary.spent / 78) * 100, 100)}%` }} />
            <div className="h-full bg-green/30 absolute top-0" style={{ left: `${Math.min((xpSummary.spent / 78) * 100, 100)}%`, width: `${Math.min((xpSummary.available / 78) * 100, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">0</span>
            <span className="font-[family-name:var(--font-mono)] text-xs text-text-muted">78 MAX</span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CEB + COMMANDER PROMOTION — always available            */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="panel p-4 sm:p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-amber" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Command Experience Board</h2>
          </div>
          <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary sm:text-right pl-4 sm:pl-0">
            ACTIVATION: {activationLimits.maxBonusesPerColumn} per column / {activationLimits.maxColumns} columns
            {freeSkillSlots.length > 0 && (
              <span className="ml-3 text-green">| FREE PICKS: {freeSkillSlots.map((s) => `${2 - (freePicksCount[s.level] ?? 0)} left at L${s.level}`).join(", ")}</span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2 min-w-[600px]">
            {CEB_COLUMNS.map((col) => (
              <div key={col.key} className="text-center pb-2 border-b border-border mb-2">
                <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-text-primary">{col.shortLabel}</div>
                <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary mt-0.5">{col.label}</div>
              </div>
            ))}

            {[1, 2, 3, 4].map((level) =>
              CEB_COLUMNS.map((col) => {
                const isPurchased = isCebPurchased(col.key, level);
                const isFree = isCebFree(col.key, level);
                const previousOwned = level === 1 || isCebPurchased(col.key, level - 1);
                // Check if free pick available for this level
                const freeSlot = freeSkillSlots.find((s) => s.level === level);
                const currentFreeCount = freePicksCount[level] ?? 0;
                const hasFreeSlot = freeSlot && currentFreeCount < freeSlot.count;
                const canAfford = hasFreeSlot || xpSummary.available >= CEB_LEVEL_COSTS[level];
                const canPurchase = !isPurchased && previousOwned && canAfford;
                const canDeselect = isPurchased && !hasSubmitted;
                const levelDesc = col.levels[level - 1];

                return (
                  <button
                    key={`${col.key}-${level}`}
                    disabled={!canPurchase && !canDeselect}
                    onClick={() => (canPurchase || canDeselect) && handleToggleCEB(col.key, level)}
                    className={`relative p-2 sm:p-2.5 border text-left transition-all duration-200 min-h-[60px] sm:min-h-[72px] cursor-pointer ${
                      isPurchased
                        ? isFree
                          ? "bg-green/15 border-green-dim/40 hover:border-green"
                          : "bg-cyan/15 border-cyan-dim/40 hover:border-cyan"
                        : canPurchase
                          ? hasFreeSlot
                            ? "bg-surface/50 border-green-dim/30 hover:border-green hover:bg-green/5"
                            : "bg-surface/50 border-border hover:border-amber-dim hover:bg-amber/5"
                          : "bg-surface/20 border-border/30 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-[family-name:var(--font-mono)] text-xs font-bold ${isPurchased ? (isFree ? "text-green" : "text-cyan") : "text-text-muted"}`}>L{level}</span>
                      <span className={`font-[family-name:var(--font-mono)] text-xs ${isPurchased ? (isFree ? "text-green-dim" : "text-cyan-dim") : "text-text-muted"}`}>
                        {isFree ? "FREE" : `${CEB_LEVEL_COSTS[level]} XP`}
                      </span>
                    </div>
                    <div className={`font-[family-name:var(--font-mono)] text-xs leading-snug ${isPurchased ? "text-text-primary" : "text-text-secondary"}`}>{levelDesc}</div>
                    {isPurchased && (
                      <div className={`absolute top-1 right-1 w-4 h-4 ${isFree ? "bg-green" : "bg-cyan"} flex items-center justify-center`}>
                        <svg className="w-2.5 h-2.5 text-void" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="square" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Level 5 */}
          {(() => {
            const anyL5Purchased = CEB_COLUMNS.some((col) => isCebPurchased(col.key, 5));
            const anyColumnHasL4 = CEB_COLUMNS.some((col) => isCebPurchased(col.key, 4));
            const canPurchaseL5 = !anyL5Purchased && anyColumnHasL4 && xpSummary.available >= CEB_LEVEL_COSTS[5];
            return (
              <button
                disabled={!canPurchaseL5 && !anyL5Purchased}
                onClick={() => {
                  if (anyL5Purchased) {
                    const c = CEB_COLUMNS.find((col) => isCebPurchased(col.key, 5));
                    if (c) handleToggleCEB(c.key, 5);
                  } else if (canPurchaseL5) {
                    const c = CEB_COLUMNS.find((col) => isCebPurchased(col.key, 4));
                    if (c) handleToggleCEB(c.key, 5);
                  }
                }}
                className={`mt-2 w-full relative p-3 sm:p-4 border text-center transition-all duration-200 cursor-pointer ${
                  anyL5Purchased ? "bg-cyan/15 border-cyan-dim/40 hover:border-cyan"
                    : canPurchaseL5 ? "bg-surface/50 border-border hover:border-amber-dim hover:bg-amber/5"
                    : "bg-surface/20 border-border/30 opacity-40 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-center gap-4 mb-1">
                  <span className={`font-[family-name:var(--font-mono)] text-xs font-bold ${anyL5Purchased ? "text-cyan" : "text-text-muted"}`}>L5</span>
                  <span className={`font-[family-name:var(--font-mono)] text-xs ${anyL5Purchased ? "text-cyan-dim" : "text-text-muted"}`}>{CEB_LEVEL_COSTS[5]} XP</span>
                </div>
                <div className={`font-[family-name:var(--font-mono)] text-xs leading-snug ${anyL5Purchased ? "text-text-primary" : "text-text-secondary"}`}>
                  Enemy must ID their Lieutenant during deployment &bull; +15 Army Points
                </div>
                {anyL5Purchased && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-cyan flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-void" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="square" d="M5 13l4 4L19 7" /></svg>
                  </div>
                )}
              </button>
            );
          })()}
        </div>

        {/* Commander Promotion — inline */}
        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-5 bg-amber" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Commander Promotion</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-surface-bright border-2 border-amber-dim flex items-center justify-center">
                <span className="font-[family-name:var(--font-orbitron)] text-2xl font-bold text-amber">{commanderLevel}</span>
              </div>
              <div>
                <div className="font-[family-name:var(--font-orbitron)] text-sm text-text-primary tracking-wider">LEVEL {commanderLevel}</div>
                <div className="font-[family-name:var(--font-mono)] text-xs text-text-secondary mt-1">COMMANDER RANK</div>
                <div className="flex gap-1 mt-2 w-32">
                  {[0, 1, 2, 3, 4, 5].map((lvl) => (
                    <div key={lvl} className={`flex-1 h-1.5 ${lvl <= commanderLevel ? "bg-amber" : "bg-surface-bright"} transition-colors`} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROMOTION_BENEFITS[commanderLevel]?.map((benefit, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-surface/50 border border-border/30">
                  <div className="w-1 h-4 bg-amber" />
                  <span className="font-[family-name:var(--font-mono)] text-xs text-text-primary">{benefit}</span>
                </div>
              ))}
              {commanderLevel > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green/5 border border-green-dim/30">
                  <div className="w-1 h-4 bg-green" />
                  <span className="font-[family-name:var(--font-mono)] text-xs text-green">2 free CEB skills per level (L1-L{commanderLevel})</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* SPEC-OPS — always available                             */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="panel p-4 sm:p-5 mb-8">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-green" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Spec-Ops Unit</h2>
            {specOps.length > 0 && <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary">{specOps[0].total_xp_spent} XP INVESTED</span>}
          </div>
          {!showAddSkill && (
            <button onClick={() => setShowAddSkill(true)} disabled={xpSummary.available < 1} className="px-4 py-2 border border-green-dim text-green font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase hover:bg-green/10 hover:border-green transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">+ ADD SKILL</button>
          )}
        </div>
        {showAddSkill && (
          <div className="mb-4 p-4 bg-surface/50 border border-green-dim/30 space-y-3">
            <div>
              <label className="data-label font-[family-name:var(--font-mono)] block mb-1">SKILL NAME</label>
              <input type="text" value={newSkillName} onChange={(e) => setNewSkillName(e.target.value)} placeholder="e.g. Mimetism -3" className="w-full font-[family-name:var(--font-mono)] text-sm" />
            </div>
            <div>
              <label className="data-label font-[family-name:var(--font-mono)] block mb-1">XP COST</label>
              <input type="number" min="1" value={newSkillXpCost} onChange={(e) => setNewSkillXpCost(Math.max(1, Number(e.target.value)))} className="w-24 font-[family-name:var(--font-mono)] text-sm text-center" />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button onClick={handleAddSkill} disabled={!newSkillName.trim() || xpSummary.available < newSkillXpCost} className="px-6 py-2 bg-green/20 border border-green text-green font-[family-name:var(--font-orbitron)] text-xs tracking-wider uppercase hover:bg-green/30 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">SAVE</button>
              <button onClick={() => { setShowAddSkill(false); setNewSkillName(""); setNewSkillXpCost(1); }} className="px-4 py-2 border border-border text-text-muted font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase hover:text-text-secondary hover:border-border-bright transition-all cursor-pointer">CANCEL</button>
              {xpSummary.available < newSkillXpCost && newSkillName.trim() && <span className="font-[family-name:var(--font-mono)] text-xs text-red">Not enough XP</span>}
            </div>
          </div>
        )}
        {specOps.length > 0 && specOps[0].upgrades && specOps[0].upgrades.length > 0 ? (
          <div className="space-y-2">
            {specOps[0].upgrades.map((upgrade, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 bg-surface/50 border border-border/30">
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary uppercase px-1.5 py-0.5 bg-surface-bright border border-border">{upgrade.type}</span>
                  <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary">{upgrade.name}</span>
                </div>
                <span className="font-[family-name:var(--font-mono)] text-sm text-green">{upgrade.xp_cost} XP</span>
              </div>
            ))}
          </div>
        ) : !showAddSkill && (
          <div className="text-center py-6">
            <p className="font-[family-name:var(--font-mono)] text-xs text-text-muted">No skills added yet. Click &quot;Add Skill&quot; to get started.</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* CONSUMABLES — always available                          */}
      {/* ═══════════════════════════════════════════════════════ */}
      <div className="panel p-4 sm:p-5 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-red" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-primary uppercase">Consumables — Chapter {chapterNumber}</h2>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-xs text-text-secondary sm:ml-auto pl-4 sm:pl-0">SINGLE USE / EXPIRES END OF CHAPTER</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {CONSUMABLE_DEFS.map((consumable) => {
            const isPurchased = purchasedConsumables.includes(consumable.key);
            const canAfford = xpSummary.available >= consumable.cost;
            return (
              <button key={consumable.key} disabled={isPurchased || !canAfford} onClick={() => !isPurchased && canAfford && handlePurchaseConsumable(consumable.key, consumable.cost)}
                className={`p-3 sm:p-4 border text-left transition-all duration-200 cursor-pointer ${
                  isPurchased ? "bg-red/10 border-red-dim/40" : canAfford ? "bg-surface/30 border-border/50 hover:border-amber-dim hover:bg-amber/5" : "bg-surface/20 border-border/30 opacity-40 cursor-not-allowed"
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-[family-name:var(--font-orbitron)] text-xs tracking-wider ${isPurchased ? "text-red" : "text-text-primary"}`}>{consumable.label.toUpperCase()}</span>
                  <span className={`font-[family-name:var(--font-mono)] text-xs font-bold ${isPurchased ? "text-red-dim" : "text-amber"}`}>{consumable.cost} XP</span>
                </div>
                <div className={`font-[family-name:var(--font-mono)] text-xs leading-relaxed ${isPurchased ? "text-text-muted" : "text-text-secondary"}`}>{consumable.description}</div>
                {isPurchased && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-red-dim/20 border border-red-dim/30">
                    <span className="font-[family-name:var(--font-mono)] text-xs text-red tracking-wider uppercase">PURCHASED</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
