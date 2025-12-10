"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DateDisplay } from "@/components/ui/date-display";
import {
  MagnifyingGlass,
  CaretLeft,
  CaretRight,
  ShieldCheck,
  CaretUp,
  CaretDown,
} from "@phosphor-icons/react";
import { searchUsers } from "@/app/actions/admin";

interface UserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  is_admin: boolean;
}

type SortField = "created_at" | "username" | "display_name";

export function UserTable({
  initialUsers,
  initialTotal,
}: {
  initialUsers: UserRow[];
  initialTotal: number;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(
    (params: {
      query?: string;
      page?: number;
      pageSize?: number;
      sortBy?: SortField;
      sortDir?: "asc" | "desc";
    }) => {
      startTransition(async () => {
        const result = await searchUsers(params);
        if (!result.error) {
          setUsers(result.data);
          setTotal(result.total);
        }
      });
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers({ query, page: 1, pageSize, sortBy, sortDir });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchUsers, pageSize, sortBy, sortDir]);

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchUsers({ query, page: p, pageSize, sortBy, sortDir });
  };

  const handleSort = (field: SortField) => {
    const dir = sortBy === field && sortDir === "desc" ? "asc" : "desc";
    setSortBy(field);
    setSortDir(dir);
  };

  const totalPages = Math.ceil(total / pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return null;
    return sortDir === "desc" ? (
      <CaretDown className="w-3 h-3 ml-0.5 inline" weight="bold" />
    ) : (
      <CaretUp className="w-3 h-3 ml-0.5 inline" weight="bold" />
    );
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          All Users
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <Input
              placeholder="Search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-7 text-xs w-40"
            />
          </div>
          <Select
            value={String(pageSize)}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="h-7 w-16 text-[10px]"
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="py-2 pr-4 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <button
                  onClick={() => handleSort("display_name")}
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  User <SortIcon field="display_name" />
                </button>
              </th>
              <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <button
                  onClick={() => handleSort("username")}
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Username <SortIcon field="username" />
                </button>
              </th>
              <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] hidden md:table-cell">
                Email
              </th>
              <th className="py-2 px-4 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                <button
                  onClick={() => handleSort("created_at")}
                  className="hover:text-[var(--text-primary)] transition-colors"
                >
                  Joined <SortIcon field="created_at" />
                </button>
              </th>
              <th className="py-2 pl-4 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] w-16">
                Role
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-[var(--text-muted)]">
                  {query ? "No matches" : "No users"}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[var(--border)]/30 hover:bg-[var(--surface-1)]/50 transition-colors"
                >
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--surface-3)] flex items-center justify-center shrink-0 text-[10px] font-medium text-[var(--text-secondary)]">
                        {user.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="font-medium text-[var(--text-primary)] truncate max-w-[160px]">
                        {user.display_name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-[var(--text-muted)]">@{user.username}</td>
                  <td className="py-2 px-4 text-[var(--text-muted)] hidden md:table-cell">
                    <span className="truncate max-w-[200px] block">{user.email}</span>
                  </td>
                  <td className="py-2 px-4 text-[var(--text-muted)] tabular-nums">
                    <DateDisplay date={user.created_at} format="relative" />
                  </td>
                  <td className="py-2 pl-4 text-right">
                    {user.is_admin && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[var(--primary)]">
                        <ShieldCheck className="w-3 h-3" weight="fill" /> Admin
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]/40 mt-0">
        <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
          {total > 0 ? `${from}–${to} of ${total}` : "No results"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || isPending}
            className="h-6 w-6 p-0"
          >
            <CaretLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] text-[var(--text-muted)] px-1 tabular-nums">
            {page}/{totalPages || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || isPending}
            className="h-6 w-6 p-0"
          >
            <CaretRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
