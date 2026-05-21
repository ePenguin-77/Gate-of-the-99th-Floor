import { statLabels, survivalLabels } from "./labels";
import type { ActivityType, ActionDelta, Character, FloorDefinition, FloorResult, GameState, LastActionResult, StatKey, SurvivalKey } from "../types/game";

type HubActivityType = Exclude<ActivityType, "tower">;

const statKeys: StatKey[] = ["strength", "agility", "endurance", "focus", "willpower", "instinct"];
const survivalKeys: SurvivalKey[] = ["hunger", "fatigue", "morale", "hope", "injury", "sickness"];
const badSurvivalKeys: SurvivalKey[] = ["hunger", "fatigue", "injury", "sickness"];
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (percent: number) => Math.random() * 100 < percent;

export function getActivityPreview(activity: "challenge" | "revisit" | HubActivityType | "eat"): string {
  const previews = {
    challenge: "เสี่ยงตามชั้น / ช่วงต้นเกมความหิว +10 / ความเหนื่อยล้า +16",
    revisit: "ปลอดภัยกว่า / ทอง +2 ถึง +5 / ช่วงต้นเกมความหิว +7 / ความเหนื่อยล้า +12",
    train: "ค่าสถานะสุ่ม +1 / ความหิว +8 ถึง +12 / ความเหนื่อยล้า +12 ถึง +18",
    rest: "ความเหนื่อยล้า -32 / ใช้อาหารถ้ามี / ช่วงต้นเกมไม่เพิ่มแรงกดดันทันที",
    gather: "อาหาร +1 ถึง +2 / ทอง +3 ถึง +7 ช่วงต้นเกม / เสี่ยงเมื่อทำซ้ำหรือสภาพแย่",
    eat: "อาหาร -1 / ความหิว -25 / ขวัญกำลังใจ +1 / ไม่เพิ่มแรงกดดัน",
  };
  return previews[activity];
}

export function applyHubActivity(
  character: Character,
  activity: HubActivityType,
  consecutiveCount = 1,
  gatherRiskBonus = 0,
): { character: Character; activityName: string; narrative: string; journalNote?: string } {
  const next: Character = structuredClone(character);
  const earlyGame = isEarlyGame(next);

  if (activity === "rest") {
    const eatsFood = next.food > 0;
    const fatigueRecovery = earlyGame ? 32 : (next.skills ?? []).includes("guard-breathe-behind-shield") ? 28 : 24;
    const baseHungerGain = earlyGame ? 4 : 10;
    const foodHungerRecovery = earlyGame ? 18 : (next.skills ?? []).includes("tinker-efficient-use") ? 18 : 15;
    const noFoodExtraHunger = earlyGame ? 8 : 8;
    next.survival.fatigue = clamp(next.survival.fatigue - fatigueRecovery);
    next.survival.morale = clamp(next.survival.morale + (eatsFood ? (earlyGame ? 3 : 2) : -1));
    next.survival.hunger = clamp(next.survival.hunger + baseHungerGain + (eatsFood ? -foodHungerRecovery : noFoodExtraHunger));
    if (eatsFood) next.food = Math.max(0, next.food - 1);
    if (!earlyGame && next.survival.injury < 20 && next.survival.sickness < 20) {
      next.survival.injury = clamp(next.survival.injury - 3);
      next.survival.sickness = clamp(next.survival.sickness - 2);
    }
    if (!eatsFood && chance(earlyGame ? 5 : 10)) next.survival.sickness = clamp(next.survival.sickness + 5);
    return {
      character: next,
      activityName: "พักผ่อน",
      narrative: eatsFood
        ? `${character.name} ได้พักหายใจในเมืองพักพิงหนึ่งคืน ความเหนื่อยล้าลดลง และเสบียงหนึ่งส่วนช่วยให้ร่างกายมั่นคงขึ้น`
        : `${character.name} ได้นอนพัก แต่ท้องที่ว่างเปล่าทำให้ร่างกายฟื้นตัวได้ไม่เต็มที่`,
      journalNote: eatsFood ? undefined : "การพักโดยไม่มีอาหารช่วยให้หลับตาได้ แต่ไม่อาจซ่อมร่างกายที่ยังหิวอยู่ได้จริง",
    };
  }

  if (activity === "train") {
    const canGain = next.survival.fatigue < 70 || chance(50);
    const stat = statKeys[Math.floor(Math.random() * statKeys.length)];
    if (canGain) next.stats[stat] = clamp(next.stats[stat] + 1, 1, 25);
    next.survival.fatigue = clamp(next.survival.fatigue + (earlyGame ? 12 : 18));
    next.survival.hunger = clamp(next.survival.hunger + (earlyGame ? 8 : 12));
    next.survival.morale = clamp(next.survival.morale + (canGain ? 2 : -1));
    if (character.survival.fatigue >= 70 && chance(earlyGame ? 20 : 35)) next.survival.injury = clamp(next.survival.injury + 5);
    return {
      character: next,
      activityName: "ฝึกฝน",
      narrative: canGain
        ? `${character.name} ใช้เวลาฝึกฝนจนร่างกายล้า แต่เขาเริ่มเข้าใจวิธีเอาตัวรอดมากขึ้น`
        : `${character.name} ฝืนฝึกทั้งที่อ่อนล้าเกินไป เหงื่อไหลมากกว่าความก้าวหน้า`,
    };
  }

  const resourceful = next.traits.some((trait) => trait.id === "resourceful");
  const tinker = next.classId === "tinker";
  let foodGain = randomRange(1, 2) + (resourceful ? 1 : 0);
  const act2 = next.maxFloorCleared >= 10 || next.currentFloor >= 11;
  let goldGain = randomRange(earlyGame ? 3 : 3, earlyGame ? 7 : act2 ? 8 : 6) + (tinker ? 1 : 0);
  let riskBonus = gatherRiskBonus;
  if (next.classId === "scout") riskBonus -= 10;
  if (next.advancedClassId === "scrap-survivalist") riskBonus -= 8;
  let note = "";
  if (next.currentFloor >= 5 || next.maxFloorCleared >= 4) riskBonus += 10;
  if (consecutiveCount === 2) {
    foodGain = Math.max(0, Math.floor(foodGain * 0.75));
    goldGain = Math.max(0, Math.floor(goldGain * 0.75));
    riskBonus += 10;
    note = "พื้นที่รอบเมืองถูกค้นหาไปมากแล้ว การออกหาเสบียงซ้ำจึงได้ผลน้อยลงและเสี่ยงมากขึ้น";
  }
  if (consecutiveCount >= 3) {
    foodGain = Math.max(0, Math.floor(foodGain * 0.5));
    goldGain = Math.max(0, Math.floor(goldGain * 0.5));
    riskBonus += 20;
    note = "พื้นที่รอบเมืองแทบไม่เหลืออะไรให้เก็บ การฝืนออกไปซ้ำมีแต่จะเพิ่มความเสี่ยง";
  }
  if (next.survival.hunger >= 70) {
    foodGain = Math.max(0, foodGain - 1);
    next.survival.morale = clamp(next.survival.morale - 2);
  }
  next.food += foodGain;
  next.gold += goldGain;
  next.survival.fatigue = clamp(next.survival.fatigue + (earlyGame ? 10 : act2 ? 20 : 15) + (next.survival.sickness >= 50 ? 8 : 0));
  next.survival.hunger = clamp(next.survival.hunger + (earlyGame ? 5 : act2 ? 12 : 9));
  if (character.survival.fatigue >= 80) {
    if (chance((earlyGame ? 25 : 45) + riskBonus)) next.survival.injury = clamp(next.survival.injury + randomRange(8, 18));
    if (chance((earlyGame ? 15 : 25) + riskBonus)) next.survival.sickness = clamp(next.survival.sickness + randomRange(5, 10));
  } else if (character.survival.fatigue >= 60 && chance((earlyGame ? 15 : 25) + riskBonus)) {
    next.survival.injury = clamp(next.survival.injury + randomRange(5, 12));
  }
  if (character.survival.sickness >= 50 && chance(20 + riskBonus)) next.survival.sickness = clamp(next.survival.sickness + 5);
  if (gatherRiskBonus > 0 && chance(gatherRiskBonus)) {
    if (chance(55)) next.survival.injury = clamp(next.survival.injury + randomRange(4, 10));
    else next.survival.sickness = clamp(next.survival.sickness + randomRange(3, 8));
  }
  return {
    character: next,
    activityName: "ออกหาเสบียง",
    narrative: `${character.name} ออกค้นตรอกแคบและซากชั้นล่าง เพื่อหาสิ่งใดก็ตามที่อาจกลายเป็นวันพรุ่งนี้`,
    journalNote: note,
  };
}

