import type { ChallengeType, DeathCause, FloorResultLevel, StatKey, TraitKind } from "../types/game";

export const statLabels: Record<StatKey, string> = {
  strength: "พละกำลัง",
  agility: "ความคล่องตัว",
  endurance: "ความอดทน",
  focus: "สมาธิ",
  willpower: "จิตใจ",
  instinct: "สัญชาตญาณ",
};

export const survivalLabels = {
  hunger: "ความหิว",
  fatigue: "ความเหนื่อยล้า",
  morale: "ขวัญกำลังใจ",
  hope: "ความหวัง",
  injury: "อาการบาดเจ็บ",
  sickness: "อาการป่วย",
};

export const divineLabels = {
  faith: "ศรัทธา",
  independence: "การยืนหยัดด้วยตนเอง",
  dependency: "การพึ่งพาเทพ",
};

export const challengeLabels: Record<ChallengeType, string> = {
  combat: "การต่อสู้",
  survival: "เอาตัวรอด",
  puzzle: "ปริศนา",
  moral: "ทางเลือกทางใจ",
  npc: "การพบพาน",
  boss: "ผู้เฝ้าประตู",
  darkness: "ความมืด",
  trap: "กับดัก",
  preparation: "การเตรียมใจ",
};

export const resultLabels: Record<FloorResultLevel, string> = {
  greatSuccess: "ผ่านอย่างงดงาม",
  success: "ผ่านอย่างหวุดหวิด",
  costlySuccess: "ผ่านแต่ต้องแลก",
  failure: "ล้มเหลว",
  criticalFailure: "ล้มเหลวอย่างรุนแรง",
};

export const traitKindLabels: Record<TraitKind, string> = {
  positive: "ข้อดี",
  negative: "ข้อเสีย",
  "double-edged": "สองคม",
};

export const deathCauseLabels: Record<DeathCause, string> = {
  starvation: "อดอาหาร",
  exhaustion: "หมดแรง",
  sickness: "อาการป่วย",
  injury: "บาดแผลรุนแรง",
  despair: "สิ้นหวัง",
};
