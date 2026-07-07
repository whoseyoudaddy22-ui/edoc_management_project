// ป้องกัน Open Redirect (CWE-601): callbackUrl มาจาก query param ที่ผู้ใช้ควบคุมได้เอง
// การเช็คแค่ `startsWith("/")` ไม่พอ เพราะ "//evil.com" หรือ "/\evil.com" ก็ขึ้นต้นด้วย "/"
// เหมือนกัน แต่เบราว์เซอร์/Next.js router ตีความ "//" หรือ "/\" นำหน้าเป็น protocol-relative URL
// แล้วพาไปโดเมนอื่นได้ทันทีหลัง login สำเร็จ จึงต้องกันรูปแบบนี้โดยเฉพาะ ไม่ใช่แค่ตรวจตัวอักษรแรก
const SAFE_RELATIVE_PATH = /^\/(?!\/|\\)/;

export function getSafeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!callbackUrl || !SAFE_RELATIVE_PATH.test(callbackUrl)) {
    return fallback;
  }
  return callbackUrl;
}
