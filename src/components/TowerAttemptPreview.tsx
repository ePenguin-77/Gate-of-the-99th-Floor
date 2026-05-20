import { BalanceDebugPanel } from "./BalanceDebugPanel";
import { estimateTowerAttempt } from "../game/eventResolver";
import { getUsefulEquippedItemHintsForCharacter } from "../game/inventorySystem";
import { getFloorMemoryTags } from "../game/memorySystem";
import type { Character, DifficultyMode, FloorDefinition, FloorIntel, PreparationBuff } from "../types/game";

interface TowerAttemptPreviewProps {
  character: Character;
  floor?: FloorDefinition;
  preparationBuff?: PreparationBuff;
  floorIntel?: FloorIntel;
  difficultyMode: DifficultyMode;
  divineStrain?: number;
  towerPressure: number;
}

export function TowerAttemptPreview({
  character,
  floor,
  preparationBuff,
  floorIntel,
  difficultyMode,
  divineStrain = 0,
  towerPressure,
}: TowerAttemptPreviewProps) {
  if (!floor) return null;
  const matchingIntel = floorIntel?.expiresAfterNextTower ? floorIntel : floorIntel?.floorNumber === floor.floor ? floorIntel : undefined;
  const estimate = estimateTowerAttempt(character, floor, "whisper", false, preparationBuff, matchingIntel, difficultyMode, divineStrain, towerPressure);
  const riskText = estimate.chance >= 70 ? "มีโอกาสดี" : estimate.chance >= 50 ? "พอเสี่ยงได้" : estimate.chance >= 35 ? "อันตราย" : "ไม่ควรฝืน";
  const itemHints = getUsefulEquippedItemHintsForCharacter(character, getFloorMemoryTags(floor));

  return (
    <section className="border border-white/10 bg-black/20 p-5">
      <h2 className="font-serif text-2xl text-stone-100">ประเมินการขึ้นหอคอย</h2>
      <div className="mt-4 grid gap-3 text-sm">
        <PreviewRow label="ชั้นถัดไป" value={floor.title} />
        <PreviewRow label="โอกาสโดยประมาณ" value={`${estimate.chance}% (${estimate.riskLabel})`} />
        <PreviewRow label="ระดับความเสี่ยง" value={riskText} />
        <PreviewRow label="เหตุผลหลัก" value={estimate.reasons.length > 0 ? estimate.reasons.join(" / ") : "สภาพปัจจุบันยังไม่มีจุดอ่อนรุนแรง"} />
        {estimate.penalties.length > 0 ? (
          <PreviewRow label="ผลกระทบจากสภาพ" value={estimate.penalties.map((penalty) => `${penalty.label} ${penalty.value}%`).join(", ")} />
        ) : null}
        {floor.uniqueMechanicTh ? <PreviewRow label="เอกลักษณ์ชั้นนี้" value={floor.uniqueMechanicTh} /> : null}
        <PreviewRow label="คำแนะนำ" value={estimate.advice} />
      </div>
      {towerPressure >= 8 ? (
        <p className="mt-3 border border-orange-300/25 bg-orange-950/15 px-3 py-2 text-xs leading-5 text-orange-100">
          คำเตือน: หอคอยเริ่มจับตามอง การรอคอยนานเกินไปอาจทำให้ชั้นถัดไปยากขึ้น
        </p>
      ) : null}
      {preparationBuff ? (
        <p className="mt-3 border border-emerald-300/25 bg-emerald-950/15 px-3 py-2 text-xs leading-5 text-emerald-100">
          มีการเตรียมอุปกรณ์สำหรับการขึ้นหอคอยครั้งถัดไป: โอกาสสำเร็จ +5%, ลดความเสี่ยงบาดเจ็บ
        </p>
      ) : null}
      {matchingIntel ? (
        <div className="mt-3 border border-sky-300/25 bg-sky-950/15 px-3 py-2 text-xs leading-5 text-sky-100">
          <p className="font-semibold">ข้อมูลที่มีอยู่</p>
          <p className="mt-1">{getIntelPreviewText(matchingIntel)}</p>
          {matchingIntel.revealedTags.length > 0 ? <p className="mt-1 text-sky-100/75">เบาะแส: {matchingIntel.revealedTags.join(", ")}</p> : null}
        </div>
      ) : null}
      <div className="mt-3 border border-ember-300/20 bg-black/20 px-3 py-2 text-xs leading-5 text-stone-300">
        <p className="font-semibold text-ember-200">ของที่อาจช่วยชั้นนี้</p>
        {itemHints.length > 0 ? (
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {itemHints.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-stone-500">ไม่มีอุปกรณ์ที่เหมาะกับชั้นนี้</p>
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">
        นี่เป็นเพียงการประเมินจากสภาพปัจจุบัน ผลจริงยังขึ้นอยู่กับ Trait ความทรงจำ และการกระทำของเทพ ข้อมูลอาจไม่ถูกต้องเสมอไป หอคอยมักบิดเบือนความจริงของผู้ที่พยายามเข้าใจมัน
      </p>
      <BalanceDebugPanel
        rows={[
          { label: "โอกาสสำเร็จ", value: `${estimate.chance}%` },
          { label: "โอกาสดิบ", value: estimate.rawChance },
          { label: "ฐาน", value: estimate.baseChance },
          { label: "ความยากชั้น", value: estimate.difficulty },
          { label: "คะแนน stat หลัก", value: estimate.relevantStatScore },
          { label: "โทษหอคอย", value: estimate.towerPressurePenalty },
          { label: "โบนัสเทพ", value: estimate.divineBonus },
          { label: "โบนัสข้อมูล", value: estimate.intelBonus },
          { label: "โบนัสอุปกรณ์", value: estimate.preparationBonus },
        ]}
      />
    </section>
  );
}

function getIntelPreviewText(intel: FloorIntel) {
  if (intel.reliability === "trusted") return "ข้อมูลน่าเชื่อถือ: เพิ่มโอกาสผ่าน และลดความเสี่ยงบาดเจ็บ";
  if (intel.reliability === "partial") return "ข้อมูลบางส่วน: ช่วยให้เข้าใจชั้นถัดไปมากขึ้นเล็กน้อย";
  if (intel.reliability === "rumor") return "ข่าวลือคลุมเครือ: อาจช่วยตีความสถานการณ์ แต่ไม่รับประกันผล";
  if (intel.reliability === "false") return "ข้อมูลที่ได้มา: ฟังดูน่าเชื่อถือ แต่ยังไม่มีใครยืนยันได้";
  return "ข้อมูลอันตราย: ข่าวนี้มาพร้อมราคาที่ควรระวัง";
}

function PreviewRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="grid gap-1 border border-white/10 bg-ash-900/70 p-3 md:grid-cols-[9rem_1fr]">
      <span className="text-stone-500">{label}</span>
      <span className="text-stone-200">{value}</span>
    </div>
  );
}
