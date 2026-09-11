import 'server-only';

export type LogLevel = 'info' | 'warn' | 'error';
export type LogEvent = {
  level: LogLevel;
  event: string;
  requestId?: string;
  userId?: string;
  companyId?: string;
  durationMs?: number;
  metadata?: Record<string, string | number | boolean | null>;
};

function write(event: LogEvent): void {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    service: 'oryon-web',
    ...event,
  });
  if (event.level === 'error') console.error(line);
  else if (event.level === 'warn') console.warn(line);
  else console.info(line);
}

export function logInfo(event: Omit<LogEvent, 'level'>): void { write({ level: 'info', ...event }); }
export function logWarn(event: Omit<LogEvent, 'level'>): void { write({ level: 'warn', ...event }); }
export function logError(event: Omit<LogEvent, 'level'>): void { write({ level: 'error', ...event }); }

export async function measure<T>(event: Omit<LogEvent, 'level'>, operation: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await operation();
    logInfo({ ...event, durationMs: Math.round(performance.now() - start) });
    return result;
  } catch (error) {
    logError({ ...event, durationMs: Math.round(performance.now() - start), metadata: { ...event.metadata, error: error instanceof Error ? error.name : 'unknown' } });
    throw error;
  }
}
