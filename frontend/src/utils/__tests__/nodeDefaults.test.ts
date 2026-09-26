import { describe, it, expect } from 'vitest'
import { defaultNodeProperties } from '../nodeDefaults'
import type { NodeType } from '@/types'

describe('defaultNodeProperties', () => {
  it('seeds a drive with a media and an empty serial', () => {
    const props = defaultNodeProperties('drive')
    expect(props).toHaveLength(2)
    expect(props?.[0]).toEqual({ key: 'media', value: 'SSD', icon: null, visible: true })
    expect(props?.[1]).toEqual({ key: 'serial', value: '', icon: null, visible: true })
  })

  it('seeds nothing for a type without defaults', () => {
    expect(defaultNodeProperties('server')).toBeUndefined()
    expect(defaultNodeProperties('nas')).toBeUndefined()
    expect(defaultNodeProperties('groupRect')).toBeUndefined()
  })

  it('does not alias the returned array between calls', () => {
    const a = defaultNodeProperties('drive')
    const b = defaultNodeProperties('drive')
    expect(a).not.toBe(b)
  })
})
