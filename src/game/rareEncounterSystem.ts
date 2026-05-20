import { rareEncounters } from "../data/rareEncounters";
import type { ActionDelta, Character, FloorIntel, GameState, Memory, PlayerProfile, RareEncounter, RareEncounterRarity } from "../types/game";
import { addMemory } from "./memorySystem";
import { adjustPathAffinity, normalizePathAffinity } from "./pathAffinity";
import { addItem } from "./inventorySystem";

const BASE_CHANCES: Record<RareEncounterRarity, number> = {
  rare: 2,
  veryRare: 0.8,
  mythic: 0.2,
};

const ACTION_LABELS: Record<string, string> = {
  challengeNextFloor: "ท้าทายชั้นถัดไป",
  revisitPreviousFloor: "กลับไปยังชั้นก่อนหน้า",
  rest: "พักผ่อน",
  innRest: "พักโรงเตี๊ยม",
  gatherResources: "ออกหาเสบียง",
  train: "ฝึกฝน",
  paidTraining: "ฝึกกับครูฝึก",
  investigateNextFloor: "สืบข่าวชั้นถัดไป",
  marketPurchase: "ตลาดและบริการ",
  openJournal: "เปิดบันทึก",
  interactWithNpc: "ผู้คนในเมืองพักพิง",
};

type NumericChange = {
  key: string;
  label: string;
  before: number;
  after: number;
  valueType: ActionDelta["valueType"];
};

export function maybeTriggerRareEncounter(gameState: GameState, actionType: string, playerProfile?: PlayerProfile): GameState {
  const stateAfterAction = advanceRareEncounterClock(gameState);
  if (!stateAfterAction.character) return stateAfterAction;
  if (stateAfterAction.activeRareEncounter) return stateAfterAction;
  if ((stateAfterAction.totalActionsTaken ?? 0) < 3) return stateAfterAction;
  if ((stateAfterAction.rareEncounterCooldown ?? 0) > 0) return stateAfterAction;

  const encounter = rollRareEncounter(stateAfterAction, actionType, playerProfile);
  if (!encounter) return stateAfterAction;

  return {
    ...stateAfterAction,
    activeRareEncounter: {
      encounterId: encounter.id,
      triggeredByAction: actionType,
      day: stateAfterAction.day,
    },
  };
}

export function forceRareEncounter(gameState: GameState, actionType = "challengeNextFloor", playerProfile?: PlayerProfile): GameState {
  const stateAfterAction = {
    ...gameState,
    rareEncounterCooldown: 0,
    totalActionsTaken: Math.max(3, gameState.totalActionsTaken ?? 0),
  };
  const eligible = getEligibleRareEncounters(stateAfterAction, actionType, playerProfile);
  const encounter = eligible[Math.floor(Math.random() * eligible.length)] ?? rareEncounters[0];
  return {
    ...stateAfterAction,
    activeRareEncounter: {
      encounterId: encounter.id,
      triggeredByAction: actionType,
      day: stateAfterAction.day,
    },
  };
}

export function getEligibleRareEncounters(gameState: GameState, actionType: string, playerProfile?: PlayerProfile): RareEncounter[] {
  if (!gameState.character) return [];
  const floorMarker = Math.max(gameState.character.currentFloor, gameState.character.maxFloorCleared + 1);
  return rareEncounters.filter((encounter) => {
    const actionMatches = encounter.triggerActions.includes(actionType) || encounter.triggerActions.includes("any");
    if (!actionMatches) return false;
    if (encounter.minFloor && floorMarker < encounter.minFloor) return false;
    if (encounter.maxFloor && floorMarker > encounter.maxFloor) return false;
    if (encounter.minTowerPressure && (gameState.towerPressure ?? 0) < encounter.minTowerPressure) return false;
    if (encounter.requiresLifeDebt && (playerProfile?.lifeDebtMarks ?? 0) <= 0) return false;
    if (encounter.requiresNpc) {
      const npc = gameState.npcs.find((item) => item.id === encounter.requiresNpc);
      if (!npc || npc.status === "locked" || npc.status === "dead") return false;
    }
    return true;
  });
}

