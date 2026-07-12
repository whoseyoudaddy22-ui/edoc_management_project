"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sidebar, SidebarContent } from "@/components/shared/sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Role } from "@/generated/prisma/enums";

export function DashboardShell({
  user,
  children,
}: {
  user: { name: string; role: Role };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <Sidebar user={user} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="เปิดเมนู"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full ring-2 ring-accent-gold/70">
            <Image
              src="/logo/plvc.png"
              alt="ตราวิทยาลัย"
              width={32}
              height={32}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="truncate text-sm font-semibold text-sidebar-foreground">ระบบจัดเก็บเอกสาร</p>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-64 max-w-64 border-none bg-sidebar p-0 text-sidebar-foreground sm:max-w-64"
        >
          <SheetTitle className="sr-only">เมนูนำทาง</SheetTitle>
          <SidebarContent user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
