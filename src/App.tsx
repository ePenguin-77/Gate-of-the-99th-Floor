import { lazy, Suspense, type ReactNode, useEffect, useMemo, useState } from "react";
import { Button } from "./components/Button";
import { GameBackground } from "./components/layout/GameBackground";
import { Panel } from "./components/Panel";
import { RareEncounterPopup } from "./components/RareEncounterPopup";
import { floors } from "./data/floors";
import { rareEncounters } from "./data/rareEncounters";
import { createRandomCharacter } from "./game/character";
import { applyHubActivity, createHubActionResult, createTowerActionResult, updateConsecutiveActivity } from "./game/activityEffects";
import { estimateTowerAttempt, resolveFloor } from "./game/eventResolver";
import { addJournalEntry, initialGameState, startGame } from "./game/gameState";
import { investigateNextFloor } from "./game/intelSystem";
import { resultLabels } from "./game/labels";
import { addMemory } from "./game/memorySystem";
import { hasSave, loadGame, loadPlayerProfile, resetSave, saveGame, savePlayerProfile } from "./game/saveSystem";
import { applyShopAction } from "./game/shopSystem";
import { applySurvivalConsequences } from "./game/survivalConsequences";
import { applyPressureForActivity, applyPressureForTowerResult, getTowerPressureEffects } from "./game/towerPressure";
import { forceRareEncounter, maybeTriggerRareEncounter, resolveRareEncounterChoice } from "./game/rareEncounterSystem";
import { HubScreen } from "./screens/HubScreen";
import { StartScreen } from "./screens/StartScreen";
import type { ActivityType, AdvancedClass, Character, DeathRecord, DivineActionId, EncounterDecisionId, EncounterMidpointOutcome, FloorDefinition, FloorResult, GameState, HubEventPrompt, Memory, PlayerProfile, ScreenId, ShopActionId } from "./types/game";
import { applyHubEventChoice, maybeCreateHubEvent } from "./game/hubEvents";
import { adjustNpcRelationship, getDailyNpcLine, getNpcMemorialText, getNpcServiceCostMultiplier, getNpcServiceNarrative, unlockNpc } from "./game/npcSystem";
import { applyAdvancedClass, applyAdvancedClassObject, getEligibleAdvancedClasses, getFallbackAdvancedClass, getNearAdvancedClasses, type NearAdvancedClass } from "./game/advancedClassSystem";
import { applyPathChangesFromEvent, formatPathChanges } from "./game/pathAffinity";
import { equipItem, removeItem, unequipItem, useItem } from "./game/inventorySystem";
import { playAmbience, playDivineActionSound, playMusic, playSfx, playUiSound, stopAllAudio } from "./game/audioSystem";
import type { UiSoundId } from "./game/audioRegistry";

type PendingAction =
  | { type: "challenge"; revisit: boolean; title: string; message: string }
  | { type: "train"; title: string; message: string }
  | { type: "gather"; title: string; message: string };

const MAX_TOWER_FLOOR = 20;

const CharacterCreationScreen = lazy(() => import("./screens/CharacterCreationScreen").then((module) => ({ default: module.CharacterCreationScreen })));
const CharacterScreen = lazy(() => import("./screens/CharacterScreen").then((module) => ({ default: module.CharacterScreen })));
const DeathScreen = lazy(() => import("./screens/DeathScreen").then((module) => ({ default: module.DeathScreen })));
const EventResultScreen = lazy(() => import("./screens/EventResultScreen").then((module) => ({ default: module.EventResultScreen })));
const Floor10FinaleScreen = lazy(() => import("./screens/Floor10FinaleScreen").then((module) => ({ default: module.Floor10FinaleScreen })));
const Floor20FinaleScreen = lazy(() => import("./screens/Floor20FinaleScreen").then((module) => ({ default: module.Floor20FinaleScreen })));
const Floor20ResultScreen = lazy(() => import("./screens/Floor20ResultScreen").then((module) => ({ default: module.Floor20ResultScreen })));
const InventoryScreen = lazy(() => import("./screens/InventoryScreen").then((module) => ({ default: module.InventoryScreen })));
const JournalScreen = lazy(() => import("./screens/JournalScreen").then((module) => ({ default: module.JournalScreen })));
const NpcScreen = lazy(() => import("./screens/NpcScreen").then((module) => ({ default: module.NpcScreen })));
const SettingsScreen = lazy(() => import("./screens/SettingsScreen").then((module) => ({ default: module.SettingsScreen })));
const TowerEncounterScreen = lazy(() => import("./screens/TowerEncounterScreen").then((module) => ({ default: module.TowerEncounterScreen })));
const AdvancedClassChoiceScreen = lazy(() => import("./screens/AdvancedClassChoiceScreen").then((module) => ({ default: module.AdvancedClassChoiceScreen })));

function addAct2Intro(gameState: GameState): GameState {
  return addMemory(
    addJournalEntry(gameState, {
      floor: 11,
      title: "ประตูแรกเปิดออกแล้ว",
      text:
        "ประตูแรกเปิดออกแล้ว แต่สิ่งที่รออยู่หลังประตูไม่ใช่บันไดขึ้นชั้นต่อไป มันคือเมืองทั้งเมือง ถนนไร้ผู้คนทอดยาวใต้เพดานหอคอย หน้าต่างทุกบานมืดสนิท และป้ายเก่าหน้าประตูเมืองเขียนไว้เพียงว่า “ยินดีต้อนรับ ผู้ที่ยังไม่ตาย”",
    }),
    {
      title: "เมืองร้างเหนือประตูแรก",
      description: "หลังผ่านประตูแรก ผู้หลงทางพบเมืองร้างที่ไม่ควรมีอยู่ในหอคอย มันเงียบเกินกว่าจะเป็นที่พัก และเป็นระเบียบเกินกว่าจะเป็นซากปรักหักพัง",
      type: "growth",
      intensity: 70,
      tags: ["act2", "abandoned_city", "first_gate", "mystery"],
      floorNumber: 11,
      dayCreated: gameState.day,
      effects: { scoreModifier: 1, survival: { hope: 1 } },
    },
  );
}

function ScreenLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ash-950 px-5 text-stone-200">
      <Panel className="border-ember-300/30 bg-black/40 p-6 text-center">
        <p className="font-serif text-2xl text-ember-100">กำลังเปิดบันทึกของหอคอย...</p>
      </Panel>
    </main>
  );
}

