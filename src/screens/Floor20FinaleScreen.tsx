import { useMemo, useState } from "react";
import { ArrowLeft, EyeOff, MessageCircle, ScrollText, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "../components/Button";
import { DivineActionCard } from "../components/DivineActionCard";
import { Panel } from "../components/Panel";
import { getAdvancedClassProfile } from "../data/advancedClassProfiles";
import { divineActions } from "../game/divineActions";
import { estimateTowerAttempt } from "../game/eventResolver";
import {
  createFloor20Midpoint,
  getFloor20ConditionLines,
  getFloor20DecisionOptions,
  getFloor20DecisionText,
  getFloor20NameVerification,
  getFloor20Trial,
  mapFloor20Action,
  mapFloor20Decision,
  type Floor20Decision,
  type Floor20Phase,
} from "../game/floor20Finale";
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
  onResolve: (action: DivineActionId, decision: ReturnType<typeof mapFloor20Decision>, midpoint: EncounterMidpointOutcome) => void;
  onReturn: () => void;
}

const icons = {
  whisper: MessageCircle,
  omen: TriangleAlert,
  blessing: Sparkles,
  silence: EyeOff,
};

export function Floor20FinaleScreen({
  character,
  floor,
  revisit,
  preparationBuff,
  floorIntel,
  difficultyMode,
  divineStrain = 0,
  towerPressure,
  onResolve,
  onReturn,
}: Props) {
  const [phase, setPhase] = useState<Floor20Phase>("registry");
  const [selectedAction, setSelectedAction] = useState<DivineActionId>("omen");
  const conditionLines = getFloor20ConditionLines(character);
  const verification = useMemo(() => getFloor20NameVerification(character), [character]);
  const trial = useMemo(() => getFloor20Trial(character), [character]);
  const profile = useMemo(() => getAdvancedClassProfile(character.advancedClassId), [character.advancedClassId]);
  const decisionOptions = getFloor20DecisionOptions(character, preparationBuff, floorIntel);
  const estimate = estimateTowerAttempt(character, floor, selectedAction, revisit, preparationBuff, floorIntel, difficultyMode, divineStrain, towerPressure);
  const activePhaseMarker = phase === "divine" ? "trial" : phase;

  function chooseDecision(decision: Floor20Decision) {
    const action = mapFloor20Action(decision, selectedAction);
    const midpoint = createFloor20Midpoint(trial, decision, action, character, preparationBuff, floorIntel);
    onResolve(action, mapFloor20Decision(decision), midpoint);
  }

  return (
    <main className="floor20-finale min-h-screen px-5 py-8 text-stone-100">
      <div className="floor20-ambient" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-wide text-ember-300">บทสรุปเมืองร้างเหนือประตูแรก</p>
            <h1 className="font-serif text-5xl leading-tight text-stone-100">{floor.title}</h1>
          </div>
          <Button variant="ghost" onClick={onReturn}>
            <ArrowLeft size={16} /> กลับเมืองพักพิง
          </Button>
        </div>

        <div className="floor20-phase-track mb-5 grid gap-3 sm:grid-cols-5">
          {[
            ["registry", "อาคารทะเบียน"],
            ["name", "ยืนยันชื่อ"],
            ["trial", "บททดสอบ"],
            ["decision", "การบันทึก"],
            ["result", "ผลลัพธ์"],
          ].map(([id, label]) => (
            <div
              key={id}
              className={`border px-3 py-2 text-center text-xs font-medium ${
                activePhaseMarker === id ? "border-ember-300/70 bg-ember-300/15 text-ember-100" : "border-white/10 bg-black/25 text-stone-500"
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {phase === "registry" ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel className="floor20-ledger-card border-ember-300/25 bg-black/45 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">โถงทะเบียน</p>
              <p className="mt-4 font-serif text-3xl leading-10 text-stone-100">
                อาคารทะเบียนตั้งอยู่กลางเมืองร้าง ไม่มีเจ้าหน้าที่ ไม่มีเสียงปากกา แต่สมุดเล่มหนึ่งเปิดรออยู่บนโต๊ะไม้เก่า
              </p>
              <p className="mt-5 leading-8 text-stone-300">
                บนหน้ากระดาษมีชื่อของผู้หลงทางเขียนไว้แล้ว เพียงแต่มันยังเว้นช่องหนึ่งไว้
                <span className="block pt-3 font-serif text-2xl text-ember-200">“สิ่งที่เขากลายเป็น”</span>
              </p>
              {conditionLines.length > 0 ? (
                <div className="mt-5 grid gap-2">
                  {conditionLines.map((line) => (
                    <p key={line} className="border border-red-300/20 bg-red-950/20 p-3 text-sm leading-7 text-red-100">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
            </Panel>
            <RegistryRiskPanel chance={estimate.chance} riskLabel={estimate.riskLabel} towerPressure={towerPressure} />
            <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("name")}>
              อ่านชื่อบนสมุด
            </Button>
          </div>
        ) : null}

        {phase === "name" ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Panel className="floor20-ledger-card border-ember-300/25 bg-black/45 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">คำถามของสมุดทะเบียน</p>
              <h2 className="mt-3 font-serif text-4xl text-stone-100">{verification.title}</h2>
              <p className="mt-5 text-lg leading-9 text-stone-300">
                ชื่อของเขาไม่ได้เป็นเพียงคำเรียกอีกต่อไป มันกลายเป็นหลักฐานว่าชั้น 1 ถึง 19 เขียนอะไรลงบนตัวเขาไว้บ้าง
              </p>
            </Panel>
            <Panel className="p-6">
              <h2 className="font-serif text-2xl text-stone-100">สิ่งที่ชื่อสะท้อนกลับมา</h2>
              <div className="mt-4 grid gap-3">
                {verification.lines.map((line) => (
                  <p key={line} className="border-l-2 border-ember-300/60 bg-black/20 px-4 py-3 font-serif text-2xl leading-9 text-stone-100">
                    {line}
                  </p>
                ))}
              </div>
            </Panel>
            <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("divine")}>
              เลือกเสียงของเทพ
            </Button>
          </div>
        ) : null}

        {phase === "divine" ? (
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel className="floor20-ledger-card p-6">
              <h2 className="font-serif text-3xl text-stone-100">เทพจะยุ่งกับบันทึกนี้อย่างไร</h2>
              <p className="mt-3 text-sm leading-7 text-stone-400">
                นายทะเบียนไม่ได้ห้ามเทพ แต่ทุกคำสั่ง ทุกคำเตือน และทุกความเงียบจะถูกบันทึกเป็นส่วนหนึ่งของชื่อเขาด้วย
              </p>
              <p className="mt-5 border border-ember-300/25 bg-black/25 p-4 text-sm leading-7 text-ember-100">
                โอกาสโดยประมาณตอนนี้: {estimate.chance}% — {estimate.riskLabel}
              </p>
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
                      floorHint={getFloor20ActionHint(action.id)}
                      onSelect={() => setSelectedAction(action.id)}
                    />
                  );
                })}
              </div>
            </Panel>
            <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("trial")}>
              ให้สมุดทดสอบคลาสขั้นสอง
            </Button>
          </div>
        ) : null}

        {phase === "trial" ? (
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Panel className="floor20-ledger-card border-ember-300/25 bg-black/45 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">บททดสอบคลาสขั้นสอง</p>
              <h2 className="mt-2 font-serif text-4xl text-stone-100">{trial.title}</h2>
              <p className="mt-5 text-lg leading-9 text-stone-300">{trial.narrative}</p>
              {profile ? (
                <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-7 text-amber-100">
                  <p className="font-semibold text-stone-100">คำเตือนจากข้อเสียของคลาสขั้นสอง</p>
                  <p className="mt-1">{profile.drawbackWarningTh}</p>
                </div>
              ) : null}
            </Panel>
            <Panel className="p-6">
              <h2 className="font-serif text-2xl text-stone-100">แรงกดจากบันทึก</h2>
              <div className="mt-4 grid gap-2 text-sm leading-7 text-stone-300">
                <p className="border border-white/10 bg-black/20 px-3 py-2">โอกาสผ่าน {formatSigned(trial.modifier.successBonus)}%</p>
                <p className="border border-white/10 bg-black/20 px-3 py-2">ความเสี่ยงบาดเจ็บ {formatSigned(trial.modifier.injuryRiskModifier)}%</p>
                {trial.modifier.moraleModifier !== 0 ? <p className="border border-white/10 bg-black/20 px-3 py-2">ขวัญกำลังใจ {formatSigned(trial.modifier.moraleModifier)}</p> : null}
                {trial.modifier.fatigueModifier !== 0 ? <p className="border border-white/10 bg-black/20 px-3 py-2">ความเหนื่อยล้า {formatSigned(trial.modifier.fatigueModifier)}</p> : null}
              </div>
            </Panel>
            <Button variant="primary" className="lg:col-span-2" onClick={() => setPhase("decision")}>
              เลือกว่าจะให้ชื่อถูกบันทึกอย่างไร
            </Button>
          </div>
        ) : null}

        {phase === "decision" ? (
          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <Panel className="floor20-ledger-card border-ember-300/25 bg-black/45 p-6">
              <p className="text-sm font-medium tracking-wide text-ember-300">บันทึกสุดท้ายของ Act 2</p>
              <h2 className="mt-2 font-serif text-4xl text-stone-100">สมุดรอหมึกหยดสุดท้าย</h2>
              <p className="mt-5 leading-8 text-stone-300">
                นายทะเบียนไม่ได้ถามว่าเขาชนะมากี่ครั้ง แต่มันถามว่าหลังจากชั้นทั้งหมดนี้ เขายังยอมให้ใครเป็นผู้เขียนชื่อของตนเอง
              </p>
            </Panel>
            <div className="grid gap-3">
              {decisionOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  disabled={!option.enabled}
                  onClick={() => chooseDecision(option.id)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    option.enabled ? "border-white/10 bg-black/35 shadow-[0_18px_60px_rgba(0,0,0,0.28)] hover:border-ember-300/60 hover:bg-ember-300/10" : "cursor-not-allowed border-white/5 bg-black/10 opacity-45"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ScrollText className="mt-1 shrink-0 text-ember-300" size={18} />
                    <div>
                      <h3 className="font-serif text-2xl text-stone-100">{option.label}</h3>
                      <p className="mt-1 text-sm leading-7 text-stone-300">{option.description}</p>
                      {option.enabled ? <p className="mt-2 text-xs leading-6 text-ember-200/80">{getFloor20DecisionText(option.id)}</p> : null}
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

function RegistryRiskPanel({ chance, riskLabel, towerPressure }: { chance: number; riskLabel: string; towerPressure: number }) {
  return (
    <Panel className="p-6">
      <p className="text-sm font-medium tracking-wide text-ember-300">การประเมินหน้าสมุด</p>
      <h2 className="mt-2 font-serif text-5xl text-stone-100">{chance}%</h2>
      <p className="mt-1 text-stone-300">{riskLabel}</p>
      <div className="mt-5 border border-white/10 bg-black/20 p-4 text-sm leading-7 text-stone-300">
        <p>ความกดดันของหอคอย: {towerPressure}/20</p>
        <p className="mt-2">นี่คือกำแพงใหม่หลังประตูแรก คลาสขั้นสอง ของที่พกมา และคนที่ยังรอเขาอยู่ ล้วนถูกนับรวมในบันทึกนี้</p>
      </div>
    </Panel>
  );
}

function getFloor20ActionHint(actionId: DivineActionId) {
  if (actionId === "omen") return "ลางบอกเหตุช่วยจับบรรทัดปลอมและช่องว่างที่หอคอยซ่อนไว้";
  if (actionId === "blessing") return "พรช่วยผลักชื่อให้ผ่าน แต่จะทำให้ร่องรอยการพึ่งพาเทพชัดขึ้น";
  if (actionId === "silence") return "ความเงียบเสี่ยงกว่า แต่เข้ากับการเขียนชื่อด้วยมือตนเอง";
  return "เสียงกระซิบช่วยเรียบเรียงความคิด แต่สมุดจะจดจำว่าเสียงนั้นมาจากเทพ";
}

function formatSigned(value: number) {
  if (value > 0) return `+${value}`;
  return `${value}`;
}
