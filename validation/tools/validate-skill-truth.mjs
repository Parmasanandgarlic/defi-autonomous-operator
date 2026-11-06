#!/usr/bin/env node
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 FarmDash Pioneers
//
// Read-only validator for the `defi-autonomous-operator` skill.
//
// Confirms that every capability status, authority-model claim, and tool name
// asserted by the skill still matches the canonical FarmDash runtime truth.
// The validator NEVER mutates canonical source: it only reads.
//
// It is dependency-free by design. The skill it guards is a release-gated
// security artifact, so the validator adds no import-time dependency and
// executes no code from the files it reads. It parses TypeScript literal
// syntax with a small hand-rolled reader rather than importing the repo's
// TypeScript dependency.
//
// Usage:
//   node scripts/nvidia-skill/validate-skill-truth.mjs [--skill-dir <path>]
//
// Exit codes:
//   0  every assertion in the skill matches canonical truth
//   1  at least one assertion drifted
//   2  the validator could not run (missing files, unparseable input)

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
// This repository is standalone: the skill lives at <root>/skills/<name> and
// the validators at <root>/validation/tools/. The parent of tools/ is
// validation/, so the repository root is two levels up.
const REPO_ROOT = resolve(HERE, '..', '..');

function fail(message, code = 2) {
  console.error(`ERROR: ${message}`);
  process.exit(code);
}

// ---------------------------------------------------------------------------
// Minimal TypeScript literal reader
// ---------------------------------------------------------------------------

/** Strip comments and string literals so structural scanning is reliable. */
function blankCommentsAndStrings(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === '/' && next === '/') {
      while (i < n && source[i] !== '\n') { out += ' '; i += 1; }
      continue;
    }
    if (ch === '/' && next === '*') {
      out += '  ';
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      out += '  ';
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out += quote;
      i += 1;
      while (i < n) {
        if (source[i] === '\\') { out += '  '; i += 2; continue; }
        if (source[i] === quote) { out += quote; i += 1; break; }
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
}

function stripTypeAssertions(source) {
  return source
    .replace(/\bas\s+const\b/g, '')
    .replace(/\bas\s+[A-Za-z_$][\w$<>\[\]. ]*?(?=[=,;)\]}])/g, '');
}

function readStringLiteral(source, start) {
  const quote = source[start];
  let i = start + 1;
  let value = '';
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') {
      const next = source[i + 1];
      const map = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '`': '`', '\n': '' };
      value += map[next] !== undefined ? map[next] : next;
      i += 2;
      continue;
    }
    if (ch === quote) return { value, end: i + 1 };
    value += ch;
    i += 1;
  }
  throw new Error('unterminated string literal');
}

/** Read a literal value starting at `pos`. Returns { value, end }. */
function readValue(source, pos) {
  const s = source.slice(pos);
  const trimmed = s.replace(/^\s+/, '');
  const lead = s.length - trimmed.length;
  const start = pos + lead;

  if (trimmed.startsWith('{')) return readObject(source, start);
  if (trimmed.startsWith('[')) return readArray(source, start);
  if (trimmed[0] === '"' || trimmed[0] === "'" || trimmed[0] === '`') {
    const r = readStringLiteral(source, start);
    return { value: r.value, end: r.end };
  }
  if (trimmed.startsWith('true')) return { value: true, end: start + 4 };
  if (trimmed.startsWith('false')) return { value: false, end: start + 5 };
  if (trimmed.startsWith('null')) return { value: null, end: start + 4 };

  const num = /^-?\d+(?:\.\d+)?/.exec(trimmed);
  if (num) return { value: Number(num[0]), end: start + num[0].length };

  const ident = /^[A-Za-z_$][\w$]*/.exec(trimmed);
  if (ident) return { value: ident[0], end: start + ident[0].length };

  throw new Error(`unsupported literal at offset ${start}: ${trimmed.slice(0, 40)}`);
}

