const THAI_MONTHS_ABBR = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

// รูปแบบ "18 มิ.ย. 2569" ตามระเบียบงานสารบรรณ (วัน เดือนย่อไทย ปี พ.ศ.)
export function formatThaiDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = d.getDate();
  const month = THAI_MONTHS_ABBR[d.getMonth()];
  const buddhistYear = d.getFullYear() + 543;
  return `${day} ${month} ${buddhistYear}`;
}

// รูปแบบ "พฤษภาคม 2569" (เดือนเต็ม+ปี พ.ศ. ไม่มีวัน) เฉพาะเอกสารประเภท "บันทึกข้อความ"
// (ดู .claude/skills/official-document-template/SKILL.md ส่วน "บันทึกข้อความ (variant)")
export function formatThaiMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = THAI_MONTHS_FULL[d.getMonth()];
  const buddhistYear = d.getFullYear() + 543;
  return `${month} ${buddhistYear}`;
}

export function formatThaiDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${formatThaiDate(d)} ${time} น.`;
}
