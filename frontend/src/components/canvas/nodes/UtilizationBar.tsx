import { memo } from 'react'
import type { UtilizationMetric } from '@/types'
import { utilizationColor, metricPercent, metricSummary } from '@/utils/utilization'

/**
 * A compact "used vs total" gauge stack for a node card header. See
 * `utils/utilization` for the threshold/colour rules; this file only renders
 * the bars (and the optional value lines) so it stays a pure component module.
 *
 * A device can wear several gauges at once (CPU, RAM, disk), so the component
 * takes the whole list and stacks one bar per gauge in the device's own order.
 */
interface UtilizationBarProps {
  metrics: UtilizationMetric[]
  /** Subtext colour from the active theme — the value lines inherit it. Omit to draw the bars alone. */
  subtextColor?: string
}

function UtilizationBar({ metrics, subtextColor }: UtilizationBarProps) {
  if (!metrics.length) return null
  return (
    <div className="space-y-1 px-2.5 py-1">
      {metrics.map((metric, i) => {
        const percent = metricPercent(metric)
        const color = utilizationColor(percent)
        const summary = metricSummary(metric)
        return (
          <div key={metric.key ?? metric.label ?? i}>
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
      })}
    </div>
  )
}

export default memo(UtilizationBar)
