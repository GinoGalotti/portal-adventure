/**
 * CLI entry point for the simulation system.
 *
 * Usage:
 *   npm run simulate                                  # all strategies, mystery-001, 100 runs
 *   npm run simulate:quick                            # same but 100 runs
 *   npm run simulate -- --mystery mystery-001 --strategy balanced --runs 200
 *   npm run simulate -- --seed abc123 --verbose       # single verbose run
 *   npm run simulate -- --experiment experiments/baseline.json
 *   npm run simulate -- --compare experiments/baseline.json experiments/high-armor.json
 *   npm run simulate -- --output reports/sim-001.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { MysteryDefinition, PlaybookStats } from '../src/engine/types'
import type { HunterDef, ExperimentConfig, RunResult } from './types'
import { runSimulation } from './runner'
import {
  createStrategy,
  STRATEGY_NAMES,
} from './strategies'
import {
  formatRunVerbose,
  aggregateRuns,
  printAggregateTables,
  printComparisonTable,
  type AggregateStats,
  type ExperimentSummary,
} from './reporter'

// ─── Path Helpers ─────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function rootPath(...parts: string[]): string {
  return resolve(ROOT, ...parts)
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

interface PlaybookData {
  id: string
  baseStats: PlaybookStats
  bondCapacity: number
}

function loadPlaybooks(): PlaybookData[] {
  const raw = readFileSync(rootPath('data', 'playbooks.json'), 'utf8')
  const data = JSON.parse(raw) as { playbooks: PlaybookData[] }
  return data.playbooks
}

function loadMystery(idOrPath: string): MysteryDefinition {
  const path = idOrPath.endsWith('.json')
    ? rootPath(idOrPath)
    : rootPath('data', 'mysteries', `${idOrPath}.json`)
  const raw = readFileSync(path, 'utf8')
  return JSON.parse(raw) as MysteryDefinition
}

function applyMysteryOverrides(
  def: MysteryDefinition,
  overrides: ExperimentConfig['mysteryOverrides'],
): MysteryDefinition {
  if (!overrides) return def
  const patched = structuredClone(def)
  if (overrides.monster) {
    Object.assign(patched.monster, overrides.monster)
  }
  if (overrides.clockConfig) {
    patched.countdownDef.clockConfig = {
      ...(patched.countdownDef.clockConfig ?? {}),
      ...overrides.clockConfig,
    }
  }
  return patched
}

function buildHunterDefs(
  experimentHunters: ExperimentConfig['hunters'],
  playbooks: PlaybookData[],
): HunterDef[] {
  return experimentHunters.map((hConfig, i) => {
    const pb = playbooks.find((p) => p.id === hConfig.playbookId)
    if (!pb) {
      throw new Error(`Unknown playbookId: '${hConfig.playbookId}'. Available: ${playbooks.map((p) => p.id).join(', ')}`)
    }
    const stats: PlaybookStats = hConfig.statOverrides
      ? { ...pb.baseStats, ...hConfig.statOverrides }
      : { ...pb.baseStats }
    return {
      id: `h${i + 1}`,
      name: hConfig.name ?? `Hunter${i + 1}`,
      playbookId: hConfig.playbookId,
      stats,
      luck: 7,
      bondCapacity: pb.bondCapacity,
    }
  })
}

// ─── Argument Parsing ─────────────────────────────────────────────────────────

interface CliArgs {
  mystery: string
  strategies: string[]
  runs: number
  seed?: string
  verbose: boolean
  experimentPath?: string
  comparePaths?: [string, string]
  outputPath?: string
  optimize: boolean
  optimizeSeed?: string
  generations: number
  trials: number
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    mystery: 'mystery-001',
    strategies: STRATEGY_NAMES,
    runs: 100,
    verbose: false,
    optimize: false,
    generations: 30,
    trials: 500,
  }

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = argv[i + 1]

    switch (flag) {
      case '--mystery':
        args.mystery = next; i++; break
      case '--strategy':
      case '--strategies':
        args.strategies = next === 'all' ? STRATEGY_NAMES : next.split(','); i++; break
      case '--runs':
      case '--count':
        args.runs = parseInt(next, 10); i++; break
      case '--seed':
        args.seed = next; i++; break
      case '--verbose':
        args.verbose = true; break
      case '--experiment':
        args.experimentPath = next; i++; break
      case '--compare':
        args.comparePaths = [next, argv[i + 2]]; i += 2; break
      case '--output':
        args.outputPath = next; i++; break
      case '--optimize':
        args.optimize = true; break
      case '--optimize-seed':
        args.optimizeSeed = next; i++; break
      case '--generations':
        args.generations = parseInt(next, 10); i++; break
      case '--trials':
        args.trials = parseInt(next, 10); i++; break
    }
  }

  return args
}

// ─── Experiment Runner ────────────────────────────────────────────────────────

function runExperiment(
  experimentPath: string,
  playbooks: PlaybookData[],
): ExperimentSummary {
  const raw = readFileSync(rootPath(experimentPath), 'utf8')
  const config = JSON.parse(raw) as ExperimentConfig

  const mysteryDef = applyMysteryOverrides(
    loadMystery(config.mysteryPath),
    config.mysteryOverrides,
  )
  const hunters = buildHunterDefs(config.hunters, playbooks)
  const runsPerStrategy = config.runsPerStrategy ?? 100
  const seedPrefix = config.seedPrefix ?? 'sim'

  const statsMap: Record<string, AggregateStats> = {}

  for (const stratName of config.strategies) {
    console.log(`  Running ${stratName} (${runsPerStrategy} runs)...`)
    const results = runStrategy({
      mysteryDef,
      hunters,
      stratName,
      runs: runsPerStrategy,
      seedPrefix,
    })
    statsMap[stratName] = aggregateRuns(results)
  }

  return { name: config.name, statsMap }
}

interface StrategyRunConfig {
  mysteryDef: MysteryDefinition
  hunters: HunterDef[]
  stratName: string
  runs: number
  seedPrefix: string
}

function runStrategy(config: StrategyRunConfig): RunResult[] {
  const { mysteryDef, hunters, stratName, runs, seedPrefix } = config
  const strategy = createStrategy(stratName)
  const results: RunResult[] = []

  for (let i = 0; i < runs; i++) {
    const seed = `${seedPrefix}-${stratName}-${i}`
    results.push(runSimulation({ mysteryDef, hunters, strategy, seed }))
  }

  return results
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const playbooks = loadPlaybooks()

  // ── Compare two experiments ──────────────────────────────────────────────────
  if (args.comparePaths) {
    const [pathA, pathB] = args.comparePaths
    console.log(`\nLoading experiments for comparison...`)
    console.log(`  A: ${pathA}`)
    const summaryA = runExperiment(pathA, playbooks)
    console.log(`  B: ${pathB}`)
    const summaryB = runExperiment(pathB, playbooks)

    const commonStrategies = Object.keys(summaryA.statsMap).filter(
      (s) => s in summaryB.statsMap,
    )
    for (const strat of commonStrategies) {
      printComparisonTable(summaryA, summaryB, strat)
    }
    return
  }

  // ── Run a single experiment file ─────────────────────────────────────────────
  if (args.experimentPath) {
    console.log(`\nRunning experiment: ${args.experimentPath}`)
    const summary = runExperiment(args.experimentPath, playbooks)
    printAggregateTables(Object.values(summary.statsMap), summary.name)

    if (args.outputPath) {
      writeFileSync(rootPath(args.outputPath), JSON.stringify(summary, null, 2))
      console.log(`Results written to: ${args.outputPath}`)
    }
    return
  }

  // ── Optimizer mode ───────────────────────────────────────────────────────────
  if (args.optimize || args.optimizeSeed) {
    console.log('Optimizer mode — run: npm run simulate -- --optimize --mystery mystery-001')
    console.log('(optimizer implemented in simulation/optimizer.ts)')
    return
  }

  // ── Standard mode: run strategies against a mystery ─────────────────────────

  const mysteryDef = loadMystery(args.mystery)

  // Default hunters: Expert + Mundane
  const defaultHunterConfig: ExperimentConfig['hunters'] = [
    { playbookId: 'expert', name: 'Rosa' },
    { playbookId: 'mundane', name: 'Mack' },
  ]
  const hunters = buildHunterDefs(defaultHunterConfig, playbooks)

  // Single seed verbose run
  if (args.seed) {
    for (const stratName of args.strategies) {
      const strategy = createStrategy(stratName)
      const result = runSimulation({ mysteryDef, hunters, strategy, seed: args.seed })
      console.log(formatRunVerbose(result))
    }
    return
  }

  // Multi-run aggregate
  console.log(`\nSimulating: ${args.mystery} | ${args.runs} runs × ${args.strategies.length} strategies`)
  console.log(`Hunters: ${hunters.map((h) => `${h.name} (${h.playbookId})`).join(', ')}\n`)

  const allStats: AggregateStats[] = []
  const allResults: Record<string, RunResult[]> = {}

  for (const stratName of args.strategies) {
    process.stdout.write(`  ${stratName.padEnd(10)} `)
    const results = runStrategy({
      mysteryDef,
      hunters,
      stratName,
      runs: args.runs,
      seedPrefix: 'sim',
    })
    allResults[stratName] = results
    allStats.push(aggregateRuns(results))
    process.stdout.write(`done (${results.filter((r) => r.post.outcome === 'win').length}/${results.length} wins)\n`)

    if (args.verbose) {
      // Print first 3 runs in verbose mode
      for (const r of results.slice(0, 3)) {
        console.log(formatRunVerbose(r))
      }
    }
  }

  printAggregateTables(allStats, args.mystery)

  if (args.outputPath) {
    const output = { mystery: args.mystery, strategies: allStats, runs: allResults }
    writeFileSync(rootPath(args.outputPath), JSON.stringify(output, null, 2))
    console.log(`Results written to: ${args.outputPath}`)
  }
}

main().catch((err) => {
  console.error('Simulation error:', err)
  process.exit(1)
})
