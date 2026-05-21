import { floors } from "../data/floors";
import { estimateTowerAttempt } from "./eventResolver";
import { getShopBaseCost } from "./shopSystem";
import { getShopCostForAction } from "./towerPressure";
import type { FloorIntel, GameState, PreparationBuff } from "../types/game";

export type HubRecommendationTone = "safe" | "warning" | "danger" | "growth" | "resource";
export type HubRecommendationCategory = "recommended" | "caution" | "notRecommended";

export type HubRecommendationActionType =
  | "challenge"
  | "investigate"
  | "rest"
  | "innRest"
  | "eatFood"
  | "gather"
  | "prepareGear"
  | "buyFood"
  | "treatInjury"
  | "treatSickness"
  | "inventory";

export interface HubRecommendation {
  id: string;
  titleTh: string;
  descriptionTh: string;
  reasonTh: string;
  riskTh?: string;
  actionType?: HubRecommendationActionType;
  actionTypes?: HubRecommendationActionType[];
  priority: number;
  tone: HubRecommendationTone;
  category: HubRecommendationCategory;
  estimatedChanceBefore?: number;
  estimatedChanceAfter?: number;
  chanceDelta?: number;
  helpsSurvival?: boolean;
}

export interface HubRecommendationContext {
  estimatedChance?: number;
  floorNumber?: number;
  usefulItemCount?: number;
  canPrepareGear?: boolean;
}

interface SimulatedAction {
  actionType: HubRecommendationActionType;
  titleTh: string;
  descriptionTh: string;
  reasonTh: string;
  riskTh: string;
  priority: number;
  tone: HubRecommendationTone;
  state: GameState;
  necessary?: boolean;
}

