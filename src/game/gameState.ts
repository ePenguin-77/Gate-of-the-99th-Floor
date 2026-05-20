import type { Character, GameState, JournalEntry } from "../types/game";
import { defaultDifficultyMode } from "./difficulty";
import { createInitialNpcs } from "./npcSystem";

export const initialGameState: GameState = {
  character: null,
  journal: [],
  npcs: createInitialNpcs(),
  hubEventsSeen: [],
  day: 1,
  difficultyMode: defaultDifficultyMode,
  towerPressure: 0,
  rareEncounterCooldown: 0,
  rareEncountersSeen: [],
  totalActionsTaken: 0,
};

export function addJournalEntry(
  state: GameState,
  entry: Omit<JournalEntry, "id" | "day">,
): GameState {
  return {
    ...state,
    day: state.day + 1,
    journal: [
      {
        id: crypto.randomUUID(),
        day: state.day,
        ...entry,
      },
      ...state.journal,
    ],
  };
}

export function startGame(character: Character): GameState {
  return addJournalEntry(
    {
      character,
      journal: [],
      npcs: createInitialNpcs(),
      hubEventsSeen: [],
      day: 1,
      difficultyMode: defaultDifficultyMode,
      towerPressure: 0,
      rareEncounterCooldown: 0,
      rareEncountersSeen: [],
      totalActionsTaken: 0,
      ended: false,
    },
    {
      title: "เสียงใหม่เหนือหอคอย",
      text: `${character.name} ตื่นขึ้นใต้เงาหอคอย และสัมผัสได้ว่ามีบางสิ่งกำลังเฝ้ามองเขาด้วยความอดทนที่ไม่ควรเป็นของมนุษย์`,
    },
  );
}
