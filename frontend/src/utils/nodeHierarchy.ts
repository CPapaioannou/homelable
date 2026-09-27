import type { Node } from '@xyflow/react'
import type { NodeData } from '@/types'

export type CanvasNode = Node<NodeData>

/** The persisted relationship. It may be semantic-only (a virtual edge). */
export const relationshipParentId = (node: CanvasNode): string | undefined =>
  node.data.parent_id ?? node.parentId ?? undefined

/** The React Flow parent. Its position is relative and it moves with this node. */
export const visualParentId = (node: CanvasNode): string | undefined =>
  node.parentId ?? undefined

export const isHierarchyChild = (node: CanvasNode): boolean =>
  node.data.type !== 'group' && node.data.type !== 'text'

export const isVisualContainer = (node: CanvasNode): boolean =>
  node.data.type === 'group' || node.data.type === 'groupRect' || node.data.container_mode === true

export function nodeMap(nodes: CanvasNode[]): Map<string, CanvasNode> {
  return new Map(nodes.map((node) => [node.id, node]))
}

/** Absolute canvas position. Corrupt cycles terminate instead of recursing. */
export function absolutePosition(
  node: CanvasNode,
  byId: Map<string, CanvasNode> = new Map([[node.id, node]]),
): { x: number; y: number } {
  let x = node.position.x
  let y = node.position.y
  const seen = new Set<string>([node.id])
  let parentId = visualParentId(node)
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = byId.get(parentId)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    parentId = visualParentId(parent)
  }
  return { x, y }
}

/** True when maybeAncestorId is on nodeId's persisted parent chain. */
export function isAncestorOf(
  nodes: CanvasNode[],
  maybeAncestorId: string,
  nodeId: string,
): boolean {
  const byId = nodeMap(nodes)
  const seen = new Set<string>([nodeId])
  let current = byId.get(nodeId)
  while (current) {
    const parentId = relationshipParentId(current)
    if (!parentId || seen.has(parentId)) return false
    if (parentId === maybeAncestorId) return true
    seen.add(parentId)
    current = byId.get(parentId)
  }
  return false
}

export function descendantIds(nodes: CanvasNode[], ancestorId: string): Set<string> {
  const children = new Map<string, string[]>()
  for (const node of nodes) {
    const parentId = relationshipParentId(node)
    if (!parentId) continue
    const ids = children.get(parentId) ?? []
    ids.push(node.id)
    children.set(parentId, ids)
  }
  const out = new Set<string>()
  const queue = [...(children.get(ancestorId) ?? [])]
  while (queue.length) {
    const id = queue.shift()!
    if (out.has(id) || id === ancestorId) continue
    out.add(id)
    queue.push(...(children.get(id) ?? []))
  }
  return out
}

/** Descendants that actually move/render with a React Flow visual parent. */
export function visualDescendantIds(nodes: CanvasNode[], ancestorId: string): Set<string> {
  const children = new Map<string, string[]>()
  for (const node of nodes) {
    if (!node.parentId) continue
    const ids = children.get(node.parentId) ?? []
    ids.push(node.id)
    children.set(node.parentId, ids)
  }
  const out = new Set<string>()
  const queue = [...(children.get(ancestorId) ?? [])]
  while (queue.length) {
    const id = queue.shift()!
    if (out.has(id)) continue
    out.add(id)
    queue.push(...(children.get(id) ?? []))
  }
  return out
}

export function canReparent(
  nodes: CanvasNode[],
  childId: string,
  targetId: string,
): boolean {
  const child = nodes.find((node) => node.id === childId)
  const target = nodes.find((node) => node.id === targetId)
  return !!child && !!target && childId !== targetId && isHierarchyChild(child)
    && isVisualContainer(target)
    && !(target.data.type === 'group' && child.data.type === 'groupRect')
    && !isAncestorOf(nodes, childId, targetId)
}

