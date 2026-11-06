# Authority Model

How authority is obtained, bound, checked, and lost.

This reference describes the **generalized** authority model. The FarmDash
runtime is the implementation validated against it. Read the runtime's current
machine-readable capability and authority contracts for the live values; do not
trust this document over an actual runtime response.

---

## 1. The proof chain

Execution is a sequence of independent proofs. Each stage must be evidenced on
its own. A later stage is never inferred from an earlier one.

```text
research → decision → policy → simulation → authority → preparation
         → local signing → submission → receipt → reconciliation
```

The operative rule: **if a required proof is unavailable, stop at the highest
proven stage.** Reporting a later stage than the evidence supports is a
correctness failure even when the underlying action would have been permitted.

### Non-inferences

| From | You may **not** infer |
|---|---|
| research | simulation, authority, execution |
| simulation | authority, signature, broadcast, fill, finality |
| payment / subscription | wallet authority, delegation, session grant, spending permission |
| API authentication | wallet authority, signing authority |
| session token | execution authority, chain or venue authority |
| tool discoverability | availability, authorization, readiness, settlement |
| intent record | policy pass, simulation, approval, execution |
| prepared artifact | signature, submission |
| signature | submission, acceptance, fill |
| submission acknowledgement | settlement, finality |
| transaction hash | settlement |
| lifecycle receipt | fill quality, realized P&L, forensic attestation |

---

## 2. Modes

The runtime exposes exactly two execution modes. There is no third, and there
is no unbounded mode.

| Mode | Meaning | Human involvement |
|---|---|---|
| `USER_SIGNED` | The user (or their authorized local signer) approves and signs each action. | Fresh approval for each action. |
| `BOUNDED_AUTONOMOUS` | The owner signed one scoped, revocable grant; the customer's local agent signer may act repeatedly inside it. | One owner authorization up front; **not** per action. |

Two properties hold in both modes:

1. **Zero custody.** The runtime never receives, stores, or transmits a private
   key, seed phrase, or mnemonic. The signing authority stays with the user or
   their customer-controlled local runtime.
2. **Bounded.** Authority is scoped, time-limited, revocable, and
   domain-specific. There is no global "autonomous mode" switch.

### Mode selection is explicit

The runtime's execution-mode contract requires the mode to be selected before
bounded autonomy, and the default resolves to `USER_SIGNED`. An omitted
execution mode resolves to `USER_SIGNED`, never to bounded autonomy.

**Never infer consent to bounded autonomy** from an API key, a subscription
payment, an x402 payment, session creation, prior usage of the product, an
optimization request, a monitoring request, or a generic "just do this for me"
instruction. Bounded autonomy requires an explicit owner-signed authorization.

---

## 3. What an execution grant actually binds

A valid bounded grant binds, at minimum, these dimensions. Missing authority is
not implicit authority; unknown bounds are not unlimited bounds.

```text
owner
execution session
signer identity
execution domain
chain
protocol
asset(s)
action / scope
maximum per-transaction value
cumulative budget
gas ceiling
slippage ceiling
validity window
nonce / replay state
revocation state
```

The runtime's canonical policy-limit dimensions are:

```text
chains
protocols_or_router_contracts
assets
allowed_actions
per_action_value
cumulative_budget
gas
slippage
validity_expiry
revocation
```

### Domain separation is absolute

Authority is per-domain. A grant for one domain does not authorize another.

```text
spot delegation ≠ futures delegation
futures delegation ≠ solana delegation
spot ≠ generic intent execution
spot ≠ ERC-4337 server submission
```

Never authorize a futures action with a spot grant, a cross-chain action with a
single-chain grant, or a server-submission path with a local-signer grant.

### Grant validity checks

The FarmDash runtime enforces a concrete set of boundary invariants before an
autonomous transaction may proceed. The generalized form of each:

| # | Check | Failure is a hard stop |
|---|---|---|
| 1 | Grant status is active | revoked / inactive → stop |
| 2 | Owner matches the acting owner | stop |
| 3 | Session matches the current session | stop |
| 4 | Signing key matches the bound signer | stop |
| 5 | Chain is inside the grant | stop |
| 6 | Action is inside the allowed action set | stop |
| 7 | Current time is inside the validity window | not-yet-valid / expired → stop |
| 8 | Target protocol is in the allowlist (empty ≠ allow-all) | stop |
| 9 | Both sell and buy assets are in the allowlist (empty ≠ allow-all) | stop |
| 10 | Amount ≤ per-transaction limit | stop |
| 11 | Amount ≤ remaining cumulative budget | stop |
| 12 | Gas cost ≤ gas ceiling | stop |
| 13 | Slippage ≤ slippage ceiling | stop |
| — | Policy hash matches the bound policy | stop |

Empty allowlists **fail closed**. An allowlist with no entries is not a
wildcard.

### The signer binding is strict in the current implementation

