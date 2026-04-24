/**
 * useAutoSaveForm hook — debounced auto-save state machine.
 *
 * Covers: dirty transition, debounce, save success/error, concurrent edits
 * during save, flush bypassing the debounce, and unmount cleanup.
 *
 * Uses fake timers; state is checked directly after `advanceTimersByTimeAsync`
 * (which flushes microtasks) rather than `waitFor` (polls on real timers).
 */

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSaveForm } from "@/hooks/useAutoSaveForm";

async function tick(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useAutoSaveForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts idle and is not dirty", () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAutoSaveForm({ values: { n: 1 }, save }));
    expect(result.current.state).toBe("idle");
    expect(result.current.isDirty).toBe(false);
    expect(save).not.toHaveBeenCalled();
  });

  it("goes dirty on change and saves after the debounce", async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { result, rerender } = renderHook(
      ({ values }) => useAutoSaveForm({ values, save, debounceMs: 200 }),
      { initialProps: { values: { n: 1 } } }
    );

    rerender({ values: { n: 2 } });
    expect(result.current.state).toBe("dirty");
    expect(save).not.toHaveBeenCalled();

    await tick(200);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ n: 2 });
    expect(result.current.state).toBe("saved");
    expect(result.current.isDirty).toBe(false);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);

    // Pulse clears back to idle
    await tick(1500);
    expect(result.current.state).toBe("idle");
  });

  it("transitions to error and surfaces the message on failed save", async () => {
    const save = vi.fn().mockResolvedValue({ error: "nope" });
    const { result, rerender } = renderHook(
      ({ values }) => useAutoSaveForm({ values, save, debounceMs: 100 }),
      { initialProps: { values: { n: 1 } } }
    );

    rerender({ values: { n: 2 } });
    await tick(100);

    expect(result.current.state).toBe("error");
    expect(result.current.error).toBe("nope");
    expect(result.current.isDirty).toBe(true);
  });

  it("flush() saves immediately, bypassing the debounce", async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { result, rerender } = renderHook(
      ({ values }) => useAutoSaveForm({ values, save, debounceMs: 10_000 }),
      { initialProps: { values: { n: 1 } } }
    );

    rerender({ values: { n: 2 } });
    expect(result.current.state).toBe("dirty");

    await act(async () => {
      result.current.flush();
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("saved");
  });

  it("coalesces rapid edits into a single save (debounce)", async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { result, rerender } = renderHook(
      ({ values }) => useAutoSaveForm({ values, save, debounceMs: 200 }),
      { initialProps: { values: { n: 1 } } }
    );

    rerender({ values: { n: 2 } });
    await tick(50);
    rerender({ values: { n: 3 } });
    await tick(50);
    rerender({ values: { n: 4 } });
    await tick(200);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ n: 4 });
    expect(result.current.state).toBe("saved");
  });

  it("re-saves if user edits during an in-flight save", async () => {
    let resolveFirst!: (v: { success: true }) => void;
    const save = vi
      .fn()
      .mockImplementationOnce(() => new Promise<{ success: true }>((r) => (resolveFirst = r)))
      .mockResolvedValueOnce({ success: true });

    const { result, rerender } = renderHook(
      ({ values }) => useAutoSaveForm({ values, save, debounceMs: 100 }),
      { initialProps: { values: { n: 1 } } }
    );

    rerender({ values: { n: 2 } });
    await tick(100);
    expect(result.current.state).toBe("saving");

    // User edits while save is in-flight
    rerender({ values: { n: 3 } });

    // Resolve the first save
    await act(async () => {
      resolveFirst({ success: true });
      await vi.advanceTimersByTimeAsync(0);
    });

    // Still dirty (n=3 hasn't been saved yet), re-scheduled
    expect(result.current.isDirty).toBe(true);

    await tick(150);
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ n: 3 });
  });

  it("does not fire the save callback after unmount", async () => {
    let resolveSave!: (v: { success: true }) => void;
    const save = vi
      .fn()
      .mockImplementation(() => new Promise<{ success: true }>((r) => (resolveSave = r)));
    const onSuccess = vi.fn();

    const { result, rerender, unmount } = renderHook(
      ({ values }) => useAutoSaveForm({ values, save, debounceMs: 50, onSuccess }),
      { initialProps: { values: { n: 1 } } }
    );

    rerender({ values: { n: 2 } });
    await tick(50);
    expect(result.current.state).toBe("saving");

    unmount();
    await act(async () => {
      resolveSave({ success: true });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("does not auto-save when enabled is false, but flush still works", async () => {
    const save = vi.fn().mockResolvedValue({ success: true });
    const { result, rerender } = renderHook(
      ({ values }) => useAutoSaveForm({ values, save, debounceMs: 100, enabled: false }),
      { initialProps: { values: { n: 1 } } }
    );

    rerender({ values: { n: 2 } });
    await tick(500);
    expect(save).not.toHaveBeenCalled();
    expect(result.current.state).toBe("dirty");

    await act(async () => {
      result.current.flush();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(save).toHaveBeenCalledTimes(1);
  });
});
