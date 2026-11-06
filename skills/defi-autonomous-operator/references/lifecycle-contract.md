# Lifecycle Contract

The stage sequence, what each stage proves, what it must not be used to infer,
and what to do when a stage cannot be completed.

This reference describes the **generalized** lifecycle. The FarmDash runtime is
the implementation validated against it.

---

## 1. The loop

```text
OBSERVE → ORIENT → PLAN → SIMULATE → AUTHORIZE → PREPARE
         → SIGN/SUBMIT → OBSERVE RECEIPT → RECONCILE → CONTINUE / HALT
```

Financial execution needs explicit authority stages, so this is deliberately
stricter than a generic observe/decide/act loop. **Never skip a stage because
the previous stage succeeded.** Never jump from observation to action.

The loop is a **loop**, not a line: after reconciliation, an agent normally
returns to observe. But each new cycle re-establishes freshness and re-checks
authority — it does not inherit authority proven in a previous cycle.

---

## 2. Stage contract

Each entry states what the stage proves, what it does **not** prove, and the
failure behaviour.

### OBSERVE

**Prove:** current market, account, session, and activity state, with freshness
attached.

**Does not prove:** that any action is permitted.

**Sources:** session/context reads, event snapshots, activity and receipt
reads, venue/chain state.

**Failure:** stale or missing inputs → refresh before planning. Never plan from
a remembered value.

---

### ORIENT

**Prove:** the risk and constraint posture that planning must respect — the
active limits, breakers, budget state, and which obligations are already open.

**Does not prove:** that a specific action is approved.

**Sources:** context/risk reads, grant limits, budget and reservation state,
authoritative account state.

**Failure:** an unexplained conflict in the oriented state → stop and reconcile
before planning.

**Care:** only source-labeled risk and execution evidence may be used. Do not
invent drift, P&L, oracle, or macro classifications from generic receipt or
event records. Missing fill data is *unknown*, never zero drift.

---

### PLAN

**Prove:** a concrete, parameterized intent — actor, action, chain, protocol,
wallet, params, constraints, and the evidence it rests on.

**Does not prove:** policy compliance, simulation, approval, or authority.

**Sources:** intent creation, route/quote selection, workflow planning.

**Failure:** an under-specified intent → do not proceed to simulation.

**Care:** a plan is not a confirmation. An intent record is not a permission.

---

### SIMULATE

**Prove:** that *this specific transaction identity* passed *that specific
simulation's* checks, at that point in time, within its freshness window.

**Does not prove:** authorization, signature, broadcast, fill, finality, or
profitability.

**Sources:** authoritative simulation for the exact intent/parameters.

**Failure:** missing, stale, failed, or bound to a different transaction
identity → do not prepare or execute.

**Care:** reuse of stale simulation evidence after a relevant state change is
forbidden. Re-simulate.

---

### AUTHORIZE

**Prove:** that a specific action is permitted right now, by a named authority,
inside a named envelope.

**Does not prove:** that the signer is available, that the budget will hold, or
that the action will succeed.

**Sources:** owner-signed grant, fresh user approval, domain-scoped policy,
capability status, live readiness.

**Failure:** any missing, expired, revoked, mismatched, or over-limit
condition → stop. See `authority-model.md`.

**Care:** this is the stage where payment, sessions, and tool discovery must be
explicitly rejected as substitutes.

---

### PREPARE

**Prove:** that a concrete, verifiable artifact exists, bound to the intended
action.

**Does not prove:** that it was signed, submitted, or accepted.

**Sources:** typed data, calldata, digests, order payloads, execution
continuations.

**Failure:** an artifact that is not bound to the intended wallet/chain/protocol/
asset/action/amount/constraints → discard and re-prepare. Never "fix" a
mismatch by hand-editing a prepared artifact.

**Care:** preparation is where budget reservations are created. A reservation
that is not released or committed is a held liability — track it.

---

### SIGN / SUBMIT

**Prove:** that a signature was produced by the legitimate local signer, and
that the signed artifact was dispatched.

**Does not prove:** acceptance, fill, or settlement.

**Sources:** the customer-controlled local signer; the venue/chain submission.

**Failure:** an unavailable or unauthorized signer → stop before submission.

**Care:** the skill never receives key material. Signing happens in the
user's environment, or in the agent runtime that the user authorized under a
grant — never inside the model, and never through a prompt.

---

### OBSERVE RECEIPT

**Prove:** what the receipt actually contains, per its own contract.

**Does not prove:** economic finality, fill quality, realized P&L, or
cross-system agreement.

**Sources:** receipt reads, venue/chain state.

**Failure:** a receipt that is missing or partial → treat the operation as
unresolved, not as failed.

**Care:** a transaction hash is evidence of *submission*. It is not settlement.

---

### RECONCILE

**Prove:** the final known state, and which obligations are closed.

**Does not prove:** that no further action is ever needed.

**Sources:** authoritative chain/venue state, reconciled ledger/account state.

**Failure:** reconciliation that cannot resolve the outcome → keep the
operation unresolved, preserve the held budget, and escalate to the owner.
Do not guess.

**Care:** release or commit budget strictly according to the reconciliation
result, not according to pressure to move on.

---

### CONTINUE / HALT

**Prove:** the explicit decision to proceed to another cycle or to stop.

