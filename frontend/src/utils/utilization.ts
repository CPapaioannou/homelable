import type { UtilizationMetric } from '@/types'

/**
 * Pure helpers for drawing a device's utilisation metrics on a node card. Kept
 * out of the component module so `UtilizationBar.tsx` exports only a component
 * (react fast-refresh requirement) and the logic stays unit-testable on its own.
 *
 * A metric is open-shaped: its `kind` is a free string, and the renderer falls
 * back on the *fields present*, so an unknown kind still draws:
 *
 *   range  (used/total)  -> a green/amber/red bar, coloured by warn_at/crit_at
 *   value  (a figure)    -> a single figure, coloured against warn_at/crit_at
 *   status (a state)     -> a coloured chip (ok/warn/crit or free text)
 *
 * Colours come from the theme's status palette:
 *   green #39d353 ("online") · amber #e3b341 ("pending") · red #f85149 ("offline")
 *
 * A metric that carries `updated_at` (agent-fed) shows an "as of" stamp and is
 * dimmed once it is older than {@link METRIC_STALE_MS}.
 */

export const UTILIZATION_THRESHOLDS = { warning: 70, critical: 90 } as const

/** How old a metric's `updated_at` may be before it is flagged stale. */
export const METRIC_STALE_MS = 60 * 60 * 1000 // one hour

const COLORS = { green: '#39d353', amber: '#e3b341', red: '#f85149', neutral: '#8b949e' } as const

/** Map a status string (any casing / common synonyms) to a status colour. */
const STATUS_COLORS: Record<string, string> = {
  ok: COLORS.green,
  good: COLORS.green,
  online: COLORS.green,
  up: COLORS.green,
  healthy: COLORS.green,
  pass: COLORS.green,
  warn: COLORS.amber,
  warning: COLORS.amber,
  degraded: COLORS.amber,
  prefail: COLORS.amber,
  major: COLORS.amber,
  crit: COLORS.red,
  critical: COLORS.red,
  fail: COLORS.red,
  failed: COLORS.red,
  offline: COLORS.red,
  down: COLORS.red,
  minor: COLORS.red,
}

export type MetricShape = 'range' | 'value' | 'status' | 'none'

/** Which shape a metric is, from the fields present (open `kind` is ignored). */
export function metricShape(metric: UtilizationMetric): MetricShape {
  if (metric.used != null || metric.total != null) return 'range'
  if (typeof metric.value === 'number') return 'value'
  if (typeof metric.value === 'string' && metric.value.trim()) return 'status'
  return 'none'
}

/**
 * Colour for a percent against optional per-metric thresholds (defaults to the
 * global 70/90). Used by range metrics, where the percent is used/total.
 */
export function utilizationColor(percent: number, warnAt?: number, critAt?: number): string {
  const warn = warnAt ?? UTILIZATION_THRESHOLDS.warning
  const crit = critAt ?? UTILIZATION_THRESHOLDS.critical
  if (percent >= crit) return COLORS.red
  if (percent >= warn) return COLORS.amber
  return COLORS.green
}


/** The range fill ratio, clamped to 0..100. A zero/negative total reads as 0. */
export function metricPercent(metric: UtilizationMetric): number {
  if (metricShape(metric) !== 'range') return 0
  if (!metric.total || metric.total <= 0) return 0
  const pct = (((metric.used ?? 0) / metric.total) * 100) as number
  return Math.max(0, Math.min(100, pct))
}

/** The bar width for a metric — meaningful only for a range. */
export function metricBarPercent(metric: UtilizationMetric): number {
  return metricPercent(metric)
}

/**
 * The colour for a whole metric, by shape + thresholds.
 *
 * A threshold is always in the metric's own units: for a range it is an
 * absolute figure in the used/total unit ("warn at 1800 GB"), for a value it
 * is a figure in the value's unit. When the user leaves a threshold blank the
 * range falls back to the 70 % / 90 % -of-total defaults, which is exactly the
 * old percent-based behaviour. Status maps its state to a colour.
 */
