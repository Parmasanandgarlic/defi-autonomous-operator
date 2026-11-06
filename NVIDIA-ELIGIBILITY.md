# NVIDIA Eligibility Decision Record

**Subject:** `defi-autonomous-operator` (NVIDIA-trust-pipeline edition)
**Status:** Decision recorded; build continues.
**Date:** 2026-11-05
**FarmDash authoring SHA:** `d0d2c6a67b98b5d2cb0fd66deb44beaf05df2431`
**FarmDash base SHA (current main):** `1cf30a0814546d3a7c387489d02debdc6964fea7`
**NVIDIA reference revision:** `NVIDIA/skills` @ `994ac018306c10423892ad3d0afb066c58532a2f`

---

## 1. Decision

```text
Classification: NVIDIA-TRUST-PIPELINE-CANDIDATE
```

Not `NVIDIA-INTEGRATED`. Not `NVIDIA-RUNTIME-COMPATIBLE`. Not `NVIDIA-VERIFIED`.
Not `NVIDIA-SUBMISSION-READY`.

**What this means in one sentence:** this is an external, third-party skill that is
authored and evaluated against NVIDIA's open Agent Skills trust pipeline, with
**zero** NVIDIA verification, endorsement, sponsorship, or catalog inclusion
claimed at this time.

The reviewer's framing is adopted exactly: the build continues, and the artifact
is qualified to NVIDIA's engineering standard while making no claim that it has
passed NVIDIA's organizational gates.

---

## 2. Why the catalog path is blocked

### 2.1 What NVIDIA's catalog actually is

`NVIDIA/skills` is an **aggregation and mirroring layer**, not a submission
target for arbitrary third-party skills. Its own `README.md` states:

> "This repository is a catalog: skills are maintained in their respective
> product repos, and mirrored here daily via an automated sync pipeline."

The mirroring mechanism is `.github/workflows/sync-skills.yml`, which reads
`components.d/<slug>.yml` component definitions and rsyncs skill directories
from the declared source repositories. A skill reaches the catalog by being
**mirrored from a source repo**, not by being hand-delivered in a pull request.

### 2.2 The onboarding gate

`.github/PULL_REQUEST_TEMPLATE.md`, "For new product onboarding — author
affirmations", requires the contributor to confirm:

> - [ ] **Source repo is public and under an NVIDIA-owned GitHub org**

### 2.3 FarmDash fails both conditions, today

| Condition | FarmDash state | Evidence |
|---|---|---|
| Source repo is **public** | **FAIL** — repository is private | `gh repo view hububstudio/farmdashbeta --json isPrivate` → `{"isPrivate":true,"visibility":"PRIVATE"}` |
| Source repo under an **NVIDIA-owned org** | **FAIL** — owned by `hububstudio` | `gh repo view … --json url` → `https://github.com/hububstudio/farmdashbeta` |

Making the repository public under `hububstudio` would satisfy only half the
gate. It would still not satisfy the org requirement, and it would publish
proprietary product code — an owner decision, not an engineering one.

### 2.4 The precedent is universal, not incidental

Every component in the catalog resolves to an NVIDIA-affiliated organization.
Distribution across all 63 `components.d/*.yml` entries:

```text
  32 NVIDIA                    6 NVIDIA-NeMo            6 NVIDIA-BioNeMo
   4 NVIDIA-AI-Blueprints      3 nvidia-holoscan         2 NVIDIA-Omniverse
   2 NVIDIA-AI-IOT             1 rapidsai                1 NVIDIA-TAO
   1 nvidia-riva               1 NVIDIA-Medtech          1 nvidia-isaac
   1 NVIDIAGameWorks           1 NVIDIA-DOCA             1 isaac-for-healthcare
   1 dsx-ai-factory            1 ai-dynamo
```

Zero external third-party organizations. `rapidsai` and `ai-dynamo` are
NVIDIA-affiliated project orgs, not outside vendors.

### 2.5 External contributions are possible, but narrow

`CONTRIBUTING.md` does permit external contributions to the catalog repository
itself (catalog changes, link fixes, product listings), and
`.github/external-contributors.yml` shows a single recorded precedent (PR #76,
a dead-link fix). That path is for **catalog maintenance**, not for onboarding a
third party's skill directory with a third party's source repo. The workflow
requires maintainer review and a maintainer-written allowlist entry scoped to
specific PR numbers — it does not create a product-onboarding lane for external
repos.