export default function App() {
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => loadPlayerProfile());
  const [screen, setScreen] = useState<ScreenId>("start");
  const [state, setState] = useState<GameState>(initialGameState);
  const [draftCharacter, setDraftCharacter] = useState<Character>(() => createRandomCharacter(loadPlayerProfile()));
  const [activeFloor, setActiveFloor] = useState<FloorDefinition | null>(null);
  const [activeResult, setActiveResult] = useState<FloorResult | null>(null);
  const [deathRecord, setDeathRecord] = useState<DeathRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingHubEvent, setPendingHubEvent] = useState<HubEventPrompt | null>(null);
  const [advancedClassOptions, setAdvancedClassOptions] = useState<AdvancedClass[]>([]);
  const [nearAdvancedClassOptions, setNearAdvancedClassOptions] = useState<NearAdvancedClass[]>([]);
  const [fallbackAdvancedClass, setFallbackAdvancedClass] = useState<AdvancedClass | null>(null);
  const [shouldOfferAdvancedClass, setShouldOfferAdvancedClass] = useState(false);
  const [isRevisit, setIsRevisit] = useState(false);
  const [saveAvailable, setSaveAvailable] = useState(false);
  const [inventoryMessage, setInventoryMessage] = useState<string | undefined>();
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    setSaveAvailable(hasSave());
  }, []);

  useEffect(() => {
    function onGlobalButtonClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button || button.disabled || button.dataset.audioSilent === "true") return;
      playUiSound((button.dataset.audioId as UiSoundId | undefined) ?? "ui_click");
    }
    document.addEventListener("click", onGlobalButtonClick, true);
    return () => document.removeEventListener("click", onGlobalButtonClick, true);
  }, []);

  useEffect(() => {
    function markAudioReady() {
      if (import.meta.env.DEV) console.log("[audio] Audio unlocked");
      setAudioReady(true);
    }
    window.addEventListener("pointerdown", markAudioReady, { once: true });
    window.addEventListener("keydown", markAudioReady, { once: true });
    return () => {
      window.removeEventListener("pointerdown", markAudioReady);
      window.removeEventListener("keydown", markAudioReady);
      stopAllAudio();
    };
  }, []);

  useEffect(() => {
    if (!audioReady) return;
    if (state.activeRareEncounter) {
      playSfx("sfx_rare_encounter");
      playAmbience("ambience_rare");
      return;
    }
    if (screen === "start") {
      playAmbience("ambience_title");
      playMusic("music_title");
      return;
    }
    if (screen === "tower") {
      playAmbience("ambience_tower");
      if (activeFloor?.floor === 10) playMusic("music_floor10");
      else if (activeFloor?.floor === 20) playMusic("music_floor20");
      else playMusic("music_tower_tension");
      return;
    }
    playAmbience("ambience_hub");
    playMusic("music_hub");
  }, [activeFloor?.floor, audioReady, screen, state.activeRareEncounter]);

  useEffect(() => {
    if (state.character && !state.ended) {
      saveGame(state);
      setSaveAvailable(true);
    }
  }, [state]);

  useEffect(() => {
    savePlayerProfile(playerProfile);
  }, [playerProfile]);

  const latestEntry = useMemo(() => state.journal[0], [state.journal]);
  const hubWarnings = useMemo(() => (state.character ? getHubWarnings(state.character) : []), [state.character]);
  const activeRareEncounter = useMemo(
    () => rareEncounters.find((encounter) => encounter.id === state.activeRareEncounter?.encounterId),
    [state.activeRareEncounter],
  );
  const showRareEncounterDebug = import.meta.env.DEV && new URLSearchParams(window.location.search).has("debugRare");

  function withRareEncounterRoll(nextState: GameState, actionType: string): GameState {
    return maybeTriggerRareEncounter(nextState, actionType, playerProfile);
  }

  function chooseRareEncounter(choiceId: string) {
    if (!state.activeRareEncounter) return;
    if (state.activeRareEncounter.encounterId === "previous-lost-shadow" && choiceId === "call" && playerProfile.lifeDebtMarks > 0 && Math.random() < 0.15) {
      setPlayerProfile((current) => ({
        ...current,
        lifeDebtMarks: Math.max(0, current.lifeDebtMarks - 1),
      }));
    }
    setState(resolveRareEncounterChoice(state, state.activeRareEncounter.encounterId, choiceId));
  }

  function forceRareEncounterForDev() {
    setState(forceRareEncounter(state, "challengeNextFloor", playerProfile));
  }

  function beginNewGame() {
    setDraftCharacter(createRandomCharacter(playerProfile));
    setDeathRecord(null);
    setPendingAction(null);
    setPendingHubEvent(null);
    setAdvancedClassOptions([]);
    setNearAdvancedClassOptions([]);
    setFallbackAdvancedClass(null);
    setShouldOfferAdvancedClass(false);
    setActiveFloor(null);
    setActiveResult(null);
    setScreen("creation");
  }

  function continueGame() {
    const loaded = loadGame();
    if (loaded?.character) {
      setState(loaded);
      setDeathRecord(null);
      setPendingAction(null);
      setPendingHubEvent(null);
      setAdvancedClassOptions([]);
      setNearAdvancedClassOptions([]);
      setFallbackAdvancedClass(null);
      setShouldOfferAdvancedClass(false);
      setActiveFloor(null);
      setActiveResult(null);
      if (loaded.character.pendingAdvancedClassChoice && !loaded.character.classEvolutionResolved) {
        setAdvancedClassOptions(getEligibleAdvancedClasses(loaded.character));
        setNearAdvancedClassOptions(getNearAdvancedClasses(loaded.character, 2));
        setFallbackAdvancedClass(getFallbackAdvancedClass(loaded.character));
        setScreen("advancedClass");
      } else {
        setScreen("hub");
      }
    }
  }

  function clearSave() {
    resetSave();
    setState(initialGameState);
    setDeathRecord(null);
    setPendingAction(null);
    setPendingHubEvent(null);
    setAdvancedClassOptions([]);
    setNearAdvancedClassOptions([]);
    setFallbackAdvancedClass(null);
    setShouldOfferAdvancedClass(false);
    setActiveFloor(null);
    setActiveResult(null);
    setSaveAvailable(false);
    setScreen("start");
  }

  function acceptCharacter() {
    setState(startGame(draftCharacter));
    setScreen("hub");
  }

  function openFloor(revisit: boolean) {
    if (!state.character) return;
    if (state.character.survival.fatigue >= 100) return;
    const floorNumber = revisit ? Math.max(1, state.character.maxFloorCleared) : Math.min(MAX_TOWER_FLOOR, state.character.maxFloorCleared + 1);
    if (!revisit && floorNumber >= 11 && !state.character.classEvolutionResolved) {
      const markedCharacter = {
        ...state.character,
        hasClearedFloor10: state.character.hasClearedFloor10 || state.character.maxFloorCleared >= 10,
        pendingAdvancedClassChoice: true,
      };
      setAdvancedClassOptions(getEligibleAdvancedClasses(markedCharacter));
      setNearAdvancedClassOptions(getNearAdvancedClasses(markedCharacter, 2));
      setFallbackAdvancedClass(getFallbackAdvancedClass(markedCharacter));
      setState({
        ...state,
        character: markedCharacter,
        lastActionResult: {
          activityName: "เมืองร้างเหนือประตูแรก",
          narrative: "ชะตายังไม่เปลี่ยนรูป ผู้หลงทางยังไม่พร้อมก้าวเข้าสู่เมืองร้างเหนือประตูแรก",
          deltas: [],
          day: state.day,
        },
      });
      setScreen("advancedClass");
      return;
    }
    const floor = floors.find((item) => item.floor === floorNumber);
    const estimate = floor
      ? estimateTowerAttempt(state.character, floor, "whisper", revisit, state.preparationBuff, state.floorIntel, state.difficultyMode, state.divineStrain ?? 0, state.towerPressure ?? 0)
      : null;
    if (estimate && estimate.chance < 25) {
      playUiSound("ui_warning");
      setPendingAction({
        type: "challenge",
        revisit,
        title: "โอกาสรอดต่ำมาก",
        message: "โอกาสรอดต่ำมาก ผู้หลงทางอาจบาดเจ็บหนักหรือเสียชีวิตได้ ต้องการฝืนขึ้นหอคอยหรือไม่?",
      });
      return;
    }
    if (
      state.character.survival.hunger >= 90 ||
      state.character.survival.fatigue >= 90 ||
      state.character.survival.injury >= 90 ||
      state.character.survival.sickness >= 90
    ) {
      playUiSound("ui_warning");
      setPendingAction({
        type: "challenge",
        revisit,
        title: "ยืนยันการขึ้นหอคอย",
        message: "ผู้หลงทางอยู่ในภาวะอันตราย การขึ้นหอคอยตอนนี้อาจทำให้ล้มป่วย บาดเจ็บ หรือเสียชีวิต",
      });
      return;
    }
    openFloorConfirmed(revisit);
  }

  function openFloorConfirmed(revisit: boolean) {
    if (!state.character) return;
    const floorNumber = revisit ? Math.max(1, state.character.maxFloorCleared) : Math.min(MAX_TOWER_FLOOR, state.character.maxFloorCleared + 1);
    if (!revisit && floorNumber >= 11 && !state.character.classEvolutionResolved) {
      setScreen("advancedClass");
      return;
    }
    const floor = floors.find((item) => item.floor === floorNumber);
    if (!floor) return;
    playSfx("sfx_gate_open");
    setActiveFloor(floor);
    setActiveResult(null);
    setIsRevisit(revisit);
    setScreen("tower");
  }

  function resolveActiveFloor(action: DivineActionId, decision: EncounterDecisionId = "continue", midpoint?: EncounterMidpointOutcome) {
    if (!state.character || !activeFloor) return;
    playDivineActionSound(action);
    const beforeCharacter = state.character;
    const resolved = resolveFloor(
      state.character,
      activeFloor,
      action,
      isRevisit,
      state.preparationBuff,
      state.floorIntel,
      state.difficultyMode,
      state.divineStrain ?? 0,
      state.towerPressure ?? 0,
      {
        decision,
        midpointModifier: midpoint?.modifier,
        midpointTags: midpoint?.tags,
      },
      {
        npcs: state.npcs,
        lifeDebtMarks: playerProfile.lifeDebtMarks,
      },
    );
    setActiveResult(resolved.result);

    let nextState = addJournalEntry(
      {
        ...state,
        character: resolved.character,
        latestResult: resolved.result,
        preparationBuff: state.preparationBuff?.expiresAfterNextTower ? undefined : state.preparationBuff,
        floorIntel: state.floorIntel?.expiresAfterNextTower ? undefined : state.floorIntel,
        consecutiveActivity: { type: "tower", count: 1 },
        divineStrain: action === "blessing" ? 1 : 0,
      },
      {
        floor: activeFloor.floor,
        title: `${activeFloor.title}: ${resultLabels[resolved.result.level]}`,
        text: resolved.result.journalText,
      },
    );
    nextState = applyPressureForTowerResult(nextState, resolved.result.level, activeFloor.floor, isRevisit);
    if (activeFloor.floor === 20 && midpoint?.id.includes("placeKey")) {
      nextState = removeItem(nextState, "key_without_keyhole", 1);
      nextState = {
        ...nextState,
        towerPressure: Math.max(0, (nextState.towerPressure ?? 0) - 4),
      };
      nextState = addMemory(nextState, {
        title: "กุญแจที่เปิดหน้าสมุด",
        description: "กุญแจที่ไม่มีรูไม่ได้เปิดประตู แต่มันเปิดช่องว่างในบันทึกของหอคอย และทำให้ชื่อของเขาหลุดจากหมึกบางส่วน",
        type: "growth",
        intensity: 56,
        tags: ["floor20", "key", "record", "anomaly"],
        floorNumber: 20,
        dayCreated: nextState.day,
        effects: { scoreModifier: 1 },
      });
      nextState = addJournalEntry(nextState, {
        floor: 20,
        title: "กุญแจบนหน้าสมุด",
        text: "กุญแจที่ไม่มีรูถูกวางลงบนบันทึก และถ้อยคำบางส่วนของหอคอยก็เปิดออกเหมือนบานประตูที่ไม่ควรมีอยู่",
      });
    }

    if (resolved.result.memoryCreated) {
      nextState = addMemory(nextState, resolved.result.memoryCreated);
      nextState = addJournalEntry(nextState, {
        floor: activeFloor.floor,
        title: `ความทรงจำใหม่: ${resolved.result.memoryCreated.title}`,
        text: resolved.result.memoryCreated.description,
      });
    }

    if (resolved.result.traitProgressUpdates && resolved.result.traitProgressUpdates.length > 0) {
      const latestProgress = resolved.result.traitProgressUpdates[0];
      const latestHistory = latestProgress.history[0];
      nextState = addJournalEntry(nextState, {
        floor: activeFloor.floor,
        title: "Trait ที่กำลังเปลี่ยนแปลง",
        text: latestHistory ? `${latestHistory} ร่องรอยในใจของเขากำลังเปลี่ยนรูปร่างอย่างช้าๆ` : "ร่องรอยในใจของเขากำลังเปลี่ยนรูปร่างอย่างช้าๆ",
      });
    }

    if (activeFloor.floor === 7) {
      const cleared = ["greatSuccess", "success", "costlySuccess"].includes(resolved.result.level);
      if (cleared) {
        nextState = unlockNpc(nextState, "bell-child");
        if (nextState.character) {
          nextState = {
            ...nextState,
            character: {
              ...nextState.character,
              survival: {
                ...nextState.character.survival,
                hope: Math.min(100, nextState.character.survival.hope + 3),
                morale: Math.min(100, nextState.character.survival.morale + 2),
              },
            },
          };
        }
        nextState = addJournalEntry(nextState, {
          floor: activeFloor.floor,
          title: "เด็กใต้ระฆังแตกกลับมา",
          text: "เด็กคนนั้นไม่ได้หายไปพร้อมเสียงระฆัง เขากลับมาที่เมืองพักพิง และนั่งรออยู่เงียบๆ ใกล้บ่อน้ำ",
        });
      } else {
        if (nextState.character) {
          nextState = {
            ...nextState,
            character: {
              ...nextState.character,
              survival: {
                ...nextState.character.survival,
                morale: Math.max(0, nextState.character.survival.morale - 3),
              },
            },
            towerPressure: Math.min(20, (nextState.towerPressure ?? 0) + 1),
          };
        }
        nextState = addJournalEntry(nextState, {
          floor: activeFloor.floor,
          title: "เสียงระฆังที่ไม่ตามกลับมา",
          text: "เด็กใต้ระฆังแตกไม่ได้กลับมากับเขา และความเงียบนั้นนั่งอยู่ในเมืองพักพิงนานกว่าที่ใครกล้าพูดถึง",
        });
      }
    }

    if (
      resolved.result.floor === 10 &&
      ["greatSuccess", "success", "costlySuccess"].includes(resolved.result.level) &&
      playerProfile.lifeDebtMarks > 0
    ) {
      setPlayerProfile((current) => ({
        ...current,
        lifeDebtMarks: Math.max(0, current.lifeDebtMarks - 1),
      }));
      nextState = addJournalEntry(nextState, {
        title: "เสียงสะท้อนที่เบาบางลง",
        text: "เสียงสะท้อนของผู้สูญหายเบาบางลง ราวกับหอคอยยอมคืนบางสิ่งให้แก่เทพ",
      });
    }

    const consequence = applySurvivalConsequences(nextState, "tower");
    const clearedFloor10ForFirstTime =
      activeFloor.floor === 10 &&
      !isRevisit &&
      ["greatSuccess", "success", "costlySuccess"].includes(resolved.result.level) &&
      !beforeCharacter.hasClearedFloor10;

    let stateWithResult =
      consequence.state.character
        ? {
            ...consequence.state,
            lastActionResult: createTowerActionResult(
              beforeCharacter,
              consequence.state.character,
              activeFloor,
              resolved.result,
              isRevisit,
              consequence.state.day,
            ),
          }
        : consequence.state;
    if (clearedFloor10ForFirstTime && stateWithResult.character) {
      const markedCharacter = {
        ...stateWithResult.character,
        hasClearedFloor10: true,
        pendingAdvancedClassChoice: !stateWithResult.character.classEvolutionResolved,
      };
      stateWithResult = {
        ...stateWithResult,
        character: markedCharacter,
      };
      if (!markedCharacter.classEvolutionResolved) {
        setAdvancedClassOptions(getEligibleAdvancedClasses(markedCharacter));
        setNearAdvancedClassOptions(getNearAdvancedClasses(markedCharacter, 2));
        setFallbackAdvancedClass(getFallbackAdvancedClass(markedCharacter));
        setShouldOfferAdvancedClass(true);
      }
    }
    stateWithResult = withRareEncounterRoll(stateWithResult, isRevisit ? "revisitPreviousFloor" : "challengeNextFloor");
    setState(stateWithResult);
    playTowerResultSound(resolved.result.level);
    if (consequence.death) {
      handleDeath(consequence.death);
      return;
    }
    setScreen("result");
  }

  function retreatFromEncounter(action: DivineActionId, midpoint: EncounterMidpointOutcome) {
    if (!state.character || !activeFloor) return;
    const beforeCharacter = state.character;
    const nextCharacter: Character = structuredClone(state.character);
    nextCharacter.survival.fatigue = Math.min(100, nextCharacter.survival.fatigue + 8 + Math.max(0, midpoint.modifier.fatigueModifier));
    nextCharacter.survival.morale = Math.max(0, nextCharacter.survival.morale - 2 + midpoint.modifier.moraleModifier);
    const result: FloorResult = {
      level: "failure",
      score: 0,
      threshold: 0,
      floor: activeFloor.floor,
      title: activeFloor.title,
      summary: "เขาเลือกถอยกลับเมืองก่อนที่ชั้นนี้จะกลืนแรงทั้งหมดไป การถอยครั้งนี้ไม่ใช่ชัยชนะ แต่เป็นเหตุผลที่เขายังหายใจอยู่",
      journalText: "เขาเลือกถอยกลับ แม้จะรู้ว่าหอคอยจะกดดันมากขึ้น แต่นั่นอาจเป็นเหตุผลที่เขายังมีชีวิตอยู่",
      actionName: action === "whisper" ? "เสียงกระซิบ" : action === "omen" ? "ลางบอกเหตุ" : action === "blessing" ? "พรแห่งเทพ" : "ความเงียบ",
      effects: [
        "ไม่ผ่านชั้นนี้",
        `ความเหนื่อยล้าเพิ่มขึ้นเป็น ${nextCharacter.survival.fatigue}/100`,
        `ขวัญกำลังใจลดลงเป็น ${nextCharacter.survival.morale}/100`,
        "ความกดดันของหอคอยเพิ่มขึ้นเล็กน้อย",
      ],
      importantReasons: [
        midpoint.narrative,
        "การถอยลดความเสี่ยงบาดเจ็บหนัก แต่ปล่อยให้หอคอยมีเวลากดดันมากขึ้น",
      ],
    };
    let nextState = addJournalEntry(
      {
        ...state,
        character: nextCharacter,
        latestResult: result,
        towerPressure: Math.min(20, (state.towerPressure ?? 0) + 1),
        consecutiveActivity: { type: "retreat", count: 1 },
        lastActionResult: createTowerActionResult(beforeCharacter, nextCharacter, activeFloor, result, isRevisit, state.day),
      },
      {
        floor: activeFloor.floor,
        title: `${activeFloor.title}: ถอยกลับเมือง`,
        text: result.journalText,
      },
    );
    const consequence = applySurvivalConsequences(nextState, "tower");
    setActiveResult(result);
    playSfx("sfx_failure");
    setState(withRareEncounterRoll({
      ...consequence.state,
      lastActionResult: nextState.lastActionResult,
    }, isRevisit ? "revisitPreviousFloor" : "challengeNextFloor"));
    if (consequence.death) {
      handleDeath(consequence.death);
      return;
    }
    setScreen("result");
  }

  function retreatFromFloor10(action: DivineActionId, midpoint: EncounterMidpointOutcome) {
    if (!state.character || !activeFloor) return;
    const beforeCharacter = state.character;
    const nextCharacter: Character = structuredClone(state.character);
    nextCharacter.survival.fatigue = Math.min(100, nextCharacter.survival.fatigue + 10 + Math.max(0, midpoint.modifier.fatigueModifier));
    nextCharacter.survival.morale = Math.max(0, nextCharacter.survival.morale - 8 + midpoint.modifier.moraleModifier);
    const result: FloorResult = {
      level: "failure",
      score: 0,
      threshold: 0,
      floor: 10,
      title: activeFloor.title,
      summary: "เขาถอยออกจากประตูแรกก่อนที่ผู้เฝ้าประตูจะเอ่ยคำตัดสิน ไม่มีใครเรียกเขาว่าขี้ขลาด แต่หอคอยจำเสียงฝีเท้าที่ถอยกลับนั้นได้",
      journalText: "เขาเลือกถอยจากประตูแรก ความเงียบที่ตามหลังมาไม่ได้ให้อภัย แต่มันยังปล่อยให้เขามีชีวิตพอจะกลับมาอีกครั้ง",
      actionName: action === "whisper" ? "เสียงกระซิบ" : action === "omen" ? "ลางบอกเหตุ" : action === "blessing" ? "พรแห่งเทพ" : "ความเงียบ",
      effects: [
        "ยังไม่ผ่านชั้นที่ 10",
        "ความกดดันของหอคอย +3",
        `ความเหนื่อยล้าเพิ่มขึ้นเป็น ${nextCharacter.survival.fatigue}/100`,
        `ขวัญกำลังใจลดลงเป็น ${nextCharacter.survival.morale}/100`,
      ],
      importantReasons: [
        midpoint.narrative,
        "การถอยจากประตูแรกช่วยลดโอกาสบาดเจ็บหนัก แต่ทำให้หอคอยกดดันมากขึ้น",
        "ผู้เฝ้าประตูยังไม่ได้ยอมรับว่าเขาพร้อมผ่านไป",
      ],
    };
    let nextState = addJournalEntry(
      {
        ...state,
        character: nextCharacter,
        latestResult: result,
        towerPressure: Math.min(20, (state.towerPressure ?? 0) + 3),
        consecutiveActivity: { type: "floor10-retreat", count: 1 },
        lastActionResult: createTowerActionResult(beforeCharacter, nextCharacter, activeFloor, result, isRevisit, state.day),
      },
      {
        floor: 10,
        title: "ถอยจากประตูแรก",
        text: result.journalText,
      },
    );
    const consequence = applySurvivalConsequences(nextState, "tower");
    setActiveResult(result);
    playSfx("sfx_failure");
    setState(withRareEncounterRoll({
      ...consequence.state,
      lastActionResult: nextState.lastActionResult,
    }, "challengeNextFloor"));
    if (consequence.death) {
      handleDeath(consequence.death);
      return;
    }
    setScreen("result");
  }

  function returnToHub() {
    setActiveFloor(null);
    setActiveResult(null);
    if (shouldOfferAdvancedClass) {
      setShouldOfferAdvancedClass(false);
      setScreen("advancedClass");
      return;
    }
    setScreen("hub");
  }

  function setStateWithPossibleHubEvent(nextState: GameState) {
    setState(nextState);
    if (nextState.activeRareEncounter) return;
    const prompt = maybeCreateHubEvent(nextState);
    if (prompt) setPendingHubEvent(prompt);
  }

  function attachPathNotes(nextState: GameState, context: Parameters<typeof applyPathChangesFromEvent>[1]): GameState {
    const pathResult = applyPathChangesFromEvent(nextState, context);
    if (!pathResult.state.lastActionResult || pathResult.changes.length === 0) return pathResult.state;
    return {
      ...pathResult.state,
      lastActionResult: {
        ...pathResult.state.lastActionResult,
        notes: [
          ...(pathResult.state.lastActionResult.notes ?? []),
          "ร่องรอยของชะตา: " + formatPathChanges(pathResult.changes).join(", "),
        ],
      },
    };
  }

  function doTownAction(type: Exclude<ActivityType, "tower">) {
    if (!state.character) return;
    if (type === "train" && (state.character.survival.hunger >= 100 || state.character.survival.fatigue >= 100)) return;
    if (type === "train" && state.character.survival.fatigue >= 90) {
      playUiSound("ui_warning");
      setState({
        ...state,
        lastActionResult: {
          activityName: "ฝึกฝน",
          narrative: "ร่างกายของผู้หลงทางอ่อนล้าเกินกว่าจะฝึกฝนได้",
          deltas: [],
          day: state.day,
        },
      });
      return;
    }
    if (type === "train" && (state.character.survival.fatigue >= 70 || state.character.survival.injury >= 60)) {
      playUiSound("ui_warning");
      setPendingAction({
        type: "train",
        title: "ยืนยันการฝึกฝน",
        message: "สภาพร่างกายของเขาไม่พร้อมเต็มที่ การฝึกตอนนี้อาจไม่ได้ผลและอาจทำให้บาดเจ็บ",
      });
      return;
    }
    if (type === "gather" && state.character.survival.fatigue >= 80) {
      playUiSound("ui_warning");
      setPendingAction({
        type: "gather",
        title: "ยืนยันการออกหาเสบียง",
        message: "เขาอ่อนล้ามาก การออกหาเสบียงยังทำได้ แต่มีความเสี่ยงบาดเจ็บหรือป่วย",
      });
      return;
    }
    doTownActionConfirmed(type);
  }

  function doTownActionConfirmed(type: Exclude<ActivityType, "tower">) {
    if (!state.character) return;
    const beforeCharacter = state.character;
    const nextCount = state.consecutiveActivity?.type === type ? state.consecutiveActivity.count + 1 : 1;
    const activity = applyHubActivity(state.character, type, nextCount, type === "gather" ? getTowerPressureEffects(state.towerPressure ?? 0).gatherRiskBonus : 0);
    const activityNarrative = activity.journalNote ? `${activity.narrative} ${activity.journalNote}` : activity.narrative;
    const nextState = addJournalEntry(
      applyPressureForActivity(updateConsecutiveActivity({ ...state, character: activity.character }, type), type),
      {
        title: type === "train" ? "ลานฝึกฝน" : type === "rest" ? "คืนแห่งการพักผ่อน" : "เสบียงที่เก็บได้",
        text: activityNarrative,
      },
    );
    const consequence = applySurvivalConsequences(nextState, type);
    const stateWithResult =
      consequence.state.character
        ? {
            ...consequence.state,
            lastActionResult: createHubActionResult(
              activity.activityName,
              activityNarrative,
              beforeCharacter,
              consequence.state.character,
              consequence.state.day,
            ),
          }
        : consequence.state;
    const rareAction = type === "gather" ? "gatherResources" : type;
    setStateWithPossibleHubEvent(withRareEncounterRoll(attachPathNotes(stateWithResult, { type: "activity", outcome: type }), rareAction));
    if (consequence.death) handleDeath(consequence.death);
  }

  function doShopAction(actionId: ShopActionId) {
    if (!state.character) return;
    const beforeCharacter = state.character;
    const shopResult = applyShopAction(state, actionId);
    if (!shopResult.ok || !shopResult.state.character) {
      setState({
        ...state,
        lastActionResult: {
          activityName: shopResult.activityName,
          narrative: shopResult.narrative,
          deltas: [],
          day: state.day,
        },
      });
      playSfx("sfx_failure");
      return;
    }
    const npcService = getNpcServiceNarrative(state, actionId);
    let shopState = shopResult.state;
    if (npcService.npcId && npcService.relationshipChange) {
      shopState = adjustNpcRelationship(shopState, npcService.npcId, npcService.relationshipChange);
    }
    const serviceNarrative = npcService.text ? `${npcService.text} ${shopResult.narrative}` : shopResult.narrative;
    let nextState = addJournalEntry(applyPressureForActivity(shopState, actionId === "inn-rest" ? "inn-rest" : actionId === "trainer" ? "trainer" : "rest"), {
      title: shopResult.activityName,
      text: serviceNarrative,
    });
    const consequence = applySurvivalConsequences(nextState, "rest");
    const stateWithResult =
      consequence.state.character
        ? {
            ...consequence.state,
            lastActionResult: createHubActionResult(
              shopResult.activityName,
              serviceNarrative,
              beforeCharacter,
              consequence.state.character,
              consequence.state.day,
            ),
          }
        : consequence.state;
    const rareAction = actionId === "inn-rest" ? "innRest" : actionId === "trainer" ? "paidTraining" : "marketPurchase";
    playSfx("sfx_coin");
    setStateWithPossibleHubEvent(withRareEncounterRoll(attachPathNotes(stateWithResult, { type: "market", outcome: actionId }), rareAction));
    if (consequence.death) handleDeath(consequence.death);
  }

  function doInvestigate() {
    if (!state.character) return;
    let investigation = investigateNextFloor(state);
    const npcService = getNpcServiceNarrative(state, "investigate");
    if (npcService.npcId && npcService.relationshipChange) {
      investigation = {
        ...investigation,
        state: adjustNpcRelationship(investigation.state, npcService.npcId, npcService.relationshipChange),
        lastActionResult: {
          ...investigation.lastActionResult,
          narrative: npcService.text ? `${npcService.text} ${investigation.lastActionResult.narrative}` : investigation.lastActionResult.narrative,
        },
        journalText: npcService.text ? `${npcService.text} ${investigation.journalText}` : investigation.journalText,
      };
    }
    let nextState = addJournalEntry(applyPressureForActivity(investigation.state, "investigate"), {
      title: investigation.journalTitle,
      text: investigation.journalText,
    });
    nextState = {
      ...nextState,
      lastActionResult: {
        ...investigation.lastActionResult,
        day: nextState.day,
      },
    };
    const consequence = applySurvivalConsequences(nextState, "gather");
    setStateWithPossibleHubEvent(withRareEncounterRoll(attachPathNotes({
      ...consequence.state,
      floorIntel: consequence.death ? undefined : investigation.state.floorIntel,
      lastActionResult: nextState.lastActionResult,
    }, { type: "investigation", outcome: investigation.outcome }), "investigateNextFloor"));
    if (consequence.death) handleDeath(consequence.death);
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    setPendingHubEvent(null);
    if (action.type === "challenge") openFloorConfirmed(action.revisit);
    if (action.type === "train") doTownActionConfirmed("train");
    if (action.type === "gather") doTownActionConfirmed("gather");
  }

  function chooseHubEvent(choiceId: string) {
    if (!pendingHubEvent) return;
    const applied = applyHubEventChoice(state, pendingHubEvent, choiceId);
    const eventKind = pendingHubEvent.eventId === "bell-child-food" ? "npc" : pendingHubEvent.eventId === "rumor-broker-offer" ? "investigation" : "npc";
    const eventOutcome =
      pendingHubEvent.eventId === "bell-child-food"
        ? choiceId === "accept" || choiceId === "give-gold"
          ? "help"
          : "costlyHelp"
        : pendingHubEvent.eventId === "rumor-broker-offer"
          ? choiceId === "pay"
            ? "partial"
            : choiceId === "omen"
              ? "trusted"
              : "false"
          : choiceId === "refuse" || choiceId === "ignore"
            ? "abandon"
            : "help";
    const nextState = attachPathNotes(addJournalEntry(
      {
        ...applied.state,
        lastActionResult: applied.result,
      },
      {
        title: pendingHubEvent.titleTh,
        text: applied.journalText,
      },
    ), { type: eventKind, outcome: eventOutcome });
    setPendingHubEvent(null);
    setState(withRareEncounterRoll(nextState, "interactWithNpc"));
  }

  function openJournal() {
    playSfx("sfx_journal");
    if (state.character && !state.activeRareEncounter) {
      setState(withRareEncounterRoll(state, "openJournal"));
    }
    setScreen("journal");
  }

  function openNpcScreen() {
    if (state.character && !state.activeRareEncounter) {
      setState(withRareEncounterRoll(state, "interactWithNpc"));
    }
    setScreen("npc");
  }

  function openInventory() {
    setInventoryMessage(undefined);
    setScreen("inventory");
  }

  function useInventoryItem(itemId: string) {
    const result = useItem(state, itemId, { inTower: false });
    playSfx("sfx_item_use");
    setInventoryMessage(result.message);
    setState(result.state);
  }

  function equipInventoryItem(itemId: string) {
    const result = equipItem(state, itemId);
    setInventoryMessage(result.message);
    setState(result.state);
  }

  function unequipInventoryItem(itemId: string) {
    setInventoryMessage("เอาออกจากช่องพกแล้ว");
    setState(unequipItem(state, itemId));
  }

  function dropInventoryItem(itemId: string) {
    setInventoryMessage("ทิ้งไอเทมแล้ว");
    setState(removeItem(state, itemId, 1));
  }

  function handleDeath(death: DeathRecord) {
    const npcMemorialText = getNpcMemorialText(state);
    const nextProfile: PlayerProfile = {
      fallenSouls: playerProfile.fallenSouls + 1,
      lifeDebtMarks: playerProfile.lifeDebtMarks + 1,
      memorials: [{ ...death, npcMemorialText }, ...playerProfile.memorials],
    };
    setPlayerProfile(nextProfile);
    savePlayerProfile(nextProfile);
    resetSave();
    setSaveAvailable(false);
    setDeathRecord({ ...death, npcMemorialText });
    setPendingAction(null);
    setActiveFloor(null);
    setActiveResult(null);
    setScreen("death");
  }

  function chooseAdvancedClass(advancedClassId: string) {
    if (!state.character) return;
    const advancedClass = [...advancedClassOptions, ...(fallbackAdvancedClass ? [fallbackAdvancedClass] : [])].find((item) => item.id === advancedClassId);
    if (!advancedClass) return;
    const evolvedCharacter = advancedClass.id.startsWith("first-gate-")
      ? applyAdvancedClassObject(state.character, advancedClass)
      : applyAdvancedClass(state.character, advancedClassId);
    const memory: Memory = {
      id: crypto.randomUUID(),
      title: "วันที่ชะตาเปลี่ยนรูป",
      description: advancedClass.unlockNarrativeTh,
      type: "growth",
      intensity: 80,
      tags: ["advanced-class", advancedClass.id],
      floorNumber: 10,
      dayCreated: state.day,
    };
    const nextState = addMemory(
      addJournalEntry(
        {
          ...state,
          character: evolvedCharacter,
        },
        {
          floor: 10,
          title: `ชะตาใหม่: ${advancedClass.nameTh}`,
          text: advancedClass.unlockNarrativeTh,
        },
      ),
      memory,
    );
    setAdvancedClassOptions([]);
    setNearAdvancedClassOptions([]);
    setFallbackAdvancedClass(null);
    setShouldOfferAdvancedClass(false);
    setState(addAct2Intro(nextState));
    playSfx("sfx_success");
    setScreen("hub");
  }

  function skipAdvancedClassChoice() {
    if (!state.character) return;
    const nextState = addJournalEntry(
      {
        ...state,
        character: {
          ...state.character,
          advancedClassName: state.character.advancedClassName ?? "ผู้ผ่านประตูแรก",
        },
      },
      {
        floor: 10,
        title: "ผู้ผ่านประตูแรก",
        text: "ชะตายังไม่ชัดเจนพอ ผู้หลงทางจึงแบกเพียงนามชั่วคราวไว้ก่อน จนกว่าหอคอยจะหล่อหลอมเขาต่อไป",
      },
    );
    setAdvancedClassOptions([]);
    setShouldOfferAdvancedClass(false);
    setState(nextState);
    setScreen("hub");
  }

  function withPendingAction(content: ReactNode, showGameBackground = screen !== "start") {
    return (
      <>
        {showGameBackground ? <GameBackground /> : null}
        <div className={showGameBackground ? "game-content-layer" : undefined}>
          <Suspense fallback={<ScreenLoading />}>{content}</Suspense>
        </div>
        {showRareEncounterDebug && state.character && !state.activeRareEncounter ? (
          <button
            type="button"
            onClick={forceRareEncounterForDev}
            className="fixed bottom-4 right-4 z-[45] rounded-full border border-amber-300/30 bg-black/70 px-4 py-2 text-xs text-amber-100 shadow-lg shadow-black/40 transition hover:border-amber-200 hover:bg-amber-300/10"
          >
            ทดสอบเหตุการณ์ผิดปกติ
          </button>
        ) : null}
        {pendingAction ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
            <Panel className="max-w-lg border-orange-300/40 bg-ash-800 p-6">
              <h2 className="font-serif text-3xl text-stone-100">{pendingAction.title}</h2>
              <p className="mt-4 leading-8 text-stone-300">{pendingAction.message}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button variant="primary" onClick={confirmPendingAction}>ยืนยัน</Button>
                <Button onClick={() => setPendingAction(null)}>ยกเลิก</Button>
              </div>
            </Panel>
          </div>
        ) : null}
        {pendingHubEvent ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
            <Panel className="max-w-2xl border-ember-300/40 bg-ash-800 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">เหตุการณ์ในเมืองพักพิง</p>
              <h2 className="mt-2 font-serif text-3xl text-stone-100">{pendingHubEvent.titleTh}</h2>
              <p className="mt-4 leading-8 text-stone-300">{pendingHubEvent.descriptionTh}</p>
              <div className="mt-6 grid gap-3">
                {pendingHubEvent.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => chooseHubEvent(choice.id)}
                    className="border border-white/10 bg-black/25 p-4 text-left transition hover:border-ember-300/50 hover:bg-ember-300/10"
                  >
                    <p className="font-serif text-xl text-stone-100">{choice.labelTh}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-400">{choice.descriptionTh}</p>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        ) : null}
        {activeRareEncounter ? <RareEncounterPopup encounter={activeRareEncounter} onChoose={chooseRareEncounter} /> : null}
      </>
    );
  }

  if (screen === "death" && deathRecord) {
    return withPendingAction(<DeathScreen death={deathRecord} playerProfile={playerProfile} onNewRun={beginNewGame} />);
  }

  if (screen === "start") {
    return withPendingAction(<StartScreen canContinue={saveAvailable} onNewGame={beginNewGame} onContinue={continueGame} onReset={clearSave} />, false);
  }

  if (screen === "creation") {
    return withPendingAction(
      <CharacterCreationScreen
        character={draftCharacter}
        playerProfile={playerProfile}
        onReroll={() => setDraftCharacter(createRandomCharacter(playerProfile))}
        onStart={acceptCharacter}
        onBack={() => setScreen("start")}
      />,
    );
  }

  if (!state.character) {
    return withPendingAction(<StartScreen canContinue={saveAvailable} onNewGame={beginNewGame} onContinue={continueGame} onReset={clearSave} />, false);
  }

  if (screen === "character") return withPendingAction(<CharacterScreen character={state.character} onBack={() => setScreen("hub")} />);
  if (screen === "inventory") {
    return withPendingAction(
      <InventoryScreen
        character={state.character}
        message={inventoryMessage}
        onUseItem={useInventoryItem}
        onEquipItem={equipInventoryItem}
        onUnequipItem={unequipInventoryItem}
        onDropItem={dropInventoryItem}
        onBack={() => setScreen("hub")}
      />,
    );
  }
  if (screen === "journal") return withPendingAction(<JournalScreen entries={state.journal} onBack={() => setScreen("hub")} />);
  if (screen === "npc") return withPendingAction(<NpcScreen npcs={state.npcs} onBack={() => setScreen("hub")} />);
  if (screen === "settings") return withPendingAction(<SettingsScreen onBack={() => setScreen("hub")} />);
  if (screen === "advancedClass") {
    return withPendingAction(
      <AdvancedClassChoiceScreen
        character={state.character}
        options={advancedClassOptions}
        nearOptions={nearAdvancedClassOptions}
        fallbackOption={fallbackAdvancedClass ?? getFallbackAdvancedClass(state.character)}
        onChoose={chooseAdvancedClass}
        onSkip={skipAdvancedClassChoice}
      />,
    );
  }
  if (screen === "tower" && activeFloor) {
    if (activeFloor.floor === 10) {
      return withPendingAction(
        <Floor10FinaleScreen
          character={state.character}
          floor={activeFloor}
          revisit={isRevisit}
          preparationBuff={state.preparationBuff}
          floorIntel={state.floorIntel}
          difficultyMode={state.difficultyMode}
          divineStrain={state.divineStrain}
          towerPressure={state.towerPressure ?? 0}
          onResolve={resolveActiveFloor}
          onRetreat={retreatFromFloor10}
          onReturn={() => setScreen("hub")}
        />,
      );
    }
    if (activeFloor.floor === 20 && !isRevisit) {
      return withPendingAction(
        <Floor20FinaleScreen
          character={state.character}
          floor={activeFloor}
          revisit={isRevisit}
          preparationBuff={state.preparationBuff}
          floorIntel={state.floorIntel}
          difficultyMode={state.difficultyMode}
          divineStrain={state.divineStrain}
          towerPressure={state.towerPressure ?? 0}
          onResolve={resolveActiveFloor}
          onReturn={() => setScreen("hub")}
        />,
      );
    }
    return withPendingAction(
      <TowerEncounterScreen
        character={state.character}
        floor={activeFloor}
        revisit={isRevisit}
        preparationBuff={state.preparationBuff}
        floorIntel={state.floorIntel}
        difficultyMode={state.difficultyMode}
        divineStrain={state.divineStrain}
        towerPressure={state.towerPressure ?? 0}
        npcs={state.npcs}
        lifeDebtMarks={playerProfile.lifeDebtMarks}
        onResolve={resolveActiveFloor}
        onRetreat={retreatFromEncounter}
        onReturn={() => setScreen("hub")}
      />,
    );
  }
  if (screen === "result" && activeResult) {
    if (activeResult.floor === 20) {
      return withPendingAction(<Floor20ResultScreen result={activeResult} character={state.character} onReturn={returnToHub} />);
    }
    return withPendingAction(<EventResultScreen result={activeResult} onReturn={returnToHub} />);
  }

  return withPendingAction(
    <HubScreen
      character={state.character}
      playerProfile={playerProfile}
      latestEntry={latestEntry}
      journal={state.journal}
      lastActionResult={state.lastActionResult}
      npcLine={getDailyNpcLine(state)}
      npcs={state.npcs}
      preparationBuff={state.preparationBuff}
      floorIntel={state.floorIntel}
      towerPressure={state.towerPressure ?? 0}
      difficultyMode={state.difficultyMode}
      divineStrain={state.divineStrain}
      warnings={hubWarnings}
      onChallenge={() => openFloor(false)}
      onRevisit={() => openFloor(true)}
      onTrain={() => doTownAction("train")}
      onRest={() => doTownAction("rest")}
      onGather={() => doTownAction("gather")}
      onInvestigate={doInvestigate}
      onShopAction={doShopAction}
      onCharacter={() => setScreen("character")}
      onInventory={openInventory}
      onJournal={openJournal}
      onNpc={openNpcScreen}
      onSettings={() => setScreen("settings")}
      serviceCostMultipliers={{
        "inn-rest": getNpcServiceCostMultiplier(state, "innRest"),
        "buy-bandage": getNpcServiceCostMultiplier(state, "treatInjury"),
        "buy-medicine": getNpcServiceCostMultiplier(state, "treatSickness"),
        "prepare-gear": getNpcServiceCostMultiplier(state, "prepareEquipment"),
      }}
    />,
  );
}

