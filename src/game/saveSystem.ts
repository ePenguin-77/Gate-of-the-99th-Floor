import type { GameState, PlayerProfile } from "../types/game";
import { defaultDifficultyMode } from "./difficulty";
import { normalizeNpcs } from "./npcSystem";
import { normalizePathAffinity } from "./pathAffinity";

const SAVE_KEY = "gate-of-the-99th-floor.save.v3";
const PROFILE_KEY = "gate-of-the-99th-floor.profile.v1";

export const initialPlayerProfile: PlayerProfile = {
  fallenSouls: 0,
  lifeDebtMarks: 0,
  memorials: [],
};

export function saveGame(state: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function loadGame(): GameState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GameState;
    parsed.difficultyMode = parsed.difficultyMode ?? defaultDifficultyMode;
    parsed.towerPressure = parsed.towerPressure ?? 0;
    parsed.rareEncounterCooldown = parsed.rareEncounterCooldown ?? 0;
    parsed.activeRareEncounter = parsed.activeRareEncounter ?? undefined;
    parsed.rareEncountersSeen = parsed.rareEncountersSeen ?? [];
    parsed.totalActionsTaken = parsed.totalActionsTaken ?? 0;
    parsed.npcs = normalizeNpcs(parsed.npcs);
    parsed.hubEventsSeen = parsed.hubEventsSeen ?? [];
    parsed.divineStrain = parsed.divineStrain ?? 0;
    parsed.floorIntel = parsed.floorIntel ?? undefined;
    if (parsed.character) {
      parsed.character.survival = {
        ...parsed.character.survival,
        sickness: parsed.character.survival.sickness ?? 0,
      };
      parsed.character.memories = parsed.character.memories ?? [];
      parsed.character.traitProgress = parsed.character.traitProgress ?? [];
      parsed.character.evolvedTraits = parsed.character.evolvedTraits ?? [];
      parsed.character.skills = parsed.character.skills ?? [];
      parsed.character.pathAffinity = normalizePathAffinity(parsed.character.pathAffinity);
      parsed.character.hasClearedFloor10 = parsed.character.hasClearedFloor10 ?? (parsed.character.maxFloorCleared ?? 0) >= 10;
      parsed.character.classEvolutionResolved = parsed.character.classEvolutionResolved ?? Boolean(parsed.character.advancedClassId || parsed.character.advancedClassName);
      parsed.character.pendingAdvancedClassChoice = parsed.character.pendingAdvancedClassChoice ?? (parsed.character.hasClearedFloor10 && !parsed.character.classEvolutionResolved);
      parsed.character.advancedClassId = parsed.character.advancedClassId ?? undefined;
      parsed.character.advancedClassName = parsed.character.advancedClassName ?? undefined;
      parsed.character.inventory = parsed.character.inventory ?? [];
      parsed.character.inventoryLimit = parsed.character.inventoryLimit ?? 8;
      parsed.character.equippedItems = parsed.character.equippedItems ?? [];
    }
    return parsed;
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function resetSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function savePlayerProfile(profile: PlayerProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadPlayerProfile(): PlayerProfile {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return initialPlayerProfile;
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    return {
      fallenSouls: parsed.fallenSouls ?? 0,
      lifeDebtMarks: parsed.lifeDebtMarks ?? 0,
      memorials: parsed.memorials ?? [],
    };
  } catch {
    localStorage.removeItem(PROFILE_KEY);
    return initialPlayerProfile;
  }
}