function readKey(source, pos) {
  const s = source.slice(pos);
  const trimmed = s.replace(/^\s+/, '');
  const start = pos + (s.length - trimmed.length);
  if (trimmed[0] === '"' || trimmed[0] === "'") {
    const r = readStringLiteral(source, start);
    return { key: r.value, end: r.end };
  }
  const ident = /^[A-Za-z_$][\w$]*/.exec(trimmed);
  if (ident) return { key: ident[0], end: start + ident[0].length };
  throw new Error(`unsupported object key at offset ${start}`);
}

function skipWs(source, pos) {
  let i = pos;
  while (i < source.length) {
    if (/\s/.test(source[i])) { i += 1; continue; }
    if (source.startsWith('...', i)) { i += 3; continue; }
    if (source.startsWith('as ', i)) {
      const m = /^as\s+(?:const|[A-Za-z_$][\w$<>\[\]. ]*?)(?=\s*[,;)}\]])/.exec(source.slice(i));
      if (m) { i += m[0].length; continue; }
    }
    break;
  }
  return i;
}

function readObject(source, pos) {
  let i = pos + 1;
  const out = {};
  for (;;) {
    i = skipWs(source, i);
    if (i >= source.length) throw new Error('unterminated object');
    if (source[i] === '}') return { value: out, end: i + 1 };
    const { key, end: keyEnd } = readKey(source, i);
    i = skipWs(source, keyEnd);
    if (source[i] !== ':') throw new Error(`expected ':' after key ${key}`);
    i = skipWs(source, i + 1);
    const { value, end } = readValue(source, i);
    out[key] = value;
    i = skipWs(source, end);
    if (source[i] === ',') { i += 1; continue; }
  }
}

function readArray(source, pos) {
  let i = pos + 1;
  const out = [];
  for (;;) {
    i = skipWs(source, i);
    if (i >= source.length) throw new Error('unterminated array');
    if (source[i] === ']') return { value: out, end: i + 1 };
    const { value, end } = readValue(source, i);
    out.push(value);
    i = skipWs(source, end);
    if (source[i] === ',') { i += 1; continue; }
  }
}

/** Find `export const NAME: Type = <literal>` and return the parsed literal. */
function readConstLiteral(source, name) {
  const pattern = new RegExp(`export\\s+const\\s+${name}\\s*(?::[^=]*?)?=\\s*`, 'm');
  const match = pattern.exec(source);
  if (!match) throw new Error(`export const ${name} not found`);
  const start = match.index + match[0].length;
  const { value } = readValue(source, start);
  return value;
}

// ---------------------------------------------------------------------------
// Canonical truth extraction
// ---------------------------------------------------------------------------

const CANONICAL_FILES = {
  capabilityTruth: 'shared/capability-truth.ts',
  toolContracts: 'mcp-server/src/tool-contracts.ts',
  toolCapabilities: 'mcp-server/src/tool-capabilities.generated.ts',
};

// The FarmDash source repository may or may not be checked out alongside this
// repository. When it is present, canonical truth is re-derived live from the
// executable contracts. When it is absent, the vendored snapshot is used so
// the validator still runs standalone.
const SNAPSHOT_PATH = join(REPO_ROOT, 'reference', 'farmdash-runtime-truth.snapshot.json');

function canonicalSourceAvailable() {
  return Object.values(CANONICAL_FILES).every((rel) => existsSync(join(REPO_ROOT, rel)));
}

function loadCanonical() {
  if (canonicalSourceAvailable()) {
    const paths = {};
    for (const [key, rel] of Object.entries(CANONICAL_FILES)) {
      paths[key] = join(REPO_ROOT, rel);
    }
    return {
      mode: 'live',
      capabilityTruth: readFileSync(paths.capabilityTruth, 'utf8'),
      toolContracts: readFileSync(paths.toolContracts, 'utf8'),
      toolCapabilities: readFileSync(paths.toolCapabilities, 'utf8'),
    };
  }
  if (!existsSync(SNAPSHOT_PATH)) {
    fail(
      'no canonical FarmDash source and no vendored snapshot found.\n' +
      `  expected source: ${join(REPO_ROOT, CANONICAL_FILES.capabilityTruth)}\n` +
      `  expected snapshot: ${SNAPSHOT_PATH}`,
    );
  }
  return { mode: 'snapshot', snapshot: JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) };
}