The validated EOA-V1 path requires the grant's session public key to equal the
owner address, and the transaction signer to be the authorized owner EOA in the
customer's local agent runtime. A separate delegated session-signer path is not
supported in that mode; it belongs to the not-yet-operational smart-account /
ERC-4337 path. A request to bind a different signer is rejected.

---

## 4. Identity, authentication, delegation, authority

These are four different things. Conflating any pair is a security failure.

| Concept | Proves | Does **not** prove |
|---|---|---|
| **Identity** | which principal is involved | that it may act |
| **Authentication** | the caller is who it claims to be | that it may move funds |
| **Delegation** | the owner authorized a scoped envelope | that the envelope fits this action |
| **Execution authority** | this specific action is permitted now | anything about the next action |

A valid session proves session access. It does not prove permission to move
funds.

### The session token specifically

A `sessionToken` binds and authenticates a session as the runtime defines it. It
is:

- sensitive (treat it as a secret; never echo it in prose or logs);
- **not** a wallet signature;
- **not** a delegation grant;
- **not** chain or venue authority;
- scoped to the session it was issued for.

A new session does not inherit another session's delegation.

---

## 5. Delegation verification honesty

Do not claim a delegation is cryptographically verified when the required
signature inputs are unavailable.

In the validated FarmDash implementation, `verify_delegation` may report:

```text
unavailable_mcp_signature_inputs
```

with the owner-signed HTTP verification path as the documented alternative.
When the MCP path cannot satisfy its signature inputs:

- **do not** fabricate the inputs;
- **do not** approximate or synthesize a signature;
- **do not** infer authority from account metadata, balances, or prior success;
- use only the separately supported owner-signed verification path when it is
  legitimately available;
- otherwise stop and report that delegation authority remains unverified.

Tool existence is not successful verification. A tool that is discoverable but
whose required inputs cannot be supplied has proven nothing about authority.

---

## 6. Discovery proves presence, not permission

MCP discovery and task-scoped discovery profiles are **routing aids**. They let
an agent find the right tool faster.

Discovering a tool proves only that the tool exists in the presented capability
surface. It does not prove:

- availability;
- authorization;
- signing authority;
- tier or entitlement eligibility;
- runtime readiness;
- settlement capability.

Use discovery for routing efficiency. Use the runtime's own capability and
status contract for every permission question.

---

## 7. Commercial access is capacity, not authority

Payment, subscription tier, and metered-access overage buy **capacity** —
request volume, concurrency, and which surfaces are reachable at all.

They never establish:

- wallet ownership;
- signing authority;
- delegation;
- a session grant;
- permission to spend.

The runtime encodes this directly. Its authority-separation contract asserts:

```text
payment_grants_execution_authority        = false
api_authentication_grants_wallet_authority = false
session_grants_execution_authority         = false
farmdash_receives_private_keys             = false
```

Do not weaken policy because access has been paid for. Do not treat a paid
tier as an authority upgrade.

---

## 8. Revocation

Revocation is authoritative and immediate.

When a grant, session, or policy is revoked:

- stop new actions covered by it;
- do **not** reuse a cached authorization result;
- invalidate dependent preparation as the runtime requires;
- reconcile any already-submitted operation separately.

Revocation does not un-submit transactions that were already submitted, and it
does not erase on-chain effects. It removes forward authority.

---

## 9. Mode-appropriate confirmation

Confirmation semantics must follow the actual mode, not a blanket rule.

**`USER_SIGNED`** — fresh, appropriate user approval/signature is required for
the specific action, as the canonical contract requires. Never reuse an old
confirmation for a materially changed transaction.

**`BOUNDED_AUTONOMOUS`** — do **not** artificially demand per-action human
confirmation when a valid grant explicitly permits autonomous execution.
Doing so collapses bounded autonomy into human-in-the-loop and is incorrect.

But every grant, scope, runtime, simulation, budget, signer, and replay check
remains mandatory in both modes. "The grant permits it" is the *start* of the
check, not the end of it.

The distinction to preserve:

```text
human-in-the-loop always          ≠   human-defined bounded authority
```

---

## 10. Risk reduction is not an authority bypass

Some runtimes permit risk-reducing actions — cancel, reduce-only, protective,
close — under different budget treatment from risk-increasing actions, and
sometimes allow them to survive an exhausted new-risk allowance or an active
risk-increase breaker.

That is a **budget exception, not an authority bypass**. A reduction still
requires:

- valid venue delegation and grant;
- correct identities and session;
- correct market and action scope;
- validity, expiry, and revocation checks;
- the required local signature;
- builder/venue requirements;
- replay protection.

**If it is ambiguous whether an action is actually risk-reducing, do not grant
it the exception.** An ambiguous reduction is not a proven reduction.

---

## 11. Failure semantics

The runtime's failure model is fail-closed. The generalized rule:

> When a required proof cannot be obtained, the safe outcome is the smaller
> action — more preparation, more observation, or an explicit stop — never a
> larger one.

The safest available answer is frequently an accurate refusal that names the
missing invariant. That is a successful outcome, not a failure to complete.
