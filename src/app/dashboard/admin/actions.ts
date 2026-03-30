"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Campaigns ──────────────────────────────────────────────

export async function createCampaign(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const totalChapters = parseInt(formData.get("totalChapters") as string) || 6;

  if (!name?.trim()) return { error: "Campaign name is required" };

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      total_chapters: totalChapters,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/campaigns");
  revalidatePath("/dashboard/campaigns");
  revalidatePath("/dashboard");
  return { success: true, id: data.id };
}

export async function updateCampaign(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const totalChapters = parseInt(formData.get("totalChapters") as string) || 6;

  if (!name?.trim()) return { error: "Campaign name is required" };

  const { error } = await supabase
    .from("campaigns")
    .update({
      name: name.trim(),
      description: description?.trim() || null,
      total_chapters: totalChapters,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/campaigns");
  revalidatePath("/dashboard/campaigns");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCampaign(formData: FormData) {
  const supabase = await createClient();
  const id = formData.get("id") as string;

  const { error } = await supabase.from("campaigns").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/campaigns");
  revalidatePath("/dashboard/campaigns");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Chapters ───────────────────────────────────────────────

export async function createChapter(formData: FormData) {
  const supabase = await createClient();

  const campaignId = formData.get("campaignId") as string;
  const chapterNumber = parseInt(formData.get("chapterNumber") as string);
  const name = formData.get("name") as string;
  const missionName = formData.get("missionName") as string;
  const startDate = formData.get("startDate") as string;

  if (!name?.trim()) return { error: "Chapter name is required" };
  if (!chapterNumber) return { error: "Chapter number is required" };

  const { error } = await supabase.from("chapters").insert({
    campaign_id: campaignId,
    chapter_number: chapterNumber,
    name: name.trim(),
    mission_name: missionName?.trim() || null,
    start_date: startDate || null,
    is_active: false,
    is_completed: false,
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/chapters`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateChapter(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const campaignId = formData.get("campaignId") as string;
  const name = formData.get("name") as string;
  const missionName = formData.get("missionName") as string;
  const startDate = formData.get("startDate") as string;

  if (!name?.trim()) return { error: "Chapter name is required" };

  const { error } = await supabase
    .from("chapters")
    .update({
      name: name.trim(),
      mission_name: missionName?.trim() || null,
      start_date: startDate || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/chapters`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setChapterStatus(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const campaignId = formData.get("campaignId") as string;
  const status = formData.get("status") as string; // "upcoming" | "active" | "completed"

  // If activating a chapter, deactivate all others first
  if (status === "active") {
    await supabase
      .from("chapters")
      .update({ is_active: false })
      .eq("campaign_id", campaignId);
  }

  const updates =
    status === "active"
      ? { is_active: true, is_completed: false }
      : status === "completed"
        ? { is_active: false, is_completed: true }
        : { is_active: false, is_completed: false };

  const { error } = await supabase
    .from("chapters")
    .update(updates)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/chapters`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteChapter(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const campaignId = formData.get("campaignId") as string;

  const { error } = await supabase.from("chapters").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/chapters`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Players ────────────────────────────────────────────────

export async function updatePlayer(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const displayName = formData.get("displayName") as string;
  const faction = formData.get("faction") as string;
  const sectorial = formData.get("sectorial") as string;
  const role = formData.get("role") as string;

  if (!displayName?.trim()) return { error: "Display name is required" };

  const { error } = await supabase
    .from("players")
    .update({
      display_name: displayName.trim(),
      faction: faction?.trim() || null,
      sectorial: sectorial?.trim() || null,
      role: role === "admin" ? "admin" : "player",
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/players");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Strike Teams ───────────────────────────────────────────

export async function createStrikeTeam(formData: FormData) {
  const supabase = await createClient();

  const campaignId = formData.get("campaignId") as string;
  const name = formData.get("name") as string;
  const player1Id = formData.get("player1Id") as string;
  const player2Id = formData.get("player2Id") as string;

  if (!name?.trim()) return { error: "Team name is required" };
  if (!player1Id || !player2Id) return { error: "Both players must be selected" };
  if (player1Id === player2Id) return { error: "Players must be different" };

  const { error } = await supabase.from("strike_teams").insert({
    campaign_id: campaignId,
    name: name.trim(),
    player1_id: player1Id,
    player2_id: player2Id,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/strike-teams");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateStrikeTeam(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const campaignId = formData.get("campaignId") as string;
  const name = formData.get("name") as string;
  const player1Id = formData.get("player1Id") as string;
  const player2Id = formData.get("player2Id") as string;

  if (!name?.trim()) return { error: "Team name is required" };
  if (!player1Id || !player2Id) return { error: "Both players must be selected" };
  if (player1Id === player2Id) return { error: "Players must be different" };

  const { error } = await supabase
    .from("strike_teams")
    .update({
      name: name.trim(),
      player1_id: player1Id,
      player2_id: player2Id,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/strike-teams");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteStrikeTeam(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const campaignId = formData.get("campaignId") as string;

  const { error } = await supabase.from("strike_teams").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/strike-teams");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Matches ────────────────────────────────────────────────

export async function createMatch(formData: FormData) {
  const supabase = await createClient();

  const chapterId = formData.get("chapterId") as string;
  const campaignId = formData.get("campaignId") as string;
  const strikeTeam1Id = formData.get("strikeTeam1Id") as string;
  const strikeTeam2Id = formData.get("strikeTeam2Id") as string;

  if (!strikeTeam1Id || !strikeTeam2Id) return { error: "Both strike teams must be selected" };
  if (strikeTeam1Id === strikeTeam2Id) return { error: "Teams must be different" };

  const { error } = await supabase.from("matches").insert({
    chapter_id: chapterId,
    strike_team_1_id: strikeTeam1Id,
    strike_team_2_id: strikeTeam2Id,
    status: "scheduled",
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/matchmaking`);
  return { success: true };
}

export async function updateMatchStatus(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const campaignId = formData.get("campaignId") as string;
  const status = formData.get("status") as string;

  const { error } = await supabase
    .from("matches")
    .update({ status })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/matchmaking`);
  return { success: true };
}

export async function deleteMatch(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const campaignId = formData.get("campaignId") as string;

  const { error } = await supabase.from("matches").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/matchmaking`);
  return { success: true };
}

// ─── Game Results (Admin) ───────────────────────────────────

export async function submitGameResult(formData: FormData) {
  const supabase = await createClient();

  const chapterId = formData.get("chapterId") as string;
  const campaignId = formData.get("campaignId") as string;
  const playerId = formData.get("playerId") as string;
  const opponentPlayerId = formData.get("opponentPlayerId") as string;
  const objectivePoints = parseInt(formData.get("objectivePoints") as string) || 0;
  const result = formData.get("result") as string;
  const armySurvived = parseFloat(formData.get("armySurvived") as string);
  const enemySurvived = parseFloat(formData.get("enemySurvived") as string);

  if (!playerId || !result) return { error: "Player and result are required" };

  // Calculate XP: 1 per OP (max 10) + win bonus
  const xpEarned = Math.min(objectivePoints, 10) + (result === "win" ? 1 : 0);

  const { error } = await supabase.from("game_results").insert({
    chapter_id: chapterId,
    player_id: playerId,
    opponent_player_id: opponentPlayerId || null,
    objective_points: objectivePoints,
    result,
    xp_earned: xpEarned,
    army_percentage_survived: isNaN(armySurvived) ? null : armySurvived,
    enemy_percentage_survived: isNaN(enemySurvived) ? null : enemySurvived,
    confirmed_by_opponent: true,
  });

  if (error) return { error: error.message };

  // Also insert XP ledger entry
  await supabase.from("xp_ledger").insert({
    player_id: playerId,
    campaign_id: campaignId,
    chapter_id: chapterId,
    source: "game",
    amount: xpEarned,
    description: `Game result: ${result} (${objectivePoints} OP)`,
  });

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/matchmaking`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteGameResult(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get("id") as string;
  const campaignId = formData.get("campaignId") as string;

  // Get the result first to reverse XP
  const { data: result } = await supabase
    .from("game_results")
    .select("player_id, chapter_id, xp_earned")
    .eq("id", id)
    .single();

  if (result) {
    // Remove matching XP ledger entry
    await supabase
      .from("xp_ledger")
      .delete()
      .eq("player_id", result.player_id)
      .eq("chapter_id", result.chapter_id)
      .eq("source", "game")
      .eq("amount", result.xp_earned);
  }

  const { error } = await supabase.from("game_results").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/matchmaking`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── XP Adjustments (Admin) ─────────────────────────────────

export async function adjustPlayerXp(formData: FormData) {
  const supabase = await createClient();

  const playerId = formData.get("playerId") as string;
  const campaignId = formData.get("campaignId") as string;
  const amount = parseInt(formData.get("amount") as string);
  const reason = formData.get("reason") as string;

  if (!amount || amount === 0) return { error: "Amount must be non-zero" };
  if (!reason?.trim()) return { error: "Reason is required for admin adjustments" };

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id")
    .eq("campaign_id", campaignId)
    .order("chapter_number")
    .limit(1);

  const chapterId = chapters?.[0]?.id;
  if (!chapterId) return { error: "No chapters found in this campaign" };

  const { error } = await supabase.from("xp_ledger").insert({
    player_id: playerId,
    campaign_id: campaignId,
    chapter_id: chapterId,
    source: "game",
    amount,
    description: `[ADMIN] ${reason.trim()}`,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/players");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Chapter Reset ──────────────────────────────────────────

export async function resetPlayerChapter(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const playerId = formData.get("playerId") as string;
  const chapterId = formData.get("chapterId") as string;
  const campaignId = formData.get("campaignId") as string;

  if (!playerId || !chapterId || !campaignId) return { error: "Missing required fields" };

  await supabase.from("game_results").delete().eq("player_id", playerId).eq("chapter_id", chapterId);
  await supabase.from("xp_ledger").delete().eq("player_id", playerId).eq("chapter_id", chapterId);
  await supabase.from("consumables").delete().eq("player_id", playerId).eq("chapter_id", chapterId);
  await supabase.from("ceb_activations").delete().eq("player_id", playerId).eq("chapter_id", chapterId);
  await supabase.from("promotion_rolls").delete().eq("player_id", playerId).eq("chapter_id", chapterId);

  revalidatePath("/dashboard/admin/players");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function resetEntireChapter(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const chapterId = formData.get("chapterId") as string;
  const campaignId = formData.get("campaignId") as string;

  if (!chapterId || !campaignId) return { error: "Missing chapter or campaign ID" };

  await supabase.from("game_results").delete().eq("chapter_id", chapterId);
  await supabase.from("xp_ledger").delete().eq("chapter_id", chapterId);
  await supabase.from("consumables").delete().eq("chapter_id", chapterId);
  await supabase.from("ceb_activations").delete().eq("chapter_id", chapterId);
  await supabase.from("promotion_rolls").delete().eq("chapter_id", chapterId);
  await supabase.from("matches").delete().eq("chapter_id", chapterId);

  revalidatePath(`/dashboard/admin/campaigns/${campaignId}/chapters`);
  revalidatePath(`/dashboard/admin/matchmaking`);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── CEB Reset (Admin) ─────────────────────────────────────

export async function resetPlayerCebSkills(formData: FormData): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();

  const playerId = formData.get("playerId") as string;
  const campaignId = formData.get("campaignId") as string;

  if (!playerId || !campaignId) return { error: "Missing player or campaign ID" };

  // Delete all CEB entries for this player in this campaign
  const { error: cebError } = await supabase
    .from("command_experience")
    .delete()
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId);

  if (cebError) return { error: cebError.message };

  // Remove all CEB-related XP ledger entries (refund the XP)
  await supabase
    .from("xp_ledger")
    .delete()
    .eq("player_id", playerId)
    .eq("campaign_id", campaignId)
    .eq("source", "ceb_purchase");

  revalidatePath("/dashboard/admin/players");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function overrideCommanderLevel(formData: FormData) {
  const supabase = await createClient();

  const playerId = formData.get("playerId") as string;
  const campaignId = formData.get("campaignId") as string;
  const level = parseInt(formData.get("level") as string);

  if (isNaN(level) || level < 0 || level > 5) return { error: "Level must be 0-5" };

  const { error } = await supabase
    .from("commander_promotions")
    .upsert({
      player_id: playerId,
      campaign_id: campaignId,
      current_level: level,
    }, { onConflict: "player_id,campaign_id" });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/players");
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
