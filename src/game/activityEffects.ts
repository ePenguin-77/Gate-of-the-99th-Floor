import { statLabels, survivalLabels } from "./labels";
import type { ActivityType, ActionDelta, Character, FloorDefinition, FloorResult, GameState, LastActionResult, StatKey, SurvivalKey } from "../types/game";

type HubActivityType = Exclude<ActivityType, "tower">;

const statKeys: StatKey[] = ["strength", "agility", "endurance", "focus", "willpower", "instinct"];
const survivalKeys: SurvivalKey[] = ["hunger", "fatigue", "morale", "hope", "injury", "sickness"];
const badSurvivalKeys: SurvivalKey[] = ["hunger", "fatigue", "injury", "sickness"];
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const chance = (percent: number) => Math.random() * 100 < percent;

export function getActivityPreview(activity: "challenge" | "revisit" | HubActivityType): string {
  const previews = {
    challenge: "เสี่ยงตามชั้น / ความหิว +16 / ความเหนื่อยล้า +24",
    revisit: "ปลอดภัยกว่า / ทอง +2 ถึง +5 / ความหิว +12 / ความเหนื่อยล้า +18",
    train: "ค่าสถานะสุ่ม +1 / ความหิว +12 / ความเหนื่อยล้า +18 / หอคอยกดดัน +2",
    rest: "ลดความเหนื่อยล้า / ใช้อาหารถ้ามี / หอคอยกดดัน +1",
    gather: "อาหาร +1 ถึง +2 / ทอง +1 ถึง +4 / เสี่ยงเมื่อเหนื่อย ป่วย หรือหอคอยกดดัน",
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
  if (activity === "rest") {
    const eatsFood = next.food > 0;
    next.survival.fatigue = clamp(next.survival.fatigue - ((next.skills ?? []).includes("guard-breathe-behind-shield") ? 26 : 22));
    next.survival.morale = clamp(next.survival.morale + (eatsFood ? 2 : -2));
    next.survival.hunger = clamp(next.survival.hunger + 12 + (eatsFood ? -((next.skills ?? []).includes("tinker-efficient-use") ? 19 : 16) : 8));
    if (eatsFood) next.food = Math.max(0, next.food - 1);
    if (next.survival.injury < 20 && next.survival.sickness < 20) {
      next.survival.injury = clamp(next.survival.injury - 3);
      next.survival.sickness = clamp(next.survival.sickness - 2);
    }
    if (!eatsFood && chance(10)) next.survival.sickness = clamp(next.survival.sickness + 5);
    return {
      character: next,
      activityName: "พักผ่อน",
      narrative: eatsFood
        ? `${character.name} ได้พักหายใจในเมืองพักพิงหนึ่งคืน ความเหนื่อยล้าลดลง แต่เสบียงถูกใช้ไปหนึ่งส่วน`
        : `${character.name} ได้นอนพัก แต่ท้องที่ว่างเปล่าทำให้ร่างกายไม่อาจฟื้นตัวได้เต็มที่`,
      journalNote: eatsFood ? undefined : "การพักโดยไม่มีอาหารช่วยให้หลับตาได้ แต่ไม่ได้ฟื้นร่างกายอย่างแท้จริง",
    };
  }
  if (activity === "train") {
    const canGain = next.survival.fatigue < 70 || chance(50);
    const stat = statKeys[Math.floor(Math.random() * statKeys.length)];
    if (canGain) next.stats[stat] = clamp(next.stats[stat] + 1, 1, 25);
    next.survival.fatigue = clamp(next.survival.fatigue + 18);
    next.survival.hunger = clamp(next.survival.hunger + 12);
    next.survival.morale = clamp(next.survival.morale + (canGain ? 2 : -1));
    if (character.survival.fatigue >= 70 && chance(35)) next.survival.injury = clamp(next.survival.injury + 5);
    return {
      character: next,
      activityName: "ฝึกฝน",
      narrative: canGain
        ? `${character.name} ใช้เวลาทั้งวันฝึกฝนจนร่างกายล้า แต่เขาเริ่มเข้าใจวิธีเอาตัวรอดมากขึ้น`
        : `${character.name} ฝืนฝึกทั้งที่อ่อนล้าเกินไป เหงื่อไหลมากกว่าความก้าวหน้า`,
    };
  }
  const resourceful = next.traits.some((trait) => trait.id === "resourceful");
  const tinker = next.classId === "tinker";
  let foodGain = randomRange(1, 2) + (resourceful ? 1 : 0);
  let goldGain = randomRange(1, 4) + (tinker ? 1 : 0);
  let riskBonus = gatherRiskBonus;
  if (next.classId === "scout") riskBonus -= 10;
  if (next.advancedClassId === "scrap-survivalist") riskBonus -= 8;
  let note = "";
  if (next.currentFloor >= 5 || next.maxFloorCleared >= 4) riskBonus += 10;
  if (consecutiveCount === 2) {
    foodGain = Math.floor(foodGain * 0.7);
    goldGain = Math.floor(goldGain * 0.7);
    riskBonus += 10;
    note = "พื้นที่รอบเมืองถูกค้นหาไปมากแล้ว การออกหาเสบียงซ้ำๆ จึงได้ผลน้อยลงและเสี่ยงมากขึ้น";
  }
  if (consecutiveCount >= 3) {
    foodGain = Math.floor(foodGain * 0.4);
    goldGain = Math.floor(goldGain * 0.4);
    riskBonus += 25;
    note = "พื้นที่รอบเมืองถูกค้นหาจนแทบไม่เหลืออะไร การฝืนออกไปซ้ำๆ มีแต่จะเพิ่มความเสี่ยง";
  }
  if (next.survival.hunger >= 70) {
    foodGain = Math.max(0, foodGain - 1);
    next.survival.morale = clamp(next.survival.morale - 2);
  }
  next.food += foodGain;
  next.gold += goldGain;
  next.survival.fatigue = clamp(next.survival.fatigue + 22 + (next.survival.sickness >= 50 ? 8 : 0));
  next.survival.hunger = clamp(next.survival.hunger + 14);
  if (character.survival.fatigue >= 80) {
    if (chance(45 + riskBonus)) next.survival.injury = clamp(next.survival.injury + randomRange(8, 18));
    if (chance(25 + riskBonus)) next.survival.sickness = clamp(next.survival.sickness + randomRange(5, 10));
  } else if (character.survival.fatigue >= 60 && chance(25 + riskBonus)) {
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
