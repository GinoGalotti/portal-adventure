/**
 * Simulation reporter — formats and aggregates RunResult data.
 *
 * Provides:
 * - formatRunVerbose: per-run pre/post snapshot display
 * - aggregateRuns: compute stats across N runs for one strategy
 * - printAggregateTables: side-by-side strategy comparison with balance flags
 * - printComparisonTable: diff two experiment aggregates
 */

import type { RunResult, PreConfrontationSnapshot, PostConfrontationSnapshot } from './types'
import type { IntelLevel } from '../src/engine/types'

// ─── Per-Run Verbose Output ───────────────────────────────────────────────────

export function formatRunVerbose(result: RunResult): string {
  const { seed, mysteryId, strategyName, pre, post } = result
  const lines: string[] = []

  const W = 62
  const hr = '═'.repeat(W)
  const hr2 = '─'.repeat(W)

  lines.push(`╔${hr}╗`)
  const header = ` SIMULATION: ${mysteryId} | seed: ${seed} | strategy: ${strategyName}`
  lines.push(`║${header.padEnd(W)}║`)
  lines.push(`╠${'═'.repeat(W / 2 - 4)} PRE-CONFRONTATION ${'═'.repeat(W / 2 - 7)}╣`)

  const clockPct = pre.staminaMax > 0
    ? `${pre.clockValue}/${pre.forcedByCountdown ? 'DISASTER' : '?'}` // we don't track disasterAt here
    : pre.clockValue.toString()

  lines.push(`║ Clock: ${pre.clockValue}  Step: ${pre.currentStep}/5  Intel: ${pre.intelLevel.padEnd(10)}   ║`)
  lines.push(`║ Clues: ${pre.cluesFound.length}/${pre.cluesAvailable}    Locations: ${pre.locationsVisited.length}/${pre.locationsAvailable} visited           ║`)
  lines.push(`║ Hunters:${' '.repeat(W - 9)}║`)
  for (const h of pre.hunterStates) {
    const status = h.alive ? conditionLabel(h.harm) : 'DEAD'
    const row = `   ${h.name} (${h.playbookId})  — harm ${h.harm}/7, luck ${h.luck}/7, ${status}`
    lines.push(`║${row.padEnd(W)}║`)
  }
  lines.push(`║ Stamina: ${pre.staminaRemaining}/${pre.staminaMax}  Actions taken: ${pre.totalActions}  Forced: ${pre.forcedByCountdown ? 'YES' : 'no'}`.padEnd(W + 1) + '║')

  lines.push(`╠${'═'.repeat(W / 2 - 4)} POST-CONFRONTATION ${'═'.repeat(W / 2 - 8)}╣`)

  const outcomeLabel = post.outcome === 'win' ? 'WIN' : post.outcome === 'loss' ? 'LOSS' : 'RETREAT'
  lines.push(`║ Outcome: ${outcomeLabel} in ${post.roundsFought} actions`.padEnd(W + 1) + '║')
  lines.push(`║ Monster: ${post.monsterHarmDealt}/${post.monsterMaxHarm} harm dealt`.padEnd(W + 1) + '║')
  for (const h of post.hunterStates) {
    const row = `   ${h.id} — harm ${h.harm}, luck ${h.luck}, ${h.rollsSucceeded}✓/${h.rollsMixed}~/${h.rollsMissed}✗`
    lines.push(`║${row.padEnd(W)}║`)
  }
  const ewStatus = post.exploitWeaknessAttempted
    ? (post.exploitWeaknessSucceeded ? 'attempted, SUCCEEDED' : 'attempted, failed')
    : 'not attempted'
  lines.push(`║ exploitWeakness: ${ewStatus}`.padEnd(W + 1) + '║')

  lines.push(`╚${hr}╝`)
  return lines.join('\n')
}

function conditionLabel(harm: number): string {
  if (harm >= 7) return 'dead'
  if (harm >= 6) return 'seriouslyInjured'
  if (harm >= 4) return 'injured'
  return 'healthy'
}

// ─── Aggregate Stats ──────────────────────────────────────────────────────────

export interface AggregateStats {
  strategyName: string
  totalRuns: number
  winCount: number
  lossCount: number
  retreatCount: number
  winRate: number
  lossRate: number
  retreatRate: number
  avgConfrontationActions: number
  avgCluesAtConfront: number
  avgIntelAtConfront: IntelLevel
  avgHunterDeathRate: number  // fraction of hunters who died per run
}

