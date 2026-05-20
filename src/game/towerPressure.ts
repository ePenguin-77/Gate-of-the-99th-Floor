import type { FloorResultLevel, GameState } from "../types/game";

export interface TowerPressureEffects {
  successChancePenalty: number;
  injuryRiskBonus: number;
  sicknessRiskBonus: number;
  shopPriceMultiplier: number;
  badIntelChanceBonus: number;
  gatherRiskBonus: number;
}

export type TowerPressureActivity =
  | "rest"
  | "inn-rest"
  | "train"
  | "trainer"
  | "gather"
  | "investigate"
  | "revisit";

const clampPressure = (value: number) => Math.max(0, Math.min(20, value));

export function getTowerPressureLevel(towerPressure: number) {
  if (towerPressure >= 13) {
    return {
      label: "หอคอยตื่นตัว",
      description: "หอคอยกำลังบิดกฎของมัน การรอคอยนานเกินไปอาจทำให้ทุกอย่างเลวร้ายลง",
    };
  }
  if (towerPressure >= 8) {
    return {
      label: "กดดัน",
      description: "ข่าวลือเริ่มบิดเบี้ยว ผู้คนพูดน้อยลง และทางขึ้นหอคอยดูไกลกว่าที่เคย",
    };
  }
  if (towerPressure >= 4) {
    return {
      label: "เริ่มจับตามอง",
      description: "บรรยากาศรอบเมืองพักพิงเริ่มหนักขึ้น ราวกับหอคอยรับรู้ถึงความลังเล",
    };
  }
  return {
    label: "สงบนิ่ง",
    description: "หอคอยยังเงียบงัน แต่ความเงียบนั้นไม่เคยปลอดภัยจริง",
  };
}

export function getTowerPressureEffects(towerPressure: number): TowerPressureEffects {
  if (towerPressure >= 13) {
    return {
      successChancePenalty: -15,
      injuryRiskBonus: 18,
      sicknessRiskBonus: 15,
      shopPriceMultiplier: 1.5,
      badIntelChanceBonus: 18,
      gatherRiskBonus: 20,
    };
  }
  if (towerPressure >= 8) {
    return {
      successChancePenalty: -8,
      injuryRiskBonus: 10,
      sicknessRiskBonus: 8,
      shopPriceMultiplier: 1.25,
      badIntelChanceBonus: 10,
      gatherRiskBonus: 12,
    };
  }
  if (towerPressure >= 4) {
    return {
      successChancePenalty: -3,
      injuryRiskBonus: 5,
      sicknessRiskBonus: 3,
      shopPriceMultiplier: 1.1,
      badIntelChanceBonus: 5,
      gatherRiskBonus: 5,
    };
  }
  return {
    successChancePenalty: 0,
    injuryRiskBonus: 0,
    sicknessRiskBonus: 0,
    shopPriceMultiplier: 1,
    badIntelChanceBonus: 0,
    gatherRiskBonus: 0,
  };
}

export function getPressureWarningLines(towerPressure: number): string[] {
  const effects = getTowerPressureEffects(towerPressure);
  const lines: string[] = [];
  if (effects.successChancePenalty < 0) lines.push("โอกาสผ่านชั้นถัดไปลดลง");
  if (effects.badIntelChanceBonus > 0) lines.push("การสืบข่าวมีโอกาสเจอข้อมูลปลอมหรือคนไม่หวังดีมากขึ้น");
  if (effects.gatherRiskBonus > 0) lines.push("การออกหาเสบียงเสี่ยงบาดเจ็บหรือป่วยมากขึ้น");
  if (effects.shopPriceMultiplier > 1) lines.push("ราคาตลาดสูงขึ้นจากความกดดันของหอคอย");
  return lines.length > 0 ? lines : ["ยังไม่มีผลกดดันชัดเจน แต่หอคอยไม่เคยหลับจริง"];
}

export function getShopCost(baseCost: number, towerPressure = 0): number {
  return Math.ceil(baseCost * getTowerPressureEffects(towerPressure).shopPriceMultiplier);
}

export function applyPressureForActivity(state: GameState, activity: TowerPressureActivity): GameState {
  const gain: Record<TowerPressureActivity, number> = {
    rest: 1,
    "inn-rest": 1,
    train: 2,
    trainer: 2,
    gather: 2,
    investigate: 2,
    revisit: 1,
  };
  return {
    ...state,
    towerPressure: clampPressure((state.towerPressure ?? 0) + gain[activity]),
  };
}

export function applyPressureForTowerResult(state: GameState, level: FloorResultLevel, floor: number, isRevisit: boolean): GameState {
  if (isRevisit) return applyPressureForActivity(state, "revisit");

  let change = 0;
  if (level === "greatSuccess") change = floor >= 20 ? -8 : floor === 10 ? -6 : floor >= 11 ? -4 : -4;
  else if (level === "success" || level === "costlySuccess") change = floor === 10 || floor >= 20 ? -6 : floor >= 11 ? -3 : -3;
  else if (level === "criticalFailure") change = floor >= 20 ? 5 : floor >= 16 ? 4 : 3;
  else change = floor >= 20 ? 4 : floor >= 16 ? 3 : 2;

  return {
    ...state,
    towerPressure: clampPressure(floor === 10 && change < 0 ? 0 : (state.towerPressure ?? 0) + change),
  };
}