### 2.6 The fork-based contribution workflow (maintainer-enabled, not automatic)

`CONTRIBUTING.md` also describes a **maintainer-enabled fork-based workflow** for
skills maintained in an owning product repository. This is a real external route
and should be recorded rather than treated as the only option — but it is
**not automatic eligibility**, and it carries obligations this project does not
yet meet:

1. **NVSkills CI maintainers must enable the source repository and its signing
   workflow first.** The repository is enabled explicitly; absence of that
   enablement means no contribution is accepted from it, regardless of quality.
2. **Every contribution commit requires DCO sign-off** — a `Signed-off-by`
   trailer attesting that the contribution is original work or that the
   contributor has rights to submit it under the same or a compatible license.
   **Every commit in this repository now carries that trailer.** It is the
   owner's genuine attestation, not a fabricated one.
3. The skill must be licensed under **Apache 2.0, CC-BY 4.0, or dual
   Apache 2.0 + CC-BY 4.0**, and the source repository must not introduce a new
   or incompatible license. **This package is Apache 2.0** and satisfies this
   requirement. See `skills/defi-autonomous-operator/references/NOTICE.md`.
4. NVIDIA's trust pipeline (security scanning, evaluation, OMS signing,
   governance review) is specific to the **official NVIDIA path**. Distributing
   this skill externally and evaluating it with NVIDIA's *open* tooling is a
   different thing: it uses the public validators but does **not** constitute
   NVIDIA verification and does **not** confer an NVIDIA signature.

**Conclusion:** `hububstudio/farmdashbeta → NVIDIA/skills` is not a valid
submission path under current NVIDIA conventions, and the fork-based route
requires maintainer enablement plus DCO sign-off plus an accepted license —
none of which currently hold. This record is honest about all three.

---

## 3. The architectural question: is there a real NVIDIA reason to exist?

The reviewer's standard is the correct one, taken from
`skills/portfolio-optimization` — a financial skill that exists *because* it
performs portfolio optimization with NVIDIA cuOpt/cuML GPU infrastructure and
that explicitly refuses to substitute generic CPU optimization:

> "do not reimplement the example workflows from scratch, and do not replace the
> package APIs with generic pandas/scipy/cvxpy portfolio code."

### 3.1 The candidates evaluated

| Candidate | Is it relevant? | Does it improve the product? | Testable? | New credential/security boundary? | Changes deterministic execution semantics? | Dependency FarmDash doesn't need? |
|---|---|---|---|---|---|---|
| **NVIDIA NemoClaw + OpenShell** (sandbox, credential custody, operator-controlled egress) | **Yes — directly** | **Yes** | Partially (early preview; Linux/DGX Spark are the tested platforms) | Yes — but it *removes* a boundary rather than adding one | **No** | **No** |
| NIM / Nemotron hosted inference | Weakly — changes which model reasons, not what is authorized | No — the authority contract is model-independent | Yes, but needs an NVIDIA API key | Yes — new credential | No | Yes — FarmDash needs no specific model |
| Nemotron fine-tuning / specialization | No — the skill is a governance artifact, not a reasoning-quality problem | No | Yes, but needs GPU + labeled data | Yes | No | Yes |
| NeMo Agent Toolkit orchestration | No — FarmDash's lifecycle is already deterministic and server-enforced | No — reimplementing orchestration would weaken the determinism this skill depends on | Yes | Yes | **Yes, harmfully** | Yes |
| NVIDIA AI-Q / enterprise retrieval | No | No | — | — | — | Yes |
| cuOpt / cuML GPU optimization | Weakly — could accelerate a sizing solver, but sizing is already server-enforced and the skill must not introduce a second optimizer | No — introduces a second source of truth for sizing | Yes | Minor | Yes | Yes |

### 3.2 The one defensible answer

**NVIDIA NemoClaw / OpenShell is the only candidate that is both relevant and
materially useful, and it is useful for a reason that is specific to *this*
skill rather than to skills in general.**

OpenShell enforces, at the runtime boundary, the exact properties this skill
otherwise has to teach in prose:

