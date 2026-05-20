import type { ClassSkill } from "../types/game";

export const classSkills: ClassSkill[] = [
  { id: "fighter-opening-tempo", classId: "fighter", nameTh: "จังหวะเปิดศึก", descriptionTh: "ชั้นต่อสู้มีโอกาสผ่านเพิ่มขึ้นเล็กน้อย", unlockFloor: 3 },
  { id: "fighter-stand-wounded", classId: "fighter", nameTh: "ยืนหยัดแม้เจ็บ", descriptionTh: "ผลเสียจากอาการบาดเจ็บลดลงเล็กน้อย", unlockFloor: 6 },
  { id: "fighter-last-clash", classId: "fighter", nameTh: "แรงปะทะสุดท้าย", descriptionTh: "เมื่อสภาพวิกฤต การฝืนปะทะมีแรงส่งมากขึ้น", unlockFloor: 10 },

  { id: "guard-last-shield", classId: "guard", nameTh: "โล่สุดท้าย", descriptionTh: "ลดอาการบาดเจ็บจากความล้มเหลวรุนแรงเล็กน้อย", unlockFloor: 3 },
  { id: "guard-breathe-behind-shield", classId: "guard", nameTh: "หายใจหลังโล่", descriptionTh: "การพักฟื้นลดความเหนื่อยล้าได้ดีขึ้นเล็กน้อย", unlockFloor: 6 },
  { id: "guard-hold-line", classId: "guard", nameTh: "ไม่ถอยจากแนวรับ", descriptionTh: "การตั้งรับลดความเสียหายจากหอคอยได้มากขึ้น", unlockFloor: 10 },

  { id: "scout-read-tracks", classId: "scout", nameTh: "อ่านร่องรอย", descriptionTh: "การสืบข่าวมีโอกาสเจอผลร้ายลดลงเล็กน้อย", unlockFloor: 3 },
  { id: "scout-remember-route", classId: "scout", nameTh: "จำทางได้", descriptionTh: "การกลับไปยังชั้นก่อนหน้าเหนื่อยน้อยลง", unlockFloor: 6 },
  { id: "scout-second-exit", classId: "scout", nameTh: "ทางออกที่สอง", descriptionTh: "ชั้นกับดักและความมืดมีทางรอดมากขึ้น", unlockFloor: 10 },

  { id: "hunter-rough-snare", classId: "hunter", nameTh: "กับดักหยาบ", descriptionTh: "ลดความเสี่ยงบาดเจ็บในชั้นต่อสู้", unlockFloor: 3 },
  { id: "hunter-breath", classId: "hunter", nameTh: "ลมหายใจนักล่า", descriptionTh: "ชั้นเอาตัวรอดมีโอกาสผ่านเพิ่มขึ้น", unlockFloor: 6 },
  { id: "hunter-patient-kill", classId: "hunter", nameTh: "รอจังหวะสังหาร", descriptionTh: "การวางกับดักมีผลดีขึ้นในชั้นอันตราย", unlockFloor: 10 },

  { id: "acolyte-inner-light", classId: "acolyte", nameTh: "แสงในใจ", descriptionTh: "พรแห่งเทพช่วยฟื้นขวัญกำลังใจเมื่อผ่านชั้น", unlockFloor: 3 },
  { id: "acolyte-silent-prayer", classId: "acolyte", nameTh: "คำภาวนาเงียบ", descriptionTh: "ความเงียบที่สำเร็จเพิ่มศรัทธาเล็กน้อย", unlockFloor: 6 },
  { id: "acolyte-warm-omen", classId: "acolyte", nameTh: "ลางที่อบอุ่น", descriptionTh: "ลางบอกเหตุลดขวัญกำลังใจน้อยลง", unlockFloor: 10 },

  { id: "scholar-think-before-step", classId: "scholar", nameTh: "คิดก่อนก้าว", descriptionTh: "ชั้นปริศนามีโอกาสผ่านเพิ่มขึ้น", unlockFloor: 3 },
  { id: "scholar-pattern-memory", classId: "scholar", nameTh: "จดจำรูปแบบ", descriptionTh: "ผลเสียจากข้อมูลปลอมลดลงเล็กน้อย", unlockFloor: 6 },
  { id: "scholar-cold-logic", classId: "scholar", nameTh: "เหตุผลเย็นเฉียบ", descriptionTh: "การวิเคราะห์กลไกมีผลดีขึ้นในชั้นที่เหมาะสม", unlockFloor: 10 },

  { id: "tinker-emergency-repair", classId: "tinker", nameTh: "ซ่อมฉุกเฉิน", descriptionTh: "หลังล้มเหลวในหอคอย อาการบาดเจ็บลดลงเล็กน้อย", unlockFloor: 3 },
  { id: "tinker-efficient-use", classId: "tinker", nameTh: "ใช้ของคุ้มค่า", descriptionTh: "การใช้อาหารลดความหิวได้มากขึ้นเล็กน้อย", unlockFloor: 6 },
  { id: "tinker-hidden-spring", classId: "tinker", nameTh: "สปริงซ่อนแรง", descriptionTh: "อุปกรณ์เตรียมขึ้นหอคอยให้ผลดีขึ้น", unlockFloor: 10 },

  { id: "rogue-shadow-gate", classId: "rogue", nameTh: "เงาใต้ประตู", descriptionTh: "ลดความเสี่ยงบาดเจ็บจากชั้นกับดัก", unlockFloor: 3 },
  { id: "rogue-quick-hand", classId: "rogue", nameTh: "มือไว", descriptionTh: "ความเสียหายจากการถูกปล้นหรือแลกเปลี่ยนไม่เต็มใจลดลง", unlockFloor: 6 },
  { id: "rogue-vanish-line", classId: "rogue", nameTh: "หายไปจากเส้นทาง", descriptionTh: "การลอบผ่านลดความเสี่ยงบาดเจ็บมากขึ้น", unlockFloor: 10 },
];
