import { ArrowLeft } from "lucide-react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import type { JournalEntry } from "../types/game";

interface Props {
  entries: JournalEntry[];
  onBack: () => void;
}

export function JournalScreen({ entries, onBack }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">บันทึกการเดินทาง</p>
          <h1 className="font-serif text-4xl leading-tight text-stone-100">สิ่งที่หอคอยทิ้งไว้ในตัวเขา</h1>
        </div>
        <Button variant="ghost" onClick={onBack}><ArrowLeft size={16} /> กลับเมืองพักพิง</Button>
      </div>
      <div className="grid gap-4">
        {entries.length === 0 ? (
          <Panel className="p-6 text-stone-300">ยังไม่มีหมึกหยดใดแห้งบนหน้ากระดาษ</Panel>
        ) : (
          entries.map((entry) => (
            <Panel key={entry.id} className="p-5">
              <div className="mb-2 flex flex-wrap items-center gap-3 text-sm uppercase tracking-[0.16em] text-stone-500">
                <span>วันที่ {entry.day}</span>
                {entry.floor ? <span>ชั้นที่ {entry.floor}</span> : null}
              </div>
              <h2 className="font-serif text-2xl text-stone-100">{entry.title}</h2>
              <p className="mt-3 leading-7 text-stone-300">{entry.text}</p>
            </Panel>
          ))
        )}
      </div>
    </main>
  );
}
