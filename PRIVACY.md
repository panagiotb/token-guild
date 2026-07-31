# Token Guild privacy notes

The MVP runs synthetic telemetry by default. It does not upload or persist prompts, workspace text, terminal output, model responses, trace bodies, or credentials.

Experimental real telemetry sources are disabled by default and require explicit user configuration. Counts are labeled as exact or estimated. Local listeners bind to loopback and are stopped when the extension deactivates.
