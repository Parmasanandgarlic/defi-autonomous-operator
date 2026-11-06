#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 Parmasanandgarlic. All rights reserved.
/**
 * FarmDash canonical truth extractor (dependency-free).
 *
 * Parses the canonical FarmDash sources that define the execution-authority
 * contract and emits the mechanical truth that the NVIDIA-edition skill
 * references must agree with.
 *
 * Read-only by construction: this script never writes to canonical source.
 *
 * Usage:
 *   node scripts/nvidia-skill/extract-canonical-truth.mjs [--json]
 *
 * Why a hand-rolled parser instead of the repo's TypeScript dependency:
 * this script is a release gate for a security-reviewed artifact, so it adds
 * no import-time dependency and executes no code from the sources it reads.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const read = (p) => readFileSync(resolve(repoRoot, p), 'utf8');

/* ------------------------------------------------------------------ *
 * Minimal TypeScript object-literal reader.
 * Supports: strings ('/"/), numbers, true/false/null, arrays, nested
 * objects, bare or quoted keys, trailing commas, `as const`/`satisfies`
 * suffixes, and an `Object.freeze(...)` wrapper.
 * ------------------------------------------------------------------ */
class LiteralReader {
  constructor(text) {
    this.s = text;
    this.i = 0;
  }

  error(msg) {
    const line = this.s.slice(0, this.i).split('\n').length;
    throw new Error(`literal parse error at line ${line}: ${msg}`);
  }

  skipTrivia() {
    for (;;) {
      while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
      if (this.s.startsWith('//', this.i)) {
        const nl = this.s.indexOf('\n', this.i);
        this.i = nl === -1 ? this.s.length : nl + 1;
        continue;
      }
      if (this.s.startsWith('/*', this.i)) {
        const end = this.s.indexOf('*/', this.i + 2);
        this.i = end === -1 ? this.s.length : end + 2;
        continue;
      }
      return;
    }
  }

  readString() {
    const quote = this.s[this.i];
    this.i++;
    let out = '';
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      if (ch === '\\') {
        const next = this.s[this.i + 1];
        const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '\\': '\\', "'": "'", '"': '"', '`': '`', '0': '\0' };
        if (next === 'u') {
          out += String.fromCharCode(parseInt(this.s.slice(this.i + 2, this.i + 6), 16));
          this.i += 6;
          continue;
        }
        if (next === 'x') {
          out += String.fromCharCode(parseInt(this.s.slice(this.i + 2, this.i + 4), 16));
          this.i += 4;
          continue;
        }
        out += simple[next] ?? next;
        this.i += 2;
        continue;
      }
      if (ch === quote) {
        this.i++;
        return out;
      }
      out += ch;
      this.i++;
    }
    this.error('unterminated string');
  }

  readKey() {
    const ch = this.s[this.i];
    if (ch === '"' || ch === "'" || ch === '`') return this.readString();
    const m = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(this.s.slice(this.i));
    if (!m) this.error(`bad key near "${this.s.slice(this.i, this.i + 24)}"`);
    this.i += m[0].length;
    return m[0];
  }

  /** Skip `as const`, `satisfies X`, and non-null assertions. */
  skipSuffixes() {
    for (;;) {
      const before = this.i;
      this.skipTrivia();
      const m = /^(as\s+const|satisfies\s+[A-Za-z_$][A-Za-z0-9_$.<>]*|!)/.exec(this.s.slice(this.i));
      if (!m) {
        this.i = before;
        return;
      }
      this.i += m[0].length;
    }
  }

  readValue() {
    this.skipTrivia();
    this.skipSuffixes();
    this.skipTrivia();
    const ch = this.s[this.i];

    if (ch === '{') return this.readObject();
    if (ch === '[') return this.readArray();
    if (ch === '"' || ch === "'" || ch === '`') return this.readString();

    const word = /^(true|false|null|undefined|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(this.s.slice(this.i));
    if (word) {
      this.i += word[0].length;
      const w = word[0];
      if (w === 'true') return true;
      if (w === 'false') return false;
      if (w === 'null') return null;
      if (w === 'undefined') return undefined;
      return Number(w);
    }

    // `Object.freeze(<literal>)` and other single-argument wrappers.
    const ident = /^[A-Za-z_$][A-Za-z0-9_$.]*/.exec(this.s.slice(this.i));
    if (ident) {
      this.i += ident[0].length;
      this.skipTrivia();
      if (this.s[this.i] === '(') {
        const call = this.readCallArguments();
        if (call.length === 1) return call[0];
      }
      this.skipSuffixes();
      return undefined;
    }
    this.error(`unsupported value near "${this.s.slice(this.i, this.i + 32)}"`);
  }

  readCallArguments() {
    this.i++; // consume '('
    const args = [];
    for (;;) {
      this.skipTrivia();
      if (this.s[this.i] === ')') {
        this.i++;
        return args;
      }
      if (this.s[this.i] === ',') {
        this.i++;
        continue;
      }
      // A type assertion can trail the argument, e.g. `Object.freeze({...} as const)`.
      const assertion = /^(as\s+(?:const|[A-Za-z_$][A-Za-z0-9_$.<>]*)|satisfies\s+[A-Za-z_$][A-Za-z0-9_$.<>]*)/.exec(
        this.s.slice(this.i),
      );
      if (assertion) {
        this.i += assertion[0].length;
        continue;
      }
      args.push(this.readValue());
      // Consume any assertion that follows the parsed argument.
      this.skipSuffixes();
    }
  }

  readArray() {
    this.i++; // consume '['
    const out = [];
    for (;;) {
      this.skipTrivia();
      if (this.s[this.i] === ']') {
        this.i++;
        return out;
      }
      if (this.s[this.i] === ',') {
        this.i++;
        continue;
      }
      out.push(this.readValue());
      // Consume any assertion that follows the element, e.g. `["A" as const]`.
      this.skipSuffixes();
    }
  }

  readObject() {
    this.i++; // consume '{'
    const out = {};
    for (;;) {
      this.skipTrivia();
      if (this.s[this.i] === '}') {
        this.i++;
        return out;
      }
      if (this.s[this.i] === ',') {
        this.i++;
        continue;
      }
      // Spread in object literals is not used by the canonical sources.
      if (this.s.startsWith('...', this.i)) this.error('spread unsupported in canonical literal');
      const key = this.readKey();
      this.skipTrivia();
      if (this.s[this.i] !== ':') this.error(`expected ':' after key "${key}"`);
      this.i++;
      out[key] = this.readValue();
      // Consume any assertion that follows the property value.
      this.skipSuffixes();
    }
  }
}

