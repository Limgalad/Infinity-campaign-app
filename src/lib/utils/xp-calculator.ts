import type { GameResultType } from "@/lib/types/database";

/**
 * CEB level costs: must be purchased in order within each column.
 * Level 5 costs 20 XP and spans all columns.
 */
export const CEB_LEVEL_COSTS: Record<number, number> = {
  1: 2,
  2: 5,
  3: 9,
  4: 14,
  5: 20,
};

/**
 * Consumable costs by type.
 */
export const CONSUMABLE_COSTS: Record<string, number> = {
  reinforcements: 2,
  emergency_medical: 2,
  emergency_tech: 2,
  emergency_ordinance: 4,
  move_up: 4,
  defensive_measures: 4,
};

/**
 * Calculate XP earned from a game result.
 * Base: 1 OP = 1 XP (max 10 per chapter)
 * Win bonus: +1 for solo win, +3 for strike team win (both players won)
 */
export function calculateGameXP(
  objectivePoints: number,
  result: GameResultType,
  strikeTeamWin: boolean = false
): number {
  const baseXP = Math.min(objectivePoints, 10);
  const winBonus = result === "win" ? (strikeTeamWin ? 3 : 1) : 0;
  return baseXP + winBonus;
}

/**
 * Calculate the promotion roll target number.
 *
 * Base TN: 2
 * Modifiers:
 *   +3 if won the game
 *   +ceil(OP * 0.5) (50% of OP, rounded up)
 *   +1 if 75%+ of own army survived
 *   +1 if 25%+ of enemy army survived
 *   -1 if <25% of own army survived
 *   -level_modifier (0/3/6/9/12 for levels 0-4)
 *
 * Army survived is in points (0-300), converted to percentage for thresholds.
 */
export function calculatePromotionTN(params: {
  result: GameResultType;
  objectivePoints: number;
  armyPointsSurvived: number;
  enemyPointsSurvived: number;
  currentLevel: number;
}): { targetNumber: number; modifiers: Record<string, number> } {
  const armyPct = (params.armyPointsSurvived / 300) * 100;
  const enemyPct = (params.enemyPointsSurvived / 300) * 100;

  const modifiers: Record<string, number> = {
    base: 2,
  };

  if (params.result === "win") {
    modifiers.win_bonus = 3;
  }

  modifiers.op_bonus = Math.ceil(params.objectivePoints * 0.5);

  if (armyPct >= 75) {
    modifiers.army_survived = 1;
  } else if (armyPct < 25) {
    modifiers.army_low = -1;
  }

  if (enemyPct <= 25) {
    modifiers.enemy_destroyed = 1;
  }

  // Level modifier: makes promotion harder at higher levels
  const levelModifiers = [0, 3, 6, 9, 12];
  const levelPenalty = levelModifiers[params.currentLevel] ?? 12;
  if (levelPenalty > 0) {
    modifiers.level_penalty = -levelPenalty;
  }

  const targetNumber = Object.values(modifiers).reduce((sum, v) => sum + v, 0);

  return {
    targetNumber: Math.max(targetNumber, 2), // minimum TN is always 2
    modifiers,
  };
}

/**
 * Check if a promotion roll succeeded.
 */
export function isPromotionSuccess(roll: number, targetNumber: number): boolean {
  return roll <= targetNumber;
}

/**
 * Maximum donation: 50% of XP earned in the last chapter, rounded down.
 */
export function maxDonationAmount(xpEarnedInChapter: number): number {
  return Math.floor(xpEarnedInChapter * 0.5);
}

/**
 * Commander promotion level benefits summary.
 */
export const PROMOTION_BENEFITS: Record<number, string[]> = {
  0: ["Can activate 1 bonus in 1 CEB column"],
  1: ["Can activate 2 bonuses in 1 CEB column"],
  2: ["Can activate 2 bonuses in 2 CEB columns", "+1 to Initiative"],
  3: [
    "Can activate 3 bonuses in 2 CEB columns",
    "+1 to Initiative",
    "Lieutenant gains Strategos L1 or +1 Order",
  ],
  4: [
    "Can activate 3 bonuses in 3 CEB columns",
    "+2 to Initiative",
    "Lieutenant gains Strategos L1 or +1 Order",
  ],
  5: [
    "Can activate 3 bonuses in 4 CEB columns",
    "+3 to Initiative",
    "Lieutenant gains Strategos L1 or +1 Order",
    "Army Immune to Loss of Lieutenant/Retreat",
  ],
};
/**
 * Get CEB activation limits based on commander level.
 * Returns { maxColumns, maxBonusesPerColumn }
 */
export function getCebActivationLimits(commanderLevel: number): {
  maxColumns: number;
  maxBonusesPerColumn: number;
} {
  const limits: Record<number, { maxColumns: number; maxBonusesPerColumn: number }> = {
    0: { maxColumns: 1, maxBonusesPerColumn: 1 },
    1: { maxColumns: 1, maxBonusesPerColumn: 2 },
    2: { maxColumns: 2, maxBonusesPerColumn: 2 },
    3: { maxColumns: 2, maxBonusesPerColumn: 3 },
    4: { maxColumns: 3, maxBonusesPerColumn: 3 },
    5: { maxColumns: 4, maxBonusesPerColumn: 3 },
  };
  return limits[commanderLevel] ?? limits[0];
}