/** React Flow requires each visual parent to precede every visual descendant. */
export function orderParentsFirst(nodes: CanvasNode[]): CanvasNode[] {
  const byId = nodeMap(nodes)
  const emitted = new Set<string>()
  const visiting = new Set<string>()
  const out: CanvasNode[] = []

  const visit = (node: CanvasNode) => {
    if (emitted.has(node.id) || visiting.has(node.id)) return
    visiting.add(node.id)
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) visit(parent)
    visiting.delete(node.id)
    emitted.add(node.id)
    out.push(node)
  }

  for (const node of nodes) visit(node)
  return out
}

/**
 * Reparent one node without moving it on screen. Descendants keep their relative
 * positions and therefore travel with the node. A zone inside a zone is loose;
 * every other visual parent clamps its direct child.
 */
export function reparentPreservingPosition(
  nodes: CanvasNode[],
  childId: string,
  parentId: string | undefined,
): CanvasNode[] {
  const byId = nodeMap(nodes)
  const child = byId.get(childId)
  const parent = parentId ? byId.get(parentId) : undefined
  if (!child) return nodes
  if (parentId && (!parent || !canReparent(nodes, childId, parentId))) return nodes

  const childAbsolute = absolutePosition(child, byId)
  const parentAbsolute = parent ? absolutePosition(parent, byId) : { x: 0, y: 0 }
  const extent = parent && parent.data.type !== 'groupRect' ? ('parent' as const) : undefined

  return orderParentsFirst(nodes.map((node) => node.id === childId
    ? {
        ...node,
        parentId,
        extent,
        position: {
          x: childAbsolute.x - parentAbsolute.x,
          y: childAbsolute.y - parentAbsolute.y,
        },
        data: { ...node.data, parent_id: parentId },
      }
    : node))
}

export interface HierarchyRepair {
  nodeId: string
  parentId: string
  reason: 'missing-parent' | 'invalid-child' | 'cycle'
}

/** Defensive client-side repair for standalone or malformed legacy payloads. */
export function repairHierarchy(nodes: CanvasNode[]): {
  nodes: CanvasNode[]
  repairs: HierarchyRepair[]
} {
  const byId = nodeMap(nodes)
  const repaired = new Map(nodes.map((node) => [node.id, node]))
  const repairs: HierarchyRepair[] = []

  const detach = (node: CanvasNode, parentId: string, reason: HierarchyRepair['reason']) => {
    if (repairs.some((repair) => repair.nodeId === node.id)) return
    const position = absolutePosition(node, nodeMap([...repaired.values()]))
    repaired.set(node.id, {
      ...node,
      position,
      parentId: undefined,
      extent: undefined,
      data: { ...node.data, parent_id: undefined },
    })
    repairs.push({ nodeId: node.id, parentId, reason })
  }

  for (const node of nodes) {
    const parentId = relationshipParentId(node)
    if (!parentId) continue
    const parent = byId.get(parentId)
    if (!parent) detach(node, parentId, 'missing-parent')
    else if (
      !isHierarchyChild(node)
      || parent.data.type === 'text'
      || (parent.data.type === 'group' && node.data.type === 'groupRect')
    ) detach(node, parentId, 'invalid-child')
  }

  // Break one deterministic edge per cycle, then repeat until the graph is a forest.
  for (;;) {
    const current = [...repaired.values()]
    const currentById = nodeMap(current)
    let cut = false
    for (const start of current) {
      const path: CanvasNode[] = []
      const pathIndex = new Map<string, number>()
      let cursor: CanvasNode | undefined = start
      while (cursor) {
        const at = pathIndex.get(cursor.id)
        if (at !== undefined) {
          const cycle = path.slice(at)
          const victim = [...cycle].sort((a, b) => {
            const time = (b.data.updated_at ?? '').localeCompare(a.data.updated_at ?? '')
            return time || b.id.localeCompare(a.id)
          })[0]
          const parentId = relationshipParentId(victim)
          if (parentId) detach(victim, parentId, 'cycle')
          cut = true
          break
        }
        pathIndex.set(cursor.id, path.length)
        path.push(cursor)
        const parentId = relationshipParentId(cursor)
        cursor = parentId ? currentById.get(parentId) : undefined
      }
      if (cut) break
    }
    if (!cut) break
  }

  return { nodes: orderParentsFirst([...repaired.values()]), repairs }
}
