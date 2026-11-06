# Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| A capability looks unavailable but should work | The live status contract differs from a cached or documented value | Re-read the live capability/readiness contract; do not rely on a table |
| Delegation cannot be verified | The verification path cannot supply required signature inputs | Do not fabricate inputs; use the separately supported owner-signed path, otherwise report it unverified |
| An action is rejected as over-limit | The grant's per-transaction or cumulative bound does not cover it | Report the exact bound; propose a smaller action or request an explicit grant change |
| The same operation appears both submitted and failed | The outcome is ambiguous, not contradictory | Do not resubmit; reconcile against authoritative chain or venue state |
| A session works but no action is permitted | Session authentication is being mistaken for execution authority | Read the execution-mode contract. USER_SIGNED: require fresh user approval/signature for the action. BOUNDED_AUTONOMOUS: require a valid owner-signed grant |
| A tool is visible but refuses to execute | Discovery is not availability or authorization | Check the capability status for the requested domain and mode |
| Two sources disagree about readiness | A canonical truth conflict | Fail closed; prefer the live runtime response for the call; report the conflict |

---


