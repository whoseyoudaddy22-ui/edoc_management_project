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
