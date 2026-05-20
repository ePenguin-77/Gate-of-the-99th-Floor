import { Skull, Sparkles } from "lucide-react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import type { DeathRecord, PlayerProfile } from "../types/game";

interface Props {
  death: DeathRecord;
  playerProfile: PlayerProfile;
  onNewRun: () => void;
}

export function DeathScreen({ death, playerProfile, onNewRun }: Props) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-8">
      <div className="w-full">
        <div className="mb-5">
          <p className="text-sm font-medium tracking-wide text-red-200">ผู้หลงทางล้มลงแล้ว</p>
          <h1 className="font-serif text-5xl leading-tight text-stone-100">อนุสรณ์ของ {death.name}</h1>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel className="border-red-400/35 bg-red-950/20 p-6">
            <div className="mb-4 flex items-center gap-3 text-red-100">
              <Skull />
              <h2 className="font-serif text-3xl text-stone-100">สาเหตุ: {death.causeText}</h2>
            </div>
            <p className="text-lg leading-9 text-stone-200">{death.message}</p>
            <p className="mt-5 leading-7 text-stone-400">
              {death.name} เป็น{death.className} ผู้ไปได้ไกลถึงชั้นที่ {death.floorReached} ก่อนที่หอคอยจะปิดปากเงียบใส่เขา
            </p>
            {death.npcMemorialText ? (
              <div className="mt-5 border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium tracking-wide text-ember-300">ถ้อยคำจากเมืองพักพิง</p>
                <p className="mt-2 leading-7 text-stone-300">{death.npcMemorialText}</p>
              </div>
            ) : null}
            <Button variant="primary" className="mt-6 w-full" onClick={onNewRun}>
              <Sparkles size={16} /> เริ่มผู้หลงทางคนใหม่
            </Button>
          </Panel>

          <Panel className="p-6">
            <h2 className="font-serif text-3xl text-stone-100">รอยแผลของเทพ</h2>
            <div className="mt-5 grid gap-3">
              <div className="border border-white/10 bg-black/20 p-4">
                <p className="text-stone-500">วิญญาณที่สูญหาย</p>
                <p className="font-serif text-4xl text-ember-300">{playerProfile.fallenSouls}</p>
              </div>
              <div className="border border-white/10 bg-black/20 p-4">
                <p className="text-stone-500">ตราหนี้ชีวิต</p>
                <p className="font-serif text-4xl text-ember-300">{playerProfile.lifeDebtMarks}</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-400">
              เงาของผู้สูญหายยังติดตามเทพอยู่ ผู้หลงทางคนใหม่จึงเริ่มต้นด้วยความหวังและศรัทธาที่สั่นคลอนเล็กน้อย
            </p>
          </Panel>

          <Panel className="p-6 lg:col-span-2">
            <h2 className="font-serif text-2xl text-stone-100">อนุสรณ์ผู้หลงทาง</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {playerProfile.memorials.slice(0, 6).map((memorial) => (
                <div key={memorial.id} className="border border-white/10 bg-black/20 p-4">
                  <p className="font-serif text-xl text-stone-100">{memorial.name}</p>
                  <p className="mt-1 text-sm text-stone-400">
                    {memorial.className} — ชั้นที่ {memorial.floorReached} — {memorial.causeText}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
