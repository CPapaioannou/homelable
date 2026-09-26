import type { UtilizationMetric } from '@/types'

/**
 * Pure helpers for the utilisation gauge — the green/amber/red bar that shows
 * how full a drive is (or how busy a CPU/RAM figure is). Kept out of the
 * component module so `UtilizationBar.tsx` exports only a component (react
 * fast-refresh requirement) and the math stays unit-testable on its own.
 *
 * The gauge is deliberately type-agnostic: it draws whatever `metric` a node
 * carries, so any node type can wear one. The fill ratio is `used / total` and
 * takes its colour from the theme's status palette (see THEMES):
 *
 *   < 70 %  → green  (#39d353, the "online" status colour)
 *   70–89 % → amber  (#e3b341, the "pending" status colour)
 *   ≥ 90 %  → red    (#f85149, the "offline" status colour)
 */

export const UTILIZATION_THRESHOLDS = { warning: 70, critical: 90 } as const

export function utilizationColor(percent: number): string {
  if (percent >= UTILIZATION_THRESHOLDS.critical) return '#f85149'
  if (percent >= UTILIZATION_THRESHOLDS.warning) return '#e3b341'
  return '#39d353'
}

/** The fill ratio, clamped to 0..100. A zero/negative total reads as 0. */
export function metricPercent(metric: UtilizationMetric): number {
  if (!metric.total || metric.total <= 0) return 0
  const pct = (metric.used / metric.total) * 100
  return Math.max(0, Math.min(100, pct))
}

/** The value line: "label: used / total unit (pct)". */
export function metricSummary(metric: UtilizationMetric): string {
  return `${metric.label}: ${metric.used} / ${metric.total} ${metric.unit} (${Math.round(metricPercent(metric))}%)`
}
