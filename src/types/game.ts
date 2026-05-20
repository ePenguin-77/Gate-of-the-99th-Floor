export type StatKey = "strength" | "agility" | "endurance" | "focus" | "willpower" | "instinct";
export type SurvivalKey = "hunger" | "fatigue" | "morale" | "hope" | "injury" | "sickness";
export type DivineRelationshipKey = "faith" | "independence" | "dependency";
export type TraitKind = "positive" | "negative" | "double-edged";
export type ChallengeType = "combat" | "survival" | "puzzle" | "moral" | "npc" | "boss" | "darkness" | "trap" | "preparation";
export type DifficultyMode = "story" | "survival" | "merciless";
export type DivineActionId = "whisper" | "omen" | "blessing" | "silence";
export type ScreenId = "start" | "creation" | "hub" | "tower" | "result" | "character" | "inventory" | "journal" | "npc" | "settings" | "advancedClass" | "death";
export type ItemRarity = "common" | "uncommon" | "rare" | "anomaly";
export type ItemType = "consumable" | "tool" | "charm" | "material" | "quest" | "anomaly";
export type EncounterPhase = "entrance" | "intent" | "divine" | "midpoint" | "decision" | "result";
export type EncounterDecisionId = "continue" | "retreat" | "push" | "resource" | "self" | "classAction";
export type PathId = "protector" | "survivor" | "seeker" | "faithbound" | "independent" | "shadow" | "broken" | "merciful";
export type RareEncounterRarity = "rare" | "veryRare" | "mythic";

export type Stats = Record<StatKey, number>;
export type SurvivalValues = Record<SurvivalKey, number>;
export type DivineRelationship = Record<DivineRelationshipKey, number>;
export type PathAffinity = Record<PathId, number>;

export interface CharacterClass {
  id: string;
  name: string;
  description: string;
  statModifiers: Partial<Stats>;
  preferredPlaystyle: string;
  passiveEffect: string;
}

export interface Trait {
  id: string;
  name: string;
  kind: TraitKind;
  description: string;
  statModifiers?: Partial<Stats>;
  survivalModifiers?: Partial<SurvivalValues>;
  tags: string[];
}

export interface MemoryEffect {
  stats?: Partial<Stats>;
  survival?: Partial<SurvivalValues>;
  divine?: Partial<DivineRelationship>;
  scoreModifier?: number;
}

export interface Memory {
  id: string;
  title: string;
  description: string;
  type: "trauma" | "growth" | "bond" | "survival" | "faith" | "guilt" | "hope";
  intensity: number;
  tags: string[];
  floorNumber?: number;
  dayCreated: number;
  effects?: MemoryEffect;
}

export interface TraitProgress {
  traitId: string;
  currentPath?: string;
  progress: number;
  possibleEvolutions: string[];
  history: string[];
}

export interface TraitEvolution {
  id: string;
  baseTraitId: string;
  nameTh: string;
  descriptionTh: string;
  path: "positive" | "negative" | "doubleEdged";
  requirements: string[];
  effects: MemoryEffect;
}

export interface Character {
  name: string;
  classId: string;
  className: string;
  traits: Trait[];
  stats: Stats;
  survival: SurvivalValues;
  divine: DivineRelationship;
  gold: number;
  food: number;
  currentFloor: number;
  maxFloorCleared: number;
  personalitySummary: string;
  memories: Memory[];
  traitProgress: TraitProgress[];
  evolvedTraits: string[];
  skills: string[];
  pathAffinity: PathAffinity;
  hasClearedFloor10: boolean;
  classEvolutionResolved: boolean;
  pendingAdvancedClassChoice?: boolean;
  advancedClassId?: string;
  advancedClassName?: string;
  inventory: InventoryItem[];
  inventoryLimit: number;
  equippedItems: string[];
}

export interface ItemEffect {
  type: string;
  value: number;
  contextTags?: string[];
}

export interface Item {
  id: string;
  nameTh: string;
  descriptionTh: string;
  type: ItemType;
  rarity: ItemRarity;
  maxStack: number;
  tags: string[];
  usableInHub?: boolean;
  usableInTower?: boolean;
  consumable?: boolean;
  effects?: ItemEffect[];
  drawbackTh?: string;
  flavorTh?: string;
}

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface PathAffinityChange {
  pathId: PathId;
  label: string;
  amount: number;
}

