import { ArrowLeft, ScrollText } from "lucide-react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { resultLabels } from "../game/labels";
import type { FloorResult } from "../types/game";

interface Props {
  result: FloorResult;
  onReturn: () => void;
}

export function EventResultScreen({ result, onReturn }: Props) {
  const opensClassEvolution = result.floor === 10 && ["greatSuccess", "success", "costlySuccess"].includes(result.level);
  const returnLabel = opensClassEvolution ? "ก้าวผ่านประตูแรก" : "กลับเมืองพักพิง";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">ผลลัพธ์จากหอคอย</p>
          <h1 className="font-serif text-4xl leading-tight text-stone-100">{result.title}</h1>
        </div>
        <Button variant="ghost" onClick={onReturn}>
          <ArrowLeft size={16} /> {returnLabel}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-6">
          <p className="text-sm font-medium tracking-wide text-ember-300">{result.actionName}</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-100">{resultLabels[result.level]}</h2>
          <p className="mt-4 text-lg leading-8 text-stone-300">{result.summary}</p>
          {result.score > 0 || result.threshold > 0 ? (
            <div className="mt-5 border border-white/10 bg-black/20 p-4 text-sm leading-7 text-stone-400">
              โอกาสประเมิน {result.score}% / ผลเสี่ยง {result.threshold}
            </div>
          ) : null}
          {result.importantReasons && result.importantReasons.length > 0 ? (
            <div className="mt-5 border border-white/10 bg-black/20 p-4 text-sm leading-7 text-stone-300">
              <p className="font-semibold text-stone-100">เหตุผลสำคัญ</p>
              <ul className="mt-2 space-y-1">
                {result.importantReasons.map((reason) => (
                  <li key={reason}>- {reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.pathChanges && result.pathChanges.length > 0 ? (
            <div className="mt-5 border border-ember-300/25 bg-ember-300/10 p-4 text-sm leading-7 text-stone-300">
              <p className="font-semibold text-stone-100">ร่องรอยของชะตา</p>
              <ul className="mt-2 space-y-1">
                {result.pathChanges.map((change) => (
                  <li key={`${change.pathId}-${change.amount}`}>
                    - {change.label} {change.amount > 0 ? "+" : ""}
                    {change.amount}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        <Panel className="p-6">
          <h2 className="font-serif text-2xl text-stone-100">การเปลี่ยนแปลง</h2>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-300">
            {result.effects.map((effect) => (
              <li key={effect} className="border border-white/10 bg-black/20 px-3 py-2">
                {effect}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="p-6 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-ember-300">
            <ScrollText size={18} />
            <h2 className="font-serif text-2xl text-stone-100">ตัวอย่างบันทึกการเดินทาง</h2>
          </div>
          <p className="leading-8 text-stone-300">{result.journalText}</p>
          <Button variant="primary" className="mt-6 w-full" onClick={onReturn}>
            {returnLabel}
          </Button>
        </Panel>
      </div>
    </main>
  );
}
