import { ArrowLeft, BookOpen, ScrollText } from "lucide-react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { getAdvancedClassProfile } from "../data/advancedClassProfiles";
import { resultLabels } from "../game/labels";
import { getFloor20RecordedIdentity } from "../game/floor20Finale";
import type { Character, FloorResult } from "../types/game";

interface Props {
  result: FloorResult;
  character: Character | null;
  onReturn: () => void;
}

export function Floor20ResultScreen({ result, character, onReturn }: Props) {
  const cleared = ["greatSuccess", "success", "costlySuccess"].includes(result.level);
  const profile = getAdvancedClassProfile(character?.advancedClassId);
  const recorded = character ? getFloor20RecordedIdentity(character) : "ชื่อหนึ่งถูกเขียนไว้ในสมุด แต่หมึกยังไม่ยอมบอกว่าคนนั้นกลายเป็นใคร";
  const profileLine = cleared ? profile?.floor20SuccessLineTh : profile?.floor20FailureLineTh;

  return (
    <main className="floor20-finale min-h-screen px-5 py-8 text-stone-100">
      <div className="floor20-ambient" />
      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium tracking-wide text-ember-300">ผลลัพธ์ของนายทะเบียน</p>
            <h1 className="font-serif text-5xl leading-tight text-stone-100">{cleared ? "นายทะเบียนบันทึกชื่อแล้ว" : "สมุดยังไม่ยอมปิด"}</h1>
          </div>
          <Button variant="ghost" onClick={onReturn}>
            <ArrowLeft size={16} /> กลับเมืองพักพิง
          </Button>
        </div>

        <div className="floor20-phase-track mb-5 grid gap-3 sm:grid-cols-5">
          {["อาคารทะเบียน", "ยืนยันชื่อ", "บททดสอบ", "การบันทึก", "ผลลัพธ์"].map((label, index) => (
            <div key={label} className={`border px-3 py-2 text-center text-xs font-medium ${index === 4 ? "border-ember-300/70 bg-ember-300/15 text-ember-100" : "border-white/10 bg-black/25 text-stone-500"}`}>
              {label}
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <Panel className="floor20-ledger-card p-7">
            <p className="text-sm font-medium tracking-wide text-ember-300">{resultLabels[result.level]}</p>
            <h2 className="mt-3 font-serif text-3xl text-stone-100">{result.title}</h2>
            <p className="mt-5 text-lg leading-9 text-stone-300">
              {cleared
                ? "สมุดปิดลงเอง เสียงนั้นเบามาก แต่ทั้งเมืองร้างกลับเงียบตามมัน ราวกับทุกถนนยอมรับว่าชื่อของเขาถูกเขียนผ่านด่านนี้แล้ว"
                : "หมึกบนหน้ากระดาษซึมแตกออกเป็นวงกว้าง สมุดไม่ได้ลบชื่อของเขา แต่มันยังไม่ยอมเขียนช่องสุดท้ายให้จบ"}
            </p>
            <p className="mt-5 text-base leading-8 text-stone-400">{result.summary}</p>
            {profileLine ? <p className="mt-5 border-l-2 border-ember-300/70 pl-4 font-serif text-2xl leading-9 text-stone-100">{profileLine}</p> : null}
          </Panel>

          <Panel className="p-7">
            <div className="mb-3 flex items-center gap-2 text-ember-300">
              <BookOpen size={18} />
              <h2 className="font-serif text-2xl text-stone-100">สิ่งที่ถูกบันทึก</h2>
            </div>
            <p className="whitespace-pre-line rounded-2xl border border-ember-300/20 bg-black/25 p-4 font-serif text-2xl leading-9 text-stone-100">{recorded}</p>
            {result.memoryCreated ? (
              <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-7 text-emerald-100">
                <p className="font-semibold text-stone-100">ความทรงจำที่เกิดขึ้น</p>
                <p className="mt-1">{result.memoryCreated.title}</p>
                <p className="mt-1 text-emerald-100/80">{result.memoryCreated.description}</p>
              </div>
            ) : null}
          </Panel>

          <Panel className="p-7">
            <h2 className="font-serif text-2xl text-stone-100">เหตุผลสำคัญ</h2>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-300">
              {(result.importantReasons ?? []).map((reason) => (
                <li key={reason} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  {reason}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-7">
            <h2 className="font-serif text-2xl text-stone-100">การเปลี่ยนแปลง</h2>
            <ul className="mt-4 space-y-2 text-sm leading-7 text-stone-300">
              {result.effects.map((effect) => (
                <li key={effect} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                  {effect}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-7 lg:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-ember-300">
              <ScrollText size={18} />
              <h2 className="font-serif text-2xl text-stone-100">บันทึกหลังเมืองร้าง</h2>
            </div>
            <p className="max-w-3xl leading-8 text-stone-300">{result.journalText}</p>
            <Button variant="primary" className="mt-6 w-full" onClick={onReturn}>
              กลับเมืองพักพิง
            </Button>
          </Panel>
        </div>
      </div>
    </main>
  );
}
