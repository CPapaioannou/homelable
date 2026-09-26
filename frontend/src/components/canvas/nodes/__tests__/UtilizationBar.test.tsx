import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import UtilizationBar from '../UtilizationBar'
import { utilizationColor, metricPercent } from '@/utils/utilization'
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
    const { container } = render(<UtilizationBar metric={metric(500, 1000)} subtextColor="#888" />)
    const track = screen.getByRole('progressbar')
    expect((track as HTMLElement).getAttribute('aria-valuenow')).toBe('50')
    expect((track.firstElementChild as HTMLElement).style.width).toBe('50%')
    expect(barColor(container)).toBe(GREEN)
  })

  it('turns the fill amber at 75%', () => {
    const { container } = render(<UtilizationBar metric={metric(750, 1000)} />)
    expect(barColor(container)).toBe(AMBER)
  })

  it('turns the fill red at 95%', () => {
    const { container } = render(<UtilizationBar metric={metric(950, 1000)} />)
    expect(barColor(container)).toBe(RED)
  })

  it('prints the value line as "label: used / total unit (pct)"', () => {
    render(<UtilizationBar metric={metric(512, 1000)} subtextColor="#888" />)
    expect(screen.getByText('Storage: 512 / 1000 GB (51%)')).toBeTruthy()
  })

  it('omits the value line when no subtext colour is provided', () => {
    render(<UtilizationBar metric={metric(512, 1000)} />)
    expect(screen.queryByText(/512 \/ 1000/)).toBeNull()
  })

  it('degrades to an empty green bar when the total is zero', () => {
    const { container } = render(<UtilizationBar metric={metric(50, 0)} subtextColor="#888" />)
    expect(barColor(container)).toBe(GREEN)
    expect((screen.getByRole('progressbar') as HTMLElement).getAttribute('aria-valuenow')).toBe('0')
  })
})
