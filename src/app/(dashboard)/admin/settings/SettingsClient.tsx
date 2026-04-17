"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gear, FloppyDisk, Plus, Check, PencilSimple, X } from "@phosphor-icons/react";
import { updateSiteSetting } from "@/app/actions/admin";

interface Setting {
  key: string;
  value: string;
  description: string | null;
}

export function SettingsClient({ settings }: { settings: Setting[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const startEdit = (setting: Setting) => {
    setEditingKey(setting.key);
    try {
      const p = JSON.parse(setting.value);
      setEditValue(typeof p === "string" ? p : JSON.stringify(p, null, 2));
    } catch {
      setEditValue(setting.value);
    }
  };

  const handleSave = (key: string) => {
    startTransition(async () => {
      const result = await updateSiteSetting(key, editValue);
      if (!("error" in result)) {
        setEditingKey(null);
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 2000);
      }
    });
  };

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    startTransition(async () => {
      const result = await updateSiteSetting(newKey.trim(), newValue.trim());
      if (!("error" in result)) {
        setNewKey("");
        setNewValue("");
        setShowAdd(false);
      }
    });
  };

  const fmtValue = (v: string) => {
    try {
      const p = JSON.parse(v);
      return typeof p === "string" ? p : JSON.stringify(p);
    } catch {
      return v;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            <span className="tabular-nums">{settings.length}</span> settings configured
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? (
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

      {/* Add new */}
      {showAdd && (
        <div className="p-3 rounded-md border border-[var(--primary)]/20 bg-[var(--surface-1)] space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="h-7 text-xs font-mono"
              /* focus-on-open dialog — expected UX */
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <Input
              placeholder="value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="h-7 text-xs"
            />
          </div>
          <Button
            size="sm"
            className="h-6 text-[11px]"
            onClick={handleAdd}
            disabled={isPending || !newKey.trim() || !newValue.trim()}
          >
            Create
          </Button>
        </div>
      )}

      {/* Settings list */}
      {settings.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)]">
          <Gear className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No settings</p>
        </div>
      ) : (
        <div>
          {settings.map((setting) => (
            <div
              key={setting.key}
              className="py-3 border-b border-[var(--border)]/40 last:border-0"
            >
              {editingKey === setting.key ? (
                <div className="space-y-2">
                  <code className="text-xs font-mono text-[var(--text-primary)]">
                    {setting.key}
                  </code>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-8 text-sm font-mono"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-6 text-[11px]"
                      onClick={() => handleSave(setting.key)}
                      disabled={isPending}
                    >
                      <FloppyDisk className="w-3 h-3 mr-1" weight="fill" /> Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px]"
                      onClick={() => setEditingKey(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-[var(--text-primary)]">
                        {setting.key}
                      </code>
                      {savedKey === setting.key && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" weight="bold" /> Saved
                        </span>
                      )}
                    </div>
                    {setting.description && (
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        {setting.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <code className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface-1)] px-2 py-0.5 rounded max-w-[260px] truncate block">
                      {fmtValue(setting.value)}
                    </code>
                    <button
                      onClick={() => startEdit(setting)}
                      className="p-1 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <PencilSimple className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