/**
 * Parse the canonical capability matrix.
 *
 * Canonical shape is `export const CAPABILITY_TRUTH = Object.freeze({ ... } as const)`
 * — a keyed object whose values are `{ status, prerequisite }` — so both the
 * frozen-object form and a bare array form are accepted.
 */
function extractCapabilityRows(source) {
  const structural = blankCommentsAndStrings(source);
  const start = structural.search(/export\s+const\s+[A-Za-z_$][\w$]*\s*(?::[^=]*?)?=\s*/);
  if (start < 0) throw new Error('capability truth export not found');
  // Offsets align between the blanked and original views, so values are read
  // from the ORIGINAL source — the blanked view has emptied every literal.
  const assign = source.slice(start);
  const eq = assign.indexOf('=');
  let pos = eq + 1;

  // Skip past `Object.freeze(` when present.
  const freeze = /^\s*Object\.freeze\s*\(/.exec(assign.slice(pos));
  if (freeze) pos += freeze[0].length;

  const { value } = readValue(assign, pos);
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([key, v]) => ({
      capability: key,
      status: v && typeof v === 'object' ? v.status : undefined,
      prerequisite: v && typeof v === 'object' ? v.prerequisite : undefined,
    }));
  }
  throw new Error('capability truth is neither an array nor an object literal');
}

/** Parse the canonical tool contract registry. */
function extractToolContracts(source) {
  const structural = blankCommentsAndStrings(source);
  const rows = [];
  const entry = /mcpRegistered\s*:\s*(true|false)/g;
  let m;
  while ((m = entry.exec(structural)) !== null) {
    // Read toolName from the ORIGINAL source at the same offsets.
    const before = source.slice(Math.max(0, m.index - 4000), m.index);
    const toolNameMatches = [...before.matchAll(/toolName\s*:\s*['"]([^'"]+)['"]/g)];
    const toolName = toolNameMatches.length ? toolNameMatches[toolNameMatches.length - 1][1] : null;
    rows.push({
      toolName,
      mcpRegistered: m[1] === 'true',
    });
  }
  return rows.filter((r) => r.toolName);
}

// ---------------------------------------------------------------------------
// Skill-side assertions
// ---------------------------------------------------------------------------

function parseSkillArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--skill-dir' && argv[i + 1]) { args.skillDir = argv[i + 1]; i += 1; }
  }
  return args;
}

const args = parseSkillArgs(process.argv.slice(2));
const skillDir = args.skillDir
  ? resolve(args.skillDir)
  : join(REPO_ROOT, 'skills', 'defi-autonomous-operator');

if (!existsSync(skillDir)) fail(`skill directory not found: ${skillDir}`);

const skillMdPath = join(skillDir, 'SKILL.md');
const matrixPath = join(skillDir, 'references', 'capability-matrix.md');
const evalsPath = join(skillDir, 'evals', 'evals.json');

for (const p of [skillMdPath, matrixPath, evalsPath]) {
  if (!existsSync(p)) fail(`required skill file missing: ${p}`);
}

const skillMd = readFileSync(skillMdPath, 'utf8');
const matrixMd = readFileSync(matrixPath, 'utf8');





const evals = JSON.parse(readFileSync(evalsPath, 'utf8'));

const canonical = loadCanonical();

let capabilityRows;
let toolContracts;
if (canonical.mode === 'live') {
  capabilityRows = extractCapabilityRows(canonical.capabilityTruth);
  toolContracts = extractToolContracts(canonical.toolContracts);
} else {
  const snap = canonical.snapshot;
  capabilityRows = Object.entries(snap.capabilityTruth || {}).map(([capability, v]) => ({
    capability,
    status: v.status,
    prerequisite: v.prerequisite,
  }));
  const inv = snap.toolInventory || {};
  toolContracts = [];
  for (const tool of inv.registeredTools || []) {
    toolContracts.push({ toolName: tool, mcpRegistered: true });
  }
  for (const tool of inv.httpOnlyContracts || []) {
    toolContracts.push({ toolName: tool, mcpRegistered: false });
  }
}



