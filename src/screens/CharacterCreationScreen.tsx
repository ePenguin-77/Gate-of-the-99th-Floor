import { Dices, Sparkles } from "lucide-react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { statLabels } from "../game/labels";
import type { Character, PlayerProfile } from "../types/game";

interface Props {
  character: Character;
  playerProfile: PlayerProfile;
  onReroll: () => void;
  onStart: () => void;
  onBack: () => void;
}

export function CharacterCreationScreen({ character, playerProfile, onReroll, onStart, onBack }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">สร้างผู้หลงทาง</p>
          <h1 className="font-serif text-4xl leading-tight text-stone-100">หอคอยเลือกกายเนื้อ ส่วนคุณเลือกว่าจะตอบรับหรือไม่</h1>
        </div>
        <Button variant="ghost" onClick={onBack}>กลับ</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel className="p-6">
          <div className="mb-4 flex items-center gap-3">
            <Sparkles className="text-ember-300" />
            <div>
              <h2 className="font-serif text-4xl text-stone-100">{character.name}</h2>
              <p className="text-stone-400">{character.className}</p>
            </div>
          </div>
          <p className="leading-7 text-stone-300">{character.personalitySummary}</p>
          {playerProfile.lifeDebtMarks > 0 ? (
            <p className="mt-4 border border-red-400/30 bg-red-950/20 p-3 text-sm leading-7 text-red-100">
              เงาของผู้สูญหายยังติดตามเทพอยู่ ผู้หลงทางคนใหม่จึงเริ่มต้นด้วยความหวังและศรัทธาที่สั่นคลอนเล็กน้อย
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {character.traits.map((trait) => (
              <span key={trait.id} className="border border-white/10 bg-black/25 px-3 py-2 text-sm text-stone-200">
                {trait.name}
              </span>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <h3 className="mb-4 font-serif text-2xl text-stone-100">ค่าสถานะเริ่มต้น</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(character.stats).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between border border-white/10 bg-black/20 px-4 py-3">
                <span className="text-stone-300">{statLabels[key as keyof typeof statLabels]}</span>
                <span className="font-serif text-2xl text-ember-300">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button onClick={onReroll}><Dices size={16} /> สุ่มใหม่</Button>
            <Button variant="primary" onClick={onStart}>เริ่มต้น</Button>
          </div>
        </Panel>
      </div>
    </main>
  );
}