export function getHubRecommendations(
  gameState: GameState,
  context: HubRecommendationContext = {},
): HubRecommendation[] {
  const character = gameState.character;
  if (!character) return [];

  const floorNumber = context.floorNumber ?? Math.min(20, character.maxFloorCleared + 1);
  const floor = floors.find((item) => item.floor === floorNumber);
  if (!floor) return [];

  const beforeChance = context.estimatedChance ?? estimateChance(gameState, floorNumber);
  const hasFloorIntel =
    Boolean(gameState.floorIntel?.expiresAfterNextTower) ||
    Boolean(gameState.floorIntel && gameState.floorIntel.floorNumber === floorNumber);
  const hasPreparation = Boolean(gameState.preparationBuff?.expiresAfterNextTower);
  const usefulItemCount = context.usefulItemCount ?? 0;
  const { hunger, fatigue, injury, sickness, morale, hope } = character.survival;
  const badStatusesAreLow =
    hunger < 40 &&
    fatigue < 40 &&
    injury < 20 &&
    sickness < 20 &&
    morale >= 45 &&
    hope >= 45;

  const simulated = buildSimulatedActions(gameState, floorNumber, {
    hasFloorIntel,
    hasPreparation,
    usefulItemCount,
      canPrepareGear: context.canPrepareGear ?? character.gold >= getActionCost(gameState, "prepare-gear"),
  }).map((action) => toRecommendation(action, beforeChance, estimateChance(action.state, floorNumber)));

  const recommendedPool = simulated
    .filter((item) => item.category === "recommended")
    .sort(sortRecommendations);
  const cautionPool = simulated
    .filter((item) => item.category === "caution")
    .sort(sortRecommendations);
  const notRecommendedPool = simulated
    .filter((item) => item.category === "notRecommended")
    .sort(sortRecommendations);

  const recommendations: HubRecommendation[] = [];

  if (floorNumber <= 3 && character.maxFloorCleared < 3) {
    recommendations.push({
      id: "early-survival-note",
      titleTh: "ช่วงเริ่มต้นของการเอาตัวรอด",
      descriptionTh:
        "คุณไม่จำเป็นต้องรีบขึ้นหอคอยทันที การพัก สืบข่าว หรือหาเสบียงก่อนอาจช่วยได้ แต่ควรดูผลต่อสภาพร่างกายด้วย",
      reasonTh: "ระบบจะแนะนำเฉพาะทางเลือกที่น่าจะช่วยหรืออย่างน้อยไม่ทำให้สถานการณ์แย่ลงทันที",
      riskTh: "การเตรียมตัวซ้ำๆ ยังเพิ่มความกดดันของหอคอยได้",
      priority: 120,
      tone: "safe",
      category: "caution",
    });
  }

  if ((gameState.towerPressure ?? 0) >= 10) {
    recommendations.push({
      id: "tower-pressure-high",
      titleTh: "หอคอยกดดันสูงแล้ว",
      descriptionTh:
        "หากสภาพยังพอไหว ควรตัดสินใจขึ้นหอคอยก่อนแรงกดดันจะหนักกว่านี้",
      reasonTh: `ความกดดันตอนนี้อยู่ที่ ${gameState.towerPressure ?? 0}/20`,
      riskTh: "การเตรียมตัวซ้ำอาจทำให้โอกาสรอดลดลงมากกว่าเดิม",
      actionType: badStatusesAreLow || beforeChance >= 45 ? "challenge" : undefined,
      priority: 118,
      tone: "warning",
      category: badStatusesAreLow || beforeChance >= 45 ? "recommended" : "caution",
      estimatedChanceBefore: beforeChance,
      estimatedChanceAfter: beforeChance,
      chanceDelta: 0,
      helpsSurvival: beforeChance >= 45,
    });
  }

  if (beforeChance >= 60) {
    recommendations.push({
      id: "ready-to-challenge",
      titleTh: "พร้อมขึ้นหอคอย",
      descriptionTh: "โอกาสผ่านอยู่ในระดับดีพอ การเตรียมตัวเพิ่มอาจไม่คุ้มกับแรงกดดันที่สะสม",
      reasonTh: `โอกาสผ่านโดยประมาณตอนนี้ ${beforeChance}%`,
      riskTh: "ยังมีความเสี่ยงตามชั้น แต่ไม่จำเป็นต้องยื้อเวลาโดยไม่มีเหตุผล",
      actionType: "challenge",
      priority: 116,
      tone: "safe",
      category: "recommended",
      estimatedChanceBefore: beforeChance,
      estimatedChanceAfter: beforeChance,
      chanceDelta: 0,
      helpsSurvival: true,
    });
  } else if (beforeChance >= 45 && beforeChance < 60) {
    recommendations.push({
      id: "can-risk",
      titleTh: "พอเสี่ยงได้",
      descriptionTh: "สภาพตอนนี้ยังไม่สมบูรณ์แบบ แต่พอจะขึ้นหอคอยได้ หากจะเตรียมตัวเพิ่มควรเลือกเพียงอย่างที่ช่วยจริง",
      reasonTh: `โอกาสผ่านโดยประมาณตอนนี้ ${beforeChance}%`,
      riskTh: "เตรียมตัวมากเกินไปจะเพิ่มความกดดันของหอคอย",
      actionType: "challenge",
      priority: 86,
      tone: "warning",
      category: "caution",
      estimatedChanceBefore: beforeChance,
      estimatedChanceAfter: beforeChance,
      chanceDelta: 0,
      helpsSurvival: true,
    });
  }

  if (beforeChance < 35) {
    recommendations.push(...recommendedPool.filter((item) => item.chanceDelta !== undefined && item.chanceDelta >= 0).slice(0, 2));
    recommendations.push(...cautionPool.filter((item) => item.helpsSurvival || item.actionType === "eatFood").slice(0, 2));
    recommendations.push(...notRecommendedPool.slice(0, 1));
  } else {
    recommendations.push(...recommendedPool.slice(0, beforeChance >= 45 ? 1 : 2));
    recommendations.push(...cautionPool.slice(0, 2));
    recommendations.push(...notRecommendedPool.slice(0, 1));
  }

  return uniqueRecommendations(recommendations).sort(sortRecommendations).slice(0, 6);
}

