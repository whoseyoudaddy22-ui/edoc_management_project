import type { Metadata } from "next";
import { Geist_Mono, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

// ฟอนต์ UI ทั้งระบบ (ดู .claude/skills/ui-design-system) — ฟอนต์เอกสารคือ TH Sarabun New ใน globals.css
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบบริหารจัดการการสร้างและจัดเก็บแฟ้มเอกสารอิเล็กทรอนิกส์",
  description: "Electronic Document Creation and Archiving Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
