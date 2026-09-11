import 'server-only';

export type MetricName = 'request' | 'ai_request' | 'chat_delivery' | 'storage_upload' | 'auth_failure';
export type MetricPoint = {
  name: MetricName;
  value: number;
  timestamp: string;
  success?: boolean;
  userId?: string;
  companyId?: string;
};

const MAX_BUFFER = 1000;
const buffer: MetricPoint[] = [];

export function recordMetric(point: Omit<MetricPoint, 'timestamp'>): void {
  buffer.push({ ...point, timestamp: new Date().toISOString() });
  if (buffer.length > MAX_BUFFER) buffer.splice(0, buffer.length - MAX_BUFFER);
}

export function getMetricSnapshot(): MetricPoint[] {
  return buffer.slice(-200);
}

export function summarizeMetrics(): Record<MetricName, { count: number; averageMs: number; failures: number }> {
  const names: MetricName[] = ['request', 'ai_request', 'chat_delivery', 'storage_upload', 'auth_failure'];
  return Object.fromEntries(names.map((name) => {
    const values = buffer.filter((point) => point.name === name);
    const failures = values.filter((point) => point.success === false).length;
    const total = values.reduce((sum, point) => sum + point.value, 0);
    return [name, { count: values.length, averageMs: values.length ? Math.round(total / values.length) : 0, failures }];
  })) as Record<MetricName, { count: number; averageMs: number; failures: number }>;
}