| Skill invariant | OpenShell enforcement |
|---|---|
| Credential custody stays outside the agent | "Keeps inference credentials and managed MCP bearer values outside the sandbox" |
| The agent may not reach unapproved destinations | "OpenShell blocks unapproved destinations and surfaces requests for operator review" |
| Session/authorization material is not agent-readable | Managed MCP credential delivery at the egress boundary |
| Least privilege over network, filesystem, process | "documented filesystem, process, and network controls" |

And NemoClaw **explicitly onboards Hermes Agent** — the harness FarmDash's
skill format is written for — so the integration is a supported path, not a
hypothetical:

> "Run supported agents — Onboards OpenClaw, Hermes, or LangChain Deep Agents
> Code into an agent-specific sandbox image and configuration."

`skills/nemoclaw-user-guide` is itself present in the catalog, so the
integration target is a first-class NVIDIA product with published agent-facing
documentation.

### 3.3 What this integration does **not** do

Stated plainly, because the distinction is the whole point:

- It does **not** grant any financial authority. OpenShell constrains *where*
  the agent may go and *what credentials* it may see. It cannot create a
  delegation, satisfy the 13 grant invariants, or substitute for an owner
  signature. **Sandboxing is not authorization.**
- It does **not** change FarmDash's execution semantics. The grant, nonce,
  simulation, and receipt contracts are unchanged.
- It does **not** require FarmDash to depend on NVIDIA. FarmDash runs the same
  with any harness and any sandbox.
- It is **not** implemented in this branch. See §5.

**This makes the relationship `NVIDIA-RUNTIME-COMPATIBLE` in the weak sense —
the skill can operate inside an OpenShell sandbox — not `NVIDIA-INTEGRATED`,
which would require an NVIDIA product to participate materially in the
FarmDash workflow. It does not.**

---

## 4. What the skill will and will not claim

| Claim | Allowed? | Basis |
|---|---|---|
| "Authored and evaluated with NVIDIA's open Agent Skills trust tooling" | **Yes** | SkillEvaluator + SkillSpector are open-source and actually run against this directory |
| "Follows NVIDIA's Agent Skills packaging and trust conventions" | **Yes** | Structure, frontmatter, eval schema, and release packet match current NVIDIA schema |
| "Qualified against NVIDIA's open evaluation tooling" | **Yes, with exact scope** | Only after a real run, and only for the tier that actually ran |
| "Operates correctly inside an NVIDIA OpenShell sandbox" | **Only with evidence** | Requires an actual OpenShell run; **not yet performed** → must be `UNVERIFIED` until it is |
| "NVIDIA-integrated" | **No** | No NVIDIA product participates in the FarmDash workflow |
| "NVIDIA-verified" | **No** | NVIDIA has not reviewed, scanned, scored, signed, or published this artifact |
| "NVIDIA-approved" / "submission-ready" | **No** | The onboarding gate in §2 is unmet |
| Any claim that NVIDIA owns, sponsors, or endorses this skill | **No** | No NVIDIA relationship exists |

---

## 5. The NemoClaw / OpenShell integration — status and plan

**Status: `NOT_IMPLEMENTED` — `REQUIRES_OWNER_APPROVAL`.**

Rationale for not implementing it inside this branch:

