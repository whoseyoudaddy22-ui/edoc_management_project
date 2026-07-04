import { prisma } from "@/lib/prisma";
import { UploadForm } from "@/components/shared/upload-form";

export default async function UploadPage() {
  const [documents, currentUser] = await Promise.all([
    prisma.document.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, documentNumber: true, title: true },
    }),
    prisma.user.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  if (!currentUser) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-gray-900">อัปโหลดไฟล์</h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ยังไม่มีผู้ใช้งานที่พร้อมอัปโหลดไฟล์ กรุณาเพิ่มผู้ใช้ในระบบก่อน
        </p>
      </div>
    );
  }

  return <UploadForm documents={documents} currentUserId={currentUser.id} />;
}
