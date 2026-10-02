'use strict';
const __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.cmdSkillIntel = cmdSkillIntel;
const fs_1 = __importDefault(require('fs'));
const path_1 = __importDefault(require('path'));
const logger_1 = require('../utils/logger');
const helpers_1 = require('../utils/helpers');

function cmdSkillIntel(flags, rawArgv, quiet = false) {
  const targetDir = flags.path ? path_1.default.resolve(flags.path) : process.cwd();
  const agentDest = path_1.default.join(targetDir, '.agent');
  const jsonFlag = flags.json || (rawArgv && rawArgv.includes('--json'));
  (0, helpers_1.banner)(quiet || jsonFlag);

  let scriptPath = path_1.default.join(agentDest, 'scripts', 'skill_intelligence.js');
  if (!fs_1.default.existsSync(scriptPath)) {
    // Check local tribunal-kit scripts
    const fallbackPath = path_1.default.join(
      __dirname,
      '..',
      '..',
      'scripts',
      'skill_intelligence.js',
    );
    if (fs_1.default.existsSync(fallbackPath)) {
      scriptPath = fallbackPath;
    } else {
      (0, logger_1.log)(
        `  ${(0, logger_1.c)('red', '✖')} skill_intelligence.js engine not found in ${agentDest} or tribunal-kit scripts`,
      );
      return;
    }
  }

  try {
    const engine = require(scriptPath);

    const raw = rawArgv ? rawArgv.slice(2) : [];
    const isGate = flags.gate || raw.includes('--gate') || raw.includes('-g');
    let needArg = flags.need;
    const needIdx = raw.indexOf('--need');
    if (needIdx !== -1 && raw[needIdx + 1] && !raw[needIdx + 1].startsWith('-')) {
      needArg = raw[needIdx + 1];
    }
    const auditFlag = flags.audit || raw.includes('--audit');
    const jsonFlag = flags.json || raw.includes('--json');

    // Extract positional query
    const positional = raw
      .slice(1)
      .filter((a, idx) => {
        if (a.startsWith('-')) return false;
        const prev = raw.slice(1)[idx - 1];
        if (prev && ['--need', '--path', '--target', '--evidence'].includes(prev)) return false;
        return true;
      })
      .join(' ');

    const query = flags.query || flags.task || (isGate ? null : positional) || null;
    const gateNeed = needArg || (isGate ? positional : null);

    if (auditFlag) {
      engine.runAudit
        ? engine.runAudit(agentDest)
        : (0, logger_1.log)('Audit not directly exposed.');
      return;
    }

    const isContract = flags.contract || raw.includes('--contract');
    const evidenceArg =
      flags.evidence ||
      (raw.indexOf('--evidence') !== -1 ? raw[raw.indexOf('--evidence') + 1] : null);

    if (isContract && query) {
      if (engine.analyzeTask) {
        const analysis = engine.analyzeTask(query, agentDest);
        if (jsonFlag) {
          console.log(JSON.stringify(analysis.outcome_contract, null, 2));
          return;
        }
        (0, logger_1.log)(`  ${(0, logger_1.bold)('OUTCOME CONTRACT')}`);
        (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
        (0, logger_1.log)(
          `  Objective: ${(0, logger_1.bold)(analysis.outcome_contract.objective)}`,
        );
        console.log();
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Material Considerations:')}`);
        for (const mc of analysis.outcome_contract.material_considerations || []) {
          (0, logger_1.log)(
            `    • ${(0, logger_1.bold)(mc.title)} (${mc.category}) — ${(0, logger_1.c)('gray', mc.rationale)}`,
          );
        }
        console.log();
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Success Conditions:')}`);
        for (const sc of analysis.outcome_contract.success_conditions || []) {
          (0, logger_1.log)(`    ✔ ${sc}`);
        }
        console.log();
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Non-Goals (Anti-Overengineering Bounds):')}`);
        for (const ng of analysis.outcome_contract.non_goals || []) {
          (0, logger_1.log)(`    ✗ ${(0, logger_1.c)('gray', ng)}`);
        }
        console.log();
        return;
      }
    }

    const isJudgment = flags.judgment || raw.includes('--judgment');
    if (isJudgment && query && engine.analyzeTask) {
      const analysis = engine.analyzeTask(query, agentDest);
      if (jsonFlag) {
        console.log(
          JSON.stringify(
            {
              judgment: analysis.judgment,
              conflicts: analysis.conflicts,
              reversibility: analysis.reversibility,
              counterfactuals: analysis.counterfactuals,
              anti_slop: analysis.anti_slop,
              institutional_lessons: analysis.institutional_lessons,
            },
            null,
            2,
          ),
        );
        return;
      }

      (0, logger_1.log)(`  ${(0, logger_1.bold)('ENGINEERING JUDGMENT & ADAPTIVE MODEL')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      (0, logger_1.log)(
        `  Judgment State: ${(0, logger_1.bold)(analysis.judgment ? analysis.judgment.state : 'PROCEED')}`,
      );
      (0, logger_1.log)(
        `  Reversibility: ${(0, logger_1.c)('yellow', analysis.reversibility.classification)} — ${(0, logger_1.c)('gray', analysis.reversibility.warning)}`,
      );
      console.log();

      if (analysis.conflicts && analysis.conflicts.length > 0) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Requirement Conflicts Detected:')}`);
        for (const cf of analysis.conflicts) {
          (0, logger_1.log)(`    ⚠ ${(0, logger_1.bold)(cf.conflict)}`);
          (0, logger_1.log)(`      ${(0, logger_1.c)('gray', cf.explanation)}`);
          (0, logger_1.log)(
            `      Action Required: ${(0, logger_1.c)('yellow', cf.action_required)}`,
          );
        }
        console.log();
      }

      if (analysis.counterfactuals && analysis.counterfactuals.length > 0) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Counterfactual Stress Analysis:')}`);
        for (const ct of analysis.counterfactuals) {
          (0, logger_1.log)(
            `    • ${(0, logger_1.bold)(ct.scenario)}: ${(0, logger_1.c)('gray', ct.question)}`,
          );
          (0, logger_1.log)(`      Mitigation: ${(0, logger_1.c)('cyan', ct.mitigation_required)}`);
        }
        console.log();
      }

      if (analysis.institutional_lessons && analysis.institutional_lessons.length > 0) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Relevant Institutional Memory:')}`);
        for (const il of analysis.institutional_lessons) {
          (0, logger_1.log)(
            `    ★ ${(0, logger_1.bold)(il.pattern)}: ${(0, logger_1.c)('gray', il.lesson)}`,
          );
        }
        console.log();
      }
      return;
    }

    const isAntiSlop = flags['anti-slop'] || flags.antislop || raw.includes('--anti-slop');
    if (isAntiSlop && query && engine.analyzeTask) {
      const analysis = engine.analyzeTask(query, agentDest);
      const smells = analysis.anti_slop || {};
      if (jsonFlag) {
        console.log(JSON.stringify(smells, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('ARCHITECTURAL ANTI-SLOP AUDIT')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      (0, logger_1.log)(`  Assessment: ${(0, logger_1.bold)(smells.recommendation)}`);
      if (smells.overengineering && smells.overengineering.length > 0) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Overengineering Smells Detected:')}`);
        for (const o of smells.overengineering) {
          (0, logger_1.log)(
            `    ✖ ${(0, logger_1.c)('red', o.smell)}: ${(0, logger_1.c)('gray', o.reason)}`,
          );
        }
      }
      if (smells.underengineering && smells.underengineering.length > 0) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Underengineering Smells Detected:')}`);
        for (const u of smells.underengineering) {
          (0, logger_1.log)(
            `    ⚠ ${(0, logger_1.c)('yellow', u.smell)} (${u.severity}): ${(0, logger_1.c)('gray', u.reason)}`,
          );
        }
      }
      console.log();
      return;
    }

    const isMemory = flags.memory || raw.includes('--memory');
    if (isMemory && query && engine.analyzeTask) {
      const analysis = engine.analyzeTask(query, agentDest);
      const mems = analysis.memories || {};
      if (jsonFlag) {
        console.log(JSON.stringify({ memories: mems, metrics: analysis.metrics }, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('TRIBUNAL ENGINEERING MEMORY INTELLIGENCE')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      (0, logger_1.log)(
        `  Retrieved Memory Hypotheses: ${(0, logger_1.bold)(String((mems.retrieved || []).length))}`,
      );
      console.log();

      if (mems.patterns && mems.patterns.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('green', 'VERIFIED PATTERN HYPOTHESES:'))}`,
        );
        for (const p of mems.patterns) {
          (0, logger_1.log)(
            `    • ${(0, logger_1.bold)(p.title)} ${(0, logger_1.c)('gray', `[Score: ${p.retrieval_score} | Trust: ${p.status}]`)}`,
          );
          (0, logger_1.log)(`      ${(0, logger_1.c)('gray', p.content)}`);
        }
        console.log();
      }

      if (mems.failures_to_avoid && mems.failures_to_avoid.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('red', 'HISTORICAL FAILURES TO AVOID (NEGATIVE KNOWLEDGE):'))}`,
        );
        for (const f of mems.failures_to_avoid) {
          (0, logger_1.log)(
            `    ✖ ${(0, logger_1.bold)(f.title)} ${(0, logger_1.c)('gray', `[Trust: ${f.status}]`)}`,
          );
          if (f.failure?.cause)
            (0, logger_1.log)(`      Cause: ${(0, logger_1.c)('yellow', f.failure.cause)}`);
          if (f.failure?.fix)
            (0, logger_1.log)(`      Fix:   ${(0, logger_1.c)('green', f.failure.fix)}`);
        }
        console.log();
      }

      if (mems.verification_strategies && mems.verification_strategies.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('cyan', 'REUSABLE VERIFICATION STRATEGIES:'))}`,
        );
        for (const v of mems.verification_strategies) {
          (0, logger_1.log)(`    ✔ ${(0, logger_1.bold)(v.title)}`);
          (0, logger_1.log)(
            `      ${(0, logger_1.c)('gray', v.verification?.strategy || v.content)}`,
          );
        }
        console.log();
      }

      if (analysis.metrics) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Phase 5 Governance Telemetry:')}`);
        (0, logger_1.log)(
          `    Retrieval Precision: ${(0, logger_1.bold)(String(analysis.metrics.memory_retrieval_precision))}`,
        );
        (0, logger_1.log)(
          `    Useful Memory Rate:  ${(0, logger_1.bold)(String(analysis.metrics.useful_memory_rate))}`,
        );
        (0, logger_1.log)(
          `    Failures Prevented:  ${(0, logger_1.bold)(String(analysis.metrics.repeated_failure_prevention))}`,
        );
        console.log();
      }
      return;
    }

    const isFailures = flags.failures || raw.includes('--failures');
    if (isFailures) {
      const store = engine.getEngineeringMemoryStore ? engine.getEngineeringMemoryStore() : null;
      const fails = store
        ? store.getAll().filter(m => m.type === 'failure' || m.type === 'anti_pattern')
        : [];
      if (jsonFlag) {
        console.log(JSON.stringify(fails, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('HISTORICAL FAILURE & NEGATIVE KNOWLEDGE VAULT')}`);
      (0, logger_1.log)(
        `  Total Registered Failure Modes: ${(0, logger_1.bold)(String(fails.length))}`,
      );
      console.log();
      for (const f of fails) {
        (0, logger_1.log)(
          `  • ${(0, logger_1.bold)(f.title)} ${(0, logger_1.c)('gray', `[${f.status}]`)}`,
        );
        (0, logger_1.log)(`    ${(0, logger_1.c)('gray', f.content)}`);
        if (f.failure?.fix)
          (0, logger_1.log)(`    Fix: ${(0, logger_1.c)('green', f.failure.fix)}`);
      }
      console.log();
      return;
    }

    const isProposals = flags.proposals || raw.includes('--proposals');
    if (isProposals) {
      const mgr = engine.getSkillImprovementManager ? engine.getSkillImprovementManager() : null;
      const props = mgr ? mgr.getProposals() : [];
      if (jsonFlag) {
        console.log(JSON.stringify(props, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('CONTINUOUS CAPABILITY IMPROVEMENT PROPOSALS')}`);
      (0, logger_1.log)(`  Pending Proposals: ${(0, logger_1.bold)(String(props.length))}`);
      console.log();
      for (const p of props) {
        (0, logger_1.log)(
          `  • [${(0, logger_1.c)('yellow', p.status)}] ${(0, logger_1.bold)(p.target_skill)}: ${p.observed_weakness}`,
        );
        (0, logger_1.log)(`    Proposed: ${(0, logger_1.c)('cyan', p.proposed_enhancement)}`);
        (0, logger_1.log)(`    Governance: ${(0, logger_1.c)('gray', p.governance_gate.warning)}`);
      }
      console.log();
      return;
    }

    const isTelemetry = flags.telemetry || raw.includes('--telemetry');
    if (isTelemetry) {
      const reg = engine.getSkillTelemetryRegistry ? engine.getSkillTelemetryRegistry() : null;
      const tele = reg ? reg.getAllTelemetry() : [];
      if (jsonFlag) {
        console.log(JSON.stringify(tele, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('SKILL INTELLIGENCE TELEMETRY')}`);
      console.log();
      for (const t of tele) {
        (0, logger_1.log)(
          `  • ${(0, logger_1.bold)(t.skill.padEnd(25))} Activations: ${(0, logger_1.bold)(String(t.activations))} | Material: ${(0, logger_1.c)('green', String(t.material))} | False: ${(0, logger_1.c)('red', String(t.false_activations))} | Precision: ${t.precision_ratio * 100}%`,
        );
      }
      console.log();
      return;
    }

    const isPreMortem =
      flags['pre-mortem'] ||
      flags.premortem ||
      raw.includes('--pre-mortem') ||
      raw.includes('--premortem') ||
      (rawArgv && (rawArgv[2] === 'pre-mortem' || rawArgv[2] === 'premortem'));
    const isSimulate =
      flags.simulate || raw.includes('--simulate') || (rawArgv && rawArgv[2] === 'simulate');
    const isChains = flags.chains || raw.includes('--chains');
    const isClaims = flags.claims || raw.includes('--claims');

    if ((isPreMortem || isSimulate) && query && engine.analyzeTask) {
      const analysis = engine.analyzeTask(query, agentDest);
      if (jsonFlag) {
        console.log(JSON.stringify(analysis.pre_mortem, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('SYSTEM PRE-MORTEM & FAILURE SIMULATION')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      (0, logger_1.log)(
        `  Simulation Level: ${(0, logger_1.c)('yellow', analysis.simulation_plan.selected_level.name)}`,
      );
      console.log();

      (0, logger_1.log)(
        `  ${(0, logger_1.bold)(`Failure Hypotheses & Predictions (${analysis.predictions.length}):`)}`,
      );
      for (const p of analysis.predictions) {
        const impCol = p.impact === 'CRITICAL' ? 'red' : p.impact === 'HIGH' ? 'yellow' : 'cyan';
        (0, logger_1.log)(
          `  • [${(0, logger_1.c)(impCol, p.impact)}] ${(0, logger_1.bold)(p.prediction)} ${(0, logger_1.c)('gray', `(${p.category})`)}`,
        );
        (0, logger_1.log)(`    Reason: ${(0, logger_1.c)('gray', p.reason)}`);
        (0, logger_1.log)(`    Verification: ${(0, logger_1.c)('cyan', p.verification_method)}`);
      }
      console.log();

      if (analysis.failure_chains && analysis.failure_chains.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)(`Causal Failure Chains (${analysis.failure_chains.length}):`)}`,
        );
        for (const fc of analysis.failure_chains) {
          (0, logger_1.log)(
            `  ⚡ ${(0, logger_1.bold)(fc.name || fc.id)} ${(0, logger_1.c)('gray', `[Blast: ${fc.blast_radius} | ${fc.severity}]`)}`,
          );
          (0, logger_1.log)(`     ${(0, logger_1.c)('gray', fc.chain)}`);
        }
        console.log();
      }

      if (analysis.unsupported_claims && analysis.unsupported_claims.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('red', `Unsupported Claims Detected (${analysis.unsupported_claims.length}):`))}`,
        );
        for (const uc of analysis.unsupported_claims) {
          (0, logger_1.log)(
            `  ⚠ ${(0, logger_1.c)('red', `"${uc.claim}"`)} — ${(0, logger_1.c)('gray', uc.reason)}`,
          );
        }
        console.log();
      }
      return;
    }

    const isCrossDomain =
      flags['cross-domain'] ||
      flags.crossdomain ||
      raw.includes('--cross-domain') ||
      raw.includes('--crossdomain') ||
      raw.includes('--interactions');
    if (isCrossDomain && query && engine.analyzeTask) {
      const analysis = engine.analyzeTask(query, agentDest);
      const cd = analysis.cross_domain_analysis;
      if (jsonFlag) {
        console.log(JSON.stringify(cd, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('━━━ CROSS-DOMAIN ENGINEERING ANALYSIS ━━━')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      console.log();

      if (!cd) {
        (0, logger_1.log)(
          `  ${(0, logger_1.c)('green', '✓ Task does not require cross-domain analysis.')}`,
        );
        console.log();
        return;
      }

      // Domains
      const allDomains = new Set();
      for (const i of cd.interactions?.all || []) {
        (i.domains || []).forEach(d => allDomains.add(d));
      }
      if (allDomains.size > 0) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Primary Domains:')}`);
        for (const d of allDomains) {
          (0, logger_1.log)(`    • ${d}`);
        }
        console.log();
      }

      // Critical Interactions
      const criticals = (cd.interactions?.all || []).filter(i => i.priority === 'CRITICAL');
      if (criticals.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('red', `Critical Interactions (${criticals.length}):`))}`,
        );
        for (const ci of criticals) {
          (0, logger_1.log)(
            `    ${(0, logger_1.c)('red', '⚠')} ${(0, logger_1.bold)(`${ci.a} ↔ ${ci.b}`)} [${ci.relationship}]`,
          );
          (0, logger_1.log)(`      Risk: ${(0, logger_1.c)('gray', ci.effect)}`);
          (0, logger_1.log)(`      Why:  ${(0, logger_1.c)('gray', ci.reason)}`);
        }
        console.log();
      }

      // Non-critical interactions
      const nonCriticals = (cd.interactions?.all || []).filter(i => i.priority !== 'CRITICAL');
      if (nonCriticals.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)(`Other Interactions (${nonCriticals.length}):`)}`,
        );
        for (const i of nonCriticals) {
          const col = i.priority === 'HIGH' ? 'yellow' : 'cyan';
          const matchStr = i.match_type === 'INFERRED' ? ' (inferred)' : '';
          (0, logger_1.log)(
            `    • ${(0, logger_1.bold)(`${i.a} ↔ ${i.b}`)} [${(0, logger_1.c)(col, i.priority)}]${matchStr}`,
          );
          (0, logger_1.log)(`      ${(0, logger_1.c)('gray', i.effect)}`);
        }
        console.log();
      }

      // Second-Order Effects
      if (cd.second_order_effects && cd.second_order_effects.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)(`Second-Order Effect Chains (${cd.second_order_effects.length}):`)}`,
        );
        for (const soe of cd.second_order_effects) {
          (0, logger_1.log)(
            `  ⚡ ${(0, logger_1.bold)(soe.name)} [${(0, logger_1.c)(soe.severity === 'CRITICAL' ? 'red' : 'yellow', soe.severity)}]`,
          );
          (0, logger_1.log)(`    ${soe.chain.map(s => s.step).join(' → ')}`);
          if (soe.mitigation)
            (0, logger_1.log)(`    Mitigation: ${(0, logger_1.c)('green', soe.mitigation)}`);
        }
        console.log();
      }

      // Emergent Failures
      if (cd.emergent_failures && cd.emergent_failures.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('red', `Emergent Failure Patterns (${cd.emergent_failures.length}):`))}`,
        );
        for (const ef of cd.emergent_failures) {
          (0, logger_1.log)(
            `    ✖ ${(0, logger_1.bold)(ef.pattern)} [${(0, logger_1.c)(ef.severity === 'CRITICAL' ? 'red' : 'yellow', ef.severity)}]`,
          );
          (0, logger_1.log)(`      ${(0, logger_1.c)('gray', ef.description)}`);
          (0, logger_1.log)(`      Components: ${ef.components_present.join(' + ')}`);
        }
        console.log();
      }

      // Security Boundaries
      if (cd.security_boundaries && cd.security_boundaries.total > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('red', `Security Boundary Concerns (${cd.security_boundaries.total}):`))}`,
        );
        for (const sb of cd.security_boundaries.concerns) {
          (0, logger_1.log)(`    🔒 ${(0, logger_1.bold)(sb.boundary)} [${sb.priority}]`);
          (0, logger_1.log)(`       ${(0, logger_1.c)('gray', sb.question)}`);
        }
        console.log();
      }

      // Resource Contention
      if (cd.resource_contention && cd.resource_contention.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)(`Resource Contention Risks (${cd.resource_contention.length}):`)}`,
        );
        for (const rc of cd.resource_contention) {
          (0, logger_1.log)(
            `    ⚙ ${(0, logger_1.bold)(rc.resource)}: ${(0, logger_1.c)('gray', rc.risk)}`,
          );
          (0, logger_1.log)(`      Mitigation: ${(0, logger_1.c)('green', rc.mitigation)}`);
        }
        console.log();
      }

      // Blind Spots
      if (cd.blind_spots && cd.blind_spots.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('yellow', `Blind Spots Detected (${cd.blind_spots.length}):`))}`,
        );
        for (const bs of cd.blind_spots) {
          (0, logger_1.log)(
            `    ⚠ ${(0, logger_1.bold)(bs.domain)}: ${(0, logger_1.c)('gray', bs.reason)}`,
          );
        }
        console.log();
      }

      // Summary
      (0, logger_1.log)(`  ${(0, logger_1.bold)('Summary:')}`);
      (0, logger_1.log)(
        `    Total Interactions:     ${(0, logger_1.bold)(String(cd.summary.total_interactions))}`,
      );
      (0, logger_1.log)(
        `    Critical Interactions:  ${(0, logger_1.c)('red', String(cd.summary.critical_interactions))}`,
      );
      (0, logger_1.log)(
        `    2nd-Order Chains:       ${(0, logger_1.bold)(String(cd.summary.second_order_chains))}`,
      );
      (0, logger_1.log)(
        `    Failure Propagation:    ${(0, logger_1.bold)(String(cd.summary.failure_propagation_paths))}`,
      );
      (0, logger_1.log)(
        `    Emergent Failures:      ${(0, logger_1.c)('red', String(cd.summary.emergent_failures))}`,
      );
      (0, logger_1.log)(
        `    Validation Tests Gen:   ${(0, logger_1.bold)(String(cd.summary.validation_tests_generated))}`,
      );
      console.log();
      return;
    }

    const isOutcome =
      flags.outcome ||
      flags.decisions ||
      flags.complexity ||
      flags.assumptions ||
      raw.includes('--outcome') ||
      raw.includes('--decisions') ||
      raw.includes('--complexity') ||
      raw.includes('--assumptions');
    if (isOutcome && query && engine.analyzeTask) {
      const analysis = engine.analyzeTask(query, agentDest);
      const opt = analysis.outcome_optimization;
      if (jsonFlag) {
        console.log(JSON.stringify(opt, null, 2));
        return;
      }
      (0, logger_1.log)(
        `  ${(0, logger_1.bold)('━━━ ENGINEERING OUTCOME OPTIMIZATION (PHASE 10) ━━━')}`,
      );
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      (0, logger_1.log)(
        `  Complexity Budget: ${(0, logger_1.bold)(opt.complexity_budget)} ${(0, logger_1.c)('gray', `(${opt.budget_justification})`)}`,
      );
      console.log();

      // Requirements
      if (opt.requirements && opt.requirements.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)(`Discovered Requirements (${opt.requirements.length}):`)}`,
        );
        for (const req of opt.requirements) {
          const color =
            req.priority === 'MANDATORY' ? 'red' : req.priority === 'IMPORTANT' ? 'yellow' : 'gray';
          (0, logger_1.log)(
            `    • [${(0, logger_1.c)(color, req.priority)}] ${(0, logger_1.bold)(req.id)}: ${req.description}`,
          );
          (0, logger_1.log)(`      Why: ${(0, logger_1.c)('gray', req.rationale)}`);
        }
        console.log();
      }

      // Architecture Audit: Justified vs Unjustified
      const audit = opt.architecture_audit;
      if (audit) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Architecture Justification Audit:')}`);
        (0, logger_1.log)(`    Status: ${(0, logger_1.bold)(audit.architecture_balance)}`);

        if (audit.justified_components && audit.justified_components.length > 0) {
          (0, logger_1.log)(`    ${(0, logger_1.c)('green', 'Justified Components:')}`);
          for (const jc of audit.justified_components) {
            (0, logger_1.log)(
              `      ✔ ${(0, logger_1.bold)(jc.component)}: ${(0, logger_1.c)('gray', jc.justification)}`,
            );
          }
        }

        if (audit.unjustified_components && audit.unjustified_components.length > 0) {
          (0, logger_1.log)(
            `    ${(0, logger_1.c)('yellow', 'Anti-Slop Guard (Unjustified Rejected):')}`,
          );
          for (const uc of audit.unjustified_components) {
            (0, logger_1.log)(
              `      ✗ ${(0, logger_1.bold)(uc.component)}: ${(0, logger_1.c)('gray', uc.reason)}`,
            );
          }
        }

        if (
          audit.missing_critical_considerations &&
          audit.missing_critical_considerations.length > 0
        ) {
          (0, logger_1.log)(
            `    ${(0, logger_1.c)('red', 'Under-Engineering Alerts (Missing Considerations):')}`,
          );
          for (const mc of audit.missing_critical_considerations) {
            (0, logger_1.log)(
              `      ⚠ ${(0, logger_1.bold)(mc.consideration)} [${mc.severity}]: ${(0, logger_1.c)('gray', mc.risk)}`,
            );
          }
        }
        console.log();
      }

      // Decision Records
      if (opt.decision_records && opt.decision_records.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)(`Engineering Decision Records (${opt.decision_records.length}):`)}`,
        );
        for (const edr of opt.decision_records) {
          (0, logger_1.log)(
            `    ⚡ ${(0, logger_1.bold)(edr.id)}: ${(0, logger_1.bold)(edr.title)}`,
          );
          (0, logger_1.log)(`      Decision: ${(0, logger_1.c)('green', edr.decision)}`);
          (0, logger_1.log)(`      Reason:   ${(0, logger_1.c)('gray', edr.reason)}`);
          if (edr.alternatives && edr.alternatives.length > 0) {
            (0, logger_1.log)(
              `      Rejected: ${edr.alternatives.map(a => `${a.name} (${a.rejected_reason})`).join('; ')}`,
            );
          }
        }
        console.log();
      }

      // Assumptions & Unknowns
      if (opt.unknowns && opt.unknowns.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('yellow', `Critical Unknowns (${opt.unknowns.length}):`))}`,
        );
        for (const unk of opt.unknowns) {
          (0, logger_1.log)(`    ? ${(0, logger_1.bold)(unk.unknown)}`);
          (0, logger_1.log)(`      Impact:  ${(0, logger_1.c)('gray', unk.impact)}`);
          (0, logger_1.log)(`      Default: ${(0, logger_1.c)('cyan', unk.default_posture)}`);
        }
        console.log();
      }

      // Early Validations
      if (opt.early_validations && opt.early_validations.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)(`Early Validation Probes (${opt.early_validations.length}):`)}`,
        );
        for (const ev of opt.early_validations) {
          (0, logger_1.log)(`    🔍 ${(0, logger_1.bold)(ev.step)}: ${ev.test}`);
          (0, logger_1.log)(`      Expected: ${(0, logger_1.c)('green', ev.expected)}`);
        }
        console.log();
      }

      // Summary Metrics
      const m = opt.phase10_metrics || {};
      (0, logger_1.log)(`  ${(0, logger_1.bold)('Phase 10 Outcome Optimization Telemetry:')}`);
      (0, logger_1.log)(
        `    Requirements Discovered:     ${(0, logger_1.bold)(String(m.requirements_discovered || 0))}`,
      );
      (0, logger_1.log)(
        `    Mandatory Requirements:      ${(0, logger_1.bold)(String(m.mandatory_requirements || 0))}`,
      );
      (0, logger_1.log)(
        `    Decisions Recorded:          ${(0, logger_1.bold)(String(m.decisions_recorded || 0))}`,
      );
      (0, logger_1.log)(
        `    Options Evaluated:           ${(0, logger_1.bold)(String(m.options_evaluated || 0))}`,
      );
      (0, logger_1.log)(
        `    Over-Engineering Prevented:  ${(0, logger_1.c)('green', String(m.overengineering_prevented || 0))}`,
      );
      (0, logger_1.log)(
        `    Under-Engineering Prevented: ${(0, logger_1.c)('cyan', String(m.underengineering_prevented || 0))}`,
      );
      (0, logger_1.log)(
        `    Early Validations Generated: ${(0, logger_1.bold)(String(m.early_validations_generated || 0))}`,
      );
      console.log();
      return;
    }

    if (isChains && query && engine.analyzeTask) {
      const analysis = engine.analyzeTask(query, agentDest);
      if (jsonFlag) {
        console.log(JSON.stringify(analysis.failure_chains, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('CAUSAL FAILURE CHAINS')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      console.log();
      for (const fc of analysis.failure_chains || []) {
        (0, logger_1.log)(
          `  ⚡ ${(0, logger_1.bold)(fc.name || fc.id)} ${(0, logger_1.c)('gray', `[Blast: ${fc.blast_radius} | ${fc.severity}]`)}`,
        );
        (0, logger_1.log)(`     ${(0, logger_1.c)('gray', fc.chain)}`);
      }
      console.log();
      return;
    }

    if (isClaims && query && engine.analyzeTask) {
      const analysis = engine.analyzeTask(query, agentDest);
      if (jsonFlag) {
        console.log(JSON.stringify(analysis.unsupported_claims, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('UNSUPPORTED CLAIMS AUDIT')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      console.log();
      if (!analysis.unsupported_claims || analysis.unsupported_claims.length === 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.c)('green', '✓ No unsupported architectural claims detected.')}`,
        );
      } else {
        for (const uc of analysis.unsupported_claims) {
          (0, logger_1.log)(
            `  ⚠ ${(0, logger_1.c)('red', `"${uc.claim}"`)} — ${(0, logger_1.c)('gray', uc.reason)}`,
          );
          (0, logger_1.log)(`    Action: ${(0, logger_1.c)('yellow', uc.action_required)}`);
        }
      }
      console.log();
      return;
    }

    if (evidenceArg && engine.auditPostExecution) {
      let evidenceData = {};
      try {
        if (fs_1.default.existsSync(evidenceArg)) {
          evidenceData = JSON.parse(fs_1.default.readFileSync(evidenceArg, 'utf8'));
        } else {
          evidenceData = JSON.parse(evidenceArg);
        }
      } catch (_) {}

      const analysis = engine.analyzeTask
        ? engine.analyzeTask(query || 'default task', agentDest)
        : null;
      const outcomeAudit =
        analysis && engine.auditOutcome
          ? engine.auditOutcome(analysis.outcome_contract, evidenceData, { agentDir: agentDest })
          : null;
      const auditRes = engine.auditPostExecution(
        analysis || query || 'default task',
        evidenceData,
        { agentDir: agentDest },
      );

      if (jsonFlag) {
        console.log(JSON.stringify({ ...auditRes, outcome_audit: outcomeAudit }, null, 2));
        return;
      }

      (0, logger_1.log)(`  ${(0, logger_1.bold)('POST-EXECUTION OUTCOME & VERIFICATION AUDIT')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query || 'Default Task')}`);
      if (outcomeAudit) {
        (0, logger_1.log)(
          `  Outcome Status: ${outcomeAudit.is_outcome_complete ? (0, logger_1.c)('green', 'OUTCOME COMPLETE (100% Satisfied)') : (0, logger_1.c)('red', outcomeAudit.status)}`,
        );
        (0, logger_1.log)(
          `  Task vs Outcome: Task Completed: ${(0, logger_1.bold)(outcomeAudit.is_task_complete ? 'YES' : 'NO')} | Outcome: ${(0, logger_1.bold)(outcomeAudit.is_outcome_complete ? 'VERIFIED' : 'INCOMPLETE')}`,
        );
        (0, logger_1.log)(
          `  Outcome Quality Score: ${(0, logger_1.c)(outcomeAudit.outcome_score >= 1 ? 'green' : outcomeAudit.outcome_score >= 0.7 ? 'yellow' : 'red', `${(outcomeAudit.outcome_score * 100).toFixed(0)}%`)}`,
        );
        console.log();

        if (outcomeAudit.satisfied.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('Satisfied Material Considerations:')}`);
          for (const s of outcomeAudit.satisfied) {
            (0, logger_1.log)(
              `    ${(0, logger_1.c)('green', '✓')} ${(0, logger_1.bold)(s.consideration)} — ${(0, logger_1.c)('gray', s.evidence)}`,
            );
          }
          console.log();
        }
        if (outcomeAudit.partially_satisfied.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('Partially Satisfied / Missing Evidence:')}`);
          for (const p of outcomeAudit.partially_satisfied) {
            (0, logger_1.log)(
              `    ${(0, logger_1.c)('yellow', '△')} ${(0, logger_1.bold)(p.consideration)} — ${(0, logger_1.c)('yellow', p.reason || p.evidence)}`,
            );
          }
          console.log();
        }
        if (outcomeAudit.unsatisfied.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('Unsatisfied Material Considerations:')}`);
          for (const u of outcomeAudit.unsatisfied) {
            (0, logger_1.log)(
              `    ${(0, logger_1.c)('red', '✖')} ${(0, logger_1.bold)(u.consideration)} — ${(0, logger_1.c)('red', u.reason)}`,
            );
          }
          console.log();
        }
        if (outcomeAudit.unnecessary_complexity.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('Overengineering / Unnecessary Complexity:')}`);
          for (const un of outcomeAudit.unnecessary_complexity) {
            (0, logger_1.log)(
              `    ${(0, logger_1.c)('red', '⚠')} ${(0, logger_1.bold)(un.component)} — ${(0, logger_1.c)('yellow', un.reason)}`,
            );
          }
          console.log();
        }
      } else {
        (0, logger_1.log)(
          `  Status: ${auditRes.is_complete ? (0, logger_1.c)('green', 'VERIFIED') : (0, logger_1.c)('red', 'ACTION REQUIRED')}`,
        );
        console.log();
      }

      if (auditRes.findings && auditRes.findings.length > 0) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Verification Findings:')}`);
        for (const f of auditRes.findings) {
          const col = f.severity === 'CRITICAL' ? 'red' : f.severity === 'HIGH' ? 'yellow' : 'cyan';
          (0, logger_1.log)(
            `    • [${(0, logger_1.c)(col, f.severity)}] ${(0, logger_1.bold)(f.type)}: ${f.detail}`,
          );
        }
        console.log();
      }

      const allActions = Array.from(
        new Set([
          ...(outcomeAudit ? outcomeAudit.corrective_actions : []),
          ...(auditRes.corrective_actions || []),
        ]),
      );
      if (allActions.length > 0) {
        (0, logger_1.log)(`  ${(0, logger_1.bold)('Corrective Actions Required:')}`);
        for (const act of allActions) {
          (0, logger_1.log)(`    → ${(0, logger_1.c)('yellow', act)}`);
        }
        console.log();
      }
      return;
    }

    if (gateNeed) {
      const res = engine.evaluateCreationGate(gateNeed, agentDest);
      if (flags.json) {
        console.log(JSON.stringify(res, null, 2));
        return;
      }
      (0, logger_1.log)(`  ${(0, logger_1.bold)('New Skill Creation Gate Audit')}`);
      (0, logger_1.log)(`  Capability: ${(0, logger_1.bold)(gateNeed)}`);
      (0, logger_1.log)(
        `  Status:     ${res.canCreate ? (0, logger_1.c)('green', 'APPROVED') : (0, logger_1.c)('red', 'BLOCKED')}`,
      );
      console.log();
      for (const c of res.checks) {
        const icon = c.passed
          ? (0, logger_1.c)('green', '✓ PASS')
          : (0, logger_1.c)('red', '✖ FAIL');
        (0, logger_1.log)(
          `    [${icon}] ${(0, logger_1.bold)(c.name.padEnd(30))} ${(0, logger_1.c)('gray', `(${c.detail})`)}`,
        );
      }
      console.log();
      (0, logger_1.log)(`  ${(0, logger_1.bold)('Decision:')} ${res.recommendation}`);
      console.log();
      return;
    }

    if (query) {
      if (engine.analyzeTask) {
        const analysis = engine.analyzeTask(query, agentDest);
        if (jsonFlag) {
          console.log(JSON.stringify(analysis, null, 2));
          return;
        }

        (0, logger_1.log)(`  ${(0, logger_1.bold)('TASK INTELLIGENCE')}`);
        (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
        if (analysis.risks && analysis.risks.length > 0) {
          (0, logger_1.log)(
            `  Risk Signals: ${(0, logger_1.c)('red', analysis.risks.join(' | '))}`,
          );
        }
        console.log();

        if (analysis.outcome_contract) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('OUTCOME CONTRACT')}`);
          (0, logger_1.log)(
            `  Objective: ${(0, logger_1.bold)(analysis.outcome_contract.objective)}`,
          );
          if (
            analysis.outcome_contract.constraints &&
            analysis.outcome_contract.constraints.length > 0
          ) {
            (0, logger_1.log)(
              `  Constraints: ${(0, logger_1.c)('cyan', analysis.outcome_contract.constraints.join(' | '))}`,
            );
          }
          if (
            analysis.outcome_contract.success_conditions &&
            analysis.outcome_contract.success_conditions.length > 0
          ) {
            (0, logger_1.log)(`  Success Conditions:`);
            analysis.outcome_contract.success_conditions.forEach(sc =>
              (0, logger_1.log)(`    ✔ ${sc}`),
            );
          }
          if (
            analysis.outcome_contract.non_goals &&
            analysis.outcome_contract.non_goals.length > 0
          ) {
            (0, logger_1.log)(`  Non-Goals (Anti-Overengineering Bounds):`);
            analysis.outcome_contract.non_goals.forEach(ng =>
              (0, logger_1.log)(`    ✗ ${(0, logger_1.c)('gray', ng)}`),
            );
          }
          console.log();
        }

        if (analysis.material_considerations && analysis.material_considerations.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('MATERIALITY AUDIT')}`);
          for (const mc of analysis.material_considerations) {
            const sevColor = mc.severity === 'CRITICAL' ? 'red' : 'yellow';
            (0, logger_1.log)(
              `    • [${(0, logger_1.c)(sevColor, mc.severity)}] ${(0, logger_1.bold)(mc.title)} (${mc.category}) — ${(0, logger_1.c)('gray', mc.rationale)}`,
            );
          }
          console.log();
        }

        if (analysis.tradeoffs && analysis.tradeoffs.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('CROSS-DOMAIN TRADEOFF ANALYSIS')}`);
          for (const td of analysis.tradeoffs) {
            (0, logger_1.log)(
              `    ▸ ${(0, logger_1.bold)(td.decision)} ${(0, logger_1.c)('green', `[${td.net_assessment}]`)}`,
            );
            for (const t of td.tradeoffs) {
              const sign = t.effect === 'INCREASED' ? '+' : '-';
              (0, logger_1.log)(`      ${sign} ${(0, logger_1.bold)(t.dimension)}: ${t.detail}`);
            }
            if (td.mitigation) {
              (0, logger_1.log)(
                `      → ${(0, logger_1.c)('yellow', `Mitigation: ${td.mitigation}`)}`,
              );
            }
          }
          console.log();
        }

        (0, logger_1.log)(`  ${(0, logger_1.bold)('CONCEPTS & IMPLICIT CONSIDERATIONS')}`);
        if (analysis.concepts.explicit && analysis.concepts.explicit.length > 0) {
          analysis.concepts.explicit.forEach(c => {
            (0, logger_1.log)(
              `    • ${(0, logger_1.bold)(c.name)} ${(0, logger_1.c)('gray', `(domain: ${c.domain})`)}`,
            );
          });
        }
        if (analysis.concepts.implicit && analysis.concepts.implicit.length > 0) {
          analysis.concepts.implicit.forEach(c => {
            (0, logger_1.log)(
              `    • ${(0, logger_1.bold)(c.name)} ${(0, logger_1.c)('gray', `(domain: ${c.domain})`)} — ${(0, logger_1.c)('yellow', c.reason)}`,
            );
          });
        }
        console.log();

        if (analysis.considerations && analysis.considerations.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('ENGINEERING CONSIDERATIONS')}`);
          const critical = analysis.considerations.filter(c => c.severity === 'CRITICAL');
          const high = analysis.considerations.filter(c => c.severity === 'HIGH');
          const medium = analysis.considerations.filter(c => c.severity === 'MEDIUM');

          if (critical.length > 0) {
            (0, logger_1.log)(`    ${(0, logger_1.bold)((0, logger_1.c)('red', '[CRITICAL]'))}`);
            critical.forEach(c =>
              (0, logger_1.log)(
                `      • ${(0, logger_1.bold)(c.title)} (${c.category}) — ${c.rationale}`,
              ),
            );
          }
          if (high.length > 0) {
            (0, logger_1.log)(`    ${(0, logger_1.bold)((0, logger_1.c)('yellow', '[HIGH]'))}`);
            high.forEach(c =>
              (0, logger_1.log)(
                `      • ${(0, logger_1.bold)(c.title)} (${c.category}) — ${c.rationale}`,
              ),
            );
          }
          if (medium.length > 0) {
            (0, logger_1.log)(`    ${(0, logger_1.bold)((0, logger_1.c)('cyan', '[MEDIUM]'))}`);
            medium.forEach(c =>
              (0, logger_1.log)(
                `      • ${(0, logger_1.bold)(c.title)} (${c.category}) — ${c.rationale}`,
              ),
            );
          }
          console.log();
        }

        if (analysis.coverage && analysis.coverage.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('SKILL COVERAGE')}`);
          (0, logger_1.log)(`    ${'Concept'.padEnd(36)} ${'Coverage'.padEnd(10)} Matched Skill`);
          (0, logger_1.log)(`    ${'─'.repeat(36)} ${'─'.repeat(10)} ${'─'.repeat(20)}`);
          for (const row of analysis.coverage) {
            const covColor =
              row.coverage === 'FULL' ? 'green' : row.coverage === 'PARTIAL' ? 'yellow' : 'red';
            (0, logger_1.log)(
              `    ${row.concept_name.slice(0, 34).padEnd(36)} ${(0, logger_1.c)(covColor, row.coverage.padEnd(10))} ${row.matched_skill || (0, logger_1.c)('gray', 'NONE')}`,
            );
          }
          console.log();
        }

        if (
          analysis.composition &&
          analysis.composition.pipeline &&
          analysis.composition.pipeline.length > 0
        ) {
          (0, logger_1.log)(
            `  ${(0, logger_1.bold)((0, logger_1.c)('green', 'COMPOSED CAPABILITY PIPELINE DAG:'))}`,
          );
          (0, logger_1.log)(`    ${analysis.composition.pipeline.join(' → ')}`);
          console.log();
        }

        if (analysis.pre_mortem) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('SYSTEM PRE-MORTEM & FAILURE PREDICTIONS')}`);
          (0, logger_1.log)(
            `    Simulation Level: ${(0, logger_1.c)('yellow', analysis.simulation_plan?.selected_level?.name || 'Standard')}`,
          );
          (0, logger_1.log)(
            `    Predictions: ${(0, logger_1.bold)(String((analysis.predictions || []).length))} | Failure Chains: ${(0, logger_1.bold)(String((analysis.failure_chains || []).length))}`,
          );
          if (analysis.failure_chains && analysis.failure_chains.length > 0) {
            for (const fc of analysis.failure_chains.slice(0, 2)) {
              (0, logger_1.log)(
                `    ⚡ ${(0, logger_1.bold)(fc.name || fc.id)} ${(0, logger_1.c)('gray', `[Blast: ${fc.blast_radius}]`)}`,
              );
            }
          }
          console.log();
        }

        if (analysis.verification_plan && analysis.verification_plan.length > 0) {
          (0, logger_1.log)(`  ${(0, logger_1.bold)('VERIFICATION PLAN')}`);
          for (const v of analysis.verification_plan) {
            (0, logger_1.log)(
              `    • [${(0, logger_1.bold)(v.target)}] ${v.test}: ${(0, logger_1.c)('gray', v.action)}`,
            );
          }
          console.log();
        }
        return;
      }

      // Fallback to discoverSkills
      const res = engine.discoverSkills(query, agentDest);
      if (jsonFlag) {
        console.log(JSON.stringify(res, null, 2));
        return;
      }

      (0, logger_1.log)(`  ${(0, logger_1.bold)('Tribunal Skill Intelligence Discovery')}`);
      (0, logger_1.log)(`  Task: ${(0, logger_1.c)('cyan', query)}`);
      (0, logger_1.log)(
        `  Discovered Capabilities: ${(0, logger_1.bold)(String(res.totalDiscovered))}`,
      );
      console.log();

      if (res.mandatory.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('red', 'MANDATORY (Critical Safety & Correctness):'))}`,
        );
        res.mandatory.forEach(s => {
          (0, logger_1.log)(
            `    • ${(0, logger_1.bold)(s.skill)} ${(0, logger_1.c)('gray', `(score: ${s.score})`)}`,
          );
        });
        console.log();
      }

      if (res.recommended.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('yellow', 'RECOMMENDED (Architecture & Reliability):'))}`,
        );
        res.recommended.forEach(s => {
          (0, logger_1.log)(
            `    • ${(0, logger_1.bold)(s.skill)} ${(0, logger_1.c)('gray', `(score: ${s.score})`)}`,
          );
        });
        console.log();
      }

      if (res.pipeline.length > 0) {
        (0, logger_1.log)(
          `  ${(0, logger_1.bold)((0, logger_1.c)('green', 'Composed Capability Pipeline DAG:'))}`,
        );
        (0, logger_1.log)(`    ${res.pipeline.join(' → ')}`);
        console.log();
      }
      return;
    }

    // Default help
    (0, logger_1.log)(`  ${(0, logger_1.bold)('Skill Intelligence Engine')}`);
    (0, logger_1.log)(`  Usage:`);
    (0, logger_1.log)(`    tk skill-intel "<task description>"`);
    (0, logger_1.log)(`    tk skill-intel --gate --need "<capability>"`);
    (0, logger_1.log)(`    tk skill-intel --audit`);
    console.log();
  } catch (err) {
    (0, logger_1.log)(
      `  ${(0, logger_1.c)('red', '✖')} Error executing skill-intel: ${err.message}`,
    );
  }
}