function buildSimulatedActions(
  gameState: GameState,
  floorNumber: number,
  flags: { hasFloorIntel: boolean; hasPreparation: boolean; usefulItemCount: number; canPrepareGear: boolean },
): SimulatedAction[] {
  const character = gameState.character;
  if (!character) return [];
  const { hunger, fatigue, injury, sickness } = character.survival;
  const actions: SimulatedAction[] = [];
  const add = (action: Omit<SimulatedAction, "state">, state: GameState) => actions.push({ ...action, state });
  const foodCost = getActionCost(gameState, "buy-food");
  const innCost = getActionCost(gameState, "inn-rest");
  const bandageCost = getActionCost(gameState, "buy-bandage");
  const medicineCost = getActionCost(gameState, "buy-medicine");

  if (fatigue >= 35 || hunger < 35) {
    add({
      actionType: "rest",
      titleTh: "พักผ่อน",
      descriptionTh: "ลดความเหนื่อยล้าและช่วยให้ร่างกายตั้งหลัก โดยเฉพาะช่วงต้นเกม",
      reasonTh: fatigue >= 50 ? "ความเหนื่อยล้าคือปัจจัยที่ฉุดโอกาสรอดมากที่สุด" : "การพักช่วยให้สภาพโดยรวมมั่นคงขึ้น",
      riskTh: "ใช้อาหารถ้ามี และเพิ่มความกดดันเล็กน้อย",
      priority: fatigue >= 60 ? 105 : 82,
      tone: "safe",
    }, simulateRest(gameState));
  }

  if (fatigue >= 50 && character.gold >= innCost) {
    add({
      actionType: "innRest",
      titleTh: "พักโรงเตี๊ยม",
      descriptionTh: "จ่ายทองเพื่อพักพร้อมอาหารร้อน ช่วยลดความเหนื่อยล้าและความหิวได้ชัดเจน",
      reasonTh: "ความเหนื่อยล้าสูง และยังมีทองพอใช้บริการโรงเตี๊ยม",
      riskTh: `ใช้ทอง ${innCost} แต่เป็นวิธีฟื้นตัวที่มั่นคงกว่าการพักธรรมดา`,
      priority: fatigue >= 70 ? 112 : 92,
      tone: "safe",
    }, simulateInnRest(gameState));
  }

  if (hunger >= 35 && character.food > 0) {
    add({
      actionType: "eatFood",
      titleTh: "กินอาหาร",
      descriptionTh: "ลดความหิวทันทีโดยไม่เพิ่มความเหนื่อยล้าหรือแรงกดดันของหอคอย",
      reasonTh: hunger >= 50 ? "ความหิวเริ่มทำให้สมาธิและการตัดสินใจแย่ลง" : "การกินอาหารช่วยรักษาสภาพก่อนขึ้นหอคอย",
      riskTh: "ใช้เสบียงหนึ่งส่วน",
      priority: hunger >= 60 ? 108 : 90,
      tone: "resource",
    }, simulateEatFood(gameState));
  }

  if (hunger >= 50 && character.food <= 0 && character.gold >= foodCost) {
    add({
      actionType: "buyFood",
      titleTh: "ซื้ออาหาร",
      descriptionTh: "เพิ่มเสบียงเพื่อใช้พักหรือกินลดความหิวในจังหวะที่จำเป็น",
      reasonTh: "ไม่มีอาหารเหลือ แต่ยังมีทองพอซื้อเสบียง",
      riskTh: `ใช้ทอง ${foodCost} และควรเก็บไว้กินในจังหวะที่หิวจริง`,
      priority: 98,
      tone: "resource",
      necessary: true,
    }, simulateBuyFood(gameState));
  }

  if (!flags.hasFloorIntel && (gameState.towerPressure ?? 0) < 10 && fatigue < 70 && hunger < 70) {
    add({
      actionType: "investigate",
      titleTh: "สืบข่าวชั้นถัดไป",
      descriptionTh: "อาจได้ข้อมูลช่วยอ่านอันตรายของชั้นถัดไปก่อนขึ้นจริง",
      reasonTh: "ยังไม่มีข้อมูลยืนยันเกี่ยวกับชั้นถัดไป",
      riskTh: "ข่าวอาจผิด และใช้เวลาเพิ่มความหิว ความเหนื่อย และแรงกดดัน",
      priority: 78,
      tone: "growth",
    }, simulateInvestigation(gameState, floorNumber));
  }

  if (!flags.hasPreparation && flags.canPrepareGear) {
    add({
      actionType: "prepareGear",
      titleTh: "เตรียมอุปกรณ์ขึ้นหอคอย",
      descriptionTh: "เพิ่มโอกาสรอดและลดความเสี่ยงบาดเจ็บในการขึ้นหอคอยครั้งถัดไป",
      reasonTh: "ยังไม่มีผลเตรียมตัวสำหรับชั้นนี้",
      riskTh: "ใช้ทองและเพิ่มแรงกดดันเล็กน้อย",
      priority: 76,
      tone: "warning",
    }, simulatePrepareGear(gameState));
  }

  if (character.food <= 1 && fatigue < 65) {
    add({
      actionType: "gather",
      titleTh: "ออกหาเสบียง",
      descriptionTh: "จำเป็นเมื่อเสบียงใกล้หมด แต่ไม่ใช่ทางลัดเพิ่มโอกาสผ่านทันทีเสมอไป",
      reasonTh: "อาหารเหลือน้อย การไม่มีเสบียงทำให้พักหรือแก้ความหิวได้ยาก",
      riskTh: "เพิ่มความเหนื่อย ความหิว และอาจบาดเจ็บหากสภาพแย่",
      priority: character.food <= 0 ? 88 : 68,
      tone: "resource",
      necessary: character.food <= 0,
    }, simulateGather(gameState));
  } else if (character.food <= 1 || character.gold <= 5) {
    add({
      actionType: "gather",
      titleTh: "ออกหาเสบียง",
      descriptionTh: "จำเป็นระยะยาว แต่ไม่ช่วยการขึ้นชั้นทันทีหากตอนนี้เหนื่อยหรือหิวมาก",
      reasonTh: "ทรัพยากรเหลือน้อย แต่สภาพร่างกายอาจไม่พร้อมออกไปเสี่ยง",
      riskTh: "อาจทำให้โอกาสผ่านชั้นถัดไปลดลงชั่วคราว",
      priority: 50,
      tone: "warning",
      necessary: true,
    }, simulateGather(gameState));
  }

  if (injury >= 30 && character.gold >= bandageCost) {
    add({
      actionType: "treatInjury",
      titleTh: "รักษาบาดแผล",
      descriptionTh: "บาดแผลลดโอกาสผ่าน โดยเฉพาะชั้นที่ต้องปะทะหรือเสี่ยงกับดัก",
      reasonTh: "บาดแผลยังไม่หายดี",
      riskTh: "ต้องใช้ทองหรือไอเทมรักษา",
      priority: 94,
      tone: "danger",
    }, simulateTreatment(gameState, "injury"));
  }

  if (sickness >= 30 && character.gold >= medicineCost) {
    add({
      actionType: "treatSickness",
      titleTh: "รักษาอาการป่วย",
      descriptionTh: "อาการป่วยทำให้เหนื่อยง่ายและทำให้โอกาสรอดลดลงเรื่อยๆ",
      reasonTh: "ร่างกายเริ่มไม่มั่นคง",
      riskTh: "ต้องใช้ทองหรือไอเทมรักษา",
      priority: 94,
      tone: "danger",
    }, simulateTreatment(gameState, "sickness"));
  }

  return actions;
}

