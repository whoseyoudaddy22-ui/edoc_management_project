"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Pencil,
  UserX,
  ChevronLeft,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleBadge, ActiveStatusBadge } from "@/components/shared/role-badge";
import { ROLE_LABELS } from "@/lib/labels";
import { Role } from "@/generated/prisma/enums";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentCode: string | null;
  isActive: boolean;
};

const ROLE_FILTER_OPTIONS = Object.values(Role);

export function UsersTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [role, activeFilter]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchUsers() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (role !== "all") params.set("role", role);
      if (activeFilter !== "all") params.set("isActive", activeFilter);

      try {
        const response = await fetch(`/api/users?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok) {
          setError(body?.error ?? "ไม่สามารถโหลดรายชื่อผู้ใช้ได้");
          return;
        }

        setUsers(body.data);
        setTotalPages(body.pagination.totalPages || 1);
        setTotal(body.pagination.total);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchUsers();
    return () => controller.abort();
  }, [debouncedSearch, role, activeFilter, page]);

  async function handleDeactivate(id: string, name: string) {
    if (!window.confirm(`ยืนยันการปิดใช้งานบัญชี "${name}"?`)) return;

    setUpdatingId(id);
    try {
      const response = await fetch(`/api/users/${id}/deactivate`, { method: "PATCH" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error ?? "ไม่สามารถปิดใช้งานบัญชีได้");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">จัดการผู้ใช้งาน</h1>
        <Button nativeButton={false} render={<Link href="/users/create" />}>
          <UserPlus className="h-4 w-4" />
          เพิ่มผู้ใช้งาน
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ หรือ อีเมล"
                className="pl-9"
              />
            </div>

            <Select value={role} onValueChange={(value) => value && setRole(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="สิทธิ์การใช้งาน">
                  {(value: string | null) =>
                    value === "all" || !value ? "ทุกสิทธิ์" : ROLE_LABELS[value as Role]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสิทธิ์</SelectItem>
                {ROLE_FILTER_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {ROLE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={activeFilter} onValueChange={(value) => value && setActiveFilter(value)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="สถานะ">
                  {(value: string | null) =>
                    value === "all" || !value
                      ? "ทุกสถานะ"
                      : value === "true"
                        ? "ใช้งาน"
                        : "ปิดใช้งาน"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="true">ใช้งาน</SelectItem>
                <SelectItem value="false">ปิดใช้งาน</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                  <th className="py-2 pr-4">ชื่อ</th>
                  <th className="py-2 pr-4">อีเมล</th>
                  <th className="py-2 pr-4">หน่วยงาน</th>
                  <th className="py-2 pr-4">สิทธิ์</th>
                  <th className="py-2 pr-4">สถานะ</th>
                  <th className="py-2 pl-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                      ไม่พบผู้ใช้งานที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4 whitespace-nowrap text-gray-900">{user.name}</td>
                      <td className="py-3 pr-4 text-gray-600">{user.email}</td>
                      <td className="py-3 pr-4 text-gray-600">{user.departmentCode ?? "-"}</td>
                      <td className="py-3 pr-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="py-3 pr-4">
                        <ActiveStatusBadge isActive={user.isActive} />
                      </td>
                      <td className="py-3 pl-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="แก้ไขผู้ใช้งาน"
                            nativeButton={false}
                            render={<Link href={`/users/${user.id}/edit`} />}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            title="ปิดใช้งานบัญชี"
                            disabled={!user.isActive || updatingId === user.id}
                            onClick={() => handleDeactivate(user.id, user.name)}
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-600">
            <p>
              ทั้งหมด {total} รายการ · หน้า {page} จาก {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
