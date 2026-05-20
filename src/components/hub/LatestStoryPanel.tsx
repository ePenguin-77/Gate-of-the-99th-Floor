import { LastActionResult } from "../LastActionResult";
import { Panel } from "../Panel";
import type { JournalEntry, LastActionResult as LastActionResultType } from "../../types/game";

interface LatestStoryPanelProps {
  latestEntry?: JournalEntry;
  lastActionResult?: LastActionResultType;
  npcLine?: string;
}

export function LatestStoryPanel({ latestEntry, lastActionResult, npcLine }: LatestStoryPanelProps) {
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <LastActionResult result={lastActionResult} />
      <Panel className="rounded-2xl border-white/10 bg-black/30 p-5">
        <p className="text-xs font-semibold tracking-[0.2em] text-ember-300">เมืองพักพิง</p>
        <h2 className="mt-2 font-serif text-2xl text-stone-50">แอชเบลใต้ประตู</h2>
        <p className="mt-3 max-w-[720px] text-sm leading-7 text-stone-400">
          เมืองนี้ไม่ได้ปลอดภัย เพียงแต่หอคอยยังยอมให้ผู้หลงทางหายใจได้อีกคืน
        </p>
        {npcLine ? <p className="mt-4 max-w-[720px] rounded-2xl border border-ember-300/20 bg-ember-300/5 p-3 text-sm leading-7 text-stone-300">{npcLine}</p> : null}
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold tracking-[0.18em] text-ember-300">บันทึกล่าสุด</p>
          <h3 className="mt-2 font-serif text-xl text-stone-50">{latestEntry?.title ?? "ยังไม่มีบันทึก"}</h3>
          <p className="mt-2 max-w-[720px] text-sm leading-7 text-stone-400">
            {latestEntry?.text ?? "หน้ากระดาษยังว่างเปล่า แต่หมึกกำลังรออยู่"}
          </p>
        </div>
      </Panel>
    </section>
  );
}