function check(label, condition, detail) {
  checks.push({ label, ok: Boolean(condition), detail });
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
}

const failures = [];
const checks = [];

// ---------------------------------------------------------------------------
// Authority-model assertions
// ---------------------------------------------------------------------------
// These enforce the mode-specific delegation distinction against its executable
// source. This is the check the earlier wording-only validator lacked.

// --- Authority-contract sources -------------------------------------------
// The mode-selection contract and the execution-authority service are the
// executable source for the delegation distinction. The skill must match them.
const AUTHORITY_SOURCES = {
  modeSelection: 'mcp-server/src/executionModeSelection.generated.ts',
  executionAuthority: 'services/ExecutionAuthorityService.ts',
};

function loadAuthoritySource(rel) {
  const abs = join(REPO_ROOT, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
}

function extractModeDelegationMap(source) {
  // Parse `requires_owner_delegation` per execution mode from the generated
  // selection contract. This is the executable source of the USER_SIGNED vs
  // BOUNDED_AUTONOMOUS distinction.
  const map = {};
  const modeRe = /'([a-z_]+)':\s*\{([\s\S]*?)\n\s{4}\}/g;
  let m;
  while ((m = modeRe.exec(source)) !== null) {
    const mode = m[1];
    const body = m[2];
    const d = body.match(/requires_owner_delegation:\s*(true|false)/);
    if (d) map[mode] = d[1] === 'true';
  }
  return map;
}

function extractGrantInvariants(source) {
  // Extract the required grant properties enforced by the authority service.
  const found = new Set();
  for (const key of [
    'signer', 'session', 'wallet', 'chain', 'protocol', 'asset', 'action',
    'max_value', 'budget', 'gas_limit', 'slippage_bps', 'valid_until',
    'nonce', 'revoked',
  ]) {
    if (new RegExp(`\\b${key}\\b`).test(source)) found.add(key);
  }
  return [...found];
}

const skillText = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
const authorityRef = existsSync(join(skillDir, 'references', 'authority-model.md'))
  ? readFileSync(join(skillDir, 'references', 'authority-model.md'), 'utf8')
  : '';
const troubleshooting = existsSync(join(skillDir, 'references', 'troubleshooting.md'))
  ? readFileSync(join(skillDir, 'references', 'troubleshooting.md'), 'utf8')
  : '';

let modeSource = loadAuthoritySource(AUTHORITY_SOURCES.modeSelection);
let authoritySource = loadAuthoritySource(AUTHORITY_SOURCES.executionAuthority);

// In snapshot mode the FarmDash source is absent. The snapshot still carries
// the authoritative mode-selection contract, so the delegation distinction is
// checked either way and can never be silently skipped.
// In snapshot mode the mode-selection contract is carried as data rather than
// as TypeScript source, so it is read from the snapshot directly.
const snapMode = canonical.snapshot
  ? canonical.snapshot.executionModeSelection?.requiresOwnerDelegation
  : undefined;
const snapInvariants = canonical.snapshot
  ? canonical.snapshot.grantInvariants
  : undefined;

const modeMap = modeSource
  ? extractModeDelegationMap(modeSource)
  : snapMode;
const us = modeMap?.USER_SIGNED;
const ba = modeMap?.BOUNDED_AUTONOMOUS;
if (us === undefined || ba === undefined) {
  fail('could not read requires_owner_delegation from either the live contract or the snapshot');
}

{
  check('canonical: USER_SIGNED requires no owner delegation', us === false,
        `requires_owner_delegation=${us}`);
  check('canonical: BOUNDED_AUTONOMOUS requires owner delegation', ba === true,
        `requires_owner_delegation=${ba}`);

  // The skill must state the distinction in the same direction.
  const skillHasUserSigned = /USER_SIGNED[^\n]*delegation required:\s*no/i.test(skillText);
  const skillHasBounded = /BOUNDED_AUTONOMOUS[^\n]*delegation required:\s*yes/i.test(skillText);
  check('SKILL.md states USER_SIGNED requires no delegation', skillHasUserSigned);
  check('SKILL.md states BOUNDED_AUTONOMOUS requires delegation', skillHasBounded);

  // The contradiction the owner found must never return.
  const badGrantLine = /require an owner-signed grant/i.test(troubleshooting);
  const goodRow = /USER_SIGNED[^\n]*fresh user approval/i.test(troubleshooting);
  check('troubleshooting does not demand a grant for USER_SIGNED',
        !badGrantLine || goodRow);
}

const invariants = authoritySource
  ? extractGrantInvariants(authoritySource)
  : (snapInvariants || []);
check('canonical authority contract exposes grant invariants',
      invariants.length >= 10, `${invariants.length} dimensions`);
// Every policy-limit dimension the runtime enforces must appear in the authority
// reference; otherwise the skill describes a weaker contract than reality.
for (const key of invariants) {
  check(`authority-model.md covers grant dimension '${key}'`,
        authorityRef.includes(key));
}

// --- 1. Capability status assertions in the skill must match canonical truth ---

const canonicalStatusByCapability = new Map();
for (const row of capabilityRows) {
  if (!row || typeof row !== 'object') continue;
  const key = row.capability ?? row.id ?? row.key ?? row.name;
  const status = row.status ?? row.availability ?? row.state;
  if (key && status) canonicalStatusByCapability.set(String(key), String(status));
}

check(
  'canonical capability rows are parseable',
  canonicalStatusByCapability.size > 0,
  `parsed ${canonicalStatusByCapability.size} rows`,
);

// Every capability the skill's matrix names must exist in canonical truth with
// the same status.
const matrixRows = [...matrixMd.matchAll(/\|\s*`([A-Za-z0-9_.]+)`\s*\|\s*`([a-z_]+)`\s*\|/g)];
check('skill matrix declares capability rows', matrixRows.length > 0, `${matrixRows.length} rows`);

for (const [, capability, status] of matrixRows) {
  const canonicalStatus = canonicalStatusByCapability.get(capability);
  check(
    `capability ${capability} status matches canonical truth`,
    canonicalStatus !== undefined && canonicalStatus === status,
    canonicalStatus === undefined
      ? 'not present in canonical capability truth'
      : `skill says ${status}, canonical says ${canonicalStatus}`,
  );
}

// --- 2. The skill must not assert a capability canonical truth does not have ---

const claimedCapabilities = new Set(
  [...skillMd.matchAll(/\b(spot|futures|solana|erc4337|mee|acp)\b[._]([A-Z0-9_]+)\b/gi)]
    .map((m) => `${m[1].toUpperCase()}_${m[2]}`),
);
for (const claimed of claimedCapabilities) {
  check(
    `claimed capability ${claimed} exists in canonical truth`,
    canonicalStatusByCapability.has(claimed),
    'not found in canonical capability truth',
  );
}

// --- 3. Tool names referenced by the skill must exist in the contract registry ---

const registeredTools = new Set(
  toolContracts.filter((t) => t.mcpRegistered).map((t) => t.toolName),
);
const httpOnlyTools = new Set(
  toolContracts.filter((t) => !t.mcpRegistered).map((t) => t.toolName),
);

// Scan every reference document, not just SKILL.md and the capability matrix.
// SKILL.md deliberately avoids hard-coding tool identifiers (see invariant 4);
// the references are where concrete tools are named, and drift there matters.
const toolDocs = [skillMd, matrixMd];
const refDir = join(skillDir, 'references');
if (existsSync(refDir)) {
  for (const entry of readdirSync(refDir)) {
    if (entry.endsWith('.md')) {
      toolDocs.push(readFileSync(join(refDir, entry), 'utf8'));
    }
  }
}

const referencedTools = new Set();
for (const doc of toolDocs) {
  for (const m of doc.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)) {
    if (/_(token|key|hash|amount|price|url|id)$/.test(m[1])) continue;
    referencedTools.add(m[1]);
  }
}

