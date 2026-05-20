import type { DivineRelationshipKey, SurvivalKey } from "../types/game";

type StatusKind = "bad" | "good";
type StatusKey = SurvivalKey | DivineRelationshipKey;

interface StatusBarProps {
  label: string;
  value: number;
  kind: StatusKind;
  statusKey?: StatusKey;
}

export function StatusBar({ label, value, kind, statusKey }: StatusBarProps) {
  const safeValue = Math.max(0, Math.min(100, value));
  const tone = kind === "bad" ? getBadTone(safeValue) : getGoodTone(safeValue);
  const condition = kind === "bad" ? getBadCondition(statusKey, safeValue) : getGoodCondition(statusKey, safeValue);

  return (
    <div className={`border bg-black/20 p-3 ${tone.border}`}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-stone-200">{label}</span>
        <span className={`text-sm font-semibold ${tone.text}`}>
          {safeValue}/100 — {condition}
        </span>
      </div>
      <div className="h-2.5 border border-white/10 bg-black/50">
        <div className={`h-full ${tone.bar}`} style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function getBadTone(value: number) {
  if (value >= 90) return { border: "border-red-400/60", bar: "bg-red-500", text: "text-red-200" };
  if (value >= 70) return { border: "border-orange-400/50", bar: "bg-orange-400", text: "text-orange-200" };
  if (value >= 40) return { border: "border-amber-300/40", bar: "bg-amber-300", text: "text-amber-100" };
  return { border: "border-emerald-400/30", bar: "bg-emerald-400", text: "text-emerald-200" };
}

function getGoodTone(value: number) {
  if (value >= 80) return { border: "border-emerald-300/45", bar: "bg-emerald-300", text: "text-emerald-200" };
  if (value >= 50) return { border: "border-sky-300/35", bar: "bg-sky-300", text: "text-sky-100" };
  if (value >= 30) return { border: "border-amber-300/40", bar: "bg-amber-300", text: "text-amber-100" };
  return { border: "border-red-400/55", bar: "bg-red-500", text: "text-red-200" };
}

function getBadCondition(statusKey: StatusKey | undefined, value: number) {
  if (statusKey === "hunger") {
    if (value >= 90) return "อดอยากขั้นวิกฤต";
    if (value >= 70) return "หิวรุนแรง";
    if (value >= 40) return "หิวจนเริ่มเสียสมาธิ";
    return "อิ่มพอไหว";
  }
  if (statusKey === "fatigue") {
    if (value >= 90) return "หมดแรงจนแทบยืนไม่ไหว";
    if (value >= 70) return "อ่อนล้าหนัก";
    if (value >= 40) return "เหนื่อยล้า";
    return "ยังไหว";
  }
  if (statusKey === "injury") {
    if (value >= 90) return "บาดเจ็บขั้นวิกฤต";
    if (value >= 70) return "บาดเจ็บหนัก";
    if (value >= 40) return "มีบาดแผลน่าห่วง";
    return "แผลยังควบคุมได้";
  }
  if (statusKey === "sickness") {
    if (value >= 90) return "ป่วยขั้นวิกฤต";
    if (value >= 70) return "ป่วยหนัก";
    if (value >= 40) return "เริ่มมีอาการ";
    return "ยังไม่ป่วย";
  }
  if (value >= 90) return "วิกฤต";
  if (value >= 70) return "อันตราย";
  if (value >= 40) return "ระวัง";
  return "ปลอดภัย";
}

function getGoodCondition(statusKey: StatusKey | undefined, value: number) {
  if (statusKey === "dependency") {
    if (value >= 80) return "ผูกติดกับเทพมาก";
    if (value >= 50) return "พึ่งพาเทพชัดเจน";
    if (value >= 30) return "เริ่มเอนเข้าหาเทพ";
    return "ยังพึ่งพาไม่มาก";
  }
  if (value >= 80) return "เข้มแข็ง";
  if (value >= 50) return "มั่นคง";
  if (value >= 30) return "อ่อนแรง";
  return "ต่ำขั้นวิกฤต";
}
