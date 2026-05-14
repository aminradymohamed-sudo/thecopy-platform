Run the 01-security pipeline as an agent team.

Spawn 4 teammates in parallel using these subagent types:
- sast-specialist  → owns tasks 1.1-1.4, writes reports/sast/*.json
- deps-auditor     → owns tasks 1.5-1.9, writes reports/deps/*.json
- dast-specialist  → owns task 1.10, writes reports/dast/*.json   (TARGET_URL=$TARGET_URL)
- pentest-probes   → owns task 1.11, writes reports/pentest/*.json (TARGET_URL=$TARGET_URL, ALLOW_PENTEST=1)

Wait for all four to report idle, then spawn risk-evaluator to read the four summary.json files, apply policy.json, and emit reports/summary.{json,md} plus the gate decision.

Don't run scans yourself — you're the coordinator. Clean up the team when done.
