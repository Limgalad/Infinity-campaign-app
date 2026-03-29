"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Game Result Submission ────────────────────────────────

export async function submitAfterActionReport(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const chapterId = formData.get("chapterId") as string;
  const campaignId = formData.get("campaignId") as string;
  const objectivePoints = parseInt(formData.get("objectivePoints") as string) || 0;
  const result = formData.get("result") as string;
  const armySurvived = parseFloat(formData.get("armySurvived") as string);
  const enemySurvived = parseFloat(formData.get("enemySurvived") as string);

  if (!chapterId || !result) return { error: "Missing required fields" };

  // Check if player already submitted for this chapter
  const { data: existing } = await supabase
    .from("game_results")
    .select("id")
    .eq("player_id", user.id)
    .eq("chapter_id", chapterId)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "You already submitted a result for this chapter" };
  }

  // Calculate TP and XP
  const tp = result === "win" ? 3 : result === "draw" ? 2 : 1;
  const xpEarned = Math.min(objectivePoints, 10) + (result === "win" ? 1 : 0);

  const { error } = await supabase.from("game_results").insert({
    chapter_id: chapterId,
    player_id: user.id,
    objective_points: objectivePoints,
    result,
    tournament_points: tp,
    xp_earned: xpEarned,
    army_percentage_survived: isNaN(armySurvived) ? null : armySurvived,
    enemy_percentage_survived: isNaN(enemySurvived) ? null : enemySurvived,
    confirmed_by_opponent: false,
  });

  if (error) return { error: error.message };

  // Add XP ledger entry
  await supabase.from("xp_ledger").insert({
    player_id: user.id,
    campaign_id: campaignId,
    chapter_id: chapterId,
    source: "game",
    amount: xpEarned,
    description: `Game result: ${result} (${objectivePoints} OP)`,
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true };
}

// ─── Promotion Roll ────────────────────────────────────────

export async function submitPromotionRoll(formData: FormData): Promise<{ success?: boolean; error?: string; promoted?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const chapterId = formData.get("chapterId") as string;
  const campaignId = formData.get("campaignId") as string;
  const roll = parseInt(formData.get("roll") as string);
  const targetNumber = parseInt(formData.get("targetNumber") as string);

  if (isNaN(roll) || roll < 1 || roll > 20) return { error: "Roll must be 1-20" };

  const success = roll <= targetNumber;

  // Get current level
  const { data: promo } = await supabase
    .from("commander_promotions")
    .select("current_level")
    .eq("player_id", user.id)
    .eq("campaign_id", campaignId)
    .single();

  const currentLevel = promo?.current_level ?? 0;
  const newLevel = success ? currentLevel + 1 : null;

  // Record the roll
  await supabase.from("promotion_rolls").insert({
    player_id: user.id,
    chapter_id: chapterId,
    target_number: targetNumber,
    roll_result: roll,
    modifiers: {},
    success,
    promoted_to_level: newLevel,
  });

  // If promoted, update commander_promotions
  if (success && newLevel !== null && newLevel <= 5) {
    await supabase.from("commander_promotions").upsert(
      {
        player_id: user.id,
        campaign_id: campaignId,
        current_level: newLevel,
      },
      { onConflict: "player_id,campaign_id" }
    );
  }

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true, promoted: success };
}

// ─── CEB Purchase ──────────────────────────────────────────

export async function purchaseCebLevel(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const campaignId = formData.get("campaignId") as string;
  const columnType = formData.get("columnType") as string;
  const level = parseInt(formData.get("level") as string);
  const xpCost = parseInt(formData.get("xpCost") as string);
  const chapterNumber = parseInt(formData.get("chapterNumber") as string);
  const chapterId = formData.get("chapterId") as string;

  if (!columnType || isNaN(level) || isNaN(xpCost)) return { error: "Invalid parameters" };

  // Check if already purchased
  const { data: existing } = await supabase
    .from("command_experience")
    .select("id")
    .eq("player_id", user.id)
    .eq("campaign_id", campaignId)
    .eq("column_type", columnType)
    .eq("level", level)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "Already purchased this level" };
  }

  // Insert CEB purchase
  const { error } = await supabase.from("command_experience").insert({
    player_id: user.id,
    campaign_id: campaignId,
    column_type: columnType,
    level,
    xp_cost: xpCost,
    purchased_in_chapter: chapterNumber,
  });

  if (error) return { error: error.message };

  // Deduct XP
  await supabase.from("xp_ledger").insert({
    player_id: user.id,
    campaign_id: campaignId,
    chapter_id: chapterId,
    source: "ceb_purchase",
    amount: -xpCost,
    description: `CEB: ${columnType} L${level}`,
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true };
}

// ─── Consumable Purchase ───────────────────────────────────

export async function purchaseConsumable(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const campaignId = formData.get("campaignId") as string;
  const chapterId = formData.get("chapterId") as string;
  const consumableType = formData.get("consumableType") as string;
  const xpCost = parseInt(formData.get("xpCost") as string);

  if (!consumableType || isNaN(xpCost)) return { error: "Invalid parameters" };

  // Check if already purchased this consumable for this chapter
  const { data: existing } = await supabase
    .from("consumables")
    .select("id")
    .eq("player_id", user.id)
    .eq("chapter_id", chapterId)
    .eq("consumable_type", consumableType)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: "Already purchased this consumable for this chapter" };
  }

  const { error } = await supabase.from("consumables").insert({
    player_id: user.id,
    chapter_id: chapterId,
    consumable_type: consumableType,
    xp_cost: xpCost,
    used: false,
  });

  if (error) return { error: error.message };

  // Deduct XP
  await supabase.from("xp_ledger").insert({
    player_id: user.id,
    campaign_id: campaignId,
    chapter_id: chapterId,
    source: "consumable_purchase",
    amount: -xpCost,
    description: `Consumable: ${consumableType}`,
  });

  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true };
}
