Run the 02-performance pipeline as an agent team.

TARGET_URL=$TARGET_URL
PERF_MODE=$PERF_MODE   # pr | quick | nightly

Spawn 3 teammates in parallel:
- k6-load-tester     → owns 2.1-2.4 in strict sequence, writes reports/perf/2.x-*.json
- k6-soak-tester     → owns 2.5; waits for "scalability-done" mailbox from k6-load-tester before starting
- lighthouse-auditor → owns 2.6; runs in parallel with the k6 chain

Wait for all three to report idle, then spawn perf-evaluator to read the three summary files, apply slo.json, and emit reports/perf/summary.{json,md} plus the gate decision.

Don't run scenarios yourself — you're the coordinator. Never run two k6 scripts in parallel. Clean up the team when done.