export function metricColor(metric: UtilizationMetric): string {
  const shape = metricShape(metric)
  if (shape === 'range') {
    const used = metric.used ?? 0
    // Absolute used-space thresholds if set; otherwise the 70 % / 90 % -of-total
    // defaults (identical to the previous percent-based colouring).
    const warn = metric.warn_at ?? (metric.total ? (metric.total * UTILIZATION_THRESHOLDS.warning) / 100 : undefined)
    const crit = metric.crit_at ?? (metric.total ? (metric.total * UTILIZATION_THRESHOLDS.critical) / 100 : undefined)
    if (crit != null && used >= crit) return COLORS.red
    if (warn != null && used >= warn) return COLORS.amber
    return COLORS.green
  }
  if (shape === 'value') {
    const v = Number(metric.value)
    const warn = metric.warn_at ?? UTILIZATION_THRESHOLDS.warning
    const crit = metric.crit_at ?? UTILIZATION_THRESHOLDS.critical
    if (v >= crit) return COLORS.red
    if (v >= warn) return COLORS.amber
    return COLORS.green
  }
  if (shape === 'status') return STATUS_COLORS[String(metric.value).toLowerCase()] ?? COLORS.neutral
  return COLORS.neutral
}

/** The line drawn above a metric's visual. */
export function metricSubtext(metric: UtilizationMetric): string {
  const shape = metricShape(metric)
  const unit = metric.unit ? ` ${metric.unit}` : ''
  if (shape === 'range') {
    return `${metric.label}: ${metric.used ?? 0} / ${metric.total ?? 0}${unit} (${Math.round(metricPercent(metric))}%)`
  }
  // value / status: the label only — the figure/state is the visual below.
  return metric.label
}

/** The content of a metric's visual (the number or the status word). */
export function metricValueText(metric: UtilizationMetric): string {
  const shape = metricShape(metric)
  if (shape === 'value') return `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`
  if (shape === 'status') return String(metric.value)
  return ''
}

/** Whether a metric's `updated_at` is older than the staleness threshold. */
export function isMetricStale(metric: UtilizationMetric, now: number = Date.now()): boolean {
  if (!metric.updated_at) return false
  const ts = Date.parse(metric.updated_at)
  if (Number.isNaN(ts)) return false
  return now - ts > METRIC_STALE_MS
}

/** A short "as of HH:MM" stamp for a metric's `updated_at`, or null. */
export function metricAsOf(metric: UtilizationMetric): string | null {
  if (!metric.updated_at) return null
  const ts = Date.parse(metric.updated_at)
  if (Number.isNaN(ts)) return null
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `as of ${hh}:${mm}`
}

/** Everything the bar needs to draw one metric, in one place. */
export interface MetricRender {
  shape: MetricShape
  color: string
  subtext: string
  valueText: string
  barPercent: number
  stale: boolean
  asOf: string | null
}

export function metricRender(metric: UtilizationMetric, now: number = Date.now()): MetricRender {
  return {
    shape: metricShape(metric),
    color: metricColor(metric),
    subtext: metricSubtext(metric),
    valueText: metricValueText(metric),
    barPercent: metricBarPercent(metric),
    stale: isMetricStale(metric, now),
    asOf: metricAsOf(metric),
  }
}

/**
 * Which of a device's metrics a node draws. `show` is the node's curation:
 * absent (never set) shows everything the device has, an empty list shows
 * nothing, and a list shows exactly those keys. Metrics without a key are only
 * drawn when the node has not curated (there is no key to address them by).
 */
export function selectedMetrics(
  all: UtilizationMetric[] | undefined,
  show: string[] | undefined,
): UtilizationMetric[] {
  if (!all?.length) return []
  if (show == null) return all
  if (show.length === 0) return []
  const keys = new Set(show)
  return all.filter((m) => m.key != null && keys.has(m.key))
}
