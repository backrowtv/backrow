"use server";

import { actionRateLimit } from "@/lib/security/action-rate-limit";
import { requireVerifiedEmail } from "@/lib/security/require-verified-email";
import { createClient } from "@/lib/supabase/server";

interface StyleChange {
  file: string;
  currentVariant: string;
  newVariant: string;
  componentType: "button" | "card" | "badge";
}

// CRITICAL: this action writes to the running server's filesystem and would be
// catastrophic in production (anyone can rewrite source files). Only the
// /test-styling dev tool calls it. Restrict to admin users in non-production
// environments. See docs/security.md follow-up review item.
async function requireSiteAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (process.env.NODE_ENV === "production") {
    return { ok: false, error: "Styling changes are disabled in production." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in" };
  const verified = requireVerifiedEmail(user);
  if (!verified.ok) return { ok: false, error: verified.error };
  const { data: adminRecord } = await supabase
    .from("site_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRecord) return { ok: false, error: "Admin access required" };
  return { ok: true };
}

async function resolveFilePath(file: string): Promise<string> {
  const path = await import("path");
  return path.join(process.cwd(), file);
}

async function readFile(filePath: string): Promise<string> {
  const { promises: fs } = await import("fs");
  return fs.readFile(filePath, "utf-8");
}

async function writeFile(filePath: string, content: string): Promise<void> {
  const { promises: fs } = await import("fs");
  await fs.writeFile(filePath, content, "utf-8");
}

export async function applyStylingChanges(changes: StyleChange[]) {
  const rateCheck = await actionRateLimit("applyStylingChanges", { limit: 5, windowMs: 60_000 });
  if (!rateCheck.success) return [{ file: "", success: false, error: rateCheck.error }];

  const adminCheck = await requireSiteAdmin();
  if (!adminCheck.ok) {
    return [{ file: "", success: false, error: adminCheck.error }];
  }

  const results: { file: string; success: boolean; error?: string }[] = [];

  for (const change of changes) {
    try {
      const filePath = await resolveFilePath(change.file);
      const content = await readFile(filePath);

      // All component types use the same variant pattern
      const pattern = new RegExp(`variant=["']${change.currentVariant}["']`, "g");
      const replacement = `variant="${change.newVariant}"`;

      if (!["button", "card", "badge"].includes(change.componentType)) {
        results.push({
          file: change.file,
          success: false,
          error: `Unknown component type: ${change.componentType}`,
        });
        continue;
      }

      // Check if pattern exists in file
      if (!pattern.test(content)) {
        results.push({
          file: change.file,
          success: false,
          error: `Pattern not found: variant="${change.currentVariant}"`,
        });
        continue;
      }

      // Reset regex lastIndex after test
      pattern.lastIndex = 0;

      // Apply the change
      const newContent = content.replace(pattern, replacement);
      await writeFile(filePath, newContent);

      results.push({
        file: change.file,
        success: true,
      });
    } catch (error) {
      results.push({
        file: change.file,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return results;
}

// Preview what changes would be made without applying them
export async function previewStylingChanges(changes: StyleChange[]) {
  const rateCheck = await actionRateLimit("previewStylingChanges", { limit: 10, windowMs: 60_000 });
  if (!rateCheck.success) return [{ file: "", found: false, matchCount: 0 }];

  const adminCheck = await requireSiteAdmin();
  if (!adminCheck.ok) {
    return [{ file: "", found: false, matchCount: 0 }];
  }

  const previews: {
    file: string;
    found: boolean;
    matchCount: number;
    preview?: string;
  }[] = [];

  for (const change of changes) {
    try {
      const filePath = await resolveFilePath(change.file);
      const content = await readFile(filePath);

      const pattern = new RegExp(`variant=["']${change.currentVariant}["']`, "g");

      const matches = content.match(pattern);
      const matchCount = matches ? matches.length : 0;

      if (matchCount > 0) {
        // Find the line with the match for preview
        const lines = content.split("\n");
        const matchingLines = lines
          .map((line, index) => ({ line, lineNumber: index + 1 }))
          .filter(({ line }) => pattern.test(line))
          .slice(0, 3); // Show first 3 matches

        previews.push({
          file: change.file,
          found: true,
          matchCount,
          preview: matchingLines
            .map(({ line, lineNumber }) => `L${lineNumber}: ${line.trim()}`)
            .join("\n"),
        });
      } else {
        previews.push({
          file: change.file,
          found: false,
          matchCount: 0,
        });
      }
    } catch {
      previews.push({
        file: change.file,
        found: false,
        matchCount: 0,
      });
    }
  }

  return previews;
}