export function rollRareEncounter(gameState: GameState, actionType: string, playerProfile?: PlayerProfile): RareEncounter | null {
  const eligible = getEligibleRareEncounters(gameState, actionType, playerProfile);
  const ordered = [...eligible].sort(() => Math.random() - 0.5);
  for (const encounter of ordered) {
    let chance = BASE_CHANCES[encounter.rarity] + getPressureChanceBonus(gameState.towerPressure ?? 0);
    const affinity = normalizePathAffinity(gameState.character?.pathAffinity);
    if (affinity.seeker >= 10 && encounter.tags.some((tag) => ["lore", "anomaly", "intel"].includes(tag))) chance += 0.3;
    if (affinity.shadow >= 10 && encounter.tags.some((tag) => ["shadow", "market", "hidden"].includes(tag))) chance += 0.3;
    if ((playerProfile?.lifeDebtMarks ?? 0) > 0 && encounter.tags.some((tag) => ["echo", "dead-soul", "lifeDebt"].includes(tag))) chance += 0.5;
    if ((gameState.rareEncountersSeen ?? []).includes(encounter.id)) chance *= 0.5;
    if (Math.random() * 100 < chance) return encounter;
  }
  return null;
}

export function resolveRareEncounterChoice(gameState: GameState, encounterId: string, choiceId: string): GameState {
  const encounter = rareEncounters.find((item) => item.id === encounterId);
  const choice = encounter?.choices.find((item) => item.id === choiceId);
  if (!encounter || !choice || !gameState.character) {
    return { ...gameState, activeRareEncounter: undefined, rareEncounterCooldown: 4 };
  }

  const before = gameState.character;
  let character: Character = structuredClone(gameState.character);
  let nextState: GameState = {
    ...gameState,
    activeRareEncounter: undefined,
    rareEncounterCooldown: 4,
    rareEncountersSeen: Array.from(new Set([encounter.id, ...(gameState.rareEncountersSeen ?? [])])),
  };
  let narrative = "";
  const notes: string[] = [];
  const memoryDrafts: Memory[] = [];

  const addNote = (text: string) => notes.push(text);
  const addMemoryDraft = (memory: Omit<Memory, "id" | "dayCreated">) => {
    memoryDrafts.push({ ...memory, id: crypto.randomUUID(), dayCreated: nextState.day });
  };

  const setIntel = (reliability: FloorIntel["reliability"], bonus: number, falseIntel = false) => {
    const floorNumber = Math.min(20, character.maxFloorCleared + 1);
    nextState = {
      ...nextState,
      floorIntel: {
        id: crypto.randomUUID(),
        floorNumber,
        titleTh: falseIntel ? "ข้อมูลที่ฟังดูน่าเชื่อถือ" : "ข้อมูลจากเหตุการณ์ผิดปกติ",
        descriptionTh: falseIntel
          ? "ข้อมูลนี้ฟังดูมีเหตุผลเกินกว่าจะมองข้าม แต่ยังไม่มีใครยืนยันได้"
          : "ความผิดปกติของหอคอยเผยเบาะแสบางอย่างเกี่ยวกับชั้นถัดไป",
        reliability,
        successBonus: bonus,
        injuryRiskReduction: falseIntel ? 0 : 5,
        revealedTags: encounter.tags.slice(0, 2),
        isFalse: falseIntel,
        expiresAfterNextTower: true,
      },
    };
  };

  const grantPreparation = (successBonus = 5, injuryRiskReduction = 10) => {
    nextState = {
      ...nextState,
      preparationBuff: {
        successBonus,
        injuryRiskReduction,
        expiresAfterNextTower: true,
      },
    };
  };
  const grantItem = (itemId: string) => {
    const result = addItem({ ...nextState, character }, itemId, 1);
    nextState = result.state;
    character = result.state.character ?? character;
    if (result.ok) addNote(result.message);
    else addNote(result.message);
  };

  const applyResourceChange = (kind: "gold" | "food", amount: number) => {
    character = { ...character, [kind]: Math.max(0, character[kind] + amount) };
  };

  const applySurvivalChange = (key: keyof Character["survival"], amount: number) => {
    character = {
      ...character,
      survival: {
        ...character.survival,
        [key]: Math.min(100, Math.max(0, character.survival[key] + amount)),
      },
    };
  };

  const applyDivineChange = (key: keyof Character["divine"], amount: number) => {
    character = {
      ...character,
      divine: {
        ...character.divine,
        [key]: Math.min(100, Math.max(0, character.divine[key] + amount)),
      },
    };
  };

  const applyPath = (pathId: Parameters<typeof adjustPathAffinity>[1], amount: number) => {
    character = adjustPathAffinity(character, pathId, amount);
    addNote(`ร่องรอยของชะตา: ${pathId} ${amount > 0 ? "+" : ""}${amount}`);
  };

  const random = Math.random();

  if (encounter.id === "wrong-door") {
    if (choice.resolveKey === "openDoor") {
      if (random < 0.4) {
        setIntel("trusted", 10);
        grantPreparation(5, 8);
        if (Math.random() < 0.35) grantItem("key_without_keyhole");
        narrative = `${character.name} เปิดประตูสีดำ และพบเพียงลมหายใจเย็นเฉียบที่บอกตำแหน่งกับดักของชั้นถัดไป ก่อนประตูจะหายไปราวกับไม่เคยอยู่ตรงนั้น`;
        addMemoryDraft({ title: "ประตูที่ไม่มีในแผนที่", description: "เขายังจำบานประตูที่ไม่ควรอยู่ตรงนั้นได้ดี ความผิดปกติครั้งนั้นสอนให้เขารู้ว่าหอคอยมีช่องว่างระหว่างกฎของมันเอง", type: "growth", intensity: 42, tags: ["door", "anomaly", "intel"] });
      } else if (random < 0.8) {
        applySurvivalChange("injury", 10 + roll(16));
        nextState = { ...nextState, towerPressure: clamp((nextState.towerPressure ?? 0) + 2, 0, 20) };
        narrative = `${character.name} แตะลูกบิด และประตูตอบกลับด้วยแรงผลักที่เหมือนมือไร้กระดูก เขารอดกลับมาได้ แต่เลือดบนฝ่ามือยืนยันว่ามันไม่ใช่ภาพหลอน`;
      } else {
        grantPreparation(8, 12);
        grantItem("key_without_keyhole");
        applyDivineChange("faith", 1);
        narrative = `หลังประตูไม่มีห้อง มีเพียงแสงสีอำพันที่ไหลผ่านอุปกรณ์ของเขา เหมือนหอคอยเผลอคืนข้อได้เปรียบบางอย่างให้ศัตรูตัวเล็กของมัน`;
      }
    } else if (choice.resolveKey === "omen") {
      applySurvivalChange("morale", -2);
      setIntel("partial", 6);
      narrative = `ลางบอกเหตุเผยให้เห็นเส้นเลือดดำใต้บานประตู ${character.name} ถอยออกมาพร้อมใจที่สั่น แต่เขาได้จำรูปแบบอันตรายบางอย่างไว้`;
    } else if (choice.resolveKey === "self") {
      if (random < 0.55) {
        applyDivineChange("independence", 2);
        grantPreparation(4, 4);
        narrative = `${character.name} เลือกไม่เปิดประตู แต่ทำเครื่องหมายไว้ด้วยมือของตนเอง นั่นไม่ใช่ชัยชนะใหญ่ แต่เป็นการตัดสินใจที่เป็นของเขา`;
        addMemoryDraft({ title: "วันที่เขาเลือกไม่เปิดประตู", description: "บางครั้งการเติบโตไม่ได้เริ่มจากการก้าวเข้าไป แต่เริ่มจากการรู้ว่าอะไรไม่ควรถูกแตะต้อง", type: "growth", intensity: 36, tags: ["independence", "anomaly"] });
      } else {
        applySurvivalChange("injury", 10);
        applySurvivalChange("morale", -4);
        narrative = `เขาตัดสินใจช้าไปครึ่งลมหายใจ ประตูดำพับเงาของมันใส่ข้อเท้า เขาหลุดออกมาได้ แต่ความกลัวติดกลับมาด้วย`;
      }
    } else {
      nextState = { ...nextState, towerPressure: clamp((nextState.towerPressure ?? 0) + 1, 0, 20) };
      applySurvivalChange("morale", -1);
      narrative = `${character.name} ถอยจากประตูที่ไม่ควรมีอยู่ หอคอยไม่ลงโทษเขาทันที แต่มันจำได้ว่าเขาเห็น`;
    }
  } else if (encounter.id === "future-floor-merchant") {
    if (choice.resolveKey === "buy") {
      const cost = Math.min(character.gold, 10 + roll(8));
      applyResourceChange("gold", -cost);
      if (cost >= 8) {
        grantPreparation(7, 10);
        if (Math.random() < 0.5) grantItem("ink_stained_map");
        narrative = `พ่อค้าแลกทองกับเครื่องรางโลหะดำ มันเย็นเกินกว่าจะเป็นของธรรมดา แต่เมื่อถือไว้ เส้นทางขึ้นหอคอยดูชัดขึ้นเล็กน้อย`;
      } else {
        applySurvivalChange("morale", -1);
        narrative = `พ่อค้ามองทองในมือเขาแล้วหัวเราะเบาๆ ก่อนหายเข้าไปในตลาด เดนเหลือเพียงความรู้สึกว่าตนถูกประเมินราคา`;
      }
    } else if (choice.resolveKey === "ask") {
      const falseIntel = random < 0.35;
      setIntel(falseIntel ? "false" : "partial", falseIntel ? -5 : 6, falseIntel);
      applyResourceChange("gold", -Math.min(character.gold, 6 + roll(6)));
      narrative = falseIntel
        ? `ข้อมูลของพ่อค้าฟังดูสมจริงเกินไป เดนจดจำมันไว้ แม้รอยยิ้มสุดท้ายของชายคนนั้นจะเย็นผิดธรรมชาติ`
        : `พ่อค้าเล่าเพียงครึ่งเดียว แต่ครึ่งเดียวนั้นพอทำให้เดนรู้ว่าชั้นถัดไปไม่ควรถูกมองเป็นเพียงบันไดอีกขั้น`;
    } else if (choice.resolveKey === "omen") {
      applySurvivalChange("morale", -1);
      setIntel("partial", 5);
      narrative = `ลางบอกเหตุทำให้เงาของพ่อค้ายืดยาวผิดรูป เขายังอาจโกหก แต่ไม่ใช่ทุกคำที่ไร้ประโยชน์`;
    } else {
      narrative = `${character.name} ปฏิเสธข้อเสนอ พ่อค้าเพียงยิ้มและบอกว่า “ไม่เป็นไร ชั้นที่สูงกว่ายังมีเวลาเก็บราคาจากเจ้า”`;
    }
  } else if (encounter.id === "lost-floor-boss") {
    if (choice.resolveKey === "fight") {
      if (random < 0.35) {
        applyResourceChange("gold", 12 + roll(12));
        grantItem("gatekeeper_mask_shard");
        applySurvivalChange("morale", 4);
        applySurvivalChange("injury", 12 + roll(14));
        narrative = `${character.name} ไม่ได้ชนะอย่างสะอาด แต่เขาทำให้สิ่งผิดชั้นถอยกลับเข้าไปในรอยแตก ทองที่หล่นอยู่บนพื้นสั่นเหมือนยังมีชีพจร`;
      } else {
        applySurvivalChange("injury", 22 + roll(24));
        applySurvivalChange("fatigue", 18);
        applySurvivalChange("morale", -8);
        narrative = `เขาปะทะกับสิ่งที่ไม่ควรอยู่ตรงนี้ และรอดมาได้เพียงเพราะมันไม่ได้ต้องการฆ่าเขาจริงๆ หรืออาจเพราะมันยังไม่ถึงเวลาของเขา`;
      }
    } else if (choice.resolveKey === "blessing") {
      applyDivineChange("faith", 2);
      applyDivineChange("dependency", 3);
      applySurvivalChange("fatigue", 8);
      grantPreparation(8, 12);
      narrative = `พรแห่งเทพปิดรอยแตกด้วยแสงอุ่นจัด เดนรอด แต่หลังจากนั้นเขามองฟ้าบ่อยขึ้น เหมือนคนที่รู้ว่าตนเองเคยถูกดึงกลับจากสิ่งที่ใหญ่เกินเข้าใจ`;
    } else if (choice.resolveKey === "prepared") {
      if (nextState.floorIntel || nextState.preparationBuff) {
        nextState = { ...nextState, floorIntel: undefined, preparationBuff: undefined };
        applySurvivalChange("fatigue", 6);
        grantPreparation(6, 8);
        narrative = `ข้อมูลและอุปกรณ์ที่เตรียมไว้ถูกใช้จนหมด แต่ช่วยให้เขาปิดช่องว่างก่อนสิ่งนั้นจะผ่านออกมาเต็มตัว`;
      } else {
        applySurvivalChange("injury", 14);
        applySurvivalChange("morale", -4);
        narrative = `เขาควานหาสิ่งที่เตรียมไว้ แต่ไม่มีอะไรพอจะรับมือกับสิ่งผิดชั้นนั้นได้ นอกจากการถอยทั้งที่หัวใจยังเต้นแรง`;
      }
    } else {
      applySurvivalChange("fatigue", 12);
      applySurvivalChange("morale", -4);
      nextState = { ...nextState, towerPressure: clamp((nextState.towerPressure ?? 0) + 1, 0, 20) };
      narrative = `${character.name} หนีทันที การรอดชีวิตครั้งนี้ไม่ได้สง่างาม แต่บางครั้งความไม่สง่างามคือชื่อหนึ่งของปัญญา`;
    }
  } else {
    const generic = resolveGenericEncounter(encounter, choice.resolveKey, character, nextState);
    character = generic.character;
    nextState = generic.state;
    narrative = generic.narrative;
    generic.notes.forEach(addNote);
    generic.memories.forEach(addMemoryDraft);
  }

  nextState = {
    ...nextState,
    character,
    lastActionResult: {
      activityName: "เหตุการณ์ผิดปกติ",
      narrative,
      deltas: createDeltas(before, character),
      notes: [
        `เกิดขึ้นหลัง: ${ACTION_LABELS[gameState.activeRareEncounter?.triggeredByAction ?? ""] ?? "การตัดสินใจล่าสุด"}`,
        ...notes,
      ],
      day: nextState.day,
    },
    journal: [
      {
        id: crypto.randomUUID(),
        day: nextState.day,
        title: encounter.titleTh,
        text: narrative,
      },
      ...nextState.journal,
    ],
  };

  for (const memory of memoryDrafts) {
    nextState = addMemory(nextState, memory);
    nextState = {
      ...nextState,
      journal: [
        {
          id: crypto.randomUUID(),
          day: nextState.day,
          title: `ความทรงจำใหม่: ${memory.title}`,
          text: memory.description,
        },
        ...nextState.journal,
      ],
    };
  }

  return nextState;
}

