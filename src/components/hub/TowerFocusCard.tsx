import { DoorOpen, PackagePlus, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../Button";
import { Panel } from "../Panel";
import { getUsefulEquippedItemHintsForCharacter } from "../../game/inventorySystem";
import { getTowerPressureEffects } from "../../game/towerPressure";
import type { Character, FloorDefinition, FloorIntel } from "../../types/game";

interface TowerEstimateView {
  chance: number;
  riskLabel: string;
  advice: string;
  reasons: string[];
}

export interface TowerFocusCardProps {
  character: Character;
  floor?: FloorDefinition;
  estimate?: TowerEstimateView;
  towerPressure: number;
  canChallenge: boolean;
  prototypeCleared: boolean;
  floorIntel?: FloorIntel;
  onChallenge: () => void;
  onInvestigate: () => void;
  onPrepareGear: () => void;
  onRevisit: () => void;
  showPreparationActions?: boolean;
}

export function TowerFocusCard({
  character,
  floor,
  estimate,
  towerPressure,
  canChallenge,
  prototypeCleared,
  floorIntel,
  onChallenge,
  onInvestigate,
  onPrepareGear,
  onRevisit,
  showPreparationActions = true,
}: TowerFocusCardProps) {
  const isDanger = (estimate?.chance ?? 100) < 35;
  const contextTags = floor ? [floor.challengeType, ...(floor.tags ?? []), `floor-${floor.floor}`] : [];
  const usefulItems = floor ? getUsefulEquippedItemHintsForCharacter(character, contextTags).slice(0, 3) : [];
  const matchingIntel = floorIntel && floor && (floorIntel.floorNumber === floor.floor || floorIntel.expiresAfterNextTower) ? floorIntel : undefined;
  const challengePreview = "เสี่ยงตามชั้น / ความหิว +16 / ความเหนื่อยล้า +24";

  return (
    <Panel className="relative overflow-hidden rounded-[1.35rem] border-ember-300/30 bg-[radial-gradient(circle_at_72%_0%,rgba(217,140,58,0.08),transparent_24%),linear-gradient(135deg,rgba(16,15,19,0.94),rgba(6,6,9,0.92))] p-5 shadow-2xl shadow-amber-950/20 sm:p-6">
      <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-ember-300/70 to-transparent" />

      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-ember-300">ชั้นถัดไป</p>
          <h1 className="mt-2 max-w-3xl font-serif text-[clamp(1.75rem,4vw,2.85rem)] leading-tight text-stone-50">
            {prototypeCleared ? "ผ่านประตูแรกแล้ว" : floor?.title ?? "ยังไม่พบชั้นถัดไป"}
          </h1>
          <p className="mt-3 max-w-[720px] text-sm leading-7 text-stone-400">
            {floor?.recommendedPreparationTh ?? "ตรวจสภาพร่างกาย เตรียมเสบียง และเลือกจังหวะขึ้นหอคอยให้ดี"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <FocusStat label="โอกาสโดยประมาณ" value={estimate ? `${estimate.chance}%` : "ไม่ทราบ"} detail={estimate?.riskLabel ?? "ยังไม่มีข้อมูล"} tone={isDanger ? "danger" : "normal"} large />
          <FocusStat label="ความกดดันของหอคอย" value={`${towerPressure}/20`} detail={getTowerPressureSummary(towerPressure)} tone={towerPressure >= 8 ? "danger" : "normal"} />
        </div>
      </div>

      <div className="relative mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)]">
        <InfoList title="เหตุผลสำคัญ" items={estimate?.reasons.length ? estimate.reasons.slice(0, 4) : ["ไม่มีข้อมูลชั้นถัดไป"]} />
        <div className="grid gap-4">
          <InfoList title="ข้อมูลที่มีอยู่" items={[getIntelText(matchingIntel)]} muted={!matchingIntel} />
          <InfoList title="ของที่อาจช่วยชั้นนี้" items={usefulItems.length ? usefulItems : ["ไม่มีอุปกรณ์ที่เหมาะกับชั้นนี้"]} muted={!usefulItems.length} />
        </div>
      </div>

      <div className="relative mt-6 grid gap-2">
        <Button
          variant={isDanger ? "danger" : "primary"}
          className="min-h-16 w-full rounded-2xl text-[1.05rem] shadow-lg shadow-amber-950/30 sm:text-lg"
          onClick={onChallenge}
          disabled={!canChallenge}
          data-audio-id="ui_confirm"
        >
          <DoorOpen size={22} /> ท้าทายชั้นถัดไป
        </Button>
        <p className={`text-center text-sm leading-6 ${isDanger ? "text-orange-200" : "text-stone-400"}`}>
          {isDanger ? `โอกาสรอดต่ำ ควรเตรียมตัวก่อนขึ้นหอคอย · ${challengePreview}` : challengePreview}
        </p>
        {character.survival.fatigue >= 100 ? <p className="text-center text-sm text-red-200">ร่างกายอ่อนล้าเกินกว่าจะฝืนขึ้นหอคอยได้ในตอนนี้</p> : null}
      </div>

      {showPreparationActions ? (
        <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-stone-100">เตรียมก่อนขึ้นหอคอย</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <PrepButton icon={<Search size={16} />} label="สืบข่าวชั้นถัดไป" preview="อาจได้ข้อมูลช่วยผ่านชั้นต่อไป / เสี่ยงข่าวปลอมหรือถูกหลอก" onClick={onInvestigate} />
            <PrepButton icon={<PackagePlus size={16} />} label="เตรียมอุปกรณ์ขึ้นหอคอย" preview="ลดความเสี่ยงบาดเจ็บ / ใช้ทอง" onClick={onPrepareGear} />
            <PrepButton icon={<DoorOpen size={16} />} label="กลับไปยังชั้นก่อนหน้า" preview="ปลอดภัยกว่า / ได้ทรัพยากรเล็กน้อย" onClick={onRevisit} disabled={character.maxFloorCleared < 1} />
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function InfoList({ title, items, muted }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
      <p className="text-sm font-semibold text-stone-100">{title}</p>
      <ul className={`mt-2 grid gap-1 text-sm leading-6 ${muted ? "text-stone-500" : "text-stone-300"}`}>
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function PrepButton({ icon, label, preview, onClick, disabled }: { icon: ReactNode; label: string; preview: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-20 items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-ember-300/35 hover:bg-ember-300/10 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className="mt-0.5 text-ember-200">{icon}</span>
      <span className="grid gap-1">
        <span className="text-sm font-semibold leading-5 text-stone-100">{label}</span>
        <span className="text-xs leading-5 text-stone-400">{preview}</span>
      </span>
    </button>
  );
}

function FocusStat({ label, value, detail, tone = "normal", large }: { label: string; value: string; detail: string; tone?: "normal" | "danger"; large?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 ${tone === "danger" ? "border-orange-300/25 bg-orange-950/15" : "border-white/10 bg-black/25"}`}>
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`mt-1 font-serif ${large ? "text-4xl" : "text-2xl"} ${tone === "danger" ? "text-orange-200" : "text-stone-100"}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-stone-400">{detail}</p>
    </div>
  );
}

function getIntelText(intel?: FloorIntel) {
  if (!intel) return "ไม่มีข้อมูลชั้นถัดไป";
  if (intel.isFalse) return "ข้อมูลที่ได้มา: ฟังดูน่าเชื่อถือ แต่ยังไม่มีใครยืนยันได้";
  if (intel.reliability === "trusted") return "ข้อมูลน่าเชื่อถือ: เพิ่มโอกาสผ่าน และลดความเสี่ยงบาดเจ็บ";
  if (intel.reliability === "partial") return "ข้อมูลบางส่วน: ช่วยให้เข้าใจชั้นถัดไปมากขึ้นเล็กน้อย";
  if (intel.reliability === "rumor") return "ข่าวลือคลุมเครือ: อาจช่วยตีความสถานการณ์ แต่ไม่รับประกันผล";
  return intel.descriptionTh;
}

function getTowerPressureSummary(towerPressure: number) {
  const effects = getTowerPressureEffects(towerPressure);
  if (towerPressure >= 13) return `หอคอยตื่นตัว / โอกาสผ่าน ${effects.successChancePenalty}%`;
  if (towerPressure >= 8) return `กดดัน / โอกาสผ่าน ${effects.successChancePenalty}%`;
  if (towerPressure >= 4) return `เริ่มจับตามอง / โอกาสผ่าน ${effects.successChancePenalty}%`;
  return "สงบนิ่ง แต่ไม่ปลอดภัย";
}
