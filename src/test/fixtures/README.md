# Fixtures

Fixtures are test-only data. They must never contain real passwords, API keys, session tokens, customer financial data, or production identifiers.

The former `src/lib/data.ts` mock database is retired. Production code must read real data through Firebase repositories and services.
