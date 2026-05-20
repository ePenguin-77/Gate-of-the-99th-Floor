import { useState } from "react";
import { ArrowLeft, EyeOff, Hand, MessageCircle, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "../components/Button";
import { DivineActionCard } from "../components/DivineActionCard";
import { Panel } from "../components/Panel";
import { divineActions } from "../game/divineActions";
import { challengeLabels, statLabels } from "../game/labels";
import { getFloorMemoryTags } from "../game/memorySystem";
import type { DivineActionId, FloorDefinition } from "../types/game";

interface Props {
  floor: FloorDefinition;
  revisit: boolean;
  onResolve: (action: DivineActionId) => void;
  onReturn: () => void;
}

const icons = {
  whisper: MessageCircle,
  omen: TriangleAlert,
  blessing: Sparkles,
  silence: EyeOff,
};

export function TowerEventScreen({ floor, revisit, onResolve, onReturn }: Props) {
  const [selected, setSelected] = useState<DivineActionId>("whisper");
  const floorTags = getFloorMemoryTags(floor);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">
            {revisit ? "กลับไปยัง" : "ท้าทาย"} ชั้นที่ {floor.floor}
          </p>
          <h1 className="font-serif text-4xl text-stone-100">{floor.title}</h1>
        </div>
        <Button variant="ghost" onClick={onReturn}><ArrowLeft size={16} /> กลับเมืองพักพิง</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Panel className="p-6">
          <p className="text-lg leading-8 text-stone-200">{floor.description}</p>
          <p className="mt-5 border-l-2 border-ember-300/70 pl-4 font-serif text-2xl leading-9 text-stone-100">
            {floor.emotionalReaction}
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm text-stone-400">
            <span className="border border-white/10 bg-black/20 px-3 py-2">{challengeLabels[floor.challengeType]}</span>
            {floor.checks.map((check) => (
              <span key={check.stat} className="border border-white/10 bg-black/20 px-3 py-2 capitalize">
                {statLabels[check.stat]} {check.difficulty}
              </span>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <h2 className="font-serif text-2xl text-stone-100">เลือกการกระทำของเทพหนึ่งอย่าง</h2>
          <div className="mt-4 grid gap-3">
            {divineActions.map((action) => {
              const Icon = icons[action.id];
              return (
                <DivineActionCard
                  key={action.id}
                  action={action}
                  icon={Icon}
                  selected={selected === action.id}
                  floorHint={getActionFloorHint(action.id, floor.challengeType, floorTags)}
                  onSelect={() => setSelected(action.id)}
                />
              );
            })}
          </div>
          <p className="mt-4 text-xs leading-6 text-stone-500">
            ผลลัพธ์จริงยังขึ้นอยู่กับค่าสถานะ ความทรงจำ Trait และสภาพร่างกายของผู้หลงทาง
          </p>
          <Button variant="primary" className="mt-5 w-full" onClick={() => onResolve(selected)}>
            <Hand size={16} /> ตอบรับจากเบื้องบน
          </Button>
        </Panel>
      </div>
    </main>
  );
}

function getActionFloorHint(actionId: DivineActionId, challengeType: FloorDefinition["challengeType"], tags: string[]) {
  if (actionId === "omen" && (tags.includes("darkness") || tags.includes("fear") || challengeType === "survival")) {
    return "ลางบอกเหตุอาจช่วยเตือนอันตรายที่ซ่อนอยู่ได้ดี";
  }
  if (actionId === "blessing" && (challengeType === "combat" || challengeType === "boss" || challengeType === "survival")) {
    return "พรแห่งเทพให้โบนัสสูงในสถานการณ์ที่กดดันร่างกายโดยตรง";
  }
  if (actionId === "silence" && (challengeType === "moral" || tags.includes("darkness") || tags.includes("fear"))) {
    return "ความเงียบอาจช่วยให้ผู้หลงทางเติบโตจากการตัดสินใจเอง";
  }
  if (actionId === "whisper" && (challengeType === "puzzle" || challengeType === "npc" || challengeType === "moral")) {
    return "เสียงกระซิบช่วยจัดระเบียบความคิดในสถานการณ์ที่ต้องเลือกให้ดี";
  }
  return undefined;
}
