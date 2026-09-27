import { memo } from 'react'
import type { UtilizationMetric } from '@/types'
import { metricRender } from '@/utils/utilization'

/**
 * A compact gauge stack for a node card header — one row per metric the node
 * has chosen to show. See `utils/utilization` for the shape/colour/staleness
 * rules; this file only draws them so it stays a pure component module.
 *
 * Each metric draws by its shape: a range is a green/amber/red bar, a value a
 * coloured figure, a status a coloured chip. A metric with an `updated_at`
 * shows an "as of" stamp and is dimmed once stale.
 */
interface UtilizationBarProps {
  metrics: UtilizationMetric[]
  /** Subtext colour from the active theme — the value lines inherit it. Omit to draw the visuals alone. */
  subtextColor?: string
}

function UtilizationBar({ metrics, subtextColor }: UtilizationBarProps) {
  const rows = metrics.map((metric) => ({ metric, render: metricRender(metric) }))
  const visible = rows.filter((r) => r.render.shape !== 'none')
  if (!visible.length) return null
  return (
    <div className="space-y-1 px-2.5 py-1">
      {visible.map(({ metric, render }, i) => {
        const suffix = [render.asOf, render.stale ? 'stale' : null].filter(Boolean).join(' · ')
        const key = metric.key ?? metric.label ?? i
        return (
          <div key={key} style={{ opacity: render.stale ? 0.55 : 1 }}>
            {subtextColor && (
              <div className="truncate font-mono text-[9px] leading-tight" style={{ color: subtextColor }}>
                {render.subtext}
                {suffix ? ` · ${suffix}` : ''}
              </div>
            )}
            {render.shape === 'range' && (
              <div
                className="mt-0.5 h-1 w-full overflow-hidden rounded-full"
                style={{ background: 'rgba(139, 148, 158, 0.25)' }}
                role="progressbar"
                aria-valuenow={Math.round(render.barPercent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={render.subtext}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${render.barPercent}%`, background: render.color }}
                />
              </div>
            )}
            {render.shape === 'value' && (
              <div className="mt-0.5 font-mono text-[10px] font-semibold leading-tight" style={{ color: render.color }}>
                {render.valueText}
              </div>
            )}
            {render.shape === 'status' && (
              <span
                className="mt-0.5 inline-block rounded-full px-1.5 py-px text-[8px] font-semibold leading-tight"
                style={{ background: render.color, color: '#0d1117' }}
              >
                {render.valueText}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default memo(UtilizationBar)
