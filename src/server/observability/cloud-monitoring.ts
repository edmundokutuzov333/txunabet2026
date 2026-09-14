import 'server-only';

import { MetricServiceClient } from '@google-cloud/monitoring';

const client = new MetricServiceClient();

function enabled(): boolean {
  return process.env.ORYON_CLOUD_MONITORING_ENABLED === 'true';
}

function projectId(): string {
  return process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || '';
}

export async function writeCloudMonitoringMetric(input: {
  metricType: string;
  value: number;
  unit?: string;
  labels?: Record<string, string>;
}): Promise<void> {
  if (!enabled()) return;
  const project = projectId();
  if (!project || !Number.isFinite(input.value)) return;

  const metricType = input.metricType.replace(/[^A-Za-z0-9_./-]/g, '').slice(0, 180);
  if (!metricType) return;

  try {
    await client.createTimeSeries({
      name: `projects/${project}`,
      timeSeries: [
        {
          metric: {
            type: `custom.googleapis.com/oryon/${metricType}`,
            labels: input.labels ?? {},
          },
          resource: {
            type: 'global',
            labels: { project_id: project },
          },
          metricKind: 'GAUGE',
          valueType: 'DOUBLE',
          unit: input.unit ?? '1',
          points: [
            {
              interval: { endTime: { seconds: Math.floor(Date.now() / 1000), nanos: 0 } },
              value: { doubleValue: input.value },
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      service: 'oryon-observability',
      event: 'cloud_monitoring.write_failed',
      metricType,
      error: error instanceof Error ? error.name : 'unknown',
    }));
  }
}