export function aggregateRuns(results: RunResult[]): AggregateStats {
  if (results.length === 0) {
    throw new Error('aggregateRuns: no results to aggregate')
  }

  const n = results.length
  const strategyName = results[0].strategyName

  let wins = 0, losses = 0, retreats = 0
  let totalConfrontActions = 0
  let totalClues = 0
  const intelCounts: Record<IntelLevel, number> = { blind: 0, partial: 0, informed: 0, prepared: 0 }
  let totalDeaths = 0

  for (const r of results) {
    if (r.post.outcome === 'win') wins++
    else if (r.post.outcome === 'loss') losses++
    else retreats++

    totalConfrontActions += r.post.roundsFought
    totalClues += r.pre.cluesFound.length
    intelCounts[r.pre.intelLevel]++

    for (const h of r.post.hunterStates) {
      if (!h.alive) totalDeaths++
    }
  }

  const huntersPerRun = results[0].pre.hunterStates.length || 1
  const avgHunterDeathRate = totalDeaths / (n * huntersPerRun)

  // Most common intel level
  const avgIntelAtConfront = (Object.entries(intelCounts) as [IntelLevel, number][])
    .reduce((best, [level, count]) => count > best[1] ? [level, count] : best, ['blind', -1] as [IntelLevel, number])[0]

  return {
    strategyName,
    totalRuns: n,
    winCount: wins,
    lossCount: losses,
    retreatCount: retreats,
    winRate: wins / n,
    lossRate: losses / n,
    retreatRate: retreats / n,
    avgConfrontationActions: totalConfrontActions / n,
    avgCluesAtConfront: totalClues / n,
    avgIntelAtConfront,
    avgHunterDeathRate,
  }
}

// ─── Balance Flags ────────────────────────────────────────────────────────────

interface BalanceFlag {
  ok: boolean
  message: string
}

function checkBalance(stats: AggregateStats): BalanceFlag[] {
  const flags: BalanceFlag[] = []
  const name = stats.strategyName

  if (name === 'balanced') {
    const winPct = Math.round(stats.winRate * 100)
    const ok = stats.winRate >= 0.5 && stats.winRate <= 0.9
    flags.push({
      ok,
      message: `${name} win rate ${winPct}% (target: 60–80%)${ok ? '' : ' — OUT OF RANGE ⚠'}`,
    })

    const deathPct = Math.round(stats.avgHunterDeathRate * 100)
    const deathOk = stats.avgHunterDeathRate >= 0.05 && stats.avgHunterDeathRate <= 0.2
    flags.push({
      ok: deathOk,
      message: `${name} hunter death rate ${deathPct}% (target: 5–20%)${deathOk ? '' : ' — OUT OF RANGE ⚠'}`,
    })
  }

  if (name === 'rush' || name === 'random') {
    const winPct = Math.round(stats.winRate * 100)
    const ok = stats.winRate >= 0.15 && stats.winRate <= 0.5
    flags.push({
      ok,
      message: `${name} win rate ${winPct}% (target: 15–50%)${ok ? '' : ' — OUT OF RANGE ⚠'}`,
    })
  }

  if (name === 'greedy') {
    const winPct = Math.round(stats.winRate * 100)
    const ok = stats.winRate >= 0.6 && stats.winRate <= 0.95
    flags.push({
      ok,
      message: `${name} win rate ${winPct}% (target: 60–95%)${ok ? '' : ' — OUT OF RANGE ⚠'}`,
    })
  }

  return flags
}

// ─── Aggregate Table ──────────────────────────────────────────────────────────

export function printAggregateTables(
  allStats: AggregateStats[],
  mysteryId: string,
): void {
  const n = allStats[0]?.totalRuns ?? 0
  console.log(`\n┌${'─'.repeat(71)}┐`)
  console.log(`│ AGGREGATE: ${mysteryId} | ${n} runs per strategy${' '.repeat(Math.max(0, 71 - 15 - mysteryId.length - n.toString().length - 19))}│`)
  console.log(`├${'─'.repeat(10)}┬${'─'.repeat(8)}┬${'─'.repeat(8)}┬${'─'.repeat(8)}┬${'─'.repeat(8)}┬${'─'.repeat(14)}┤`)
  console.log(`│ Strategy  │ Win %  │ Loss % │ Ret %  │ Avg    │ Avg Intel    │`)
  console.log(`│           │        │        │        │ Rounds │ @ Confront   │`)
  console.log(`├${'─'.repeat(10)}┼${'─'.repeat(8)}┼${'─'.repeat(8)}┼${'─'.repeat(8)}┼${'─'.repeat(8)}┼${'─'.repeat(14)}┤`)

  for (const s of allStats) {
    const name = s.strategyName.padEnd(9)
    const win = `${Math.round(s.winRate * 100)}%`.padStart(5)
    const loss = `${Math.round(s.lossRate * 100)}%`.padStart(5)
    const ret = `${Math.round(s.retreatRate * 100)}%`.padStart(5)
    const rounds = s.avgConfrontationActions.toFixed(1).padStart(5)
    const intel = s.avgIntelAtConfront.padEnd(12)
    console.log(`│ ${name} │${win}   │${loss}   │${ret}   │${rounds}   │ ${intel} │`)
  }

  console.log(`├${'─'.repeat(71)}┤`)
  console.log(`│ Balance flags:${' '.repeat(56)}│`)

  const allFlags = allStats.flatMap(checkBalance)
  for (const f of allFlags) {
    const icon = f.ok ? '  ✓' : '  ⚠'
    const line = `${icon} ${f.message}`
    console.log(`│${line.padEnd(71)}│`)
  }

  console.log(`└${'─'.repeat(71)}┘\n`)
}

