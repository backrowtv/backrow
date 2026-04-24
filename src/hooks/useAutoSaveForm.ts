"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AutoSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type AutoSaveResult = { error?: string; success?: boolean } | void | undefined | null;

export interface UseAutoSaveFormOptions<T> {
  values: T;
  save: (values: T) => Promise<AutoSaveResult>;
  debounceMs?: number;
  enabled?: boolean;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export interface UseAutoSaveFormReturn {
  state: AutoSaveState;
  isDirty: boolean;
  lastSavedAt: Date | null;
  error: string | null;
  flush: () => void;
}

const SAVED_PULSE_MS = 1200;

export function useAutoSaveForm<T>({
  values,
  save,
  debounceMs = 800,
  enabled = true,
  onError,
  onSuccess,
}: UseAutoSaveFormOptions<T>): UseAutoSaveFormReturn {
  const [state, setState] = useState<AutoSaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentSnapshot = JSON.stringify(values);

  const savedSnapshotRef = useRef<string>(currentSnapshot);
  const pendingValuesRef = useRef<T>(values);
  const saveInFlightRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountedRef = useRef<boolean>(false);
  const scheduleSaveRef = useRef<() => void>(() => {});

  pendingValuesRef.current = values;

  const isDirty = currentSnapshot !== savedSnapshotRef.current;

  const runSave = useCallback(async (): Promise<void> => {
    if (unmountedRef.current) return;
    if (saveInFlightRef.current) return;

    const snapshotBeforeSave = JSON.stringify(pendingValuesRef.current);
    if (snapshotBeforeSave === savedSnapshotRef.current) return;

    saveInFlightRef.current = true;
    setState("saving");
    setError(null);

    let errMsg: string | null = null;
    try {
      const result = await save(pendingValuesRef.current);
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        typeof result.error === "string" &&
        result.error.length > 0
      ) {
        errMsg = result.error;
      }
    } catch (err) {
      errMsg = err instanceof Error ? err.message : "Save failed";
    }

    saveInFlightRef.current = false;
    if (unmountedRef.current) return;

    if (errMsg) {
      setError(errMsg);
      setState("error");
      onError?.(errMsg);
      return;
    }

    savedSnapshotRef.current = snapshotBeforeSave;
    setLastSavedAt(new Date());
    onSuccess?.();

    // If the user made more changes while we were saving, stay dirty and
    // re-schedule instead of flashing "saved".
    const latestSnapshot = JSON.stringify(pendingValuesRef.current);
    if (latestSnapshot !== savedSnapshotRef.current) {
      setState("dirty");
      if (enabled) scheduleSaveRef.current();
      return;
    }

    setState("saved");
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      if (unmountedRef.current) return;
      setState((s) => (s === "saved" ? "idle" : s));
    }, SAVED_PULSE_MS);
  }, [save, enabled, onError, onSuccess]);

  const scheduleSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void runSave();
    }, debounceMs);
  }, [runSave, debounceMs]);

  useEffect(() => {
    scheduleSaveRef.current = scheduleSave;
  }, [scheduleSave]);

  const flush = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    void runSave();
  }, [runSave]);

  useEffect(() => {
    if (!isDirty) return;

    if (!saveInFlightRef.current) {
      setState((s) => (s === "saving" ? s : "dirty"));
    }

    if (enabled) {
      scheduleSave();
    }
  }, [currentSnapshot, enabled, isDirty, scheduleSave]);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  return {
    state,
    isDirty,
    lastSavedAt,
    error,
    flush,
  };
}
