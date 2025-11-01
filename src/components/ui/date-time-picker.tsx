"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CalendarBlank, CaretLeft, CaretRight, X } from "@phosphor-icons/react";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  minDateTime?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} at ${displayHour}:${minutes} ${ampm}`;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isBeforeDay(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  return d1 < d2;
}

export function DateTimePicker({
  value,
  onChange,
  minDateTime,
  placeholder = "Select date & time",
  disabled = false,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Parse the value into date components
  const parsedValue = useMemo(() => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
    };
  }, [value]);

  // Calendar state
  const [viewMonth, setViewMonth] = useState(() => {
    if (parsedValue) return parsedValue.month;
    return new Date().getMonth();
  });
  const [viewYear, setViewYear] = useState(() => {
    if (parsedValue) return parsedValue.year;
    return new Date().getFullYear();
  });

  // Selected date/time state (temp while picker is open)
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (parsedValue) {
      return new Date(parsedValue.year, parsedValue.month, parsedValue.day);
    }
    return null;
  });
  const [selectedHour, setSelectedHour] = useState(() => {
    if (parsedValue) {
      const h = parsedValue.hour % 12;
      return h === 0 ? 12 : h;
    }
    return 12;
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    return parsedValue?.minute ?? 0;
  });
  const [selectedAmPm, setSelectedAmPm] = useState<"AM" | "PM">(() => {
    if (parsedValue) {
      return parsedValue.hour >= 12 ? "PM" : "AM";
    }
    return "PM";
  });

  // Parse minDateTime
  const minDate = useMemo(() => {
    if (!minDateTime) return null;
    const date = new Date(minDateTime);
    return isNaN(date.getTime()) ? null : date;
  }, [minDateTime]);

  // Reset picker state when opening
  React.useEffect(() => {
    if (open) {
      if (parsedValue) {
        setViewMonth(parsedValue.month);
        setViewYear(parsedValue.year);
        setSelectedDate(new Date(parsedValue.year, parsedValue.month, parsedValue.day));
        const h = parsedValue.hour % 12;
        setSelectedHour(h === 0 ? 12 : h);
        setSelectedMinute(parsedValue.minute);
        setSelectedAmPm(parsedValue.hour >= 12 ? "PM" : "AM");
      } else {
        const now = new Date();
        setViewMonth(now.getMonth());
        setViewYear(now.getFullYear());
        setSelectedDate(null);
        setSelectedHour(12);
        setSelectedMinute(0);
        setSelectedAmPm("PM");
      }
    }
  }, [open, parsedValue]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: { date: Date; isCurrentMonth: boolean; isDisabled: boolean }[] = [];

    // Previous month days
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(viewYear, viewMonth - 1, prevMonthLastDay - i);
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: minDate ? isBeforeDay(date, minDate) : false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(viewYear, viewMonth, i);
      days.push({
        date,
        isCurrentMonth: true,
        isDisabled: minDate ? isBeforeDay(date, minDate) : false,
      });
    }

    // Next month days to fill grid (6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const date = new Date(viewYear, viewMonth + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: minDate ? isBeforeDay(date, minDate) : false,
      });
    }

    return days;
  }, [viewYear, viewMonth, minDate]);

  const today = new Date();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleConfirm = () => {
    if (!selectedDate) return;

    // Convert 12-hour to 24-hour
    let hour24 = selectedHour;
    if (selectedAmPm === "PM" && selectedHour !== 12) {
      hour24 = selectedHour + 12;
    } else if (selectedAmPm === "AM" && selectedHour === 12) {
      hour24 = 0;
    }

    const finalDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hour24,
      selectedMinute
    );

    // Format as ISO string for datetime-local compatibility
    const pad = (n: number) => n.toString().padStart(2, "0");
    const isoString = `${finalDate.getFullYear()}-${pad(finalDate.getMonth() + 1)}-${pad(finalDate.getDate())}T${pad(hour24)}:${pad(selectedMinute)}`;

    onChange(isoString);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setOpen(false);
  };

  const displayValue = formatDisplayDate(value);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 w-full rounded-md border h-9",
            "bg-[var(--background)]",
            "border-[var(--border)]",
            "text-[var(--text-primary)]",
            "px-3 py-2 text-base md:text-sm",
            "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:border-transparent",
            "hover:border-[var(--border-hover)]",
            "transition-colors duration-150",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-2)]",
            !displayValue && "text-[var(--text-muted)]",
            className
          )}
        >
          <CalendarBlank className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          <span className="flex-1 text-left truncate">{displayValue || placeholder}</span>
          {displayValue && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="shrink-0 p-0.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-[var(--border)]">
          <DialogTitle className="text-base font-medium">Select Date & Time</DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <CaretLeft className="h-4 w-4" weight="bold" />
            </button>
            <span className="font-medium text-sm">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-md hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <CaretRight className="h-4 w-4" weight="bold" />
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-[var(--text-muted)] py-1"
              >
                {day}
              </div>
            ))}

            {/* Day cells */}
            {calendarDays.map((dayInfo, idx) => {
              const isSelected = selectedDate && isSameDay(dayInfo.date, selectedDate);
              const isToday = isSameDay(dayInfo.date, today);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={dayInfo.isDisabled}
                  onClick={() => handleSelectDate(dayInfo.date)}
                  className={cn(
                    "h-9 w-full rounded-md text-sm transition-colors",
                    "hover:bg-[var(--surface-2)]",
                    "focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1",
                    !dayInfo.isCurrentMonth && "text-[var(--text-disabled)]",
                    dayInfo.isCurrentMonth && "text-[var(--text-primary)]",
                    isToday && !isSelected && "ring-1 ring-[var(--primary)]",
                    isSelected &&
                      "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]",
                    dayInfo.isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  {dayInfo.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Time Selection */}
          <div className="pt-3 border-t border-[var(--border)]">
            <div className="flex items-center justify-center gap-2">
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                className="h-9 px-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
              <span className="text-[var(--text-muted)]">:</span>
              <select
                value={selectedMinute}
                onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                className="h-9 px-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {m.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                value={selectedAmPm}
                onChange={(e) => setSelectedAmPm(e.target.value as "AM" | "PM")}
                className="h-9 px-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] text-sm focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-1)]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-[var(--text-muted)]"
          >
            Clear
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={!selectedDate}>
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
