<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Copyright (c) 2026 Parmasanandgarlic. All rights reserved. -->
## Description: <br>
Coordinates supervised and bounded-autonomous DeFi workflows so that policy, simulation, authority, local signing, submission, and settlement remain separately proven. <br>

This skill is ready for commercial/non-commercial use. <br>

## Third-Party Community Consideration
This skill is not owned or developed by NVIDIA. This skill has been developed and built to a third-party's requirements for this application and use case; see link to Non-NVIDIA [FarmDash Agent Hub](https://www.farmdash.one). <br>

### License/Terms of Use: <br>
Apache License, Version 2.0 (SPDX: Apache-2.0). See the repository LICENSE file. <br>
## Use Case: <br>
Intended for AI agents and their operators who need to run or supervise multi-step DeFi transaction workflows under an explicit, scoped, revocable execution grant, or who need to determine whether such an action is presently authorized. The skill governs observation, orientation, planning, simulation, authorization, preparation, local signing, submission, receipt handling, and reconciliation. It is not a strategy, signal, portfolio-analytics, or price-research skill. <br>

### Deployment Geography for Use: <br>
Global. The skill is instruction-only and contains no region-specific code, endpoints, or data residency requirements. Its runtime counterpart (the FarmDash control plane) is subject to that project's own terms of service and regulatory availability. <br>

## Requirements / Dependencies: <br>
**Requires API Key or External Credential:** [Optional] <br>
**Credential Type(s):** [API key] <br>  

Do not include secrets in prompts/logs/output; use least-privilege credentials; rotate keys as appropriate. See skill body for more details. <br>

## Known Risks and Mitigations: <br>
Risk: Review before execution as proposals could introduce incorrect or misleading guidance into skills. <br>
Mitigation: Review and scan skill before deployment. <br>

## Reference(s): <br>
- [FarmDash source repository (skill source of truth)](https://github.com/hububstudio/farmdashbeta) <br>
- [FarmDash production control plane](https://www.farmdash.one) <br>
- [NVIDIA Agent Skills trust pipeline](https://github.com/NVIDIA/skills) <br>


## Skill Output: <br>
**Output Type(s):** [text] <br>
**Output Format:** [Markdown-structured operator report describing intent, execution domain, execution mode, runtime readiness, evidence freshness, applied policy, proven authority, simulation result, prepared artifact, signing owner, submission state, reconciliation status, and the exact blocked reason when the workflow halts.] <br>
**Output Parameters:** [No structured output parameters are emitted by the skill itself. Any parameters referenced in a workflow report belong to the underlying control plane's own tool contracts, not to this skill.] <br>
**Other Properties Related to Output:** [The skill never emits credentials, key material, wallet mnemonics, or bearer tokens, and never reports a lifecycle stage beyond what the evidence independently supports. Reports may include quoted transaction or venue identifiers required for reconciliation.] <br>

## Evaluation Agents Used: <br>
- Tier 1 static, security, and quality validation: NVIDIA SkillEvaluator 0.7.2 with SkillSpector 2.13.3 (complete skill directory) <br>
- Tier 3 live agent evaluation: pending the NVIDIA evaluation pipeline (no provider key or Docker runtime available at authoring time) <br>



## Evaluation Tasks: <br>
50 evaluation cases (46 positive-routing and adversarial, 4 negative-routing) defined in evals/evals.json. <br>

## Evaluation Metrics Used: <br>
Reported benchmark dimensions: <br>
- Correctness: Whether the agent followed the true FarmDash lifecycle rather than a plausible-sounding shortcut. <br>
- Security: Whether custody, authorization, scope, budget, and secret-handling boundaries were preserved. <br>
- Discoverability: Whether the skill activated for operational DeFi workflow requests. <br>
- Negative routing: Whether the skill stayed out of generic research, price, and education tasks. <br>
- Effectiveness: Whether the agent reached the safest correct next action. <br>
- Efficiency: Whether the agent avoided redundant discovery and repeated tool calls. <br>
- Truthfulness: Whether unavailable, preparation-only, and deployment-prerequisite capabilities were represented accurately. <br>
- Recovery discipline: Whether ambiguous submission outcomes were reconciled rather than retried. <br>

Underlying evaluation signals used in this run: <br>
- `with-skill vs. without-skill`: Paired comparison of the same task attempted with and without the skill loaded under an equivalent model, tools, runtime, and context. <br>
- `tier-1-static-gate`: SkillEvaluator Tier 1 schema, version, security, PII, license, code-risk, secrets, integrity, unicode, quality, and lint checks over the complete skill directory. <br>



## Testing Completed: <br>
**[ ] Agent Red-Teaming** <br>
**[ ] Network Security** <br>
**[ ] Product Security** <br>

## Skill Version(s): <br>
1.0.0 <br>


