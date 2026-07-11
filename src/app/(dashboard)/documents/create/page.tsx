import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DocumentCreateForm } from "@/components/shared/document-create-form";

export default async function CreateDocumentPage() {
  const [documentTypes, session] = await Promise.all([
    prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, layout: true },
    }),
    auth(),
  ]);

  const currentUser = session?.user;

  if (!currentUser || !currentUser.departmentCode) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold text-gray-900">สร้างเอกสาร</h1>
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          ยังไม่มีผู้ใช้งานที่พร้อมสร้างเอกสาร (ต้องมีผู้ใช้ที่เปิดใช้งานและกำหนดรหัสหน่วยงานแล้ว)
          กรุณาเพิ่มผู้ใช้ในระบบก่อน
        </p>
      </div>
    );
  }

  return <DocumentCreateForm documentTypes={documentTypes} />;
}