/**
 * Read `export const NAME[: Type] = <literal>;` and return the literal value.
 *
 * The type annotation between the name and `=` is skipped, and a trailing
 * `as const` after the literal is tolerated.
 */
function readConstLiteral(source, exportName) {
  const declRe = new RegExp(`export\\s+const\\s+${exportName}\\b`);
  const m = declRe.exec(source);
  if (!m) return undefined;

  // Find the assignment '=' that is not inside the type annotation.
  let i = m.index + m[0].length;
  let angleDepth = 0;
  let bracketDepth = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '<') angleDepth++;
    else if (ch === '>') angleDepth--;
    else if (ch === '[') bracketDepth++;
    else if (ch === ']') bracketDepth--;
    else if (ch === '=' && angleDepth <= 0 && bracketDepth <= 0) {
      const next = source[i + 1];
      if (next !== '=' && next !== '>') break;
    } else if (ch === ';' && angleDepth <= 0 && bracketDepth <= 0) {
      return undefined; // declaration has no value
    }
    i++;
  }
  if (i >= source.length) return undefined;

  const reader = new LiteralReader(source);
  reader.i = i + 1;
  try {
    return reader.readValue();
  } catch (err) {
    throw new Error(`failed to read export const ${exportName}: ${err.message}`);
  }
}

/* ------------------------------------------------------------------ *
 * Canonical sources
 * ------------------------------------------------------------------ */
const capabilityTruth = readConstLiteral(read('shared/capability-truth.ts'), 'CAPABILITY_TRUTH');
const toolCapabilities = readConstLiteral(read('mcp-server/src/tool-capabilities.generated.ts'), 'MCP_TOOL_CAPABILITIES');
const toolDiscovery = readConstLiteral(read('mcp-server/src/tool-discovery.generated.ts'), 'MCP_TOOL_DISCOVERY');
const executionTruth = readConstLiteral(read('mcp-server/src/execution-truth.generated.ts'), 'CAPABILITY_TRUTH');
const modeSelection = readConstLiteral(read('mcp-server/src/executionModeSelection.generated.ts'), 'MCP_EXECUTION_MODE_SELECTION');

/**
 * Tool names declared in the canonical contract registry, split by MCP
 * registration.
 *
 * The registry mixes single- and double-quoted `toolName` values, and it also
 * carries HTTP-only compatibility contracts (`mcpRegistered: false`) that must
 * never inflate MCP discovery. Those are tracked separately so the validator
 * can tell "tool does not exist" from "tool is not an MCP tool".
 */
