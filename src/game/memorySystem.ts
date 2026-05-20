import type { Character, DivineActionId, FloorDefinition, FloorResult, GameState, Memory, MemoryEffect } from "../types/game";

type MemoryDraft = Omit<Memory, "id" | "dayCreated"> & { id?: string; dayCreated?: number };

const ACTIVE_MEMORY_LIMIT = 20;

export function addMemory(gameState: GameState, memory: MemoryDraft): GameState {
  if (!gameState.character) return gameState;
  const fullMemory: Memory = {
    ...memory,
    id: memory.id ?? crypto.randomUUID(),
    dayCreated: memory.dayCreated && memory.dayCreated > 0 ? memory.dayCreated : gameState.day,
  };
  const existing = gameState.character.memories.find((item) => item.title === fullMemory.title);
  const memories = existing
    ? gameState.character.memories.map((item) =>
        item.id === existing.id
          ? {
              ...item,
              intensity: Math.min(100, Math.max(item.intensity, fullMemory.intensity) + 8),
              description: fullMemory.description,
              tags: Array.from(new Set([...item.tags, ...fullMemory.tags])),
            }
          : item,
      )
    : [fullMemory, ...gameState.character.memories];

  return {
    ...gameState,
    character: {
      ...gameState.character,
      memories: memories.slice(0, ACTIVE_MEMORY_LIMIT),
    },
  };
}

export function getRecentMemories(character: Character, count: number): Memory[] {
  return character.memories.slice(0, count);
}

export function hasMemoryTag(character: Character, tag: string): boolean {
  return character.memories.some((memory) => memory.tags.includes(tag));
}

export function calculateMemoryModifiers(character: Character, contextTags: string[]): number {
  return character.memories.slice(0, ACTIVE_MEMORY_LIMIT).reduce((total, memory) => {
    const matches = memory.tags.filter((tag) => contextTags.includes(tag)).length;
    if (matches === 0) return total;
    const base = Math.ceil(memory.intensity / 25);
    const modifier = memory.effects?.scoreModifier ?? defaultMemoryScoreModifier(memory.type);
    return total + modifier * base;
  }, 0);
}

export function createMemoryFromEvent(
  result: FloorResult,
  divineAction: DivineActionId,
  character: Character,
  floor: FloorDefinition,
): Memory | null {
  const tags = getFloorMemoryTags(floor);
  const cleared = result.level === "greatSuccess" || result.level === "success" || result.level === "costlySuccess";
  const failed = result.level === "failure" || result.level === "criticalFailure";

  if (floor.floor === 10 && cleared) {
    return buildMemory({
      title: result.level === "costlySuccess" ? "ราคาของประตูแรก" : "วันที่ประตูแรกเปิดออก",
      description:
        result.level === "costlySuccess"
          ? "ประตูยอมเปิด แต่ไม่เคยเปิดให้ใครโดยไม่เรียกเก็บบางสิ่ง รอยแผลครั้งนี้จึงไม่ใช่เพียงบาดแผล แต่มันคือค่าผ่านทางของตัวตนใหม่"
          : "เขาไม่ได้ชนะเพราะไร้ความกลัว เขาชนะเพราะแม้ความกลัวยังอยู่ เขาก็ยังเลือกก้าวต่อ",
      type: "growth",
      intensity: result.level === "greatSuccess" ? 72 : result.level === "success" ? 62 : 58,
      tags: ["floor10", "gate", "evolution", "identity", ...tags],
      floorNumber: floor.floor,
      effects: { scoreModifier: 1, survival: { hope: 2, morale: 2 } },
    });
  }

  if (floor.floor === 10 && cleared) {
    return buildMemory({
      title: "ผ่านประตูแรก",
      description: "เขายังจำเสียงมงกุฎแตกได้ ราวกับหอคอยทั้งหลังหยุดหายใจเพื่อยอมรับว่าเขาผ่านประตูแรกมาแล้ว",
      type: "hope",
      intensity: 54,
      tags: ["boss", "gate", "hope", ...tags],
      floorNumber: floor.floor,
      effects: { scoreModifier: 1, survival: { hope: 2, morale: 2 } },
    });
  }

  if (floor.floor === 2 && failed) {
    return buildMemory({
      title: "เสียงในความมืด",
      description: "เขายังจำทางเดินที่ไม่มีแสงได้ดี ทุกครั้งที่เงาทอดยาวเกินไป มือของเขาจะกำแน่นโดยไม่รู้ตัว",
      type: "trauma",
      intensity: 38,
      tags: ["darkness", "fear", ...tags],
      floorNumber: floor.floor,
      effects: { scoreModifier: -1, survival: { morale: -2 } },
    });
  }

  if (divineAction === "silence" && cleared) {
    return buildMemory({
      title: "วันที่เทพเงียบ",
      description: "ครั้งหนึ่ง เทพไม่ได้เอ่ยสิ่งใด และเขาต้องเลือกด้วยตนเอง แม้จะหวาดกลัว แต่นั่นคือก้าวแรกของการยืนหยัด",
      type: "growth",
      intensity: result.level === "greatSuccess" || result.level === "success" ? 36 : 24,
      tags: ["silence", "independence", ...tags],
      floorNumber: floor.floor,
      effects: { scoreModifier: 1, divine: { independence: 1 } },
    });
  }

  if (divineAction === "blessing" && cleared) {
    return buildMemory({
      title: "พรที่ช่วยชีวิต",
      description: "ในช่วงเวลาที่เขาคิดว่าตนเองจะไม่รอด แสงอุ่นบางอย่างได้ฉุดเขากลับมา ตั้งแต่นั้น เขาเริ่มมองฟ้าบ่อยขึ้น",
      type: "faith",
      intensity: result.level === "greatSuccess" || result.level === "success" ? 34 : 28,
      tags: ["blessing", "saved", "faith", ...tags],
      floorNumber: floor.floor,
      effects: { scoreModifier: 1, divine: { faith: 2, dependency: 1 } },
    });
  }

  if (character.survival.hunger >= 90) {
    return createHungerMemory(floor.floor);
  }

  if (floor.challengeType === "npc" && cleared) {
    return buildMemory({
      title: "มือที่ยื่นออกไป",
      description: "เขาจำได้ว่าครั้งหนึ่งตนเองเลือกช่วยใครบางคน ทั้งที่หอคอยพยายามสอนให้เอาตัวรอดเพียงลำพัง",
      type: "bond",
      intensity: 30,
      tags: ["npc", "bond", "compassion"],
      floorNumber: floor.floor,
      effects: { scoreModifier: 1, survival: { morale: 2 } },
    });
  }

  if (floor.challengeType === "npc" && failed) {
    return buildMemory({
      title: "มือที่ปล่อยหลุด",
      description: "บางครั้งความช่วยเหลือมาช้าเกินไป และภาพนั้นยังตามเขากลับมาในคืนที่เมืองพักพิงเงียบผิดปกติ",
      type: "guilt",
      intensity: 32,
      tags: ["npc", "guilt", "compassion"],
      floorNumber: floor.floor,
      effects: { scoreModifier: -1, survival: { morale: -2 } },
    });
  }

  return null;
}

