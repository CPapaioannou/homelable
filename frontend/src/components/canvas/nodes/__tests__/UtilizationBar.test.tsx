import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UtilizationBar from '../UtilizationBar'
import { utilizationColor, metricPercent, metricShape, selectedMetrics, isMetricStale } from '@/utils/utilization'
import type { UtilizationMetric } from '@/types'

const metric = (used: number, total: number): UtilizationMetric => ({
  label: 'Storage',
  used,
  total,
  unit: 'GB',
})

// jsdom normalises inline style reads from hex to rgb() — assert against that form.
const GREEN = 'rgb(57, 211, 83)'  // #39d353
const AMBER = 'rgb(227, 179, 65)' // #e3b341
const RED = 'rgb(248, 81, 73)'    // #f85149

function barColor(node: HTMLElement): string {
  const track = node.querySelector('[role="progressbar"]') as HTMLElement
  const fill = track.querySelector('div') as HTMLElement
  return fill.style.background
}

describe('utilizationColor', () => {
  it('is green below 70%', () => {
    expect(utilizationColor(0)).toBe('#39d353')
    expect(utilizationColor(69.9)).toBe('#39d353')
  })

  it('is amber from 70% to 89.9%', () => {
    expect(utilizationColor(70)).toBe('#e3b341')
    expect(utilizationColor(89.9)).toBe('#e3b341')
  })

  it('is red from 90%', () => {
    expect(utilizationColor(90)).toBe('#f85149')
    expect(utilizationColor(100)).toBe('#f85149')
  })
})

describe('metricPercent', () => {
  it('computes the fill ratio', () => {
    expect(metricPercent(metric(512, 1000))).toBeCloseTo(51.2)
  })

  it('clamps to 0..100', () => {
    expect(metricPercent(metric(-5, 100))).toBe(0)
    expect(metricPercent(metric(200, 100))).toBe(100)
  })

  it('is 0 for a zero or negative total', () => {
    expect(metricPercent(metric(50, 0))).toBe(0)
  })
})

describe('UtilizationBar', () => {
  it('fills the bar to the used/total ratio with a green fill at 50%', () => {
    const { container } = render(<UtilizationBar metrics={[metric(500, 1000)]} subtextColor="#888" />)
    const track = screen.getByRole('progressbar')
    expect((track as HTMLElement).getAttribute('aria-valuenow')).toBe('50')
    expect((track.firstElementChild as HTMLElement).style.width).toBe('50%')
    expect(barColor(container)).toBe(GREEN)
  })

  it('turns the fill amber at 75%', () => {
    const { container } = render(<UtilizationBar metrics={[metric(750, 1000)]} />)
    expect(barColor(container)).toBe(AMBER)
  })

  it('turns the fill red at 95%', () => {
    const { container } = render(<UtilizationBar metrics={[metric(950, 1000)]} />)
    expect(barColor(container)).toBe(RED)
  })

  it('prints the value line as "label: used / total unit (pct)"', () => {
    render(<UtilizationBar metrics={[metric(512, 1000)]} subtextColor="#888" />)
    expect(screen.getByText('Storage: 512 / 1000 GB (51%)')).toBeTruthy()
  })

  it('omits the value line when no subtext colour is provided', () => {
    render(<UtilizationBar metrics={[metric(512, 1000)]} />)
    expect(screen.queryByText(/512 \/ 1000/)).toBeNull()
  })

  it('degrades to an empty green bar when the total is zero', () => {
    const { container } = render(<UtilizationBar metrics={[metric(50, 0)]} subtextColor="#888" />)
    expect(barColor(container)).toBe(GREEN)
    expect((screen.getByRole('progressbar') as HTMLElement).getAttribute('aria-valuenow')).toBe('0')
  })
})

describe('UtilizationBar (by kind)', () => {
  it('draws a value metric as a coloured figure, not a bar', () => {
    render(
      <UtilizationBar metrics={[{ key: 'cpu', label: 'CPU', kind: 'value', value: 78, unit: '%' }]} subtextColor="#888" />,
    )
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect((screen.getByText('78 %') as HTMLElement).style.color).toBe(AMBER)
  })

  it('draws a status metric as a coloured chip', () => {
    render(<UtilizationBar metrics={[{ key: 'smart', label: 'SMART', kind: 'status', value: 'ok' }]} subtextColor="#888" />)
    expect((screen.getByText('ok') as HTMLElement).style.background).toBe(GREEN)
  })

  it('falls back on the fields present for an unknown kind', () => {
    expect(metricShape({ label: 'X', kind: 'flux', value: 'degraded' })).toBe('status')
    expect(metricShape({ label: 'X', kind: 'flux', value: 42 })).toBe('value')
    expect(metricShape({ label: 'X', kind: 'flux', used: 1, total: 2 })).toBe('range')
    expect(metricShape({ label: 'X' })).toBe('none')
  })

  it('skips a metric with no measurable fields', () => {
    const { container } = render(<UtilizationBar metrics={[{ label: 'X', kind: 'flux' }]} subtextColor="#888" />)
    expect(container.textContent).toBe('')
  })

  it('colours a range against its own warn_at / crit_at', () => {
    const { container } = render(<UtilizationBar metrics={[{ label: 'D', used: 80, total: 100, warn_at: 50, crit_at: 90 }]} />)
    expect(barColor(container)).toBe(AMBER)
    const { container: c2 } = render(<UtilizationBar metrics={[{ label: 'D', used: 95, total: 100, warn_at: 50, crit_at: 90 }]} />)
    expect(barColor(c2)).toBe(RED)
  })

  it('dims and flags a stale metric', () => {
    const stale = { key: 'd', label: 'D', used: 10, total: 100, updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() }
    const { container } = render(<UtilizationBar metrics={[stale]} subtextColor="#888" />)
    expect(container.textContent).toContain('stale')
    expect(isMetricStale(stale)).toBe(true)
  })

  it('shows an "as of" stamp for a fresh metric', () => {
    const fresh = { key: 'd', label: 'D', used: 10, total: 100, updated_at: new Date().toISOString() }
    const { container } = render(<UtilizationBar metrics={[fresh]} subtextColor="#888" />)
    expect(container.textContent).toContain('as of')
    expect(isMetricStale(fresh)).toBe(false)
  })
})

describe('selectedMetrics', () => {
  const all: UtilizationMetric[] = [
    { key: 'a', label: 'A', used: 1, total: 2 },
    { key: 'b', label: 'B', used: 1, total: 2 },
    { label: 'nokey', used: 1, total: 2 },
  ]

  it('shows everything when the node has not curated', () => {
    expect(selectedMetrics(all, undefined)).toHaveLength(3)
  })

  it('shows nothing when the selection is an empty list', () => {
    expect(selectedMetrics(all, [])).toHaveLength(0)
  })

  it('shows exactly the chosen keys (a keyless metric is excluded)', () => {
    expect(selectedMetrics(all, ['b'])).toEqual([all[1]])
  })

  it('returns nothing when the device has no metrics', () => {
    expect(selectedMetrics([], ['a'])).toHaveLength(0)
    expect(selectedMetrics(undefined, undefined)).toHaveLength(0)
  })
})
