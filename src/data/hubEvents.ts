import type { HubEventDefinition } from "../types/game";

export const hubEvents: HubEventDefinition[] = [
  {
    id: "rumor-broker-offer",
    titleTh: "คนขายข่าวยื่นข้อเสนอ",
    descriptionTh: "คนขายข่าวยื่นกระดาษพับเล็กๆ ให้โดยไม่บอกราคา ข่าวบางอย่างอาจช่วยชีวิต และบางอย่างอาจพาไปตายเร็วขึ้น",
    trigger: "always",
    npcId: "rumor-broker",
    choices: [
      {
        id: "pay",
        labelTh: "จ่ายทองเพื่อฟัง",
        descriptionTh: "เสียทองเล็กน้อย มีโอกาสได้ข้อมูลชั้นถัดไป",
        resolveKey: "pay",
        preview: {
          benefitTh: "อาจได้รับข้อมูลชั้นถัดไป",
          riskTh: "ข้อมูลอาจไม่ถูกต้อง หรืออาจเป็นเพียงข่าวลือ",
          costTh: "ใช้ทอง",
          chanceTh: "ปานกลาง",
        },
      },
      {
        id: "refuse",
        labelTh: "ปฏิเสธ",
        descriptionTh: "ไม่เสียอะไร แต่ความสัมพันธ์อาจเย็นลง",
        resolveKey: "refuse",
        preview: {
          benefitTh: "ไม่เสียทรัพยากร",
          riskTh: "อาจพลาดโอกาส หรือความสัมพันธ์ลดลง",
          costTh: "ไม่มี",
          chanceTh: "ปลอดภัย",
        },
      },
      {
        id: "omen",
        labelTh: "ใช้ลางบอกเหตุเพื่อตรวจสอบ",
        descriptionTh: "เสี่ยงขวัญกำลังใจลด แต่ลดโอกาสโดนหลอก",
        resolveKey: "omen",
        preview: {
          benefitTh: "ลดโอกาสถูกหลอก และอาจแยกข่าวจริงออกจากข่าวปลอม",
          riskTh: "ขวัญกำลังใจอาจลดลงจากภาพลางร้าย",
          costTh: "ใช้การแทรกแซงของเทพ",
          chanceTh: "ดีเมื่อมีความเสี่ยงเรื่องข้อมูลปลอม",
        },
      },
    ],
  },
  {
    id: "doctor-before-too-late",
    titleTh: "หมอเสนอรักษาก่อนจะสาย",
    descriptionTh: "หมอไร้ใบอนุญาตยืนรอในตรอก เขาพูดเพียงว่า แผลบางอย่างถ้าปล่อยไว้ มันจะเริ่มตัดสินใจแทนเจ้าของร่าง",
    trigger: "wounded",
    npcId: "back-alley-doctor",
    choices: [
      { id: "pay", labelTh: "จ่ายทองรักษา", descriptionTh: "ลดอาการบาดเจ็บหรือป่วย และเพิ่มความสัมพันธ์" },
      { id: "haggle", labelTh: "ต่อรอง", descriptionTh: "อาจถูกลง แต่อาจทำให้หมอไม่พอใจ" },
      { id: "refuse", labelTh: "ปฏิเสธ", descriptionTh: "ประหยัดทอง แต่ขวัญกำลังใจลดลงเล็กน้อย" },
    ],
  },
  {
    id: "bell-child-food",
    titleTh: "เด็กใต้ระฆังแตกแบ่งอาหาร",
    descriptionTh: "เด็กคนนั้นยื่นขนมปังชิ้นเล็กให้ เขาไม่พูดว่าเพราะอะไร แต่สายตาของเขาบอกว่าเขาจำหนี้ชีวิตได้",
    trigger: "childUnlocked",
    npcId: "bell-child",
    choices: [
      { id: "accept", labelTh: "รับอาหาร", descriptionTh: "อาหาร +1 และความหวังเพิ่มเล็กน้อย" },
      { id: "kind-refuse", labelTh: "ปฏิเสธอย่างอ่อนโยน", descriptionTh: "ไม่รับอาหาร แต่ความสัมพันธ์เพิ่ม" },
      { id: "give-gold", labelTh: "แบ่งทองตอบแทน", descriptionTh: "เสียทองเล็กน้อย แต่ความผูกพันเพิ่มมาก" },
    ],
  },
  {
    id: "silent-smith-crack",
    titleTh: "ช่างเงียบพบรอยร้าวบนอุปกรณ์",
    descriptionTh: "ช่างเงียบชี้ไปที่รอยร้าวบนอุปกรณ์โดยไม่พูดอะไร รอยนั้นเล็ก แต่ในหอคอย สิ่งเล็กๆ มักรอแตกในเวลาที่เลวร้ายที่สุด",
    trigger: "always",
    npcId: "silent-smith",
    choices: [
      { id: "repair", labelTh: "จ่ายทองซ่อม", descriptionTh: "ได้ผลเตรียมอุปกรณ์เล็กน้อย" },
      { id: "ignore", labelTh: "ปล่อยไว้ก่อน", descriptionTh: "ไม่เสียทอง แต่ความเสี่ยงยังอยู่" },
      { id: "modify", labelTh: "ขอให้เขาดัดแปลงแทน", descriptionTh: "ได้ผลลดความเสี่ยงบาดเจ็บ แต่เหนื่อยเพิ่ม" },
    ],
  },
  {
    id: "town-talks",
    titleTh: "คนในเมืองเริ่มพูดถึงผู้หลงทาง",
    descriptionTh: "ชื่อของผู้หลงทางเริ่มถูกพูดในตลาด บางคนพูดด้วยความหวัง บางคนพูดเหมือนกำลังรอข่าวร้าย",
    trigger: "floorFive",
    choices: [
      { id: "let-rumor", labelTh: "ปล่อยให้ข่าวลือแพร่ไป", descriptionTh: "ขวัญกำลังใจอาจเพิ่ม แต่หอคอยกดดันขึ้น" },
      { id: "hide", labelTh: "ให้หลบหน้า", descriptionTh: "ลดแรงกดดัน แต่ขวัญกำลังใจอาจลด" },
    ],
  },
  {
    id: "tower-shadow-market",
    titleTh: "เงาจากหอคอยเดินผ่านตลาด",
    descriptionTh: "เงาสูงผิดมนุษย์ลากผ่านตลาดโดยไม่มีใครกล้ามองตรงๆ ความเงียบตามหลังมันเหมือนผ้าคลุมศพ",
    trigger: "pressureHigh",
    choices: [
      { id: "follow", labelTh: "ตามไปดู", descriptionTh: "อาจได้ความทรงจำหรือข้อมูล แต่เสี่ยงขวัญกำลังใจลด" },
      { id: "hide-inn", labelTh: "หนีเข้าโรงเตี๊ยม", descriptionTh: "ลดความกลัวและเพิ่มความสัมพันธ์กับเจ้าของโรงเตี๊ยม" },
      { id: "whisper", labelTh: "ส่งเสียงกระซิบเตือน", descriptionTh: "ลดความเสี่ยง แต่เพิ่มการพึ่งพาเทพ" },
    ],
  },
];
