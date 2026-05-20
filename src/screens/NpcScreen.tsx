import { ArrowLeft, HeartHandshake } from "lucide-react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { getNpcRelationshipLabel } from "../game/npcSystem";
import type { NPC } from "../types/game";

interface Props {
  npcs: NPC[];
  onBack: () => void;
}

const statusLabels: Record<NPC["status"], string> = {
  available: "อยู่ในเมือง",
  missing: "หายตัวไป",
  dead: "เสียชีวิต",
  locked: "ยังไม่พบ",
};

const serviceLabels: Record<string, string> = {
  innRest: "พักโรงเตี๊ยม",
  rumorSmall: "ข่าวลือเล็กน้อย",
  treatInjury: "รักษาบาดแผล",
  treatSickness: "รักษาอาการป่วย",
  investigateNextFloor: "สืบข่าวชั้นถัดไป",
  prepareEquipment: "เตรียมอุปกรณ์ขึ้นหอคอย",
  repairTools: "ซ่อมอุปกรณ์",
};

export function NpcScreen({ npcs, onBack }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
        <div>
          <p className="text-sm font-medium tracking-wide text-ember-300">เมืองพักพิง</p>
          <h1 className="font-serif text-5xl text-stone-100">ผู้คนในเมืองพักพิง</h1>
        </div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={16} /> กลับเมืองพักพิง
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {npcs.map((npc) => (
          <Panel key={npc.id} className={`p-5 ${npc.status === "locked" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl text-stone-100">{npc.nameTh}</h2>
                <p className="mt-1 text-sm text-ember-300">{npc.roleTh}</p>
              </div>
              <span className="border border-white/10 bg-black/20 px-3 py-1 text-xs text-stone-300">{statusLabels[npc.status]}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-stone-300">{npc.status === "locked" ? "ยังไม่มีใครในเมืองพูดถึงคนผู้นี้ ราวกับชะตาของเขายังติดอยู่ในหอคอย" : npc.descriptionTh}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-2 border border-ember-300/25 bg-ember-300/10 px-3 py-1 text-ember-100">
                <HeartHandshake size={14} /> {getNpcRelationshipLabel(npc.relationship)} ({npc.relationship})
              </span>
              {(npc.services ?? []).map((service) => (
                <span key={service} className="border border-white/10 bg-black/20 px-3 py-1 text-stone-400">
                  {serviceLabels[service] ?? service}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-6 text-stone-500">{getNpcLine(npc)}</p>
          </Panel>
        ))}
      </div>
    </main>
  );
}

function getNpcLine(npc: NPC): string {
  if (npc.status === "locked") return "บางคนจะมาถึงเมืองพักพิงได้ ก็ต่อเมื่อมีใครสักคนรอดพาเขากลับมา";
  if (npc.relationship >= 50) return `${npc.nameTh}มองผู้หลงทางเหมือนคนที่ยังมีสิทธิ์กลับมา`;
  if (npc.relationship <= -30) return `${npc.nameTh}พูดด้วยน้ำเสียงระวังตัว ราวกับทุกคำอาจถูกใช้เป็นหนี้ในภายหลัง`;
  return `${npc.nameTh}ยังเฝ้ามองอยู่ห่างๆ เมืองนี้ไม่ให้ความไว้ใจเร็วเกินไป`;
}
