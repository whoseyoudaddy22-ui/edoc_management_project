import Link from "next/link";

export type DocumentTypeBreakdownItem = {
  documentTypeId: string;
  documentTypeCode: string;
  name: string;
  count: number;
  percentage: number;
};

export function DocumentTypeBreakdownChart({
  data,
}: {
  data: DocumentTypeBreakdownItem[];
}) {
  const maxCount = Math.max(...data.map((item) => item.count), 1);

  return (
    <div className="flex flex-col gap-4">
      {data.map((item) => (
        <Link
          key={item.documentTypeId}
          href={item.documentTypeCode ? `/documents?type=${item.documentTypeCode}` : "/documents"}
          className="group -mx-1.5 flex flex-col gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-gray-50"
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
              {item.name}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {item.count.toLocaleString()} รายการ ({item.percentage}%)
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out group-hover:bg-primary/80"
              style={{ width: `${Math.max((item.count / maxCount) * 100, 4)}%` }}
            />
          </div>
        </Link>
      ))}
    </div>
  );
}
