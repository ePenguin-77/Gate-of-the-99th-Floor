import type { EncounterChoicePreview, RareEncounterChoice } from "../../types/game";

type EncounterChoiceTone = RareEncounterChoice["outcomeType"] | "neutral";

interface EncounterChoiceCardProps {
  labelTh: string;
  descriptionTh: string;
  preview?: EncounterChoicePreview;
  riskTh?: string;
  outcomeType?: EncounterChoiceTone;
  onChoose: () => void;
}

const outcomeStyles: Record<EncounterChoiceTone, string> = {
  safe: "border-stone-300/20 bg-stone-200/5 text-stone-300",
  reward: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
  risk: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  mixed: "border-sky-300/30 bg-sky-300/10 text-sky-100",
  dangerous: "border-red-300/30 bg-red-400/10 text-red-100",
  neutral: "border-white/10 bg-white/5 text-stone-300",
};

const outcomeLabels: Record<EncounterChoiceTone, string> = {
  safe: "ปลอดภัยกว่า",
  reward: "อาจได้ประโยชน์",
  risk: "มีความเสี่ยง",
  mixed: "ผลลัพธ์ไม่แน่นอน",
  dangerous: "อันตราย",
  neutral: "ขึ้นอยู่กับสถานการณ์",
};

export function EncounterChoiceCard({
  labelTh,
  descriptionTh,
  preview,
  riskTh,
  outcomeType = "neutral",
  onChoose,
}: EncounterChoiceCardProps) {
  const finalPreview = preview ?? getFallbackPreview(labelTh, riskTh, outcomeType);
  const rows = [
    finalPreview.benefitTh ? ["ผลดี", finalPreview.benefitTh] : undefined,
    finalPreview.riskTh || riskTh ? ["ความเสี่ยง", finalPreview.riskTh ?? riskTh] : undefined,
    finalPreview.costTh ? ["ค่าใช้จ่าย", finalPreview.costTh] : undefined,
    finalPreview.chanceTh ? ["โอกาส", finalPreview.chanceTh] : undefined,
    finalPreview.extraTh ? ["หมายเหตุ", finalPreview.extraTh] : undefined,
  ].filter(Boolean) as [string, string][];

  return (
    <button
      type="button"
      onClick={onChoose}
      className="group rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-amber-300/50 hover:bg-amber-300/10 focus:outline-none focus:ring-2 focus:ring-amber-300/50"
      data-audio-id="ui_confirm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-serif text-xl text-stone-50">{labelTh}</p>
          <p className="mt-1 text-sm leading-6 text-stone-400">{descriptionTh}</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs ${outcomeStyles[outcomeType]}`}>
          {outcomeLabels[outcomeType]}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/25 p-3">
          <p className="text-xs font-semibold tracking-wide text-amber-100">ผลที่อาจเกิดขึ้น</p>
          <dl className="mt-2 grid gap-1.5 text-xs leading-5 sm:grid-cols-[auto_1fr]">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="font-semibold text-stone-300">{label}:</dt>
                <dd className="text-stone-400">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </button>
  );
}

function getFallbackPreview(labelTh: string, riskTh?: string, outcomeType?: EncounterChoiceTone): EncounterChoicePreview {
  if (labelTh.includes("จ่ายทอง") || labelTh.includes("ซื้อ")) {
    return {
      benefitTh: "อาจได้รับข้อมูล ไอเทม หรือบริการที่ช่วยให้รอดง่ายขึ้น",
      riskTh: riskTh ?? "สิ่งที่ได้อาจไม่คุ้มราคาหรือมีเงื่อนไขซ่อนอยู่",
      costTh: "ใช้ทอง",
      chanceTh: "ปานกลาง",
    };
  }
  if (labelTh.includes("ปฏิเสธ") || labelTh.includes("ถอย") || labelTh.includes("รีบออก")) {
    return {
      benefitTh: "ไม่เสียทรัพยากรและหลีกเลี่ยงอันตรายทันที",
      riskTh: riskTh ?? "อาจพลาดโอกาส หรือความสัมพันธ์ลดลง",
      costTh: "ไม่มี",
      chanceTh: "ปลอดภัยกว่า",
    };
  }
  if (labelTh.includes("ลางบอกเหตุ")) {
    return {
      benefitTh: "ลดโอกาสถูกหลอก และอาจแยกข่าวจริงออกจากข่าวปลอม",
      riskTh: riskTh ?? "ขวัญกำลังใจอาจลดลงจากภาพลางร้าย",
      costTh: "ใช้การแทรกแซงของเทพ",
      chanceTh: "ดีเมื่อมีความเสี่ยงเรื่องข้อมูลปลอม",
    };
  }
  if (labelTh.includes("เปิดประตู")) {
    return {
      benefitTh: "อาจพบทางลับ ไอเทมหายาก หรือข้อมูลพิเศษ",
      riskTh: riskTh ?? "อาจถูกส่งไปเจออันตรายที่ยังไม่พร้อมรับมือ",
      costTh: "ไม่มีค่าใช้จ่ายตรงๆ แต่เสี่ยงสูง",
      chanceTh: "เสี่ยงมาก",
    };
  }
  if (labelTh.includes("พรแห่งเทพ")) {
    return {
      benefitTh: "เพิ่มโอกาสรอดจากเหตุการณ์ยาก",
      riskTh: riskTh ?? "การพึ่งพาเทพเพิ่มขึ้น",
      costTh: "เพิ่มความผูกพันกับเทพและภาระทางใจ",
      chanceTh: "สูง แต่มีราคาที่ต้องจ่าย",
    };
  }
  if (labelTh.includes("ตัดสินใจเอง")) {
    return {
      benefitTh: "หากสำเร็จ การยืนหยัดด้วยตนเองจะเพิ่มขึ้น",
      riskTh: riskTh ?? "ไม่มีโบนัสช่วยเหลือ และอาจบาดเจ็บหากล้มเหลว",
      costTh: "ไม่มี",
      chanceTh: "เสี่ยง แต่ช่วยให้เติบโต",
    };
  }
  return {
    benefitTh: outcomeType === "safe" ? "ช่วยลดความเสี่ยงเฉพาะหน้า" : "อาจเปิดผลลัพธ์ที่เป็นประโยชน์",
    riskTh: riskTh ?? "ผลลัพธ์จริงยังไม่แน่นอน",
    costTh: "ขึ้นอยู่กับเหตุการณ์",
    chanceTh: outcomeType === "dangerous" ? "เสี่ยงมาก" : outcomeType === "safe" ? "ปลอดภัยกว่า" : "ไม่แน่นอน",
  };
}
