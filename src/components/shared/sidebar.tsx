"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  UploadCloud,
  Building2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "ภาพรวม",
    items: [{ href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard }],
  },
  {
    label: "เอกสาร",
    items: [
      { href: "/documents/create", label: "สร้างเอกสาร", icon: FilePlus },
      { href: "/documents", label: "เอกสารทั้งหมด", icon: FileText },
      { href: "/upload", label: "อัปโหลดไฟล์", icon: UploadCloud },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-[#1e2a4a] text-gray-200">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2b93b]">
          <Building2 className="h-5 w-5 text-[#1e2a4a]" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">ระบบจัดเก็บเอกสาร</p>
          <p className="text-xs text-gray-400">Digital Archive System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-2 text-xs font-medium tracking-wide text-gray-400 uppercase">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-white/10 font-medium text-white"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
          <User className="h-4 w-4 text-gray-200" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-medium text-white">เจ้าหน้าที่สารบรรณ</p>
          <p className="text-xs text-gray-400">ผู้ปฏิบัติงานเอกสาร</p>
        </div>
      </div>
    </aside>
  );
}
