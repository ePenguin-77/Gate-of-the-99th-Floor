import { useMemo, useState } from "react";
import { ArrowLeft, EyeOff, MessageCircle, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "../components/Button";
import { DivineActionCard } from "../components/DivineActionCard";
import { Panel } from "../components/Panel";
import { divineActions } from "../game/divineActions";
import { estimateTowerAttempt } from "../game/eventResolver";
import { getClassActionModifier, getClassIdentity } from "../game/classIdentity";
import {
  createFloor10FinalMidpoint,
  getFloor10ConditionWarnings,
  getFloor10DecisionText,
  getFloor10DivineComment,
  getFloor10DominantIdentity,
  getFloor10FinalDecisionOptions,
  getFloor10ResultPrelude,
  getFloor10Trial,
  mapFloor10Action,
  mapFloor10Decision,
  type Floor10FinalDecision,
  type Floor10Phase,
} from "../game/floor10Finale";
import { getFloorMemoryTags } from "../game/memorySystem";
import type { Character, DifficultyMode, DivineActionId, EncounterMidpointOutcome, FloorDefinition, FloorIntel, PreparationBuff } from "../types/game";

interface Props {
  character: Character;
  floor: FloorDefinition;
  revisit: boolean;
  preparationBuff?: PreparationBuff;
  floorIntel?: FloorIntel;
  difficultyMode: DifficultyMode;
  divineStrain?: number;
  towerPressure: number;
  onResolve: (action: DivineActionId, decision: ReturnType<typeof mapFloor10Decision>, midpoint: EncounterMidpointOutcome) => void;
  onRetreat: (action: DivineActionId, midpoint: EncounterMidpointOutcome) => void;
  onReturn: () => void;
}

const icons = {
  whisper: MessageCircle,
  omen: TriangleAlert,
  blessing: Sparkles,
  silence: EyeOff,
};

export function Floor10FinaleScreen({
  character,
  floor,
  revisit,
  preparationBuff,
  floorIntel,
  difficultyMode,
  divineStrain = 0,
  towerPressure,
  onResolve,
  onRetreat,
  onReturn,
}: Props) {
  const [phase, setPhase] = useState<Floor10Phase>("approach");
  const [selectedAction, setSelectedAction] = useState<DivineActionId>("omen");
  const warnings = getFloor10ConditionWarnings(character);
  const identity = useMemo(() => getFloor10DominantIdentity(character), [character]);
  const trial = useMemo(() => getFloor10Trial(character), [character]);
  const classIdentity = getClassIdentity(character.classId);
  const classActionModifier = getClassActionModifier(character, floor);
  const estimate = estimateTowerAttempt(character, floor, selectedAction, revisit, preparationBuff, floorIntel, difficultyMode, divineStrain, towerPressure);
  const floorTags = getFloorMemoryTags(floor);
  const decisionOptions = getFloor10FinalDecisionOptions(character, preparationBuff, floorIntel);

  function chooseFinalDecision(decision: Floor10FinalDecision) {
    const action = mapFloor10Action(decision, selectedAction);
    const midpoint = createFloor10FinalMidpoint(trial, decision, action, character, preparationBuff, floorIntel);
    const finalMidpoint =
      decision === "classAction"
        ? {
            ...midpoint,
            modifier: {
              successBonus: midpoint.modifier.successBonus + classActionModifier.successBonus,
              injuryRiskModifier: midpoint.modifier.injuryRiskModifier + classActionModifier.injuryRiskModifier,
              moraleModifier: midpoint.modifier.moraleModifier + (classActionModifier.moraleModifier ?? 0),
              fatigueModifier: midpoint.modifier.fatigueModifier + (classActionModifier.fatigueModifier ?? 0),
            },
          }
        : midpoint;
    if (decision === "retreat") {
      onRetreat(action, finalMidpoint);
      return;
    }
    onResolve(action, mapFloor10Decision(decision), finalMidpoint);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_10%,rgba(245,158,11,0.18),transparent_30%),linear-gradient(180deg,#050505,#14100b_46%,#050505)] px-5 py-8 text-stone-100">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-wide text-ember-300">บททดสอบแรกของหอคอย</p>
            <h1 className="font-serif text-5xl leading-tight text-stone-100">{floor.title}</h1>
          </div>
          <Button variant="ghost" onClick={onReturn}>
            <ArrowLeft size={16} /> กลับเมืองพักพิง
          </Button>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-5">
          {[
            ["approach", "หน้าประตูแรก"],
            ["identity", "คำถามของผู้เฝ้าประตู"],
            ["divine", "การแทรกแซง"],
            ["trial", "บททดสอบ"],
            ["final", "การตัดสินใจสุดท้าย"],
          ].map(([id, label]) => (
            <div
              key={id}
              className={`border px-3 py-2 text-center text-xs font-medium ${
                phase === id ? "border-ember-300/70 bg-ember-300/15 text-ember-100" : "border-white/10 bg-black/25 text-stone-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {phase === "approach" ? (
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <Panel className="border-ember-300/25 bg-black/45 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">หน้าประตูแรก</p>
              <p className="mt-4 font-serif text-3xl leading-10 text-stone-100">
                ประตูแรกตั้งอยู่กลางความเงียบ ไม่มีเสียงมอนสเตอร์ ไม่มีเสียงลม มีเพียงหัวใจของผู้หลงทางที่ดังเกินกว่าจะซ่อนได้
              </p>
              <p className="mt-5 leading-8 text-stone-300">
                หอคอยไม่ได้ทดสอบว่าเขาแข็งแรงพอหรือไม่ แต่มันทดสอบว่า ตลอดทางที่ผ่านมา เขากลายเป็นคนแบบไหน
              </p>
              {warnings.length > 0 ? (
                <div className="mt-5 grid gap-2">
                  {warnings.map((warning) => (
                    <p key={warning} className="border border-red-300/20 bg-red-950/20 p-3 text-sm leading-7 text-red-100">
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </Panel>
            <FinaleRiskPanel chance={estimate.chance} riskLabel={estimate.riskLabel} towerPressure={towerPressure} />
            <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("identity")}>
              เข้าใกล้ผู้เฝ้าประตู
            </Button>
          </div>
        ) : null}

        {phase === "identity" ? (
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel className="border-ember-300/25 bg-black/45 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">คำถามของผู้เฝ้าประตู</p>
              <h2 className="mt-3 font-serif text-4xl text-stone-100">เจ้าผ่านมาถึงที่นี่ด้วยสิ่งใด?</h2>
              <div className="mt-5 grid gap-3">
                {identity.lines.map((line) => (
                  <p key={line} className="border-l-2 border-ember-300/60 bg-black/20 px-4 py-3 font-serif text-2xl leading-9 text-stone-100">
                    {line}
                  </p>
                ))}
              </div>
            </Panel>
            <Panel className="p-6">
              <h2 className="font-serif text-2xl text-stone-100">ชะตาที่ดังที่สุดหน้าประตู</h2>
              <div className="mt-4 grid gap-3">
                {identity.paths.length > 0 ? identity.paths.map((path) => (
                  <div key={path.pathId} className="border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-serif text-2xl text-stone-100">{path.label}</p>
                      <span className="text-ember-300">{path.value}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-stone-400">{path.description}</p>
                  </div>
                )) : <p className="text-stone-400">ชะตายังไม่ชัดเจน แต่ประตูแรกก็ยังต้องการคำตอบ</p>}
              </div>
            </Panel>
            <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("divine")}>
              ให้เทพตอบสนอง
            </Button>
          </div>
        ) : null}

        {phase === "divine" ? (
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel className="p-6">
              <h2 className="font-serif text-3xl text-stone-100">การแทรกแซงหน้าประตู</h2>
              <p className="mt-3 text-sm leading-7 text-stone-400">
                ชั้นนี้ฟังเสียงของเทพด้วย ทุกการช่วยเหลือจึงไม่ได้เป็นเพียงโบนัส แต่มันกลายเป็นคำตอบต่อคำถามว่าผู้หลงทางยืนอยู่ด้วยสิ่งใด
              </p>
              <p className="mt-5 border border-ember-300/25 bg-black/25 p-4 text-sm leading-7 text-ember-100">{getFloor10DivineComment(selectedAction, character)}</p>
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
                      selected={selectedAction === action.id}
                      floorHint={getFinaleActionHint(action.id, floorTags)}
                      onSelect={() => setSelectedAction(action.id)}
                    />
                  );
                })}
              </div>
            </Panel>
            <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("trial")}>
              เริ่มบททดสอบของผู้เฝ้าประตู
            </Button>
          </div>
        ) : null}

        {phase === "trial" ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel className="border-ember-300/25 bg-black/45 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">บททดสอบ</p>
              <h2 className="mt-2 font-serif text-4xl text-stone-100">{trial.title}</h2>
              <p className="mt-5 text-lg leading-9 text-stone-300">{trial.narrative}</p>
            </Panel>
            <Panel className="p-6">
              <h2 className="font-serif text-2xl text-stone-100">แรงกดจากบททดสอบ</h2>
              <div className="mt-4 grid gap-2 text-sm leading-7 text-stone-300">
                <p className="border border-white/10 bg-black/20 px-3 py-2">โอกาสผ่าน {formatSigned(trial.modifier.successBonus)}%</p>
                <p className="border border-white/10 bg-black/20 px-3 py-2">ความเสี่ยงบาดเจ็บ {formatSigned(trial.modifier.injuryRiskModifier)}%</p>
                {trial.modifier.moraleModifier !== 0 ? <p className="border border-white/10 bg-black/20 px-3 py-2">ขวัญกำลังใจ {formatSigned(trial.modifier.moraleModifier)}</p> : null}
                {trial.modifier.fatigueModifier !== 0 ? <p className="border border-white/10 bg-black/20 px-3 py-2">ความเหนื่อยล้า {formatSigned(trial.modifier.fatigueModifier)}</p> : null}
              </div>
            </Panel>
            <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("final")}>
              ไปสู่การตัดสินใจสุดท้าย
            </Button>
          </div>
        ) : null}

        {phase === "final" ? (
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel className="border-ember-300/25 bg-black/45 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">การตัดสินใจสุดท้าย</p>
              <h2 className="mt-2 font-serif text-4xl text-stone-100">ประตูรอคำตอบสุดท้าย</h2>
              <p className="mt-5 leading-8 text-stone-300">{getFloor10ResultPrelude()}</p>
              <p className="mt-5 text-sm leading-7 text-stone-400">โอกาสโดยประมาณหลังบททดสอบ: {estimate.chance}% — {estimate.riskLabel}</p>
            </Panel>
            <div className="grid gap-3">
              {decisionOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.enabled}
                  onClick={() => chooseFinalDecision(option.id)}
                  className={`border p-4 text-left transition ${
                    option.enabled ? "border-white/10 bg-black/30 hover:border-ember-300/60 hover:bg-ember-300/10" : "cursor-not-allowed border-white/5 bg-black/10 opacity-45"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-1 shrink-0 text-ember-300" size={18} />
                    <div>
                      <h3 className="font-serif text-2xl text-stone-100">{option.label}</h3>
                      <p className="mt-1 text-sm leading-7 text-stone-300">{option.description}</p>
                      {option.id === "classAction" ? (
                        <p className="mt-2 text-xs leading-6 text-stone-400">
                          {classIdentity.classAction.nameTh}: {classIdentity.classAction.descriptionTh}
                        </p>
                      ) : null}
                      {option.enabled ? <p className="mt-2 text-xs leading-6 text-ember-200/80">{getFloor10DecisionText(option.id)}</p> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function FinaleRiskPanel({ chance, riskLabel, towerPressure }: { chance: number; riskLabel: string; towerPressure: number }) {
  return (
    <Panel className="p-6">
      <p className="text-sm font-medium tracking-wide text-ember-300">การประเมินหน้าประตู</p>
      <h2 className="mt-2 font-serif text-5xl text-stone-100">{chance}%</h2>
      <p className="mt-1 text-stone-300">{riskLabel}</p>
      <div className="mt-5 border border-white/10 bg-black/20 p-4 text-sm leading-7 text-stone-300">
        <p>ความกดดันของหอคอย: {towerPressure}/20</p>
        <p className="mt-2">นี่ไม่ใช่การประเมินที่สมบูรณ์ บททดสอบจะขุดเอาตัวตน ความทรงจำ และทางเลือกที่ผ่านมาออกมาด้วย</p>
      </div>
    </Panel>
  );
}

function getFinaleActionHint(actionId: DivineActionId, tags: string[]) {
  if (actionId === "omen") return "ลางบอกเหตุช่วยอ่านภาพลวงและทางปลอมของผู้เฝ้าประตู";
  if (actionId === "blessing") return "พรให้แรงผลักสูง แต่ผู้เฝ้าประตูจะจับตามองการพึ่งพาเทพ";
  if (actionId === "silence") return "ความเงียบเสี่ยงมาก แต่มีน้ำหนักต่อการยืนหยัดและ Class 2";
  if (tags.includes("boss")) return "เสียงกระซิบช่วยเรียงความคิด แต่หากพึ่งพาสูงเกินไป เขาอาจลังเล";
  return undefined;
}

function formatSigned(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}
