/**
 * Structured logging utility for server-side code.
 * Outputs JSON lines for Vercel's log viewer and drain integrations.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('cron:start', { route: '/api/cron/advance-festivals' })
 *   logger.error('cron:failed', { route: '/api/cron/advance-festivals', error: err.message, ms: 120 })
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  msg: string;
  ts: string;
  [key: string]: unknown;
}

function log(level: LogLevel, msg: string, data?: Record<string, unknown>) {
  const entry: LogEntry = {
    level,
    msg,
    ts: new Date().toISOString(),
    ...data,
  };
  const output = JSON.stringify(entry);

  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.log(output);
}

export const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
};
