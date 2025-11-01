"use client";

import { useRef, useCallback } from "react";
import toast, { useToaster, Toast as ToastType } from "react-hot-toast";
import { CheckCircle, XCircle, Spinner } from "@phosphor-icons/react";

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  startTime: number;
  isTracking: boolean;
  isDismissing: boolean;
}

function SwipeableToast({ t, children }: { t: ToastType; children: React.ReactNode }) {
  const toastRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    startTime: 0,
    isTracking: false,
    isDismissing: false,
  });

  const SWIPE_THRESHOLD = 80; // pixels to trigger dismiss
  const VELOCITY_THRESHOLD = 0.3; // px/ms

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    stateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      startTime: Date.now(),
      isTracking: true,
      isDismissing: false,
    };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!stateRef.current.isTracking) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - stateRef.current.startX;
    const deltaY = touch.clientY - stateRef.current.startY;

    // If vertical movement is dominant, stop tracking (allow scroll)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
      stateRef.current.isTracking = false;
      if (toastRef.current) {
        toastRef.current.style.transform = "";
        toastRef.current.style.opacity = "";
      }
      return;
    }

    stateRef.current.currentX = touch.clientX;

    // Apply visual feedback during swipe
    if (toastRef.current && Math.abs(deltaX) > 5) {
      const translateX = deltaX;
      const opacity = Math.max(0.3, 1 - Math.abs(deltaX) / 200);
      toastRef.current.style.transform = `translateX(${translateX}px)`;
      toastRef.current.style.opacity = String(opacity);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!stateRef.current.isTracking) return;

    const { startX, startTime, currentX } = stateRef.current;
    const deltaX = currentX - startX;
    const deltaTime = Date.now() - startTime;
    const velocity = Math.abs(deltaX) / deltaTime;

    stateRef.current.isTracking = false;

    const meetsDistanceThreshold = Math.abs(deltaX) >= SWIPE_THRESHOLD;
    const meetsVelocityThreshold = velocity >= VELOCITY_THRESHOLD && Math.abs(deltaX) >= 40;

    if (meetsDistanceThreshold || meetsVelocityThreshold) {
      // Animate out and dismiss
      stateRef.current.isDismissing = true;
      if (toastRef.current) {
        const direction = deltaX > 0 ? 1 : -1;
        toastRef.current.style.transition = "transform 200ms ease-out, opacity 200ms ease-out";
        toastRef.current.style.transform = `translateX(${direction * 300}px)`;
        toastRef.current.style.opacity = "0";
      }
      setTimeout(() => {
        toast.dismiss(t.id);
      }, 200);
    } else {
      // Snap back
      if (toastRef.current) {
        toastRef.current.style.transition = "transform 200ms ease-out, opacity 200ms ease-out";
        toastRef.current.style.transform = "";
        toastRef.current.style.opacity = "";
        setTimeout(() => {
          if (toastRef.current) {
            toastRef.current.style.transition = "";
          }
        }, 200);
      }
    }
  }, [t.id]);

  return (
    <div
      ref={toastRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: "pan-y" }}
    >
      {children}
    </div>
  );
}

function getToastIcon(type: ToastType["type"]) {
  switch (type) {
    case "success":
      return <CheckCircle weight="fill" className="h-5 w-5 shrink-0 text-[var(--success)]" />;
    case "error":
      return <XCircle weight="fill" className="h-5 w-5 shrink-0 text-[var(--error)]" />;
    case "loading":
      return <Spinner className="h-5 w-5 shrink-0 animate-spin text-[var(--primary)]" />;
    default:
      return null;
  }
}

function getToastStyles(type: ToastType["type"]) {
  const baseStyles: React.CSSProperties = {
    background: "var(--surface-3)",
    color: "var(--text-secondary)",
    borderRadius: "0.75rem",
    backdropFilter: "blur(12px)",
    padding: "0.75rem 1rem",
    fontSize: "0.8125rem",
    boxShadow: "var(--shadow-xl)",
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
  };

  switch (type) {
    case "success":
      return {
        ...baseStyles,
        border: "1px solid rgba(var(--success-rgb), 0.3)",
      };
    case "error":
      return {
        ...baseStyles,
        border: "1px solid rgba(var(--error-rgb), 0.3)",
      };
    default:
      return {
        ...baseStyles,
        border: "1px solid var(--border)",
      };
  }
}

function getAriaProps(type: ToastType["type"]) {
  if (type === "error") {
    return { role: "alert" as const, "aria-live": "assertive" as const };
  }
  return { role: "status" as const, "aria-live": "polite" as const };
}

export function Toaster() {
  const { toasts, handlers } = useToaster();
  const { startPause, endPause } = handlers;

  return (
    <>
      {/* Screen reader live region for toast notifications */}
      <div
        id="toast-announcements"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      <div
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-[calc(100vw-2rem)] safe-area-inset-top"
        onMouseEnter={startPause}
        onMouseLeave={endPause}
      >
        {toasts
          .filter((t) => t.visible)
          .map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto"
              style={{
                animation: t.visible
                  ? "toast-enter 200ms ease-out"
                  : "toast-exit 200ms ease-in forwards",
              }}
              {...getAriaProps(t.type)}
            >
              <SwipeableToast t={t}>
                <div style={getToastStyles(t.type)}>
                  {getToastIcon(t.type)}
                  <span className="flex-1">{resolveToastMessage(t)}</span>
                </div>
              </SwipeableToast>
            </div>
          ))}
      </div>
    </>
  );
}

function resolveToastMessage(t: ToastType): React.ReactNode {
  return typeof t.message === "function" ? t.message(t) : t.message;
}
