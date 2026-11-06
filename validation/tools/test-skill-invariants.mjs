#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 FarmDash Pioneers
//
// Security and structural invariant tests for the `defi-autonomous-operator`
// skill.
//
// These assert the PRD's required invariants against the shipped skill
// directory. They are deliberately static and hermetic: no network, no
// credentials, no model calls.
//
// Usage:
//   node scripts/nvidia-skill/test-skill-invariants.mjs [--skill-dir <path>]
//
// Exit codes:
//   0  every invariant holds
//   1  at least one invariant failed
//   2  the suite could not run

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// This repository is standalone: the skill lives at <root>/skills/<name> and
// the tools at <root>/tools/. The parent directory is NOT a repository root.
const REPO_ROOT = resolve(HERE, '..', '..');

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--skill-dir' && argv[i + 1]) { args.skillDir = argv[i + 1]; i += 1; }
}
const skillDir = args.skillDir
  ? resolve(args.skillDir)
  : join(REPO_ROOT, 'skills', 'defi-autonomous-operator');

if (!existsSync(skillDir)) {
  console.error(`ERROR: skill directory not found: ${skillDir}`);
  process.exit(2);
}

function readDoc(rel) {
  const p = join(skillDir, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8');
}

const skillMd = readDoc('SKILL.md');
if (!skillMd) {
  console.error('ERROR: SKILL.md not found');
  process.exit(2);
}

const referenceFiles = readdirSync(join(skillDir, 'references'))
  .filter((f) => f.endsWith('.md'));
const references = Object.fromEntries(
  referenceFiles.map((f) => [f, readFileSync(join(skillDir, 'references', f), 'utf8')]),
);
const allDocs = { 'SKILL.md': skillMd, ...references };

let evals = null;
const evalsPath = join(skillDir, 'evals', 'evals.json');
if (existsSync(evalsPath)) {
  try {
    evals = JSON.parse(readFileSync(evalsPath, 'utf8'));
  } catch (err) {
    console.error(`ERROR: evals/evals.json is not valid JSON: ${err.message}`);
    process.exit(2);
  }
}

const results = [];
function invariant(name, fn) {
  let ok = false;
  let detail = '';
  try {
    const r = fn();
    if (Array.isArray(r)) { ok = r.length === 0; detail = r.join('; '); }
    else { ok = Boolean(r); }
  } catch (err) {
    ok = false;
    detail = err.message;
  }
  results.push({ name, ok, detail });
}

// --- 1. No instruction to handle raw private key material -------------------

invariant('no seed phrase / private key instruction', () => {
  const offenders = [];
  for (const [file, doc] of Object.entries(allDocs)) {
    const lines = doc.split('\n');
    lines.forEach((line, i) => {
      // A *refusal* is required; an *instruction to handle* is forbidden.
      const lower = line.toLowerCase();
      const mentions = /seed phrase|private key|mnemonic|secret key|raw key material/.test(lower);
      if (!mentions) return;
      // A quoted attack example is documentation, not an instruction. This
      // covers markdown blockquotes ('>') and dialogue fixtures that quote a
      // user's own words ('User: "..."').
      if (/^\s*>/.test(line)) return;
      if (/^\s*(User|Agent|Attacker|User\s*:)/i.test(line) && /["“]/.test(line)) return;
      // A threat-model definition line naming what material is at risk is
      // descriptive, not an instruction.
      if (/\*\*Threat\.\*\*/.test(line)) return;
      // A prohibition, refusal, or factual boundary statement is required and
      // acceptable. Only an imperative to SOLICIT or RELAY secret material
      // is a violation.
      const isRefusal = /(never|do not|don't|refuse|must not|not accept|without requesting|withhold|tell them not to|does not create|is not required|never needs|stays with)/.test(lower);
      if (isRefusal) return;
      // An imperative addressed to the agent to handle secret material.
      const solicitation = /\b(paste|send|enter|type|supply|share|transmit|disclose|expose|echo|upload|forward|provide me with|give me)\b[^.]{0,40}\b(private key|seed phrase|mnemonic|api key|secret key|bearer token)\b/i;
      const solicitation2 = /\b(private key|seed phrase|mnemonic|api key|secret key|bearer token)\b[^.]{0,30}\b(in|into|to)\b[^.]{0,20}\b(prompt|chat|model|context|notes field|webhook)\b/i;
      if (solicitation || solicitation2) {
        offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return offenders;
});

// --- 2. No affiliate / referral / commercial acquisition URLs ---------------

invariant('no affiliate or referral URLs', () => {
  const offenders = [];
  const urlRe = /https?:\/\/[^\s)>`"']+/g;
  for (const [file, doc] of Object.entries(allDocs)) {
    for (const m of doc.matchAll(urlRe)) {
      const url = m[0];
      if (/(ref|affiliate|utm_|partner|referral|campaign|clickid)/i.test(url)) {
        offenders.push(`${file}: ${url}`);
      }
    }
  }
  return offenders;
});

// --- 3. No pricing / upgrade CTA -------------------------------------------

invariant('no pricing or upgrade CTA', () => {
  const offenders = [];
  const banned = /\b(\$\s?\d+\s?\/\s?(mo|month|yr|year)|upgrade to|upgrade your|buy (a|the) plan|subscribe now|start your plan|pricing tier \d)/i;
  for (const [file, doc] of Object.entries(allDocs)) {
    doc.split('\n').forEach((line, i) => {
      if (banned.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
    });
  }
  return offenders;
});

// --- 4. No hard-coded canonical MCP inventory count in authored prose -------

invariant('no hard-coded canonical tool inventory count', () => {
  const offenders = [];
  for (const [file, doc] of Object.entries(allDocs)) {
    doc.split('\n').forEach((line, i) => {
      if (/\b\d{2,3}\s+(?:MCP\s+)?tools\b/i.test(line)) {
        offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return offenders;
});

// --- 5. Payment never grants authority -------------------------------------

invariant('no claim that payment grants authority', () => {
  const offenders = [];
  const pattern = /payment[^.\n]{0,60}\b(grants?|authorizes?|implies?|means)\b[^.\n]{0,40}author/i;
  for (const [file, doc] of Object.entries(allDocs)) {
    doc.split('\n').forEach((line, i) => {
      if (pattern.test(line) && !/(not|never|neither|does not|cannot)/i.test(line)) {
        offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return offenders;
});

// --- 6. Session token never grants wallet authority ------------------------

invariant('no claim that a session token grants wallet authority', () => {
  const offenders = [];
  const pattern = /session[^.\n]{0,50}\b(grants?|authorizes?|implies?|means)\b[^.\n]{0,50}(wallet|fund|trade|execution|chain|venue)/i;
  for (const [file, doc] of Object.entries(allDocs)) {
    doc.split('\n').forEach((line, i) => {
      if (pattern.test(line) && !/(not|never|cannot|does not|neither)/i.test(line)) {
        offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return offenders;
});

// --- 7. Simulation never equals execution ----------------------------------

invariant('no claim that simulation equals execution', () => {
  const offenders = [];
  const pattern = /simulation[^.\n]{0,50}\b(is|means|equals|proves)\b[^.\n]{0,30}executed?\b/i;
  for (const [file, doc] of Object.entries(allDocs)) {
    doc.split('\n').forEach((line, i) => {
      if (pattern.test(line) && !/(not|never|cannot|does not|only that)/i.test(line)) {
        offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return offenders;
});

// --- 8. Transaction hash never equals settlement ---------------------------

invariant('no claim that a transaction hash equals settlement', () => {
  const offenders = [];
  const pattern = /(tx|transaction) hash[^.\n]{0,50}\b(is|means|equals|proves|confirms)\b[^.\n]{0,30}settl/i;
  for (const [file, doc] of Object.entries(allDocs)) {
    doc.split('\n').forEach((line, i) => {
      if (pattern.test(line) && !/(not|never|cannot|does not|alone is not|only evidence)/i.test(line)) {
        offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return offenders;
});

// --- 9. No cross-domain authorization language ----------------------------

invariant('no cross-domain authorization language', () => {
  const offenders = [];
  const pattern = /\b(spot|futures|solana)\s+grant\s+(grants?|authorizes?|covers?|applies to)\s+(futures|spot|solana)\b/i;
  for (const [file, doc] of Object.entries(allDocs)) {
    doc.split('\n').forEach((line, i) => {
      if (pattern.test(line) && !/(never|not|does not|cannot|no)/i.test(line)) {
        offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
      }
    });
  }
  return offenders;
});

// --- 10. No unsupported NVIDIA integration claim ---------------------------

invariant('no unsupported NVIDIA integration claim', () => {
  const offenders = [];
  const pattern = /\b(NIM|Nemotron|NeMo|OpenShell|NemoClaw|NVIDIA (integration|runtime|endorsement|verified|approved))\b/i;
  for (const [file, doc] of Object.entries(allDocs)) {
    doc.split('\n').forEach((line, i) => {
      if (!pattern.test(line)) return;
      // A quoted attack example is documentation, not a claim.
      if (/^\s*>/.test(line)) return;
      // A negated / cautionary statement is required and acceptable.
      const guarded = /(not|no|never|without|cannot|does not|optional|unless|unverified|pending|no claim|complementary|not part of|not implemented|may provide|if the deployment actually)/i.test(line);
      if (!guarded) offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
    });
  }
  return offenders;
});

// --- 11. Preparation-only capabilities are not described as operational ----

invariant('preparation-only capabilities are not described as operational', () => {
  const offenders = [];
  const prepOnly = ['ERC4337_SERVER_SUBMISSION', 'GENERIC_SERVER_INTENT_EXECUTION', 'MEE'];
  for (const [file, doc] of Object.entries(allDocs)) {
    for (const cap of prepOnly) {
      const re = new RegExp(`\\\`?${cap}\\\`?[^\\n]{0,40}\\b(operational|is ready|fully supported|submits?|can submit)\\b`, 'i');
      doc.split('\n').forEach((line, i) => {
        if (re.test(line) && !/(not|preparation_only|preparation-only|never|does not|cannot)/i.test(line)) {
          offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 110)}`);
        }
      });
    }
  }
  return offenders;
});

// --- 12. Evaluation dataset structure --------------------------------------

invariant('evaluation dataset validates', () => {
  if (!evals) return ['evals/evals.json missing'];
  const problems = [];
  if (evals.skill_name !== 'defi-autonomous-operator') problems.push('skill_name mismatch');
  if (!Array.isArray(evals.evals) || evals.evals.length === 0) problems.push('evals array missing or empty');
  else {
    const ids = evals.evals.map((e) => e.id);
    if (new Set(ids).size !== ids.length) problems.push('duplicate eval ids');
    evals.evals.forEach((e, i) => {
      if (!e.id || !e.prompt || !e.expected_output) problems.push(`entry ${i} missing id/prompt/expected_output`);
      if (e.assertions !== undefined && !Array.isArray(e.assertions)) problems.push(`entry ${i} assertions not an array`);
    });
  }
  return problems;
});

// --- 13. Negative routing cases exist -------------------------------------

invariant('negative routing cases exist', () => {
  if (!evals) return ['evals/evals.json missing'];
  const negatives = evals.evals.filter((e) => e.expected_skill === null);
  if (negatives.length < 3) return [`only ${negatives.length} negative routing cases (need >= 3)`];
  return true;
});

// --- 14. Adversarial authority cases exist ---------------------------------

invariant('adversarial authority cases exist', () => {
  if (!evals) return ['evals/evals.json missing'];
  const adversarial = evals.evals.filter((e) => String(e.id).startsWith('adversarial-'));
  if (adversarial.length < 15) return [`only ${adversarial.length} adversarial cases (need >= 15)`];
  const ids = adversarial.map((e) => e.id).join(' ');
  const required = [
    'payment-not-authority',
    'session-token-not-authority',
    'tool-visible-not-authority',
    'spot-grant-not-futures-authority',
    'stale-nonce',
    'ambiguous-no-resubmit',
    'tx-hash-not-settlement',
    'seed-phrase-refused',
    'budget-violation',
    'preparation-only',
  ];
  const missing = required.filter((r) => !ids.includes(r));
  return missing.length ? [`missing adversarial coverage: ${missing.join(', ')}`] : true;
});

// --- 15. Source provenance is recorded -------------------------------------

invariant('source provenance is recorded', () => {
  const notice = references['NOTICE.md'] ?? '';
  if (!notice) return ['references/NOTICE.md missing'];
  const required = [
    /hububstudio\/farmdashbeta/i,
    /source repository SHA/i,
    /[0-9a-f]{40}/,
    /capability-truth\.ts/,
    /MIT/i,
  ];
  const missing = required.filter((r) => !r.test(notice)).map((r) => r.source);
  return missing.length ? [`NOTICE.md missing provenance: ${missing.join(', ')}`] : true;
});

// --- 16. Required package structure ----------------------------------------

invariant('required package structure is present', () => {
  const required = [
    'SKILL.md',
    'references/authority-model.md',
    'references/capability-matrix.md',
    'references/lifecycle-contract.md',
    'references/threat-model.md',
    'evals/evals.json',
  ];
  const missing = required.filter((rel) => !existsSync(join(skillDir, rel)));
  return missing.length ? [`missing: ${missing.join(', ')}`] : true;
});

// --- 17. No fabricated trust artifacts -------------------------------------

invariant('no fabricated trust artifacts', () => {
  const offenders = [];
  // A BENCHMARK.md claiming a pass without a real run, or a hand-written
  // skill.oms.sig, would be a false trust claim.
  const bench = join(skillDir, 'BENCHMARK.md');
  if (existsSync(bench)) {
    const text = readFileSync(bench, 'utf8');
    if (/verdict:\s*PASS/i.test(text) && !/evaluator version|dataset digest|attempts per task/i.test(text)) {
      offenders.push('BENCHMARK.md claims PASS without evaluation metadata');
    }
  }
  const sig = join(skillDir, 'skill.oms.sig');
  if (existsSync(sig)) {
    const text = readFileSync(sig, 'utf8').trim();
    if (!text.startsWith('-----BEGIN') && text.length < 500) {
      offenders.push('skill.oms.sig does not look like a detached signature');
    }
  }
  return offenders;
});

// --- 18. Zero-custody boundary is stated -----------------------------------

invariant('zero-custody boundary is explicit', () => {
  const required = [
    /never request, receive, store, echo, transform or transmit/i,
    /seed phrase/i,
    /mnemonic/i,
  ];
  const missing = required.filter((r) => !r.test(skillMd)).map((r) => r.source);
  return missing.length ? [`SKILL.md missing: ${missing.join(', ')}`] : true;
});

// --- 19. Ambiguous submission rule is stated -------------------------------

invariant('ambiguous submission rule is stated', () => {
  const required = [
    /not permission to retry/i,
    /mark the outcome ambiguous/i,
    /reconcile/i,
  ];
  const missing = required.filter((r) => !r.test(skillMd)).map((r) => r.source);
  return missing.length ? [`SKILL.md missing: ${missing.join(', ')}`] : true;
});

// --- 20. Circuit breakers / stop conditions are enumerated -----------------

invariant('deterministic stop conditions are enumerated', () => {
  const needed = [
    'expired', 'revoked', 'scope', 'budget', 'nonce', 'simulation',
    'policy', 'ambiguous', 'reconcil',
  ];
  const hay = skillMd.toLowerCase();
  const missing = needed.filter((n) => !hay.includes(n));
  return missing.length ? [`SKILL.md missing stop conditions: ${missing.join(', ')}`] : true;
});

// --- Report ----------------------------------------------------------------

const failed = results.filter((r) => !r.ok);
console.log('defi-autonomous-operator invariant suite');
console.log(`  skill dir : ${relative(REPO_ROOT, skillDir) || skillDir}`);
console.log(`  documents : ${Object.keys(allDocs).length}`);
console.log(`  invariants: ${results.length}`);
console.log(`  passed    : ${results.length - failed.length}`);
console.log(`  failed    : ${failed.length}`);

for (const r of results) {
  console.log(`  [${r.ok ? 'PASS' : 'FAIL'}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
}

if (failed.length) {
  console.error('\nINVARIANT FAILURES');
  process.exit(1);
}
console.log('\nOK: all security and structural invariants hold.');