1. **It changes the distribution model, not just the skill.** OpenShell enforces
   its policies at the sandbox boundary. That policy lives in the host's YAML
   network policy and sandbox configuration — i.e. in the *operator's*
   deployment, not inside a portable skill directory. Putting it inside the
   skill would either be inert (a document describing someone else's config) or
   would smuggle deployment policy into a distributable artifact.
2. **It cannot be honestly claimed from here.** OpenShell is an early-preview
   reference stack whose primary tested platforms are Linux and DGX Spark. This
   host is Windows 10. Any "works with OpenShell" claim would be untested.
3. **It risks the determinism this skill depends on.** The whole safety
   argument is that authority is decided by server-enforced contracts. A
   sandbox adds a *second* enforcement layer. Two layers are good; two layers
   where the agent can only observe one of them is how agents get confused
   about which control actually gates an action.
4. **The PRD's own test for integration applies.** Section 48 asks: "Does it
   create a dependency FarmDash does not need?" For the *skill artifact*, the
   answer is yes — FarmDash needs no NVIDIA runtime. So the integration belongs
   in **deployment documentation**, not in the skill's execution contract.

**Therefore, the correct implementation is:**

- A `references/nemoClaw-openShell-deployment.md` reference that describes
  how to run this skill inside an OpenShell sandbox, with an explicit statement
  that OpenShell is **deployment hardening, not authority**, and that every
  FarmDash authority gate still applies unchanged.
- An `evals/` case that verifies the agent does **not** treat sandboxing as
  authorization (a new, meaningful adversarial case: *"the sandbox blocks
  outbound network access, so the agent considers the grant unnecessary"*).
- A `SUBMISSION-RUNBOOK.md` that separates the two artifacts:
  - **Artifact A** — the skill directory (portable, harness-agnostic, no
    NVIDIA runtime dependency).
  - **Artifact B** — an optional OpenShell policy preset + deployment guide
    (NVIDIA-specific, lives with the operator's deployment, not in the signed
    skill directory).
- An `NVIDIA-ELIGIBILITY.md` statement that any NVIDIA relationship would
  require **an NVIDIA team to own or sponsor a public source repo**. That is an
  organizational action outside this branch's authority.

---

## 6. Unresolved acceptance risks

| Risk | Severity | Status |
|---|---|---|
| Source repo private and not NVIDIA-owned | **Blocker** for catalog onboarding | Owner decision required; not engineer-resolvable |
| No NVIDIA team owns or sponsors a public source repo | **Blocker** | Requires NVIDIA-side organizational action |
| OpenShell integration untested on this platform | **Medium** | Documented as `UNVERIFIED`; deferred to an approved deployment task |
| Tier 3 live evaluation needs a provider key + Docker | **Medium** | `BENCHMARK.md` stays `PENDING_OFFICIAL_PIPELINE` until genuinely run |
| OMS signing requires NVIDIA credentials | **Blocker** for a signed artifact | `skill.oms.sig` stays `PENDING_OFFICIAL_PIPELINE`; never fabricated |
| Catalog skill named `portfolio-optimization` covers cuOpt-based finance | **Low** | No semantic collision — different problem class (optimizer vs execution-governance operator) |

---

## 7. Distribution strategy (the actual path to users)

Because the NVIDIA catalog lane is closed, the qualified artifact ships through
channels that accept external skills today:

1. **Hermes Skills Hub** — NVIDIA's own investor-relations announcement confirms
   verified NVIDIA skills are syndicated to "Skills.sh, Codex plugin, Claude
   Code plugin, ClawHub, **Hermes Hub**". This is a supported external
   distribution surface, and it is where a non-NVIDIA-authored skill can
   legitimately appear.
2. **ClawHub** — the canonical OpenClaw packaging channel. The NVIDIA edition
   is a separate, independently maintainable directory; the OpenClaw edition
   remains untouched.
3. **skills.sh** (`npx skills add …`) — the Agent Skills CLI flow NVIDIA's own
   README documents.
4. **This repository** — the source of truth, with the full release packet and
   provenance, for anyone who wants to verify or self-host it.

The trust pipeline (SkillEvaluator → SkillSpector → Tier-3 → skill card → OMS
signature) is the *same* regardless of which channel carries the bytes. That is
what makes the artifact worth qualifying even without a catalog slot.

---

## 8. What would have to change for a genuine NVIDIA relationship

Stated concretely, so the owner can evaluate the real cost:

1. **A public source repo.** Either FarmDash publishes the skill under a public
   repo, or (more likely) it is mirrored into a repo that an NVIDIA team
   already owns and that team is willing to sponsor.
2. **An NVIDIA owner.** A team at NVIDIA that agrees the capability belongs in
   the catalog and will maintain the `components.d/<slug>.yml` entry and the
   signing path. This cannot be engineered from outside NVIDIA.
3. **A product-coupling story that survives scrutiny.** The portfolio-optimization
   precedent requires the NVIDIA component to be *doing the work*, not decorating
   it. If NemoClaw/OpenShell is the coupling, NVIDIA must consider OpenShell
   enforcement to be intrinsic to the workflow, not an optional deployment
   choice.
4. **A catalog PR** adding `components.d/<slug>.yml` with `repo:`,
   `description:`, and `skills[].path`, followed by the `/nvskills-ci` request
   flow and the OMS signing gate.

Until all four hold, this artifact is **an external skill qualified with
NVIDIA's open tooling** — which is a real and defensible achievement, provided
it is described exactly that way.