function toRecommendation(action: SimulatedAction, beforeChance: number, afterChance: number): HubRecommendation {
  const chanceDelta = afterChance - beforeChance;
  const helpsSurvival = chanceDelta > 0 || (action.necessary && chanceDelta >= -2);
  const category: HubRecommendationCategory =
    chanceDelta > 0
      ? "recommended"
      : action.necessary && chanceDelta >= -4
        ? "caution"
        : chanceDelta === 0
          ? "caution"
          : "notRecommended";
  return {
    id: action.actionType,
    titleTh: action.titleTh,
    descriptionTh:
      category === "notRecommended"
        ? action.descriptionTh.replace("ช่วย", "อาจช่วย")
        : action.descriptionTh,
    reasonTh: action.reasonTh,
    riskTh: action.riskTh,
    actionType: category === "notRecommended" ? undefined : action.actionType,
    priority: action.priority + Math.max(-20, Math.min(20, chanceDelta * 3)),
    tone: category === "notRecommended" ? "warning" : action.tone,
    category,
    estimatedChanceBefore: beforeChance,
    estimatedChanceAfter: afterChance,
    chanceDelta,
    helpsSurvival,
  };
}

function estimateChance(gameState: GameState, floorNumber: number) {
  const character = gameState.character;
  const floor = floors.find((item) => item.floor === floorNumber);
  if (!character || !floor) return 0;
  return estimateTowerAttempt(
    character,
    floor,
    "whisper",
    false,
    gameState.preparationBuff,
    gameState.floorIntel,
    gameState.difficultyMode,
    gameState.divineStrain ?? 0,
    gameState.towerPressure ?? 0,
  ).chance;
}

