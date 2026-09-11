'use client';

import { useEffect } from 'react';

export default function WebMetrics() {
  useEffect(() => {
    const report = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (!navigation) return;
      const payload = {
        metric: 'page_load',
        value: Math.max(0, Math.round(navigation.loadEventEnd - navigation.startTime)),
        domContentLoaded: Math.max(0, Math.round(navigation.domContentLoadedEventEnd - navigation.startTime)),
        transferSize: navigation.transferSize,
        path: window.location.pathname,
      };
      navigator.sendBeacon?.('/api/telemetry', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    };
    const timer = window.setTimeout(report, 0);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
