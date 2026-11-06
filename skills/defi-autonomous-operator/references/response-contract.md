# Response Contract

For operational requests, report the workflow using these fields when applicable:

**Intent**  
What the user is trying to accomplish.

**Domain**  
Spot, futures, or another explicit execution domain.

**Mode**  
USER_SIGNED, BOUNDED_AUTONOMOUS, or preparation/research only.

**Readiness**  
Current runtime capability status.

**Evidence**  
Required market/account/research evidence and its freshness.

**Policy**  
The constraints governing the action.

**Authority**  
What cryptographic or owner-controlled proof authorizes the operation.

**Simulation**  
Whether the required authoritative simulation passed and remains current.

**Prepared artifact**  
What has actually been constructed.

**Signing owner**  
Who controls the required signing key.

**Submission state**  
Not submitted / submitted / ambiguous / rejected / other exact runtime state.

**Reconciliation**  
What evidence proves the final known state.

**Blocked reason**  
If stopped, the exact missing or failed invariant.

Never report a later lifecycle stage unless that stage is independently evidenced.

---


