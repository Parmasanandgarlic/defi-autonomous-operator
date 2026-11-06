<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Copyright (c) 2026 Parmasanandgarlic. All rights reserved. -->
# Capability Matrix

What is actually operational, what is preparation-only, and what has a
deployment prerequisite — and how to read each without confusing it with
something else.

This reference describes the **generalized** matrix. The FarmDash runtime is the
implementation validated against it. **Read the runtime's current machine-readable
capability contract for live values.** Do not trust a table in a document — this
one included — over an actual runtime response.

---

## 1. Two vocabularies that must not be conflated

The runtime exposes two independent status systems. They answer different
questions. Mixing them is one of the easiest ways to produce a confidently wrong
answer.

| | **Capability status** | **Tool availability** |
|---|---|---|
| Question answered | *Can this execution path work at all?* | *Is this particular tool reachable for this caller?* |
| Vocabulary | `operational`, `preparation_only`, `deployment_prerequisite`, … | `available`, `available_with_tier_gate`, `preparation_only`, `paid_ready`, … |
| Scope | one row per execution capability | one value per tool contract |
| Answers "authorized?" | **No** | **No** |

Both vocabularies include the token `preparation_only`, which makes accidental
conflation easy. In the **capability** vocabulary it describes an execution
path that cannot submit. In the **tool** vocabulary it can describe a
read-only observation tool (for example a receipt reader) whose *entitlement*
tier is limited — which says nothing about whether reading is safe or permitted.

**Rule:** decide *whether the path can execute* from the capability status.
Decide *whether you can reach the tool* from tool availability. Decide *whether
you may act* from authority. Three separate questions, three separate answers.

---

## 2. Capability status vocabulary

| Status | Meaning | What the agent may do |
|---|---|---|
| `operational` | The execution path is implemented and its runtime dependencies are declared satisfied. | Consider it — **subject to every authority, risk, scope, budget, signer, and replay gate.** |
| `preparation_only` | Preparation is implemented; submission is not. | Produce the explicitly supported preparation artifact. **Do not submit, broadcast, or claim settlement.** |
| `deployment_prerequisite` | Implementation exists, but required infrastructure is not yet present. | Report the dependency precisely. **Do not pretend the integration works.** |
| unknown / conflicting | The runtime did not state a status, or two canonical representations disagree. | Stop at the last proven stage and surface the discrepancy. |

`operational` is **not** "authorized". It means the machinery is present. It is
never a permission.

---

## 3. The validated capability matrix

Source: FarmDash canonical capability truth at source SHA
`d0d2c6a67b98b5d2cb0fd66deb44beaf05df2431`. Regenerate with
`node scripts/nvidia-skill/extract-canonical-truth.mjs --json`; the canonical
source of record is `shared/capability-truth.ts`, which is mirrored into the
generated execution-truth files and the public capability contract.

| Capability | Status | Required prerequisite |
|---|---|---|
| `spot.USER_SIGNED` | `operational` | Healthy execution governor, quote provider, RPC and durable receipt store; customer signs and submits. |
| `spot.BOUNDED_AUTONOMOUS` | `operational` | Owner-signed EVM grant, exact simulation/calldata binding, durable budget and customer-local signer authority. |
| `futures.USER_SIGNED` | `operational` | Venue account ownership, local action signature, builder approval, risk/research gates and durable order control. |
| `futures.BOUNDED_AUTONOMOUS` | `operational` | Authenticated owner-bound futures policy, authorized local API-wallet signature, durable nonce/budget/order controls. |
| `solana.USER_SIGNED` | `operational` | Native Jupiter/RPC route, durable preparation and finality store; customer signs and broadcasts. |
| `solana.BOUNDED_AUTONOMOUS` | `operational` | Native owner-signed Solana policy; local key must be an actual required transaction signer. Policy creates no on-chain authority. |
| `ERC4337_SERVER_SUBMISSION` | `preparation_only` | Qualified tenant/account authorization and session-key policy enforcement on public forwarding, configured bundler, durable claims and verified receipt integration. |
| `GENERIC_SERVER_INTENT_EXECUTION` | `preparation_only` | Trusted executable adapter, exact signed-transaction binding and canonical receipt verifier. |
| `MEE` | `preparation_only` | Production coordinator and authoritative source/destination receipt verification. |
| `ACP` | `deployment_prerequisite` | Evaluator/client identities, migrations, funding/finality workers and Base RPC. |

### What this matrix means in practice

