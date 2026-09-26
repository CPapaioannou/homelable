import { memo } from 'react'
import type { UtilizationMetric } from '@/types'
import { utilizationColor, metricPercent, metricSummary } from '@/utils/utilization'

/**
 * A compact "used vs total" gauge for a node card header. See
 * `utils/utilization` for the threshold/colour rules; this file only renders
 * the bar (and the optional value line) so it stays a pure component module.
 */
interface UtilizationBarProps {
  metric: UtilizationMetric
  /** Subtext colour from the active theme — the value line inherits it. Omit to draw the bar alone. */
  subtextColor?: string
}

function UtilizationBar({ metric, subtextColor }: UtilizationBarProps) {
  const percent = metricPercent(metric)
  const color = utilizationColor(percent)
  const summary = metricSummary(metric)

  return (
    <div className="px-2.5 py-1" title={summary}>
      {subtextColor && (
        <div className="font-mono text-[9px] leading-tight truncate" style={{ color: subtextColor }}>
          {summary}
        </div>
      )}
      <div
        className="mt-0.5 h-1 w-full overflow-hidden rounded-full"
        style={{ background: 'rgba(139, 148, 158, 0.25)' }}
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={summary}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default memo(UtilizationBar)
