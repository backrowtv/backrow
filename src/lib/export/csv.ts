/**
 * Lightweight CSV serialization utilities.
 * No external dependencies — handles escaping, commas, newlines, and UTF-8 BOM.
 */

type CsvValue = string | number | boolean | null | undefined;

/** Escape a single value for CSV: wrap in quotes if it contains commas, quotes, or newlines */
function escapeCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Convert a row of values to a CSV line */
export function toCsvRow(values: CsvValue[]): string {
  return values.map(escapeCsvValue).join(",");
}

/** Build a complete CSV string with UTF-8 BOM, headers, and data rows */
export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const bom = "\uFEFF";
  const headerLine = toCsvRow(headers);
  const dataLines = rows.map(toCsvRow);
  return bom + [headerLine, ...dataLines].join("\r\n") + "\r\n";
}
