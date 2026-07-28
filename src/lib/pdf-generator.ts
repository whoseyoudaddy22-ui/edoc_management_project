import fs from "node:fs";
import puppeteer from "puppeteer-core";

// puppeteer-core ไม่ได้แถม Chromium มาด้วย (ต่างจาก puppeteer เต็มรูปแบบ) ต้องชี้ไปยัง
// browser ที่มีอยู่แล้วในเครื่อง/container เอง — ประหยัดขนาด image และเวลา build มาก
// เพราะไม่ต้องดาวน์โหลด Chromium ซ้ำ (production image ใช้ chromium ที่ apk add ไว้ใน Dockerfile)
const CANDIDATE_EXECUTABLE_PATHS = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter((path): path is string => Boolean(path));

function resolveExecutablePath(): string {
  const found = CANDIDATE_EXECUTABLE_PATHS.find((path) => fs.existsSync(path));
  if (!found) {
    throw new Error(
      "ไม่พบ Chromium/Chrome สำหรับสร้าง PDF — ตั้งค่า PUPPETEER_EXECUTABLE_PATH ให้ชี้ไปยัง browser ที่ติดตั้งไว้"
    );
  }
  return found;
}

export async function renderDocumentPdf({
  printUrl,
  cookieHeader,
}: {
  printUrl: string;
  cookieHeader: string | null;
}): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: resolveExecutablePath(),
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    // Puppeteer's default viewport (800x600) falls below the app's `lg` breakpoint (1024px),
    // which triggers the mobile-only topbar (see dashboard-shell.tsx) to render into the PDF
    // and reflows the page into a narrow single-column layout that overflows onto a blank
    // second page. Force a desktop-width viewport so the export matches what @media print
    // was actually designed against.
    await page.setViewport({ width: 1280, height: 900 });
    if (cookieHeader) {
      // ส่ง session cookie เดิมของผู้ใช้ต่อไปยัง headless browser เพื่อให้เข้าหน้า
      // /documents/[id]/print (ซึ่งต้อง login) ได้เหมือนเป็นคำขอเดียวกัน
      await page.setExtraHTTPHeaders({ cookie: cookieHeader });
    }
    await page.goto(printUrl, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