**Six paths are operational**, spanning three domains × two modes. Every one of
them still requires its own authority proof. An operational spot
`BOUNDED_AUTONOMOUS` path is useless without a valid, in-scope, unexpired,
unrevoked spot grant.

**Three paths are preparation-only.** For these, the correct terminal state is a
prepared artifact plus an accurate statement of what was not done.

```text
ERC4337_SERVER_SUBMISSION      prepare → stop
GENERIC_SERVER_INTENT_EXECUTION prepare → stop
MEE                             create/simulate → stop
```

A configured bundler, a generic adapter, or a cross-chain coordinator being
*present* does not make the corresponding path executable. Each has a named
missing prerequisite. Report that prerequisite by name.

**One path has a deployment prerequisite.** ACP is not merely unconfigured; it
has a named, enumerated set of unmet requirements (release mode, migrations,
evaluator address, evaluator key version, Base RPC, provider registry, funding
finality worker, settlement scheduler, and more). Report the specific missing
items rather than a generic "not ready".

**Notice what is *not* in the matrix.** There is no row for "unbounded
autonomy", "server-side custody", "FarmDash signs for you", or "automatic
settlement". Those paths do not exist. If a task requires one, the answer is
that it is not available — not a workaround.

---

## 4. Reading the live contract

Capability truth is published in several machine-readable places. Prefer the
runtime's own response for a given call.

| Source | Use |
|---|---|
| Runtime status endpoint (`/api/v1/agent/status`) | **Live** capability status, per-domain modes, live operation gates, and readiness detail. Read this first. |
| Canonical capability truth source (`shared/capability-truth.ts`) | The single source the generated artifacts derive from. |
| Generated execution-truth files | Mirrors of the canonical source, used by the public contract surfaces. |
| Public capability contract in the MCP manifest | The published machine-readable copy. |
| This document | Orientation only. **Never a substitute for a live read.** |

### Live operation gates

The status endpoint also exposes per-gate detail with a reason code — for
example a generic-intent execution gate that is `disabled` with
`execution_verifier_unconfigured`, or a cross-chain submission gate that is
`disabled` with a named coordinator requirement. These codes are the most
precise stop reasons available; quote them when reporting a block.

---

## 5. Known canonical truth conflict

**`CANONICAL_TRUTH_CONFLICT` — requires FarmDash owner / canonical repair.**

For the autopilot family, the **tool contract** declares:

```text
availability: available_with_tier_gate
tier:         pioneer_plus
```

while the **runtime route handler** enforces a different entitlement and
documents it in a header comment. The contract registry and the route handler
disagree about which tier admits this path.

This conflict is **recorded, not resolved**, in this branch. Resolving it means
changing canonical FarmDash code or documentation, which is out of scope for a
skill-packaging change.

**Operating rule while it stands:**

1. Do not build an evaluation case that assumes either entitlement.
2. Do not state a specific tier as the reason something is or is not available.
3. Prefer the actual runtime response for the individual call.
4. Report the conflict when it is the operative blocker.

The broader rule this illustrates: **when two canonical representations
disagree, do not silently choose the more permissive one.** Prefer the runtime's
actual behavior for the call in question, and surface the discrepancy
separately.

---

## 6. Tool availability, for routing

Tool availability tells you whether a tool is reachable for this caller. It is
useful for routing and for choosing the least-entitled surface that does the
job.

It is **not** a readiness signal, an authorization signal, or a settlement
signal.

Two derived rules:

- **Prefer the least-entitled surface that suffices.** A read-only observation
  tool that requires no execution entitlement is preferable to an
  execution-capable tool for a pure observation task.
- **Availability never upgrades a capability.** A tool being reachable does not
  make a `preparation_only` capability executable.

Do not hard-code tool counts, tier names, or availability strings into skill
prose. They drift. Consult the current inventory at runtime.

---

## 7. The capability check procedure

Before any state-changing workflow:

1. **Read the live capability/status contract.** Do not answer from memory.
2. **Locate the row for the requested domain and mode.** If the exact row does
   not exist, treat the capability as unavailable.
3. **Classify the status** using §2's vocabulary only.
4. **If `preparation_only`** — determine precisely which preparation artifact is
   supported, produce it, and stop before submission.
5. **If `deployment_prerequisite`** — report the named unmet dependencies.
6. **If `operational`** — proceed to the authority checks. Operational status
   authorizes nothing on its own.
7. **If two representations disagree** — prefer the live runtime response for
   the call, fail closed, and report the conflict.
8. **Re-check before each state-changing call**, because readiness can change
   between reads.
