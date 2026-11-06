<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- Copyright (c) 2026 Parmasanandgarlic. All rights reserved. -->
# Skill Benchmark: defi-autonomous-operator

> ⚠️ **Overall verdict: INCOMPLETE — Required evidence is missing**

One or more required evaluation tiers did not complete, so this benchmark is not publication-complete.

## Evaluation Metadata

- Skill: `defi-autonomous-operator`
- Source digest: `sha256:cd9098ec34afe4d373c969ab5c56f2d0c55601c81206ddded8020a984ef9da26` (skill-evaluator-source-tree/2)
- Quality config: packaged, `sha256:b70a47b94b92e0e3a82f704930dad392b753df162aa30463ce0567d24ee76e49`
- Quality min score: 70
- Evaluation date: not recorded (legacy or non-live result)
- Evaluator version: not recorded (legacy or non-live result)
- Evaluated source: not recorded (not supplied by the orchestration input)
- Evaluated source revision: not recorded (not supplied by the orchestration input)
- Evaluator container revision: not recorded (not supplied by the orchestration input)
- Agents: not recorded (legacy or non-live result)
- Tasks: not recorded (legacy or non-live result)
- Dataset digest: not recorded (legacy or non-live result)
- Tier 3 run ID: not recorded (Tier 3 did not complete)
- Attempts per task: not recorded (legacy or non-live result)
- Environment: not recorded (legacy or non-live result)
- Tier 2 evidence: required for publication
- Tier 3 evidence: required for publication

## What This Report Answers

The three-tier evaluation checks whether the skill:

- is safe to use;
- produces correct answers;
- is discovered and activated when needed;
- helps the agent complete the user's goal and expected workflow; and
- avoids wasted skill and tool usage.

## Results at a Glance

Tier 3 live-agent scores were not available. See the tier status table for what ran.

## Tier Status

| Tier | Purpose | Status | Evidence |
|---|---|---|---|
| Tier 1 | Static validation | **PASSED** | 11 validator(s); 0 finding(s) |
| Tier 2 | Semantic deduplication | **NOT RUN** | No result was recorded |
| Tier 3 | Live agent evaluation | **NOT RUN** | No result was recorded |

Test execution limitations:

- No standard Python test-file candidates found; target tests were not executed and coverage was not measured. Consider adding tests.

## Findings and Observations

<details>
<summary>Show detailed findings and successful checks</summary>

- Schema &amp; Repository Governance: Found skill manifest: SKILL.md
- Semantic Version Validation: No semantic version label present; resource will use commit-hash history
- Security Scan: No security vulnerabilities detected (secrets, API keys, credentials)
- PII Scan: Scanning 10 files for PII
- License Compliance: License compliance scan completed (allowed)
- Code Risk Analysis: No code files found - code risk analysis is not applicable
- Secrets Detection: No secrets detected by Gitleaks
- Code Integrity &amp; Hygiene: Checking 10 markdown files for dead links
- Unicode Smuggling Detection: No invisible Unicode characters detected in 10 file(s)
- QUALITY: Score: 100.0/100 (Grade: A)
- SCRIPT\_LINT: No scripts/ or tools/ directory found

</details>

## Scoring Methodology

<details>
<summary>Show dimension definitions, source signals, and thresholds</summary>

| Dimension | Question | Scored signals |
|---|---|---|
| Security | Is it safe to use? | `security` (100%) |
| Correctness | Is the answer correct? | `accuracy` (100%) |
| Discoverability | Was the right skill loaded when needed? | `skill_execution` (100%) |
| Effectiveness | Did the skill help complete the task? | `goal_accuracy` (50%) + `behavior_check` (50%) |
| Efficiency | Did it avoid wasted tool or skill usage? | `skill_efficiency` (100%) |

- Dimension bands: PASS at 50% or above; NEUTRAL from 40% to below 50%; FAIL below 40%.
- Overall Tier 3 lift: PASS at +5 points or more; FAIL at -10 points or less; values between those bands are NEUTRAL.
- Overall verdict: PASS only when every configured dimension passes for at least one supported agent. Lift is reported as diagnostic evidence and does not override this gate.
- Effectiveness is the equal-weight mean of goal completion (`goal_accuracy`) and expected workflow adherence (`behavior_check`).
- Token efficiency is a separate report-only signal. It does not change a dimension score or the overall verdict.

</details>

## Freshness

Regenerate this benchmark when the skill, evaluation dataset, target agent/model, evaluator version, environment, or scoring policy changes.
