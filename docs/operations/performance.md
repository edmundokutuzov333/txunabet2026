# Oryon performance budgets

## Browser

- Initial JavaScript should be split by route and heavy surfaces should remain lazy-loaded.
- Dashboard route should render useful navigation before secondary analytics widgets.
- Chat realtime listeners are capped to the latest 50 messages, with older history paginated explicitly.
- Chat state deduplicates realtime, pagination and optimistic records by server ID and client message ID.
- Images should use Next/Image or controlled dimensions where the source is known.

## Network and storage

- Chat payloads are bounded by request validation.
- Attachments are limited to 100 MB at the application and Storage rules layers.
- Search is company-scoped and indexed.
- AI input and context are explicitly bounded before model invocation.

## AI

Track p50 and p95 AI latency, timeout rate, retry rate, rate-limit events and empty responses. Do not log prompts or generated sensitive context.

## Operational thresholds

Treat p95 application response latency above 1.5 s, p95 AI latency above 10 s, sustained 5xx above 1%, or chat delivery failures above 0.5% as investigation triggers. These are operational starting points, not SLA commitments, and should be recalibrated from real traffic.