export interface ClassAction {
  id: string;
  nameTh: string;
  descriptionTh: string;
  successBonus: number;
  injuryRiskModifier: number;
  moraleModifier?: number;
  fatigueModifier?: number;
  costTh?: string;
  preferredContexts: string[];
}

export interface ClassIdentity {
  id: string;
  nameTh: string;
  identityTh: string;
  preferredApproachTh: string;
  classPassiveTh: string;
  encounterIntentTemplates: string[];
  classAction: ClassAction;
}

export interface ClassSkill {
  id: string;
  classId: string;
  nameTh: string;
  descriptionTh: string;
  unlockFloor: 3 | 6 | 10;
}

export interface AdvancedClass {
  id: string;
  baseClassId: string;
  nameTh: string;
  titleTh: string;
  descriptionTh: string;
  requiredPaths: { pathId: PathId; minimum: number }[];
  preferredTraits?: string[];
  forbiddenTraits?: string[];
  passiveTh: string;
  drawbackTh?: string;
  effects: {
    successBonus?: number;
    blessingBonus?: number;
    silenceBonus?: number;
    investigationBonus?: number;
    gatherRiskModifier?: number;
    hungerPenaltyReduction?: number;
    combatInjuryBonusThreshold?: number;
    combatBonus?: number;
    survivalBonus?: number;
    trapBonus?: number;
    darknessBonus?: number;
    puzzleBonus?: number;
    npcBonus?: number;
    pressureBonus?: number;
    rewardModifier?: number;
    falseIntelProtection?: number;
    criticalFailureProtection?: number;
  };
  classActionTh: string;
  unlockNarrativeTh: string;
}

export interface FloorCheck {
  stat: StatKey;
  difficulty: number;
  weight: number;
}

export interface FloorOutcomeText {
  success: string;
  mixed: string;
  failure: string;
}

export interface FloorDefinition {
  floor: number;
  title: string;
  description: string;
  challengeType: ChallengeType;
  tags?: string[];
  difficulty?: number;
  primaryStats?: StatKey[];
  failureConsequences?: {
    fatigue: number;
    hunger: number;
    injury: number;
    morale: number;
    sicknessChance?: number;
  };
  recommendedPreparationTh?: string;
  uniqueMechanicTh?: string;
  failureThemeTh?: string;
  pressureFlavorTh?: string;
  emotionalReaction: string;
  checks: FloorCheck[];
  rewards: {
    gold: number;
    food: number;
    statBoost?: Partial<Stats>;
  };
  outcomes: FloorOutcomeText;
  journal: FloorOutcomeText;
}

export interface JournalEntry {
  id: string;
  day: number;
  floor?: number;
  title: string;
  text: string;
}

export interface GameState {
  character: Character | null;
  journal: JournalEntry[];
  npcs: NPC[];
  hubEventsSeen: string[];
  day: number;
  difficultyMode: DifficultyMode;
  towerPressure: number;
  rareEncounterCooldown: number;
  activeRareEncounter?: ActiveRareEncounter;
  rareEncountersSeen: string[];
  totalActionsTaken: number;
  latestResult?: FloorResult;
  lastActionResult?: LastActionResult;
  preparationBuff?: PreparationBuff;
  floorIntel?: FloorIntel;
  consecutiveActivity?: ConsecutiveActivity;
  divineStrain?: number;
  encounter?: EncounterState;
  ended?: boolean;
}

export interface RareEncounterChoice {
  id: string;
  labelTh: string;
  descriptionTh: string;
  riskTh?: string;
  outcomeType: "safe" | "reward" | "risk" | "mixed" | "dangerous";
  resolveKey: string;
}

export interface RareEncounter {
  id: string;
  titleTh: string;
  subtitleTh?: string;
  descriptionTh: string;
  rarity: RareEncounterRarity;
  triggerActions: string[];
  minFloor?: number;
  maxFloor?: number;
  minTowerPressure?: number;
  requiresLifeDebt?: boolean;
  requiresNpc?: string;
  choices: RareEncounterChoice[];
  tags: string[];
}

export interface ActiveRareEncounter {
  encounterId: string;
  triggeredByAction: string;
  day: number;
}

export interface NPC {
  id: string;
  nameTh: string;
  roleTh: string;
  descriptionTh: string;
  relationship: number;
  status: "available" | "missing" | "dead" | "locked";
  tags: string[];
  services?: string[];
  memoryFlags?: string[];
}

