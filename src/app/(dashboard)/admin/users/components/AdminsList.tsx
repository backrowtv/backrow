"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, Plus, Trash, MagnifyingGlass, X } from "@phosphor-icons/react";
import { searchUsers, addSiteAdmin, removeSiteAdmin } from "@/app/actions/admin";

interface AdminRecord {
  user_id: string;
  role: string;
  created_at: string;
  user:
    | {
        id: string;
        display_name: string | null;
        username: string | null;
        email: string;
        avatar_url: string | null;
      }[]
    | {
        id: string;
        display_name: string | null;
        username: string | null;
        email: string;
        avatar_url: string | null;
      }
    | null;
}

interface SearchResult {
  id: string;
  display_name: string;
  username: string;
  email: string;
}

export function AdminsList({ admins }: { admins: AdminRecord[] }) {
  const [isPending, startTransition] = useTransition();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchUsers({ query: searchQuery, page: 1, pageSize: 5 });
      if (result.data) {
        const adminIds = new Set(admins.map((a) => a.user_id));
        setSearchResults(
          result.data
            .filter((u) => !adminIds.has(u.id))
            .map((u) => ({
              id: u.id,
              display_name: u.display_name,
              username: u.username,
              email: u.email,
            }))
        );
      }
      setIsSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, admins]);

  const handleAdd = (userId: string) => {
    startTransition(async () => {
      const result = await addSiteAdmin(userId);
      if (!("error" in result)) {
        setSearchQuery("");
        setSearchResults([]);
        setShowSearch(false);
      }
    });
  };

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      await removeSiteAdmin(userId);
    });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1 -mt-0.5" weight="fill" />
          Site Admins ({admins.length})
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => setShowSearch(!showSearch)}
        >
          {showSearch ? (
            <>
              <X className="w-3 h-3 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 mr-1" weight="bold" /> Add
            </>
          )}
        </Button>
      </div>

      {showSearch && (
        <div className="relative mb-3">
          <div className="relative">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
              /* focus-on-open dialog — expected UX */
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] shadow-lg overflow-hidden">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleAdd(user.id)}
                  disabled={isPending}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--surface-2)] transition-colors text-left text-xs"
                >
                  <span className="text-[var(--text-primary)]">
                    {user.display_name}{" "}
                    <span className="text-[var(--text-muted)]">@{user.username}</span>
                  </span>
                  <Plus className="w-3 h-3 text-[var(--primary)]" weight="bold" />
                </button>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && !isSearching && (
            <div className="absolute z-10 top-full mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] p-2 text-xs text-[var(--text-muted)] text-center">
              No users found
            </div>
          )}
        </div>
      )}

      <div>
        {admins.map((admin) => {
          const user = Array.isArray(admin.user) ? admin.user[0] : admin.user;
          return (
            <div
              key={admin.user_id}
              className="flex items-center justify-between py-2 border-b border-[var(--border)]/40 last:border-0"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-[var(--surface-3)] flex items-center justify-center shrink-0 text-[10px] font-medium text-[var(--text-secondary)]">
                  {user?.display_name?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-sm text-[var(--text-primary)]">
                  {user?.display_name || "Unknown"}
                </span>
                <span className="text-xs text-[var(--text-muted)]">@{user?.username}</span>
                <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
                  {user?.email}
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-1 rounded hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors">
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Admin</AlertDialogTitle>
                    <AlertDialogDescription>
                      Remove {user?.display_name || "this user"} from site admins?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemove(admin.user_id)}
                      className="bg-[var(--error)] hover:opacity-90"
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </div>
    </section>
  );
}
