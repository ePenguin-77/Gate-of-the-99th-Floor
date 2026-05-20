import type { LastActionResult as LastActionResultType } from "../types/game";

interface LastActionResultProps {
  result?: LastActionResultType;
}

export function LastActionResult({ result }: LastActionResultProps) {
  if (!result) return null;

  return (
    <section className="border border-ember-300/25 bg-black/25 p-5">
      <p className="text-sm font-medium tracking-wide text-ember-300">ผลจากกิจกรรมล่าสุด: {result.activityName}</p>
      <p className="mt-3 leading-7 text-stone-300">{result.narrative}</p>
      {result.deltas.length > 0 ? (
        <div className="mt-4 grid gap-2 text-sm">
          {result.deltas.slice(0, 8).map((delta) => (
            <div key={delta.key} className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-ash-900/70 px-3 py-2">
              <span className="text-stone-300">{delta.label}</span>
              <span className={getDeltaClass(delta)}>
                {delta.before} → {delta.after} ({formatDelta(delta.delta)})
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-stone-500">ไม่มีค่าหลักเปลี่ยนแปลงอย่างชัดเจน</p>
      )}
      {result.notes && result.notes.length > 0 ? (
        <div className="mt-3 grid gap-2 text-sm">
          {result.notes.map((note) => (
            <div key={note} className="border border-sky-300/20 bg-sky-950/10 px-3 py-2 text-sky-100">
              {note}
            </div>
          ))}
        </div>
      ) : null}
      {result.importantReasons && result.importantReasons.length > 0 ? (
        <div className="mt-4 border border-white/10 bg-black/20 p-3 text-sm leading-6 text-stone-300">
          <p className="font-semibold text-stone-100">เหตุผลสำคัญ</p>
          <ul className="mt-2 space-y-1">
            {result.importantReasons.map((reason) => (
              <li key={reason}>- {reason}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function getDeltaClass(delta: LastActionResultType["deltas"][number]) {
  const isHelpful =
    delta.valueType === "bad"
      ? delta.delta < 0
      : delta.valueType === "good" || delta.valueType === "stat" || delta.valueType === "resource"
        ? delta.delta > 0
        : false;
  return isHelpful ? "font-semibold text-emerald-300" : "font-semibold text-orange-300";
}

function formatDelta(delta: number) {
  return delta > 0 ? `+${delta}` : `${delta}`;
}