let toolChecks = 0;
const TOOL_PREFIX = /^(get|set|list|prepare|verify|execute|submit|read|write|create|check|query|simulate|register|revoke|pause|resume|configure|autopilot|history|quote|vouch)[_]/;
for (const tool of referencedTools) {
  if (!TOOL_PREFIX.test(tool)) continue;
  toolChecks += 1;
  check(
    `referenced tool \`${tool}\` exists in canonical contracts`,
    registeredTools.has(tool) || httpOnlyTools.has(tool),
    'not found in the canonical tool contract registry',
  );
}
check('skill references runtime tools to validate', toolChecks > 0, `${toolChecks} tool identifiers checked`);

// --- 4. The skill must not hard-code a canonical tool inventory count ---

check(
  'SKILL.md does not hard-code a tool inventory count',
  !/\b\d{2,3}\s+(?:MCP\s+)?tools\b/i.test(skillMd),
  'authored tool count found in SKILL.md',
);

// --- 5. Evaluation dataset integrity ---

const evalList = Array.isArray(evals.evals) ? evals.evals : [];
check('eval dataset declares skill_name', evals.skill_name === 'defi-autonomous-operator');
check('eval dataset is non-empty', evalList.length > 0, `${evalList.length} entries`);

const ids = evalList.map((e) => e.id);
check('eval ids are unique', new Set(ids).size === ids.length);
check(
  'every eval entry has id, prompt, expected_output',
  evalList.every((e) => e && e.id && e.prompt && e.expected_output),
);
check(
  'negative routing cases exist',
  evalList.some((e) => e.expected_skill === null),
);
check(
  'adversarial authority cases exist',
  evalList.filter((e) => String(e.id).startsWith('adversarial-')).length >= 10,
  `${evalList.filter((e) => String(e.id).startsWith('adversarial-')).length} adversarial cases`,
);

