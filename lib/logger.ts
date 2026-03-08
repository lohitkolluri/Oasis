/**
 * Structured logger for API and cron. No PII or secrets in meta.
 * Use requestId (from middleware) or runId (cron) for correlation.
 */

const LOG_LEVEL = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
const LEVEL_ORDER: Record<string, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: string): boolean {
  const order = LEVEL_ORDER[level] ?? 1;
  const minOrder = LEVEL_ORDER[LOG_LEVEL] ?? 1;
  return order >= minOrder;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMeta {
  requestId?: string | null;
  runId?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

function formatLine(level: LogLevel, message: string, meta: LogMeta): string {
  const payload = {
    level,
    message,
    ...meta,
    timestamp: new Date().toISOString(),
  };
  return process.env.NODE_ENV === 'production'
    ? JSON.stringify(payload)
    : `${payload.timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
}

function log(level: LogLevel, message: string, meta: LogMeta = {}): void {
  if (!shouldLog(level)) return;
  const line = formatLine(level, message, meta);
  switch (level) {
    case 'error':
      console.error(line);
      break;
    case 'warn':
      console.warn(line);
      break;
    default:
      console.log(line);
  }
}

export const logger = {
  debug: (message: string, meta?: LogMeta) => log('debug', message, meta ?? {}),
  info: (message: string, meta?: LogMeta) => log('info', message, meta ?? {}),
  warn: (message: string, meta?: LogMeta) => log('warn', message, meta ?? {}),
  error: (message: string, meta?: LogMeta) => log('error', message, meta ?? {}),
};

/** Get correlation ID from request (set by middleware or client). */
export function getRequestId(request: Request | null | undefined): string | null {
  if (!request) return null;
  return request.headers.get('x-request-id');
}

/** Get or create a correlation ID for this request (for use in route handlers). */
export function getOrCreateRequestId(request: Request | null | undefined): string {
  const id = getRequestId(request);
  if (id) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
