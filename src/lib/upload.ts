export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".jpg",
  ".jpeg",
  ".png",
  ".txt",
  ".csv",
  ".pptx",
] as const;

// สำหรับแสดงผลใน UI ตาม mockup (จัดกลุ่ม .jpg/.png เป็นรายการเดียว)
export const ALLOWED_FILE_EXTENSIONS_DISPLAY = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".jpg/.png",
  ".txt",
  ".csv",
  ".pptx",
];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB ต่อไฟล์

export function getFileExtension(fileName: string): string {
  const index = fileName.lastIndexOf(".");
  return index === -1 ? "" : fileName.slice(index).toLowerCase();
}

export function isAllowedFileExtension(fileName: string): boolean {
  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(getFileExtension(fileName));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ตรวจ magic bytes (content-based) เสริมจากการเช็คนามสกุลไฟล์ เพื่อกันไฟล์ที่ถูกเปลี่ยนนามสกุล
// ปลอมเป็นประเภทที่อนุญาต (เช่น เปลี่ยน .exe เป็น .pdf) — server-side เท่านั้น ใช้ Buffer ของ Node.js
// .txt/.csv ไม่มี magic number ที่แน่นอน (เป็น plain text ล้วน) จึงไม่เช็ค content ของสองนามสกุลนี้

function isZipSignature(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);
}

const FILE_SIGNATURE_CHECKS: Partial<Record<(typeof ALLOWED_FILE_EXTENSIONS)[number], (buffer: Buffer) => boolean>> = {
  ".pdf": (buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-",
  ".jpg": (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  ".jpeg": (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  ".png": (buffer) =>
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ".docx": isZipSignature,
  ".xlsx": isZipSignature,
  ".pptx": isZipSignature,
};

export function matchesDeclaredFileType(buffer: Buffer, extension: string): boolean {
  const checker = FILE_SIGNATURE_CHECKS[extension as (typeof ALLOWED_FILE_EXTENSIONS)[number]];
  if (!checker) return true;
  return checker(buffer);
}

// เช็คลายเซ็นของไฟล์ execute ได้ทุกนามสกุล (แม้แต่ .txt/.csv) กันไฟล์ประเภทนี้แอบอ้างเป็นข้อความล้วน
const DANGEROUS_SIGNATURES: ((buffer: Buffer) => boolean)[] = [
  (buffer) => buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a, // Windows PE/EXE ("MZ")
  (buffer) => buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46, // Linux ELF (0x7F E L F)
  (buffer) => buffer.length >= 2 && buffer[0] === 0x23 && buffer[1] === 0x21, // shebang script ("#!")
];

export function isDangerousFileContent(buffer: Buffer): boolean {
  return DANGEROUS_SIGNATURES.some((check) => check(buffer));
}

const MAX_DISPLAY_FILE_NAME_LENGTH = 255;

// ชื่อไฟล์ต้นฉบับที่ผู้ใช้อัปโหลด (Attachment.fileName) ใช้แค่แสดงผล ไม่เคยถูกใช้เป็น path จริงบนดิสก์
// (ไฟล์จริงถูกเขียนด้วยชื่อจาก randomUUID() เสมอ ดู route.ts) แต่ก็ยัง sanitize ก่อนเก็บ DB เพื่อกัน
// control character / bidi override character (ใช้หลอกนามสกุลไฟล์ เช่น RTLO spoofing) และจำกัดความยาว
// ไม่ให้ค่าที่แปลกประหลาดหลุดเข้าไปอยู่ใน DB/Audit Log แบบดิบๆ (จากรายงาน security testing 2026-07-11)
// รายการ Unicode code point (เลขฐาน 16 ล้วน ไม่มีอักขระพิเศษฝังในซอร์สไฟล์นี้เลย) ที่ตัดทิ้งจากชื่อไฟล์:
// 0x200e/0x200f = LEFT/RIGHT-TO-LEFT MARK, 0x202a-0x202e = LRE/RLE/PDF/LRO/RLO,
// 0x2066-0x2069 = LRI/RLI/FSI/PDI — กลุ่ม LRO/RLO คือมุก "RTLO spoofing" ที่ทำให้ชื่อไฟล์
// ที่อัปโหลดจริงเป็นนามสกุลอันตราย แสดงผลกลับด้านเป็นนามสกุลที่ดูปลอดภัยแทน
const BIDI_OVERRIDE_CODE_POINTS = new Set<number>([
  0x200e, 0x200f, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069,
]);

function isControlOrBidiChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return code <= 0x1f || code === 0x7f || BIDI_OVERRIDE_CODE_POINTS.has(code);
}

export function sanitizeFileName(fileName: string): string {
  const withoutControlChars = Array.from(fileName)
    .filter((char) => !isControlOrBidiChar(char))
    .join("");
  const trimmed = withoutControlChars.trim();
  return trimmed.slice(0, MAX_DISPLAY_FILE_NAME_LENGTH) || "unnamed";
}
