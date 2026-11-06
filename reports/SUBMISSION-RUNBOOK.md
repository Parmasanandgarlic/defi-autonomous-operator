# Submission Runbook — `defi-autonomous-operator`

From a qualified FarmDash PR to NVIDIA publication. Each stage is listed
separately and must be satisfied independently. **Do not compress these into a
single status.**

---

## 0. Current position

| Stage | Status |
|---|---|
| FarmDash engineering complete | ✅ **COMPLETE** |
| FarmDash PR merged | ⬜ **NOT STARTED** — PR opened for owner review, not merged |
| NVIDIA evaluator complete | ⬜ **PENDING** — Tier 2 + Tier 3 need credentials + Docker |
| NVIDIA security gate complete | ⬜ **PENDING** — NVIDIA-operated |
| NVIDIA governance card complete | ⬜ **PENDING** — card generated locally; NVIDIA review outstanding |
| OMS signing complete | ⬜ **PENDING** — requires NVIDIA / model-signing credentials |
| Signature verified | ⬜ **PENDING** — follows signing |
| Submission accepted | ⬜ **PENDING** — requires an eligible intake path (§ 3) |
| Catalog mirrored | ⬜ **PENDING** — NVIDIA-operated |
| Public install verified | ⬜ **PENDING** — follows mirroring |

---

## 1. Owner decisions required before anything else

1. **Merge the FarmDash PR.** The branch is complete and validated but is not
   merged, and the owner must approve it. Nothing downstream can be published
   from an unmerged branch.
2. **Choose the distribution path.** See § 3 — this is currently blocked by a
   repository-visibility and ownership constraint that no amount of engineering
   work removes.
3. **Decide whether to supply evaluation credentials** so Tier 2 and Tier 3 can
   be executed locally before handing off (§ 2).
4. **Decide whether to open the source repository publicly.** This is a
   prerequisite for NVIDIA catalog onboarding and is currently the binding
   constraint.

---

## 2. Complete the locally-runnable evaluation gates

These two gates are pending because the required provider credentials and the
Docker environment were unavailable when this was prepared. That is the whole
reason; no stronger conclusion is established by their absence.

### 2.1 Tier 2 — semantic deduplication

Requires an embedding provider.

```bash
# NVIDIA Build (recommended for an NVIDIA submission path)
export SKILL_EVAL_EMBEDDING_PROVIDER=nv_build
export NVIDIA_API_KEY='<key>'      # https://build.nvidia.com

# or another supported provider
export SKILL_EVAL_EMBEDDING_PROVIDER=openai
export OPENAI_API_KEY='<key>'

skillevaluator validate skills/defi-autonomous-operator --tiers 1,2
```

**Exit condition:** Tier 2 reports a result (not `SKIP`), and the run does not
introduce a duplicate-content finding that requires remediation.

### 2.2 Tier 3 — live paired agent evaluation

Requires a provider credential **and** Docker Compose v2.

```bash
export SKILL_EVAL_LLM_PROVIDER=nv_build
export NVIDIA_API_KEY='<key>'
docker compose version        # must report v2

skillevaluator validate skills/defi-autonomous-operator --tiers 1,2,3 \
  --block-on-agent-eval --report cli,json,markdown --output-dir reports/tier3
```

**Exit conditions:**

- Tier 3 completes with per-dimension scores for correctness, security,
  discoverability, negative routing, effectiveness, efficiency, truthfulness,
  and recovery discipline;
- **the with-skill vs. without-skill comparison is present** — a run without a
  baseline is not the paired comparison the methodology requires;
- **zero** high-severity safety failures (the § 11 blocker list in
  `VALIDATION-REPORT.md`);
- every dimension passes its band for at least one supported agent.

### 2.3 Regenerate the benchmark

```bash
skillevaluator validate skills/defi-autonomous-operator --tiers 1,2,3 \
  --report cli,json,markdown --output-dir reports/tier3
cp reports/tier3/BENCHMARK.md skills/defi-autonomous-operator/BENCHMARK.md
```

**This must be the last mutation to the skill directory before signing.** A
`BENCHMARK.md` regenerated after the signing run invalidates the signature —
this is exactly the defect NVIDIA's `verify_source_onboarding.py` was written to
catch.

Verify the new verdict:

```bash
grep -E "Overall verdict|^\| Tier" skills/defi-autonomous-operator/BENCHMARK.md
```

**Exit condition:** verdict is `PASS` with recorded evaluator version, dataset
digest, agents, tasks, attempts per task, and environment. If it is still
`INCOMPLETE`, the run did not complete and the gate is not satisfied.

---

## 3. Establish an eligible NVIDIA intake path

**Current blocker.** NVIDIA's catalog mirrors skills maintained in product
repositories. The onboarding PR template requires the source repository to be
**public** and under an **NVIDIA-owned GitHub org**. All 63 catalog
`components.d/*.yml` entries point at NVIDIA-affiliated orgs; there are zero
external third-party entries.

The FarmDash repository `hububstudio/farmdashbeta` is **private** and is not
under an NVIDIA org.

Consequences:

- A direct PR from `hububstudio/farmdashbeta` to `NVIDIA/skills` is **not a
  valid submission path**.
- Making the repository public under `hububstudio` still does not satisfy the
  "NVIDIA-owned org" checkbox.

### Options, in order of defensibility

**Option A — NVIDIA-partnered intake (requires an NVIDIA relationship).**
The correct path if FarmDash engages NVIDIA directly: the skill is mirrored
from a source repo NVIDIA owns or has explicitly onboarded, and NVIDIA's own
automation produces the catalog entry, trust state, and signature.

*Requires:* an NVIDIA sponsor and an onboarding decision. Nothing FarmDash can
do unilaterally.

**Option B — Publish on FarmDash-controlled channels, use NVIDIA tooling
internally.** Distribute through the channels FarmDash controls (Hermes,
ClawHub, skills.sh) with the NVIDIA trust pipeline run as an internal quality
gate, and make **no** NVIDIA verification claim.

*This is the current classification's distribution path.* It is honest and
fully deliverable today.

**Option C — Open a discussion with NVIDIA about third-party eligibility.**
Before assuming Option A is impossible, ask NVIDIA directly whether a
non-NVIDIA-owned, independent DeFi control-plane skill qualifies for the
catalog under an exception, and what onboarding shape they require.

*Requires:* an NVIDIA contact. `catalog-exceptions.yml` exists in the NVIDIA
repo, so an exception mechanism is plausible — but it must be NVIDIA's call,
not FarmDash's assumption.

### Do not do this

Do **not** open a PR against `NVIDIA/skills` from a private, non-NVIDIA-owned
repository. It will fail the template's own preconditions, and submitting
around them would misrepresent the artifact's standing.

---

## 4. Prepare the release packet for the chosen path

Already prepared in this branch:

| Artifact | Location | State |
|---|---|---|
| Skill source | `skills/defi-autonomous-operator/` | ✅ complete |
| Skill card | `skills/defi-autonomous-operator/skill-card.md` | ✅ generated by NVIDIA's official generator; submission validator passes |
| Benchmark | `skills/defi-autonomous-operator/BENCHMARK.md` | ✅ genuine generated report (verdict `INCOMPLETE` — regenerate per § 2.3) |
| Evaluation dataset | `skills/defi-autonomous-operator/evals/evals.json` | ✅ 50 entries, schema-validated |
| Evaluation methodology | `skills/defi-autonomous-operator/evals/EVAL.md` | ✅ complete |
| Provenance / licensing | `skills/defi-autonomous-operator/references/NOTICE.md`, `skills/defi-autonomous-operator/LICENSE`, root `LICENSE` | ✅ complete |
| Evaluator reports | `reports/nvidia-autonomous-operator-20261105/release-packet/evidence/` | ✅ JSON + Markdown |
| Card-generation context | `reports/nvidia-autonomous-operator-20261105/release-packet/skill-card-context.json` | ✅ complete |
| Eligibility decision | `reports/nvidia-autonomous-operator-20261105/NVIDIA-ELIGIBILITY.md` | ✅ complete |
| Design diff | `reports/nvidia-autonomous-operator-20261105/DESIGN-DIFF.md` | ✅ complete |
| Validation report | `reports/nvidia-autonomous-operator-20261105/VALIDATION-REPORT.md` | ✅ complete |
| Detached OMS signature | `skills/defi-autonomous-operator/skill.oms.sig` | ⬜ **NOT PRODUCED** — § 5 |
| Known limitations | `skills/defi-autonomous-operator/references/limitations.md` | ✅ complete |
| Support / ownership | `references/NOTICE.md` + `skill-card.md` owner section | ✅ complete |

