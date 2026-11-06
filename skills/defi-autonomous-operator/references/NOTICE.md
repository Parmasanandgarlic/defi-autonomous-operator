<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Copyright (c) 2026 Parmasanandgarlic. All rights reserved. -->
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

This skill is licensed under the **Apache License, Version 2.0** (SPDX:
`Apache-2.0`). The full text is at `../LICENSE` and at the repository root.

Apache 2.0 was selected because it is one of the three licenses NVIDIA's
contribution policy accepts for skills published to `github.com/nvidia/skills`
(Apache 2.0, CC-BY 4.0, or dual). It is a permissive, patent-aware license and is
compatible with the MIT-licensed FarmDash packages this skill is validated
against; no third-party material was relicensed and no third-party code is
included.

**This package is non-promotional, not non-commercial.** Apache 2.0 permits
commercial and non-commercial reuse. The stated requirement was the removal of
promotional and monetization *behavior* (no pricing, tiers, referral links, or
upgrade CTAs) — not a restriction on how a downstream operator may use the skill.

Copyright (c) 2026 Parmasanandgarlic. All rights reserved.

## Trademark

"NVIDIA" is used solely to describe the packaging, trust, and evaluation
conventions this package targets. NVIDIA has not reviewed, approved, verified,
endorsed, or certified this skill. No NVIDIA product integration is claimed.
