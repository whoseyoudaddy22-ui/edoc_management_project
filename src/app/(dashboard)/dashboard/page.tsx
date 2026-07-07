import { FileText, Clock, CheckCircle2, Paperclip } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DocumentTypeBreakdownChart } from "@/components/shared/document-type-breakdown-chart";
import { getDashboardStats } from "@/lib/dashboard-stats";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const SUMMARY_CARD_STYLE = {
  total: "bg-primary/10 text-primary",
  pending: "bg-status-pending-bg text-status-pending-fg",
  approved: "bg-status-approved-bg text-status-approved-fg",
  attachment: "bg-status-external-bg text-status-external-fg",
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
      <h1 className="text-xl font-semibold text-foreground">แดชบอร์ด</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.key} className="border border-gray-200 shadow-sm">
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{card.value}</p>
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
              <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีเอกสารในระบบ</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-medium text-muted-foreground uppercase">
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
                        <td className="py-3 pr-4 whitespace-nowrap text-foreground">
                          {doc.documentNumber}
                        </td>
                        <td className="py-3 pr-4 max-w-xs truncate text-foreground">{doc.title}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{doc.documentType.name}</td>
                        <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
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
              <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
            ) : (
              <DocumentTypeBreakdownChart data={stats.documentTypeBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
