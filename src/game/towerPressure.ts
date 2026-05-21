import type { FloorResultLevel, GameState, ShopActionId } from "../types/game";

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

const clampPressure = (value: number, max = 20) => Math.max(0, Math.min(max, value));

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

export function getShopCostForAction(
  actionId: ShopActionId,
  baseCost: number,
  towerPressure = 0,
  floorNumber = 1,
): number {
  const multiplier = getShopPriceMultiplierForAction(actionId, towerPressure, floorNumber);
  return Math.ceil(baseCost * multiplier);
}

export function getShopPriceMultiplierForAction(actionId: ShopActionId, towerPressure = 0, floorNumber = 1): number {
  const multiplier = getTowerPressureEffects(towerPressure).shopPriceMultiplier;
  if (!isEssentialShopAction(actionId)) return multiplier;
  const cap = floorNumber <= 3 ? 1.15 : floorNumber <= 5 ? 1.25 : floorNumber <= 10 ? 1.35 : 1.5;
  return Math.min(multiplier, cap);
}

export function isEssentialShopAction(actionId: ShopActionId): boolean {
  return actionId === "buy-food" || actionId === "buy-bandage" || actionId === "buy-medicine" || actionId === "inn-rest";
}

export function getCurrentTowerFloor(state: GameState): number {
  return getCurrentFloorNumber(state);
}

export function applyPressureForActivity(state: GameState, activity: TowerPressureActivity): GameState {
  const earlyFloor = getCurrentFloorNumber(state);
  const early = earlyFloor <= 3;
  const gain: Record<TowerPressureActivity, number> = {
    rest: early ? 0 : 1,
    "inn-rest": 1,
    train: early ? 1 : 2,
    trainer: early ? 1 : 2,
    gather: early ? 1 : 2,
    investigate: early ? 1 : 2,
    revisit: 1,
  };
  const repeated = state.consecutiveActivity?.type === activity ? state.consecutiveActivity.count : 1;
  const repeatExtra = repeated >= 3 ? 2 : repeated === 2 ? 1 : 0;
  return {
    ...state,
    towerPressure: clampPressure((state.towerPressure ?? 0) + gain[activity] + repeatExtra, getPressureCap(state)),
  };
}

export function isFloorClearSuccess(level: FloorResultLevel): boolean {
  return level === "greatSuccess" || level === "success" || level === "costlySuccess";
}

export function onNewFloorCleared(state: GameState): GameState {
  return {
    ...state,
    towerPressure: 0,
  };
}

export function applyPressureForTowerResult(state: GameState, level: FloorResultLevel, floor: number, isRevisit: boolean): GameState {
  if (isRevisit) return applyPressureForActivity(state, "revisit");

  if (isFloorClearSuccess(level)) {
    return onNewFloorCleared(state);
  }

  let change = 0;
  if (level === "criticalFailure") change = floor >= 20 ? 5 : floor >= 16 ? 4 : 3;
  else change = floor >= 20 ? 4 : floor >= 16 ? 3 : 2;

  return {
    ...state,
    towerPressure: clampPressure((state.towerPressure ?? 0) + change, getPressureCap(state)),
  };
}

export function clampTowerPressureForState(state: GameState): number {
  return clampPressure(state.towerPressure ?? 0, getPressureCap(state));
}

function getPressureCap(state: GameState) {
  const floor = getCurrentFloorNumber(state);
  if (floor <= 3) return 8;
  if (floor <= 5) return 12;
  return 20;
}

function getCurrentFloorNumber(state: GameState) {
  const character = state.character;
  if (!character) return 1;
  return Math.min(20, character.maxFloorCleared + 1);
}