export function updateConsecutiveActivity(state: GameState, type: string): GameState {
  const previous = state.consecutiveActivity;
  return {
    ...state,
    consecutiveActivity: {
      type,
      count: previous?.type === type ? previous.count + 1 : 1,
    },
  };
}

export function createHubActionResult(
  activityName: string,
  narrative: string,
  before: Character,
  after: Character,
  day?: number,
): LastActionResult {
  return {
    activityName,
    narrative,
    deltas: collectCharacterDeltas(before, after),
    day,
  };
}

export function createTowerActionResult(
  before: Character,
  after: Character,
  floor: FloorDefinition,
  result: FloorResult,
  isRevisit: boolean,
  day?: number,
): LastActionResult {
  return {
    activityName: isRevisit ? "กลับไปยังชั้นก่อนหน้า" : "ท้าทายชั้นถัดไป",
    narrative: `${before.name} กลับจาก${floor.title} ด้วยผลลัพธ์: ${result.summary}`,
    deltas: collectCharacterDeltas(before, after),
    importantReasons: result.importantReasons,
    day,
  };
}

export function getDeltaForKey(result: LastActionResult | undefined, key: string): ActionDelta | undefined {
  return result?.deltas.find((delta) => delta.key === key);
}

function collectCharacterDeltas(before: Character, after: Character): ActionDelta[] {
  const deltas: ActionDelta[] = [];

  statKeys.forEach((key) => {
    pushDelta(deltas, {
      key,
      label: statLabels[key],
      before: before.stats[key],
      after: after.stats[key],
      valueType: "stat",
    });
  });

  survivalKeys.forEach((key) => {
    pushDelta(deltas, {
      key,
      label: survivalLabels[key],
      before: before.survival[key],
      after: after.survival[key],
      valueType: badSurvivalKeys.includes(key) ? "bad" : "good",
    });
  });

  pushDelta(deltas, { key: "food", label: "อาหาร", before: before.food, after: after.food, valueType: "resource" });
  pushDelta(deltas, { key: "gold", label: "ทอง", before: before.gold, after: after.gold, valueType: "resource" });

  return deltas;
}

function pushDelta(
  deltas: ActionDelta[],
  item: Omit<ActionDelta, "delta">,
) {
  const delta = item.after - item.before;
  if (delta === 0) return;
  deltas.push({ ...item, delta });
}

function isEarlyGame(character: Character) {
  return character.maxFloorCleared < 3 || character.currentFloor <= 3;
}
