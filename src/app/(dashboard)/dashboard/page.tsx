import { FileText, Clock, CheckCircle2, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { getDashboardStats } from "@/lib/dashboard-stats";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const SUMMARY_CARD_STYLE = {
  total: "bg-blue-50 text-blue-600",
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-700",
  attachment: "bg-sky-100 text-sky-700",
};

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const summaryCards = [
    {
      key: "total",
      label: "เอกสารทั้งหมด",
      value: stats.totalDocuments,
      icon: FileText,
    },
    {
      key: "pending",
      label: "รอดำเนินการ",
      value: stats.pendingCount,
      icon: Clock,
    },
    {
      key: "approved",
      label: "อนุมัติแล้ว",
      value: stats.approvedCount,
      icon: CheckCircle2,
    },
    {
      key: "attachment",
      label: "ไฟล์แนบ",
      value: stats.attachmentCount,
      icon: Paperclip,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-gray-900">แดชบอร์ด</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="border border-gray-200 shadow-sm">
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${SUMMARY_CARD_STYLE[card.key]}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="border border-gray-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>เอกสารล่าสุด</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentDocuments.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีเอกสารในระบบ</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                      <th className="py-2 pr-4">เลขที่เอกสาร</th>
                      <th className="py-2 pr-4">ชื่อเรื่อง</th>
                      <th className="py-2 pr-4">ประเภท</th>
                      <th className="py-2 pr-4">วันที่</th>
                      <th className="py-2 pr-4">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentDocuments.map((doc) => (
                      <tr key={doc.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-3 pr-4 whitespace-nowrap text-gray-900">
                          {doc.documentNumber}
                        </td>
                        <td className="py-3 pr-4 max-w-xs truncate text-gray-900">{doc.title}</td>
                        <td className="py-3 pr-4 text-gray-600">{doc.documentType.name}</td>
                        <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                          {dateFormatter.format(doc.documentDate)}
                        </td>
                        <td className="py-3 pr-4">
                          <StatusBadge status={doc.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>สัดส่วนแยกตามประเภทเอกสาร</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.documentTypeBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีข้อมูล</p>
            ) : (
              <div className="flex flex-col gap-4">
                {stats.documentTypeBreakdown.map((type) => (
                  <div key={type.documentTypeId}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-gray-900">{type.name}</span>
                      <span className="text-gray-500">
                        {type.count} ({type.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${type.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
