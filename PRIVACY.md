# Token Guild privacy notes

The MVP runs synthetic telemetry by default. It does not upload or persist prompts, workspace text, terminal output, model responses, trace bodies, or credentials.

The opt-in OTLP/HTTP JSON source is disabled by default and requires explicit user configuration. It accepts bounded localhost traces only; counts are labeled as exact or estimated. Local listeners bind to loopback, suppress duplicate spans, retain no raw bodies, and are stopped when the extension deactivates.