function advanceRareEncounterClock(gameState: GameState): GameState {
  return {
    ...gameState,
    totalActionsTaken: (gameState.totalActionsTaken ?? 0) + 1,
    rareEncounterCooldown: Math.max(0, (gameState.rareEncounterCooldown ?? 0) - 1),
  };
}

function getPressureChanceBonus(towerPressure: number): number {
  if (towerPressure >= 13) return 2;
  if (towerPressure >= 8) return 1;
  if (towerPressure >= 4) return 0.5;
  return 0;
}

function resolveGenericEncounter(encounter: RareEncounter, resolveKey: string, character: Character, state: GameState): {
  character: Character;
  state: GameState;
  narrative: string;
  notes: string[];
  memories: Array<Omit<Memory, "id" | "dayCreated">>;
} {
  let nextCharacter = structuredClone(character);
  let nextState = { ...state };
  const notes: string[] = [];
  const memories: Array<Omit<Memory, "id" | "dayCreated">> = [];
  const changeSurvival = (key: keyof Character["survival"], amount: number) => {
    nextCharacter.survival[key] = clamp(nextCharacter.survival[key] + amount, 0, 100);
  };
  const changeDivine = (key: keyof Character["divine"], amount: number) => {
    nextCharacter.divine[key] = clamp(nextCharacter.divine[key] + amount, 0, 100);
  };
  const changeResource = (key: "gold" | "food", amount: number) => {
    nextCharacter[key] = Math.max(0, nextCharacter[key] + amount);
  };
  const setIntel = (bonus: number, isFalse = false) => {
    nextState.floorIntel = {
      id: crypto.randomUUID(),
      floorNumber: Math.min(20, nextCharacter.maxFloorCleared + 1),
      titleTh: isFalse ? "ข้อมูลที่ฟังดูน่าเชื่อถือ" : "เบาะแสจากความผิดปกติ",
      descriptionTh: isFalse ? "ข้อมูลนี้ฟังดูมีเหตุผล แต่หอคอยอาจตั้งใจให้มันมีเหตุผลเกินไป" : "เหตุการณ์ผิดปกติเปิดเผยบางอย่างเกี่ยวกับชั้นถัดไป",
      reliability: isFalse ? "false" : bonus > 6 ? "trusted" : "partial",
      successBonus: bonus,
      injuryRiskReduction: isFalse ? 0 : 5,
      revealedTags: encounter.tags.slice(0, 2),
      isFalse,
      expiresAfterNextTower: true,
    };
  };
  const setPrep = (successBonus = 5, injuryRiskReduction = 8) => {
    nextState.preparationBuff = { successBonus, injuryRiskReduction, expiresAfterNextTower: true };
  };
  const grantGenericItem = (itemId: string) => {
    const result = addItem({ ...nextState, character: nextCharacter }, itemId, 1);
    nextState = result.state;
    nextCharacter = result.state.character ?? nextCharacter;
    notes.push(result.message);
  };

  let narrative = `${nextCharacter.name} เลือกเผชิญเหตุการณ์ผิดปกติอย่างระมัดระวัง หอคอยไม่ได้เผยคำตอบทั้งหมด แต่ทิ้งร่องรอยไว้ในใจเขา`;

  if (encounter.id === "journal-knock") {
    if (resolveKey === "read" || resolveKey === "whisper") {
      setIntel(resolveKey === "read" ? 5 : 7, Math.random() < 0.25);
      changeDivine(resolveKey === "whisper" ? "dependency" : "faith", 1);
      memories.push({ title: "ข้อความที่ไม่มีผู้เขียน", description: "เขาเคยเห็นถ้อยคำปรากฏในบันทึกก่อนที่มือของตนจะเขียนมัน ความจริงบางอย่างจึงไม่ใช่สิ่งที่ค้นพบ แต่เป็นสิ่งที่ค้นหาเขาก่อน", type: "faith", intensity: 34, tags: ["journal", "anomaly", "lore"] });
      narrative = `หน้ากระดาษสั่นเบาๆ เมื่อ${nextCharacter.name}อ่านต่อ บางประโยคกลายเป็นเบาะแส แต่บางประโยคกลับเหมือนอ่านเขากลับคืน`;
    } else if (resolveKey === "tear") {
      changeSurvival("morale", -3);
      nextState.towerPressure = clamp((nextState.towerPressure ?? 0) + 1, 0, 20);
      narrative = `${nextCharacter.name} ฉีกหน้านั้นทิ้ง หมึกบนกระดาษไม่แห้ง แต่มันหยุดเคลื่อนไหว หอคอยเงียบลงแบบที่ไม่น่าไว้ใจ`;
    } else {
      narrative = `${nextCharacter.name} ปิดบันทึกก่อนข้อความจะเขียนจบ บางคืนการไม่รู้คือการพักผ่อนรูปแบบหนึ่ง`;
    }
  } else if (encounter.id === "previous-lost-shadow") {
    if (resolveKey === "callName") {
      if (Math.random() < 0.15) {
        changeSurvival("hope", 4);
        notes.push("เงานั้นเบาบางลงเล็กน้อย ราวกับตราหนี้ชีวิตหนึ่งรอยถูกแตะต้อง");
      } else {
        changeSurvival("morale", -4);
        memories.push({ title: "เงาที่เรียกชื่อเทพ", description: "บางสิ่งที่ตายไปแล้วหันกลับมาตามเสียงของเทพ และเดนได้เห็นว่าความสูญเสียไม่ได้หายไปเพียงเพราะมีผู้หลงทางคนใหม่", type: "guilt", intensity: 42, tags: ["lifeDebt", "echo", "god"] });
      }
      narrative = `เทพเรียกชื่อที่ไม่ควรถูกเรียก เงาข้างบ่อน้ำสั่นไหว และ${nextCharacter.name}เข้าใจว่าตนไม่ได้เป็นคนแรกที่ถูกฝากไว้กับความหวังนี้`;
    } else if (resolveKey === "approach") {
      if (Math.random() < 0.55) changeSurvival("hope", 3);
      else changeSurvival("morale", -5);
      narrative = `${nextCharacter.name} เข้าไปใกล้เงานั้นพอจะเห็นรูปหน้าที่ไม่มีวันกลับมา เมืองพักพิงเงียบเหมือนทุกคนจำได้ แต่ไม่มีใครพูด`;
    } else if (resolveKey === "flee") {
      changeSurvival("morale", -2);
      nextState.towerPressure = clamp((nextState.towerPressure ?? 0) + 1, 0, 20);
      narrative = `เขาหนีจากบ่อน้ำ แต่เสียงฝีเท้าของตนเองกลับฟังเหมือนมีอีกคู่หนึ่งตามมา`;
    } else {
      narrative = `${nextCharacter.name} ปล่อยเงานั้นไว้กับบ่อน้ำ บางความสูญเสียไม่ต้องการคนปลอบโยน มันเพียงต้องการให้มีคนจำ`;
    }
  } else if (encounter.id === "half-floor") {
    if (resolveKey === "explore") {
      if (Math.random() < 0.5) {
        setIntel(8);
        memories.push({ title: "ชั้นที่ไม่มีเลข", description: "เขาเคยเหยียบลงบนชั้นที่ไม่มีชื่อ และได้รู้ว่าหอคอยไม่ได้เรียงตัวตามตัวเลขเสมอไป", type: "growth", intensity: 38, tags: ["half-floor", "seeker", "anomaly"] });
      } else {
        changeSurvival("fatigue", 8);
        changeSurvival("injury", 6);
      }
      narrative = `${nextCharacter.name} สำรวจชั้นครึ่งขั้นจนเวลาเหมือนขยับผิดจังหวะ เขาได้บางสิ่งกลับมา แต่ไม่มีทางแน่ใจว่าตนเสียอะไรไว้ที่นั่น`;
    } else if (resolveKey === "mark" || resolveKey === "journal") {
      setIntel(5);
      changeSurvival("fatigue", resolveKey === "journal" ? 3 : 0);
      narrative = `${nextCharacter.name} ทำให้ชั้นที่ไม่มีเลขกลายเป็นร่องรอยที่อ่านได้ แม้มันจะอ่านเขากลับด้วยเช่นกัน`;
    } else {
      narrative = `เขารีบออกจากชั้นที่ไม่มีเลข ก่อนที่มันจะตัดสินใจว่าเขาควรอยู่ในช่องว่างนั้นนานกว่านี้`;
    }
  } else if (encounter.id === "tower-returns-something") {
    if (resolveKey === "keep") {
      grantGenericItem(Math.random() < 0.45 ? "cold_coin" : Math.random() < 0.75 ? "gatekeeper_mask_shard" : "key_without_keyhole");
      setPrep(6, 10);
      narrative = `${nextCharacter.name} เก็บของชิ้นนั้นไว้ มันไม่อุ่น ไม่เย็น แต่เมื่ออยู่ใกล้ประตูหอคอย ความกลัวของเขาเบาลงเล็กน้อย`;
    } else if (resolveKey === "sell") {
      changeResource("gold", 8 + roll(8));
      narrative = `เขาขายของที่หอคอยคืนมา คนรับซื้อไม่ถามที่มา และรีบเก็บมันเข้ากล่องที่ลงกลอนสามชั้น`;
    } else if (resolveKey === "showNpc") {
      setIntel(5);
      changeSurvival("hope", 1);
      narrative = `คนในเมืองมองของชิ้นนั้นแล้วเงียบไปนานเกินควร คำแนะนำที่ได้ไม่ชัดเจน แต่มีน้ำหนักพอให้เขาจำ`;
    } else {
      nextState.towerPressure = clamp((nextState.towerPressure ?? 0) - 1, 0, 20);
      narrative = `${nextCharacter.name} ทิ้งของชิ้นนั้นไว้ที่ขอบเมือง เช้าวันต่อมา มันไม่อยู่แล้ว และหอคอยดูเงียบลงเล็กน้อย`;
    }
  } else if (encounter.id === "rumor-becomes-real") {
    if (resolveKey === "believe") {
      setIntel(8, Math.random() < 0.3);
      narrative = `ข่าวลือถูกเก็บเป็นแผน มันอาจช่วยชีวิตเขา หรืออาจเป็นวิธีที่หอคอยสอนให้เขาก้าวผิด`;
    } else if (resolveKey === "verify") {
      changeSurvival("fatigue", 4);
      setIntel(7, false);
      narrative = `${nextCharacter.name} ใช้เวลาตรวจข่าวซ้ำจนเสียงรอบเมืองเริ่มแยกชั้น ความจริงที่เหลืออยู่ไม่สมบูรณ์ แต่พอใช้ได้`;
    } else if (resolveKey === "trap") {
      if (Math.random() < 0.45) {
        setPrep(9, 10);
        nextCharacter = adjustPathAffinity(nextCharacter, "seeker", 1);
      } else {
        changeSurvival("morale", -5);
        setIntel(-5, true);
      }
      narrative = `เขาพยายามทำให้ข่าวลือกลายเป็นกับดักย้อนกลับ บางสิ่งในเมืองขยับตาม และไม่มีใครบอกได้ว่าฝ่ายไหนติดกับก่อน`;
    } else {
      changeSurvival("morale", 1);
      narrative = `${nextCharacter.name} ปฏิเสธข่าวลือนั้น และเป็นครั้งแรกในวันนั้นที่เสียงของเมืองดูเบาลง`;
    }
  } else if (encounter.id === "one-who-remembers-god") {
    if (resolveKey === "whisper") {
      changeDivine("faith", 2);
      changeDivine("dependency", 2);
      narrative = `เสียงกระซิบลอดผ่านเดนไปถึงคนแปลกหน้า ใบหน้านั้นซีดลง แต่รอยยิ้มกลับเหมือนยืนยันว่าตนได้ยินถูกต้อง`;
    } else if (resolveKey === "omen") {
      changeSurvival("morale", -2);
      setIntel(6);
      narrative = `ลางบอกเหตุทำให้คนคนนั้นหยุดพูด แต่ภาพที่เดนเห็นติดอยู่หลังเปลือกตา เหมือนมีบางคนในเมืองจำเทพได้จริงๆ`;
    } else if (resolveKey === "ask") {
      setIntel(Math.random() < 0.65 ? 7 : -5, Math.random() >= 0.65);
      narrative = `${nextCharacter.name} ถามแทนเทพ คำตอบที่ได้ไม่ใช่คำอธิบาย แต่เป็นแผนที่ครึ่งหนึ่งของความผิดปกติ`;
    } else {
      changeDivine("independence", 1);
      narrative = `เทพเงียบ คนแปลกหน้าหัวเราะเบาๆ และเดนได้เรียนรู้อีกครั้งว่าบางคำถามไม่จำเป็นต้องได้รับคำตอบทันที`;
    }
  } else if (encounter.id === "missing-choice") {
    if (resolveKey === "force") {
      changeSurvival("injury", 8 + roll(12));
      changeSurvival("morale", -3);
      nextState.towerPressure = clamp((nextState.towerPressure ?? 0) + 1, 0, 20);
      narrative = `${nextCharacter.name} ฝืนดึงทางเลือกของตนกลับมา ความคิดเหมือนถูกมีดบิด แต่เขายังจำได้ว่าตนตั้งใจจะทำอะไร`;
    } else if (resolveKey === "follow") {
      setIntel(Math.random() < 0.5 ? 8 : -5, Math.random() >= 0.5);
      changeSurvival("hope", -2);
      narrative = `เขาปล่อยให้หอคอยนำทาง และพบว่าทางเลือกที่เหลือไม่ได้ว่างเปล่า มันถูกใครบางคนจัดวางไว้`;
    } else if (resolveKey === "silence") {
      changeDivine("independence", 3);
      changeSurvival("morale", Math.random() < 0.55 ? 2 : -3);
      memories.push({ title: "ทางเลือกที่เหลืออยู่ในความเงียบ", description: "เมื่อหอคอยลบทางเลือกออกจากใจ เขากลับพบว่าความเงียบยังเหลือพื้นที่เล็กๆ ให้ตัดสินใจเอง", type: "growth", intensity: 44, tags: ["silence", "choice", "independence"] });
      narrative = `เทพเงียบ และในช่องว่างนั้น ${nextCharacter.name} พบทางเลือกที่หอคอยลืมลบ`;
    } else {
      if (Math.random() < 0.35) {
        setPrep(10, 12);
        nextState.towerPressure = clamp((nextState.towerPressure ?? 0) - 2, 0, 20);
      } else {
        changeSurvival("fatigue", 10);
        changeSurvival("sickness", 5);
      }
      narrative = `${nextCharacter.name} มองหาประตูที่ไม่มีใครเห็น และพบเพียงรอยต่อเล็กๆ ระหว่างการตัดสินใจกับโชคชะตา`;
    }
  }

  return { character: nextCharacter, state: nextState, narrative, notes, memories };
}

