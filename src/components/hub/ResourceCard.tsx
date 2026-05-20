import { HelpTooltip } from "../ui/HelpTooltip";

type ResourceTone = "gold" | "food" | "soul" | "debt" | "default";

interface ResourceCardProps {
  label: string;
  value: number | string;
  helpTitle?: string;
  helpText?: string;
  helpNote?: string;
  tone?: ResourceTone;
}

const toneClasses: Record<ResourceTone, string> = {
  gold: "from-amber-300/10 to-white/[0.03] text-amber-200",
  food: "from-emerald-300/10 to-white/[0.03] text-emerald-200",
  soul: "from-sky-300/10 to-white/[0.03] text-sky-200",
  debt: "from-red-300/10 to-white/[0.03] text-red-200",
  default: "from-white/[0.06] to-white/[0.03] text-ember-200",
};

export const resourceHelp = {
  gold: {
    title: "ทอง",
    text: "ใช้ซื้ออาหาร ยา ผ้าพันแผล อุปกรณ์ และบริการในเมืองพักพิง เช่น พักโรงเตี๊ยม ฝึกกับครูฝึก หรือเตรียมอุปกรณ์ก่อนขึ้นหอคอย",
    note: "ทองช่วยซื้อความปลอดภัยได้ แต่ถ้าใช้ผิดจังหวะ อาจไม่มีเหลือเมื่อต้องการจริงๆ",
  },
  food: {
    title: "อาหาร",
    text: "ใช้ประทังชีวิตและลดความหิว ผู้หลงทางที่ไม่มีอาหารจะฟื้นตัวจากการพักได้แย่ลง และความหิวอาจกลายเป็นอันตรายถึงชีวิต",
    note: "อาหารพื้นฐานใช้ต่างจากไอเทมอาหารในกระเป๋า ถ้ามีระบบไอเทมอยู่แล้ว ให้ถือว่าอาหารตรงนี้คือเสบียงทั่วไป",
  },
  souls: {
    title: "วิญญาณที่สูญหาย",
    text: "จำนวนผู้หลงทางที่เสียชีวิตระหว่างอยู่ภายใต้การดูแลของเทพ ค่านี้สะท้อนความล้มเหลวในอดีต และอาจส่งผลต่อเหตุการณ์บางอย่างในหอคอยหรือเมืองพักพิง",
    note: "บางครั้งเงาของผู้ที่ไม่กลับบ้านอาจยังปรากฏในเหตุการณ์ผิดปกติ",
  },
  debt: {
    title: "ตราหนี้ชีวิต",
    text: "ร่องรอยที่เทพได้รับเมื่อผู้หลงทางตาย มันไม่ใช่เพียงตัวเลข แต่เป็นภาระที่ติดตามผู้เล่นข้ามการเริ่มต้นใหม่",
    note: "ตราหนี้ชีวิตอาจทำให้ผู้หลงทางคนใหม่เริ่มต้นด้วยความหวังหรือศรัทธาที่สั่นคลอนเล็กน้อย แต่บางเหตุการณ์อาจเปิดโอกาสให้ไถ่คืนได้",
  },
};

export function ResourceCard({ label, value, helpTitle, helpText, helpNote, tone = "default" }: ResourceCardProps) {
  return (
    <div className={`relative rounded-xl border border-white/10 bg-gradient-to-br ${toneClasses[tone]} px-3 py-2.5 pr-8 shadow-inner shadow-black/10`}>
      {helpTitle && helpText ? (
        <div className="absolute right-2 top-2">
          <HelpTooltip title={helpTitle} text={helpText} note={helpNote} ariaLabel={`อธิบาย${label}`} />
        </div>
      ) : null}
      <p className="text-[0.7rem] leading-4 text-stone-500">{label}</p>
      <p className="mt-1 font-serif text-xl">{value}</p>
    </div>
  );
}