export function createHungerMemory(floorNumber?: number): Memory {
  return buildMemory({
    title: "ความหิวที่กัดกิน",
    description: "ความหิวครั้งนั้นไม่ได้จบลงเมื่อได้กินอาหาร มันทิ้งร่องรอยไว้ในใจ ทำให้เขากลัววันที่เสบียงหมดมากกว่าเดิม",
    type: "survival",
    intensity: 36,
    tags: ["hunger", "starvation", "survival"],
    floorNumber,
    effects: { scoreModifier: -1, survival: { morale: -2 } },
  });
}

export function createCollapseMemory(): Memory {
  return buildMemory({
    title: "ร่างกายที่ไม่ยอมลุก",
    description: "เขาจำความรู้สึกของเข่าที่ทรุดลงกับพื้นได้ดี ราวกับร่างกายตัดสินใจแทนจิตใจว่าไปต่อไม่ไหวแล้ว",
    type: "trauma",
    intensity: 34,
    tags: ["fatigue", "collapse", "body"],
    effects: { scoreModifier: -1, survival: { hope: -1 } },
  });
}

export function createSicknessMemory(): Memory {
  return buildMemory({
    title: "ไข้ที่พรากเสียง",
    description: "ตอนที่ไข้สูงที่สุด แม้แต่คำอธิษฐานก็กลายเป็นเสียงแหบแห้ง เขาจึงกลัวความเงียบของร่างกายตนเองมากขึ้น",
    type: "trauma",
    intensity: 36,
    tags: ["sickness", "fever", "body"],
    effects: { scoreModifier: -1, survival: { morale: -1 } },
  });
}

export function getFloorMemoryTags(floor: FloorDefinition): string[] {
  const tags = [floor.challengeType, `floor-${floor.floor}`];
  const text = `${floor.title} ${floor.description}`.toLowerCase();
  if (floor.floor === 2 || text.includes("มืด") || text.includes("เงา")) tags.push("darkness", "fear");
  if (floor.floor === 3 || text.includes("อาหาร") || text.includes("หิว")) tags.push("hunger", "survival");
  if (floor.challengeType === "npc") tags.push("npc");
  return Array.from(new Set(tags));
}

function buildMemory(memory: MemoryDraft): Memory {
  return {
    ...memory,
    id: memory.id ?? crypto.randomUUID(),
    dayCreated: memory.dayCreated ?? 0,
  };
}

function defaultMemoryScoreModifier(type: Memory["type"]): number {
  if (type === "growth" || type === "faith" || type === "bond" || type === "hope") return 1;
  if (type === "trauma" || type === "guilt" || type === "survival") return -1;
  return 0;
}