// --- 6. Security invariants must be stated in the skill body ---

const requiredInvariants = [
  ['zero-custody', /never request, receive, store, echo, transform or transmit/i],
  ['session is not authority', /session\s+is\s+not\s+authority/i],
  ['payment is not authority', /payment\s+is\s+not\s+authority/i],
  ['simulation is not authority', /simulation\s+is\s+not\s+authority/i],
  ['submission is not settlement', /submission\s+is\s+not\s+settlement/i],
  ['tool availability is not authority', /tool\s+availability\s+is\s+not\s+authority/i],
  ['ambiguous submission rule', /not permission to retry/i],
];
for (const [label, pattern] of requiredInvariants) {
  check(`SKILL.md states invariant: ${label}`, pattern.test(skillMd));
}

// The skill must route tool-inventory questions to the live manifest rather
// than carrying an authored count. That routing instruction lives in the
// capability matrix, so it is asserted there.
check(
  'capability matrix routes tool inventory to the live manifest',
  /consult the current inventory at runtime/i.test(matrixMd),
  'missing instruction to consult the current tool inventory at runtime',
);

// Numeric tool-inventory counts are authored prose that goes stale, so they
// must not appear in the skill body or the capability matrix.
check(
  'authored docs carry no numeric tool inventory count',
  !/\b\d{2,3}\s+(?:MCP\s+)?tools\b/i.test(skillMd + matrixMd),
  'numeric tool inventory count found in authored docs',
);

// --- Report ---

const passed = checks.filter((c) => c.ok).length;
console.log(`defi-autonomous-operator truth validation`);
console.log(`  truth source              : ${canonical.mode === 'live' ? 'live FarmDash source' : 'vendored snapshot'}`);
console.log(`  canonical capability rows : ${canonicalStatusByCapability.size}`);
console.log(`  canonical tool contracts   : ${registeredTools.size} MCP / ${httpOnlyTools.size} HTTP-only`);
console.log(`  assertions run             : ${checks.length}`);
console.log(`  passed                     : ${passed}`);
console.log(`  failed                     : ${failures.length}`);

if (failures.length) {
  console.error('\nDRIFT DETECTED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log('\nOK: the skill matches canonical FarmDash truth.');