function getHubWarnings(character: Character): string[] {
  const warnings: string[] = [];
  if (character.survival.hunger >= 70) warnings.push("ผู้หลงทางกำลังหิวมาก ควรหาอาหารหรือพักก่อนขึ้นหอคอย");
  if (character.survival.fatigue >= 70) warnings.push("ร่างกายของเขาอ่อนล้าเกินไป การฝืนท้าทายชั้นถัดไปอาจทำให้บาดเจ็บหนัก");
  if (character.survival.injury >= 70) warnings.push("บาดแผลของเขาน่ากังวล หากฝืนต่ออาจกลายเป็นอันตรายถึงชีวิต");
  if (character.survival.sickness >= 70) warnings.push("เขากำลังป่วย หากปล่อยไว้อาจถึงตาย");
  if (character.survival.injury >= 90) warnings.push("บาดแผลของเขาอยู่ในระดับวิกฤต การฝืนขึ้นหอคอยอาจทำให้เสียชีวิต");
  if (character.survival.sickness >= 90) warnings.push("อาการป่วยของเขาเข้าสู่ระดับวิกฤต ควรซื้อยาหรือพักฟื้นทันที");
  return warnings;
}

function playTowerResultSound(level: FloorResult["level"]) {
  if (level === "greatSuccess" || level === "success") playSfx("sfx_success");
  else if (level === "costlySuccess" || level === "failure") playSfx("sfx_failure");
  else playSfx("sfx_critical");
}