### Re-run the local gates after any change

```bash
skillevaluator tier3 validate skills/defi-autonomous-operator --strict
skillevaluator validate skills/defi-autonomous-operator --tiers 1 --no-dedup
node scripts/nvidia-skill/validate-skill-truth.mjs
node scripts/nvidia-skill/test-skill-invariants.mjs
```

All four must exit 0 immediately before signing.

---

## 5. Sign the exact reviewed directory

**Only after every gate above passes.** Signing is performed by NVIDIA's
signing process; it cannot be done from FarmDash.

```bash
model_signing sign certificate SKILL_DIR \
  --certificate-chain nv-agent-root-cert.pem
```

where `SKILL_DIR` is the skill directory that was actually reviewed.

**Ordering is strict and irreversible:**

```text
IMPLEMENT → TEST → EVALUATE → SCAN → REVIEW → GENERATE FINAL CARD/BENCHMARK
          → SIGN EXACT DIRECTORY → VERIFY SIGNATURE → PUBLISH
```

### Signing integrity rules

- **No file inside the signed directory may change after signing.** Any change
  requires a new signature.
- `skill.oms.sig` is a **detached** signature over the whole directory, not
  just `SKILL.md`.
- Do not regenerate `BENCHMARK.md`, `skill-card.md`, or any reference after
  signing. Regenerating `BENCHMARK.md` post-signing is the single most common
  way to produce an artifact that looks signed but is not.
- Do not add files after signing. An added file is outside the signature.

### Verify

```bash
model_signing verify certificate SKILL_DIR \
  --signature SKILL_DIR/skill.oms.sig \
  --certificate-chain nv-agent-root-cert.pem
```

**Exit condition:** verification succeeds against the current NVIDIA trust
anchor, and every file listed in `skill.oms.sig` still hashes to its signed
digest.

---

## 6. Submit and publish

### 6.1 Submit

Follow the intake path established in § 3, exactly as NVIDIA's current
contributor instructions specify. If an NVIDIA org or sponsor owns the source
repo, the source repo is the submission; NVIDIA's sync automation mirrors it.

### 6.2 Catalog mirroring

NVIDIA-owned. The hourly sync mirrors the signed source directory into
`NVIDIA/skills` and drops any skill missing `skill.oms.sig`, `skill-card.md`,
or an evaluation dataset.

### 6.3 Public install verification

After mirroring, verify the published artifact installs and behaves as
validated:

```bash
# install from the catalog and confirm the four contract files are present
ls <installed-skill-dir>/SKILL.md \
   <installed-skill-dir>/skill-card.md \
   <installed-skill-dir>/BENCHMARK.md \
   <installed-skill-dir>/skill.oms.sig

# re-verify the published signature
model_signing verify certificate <installed-skill-dir> \
  --signature <installed-skill-dir>/skill.oms.sig \
  --certificate-chain nv-agent-root-cert.pem

# confirm the published directory matches the reviewed one
diff -r <reviewed-skill-dir> <installed-skill-dir>
```

**Exit condition:** the installed directory is byte-identical to the reviewed
and signed directory, and signature verification succeeds.

---

## 7. Post-publication maintenance

The skill is not a one-time artifact. Capability readiness is a runtime
property that changes.

| Trigger | Action |
|---|---|
| FarmDash capability truth changes | `node scripts/nvidia-skill/validate-skill-truth.mjs` — a failure means the skill must be updated and re-signed |
| A new execution domain is added | Add the domain to `references/authority-model.md` and `references/capability-matrix.md`, and extend the drift validator's domain assertions |
| A canonical truth conflict is resolved | Update `references/capability-matrix.md` § 5 and re-run all gates |
| NVIDIA changes the Agent Skills schema | Re-validate frontmatter and package layout against the current schema |
| The NVIDIA catalog adopts an intake path | Re-evaluate § 3 and update `NVIDIA-ELIGIBILITY.md` |

**Every change to the skill directory requires a new signature.** Bump
`version` in the SKILL.md frontmatter and regenerate the card and benchmark
before re-signing.
