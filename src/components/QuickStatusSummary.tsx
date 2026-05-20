import { getDeltaForKey } from "../game/activityEffects";
import { survivalLabels } from "../game/labels";
import type { Character, LastActionResult, SurvivalKey } from "../types/game";

interface QuickStatusSummaryProps {
  character: Character;
  lastActionResult?: LastActionResult;
}

const quickItems: Array<{ key: SurvivalKey; kind: "bad" | "good" }> = [
  { key: "hunger", kind: "bad" },
  { key: "fatigue", kind: "bad" },
  { key: "injury", kind: "bad" },
  { key: "sickness", kind: "bad" },
  { key: "morale", kind: "good" },
  { key: "hope", kind: "good" },
];

export function QuickStatusSummary({ character, lastActionResult }: QuickStatusSummaryProps) {
  return (
    <section className="border border-white/10 bg-black/20 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-stone-100">สถานะด่วน</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-400">
            <span>ภาวะเสี่ยง: ค่ายิ่งสูงยิ่งอันตราย</span>
            <span>พลังใจ: ค่ายิ่งสูงยิ่งดี</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {quickItems.map((item) => {
          const value = character.survival[item.key];
          const delta = getDeltaForKey(lastActionResult, item.key);
          return (
            <div key={item.key} className="border border-white/10 bg-ash-900/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-medium text-stone-200">{survivalLabels[item.key]}</span>
                <span className={item.kind === "bad" ? "text-yellow-100" : "text-sky-100"}>
                  {value}/100 — {getStatusText(item.key, value)}
                </span>
              </div>
              <div className="mt-2 h-1.5 border border-white/10 bg-black/50">
                <div
                  className={`h-full ${item.kind === "bad" ? getBadBarColor(value) : getGoodBarColor(value)}`}
                  style={{ width: `${value}%` }}
                />
              </div>
              {delta ? (
                <p className={`mt-2 text-xs ${getDeltaClass(delta.delta, item.kind)}`}>
                  {formatDelta(delta.delta)} ล่าสุด
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getStatusText(key: SurvivalKey, value: number): string {
  if (key === "hunger") {
    if (value >= 90) return "อดอยากขั้นวิกฤต";
    if (value >= 70) return "หิวรุนแรง";
    if (value >= 40) return "เริ่มหิว";
    return "อิ่มพอไหว";
  }
  if (key === "fatigue") {
    if (value >= 90) return "หมดแรง";
    if (value >= 70) return "อ่อนล้าหนัก";
    if (value >= 40) return "เหนื่อยล้า";
    return "ยังไหว";
  }
  if (key === "injury") {
    if (value >= 90) return "บาดแผลวิกฤต";
    if (value >= 70) return "บาดเจ็บหนัก";
    if (value >= 40) return "เริ่มเจ็บตัว";
    return "แผลยังควบคุมได้";
  }
  if (key === "sickness") {
    if (value >= 90) return "ไข้รุนแรง";
    if (value >= 70) return "ป่วยหนัก";
    if (value >= 40) return "เริ่มป่วย";
    return "ยังไม่ป่วย";
  }
  if (key === "morale") {
    if (value >= 80) return "เข้มแข็ง";
    if (value >= 50) return "มั่นคง";
    if (value >= 30) return "สั่นคลอน";
    return "ใกล้แตกสลาย";
  }
  if (value >= 80) return "ยังสว่าง";
  if (value >= 50) return "ยังมีหวัง";
  if (value >= 30) return "ริบหรี่";
  return "แทบดับลง";
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

function getDeltaClass(delta: number, kind: "bad" | "good") {
  const isHelpful = kind === "bad" ? delta < 0 : delta > 0;
  return isHelpful ? "text-emerald-300" : "text-orange-300";
}

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : `${delta}`;
}
