"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL } from "@/components/shared/status-badge";
import { PRIORITY_LABELS } from "@/lib/labels";
import { DocumentStatus, Priority } from "@/generated/prisma/enums";

export type HasAttachmentFilter = "all" | "yes" | "no";

export type AdvancedSearchFilters = {
  documentTypeCodes: string[];
  statuses: DocumentStatus[];
  priorities: Priority[];
  createdByIds: string[];
  departmentCodes: string[];
  dateFrom: string;
  dateTo: string;
  referenceNumber: string;
  hasAttachment: HasAttachmentFilter;
};

export const EMPTY_ADVANCED_FILTERS: AdvancedSearchFilters = {
  documentTypeCodes: [],
  statuses: [],
  priorities: [],
  createdByIds: [],
  departmentCodes: [],
  dateFrom: "",
  dateTo: "",
  referenceNumber: "",
  hasAttachment: "all",
};

type DocumentTypeOption = { code: string; name: string };
type UserOption = { id: string; name: string };

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function AdvancedSearchPanel({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  documentTypes,
  users,
  departmentCodes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: AdvancedSearchFilters;
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  documentTypes: DocumentTypeOption[];
  users: UserOption[];
  departmentCodes: string[];
}) {
  function update<K extends keyof AdvancedSearchFilters>(
    key: K,
    value: AdvancedSearchFilters[K]
  ) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        className="self-start"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        ค้นหาขั้นสูง
      </Button>

      {open && (
        <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label>ประเภทเอกสาร</Label>
            <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-lg border border-gray-200 bg-card p-2">
              {documentTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีประเภทเอกสาร</p>
              ) : (
                documentTypes.map((type) => (
                  <div key={type.code} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${type.code}`}
                      checked={filters.documentTypeCodes.includes(type.code)}
                      onCheckedChange={() =>
                        update(
                          "documentTypeCodes",
                          toggleValue(filters.documentTypeCodes, type.code)
                        )
                      }
                    />
                    <Label htmlFor={`type-${type.code}`} className="text-sm font-normal text-foreground">
                      {type.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>สถานะ</Label>
            <div className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-card p-2">
              {Object.values(DocumentStatus).map((status) => (
                <div key={status} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.statuses.includes(status)}
                    onCheckedChange={() => update("statuses", toggleValue(filters.statuses, status))}
                  />
                  <Label htmlFor={`status-${status}`} className="text-sm font-normal text-foreground">
                    {STATUS_LABEL[status]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>ระดับความเร่งด่วน</Label>
            <div className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-card p-2">
              {Object.values(Priority).map((priority) => (
                <div key={priority} className="flex items-center gap-2">
                  <Checkbox
                    id={`priority-${priority}`}
                    checked={filters.priorities.includes(priority)}
                    onCheckedChange={() =>
                      update("priorities", toggleValue(filters.priorities, priority))
                    }
                  />
                  <Label htmlFor={`priority-${priority}`} className="text-sm font-normal text-foreground">
                    {PRIORITY_LABELS[priority]}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>ผู้สร้างเอกสาร</Label>
            <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-lg border border-gray-200 bg-card p-2">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีผู้ใช้งาน</p>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`creator-${user.id}`}
                      checked={filters.createdByIds.includes(user.id)}
                      onCheckedChange={() =>
                        update("createdByIds", toggleValue(filters.createdByIds, user.id))
                      }
                    />
                    <Label htmlFor={`creator-${user.id}`} className="text-sm font-normal text-foreground">
                      {user.name}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>หน่วยงาน/แผนก</Label>
            <div className="flex max-h-32 flex-col gap-1.5 overflow-y-auto rounded-lg border border-gray-200 bg-card p-2">
              {departmentCodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">ไม่มีข้อมูลหน่วยงาน</p>
              ) : (
                departmentCodes.map((code) => (
                  <div key={code} className="flex items-center gap-2">
                    <Checkbox
                      id={`dept-${code}`}
                      checked={filters.departmentCodes.includes(code)}
                      onCheckedChange={() =>
                        update("departmentCodes", toggleValue(filters.departmentCodes, code))
                      }
                    />
                    <Label htmlFor={`dept-${code}`} className="text-sm font-normal text-foreground">
                      {code}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>ช่วงวันที่สร้าง</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => update("dateFrom", e.target.value)}
              />
              <span className="text-sm text-muted-foreground">ถึง</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => update("dateTo", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>เอกสารอ้างอิง</Label>
            <Input
              value={filters.referenceNumber}
              onChange={(e) => update("referenceNumber", e.target.value)}
              placeholder="ค้นหาเลขที่เอกสารอ้างอิง"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>มีไฟล์แนบหรือไม่</Label>
            <Select
              value={filters.hasAttachment}
              onValueChange={(value) =>
                value && update("hasAttachment", value as HasAttachmentFilter)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="ทั้งหมด">
                  {(value: string | null) =>
                    value === "yes" ? "มีไฟล์แนบ" : value === "no" ? "ไม่มีไฟล์แนบ" : "ทั้งหมด"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="yes">มีไฟล์แนบ</SelectItem>
                <SelectItem value="no">ไม่มีไฟล์แนบ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onFiltersChange(EMPTY_ADVANCED_FILTERS)}
            >
              ล้างเงื่อนไขขั้นสูง
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