**Does not prove:** that the next cycle's inputs are still fresh.

**Failure:** when any breaker is active → **HALT** new-risk actions.

---

## 3. Held budget and reservations

Preparation reserves budget atomically. That reservation has its own lifecycle:

```text
reserved → consumed   (submission confirmed)
reserved → released   (aborted before submission)
reserved → held_ambiguous  (submission outcome unknown)
```

`held_ambiguous` is the important state. It means the runtime does **not** know
whether the transaction was submitted.

While held:

- the reserved budget stays held;
- the reservation is not released on the strength of a caller assertion;
- the operation must be reconciled against authoritative chain or venue state;
- dependent legs must not start.

---

## 4. The ambiguous submission rule

Transport failure and timeout do **not** prove failure. They prove that the
outcome is unknown.

```text
Unknown submission outcome is a liability to reconcile, not permission to retry.
```

Procedure:

1. **Mark the outcome ambiguous.** Do not record it as failed or succeeded.
2. **Preserve the held budget/reservation** the runtime requires.
3. **Do not resubmit.** Not automatically, not "just to be safe", not with a new
   nonce. A blind retry can duplicate real risk.
4. **Do not start dependent legs.** An unresolved leg blocks the chain.
5. **Reconcile** against authoritative chain or venue state using the preserved
   operation identity.
6. **Commit or release** the budget strictly according to the reconciliation
   result.
7. **Only then** consider a retry, and only if the outcome was conclusively
   *not submitted* and policy permits it.

Nonce rotation does not make a retry safe. A fresh nonce prevents *replay*; it
does not prevent a *duplicate*.

---

## 5. Circuit breakers

A breaker trips when a deterministic condition holds. When it trips:

- **halt new-risk actions immediately**;
- **preserve evidence** — the exact reason, the revision, and the observed state;
- **allow only explicitly authorized reduction, cancel, and reconcile paths**,
  where the canonical policy permits them, and subject to every authority check;
- **do not work around the breaker.** There is no override that is not itself a
  named, authorized operation.

### Breaker conditions

| Condition | Trip when |
|---|---|
| Capability | a required capability is unavailable or not operational |
| Stale input | a critical required input is stale past its bound |
| Principal | the acting principal cannot be bound unambiguously |
| Grant absent | no valid grant covers the action |
| Grant expired | the grant's validity window has closed |
| Grant revoked | the grant was revoked |
| Scope mismatch | the requested protocol/asset/market/action is outside the grant |
| Chain mismatch | the chain is outside the grant |
| Market mismatch | the market is outside the grant |
| Signer mismatch | the signing identity is not the bound signer |
| Budget exceeded | the action exceeds the grant's value or cumulative limit |
| Max-value violation | the action exceeds the per-transaction limit |
| Replay/nonce failure | the nonce is consumed, stale, or invalid |
| Simulation failed | a required simulation failed or was rejected |
| Policy check failed | the policy gate rejected the action |
| Risk breaker active | an active risk-increase breaker is engaged |
| Ambiguous prior submission | an earlier submission outcome is unresolved |
| Reconciliation failure | the outcome could not be reconciled |
| Missing authoritative status | the required status source is unavailable |

**Stop and report the specific condition.** A generic "cannot proceed" is not
an adequate reason; it hides the next action for the owner.

---

## 6. Recovery after restart or crash

A restart erases in-memory state. It does not erase what already happened.

**"Agent restarted" is never permission to resubmit.**

On resume:

1. **Reconstruct session state** from authoritative runtime records. Do not
   assume the prior session is still valid; check its expiry.
2. **Inspect outstanding intents** and their approval status.
3. **Inspect ambiguous or unresolved submissions** — these are the dangerous
   case, because they may already be live on-chain.
4. **Re-check grant and revocation state.** A grant may have expired or been
   revoked while the agent was down.
5. **Refresh research and simulations.** Anything computed before the restart
   is stale for the purpose of a new decision.
6. **Do not resume risk-taking** until every unresolved outcome is reconciled.
7. **Report what was found** before taking new action: how many operations were
   outstanding, which are ambiguous, and what is being done about them.

Never infer "no local state" to mean "nothing happened".

---

## 7. Reporting the workflow

Report the stages that apply, using explicit state words. The most important
reporting rule:

> Never report a later lifecycle stage than the evidence independently supports.

Useful vocabulary:

```text
not started
prepared (not signed)
signed (not submitted)
submitted (unconfirmed)
ambiguous (awaiting reconciliation)
confirmed
rejected
failed
unresolved
```

Prefer "submitted, unconfirmed" over "done". Prefer "ambiguous, reconciling" over
"failed" when the outcome is genuinely unknown. Precise, unflattering state
reporting is what makes the next safe action obvious.

---

## 8. Reduction and cancellation during a halt

When a breaker has halted new-risk actions, an explicitly authorized
risk-reducing path may still be available.

That exception is scoped narrowly:

- it applies only to actions the canonical policy classifies as
  risk-reducing (cancel, reduce-only, protective, close);
- it still requires the full authority chain — identities, signatures, scope,
  venue authority, and replay checks;
- it is still bound by the same capability status;
- if whether the action is actually risk-reducing is ambiguous, it does **not**
  get the exception.

A risk-reducing exception is a budget exception, never an authority bypass.
