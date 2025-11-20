"use client";

import { useState } from "react";
import { DownloadSimple, CircleNotch } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export function DataExportImport() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export");
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        "backrow-export.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export your data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">Export Your Data</h3>
        <p className="text-xs text-[var(--text-muted)]">
          Download a ZIP file containing your ratings, watch history, festivals, clubs, discussions,
          and profile data as CSV files. Includes TMDB IDs for easy import into other movie
          platforms.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
        className="w-fit"
      >
        {isExporting ? (
          <CircleNotch className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <DownloadSimple className="w-4 h-4 mr-2" />
        )}
        {isExporting ? "Generating export..." : "Download your data"}
      </Button>
    </div>
  );
}