function simulateRest(gameState: GameState): GameState {
  const state = cloneState(gameState);
  const character = state.character!;
  const early = character.maxFloorCleared < 3 || character.currentFloor <= 3;
  const eatsFood = character.food > 0;
  character.survival.fatigue = clamp(character.survival.fatigue - (early ? 32 : 24));
  character.survival.hunger = clamp(character.survival.hunger + (early ? 4 : 10) + (eatsFood ? -(early ? 18 : 15) : 8));
  character.survival.morale = clamp(character.survival.morale + (eatsFood ? (early ? 3 : 2) : -1));
  if (eatsFood) character.food = Math.max(0, character.food - 1);
  state.towerPressure = addPreviewPressure(state, early ? 0 : 1);
  return state;
}

function simulateInnRest(gameState: GameState): GameState {
  const state = cloneState(gameState);
  const character = state.character!;
  character.gold = Math.max(0, character.gold - getActionCost(state, "inn-rest"));
  character.survival.fatigue = clamp(character.survival.fatigue - 55);
  character.survival.hunger = clamp(character.survival.hunger - 12);
  character.survival.morale = clamp(character.survival.morale + 8);
  character.survival.injury = clamp(character.survival.injury - 3);
  character.survival.sickness = clamp(character.survival.sickness - 3);
  state.towerPressure = addPreviewPressure(state, 1);
  return state;
}

function simulateEatFood(gameState: GameState): GameState {
  const state = cloneState(gameState);
  const character = state.character!;
  character.food = Math.max(0, character.food - 1);
  character.survival.hunger = clamp(character.survival.hunger - 25);
  character.survival.morale = clamp(character.survival.morale + 1);
  return state;
}

function simulateGather(gameState: GameState): GameState {
  const state = cloneState(gameState);
  const character = state.character!;
  const early = character.maxFloorCleared < 3 || character.currentFloor <= 3;
  character.food += 1;
  character.gold += early ? 5 : character.maxFloorCleared >= 10 || character.currentFloor >= 11 ? 6 : 4;
  character.survival.fatigue = clamp(character.survival.fatigue + (early ? 10 : character.maxFloorCleared >= 10 || character.currentFloor >= 11 ? 20 : 15));
  character.survival.hunger = clamp(character.survival.hunger + (early ? 5 : character.maxFloorCleared >= 10 || character.currentFloor >= 11 ? 12 : 9));
  state.towerPressure = addPreviewPressure(state, early ? 1 : character.maxFloorCleared >= 10 || character.currentFloor >= 11 ? 2 : 1);
  return state;
}

