import type { DifficultyMode } from "../types/game";

export const defaultDifficultyMode: DifficultyMode = "survival";

export const difficultySettings: Record<
  DifficultyMode,
  {
    nameTh: string;
    successChanceModifier: number;
    penaltyMultiplier: number;
    rewardMultiplier: number;
    deathRiskMultiplier: number;
  }
> = {
  story: {
    nameTh: "เรื่องเล่า",
    successChanceModifier: 15,
    penaltyMultiplier: 0.75,
    rewardMultiplier: 1.15,
    deathRiskMultiplier: 0.5,
  },
  survival: {
    nameTh: "เอาตัวรอด",
    successChanceModifier: 0,
    penaltyMultiplier: 1,
    rewardMultiplier: 1,
    deathRiskMultiplier: 1,
  },
  merciless: {
    nameTh: "หอคอยไร้ปรานี",
    successChanceModifier: -10,
    penaltyMultiplier: 1.35,
    rewardMultiplier: 0.85,
    deathRiskMultiplier: 1.25,
  },
};
