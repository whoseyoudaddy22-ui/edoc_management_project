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