function simulateInvestigation(gameState: GameState, floorNumber: number): GameState {
  const state = cloneState(gameState);
  const character = state.character!;
  const early = character.maxFloorCleared < 3 || character.currentFloor <= 3;
  character.survival.hunger = clamp(character.survival.hunger + (early ? 3 : 6));
  character.survival.fatigue = clamp(character.survival.fatigue + (early ? 4 : 8));
  state.floorIntel = createPreviewIntel(floorNumber, early ? 5 : 5);
  state.towerPressure = addPreviewPressure(state, early ? 1 : 2);
  return state;
}

function simulatePrepareGear(gameState: GameState): GameState {
  const state = cloneState(gameState);
  const character = state.character!;
  const cost = getActionCost(state, "prepare-gear");
  character.gold = Math.max(0, character.gold - cost);
  state.preparationBuff = {
    successBonus: character.classId === "tinker" ? 8 : 5,
    injuryRiskReduction: character.classId === "tinker" ? 14 : 10,
    expiresAfterNextTower: true,
  };
  state.towerPressure = addPreviewPressure(state, 1);
  return state;
}

function simulateBuyFood(gameState: GameState): GameState {
  const state = cloneState(gameState);
  const character = state.character!;
  character.gold = Math.max(0, character.gold - getActionCost(state, "buy-food"));
  character.food += 1;
  state.towerPressure = addPreviewPressure(state, 1);
  return state;
}

function simulateTreatment(gameState: GameState, kind: "injury" | "sickness"): GameState {
  const state = cloneState(gameState);
  const character = state.character!;
  if (kind === "injury") {
    character.gold = Math.max(0, character.gold - getActionCost(state, "buy-bandage"));
    character.survival.injury = clamp(character.survival.injury - 20);
  } else {
    character.gold = Math.max(0, character.gold - getActionCost(state, "buy-medicine"));
    character.survival.sickness = clamp(character.survival.sickness - 20);
  }
  state.towerPressure = addPreviewPressure(state, 1);
  return state;
}

function createPreviewIntel(floorNumber: number, successBonus: number): FloorIntel {
  const floor = floors.find((item) => item.floor === floorNumber) ?? floors[0];
  return {
    id: "preview-intel",
    floorNumber,
    titleTh: floor.title,
    descriptionTh: "ข้อมูลจำลองจากระบบคำแนะนำ",
    reliability: "partial",
    successBonus,
    injuryRiskReduction: 0,
    revealedTags: floor.tags?.slice(0, 2) ?? [floor.challengeType],
    isFalse: false,
    expiresAfterNextTower: true,
  };
}

function cloneState(gameState: GameState): GameState {
  return structuredClone(gameState) as GameState;
}

function addPreviewPressure(state: GameState, amount: number) {
  const cap = getPreviewPressureCap(state);
  return Math.max(0, Math.min(cap, (state.towerPressure ?? 0) + amount));
}

function getPreviewPressureCap(state: GameState) {
  const floorNumber = state.character ? Math.min(20, state.character.maxFloorCleared + 1) : 1;
  if (floorNumber <= 3) return 8;
  if (floorNumber <= 5) return 12;
  return 20;
}

function getActionCost(gameState: GameState, actionId: "buy-food" | "buy-bandage" | "buy-medicine" | "inn-rest" | "prepare-gear") {
  const floorNumber = gameState.character ? Math.min(20, gameState.character.maxFloorCleared + 1) : 1;
  const baseCost = getShopBaseCost(actionId, floorNumber);
  const tinkerCost = gameState.character?.classId === "tinker" && actionId === "prepare-gear" ? Math.ceil(baseCost * 0.85) : baseCost;
  return getShopCostForAction(actionId, tinkerCost, gameState.towerPressure ?? 0, floorNumber);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function sortRecommendations(a: HubRecommendation, b: HubRecommendation) {
  return b.priority - a.priority;
}

function uniqueRecommendations(recommendations: HubRecommendation[]) {
  const seen = new Set<string>();
  return recommendations.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
