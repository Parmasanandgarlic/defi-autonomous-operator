# NOTICE

## Provenance

This skill is a generalized DeFi operating methodology implemented and validated
against the **FarmDash** runtime.

- **Source project:** FarmDash (https://github.com/hububstudio/farmdashbeta)
- **Source repository SHA at authoring:** `d0d2c6a67b98b5d2cb0fd66deb44beaf05df2431`
- **Canonical runtime truth consumed:**
  - `shared/capability-truth.ts` — capability status matrix
  - `mcp-server/src/execution-truth.generated.ts` — generated execution truth
  - `mcp-server/src/tool-contracts.ts` — MCP tool contracts
  - `mcp-server/src/tool-capabilities.generated.ts` — generated tool capabilities
  - `mcp-server/src/tool-discovery.generated.ts` — generated discovery profile
  - `services/ExecutionAuthorityService.ts` — grant invariants and policy limits
  - `public/.well-known/mcp.json`, `public/execution-truth.json` — published contracts
- **Capability extraction tool:** `scripts/nvidia-skill/extract-canonical-truth.mjs`
  (dependency-free, read-only; executes no code from the files it reads)

## Relationship to the FarmDash OpenClaw skill

This directory is **independent** of, and does not replace, the canonical
FarmDash OpenClaw skill at
`src/content/openclaw-skills/farmdash-autonomous-operator/`. The OpenClaw
edition remains the product-facing skill for the FarmDash runtime. This edition
is a separate, non-promotional, trust-pipeline-oriented package.

## Third-party material

No third-party NVIDIA prose, code, or documentation was copied into this skill.
The NVIDIA Agent Skills packaging conventions, trust pipeline, and SkillEvaluator /
SkillSpector tooling were consulted as the authoritative format reference; the
instruction content, evaluation dataset, and references are original work.

The literal hostile prompts in `evals/evals.json` are authored test fixtures.
The neutralized bracketed notation used in `references/threat-model.md` is an
original authoring convention, explained in that file.

## Licensing

Instruction and documentation content in this directory is licensed under the
MIT License; see `LICENSE`. This is the license already used by the FarmDash
repository for its distributable packages (`mcp-server/`, `agent-kit/`,
`client/`, `agent-kit-py/`). No third-party material was relicensed.

**This package is non-promotional, not non-commercial.** MIT permits commercial
and non-commercial reuse. The stated requirement was the removal of promotional
and monetization *behavior* (no pricing, tiers, referral links, or upgrade
CTAs) — not a restriction on how a downstream operator may use the skill.

**NVIDIA catalog inclusion requires a different license.** NVIDIA's current
contribution policy licenses skills published to `github.com/nvidia/skills`
under one of: **Apache 2.0**, **CC-BY 4.0**, or **dual Apache 2.0 + CC-BY 4.0**.
It also requires that the source repository not introduce a new or incompatible
license. **MIT is not on that list.** Relicensing this package under an accepted
license is an explicit ownership decision and has **not** been taken here; it
cannot be taken unilaterally. See `NVIDIA-ELIGIBILITY.md`.

## Trademark

"NVIDIA" is used solely to describe the packaging, trust, and evaluation
conventions this package targets. NVIDIA has not reviewed, approved, verified,
endorsed, or certified this skill. No NVIDIA product integration is claimed.