export interface HubEventChoice {
  id: string;
  labelTh: string;
  descriptionTh: string;
}

export interface HubEventDefinition {
  id: string;
  titleTh: string;
  descriptionTh: string;
  trigger: "always" | "wounded" | "childUnlocked" | "floorFive" | "pressureHigh";
  npcId?: string;
  choices: HubEventChoice[];
}

export interface HubEventPrompt {
  eventId: string;
  titleTh: string;
  descriptionTh: string;
  npcId?: string;
  choices: HubEventChoice[];
}

export interface EncounterState {
  floorNumber: number;
  phase: EncounterPhase;
  selectedDivineAction?: DivineActionId;
  midpointOutcome?: EncounterMidpointOutcome;
  riskLevel: string;
  temporaryModifiers: EncounterTemporaryModifiers;
  narrativeFlags: string[];
  usedResource?: boolean;
  usedClassAction?: boolean;
  canRetreat: boolean;
  canPushRisk: boolean;
}

export interface EncounterTemporaryModifiers {
  successBonus: number;
  injuryRiskModifier: number;
  moraleModifier: number;
  fatigueModifier: number;
}

export interface EncounterMidpointOutcome {
  id: string;
  title: string;
  narrative: string;
  modifier: EncounterTemporaryModifiers;
  tags: string[];
}

export interface EncounterResolutionOptions {
  decision: EncounterDecisionId;
  midpointModifier?: EncounterTemporaryModifiers;
  midpointTags?: string[];
}

export interface FloorIntel {
  id: string;
  floorNumber: number;
  titleTh: string;
  descriptionTh: string;
  reliability: "trusted" | "partial" | "rumor" | "false" | "dangerous";
  successBonus: number;
  injuryRiskReduction: number;
  revealedTags: string[];
  isFalse: boolean;
  expiresAfterNextTower: boolean;
}

export interface PreparationBuff {
  successBonus: number;
  injuryRiskReduction: number;
  expiresAfterNextTower: boolean;
}

export interface ConsecutiveActivity {
  type: string;
  count: number;
}

export interface ActionDelta {
  key: string;
  label: string;
  before: number;
  after: number;
  delta: number;
  valueType: "good" | "bad" | "resource" | "stat";
}

export interface LastActionResult {
  activityName: string;
  narrative: string;
  deltas: ActionDelta[];
  notes?: string[];
  importantReasons?: string[];
  day?: number;
}

export interface DivineAction {
  id: DivineActionId;
  name: string;
  nameTh: string;
  description: string;
  descriptionTh: string;
  chancePreviewTh: string;
  benefitPreviewTh: string;
  riskPreviewTh: string;
  possibleChangesTh: string[];
  successChanceModifier: number;
  preferredContexts: string[];
  scoreModifier: number;
  relationshipChanges: Partial<DivineRelationship>;
  survivalChanges: Partial<SurvivalValues>;
}

export type FloorResultLevel = "greatSuccess" | "success" | "costlySuccess" | "failure" | "criticalFailure";

export interface FloorResult {
  level: FloorResultLevel;
  score: number;
  threshold: number;
  floor: number;
  title: string;
  summary: string;
  journalText: string;
  actionName: string;
  effects: string[];
  importantReasons?: string[];
  pathChanges?: PathAffinityChange[];
  memoryCreated?: Memory;
  traitProgressUpdates?: TraitProgress[];
}

export type ActivityType = "tower" | "rest" | "gather" | "train";

export type ShopActionId =
  | "buy-food"
  | "buy-bandage"
  | "buy-medicine"
  | "inn-rest"
  | "trainer"
  | "prepare-gear"
  | "buy-dry-bread"
  | "buy-rough-bandage"
  | "buy-bitter-medicine"
  | "buy-old-rope"
  | "buy-cracked-lantern";

export interface ShopItem {
  id: ShopActionId;
  label: string;
  description: string;
  cost: number;
}

export type DeathCause = "starvation" | "exhaustion" | "sickness" | "injury" | "despair";

export interface DeathRecord {
  id: string;
  name: string;
  className: string;
  floorReached: number;
  day: number;
  cause: DeathCause;
  causeText: string;
  message: string;
  npcMemorialText?: string;
}

export interface PlayerProfile {
  fallenSouls: number;
  lifeDebtMarks: number;
  memorials: DeathRecord[];
}