function contractToolNames() {
  const src = read('mcp-server/src/tool-contracts.ts');
  const registered = new Set();
  const httpOnly = new Set();
  let current = null;
  for (const line of src.split('\n')) {
    const nameMatch = line.match(/^\s*toolName:\s*['"]([a-z0-9_]+)['"],?\s*$/);
    if (nameMatch) {
      current = nameMatch[1];
      continue;
    }
    if (current && /^\s*mcpRegistered:\s*false/.test(line)) {
      httpOnly.add(current);
      current = null;
      continue;
    }
    if (current && /^\s*mcpRegistered:\s*true/.test(line)) {
      registered.add(current);
      current = null;
    }
  }
  // Any contract whose `mcpRegistered` flag never appeared defaults to registered.
  return { registered: [...registered].sort(), httpOnly: [...httpOnly].sort() };
}

const { registered: registered, httpOnly: httpOnlyContracts } = contractToolNames();
const capKeys = Object.keys(toolCapabilities ?? {}).sort();
const discKeys = Object.keys(toolDiscovery ?? {}).sort();

/** The tools the NVIDIA edition names in its instructions and references. */
const NAMED_TOOLS = [
  'get_execution_authority',
  'request_execution_delegation',
  'register_execution_delegation',
  'revoke_execution_authority',
  'prepare_autonomous_swap',
  'confirm_autonomous_swap',
  'release_autonomous_reservation',
  'verify_delegation',
  'create_session',
  'session_heartbeat',
  'get_farming_context',
  'patch_farming_context',
  'get_event_stream_snapshot',
  'get_agent_activity',
  'create_intent',
  'policy_check_intent',
  'simulate_intent',
  'request_approval_payload',
  'submit_signed_approval',
  'get_approval_status',
  'prepare_intent',
  'execute_approved_intent',
  'confirm_execution',
  'get_receipt',
  'configure_autopilot',
  'autopilot_cycle',
  'pause_autopilot',
  'resume_autopilot',
  'grant_session_key',
  'revoke_session_key',
  'session_key_status',
  'get_cycle_status',
  'execute_cycle_actions',
  'create_mee_intent',
  'simulate_mee_intent',
  'submit_mee_intent',
  'get_mee_intent_status',
  'agent_onboard',
];

const truth = {
  sourceRepo: 'hububstudio/farmdashbeta',
  capabilityTruth,
  capabilityTruthRowCount: Object.keys(capabilityTruth ?? {}).length,
  executionTruthMatchesCapabilityTruth:
    JSON.stringify(executionTruth) === JSON.stringify(capabilityTruth),
  toolInventory: {
    registeredTools: registered,
    registeredCount: registered.length,
    capabilityCount: capKeys.length,
    discoveryCount: discKeys.length,
    capabilityDiscoveryParity: JSON.stringify(capKeys) === JSON.stringify(discKeys),
    registeredMissingFromCapabilities: registered.filter((n) => !capKeys.includes(n)),
    capabilitiesNotRegistered: capKeys.filter((n) => !registered.includes(n)),
    httpOnlyContracts: httpOnlyContracts,
    httpOnlyContractCount: httpOnlyContracts.length,
  },
  // The ten policy-limit dimensions are the canonical, enumerable grant
  // invariants. They are what a bounded grant must bind.
  grantInvariants: modeSelection?.options?.BOUNDED_AUTONOMOUS?.policy_limits_required,
  executionModeSelection: {
    default: modeSelection?.default,
    supportedModes: modeSelection?.supported_modes,
    unboundedAutonomySupported: modeSelection?.unbounded_autonomy_supported,
    selectionRequiredBeforeBoundedAutonomy: modeSelection?.selection_required_before_bounded_autonomy,
    omittedExecutionModeResolvesTo: modeSelection?.omitted_execution_mode_resolves_to,
    currentSignerModel: modeSelection?.current_signer_model,
    requiredGrantBinding: modeSelection?.eoa_v1_signer_invariant,
    separateSessionSignerSupported: modeSelection?.separate_session_signer_supported,
    policyLimitDimensions: modeSelection?.policy_limit_dimensions,
    requiresOwnerDelegation: {
      USER_SIGNED: modeSelection?.options?.USER_SIGNED?.requires_owner_delegation,
      BOUNDED_AUTONOMOUS: modeSelection?.options?.BOUNDED_AUTONOMOUS?.requires_owner_delegation,
    },
    authoritySeparation: modeSelection?.authority_separation,
    neverInferAutonomousConsentFrom: modeSelection?.never_infer_autonomous_consent_from,
  },
  namedToolAvailability: Object.fromEntries(
    NAMED_TOOLS.map((name) => [
      name,
      {
        exists: capKeys.includes(name),
        availability: toolCapabilities?.[name]?.availability ?? null,
        tier: toolCapabilities?.[name]?.tier ?? null,
        lifecycleStage: toolDiscovery?.[name]?.lifecycle_stage ?? null,
        sideEffectClass: toolDiscovery?.[name]?.side_effect_class ?? null,
        authorityModel: toolDiscovery?.[name]?.authority_model ?? null,
        prerequisites: toolDiscovery?.[name]?.prerequisites ?? [],
      },
    ]),
  ),
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(truth, null, 2) + '\n');
} else {
  console.log('FarmDash canonical truth');
  console.log('  capability truth rows:', truth.capabilityTruthRowCount);
  console.log('  execution-truth.generated matches shared/capability-truth.ts:', truth.executionTruthMatchesCapabilityTruth);
  console.log('  registered tools:', truth.toolInventory.registeredCount);
  console.log('  capability/discovery parity:', truth.toolInventory.capabilityDiscoveryParity);
  console.log('  default execution mode:', truth.executionModeSelection.default);
  console.log('  unbounded autonomy supported:', truth.executionModeSelection.unboundedAutonomySupported);
  console.log('  policy limit dimensions:', (truth.executionModeSelection.policyLimitDimensions ?? []).length);
  console.log('  authority separation:', JSON.stringify(truth.executionModeSelection.authoritySeparation));
  const missing = Object.entries(truth.namedToolAvailability).filter(([, v]) => !v.exists).map(([k]) => k);
  console.log('  named tools that do not exist:', missing.length ? missing.join(', ') : 'none');
}
