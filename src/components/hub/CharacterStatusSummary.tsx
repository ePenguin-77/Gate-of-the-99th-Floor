import { Button } from "../Button";
import { Panel } from "../Panel";
import { survivalLabels } from "../../game/labels";
import { getDominantPaths } from "../../game/pathAffinity";
import type { Character, PlayerProfile, SurvivalKey } from "../../types/game";

interface CharacterStatusSummaryProps {
  character: Character;
  playerProfile: PlayerProfile;
  onCharacter: () => void;
}

export function CharacterStatusSummary({ character, playerProfile, onCharacter }: CharacterStatusSummaryProps) {
  const dominantPath = getDominantPaths(character, 1)[0];
  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
      <Panel className="rounded-2xl border-white/10 bg-black/30 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-ember-300">ผู้หลงทาง</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-stone-50 sm:text-4xl">{character.name}</h2>
            <p className="mt-1 text-sm text-stone-400">
              {character.className}
              {character.advancedClassName ? ` / ${character.advancedClassName}` : ""}
            </p>
          </div>
          <Button onClick={onCharacter} className="min-h-9 rounded-xl px-3 py-1.5 text-xs">
            ดูรายละเอียดทั้งหมด
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <SnapshotChip label="ชั้นปัจจุบัน" value={Math.min(10, character.maxFloorCleared + 1)} />
          <SnapshotChip label="สภาพ" value={getCompactCondition(character)} />
          <SnapshotChip label="อาหาร" value={character.food} />
          <SnapshotChip label="ทอง" value={character.gold} />
        </div>
        <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          <SnapshotChip label="เส้นทางเด่น" value={dominantPath && dominantPath.value > 0 ? dominantPath.label : "ยังไม่ชัดเจน"} />
          <SnapshotChip label="วิญญาณที่สูญหาย" value={playerProfile.fallenSouls} />
          <SnapshotChip label="ตราหนี้ชีวิต" value={playerProfile.lifeDebtMarks} />
        </div>
      </Panel>

      <Panel className="rounded-2xl border-white/10 bg-black/30 p-5 shadow-xl shadow-black/20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-ember-300">สถานะด่วน</p>
            <h2 className="mt-2 font-serif text-2xl text-stone-50">สภาพร่างกายและพลังใจ</h2>
          </div>
          <p className="max-w-sm text-xs leading-5 text-stone-500">ภาวะเสี่ยงยิ่งสูงยิ่งอันตราย ส่วนพลังใจยิ่งสูงยิ่งดี</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <MiniStatusGroup title="ภาวะเสี่ยง" keys={["hunger", "fatigue", "injury", "sickness"]} character={character} kind="bad" />
          <MiniStatusGroup title="พลังใจ" keys={["morale", "hope"]} character={character} kind="good" />
        </div>
      </Panel>
    </section>
  );
}

function MiniStatusGroup({ title, keys, character, kind }: { title: string; keys: SurvivalKey[]; character: Character; kind: "bad" | "good" }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-stone-400">{title}</p>
      <div className="mt-2 grid gap-2">
        {keys.map((key) => {
          const value = character.survival[key];
          return (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-stone-400">{survivalLabels[key]}</span>
                <span className="text-stone-300">{value}/100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full ${kind === "bad" ? getBadBarColor(value) : getGoodBarColor(value)}`} style={{ width: `${value}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SnapshotChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <p className="text-[0.72rem] text-stone-500">{label}</p>
      <p className="mt-1 font-semibold leading-5 text-stone-100">{value}</p>
    </div>
  );
}

function getCompactCondition(character: Character) {
  const highest = Math.max(character.survival.hunger, character.survival.fatigue, character.survival.injury, character.survival.sickness);
  if (highest >= 90) return "วิกฤต";
  if (highest >= 70) return "อันตราย";
  if (highest >= 40) return "เริ่มน่าเป็นห่วง";
  return "ยังไหว";
}

function getBadBarColor(value: number) {
  if (value >= 90) return "bg-red-400";
  if (value >= 70) return "bg-orange-400";
  if (value >= 40) return "bg-yellow-300";
  return "bg-emerald-300";
}

function getGoodBarColor(value: number) {
  if (value >= 80) return "bg-sky-300";
  if (value >= 50) return "bg-cyan-300";
  if (value >= 30) return "bg-yellow-300";
  return "bg-red-400";
}