// ─── Experiment Comparison ────────────────────────────────────────────────────

interface ExperimentSummary {
  name: string
  statsMap: Record<string, AggregateStats>
}

export function printComparisonTable(
  a: ExperimentSummary,
  b: ExperimentSummary,
  strategyName = 'balanced',
): void {
  const sa = a.statsMap[strategyName]
  const sb = b.statsMap[strategyName]

  if (!sa || !sb) {
    console.log(`No ${strategyName} data found in one or both experiments.`)
    return
  }

  console.log(`\n┌${'─'.repeat(65)}┐`)
  console.log(`│ COMPARISON: ${a.name} vs ${b.name} (${strategyName} strategy)${' '.repeat(Math.max(0, 65 - 13 - a.name.length - 4 - b.name.length - 12 - strategyName.length))}│`)
  console.log(`├${'─'.repeat(21)}┬${'─'.repeat(13)}┬${'─'.repeat(13)}┬${'─'.repeat(11)}┤`)
  console.log(`│ Metric               │ ${a.name.padEnd(12).slice(0, 12)} │ ${b.name.padEnd(12).slice(0, 12)} │ Δ          │`)
  console.log(`├${'─'.repeat(21)}┼${'─'.repeat(13)}┼${'─'.repeat(13)}┼${'─'.repeat(11)}┤`)

  const rows: [string, string, string, string][] = [
    [
      'Win rate',
      `${Math.round(sa.winRate * 100)}%`,
      `${Math.round(sb.winRate * 100)}%`,
      delta(sb.winRate - sa.winRate, '%', 0.05),
    ],
    [
      'Loss rate',
      `${Math.round(sa.lossRate * 100)}%`,
      `${Math.round(sb.lossRate * 100)}%`,
      delta(sb.lossRate - sa.lossRate, '%', 0.05),
    ],
    [
      'Avg confrontation',
      `${sa.avgConfrontationActions.toFixed(1)} actions`,
      `${sb.avgConfrontationActions.toFixed(1)} actions`,
      delta(sb.avgConfrontationActions - sa.avgConfrontationActions, ' actions', 1),
    ],
    [
      'Hunter death rate',
      `${Math.round(sa.avgHunterDeathRate * 100)}%`,
      `${Math.round(sb.avgHunterDeathRate * 100)}%`,
      delta(sb.avgHunterDeathRate - sa.avgHunterDeathRate, '%', 0.05),
    ],
    [
      'Avg clues found',
      sa.avgCluesAtConfront.toFixed(1),
      sb.avgCluesAtConfront.toFixed(1),
      delta(sb.avgCluesAtConfront - sa.avgCluesAtConfront, '', 0.5),
    ],
  ]

  for (const [metric, va, vb, d] of rows) {
    const m = metric.padEnd(20)
    const fva = va.padEnd(12)
    const fvb = vb.padEnd(12)
    const fd = d.padEnd(10)
    console.log(`│ ${m} │ ${fva} │ ${fvb} │ ${fd} │`)
  }

  console.log(`└${'─'.repeat(21)}┴${'─'.repeat(13)}┴${'─'.repeat(13)}┴${'─'.repeat(11)}┘\n`)
}

function delta(diff: number, unit: string, threshold: number): string {
  const pct = unit === '%' ? diff * 100 : diff
  const sign = diff > 0 ? '+' : ''
  const warn = Math.abs(diff) >= threshold ? ' ⚠' : ''
  return `${sign}${pct.toFixed(unit === '%' ? 0 : 1)}${unit}${warn}`
}

// ─── Public Helpers ───────────────────────────────────────────────────────────

export type { ExperimentSummary }
