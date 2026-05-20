import { useMemo, useState } from "react";
import { ArrowLeft, EyeOff, Hand, MessageCircle, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "../components/Button";
import { DivineActionCard } from "../components/DivineActionCard";
import { Panel } from "../components/Panel";
import { divineActions } from "../game/divineActions";
import { estimateTowerAttempt } from "../game/eventResolver";
import { challengeLabels, statLabels } from "../game/labels";
import { getFloorMemoryTags } from "../game/memorySystem";
import { createEncounterState, describeDecision, getCharacterIntent, getDecisionChoices, getFloorMidpoint } from "../game/towerEncounter";
import { getClassActionModifier, getClassIdentity } from "../game/classIdentity";
import { getUsableItemsForContext } from "../game/inventorySystem";
import { getAct2SpecialHooks, type Act2SpecialOption } from "../game/act2Hooks";
import type {
  Character,
  DifficultyMode,
  DivineActionId,
  EncounterDecisionId,
  EncounterMidpointOutcome,
  FloorDefinition,
  FloorIntel,
  NPC,
  PreparationBuff,
} from "../types/game";

interface Props {
  character: Character;
  floor: FloorDefinition;
  revisit: boolean;
  preparationBuff?: PreparationBuff;
  floorIntel?: FloorIntel;
  difficultyMode: DifficultyMode;
  divineStrain?: number;
  towerPressure: number;
  npcs?: NPC[];
  lifeDebtMarks?: number;
  onResolve: (action: DivineActionId, decision: EncounterDecisionId, midpoint: EncounterMidpointOutcome) => void;
  onRetreat: (action: DivineActionId, midpoint: EncounterMidpointOutcome) => void;
  onReturn: () => void;
}

const icons = {
  whisper: MessageCircle,
  omen: TriangleAlert,
  blessing: Sparkles,
  silence: EyeOff,
};

export function TowerEncounterScreen({
  character,
  floor,
  revisit,
  preparationBuff,
  floorIntel,
  difficultyMode,
  divineStrain = 0,
  towerPressure,
  npcs = [],
  lifeDebtMarks = 0,
  onResolve,
  onRetreat,
  onReturn,
}: Props) {
  const [phase, setPhase] = useState<"entrance" | "intent" | "divine" | "midpoint" | "decision">("entrance");
  const [selected, setSelected] = useState<DivineActionId>("whisper");
  const [midpoint, setMidpoint] = useState<EncounterMidpointOutcome | null>(null);
  const floorTags = getFloorMemoryTags(floor);
  const estimate = estimateTowerAttempt(character, floor, selected, revisit, preparationBuff, floorIntel, difficultyMode, divineStrain, towerPressure);
  const encounterState = useMemo(() => createEncounterState(floor, estimate.riskLabel), [floor, estimate.riskLabel]);
  const intent = useMemo(() => getCharacterIntent(character, floor), [character, floor]);
  const usableTowerItems = getUsableItemsForContext({ character, journal: [], npcs: [], hubEventsSeen: [], day: 0, difficultyMode, towerPressure, rareEncounterCooldown: 0, rareEncountersSeen: [], totalActionsTaken: 0 }, floorTags, true);
  const choices = getDecisionChoices(character, Boolean(floorIntel?.floorNumber === floor.floor), Boolean(preparationBuff), usableTowerItems.length > 0);
  const classIdentity = getClassIdentity(character.classId);
  const classActionModifier = getClassActionModifier(character, floor);
  const specialHooks = getAct2SpecialHooks({ character, floor, npcs, lifeDebtMarks, towerPressure });
  const availableSpecialOptions = specialHooks.specialOptions.filter((option) => option.available);

  function advanceFromDivine() {
    const outcome = getFloorMidpoint(floor, character, selected, towerPressure);
    setMidpoint(outcome);
    setPhase("midpoint");
  }

  function chooseDecision(decision: EncounterDecisionId) {
    const currentMidpoint = midpoint ?? getFloorMidpoint(floor, character, selected, towerPressure);
    const finalMidpoint =
      decision === "classAction"
        ? {
            ...currentMidpoint,
            modifier: {
              successBonus: currentMidpoint.modifier.successBonus + classActionModifier.successBonus,
              injuryRiskModifier: currentMidpoint.modifier.injuryRiskModifier + classActionModifier.injuryRiskModifier,
              moraleModifier: currentMidpoint.modifier.moraleModifier + (classActionModifier.moraleModifier ?? 0),
              fatigueModifier: currentMidpoint.modifier.fatigueModifier + (classActionModifier.fatigueModifier ?? 0),
            },
          }
        : currentMidpoint;
    if (decision === "retreat") {
      onRetreat(selected, finalMidpoint);
      return;
    }
    onResolve(selected, decision, finalMidpoint);
  }

  function chooseSpecialOption(option: Act2SpecialOption) {
    const currentMidpoint = midpoint ?? getFloorMidpoint(floor, character, selected, towerPressure);
    const finalMidpoint: EncounterMidpointOutcome = {
      ...currentMidpoint,
      id: `${currentMidpoint.id}-${option.id}`,
      narrative: `${currentMidpoint.narrative}\n\n${option.descriptionTh}`,
      modifier: {
        successBonus: currentMidpoint.modifier.successBonus + option.modifier.successBonus,
        injuryRiskModifier: currentMidpoint.modifier.injuryRiskModifier + option.modifier.injuryRiskModifier,
        moraleModifier: currentMidpoint.modifier.moraleModifier + option.modifier.moraleModifier,
        fatigueModifier: currentMidpoint.modifier.fatigueModifier + option.modifier.fatigueModifier,
      },
      tags: [...currentMidpoint.tags, `reason:${option.resultExplanationLineTh}`],
    };
    if (option.resolveKey === "retreat") {
      onRetreat(selected, finalMidpoint);
      return;
    }
    onResolve(selected, option.resolveKey, finalMidpoint);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">
            {revisit ? "กลับไปยัง" : "ท้าทาย"} ชั้นที่ {floor.floor}
          </p>
          <h1 className="font-serif text-4xl leading-tight text-stone-100">{floor.title}</h1>
        </div>
        <Button variant="ghost" onClick={onReturn}>
          <ArrowLeft size={16} /> กลับเมืองพักพิง
        </Button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-5">
        {[
          ["entrance", "ทางเข้า"],
          ["intent", "ความตั้งใจ"],
          ["divine", "การแทรกแซง"],
          ["midpoint", "จุดเปลี่ยน"],
          ["decision", "ตัดสินใจ"],
        ].map(([id, label]) => (
          <div
            key={id}
            className={`border px-3 py-2 text-center text-xs font-medium ${
              phase === id ? "border-ember-300/60 bg-ember-300/15 text-ember-100" : "border-white/10 bg-black/20 text-stone-500"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {phase === "entrance" ? (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel className="p-6">
            <p className="text-sm font-medium tracking-wide text-ember-300">ทางเข้าของชั้น</p>
            <p className="mt-3 text-lg leading-8 text-stone-200">{floor.description}</p>
            <p className="mt-5 border-l-2 border-ember-300/70 pl-4 font-serif text-2xl leading-9 text-stone-100">{floor.emotionalReaction}</p>
            {towerPressure >= 8 ? (
              <p className="mt-5 rounded border border-orange-400/30 bg-orange-950/20 p-4 text-sm leading-7 text-orange-100">
                หอคอยเงียบเกินไป ราวกับมันไม่ได้รอให้เขาขึ้นไป แต่รอให้เขาพลาด
              </p>
            ) : null}
          </Panel>
          <EncounterRiskPanel floor={floor} estimate={estimate} encounterState={encounterState} />
          <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("intent")}>
            ก้าวเข้าสู่ชั้นนี้
          </Button>
        </div>
      ) : null}

      {phase === "intent" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <Panel className="p-6">
            <p className="text-sm font-medium tracking-wide text-ember-300">ความตั้งใจของผู้หลงทาง</p>
            <p className="mt-4 font-serif text-2xl leading-9 text-stone-100">{intent}</p>
            <p className="mt-5 text-sm leading-7 text-stone-400">นี่ไม่ใช่คำสั่งจากเทพ แต่คือสิ่งที่เขาเลือกจะทำจากนิสัย ชั้นเรียน ความทรงจำ และสภาพร่างกายในตอนนี้</p>
            <div className="mt-5 border border-ember-300/25 bg-black/20 p-4">
              <p className="text-sm font-medium tracking-wide text-ember-300">แนวทางของ{classIdentity.nameTh}</p>
              <p className="mt-2 text-sm leading-7 text-stone-300">{classIdentity.preferredApproachTh}</p>
            </div>
          </Panel>
          <Panel className="p-6">
            <h2 className="font-serif text-2xl text-stone-100">สิ่งที่ชั้นนี้ทดสอบ</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-stone-300">
              <span className="border border-white/10 bg-black/20 px-3 py-2">{challengeLabels[floor.challengeType]}</span>
              {(floor.primaryStats ?? floor.checks.map((check) => check.stat)).map((stat) => (
                <span key={stat} className="border border-white/10 bg-black/20 px-3 py-2">
                  {statLabels[stat]}
                </span>
              ))}
            </div>
          </Panel>
          <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("divine")}>
            เฝ้ามองต่อ
          </Button>
        </div>
      ) : null}

      {phase === "divine" ? (
        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <Panel className="p-6">
            <h2 className="font-serif text-2xl text-stone-100">เทพจะตอบรับอย่างไร</h2>
            <p className="mt-3 text-sm leading-7 text-stone-400">
              การเลือกครั้งนี้จะส่งผลต่อจุดเปลี่ยนกลางชั้น และยังมีผลต่อศรัทธา การพึ่งพาเทพ หรือการยืนหยัดของเขา
            </p>
            <div className="mt-5 rounded border border-white/10 bg-black/20 p-4 text-sm leading-7 text-stone-300">
              โอกาสโดยประมาณตอนนี้: <span className="font-semibold text-ember-200">{estimate.chance}%</span> — {estimate.riskLabel}
            </div>
          </Panel>
          <Panel className="p-6">
            <div className="grid gap-3">
              {divineActions.map((action) => {
                const Icon = icons[action.id];
                return (
                  <DivineActionCard
                    key={action.id}
                    action={action}
                    icon={Icon}
                    selected={selected === action.id}
                    floorHint={getActionFloorHint(action.id, floor.challengeType, floorTags)}
                    onSelect={() => setSelected(action.id)}
                  />
                );
              })}
            </div>
            <Button variant="primary" className="mt-5 w-full" onClick={advanceFromDivine}>
              <Hand size={16} /> ส่งผลต่อเหตุการณ์
            </Button>
          </Panel>
        </div>
      ) : null}

      {phase === "midpoint" && midpoint ? (
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel className="p-6">
            <p className="text-sm font-medium tracking-wide text-ember-300">จุดเปลี่ยนกลางชั้น</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-100">{midpoint.title}</h2>
            <p className="mt-4 text-lg leading-8 text-stone-300">{midpoint.narrative}</p>
          </Panel>
          <Panel className="p-6">
            <h2 className="font-serif text-2xl text-stone-100">แรงส่งชั่วคราว</h2>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-300">
              <li className="border border-white/10 bg-black/20 px-3 py-2">โอกาสผ่านช่วงสุดท้าย {formatSigned(midpoint.modifier.successBonus)}%</li>
              <li className="border border-white/10 bg-black/20 px-3 py-2">ความเสี่ยงบาดเจ็บ {formatSigned(midpoint.modifier.injuryRiskModifier)}%</li>
              {midpoint.modifier.moraleModifier !== 0 ? <li className="border border-white/10 bg-black/20 px-3 py-2">ขวัญกำลังใจ {formatSigned(midpoint.modifier.moraleModifier)}</li> : null}
              {midpoint.modifier.fatigueModifier !== 0 ? <li className="border border-white/10 bg-black/20 px-3 py-2">ความเหนื่อยล้า {formatSigned(midpoint.modifier.fatigueModifier)}</li> : null}
            </ul>
          </Panel>
          <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("decision")}>
            ตัดสินใจช่วงสุดท้าย
          </Button>
        </div>
      ) : null}

      {phase === "decision" && midpoint ? (
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel className="p-6">
            <p className="text-sm font-medium tracking-wide text-ember-300">ทางเลือกหลังจุดเปลี่ยน</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-100">จะผลักเขาไปต่อ หรือปล่อยให้ถอยกลับ?</h2>
            <p className="mt-4 text-sm leading-7 text-stone-400">
              การถอยไม่ใช่ความตาย ส่วนการฝืนไม่ใช่ความกล้าหาญเสมอไป หอคอยชอบบิดความหมายของสองสิ่งนี้เข้าหากัน
            </p>
          </Panel>
          <div className="grid gap-3">
            {availableSpecialOptions.length > 0 ? (
              <div className="rounded-2xl border border-ember-300/25 bg-ember-300/10 p-4">
                <p className="text-sm font-semibold text-ember-100">ทางเลือกพิเศษ</p>
                <div className="mt-3 grid gap-3">
                  {availableSpecialOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => chooseSpecialOption(option)}
                      className="rounded-xl border border-ember-300/25 bg-black/30 p-4 text-left transition hover:border-ember-200/70 hover:bg-ember-300/15"
                    >
                      <h3 className="font-serif text-2xl text-stone-100">{option.labelTh}</h3>
                      <p className="mt-1 text-sm leading-7 text-stone-300">{option.descriptionTh}</p>
                      <p className="mt-2 text-xs leading-6 text-ember-200/80">{option.effectPreviewTh}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {choices
              .filter((choice) => choice.enabled)
              .map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => chooseDecision(choice.id)}
                  className="border border-white/10 bg-black/25 p-4 text-left transition hover:border-ember-300/50 hover:bg-ember-300/10"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-1 shrink-0 text-ember-300" size={18} />
                    <div>
                      <h3 className="font-serif text-2xl text-stone-100">{choice.label}</h3>
                      <p className="mt-1 text-sm leading-7 text-stone-300">{choice.description}</p>
                      <p className="mt-2 text-xs leading-6 text-stone-500">{choice.detail}</p>
                      {choice.id === "resource" && usableTowerItems.length > 0 ? (
                        <p className="mt-2 text-xs leading-6 text-emerald-200">
                          ใช้ได้ตอนนี้: {usableTowerItems.map((item) => item.nameTh).join(", ")}
                        </p>
                      ) : null}
                      <p className="mt-3 text-xs leading-6 text-ember-200/80">{describeDecision(choice.id)}</p>
                    </div>
                  </div>
                </button>
              ))}
            <button
              type="button"
              onClick={() => chooseDecision("classAction")}
              className="border border-ember-300/35 bg-ember-300/10 p-4 text-left transition hover:border-ember-200/70 hover:bg-ember-300/15"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-1 shrink-0 text-ember-200" size={18} />
                <div>
                  <h3 className="font-serif text-2xl text-stone-100">{classIdentity.classAction.nameTh}</h3>
                  <p className="mt-1 text-sm leading-7 text-stone-300">{classIdentity.classAction.descriptionTh}</p>
                  <p className="mt-2 text-xs leading-6 text-stone-500">
                    โอกาสผ่าน {formatSigned(classActionModifier.successBonus)}% / ความเสี่ยงบาดเจ็บ {formatSigned(classActionModifier.injuryRiskModifier)}%
                    {classActionModifier.fatigueModifier ? ` / ความเหนื่อยล้า ${formatSigned(classActionModifier.fatigueModifier)}` : ""}
                    {classActionModifier.moraleModifier ? ` / ขวัญกำลังใจ ${formatSigned(classActionModifier.moraleModifier)}` : ""}
                  </p>
                  {classIdentity.classAction.costTh ? <p className="mt-2 text-xs leading-6 text-ember-200/80">{classIdentity.classAction.costTh}</p> : null}
                </div>
              </div>
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function EncounterRiskPanel({
  floor,
  estimate,
  encounterState,
}: {
  floor: FloorDefinition;
  estimate: ReturnType<typeof estimateTowerAttempt>;
  encounterState: ReturnType<typeof createEncounterState>;
}) {
  return (
    <Panel className="p-6">
      <p className="text-sm font-medium tracking-wide text-ember-300">ความเสี่ยงที่ประเมินได้</p>
      <h2 className="mt-2 font-serif text-4xl text-stone-100">{estimate.chance}%</h2>
      <p className="mt-1 text-stone-300">{encounterState.riskLevel}</p>
      <p className="mt-4 text-sm leading-7 text-stone-400">{estimate.advice}</p>
      <div className="mt-5 border border-white/10 bg-black/20 p-4 text-sm leading-7 text-stone-300">
        <p className="font-semibold text-stone-100">ลักษณะชั้น</p>
        <p className="mt-1">{floor.uniqueMechanicTh ?? floor.recommendedPreparationTh ?? "ชั้นนี้ยังมีสิ่งที่มองไม่เห็นรออยู่"}</p>
      </div>
    </Panel>
  );
}

function getActionFloorHint(actionId: DivineActionId, challengeType: FloorDefinition["challengeType"], tags: string[]) {
  if (actionId === "omen" && (tags.includes("darkness") || tags.includes("fear") || challengeType === "trap" || challengeType === "survival")) {
    return "ลางบอกเหตุช่วยเตือนอันตรายที่ซ่อนอยู่ในชั้นนี้ได้ดี";
  }
  if (actionId === "blessing" && (challengeType === "combat" || challengeType === "boss" || challengeType === "survival")) {
    return "พรแห่งเทพให้แรงผลักสูงเมื่อร่างกายกำลังถูกกดดันโดยตรง";
  }
  if (actionId === "silence" && (challengeType === "moral" || tags.includes("choice") || tags.includes("fear"))) {
    return "ความเงียบอาจช่วยให้เขาเติบโตจากการตัดสินใจเอง";
  }
  if (actionId === "whisper" && (challengeType === "puzzle" || challengeType === "npc" || challengeType === "moral")) {
    return "เสียงกระซิบช่วยจัดระเบียบความคิดในสถานการณ์ที่ต้องเลือกให้ดี";
  }
  return undefined;
}

function formatSigned(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}
