"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { updateDisplayPreferences } from "@/app/actions/display-preferences";
import {
  type TimeFormat,
  type DateFormat,
  type DisplayPreferences,
} from "@/lib/display-preferences-constants";
import toast from "react-hot-toast";

interface DisplayPreferencesContextType {
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
  setTimeFormat: (format: TimeFormat) => Promise<void>;
  setDateFormat: (format: DateFormat) => Promise<void>;
  formatTime: (date: Date | string) => string;
  formatDate: (
    date: Date | string,
    options?: { includeYear?: boolean; shortMonth?: boolean }
  ) => string;
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextType | undefined>(
  undefined
);

interface DisplayPreferencesProviderProps {
  children: ReactNode;
  initialPreferences: DisplayPreferences;
}

export function DisplayPreferencesProvider({
  children,
  initialPreferences,
}: DisplayPreferencesProviderProps) {
  // Use initial preferences from server, with safe defaults
  const safeInitial = {
    timeFormat: initialPreferences?.timeFormat ?? "12h",
    dateFormat: initialPreferences?.dateFormat ?? "MDY",
  };

  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(safeInitial.timeFormat);
  const [dateFormat, setDateFormatState] = useState<DateFormat>(safeInitial.dateFormat);

  const setTimeFormat = useCallback(
    async (format: TimeFormat) => {
      const previousFormat = timeFormat;
      setTimeFormatState(format); // Optimistic update

      const result = await updateDisplayPreferences({ timeFormat: format });
      if (!result.success) {
        setTimeFormatState(previousFormat); // Rollback on error
        toast.error(result.error || "Failed to update time format");
      }
    },
    [timeFormat]
  );

  const setDateFormat = useCallback(
    async (format: DateFormat) => {
      const previousFormat = dateFormat;
      setDateFormatState(format); // Optimistic update

      const result = await updateDisplayPreferences({ dateFormat: format });
      if (!result.success) {
        setDateFormatState(previousFormat); // Rollback on error
        toast.error(result.error || "Failed to update date format");
      }
    },
    [dateFormat]
  );

  const formatTime = useCallback(
    (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;

      if (timeFormat === "24h") {
        return dateObj.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }

      return dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    },
    [timeFormat]
  );

  const formatDate = useCallback(
    (date: Date | string, options?: { includeYear?: boolean; shortMonth?: boolean }) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const { includeYear = false, shortMonth = true } = options || {};

      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString("en-US", { month: shortMonth ? "short" : "long" });
      const year = dateObj.getFullYear();

      switch (dateFormat) {
        case "DMY":
          return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
        case "YMD":
          return includeYear ? `${year} ${month} ${day}` : `${month} ${day}`;
        case "MDY":
        default:
          return includeYear ? `${month} ${day}, ${year}` : `${month} ${day}`;
      }
    },
    [dateFormat]
  );

  return (
    <DisplayPreferencesContext.Provider
      value={{
        timeFormat,
        dateFormat,
        setTimeFormat,
        setDateFormat,
        formatTime,
        formatDate,
      }}
    >
      {children}
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences() {
  const context = useContext(DisplayPreferencesContext);
  if (context === undefined) {
    throw new Error("useDisplayPreferences must be used within a DisplayPreferencesProvider");
  }
  return context;
}

// Helper hook for formatting (with fallback for outside provider)
export function useTimeFormat() {
  const context = useContext(DisplayPreferencesContext);

  const formatTime = useCallback(
    (date: Date | string) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const format = context?.timeFormat ?? "12h";

      if (format === "24h") {
        return dateObj.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }

      return dateObj.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    },
    [context?.timeFormat]
  );

  return { formatTime, timeFormat: context?.timeFormat ?? "12h" };
}

// Helper hook for date formatting (with fallback for outside provider)
export function useDateFormat() {
  const context = useContext(DisplayPreferencesContext);

  const formatDate = useCallback(
    (date: Date | string, options?: { includeYear?: boolean; shortMonth?: boolean }) => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const format = context?.dateFormat ?? "MDY";
      const { includeYear = false, shortMonth = true } = options || {};

      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString("en-US", { month: shortMonth ? "short" : "long" });
      const year = dateObj.getFullYear();

      switch (format) {
        case "DMY":
          return includeYear ? `${day} ${month} ${year}` : `${day} ${month}`;
        case "YMD":
          return includeYear ? `${year} ${month} ${day}` : `${month} ${day}`;
        case "MDY":
        default:
          return includeYear ? `${month} ${day}, ${year}` : `${month} ${day}`;
      }
    },
    [context?.dateFormat]
  );

  return { formatDate, dateFormat: context?.dateFormat ?? "MDY" };
}
