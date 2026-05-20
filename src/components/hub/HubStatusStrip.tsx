import { Button } from "../Button";
import { getDominantPaths } from "../../game/pathAffinity";
import { survivalLabels } from "../../game/labels";
import type { ReactNode } from "react";
import type { Character, PlayerProfile, SurvivalKey } from "../../types/game";

interface HubStatusStripProps {
  character: Character;
  playerProfile: PlayerProfile;
  riskAdvice: string;
  onCharacter: () => void;
}

export function HubStatusStrip({ character, playerProfile, riskAdvice, onCharacter }: HubStatusStripProps) {
  const dominantPath = getDominantPaths(character, 1)[0];
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatusCard title="ผู้หลงทาง">
        <h2 className="font-serif text-2xl leading-tight text-stone-50">{character.name}</h2>
        <p className="mt-1 text-sm text-stone-400">
          {character.className}
          {character.advancedClassName ? ` / ${character.advancedClassName}` : ""}
        </p>
        <p className="mt-3 text-xs leading-5 text-stone-500">เส้นทางเด่น: {dominantPath && dominantPath.value > 0 ? dominantPath.label : "ยังไม่ชัดเจน"}</p>
        <Button onClick={onCharacter} className="mt-4 min-h-9 rounded-xl px-3 py-1.5 text-xs">
          ดูรายละเอียดทั้งหมด
        </Button>
      </StatusCard>

      <StatusCard title="สถานะด่วน">
        <div className="grid gap-2">
          <MiniValue character={character} statusKey="hunger" kind="bad" />
          <MiniValue character={character} statusKey="fatigue" kind="bad" />
          <MiniValue character={character} statusKey="injury" kind="bad" />
          <MiniValue character={character} statusKey="sickness" kind="bad" />
          <MiniValue character={character} statusKey="morale" kind="good" />
          <MiniValue character={character} statusKey="hope" kind="good" />
        </div>
      </StatusCard>

      <StatusCard title="ทรัพยากร">
        <div className="grid grid-cols-2 gap-2">
          <ResourceChip label="ทอง" value={character.gold} />
          <ResourceChip label="อาหาร" value={character.food} />
          <ResourceChip label="วิญญาณที่สูญหาย" value={playerProfile.fallenSouls} />
          <ResourceChip label="ตราหนี้ชีวิต" value={playerProfile.lifeDebtMarks} />
        </div>
      </StatusCard>

      <StatusCard title="คำแนะนำตอนนี้">
        <p className="text-sm leading-7 text-stone-300">{riskAdvice}</p>
        <p className="mt-3 text-xs leading-5 text-stone-500">การเตรียมตัวช่วยได้ แต่เวลาที่ผ่านไปจะเพิ่มความกดดันของหอคอย</p>
      </StatusCard>
    </section>
  );
}

function StatusCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 shadow-xl shadow-black/20">
      <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-ember-300">{title}</p>
      {children}
    </div>
  );
}

function MiniValue({ character, statusKey, kind }: { character: Character; statusKey: SurvivalKey; kind: "bad" | "good" }) {
  const value = character.survival[statusKey];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="text-stone-400">{survivalLabels[statusKey]}</span>
        <span className="text-stone-300">{value}/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${kind === "bad" ? getBadBarColor(value) : getGoodBarColor(value)}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function ResourceChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="text-[0.7rem] leading-4 text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-xl text-ember-200">{value}</p>
    </div>
  );
}

function getBadBarColor(value: number) {
  if (value >= 90) return "bg-red-400";
  if (value >= 70) return "bg-orange-400";
  if (value >= 40) return "bg-yellow-300";
  return "bg-emerald-300";
}

function getGoodBarColor(value: number) {
  if (value >= 80) return "bg-sky-300";
  if (value >= 50) return "bg-cyan-300";
  if (value >= 30) return "bg-yellow-300";
  return "bg-red-400";
}
