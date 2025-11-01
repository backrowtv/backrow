/**
 * ICS Calendar Generator
 *
 * RFC 5545 compliant ICS file generation for club events.
 */

import { addHours, format } from "date-fns";

interface ICSEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  location: string | null;
}

interface ICSMovie {
  title: string;
}

/**
 * Format a date string to ICS UTC format (YYYYMMDDTHHMMSSz)
 */
export function formatICSDate(dateString: string): string {
  const date = new Date(dateString);
  return format(date, "yyyyMMdd'T'HHmmss'Z'");
}

/**
 * Escape special characters per RFC 5545
 * Backslash, newline, semicolon, and comma must be escaped
 */
export function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Fold lines longer than 75 octets per RFC 5545
 * Continuation lines start with a space
 */
export function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const char of line) {
    // Check byte length, not character length (for UTF-8)
    const newLine = currentLine + char;
    if (Buffer.byteLength(newLine, "utf8") > maxLength) {
      lines.push(currentLine);
      currentLine = " " + char; // Continuation line starts with space
    } else {
      currentLine = newLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\r\n");
}

/**
 * Generate a complete ICS file for a club event
 */
export function generateICS(event: ICSEvent, movie?: ICSMovie | null): string {
  const now = new Date();
  const startDate = new Date(event.event_date);
  const endDate = event.end_date ? new Date(event.end_date) : addHours(startDate, 2);

  // Build description with movie info if available
  let description = event.description || "";
  if (movie?.title) {
    description = description ? `${description}\n\nMovie: ${movie.title}` : `Movie: ${movie.title}`;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BackRow//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@backrow.tv`,
    `DTSTAMP:${formatICSDate(now.toISOString())}`,
    `DTSTART:${formatICSDate(startDate.toISOString())}`,
    `DTEND:${formatICSDate(endDate.toISOString())}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  if (description) {
    lines.push(`DESCRIPTION:${escapeICSText(description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  lines.push("STATUS:CONFIRMED", "END:VEVENT", "END:VCALENDAR");

  // Fold long lines and join with CRLF (per RFC 5545)
  return lines.map(foldLine).join("\r\n");
}

/**
 * Generate a safe filename from event title
 */
export function generateICSFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") + ".ics"
  );
}
