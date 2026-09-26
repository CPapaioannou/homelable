import { describe, expect, it } from 'vitest'
import type { Node } from '@xyflow/react'
import type { NodeData } from '@/types'
import {
  absolutePosition,
  canReparent,
  nodeMap,
  orderParentsFirst,
  repairHierarchy,
  reparentPreservingPosition,
} from '@/utils/nodeHierarchy'
import { makeNode } from '@/test/factories'

function nested(id: string, parentId: string, x: number, y: number): Node<NodeData> {
  return {
    ...makeNode(id, { parent_id: parentId }),
    parentId,
    extent: 'parent',
    position: { x, y },
  }
}

describe('nodeHierarchy', () => {
  it('calculates absolute positions through arbitrary depth', () => {
    const root = { ...makeNode('root'), position: { x: 100, y: 200 } }
    const middle = nested('middle', 'root', 20, 30)
    const leaf = nested('leaf', 'middle', 5, 7)
    expect(absolutePosition(leaf, nodeMap([leaf, root, middle]))).toEqual({ x: 125, y: 237 })
  })

  it('prevents a container from being parented to its descendant', () => {
    const outer = makeNode('outer', { container_mode: true })
    const inner = nested('inner', 'outer', 20, 20)
    inner.data.container_mode = true
    expect(canReparent([outer, inner], 'outer', 'inner')).toBe(false)
  })

  it('keeps screen position when reparenting between nested containers', () => {
    const root = { ...makeNode('root', { container_mode: true }), position: { x: 100, y: 100 } }
    const target = { ...nested('target', 'root', 50, 40), data: { ...nested('target', 'root', 50, 40).data, container_mode: true } }
    const child = { ...makeNode('child'), position: { x: 400, y: 300 } }
    const moved = reparentPreservingPosition([root, target, child], 'child', 'target')
    expect(moved.find((node) => node.id === 'child')?.position).toEqual({ x: 250, y: 160 })
  })

  it('orders every parent before its descendants', () => {
    const root = makeNode('root')
    const middle = nested('middle', 'root', 0, 0)
    const leaf = nested('leaf', 'middle', 0, 0)
    expect(orderParentsFirst([leaf, middle, root]).map((node) => node.id)).toEqual(['root', 'middle', 'leaf'])
  })

  it('repairs a cycle by detaching the newest node with id as tie-breaker', () => {
    const a = nested('a', 'b', 0, 0)
    const b = nested('b', 'a', 0, 0)
    a.data.updated_at = '2026-01-01T00:00:00Z'
    b.data.updated_at = '2026-01-02T00:00:00Z'
    const repaired = repairHierarchy([a, b])
    expect(repaired.repairs).toEqual([{ nodeId: 'b', parentId: 'a', reason: 'cycle' }])
    expect(repaired.nodes.find((node) => node.id === 'b')?.parentId).toBeUndefined()
  })
})
