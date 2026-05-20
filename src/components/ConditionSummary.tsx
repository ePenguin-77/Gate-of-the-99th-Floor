import type { Character } from "../types/game";

interface ConditionSummaryProps {
  character: Character;
}

type ConditionLevel = "normal" | "warning" | "danger" | "critical";

const levelStyles: Record<ConditionLevel, string> = {
  normal: "border-emerald-300/30 bg-emerald-950/10 text-emerald-100",
  warning: "border-yellow-300/35 bg-yellow-950/15 text-yellow-100",
  danger: "border-orange-300/40 bg-orange-950/20 text-orange-100",
  critical: "border-red-300/45 bg-red-950/25 text-red-100",
};

const chipStyles: Record<ConditionLevel, string> = {
  normal: "border-emerald-300/35 text-emerald-100",
  warning: "border-yellow-300/40 text-yellow-100",
  danger: "border-orange-300/45 text-orange-100",
  critical: "border-red-300/50 text-red-100",
};

export function ConditionSummary({ character }: ConditionSummaryProps) {
  const values = [
    character.survival.hunger,
    character.survival.fatigue,
    character.survival.injury,
    character.survival.sickness,
  ];
  const highest = Math.max(...values);
  const level: ConditionLevel =
    highest >= 90 ? "critical" : highest >= 70 ? "danger" : highest >= 40 ? "warning" : "normal";

  const copy = {
    normal: {
      title: "ยังไหว",
      sentence: "ผู้หลงทางยังพอมีแรงสำหรับการเดินทางต่อ",
      action: "สามารถท้าทายชั้นถัดไปได้",
      chip: "ปกติ",
    },
    warning: {
      title: "เริ่มน่าเป็นห่วง",
      sentence: "ความหิวและความเหนื่อยล้าเริ่มส่งผลต่อการตัดสินใจ",
      action: "ควรพักผ่อนหรือหาเสบียงก่อนขึ้นหอคอย",
      chip: "ระวัง",
    },
    danger: {
      title: "อันตราย",
      sentence: "ร่างกายของผู้หลงทางกำลังส่งสัญญาณเตือนชัดเจน",
      action: "ควรลดภาวะเสี่ยงก่อนฝืนเดินหน้าต่อ",
      chip: "อันตราย",
    },
    critical: {
      title: "วิกฤต",
      sentence: "ร่างกายของผู้หลงทางใกล้ถึงขีดจำกัด การฝืนขึ้นหอคอยอาจทำให้ล้มป่วยหรือเสียชีวิต",
      action: "ควรพักผ่อนทันที",
      chip: "วิกฤต",
    },
  }[level];

  return (
    <section className={`border p-5 ${levelStyles[level]}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-stone-400">สภาพตอนนี้</p>
          <h2 className="mt-1 font-serif text-3xl text-stone-100">{copy.title}</h2>
        </div>
        <span className={`border px-3 py-1 text-xs font-semibold tracking-wide ${chipStyles[level]}`}>{copy.chip}</span>
      </div>
      <p className="mt-4 leading-7 text-stone-300">{copy.sentence}</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-ember-200">{copy.action}</p>
    </section>
  );
}