function createDeltas(before: Character, after: Character): ActionDelta[] {
  const candidates: NumericChange[] = [
    { key: "gold", label: "ทอง", before: before.gold, after: after.gold, valueType: "resource" },
    { key: "food", label: "อาหาร", before: before.food, after: after.food, valueType: "resource" },
    { key: "hunger", label: "ความหิว", before: before.survival.hunger, after: after.survival.hunger, valueType: "bad" },
    { key: "fatigue", label: "ความเหนื่อยล้า", before: before.survival.fatigue, after: after.survival.fatigue, valueType: "bad" },
    { key: "injury", label: "อาการบาดเจ็บ", before: before.survival.injury, after: after.survival.injury, valueType: "bad" },
    { key: "sickness", label: "อาการป่วย", before: before.survival.sickness, after: after.survival.sickness, valueType: "bad" },
    { key: "morale", label: "ขวัญกำลังใจ", before: before.survival.morale, after: after.survival.morale, valueType: "good" },
    { key: "hope", label: "ความหวัง", before: before.survival.hope, after: after.survival.hope, valueType: "good" },
    { key: "faith", label: "ศรัทธา", before: before.divine.faith, after: after.divine.faith, valueType: "good" },
    { key: "independence", label: "การยืนหยัดด้วยตนเอง", before: before.divine.independence, after: after.divine.independence, valueType: "good" },
    { key: "dependency", label: "การพึ่งพาเทพ", before: before.divine.dependency, after: after.divine.dependency, valueType: "bad" },
  ];
  return candidates
    .filter((item) => item.before !== item.after)
    .map((item) => ({
      ...item,
      delta: item.after - item.before,
    }));
}

function roll(maxInclusive: number): number {
  return Math.floor(Math.random() * maxInclusive) + 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
