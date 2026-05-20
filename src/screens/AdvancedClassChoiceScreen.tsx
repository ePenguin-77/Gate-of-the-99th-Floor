import { Lock, Sparkles } from "lucide-react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { buildAdvancedClassWhy, type NearAdvancedClass } from "../game/advancedClassSystem";
import type { AdvancedClass, Character } from "../types/game";

interface Props {
  character: Character;
  options: AdvancedClass[];
  nearOptions?: NearAdvancedClass[];
  fallbackOption: AdvancedClass;
  onChoose: (advancedClassId: string) => void;
  onSkip: () => void;
}

export function AdvancedClassChoiceScreen({ character, options, nearOptions = [], fallbackOption, onChoose }: Props) {
  const selectableOptions = options.length > 0 ? options : [fallbackOption];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <header className="mb-6 border-b border-white/10 pb-5">
        <p className="text-sm font-medium tracking-wide text-ember-300">ประตูแรกเปิดออกแล้ว</p>
        <h1 className="mt-1 font-serif text-5xl leading-tight text-stone-100">ชะตาใหม่กำลังก่อตัว</h1>
        <p className="mt-3 max-w-3xl leading-8 text-stone-300">
          เมื่อประตูแรกเปิดออก หอคอยไม่ได้ถามว่าเขาอยากเป็นอะไร มันถามว่า ตลอดทางที่ผ่านมา เขาได้กลายเป็นใครไปแล้ว
        </p>
      </header>

      {options.length === 0 ? (
        <Panel className="mb-5 border-amber-300/30 bg-amber-300/10 p-5">
          <h2 className="font-serif text-2xl text-stone-100">ชะตายังไม่ชัดเจนพอ</h2>
          <p className="mt-3 leading-7 text-stone-300">
            แม้จะผ่านประตูแรกมาได้ แต่ผู้หลงทางยังไม่รู้ว่าตนเองกำลังกลายเป็นสิ่งใด เส้นทางเฉพาะจึงยังไม่ปรากฏชัด
          </p>
        </Panel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {selectableOptions.map((advancedClass) => (
          <AdvancedClassCard key={advancedClass.id} advancedClass={advancedClass} character={character} onChoose={onChoose} />
        ))}
      </div>

      {nearOptions.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-serif text-2xl text-stone-100">เส้นทางที่เกือบปรากฏ</h2>
          <p className="mt-2 text-sm leading-7 text-stone-400">
            เส้นทางเหล่านี้ยังไม่เลือกได้ในครั้งนี้ แต่บอกได้ว่าชีวิตที่ผ่านมาเกือบหล่อหลอมเขาไปทางใด
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {nearOptions.map((near) => (
              <Panel key={near.advancedClass.id} className="border-white/10 bg-black/20 p-4 opacity-80">
                <div className="flex items-start gap-3">
                  <Lock className="mt-1 shrink-0 text-stone-500" size={18} />
                  <div>
                    <p className="text-sm text-ember-300">{near.advancedClass.titleTh}</p>
                    <h3 className="font-serif text-2xl text-stone-200">{near.advancedClass.nameTh}</h3>
                  </div>
                </div>
                <div className="mt-3 grid gap-2">
                  {near.missingRequirements.map((requirement) => (
                    <p key={requirement.pathId} className="text-sm leading-6 text-stone-400">
                      ต้องการ {requirement.label} {requirement.required} แต่ตอนนี้มี {requirement.current}
                    </p>
                  ))}
                </div>
              </Panel>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function AdvancedClassCard({
  advancedClass,
  character,
  onChoose,
}: {
  advancedClass: AdvancedClass;
  character: Character;
  onChoose: (advancedClassId: string) => void;
}) {
  return (
    <Panel className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-1 shrink-0 text-ember-300" />
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">{advancedClass.titleTh}</p>
          <h2 className="mt-1 font-serif text-3xl text-stone-100">{advancedClass.nameTh}</h2>
        </div>
      </div>
      <p className="mt-4 leading-7 text-stone-300">{advancedClass.descriptionTh}</p>

      <div className="mt-4 grid gap-3">
        <InfoBlock title="เหตุผลที่เส้นทางนี้ปรากฏ" text={buildAdvancedClassWhy(advancedClass, character)} />
        <InfoBlock title="ความสามารถติดตัว" text={advancedClass.passiveTh} />
        {advancedClass.drawbackTh ? <InfoBlock title="ราคาที่ต้องแบก" text={advancedClass.drawbackTh} /> : null}
        <InfoBlock title="Class Action" text={advancedClass.classActionTh} />
      </div>

      <Button variant="primary" className="mt-5 w-full" onClick={() => onChoose(advancedClass.id)}>
        ยอมรับเส้นทางนี้
      </Button>
    </Panel>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="border border-white/10 bg-black/20 p-3">
      <p className="text-xs font-medium tracking-wide text-ember-300">{title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-stone-300">{text}</p>
    </div>
  );
}
