import { classes } from "../data/classes";
import { traits } from "../data/traits";
import { createDefaultPathAffinity } from "./pathAffinity";
import type { Character, PlayerProfile, StatKey, Stats, SurvivalValues } from "../types/game";

const names = ["คาเอล", "มีรา", "โทวาน", "ลีโอรา", "เรน", "เซรา", "เดน", "เอลิอัน", "นารา", "โคริน"];
const baseStats: Stats = { strength: 7, agility: 7, endurance: 7, focus: 7, willpower: 7, instinct: 7 };

const statKeys: StatKey[] = ["strength", "agility", "endurance", "focus", "willpower", "instinct"];

const randomItem = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function createRandomCharacter(profile?: PlayerProfile): Character {
  const chosenClass = randomItem(classes);
  const shuffledTraits = [...traits].sort(() => Math.random() - 0.5);
  const selectedTraits = [
    shuffledTraits.find((trait) => trait.kind === "positive"),
    shuffledTraits.find((trait) => trait.kind === "double-edged"),
    shuffledTraits.find((trait) => trait.kind === "negative"),
  ].filter(Boolean).slice(0, 3);

  const stats = { ...baseStats };
  statKeys.forEach((key) => {
    stats[key] += Math.floor(Math.random() * 5) - 1;
  });

  Object.entries(chosenClass.statModifiers).forEach(([key, value]) => {
    stats[key as StatKey] += value ?? 0;
  });

  const debtPenalty = profile?.lifeDebtMarks ?? 0;
  const survival: SurvivalValues = {
    hunger: randomRange(10, 30),
    fatigue: randomRange(5, 25),
    morale: randomRange(50, 75),
    hope: clamp(randomRange(50, 75) - debtPenalty, 40, 100),
    injury: 0,
    sickness: 0,
  };
  selectedTraits.forEach((trait) => {
    Object.entries(trait?.statModifiers ?? {}).forEach(([key, value]) => {
      stats[key as StatKey] += value ?? 0;
    });
    Object.entries(trait?.survivalModifiers ?? {}).forEach(([key, value]) => {
      survival[key as keyof SurvivalValues] = clamp(survival[key as keyof SurvivalValues] + (value ?? 0), 0, 100);
    });
  });

  statKeys.forEach((key) => {
    stats[key] = clamp(stats[key], 1, 20);
  });

  const traitNames = selectedTraits.map((trait) => trait?.name).join(", ");
  const personalitySummary = `${chosenClass.name}ผู้ถูกหล่อหลอมด้วยนิสัย ${traitNames} เขาไม่ใช่หุ่นเชิด เขาจะฟัง สงสัย หวาดกลัว และบางครั้งอาจเลือกขัดต่อมือของเทพ`;

  return {
    name: randomItem(names),
    classId: chosenClass.id,
    className: chosenClass.name,
    traits: selectedTraits as Character["traits"],
    stats,
    survival,
    divine: {
      faith: clamp(randomRange(chosenClass.id === "acolyte" ? 15 : 5, chosenClass.id === "acolyte" ? 30 : 24) - debtPenalty, 0, 100),
      independence: randomRange(5, 30),
      dependency: randomRange(0, 15),
    },
    gold: 12,
    food: 4,
    currentFloor: 1,
    maxFloorCleared: 0,
    personalitySummary,
    memories: [],
    traitProgress: selectedTraits.map((trait) => ({
      traitId: trait!.id,
      progress: 0,
      possibleEvolutions: [],
      history: [],
    })),
    evolvedTraits: [],
    skills: [],
    pathAffinity: createDefaultPathAffinity(),
    hasClearedFloor10: false,
    classEvolutionResolved: false,
    pendingAdvancedClassChoice: false,
    inventory: [
      { itemId: "dry_bread", quantity: 1 },
      { itemId: "rough_bandage", quantity: 1 },
    ],
    inventoryLimit: 8,
    equippedItems: ["dry_bread"],
  };
}

export function applyRest(character: Character): Character {
  const eatsFood = character.food > 0;
  const hungerAfterRest = eatsFood ? character.survival.hunger + 8 - 20 : character.survival.hunger + 8;
  return {
    ...character,
    food: eatsFood ? Math.max(0, character.food - 1) : character.food,
    survival: {
      ...character.survival,
      fatigue: clamp(character.survival.fatigue - 35, 0, 100),
      morale: clamp(character.survival.morale + 5, 0, 100),
      hope: clamp(character.survival.hope + 3, 0, 100),
      hunger: clamp(hungerAfterRest, 0, 100),
      injury: clamp(character.survival.injury - 5, 0, 100),
      sickness: clamp(character.survival.sickness - (eatsFood ? 4 : 0), 0, 100),
    },
  };
}

export function applyTraining(character: Character): Character {
  const stat = randomItem(statKeys);
  return {
    ...character,
    gold: Math.max(0, character.gold - 3),
    stats: { ...character.stats, [stat]: clamp(character.stats[stat] + 1, 1, 24) },
    survival: {
      ...character.survival,
      fatigue: clamp(character.survival.fatigue + 18, 0, 100),
      hunger: clamp(character.survival.hunger + 12, 0, 100),
      morale: clamp(character.survival.morale + 2, 0, 100),
    },
  };
}

export function applyGather(character: Character): Character {
  const resourceful = character.traits.some((trait) => trait.id === "resourceful");
  const tinker = character.classId === "tinker";
  const foodGain = randomRange(1, 3) + (resourceful ? 1 : 0);
  const goldGain = randomRange(2, 6) + (tinker ? 2 : 0);
  return {
    ...character,
    food: character.food + foodGain,
    gold: character.gold + goldGain,
    survival: {
      ...character.survival,
      fatigue: clamp(character.survival.fatigue + 15, 0, 100),
      hunger: clamp(character.survival.hunger + 10, 0, 100),
    },
  };
}
