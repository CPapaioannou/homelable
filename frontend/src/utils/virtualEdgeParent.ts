import type { NodeData } from '@/types'

export type NodeType = NodeData['type']

// Virtualisation semantics are intentionally narrower than visual container
// eligibility. Every inventory device may be a visual container, but only
// these host types imply VM/LXC relationships when a virtual edge is drawn.
export const VIRTUAL_HOST_TYPES = new Set<NodeType>(['proxmox', 'vm', 'lxc', 'docker_host'])
const DOCKER_CONTAINER_PARENT_TYPES = new Set<NodeType>(['docker_host', 'lxc', 'vm', 'proxmox'])

export interface VirtualEdgeEndpoint {
  id: string
  type: NodeType
}

export interface ParentAssignment {
  childId: string
  parentId: string
}

export function getValidParentTypes(childType: NodeType): NodeType[] {
  if (childType === 'lxc' || childType === 'vm') {
    return ['proxmox', 'vm', 'lxc', 'docker_host']
  }
  if (childType === 'docker_container') {
    return ['docker_host', 'lxc', 'vm', 'proxmox']
  }
  return []
}

/** Can `parent` hold a child of `childType`?
 *
 *  A visual group holds any node type — the type rules above only govern
 *  virtual (container) nesting, so they'd wrongly reject a grouped node and
 *  drop it out of its group on the next edit. Groups and zones are excluded as
 *  children, matching what the drag-onto-a-group path accepts.
 */
export function isValidParentNode(
  childType: NodeType,
  parent: { type: NodeType; container_mode?: boolean },
): boolean {
  if (childType === 'text' || childType === 'group') return false
  if (parent.type === 'group') return childType !== 'groupRect'
  if (parent.type === 'groupRect') return true
  return getValidParentTypes(childType).includes(parent.type) || parent.container_mode === true
}

export function resolveVirtualEdgeParent(
  source: VirtualEdgeEndpoint,
  target: VirtualEdgeEndpoint,
): ParentAssignment | null {
  const { type: srcType, id: srcId } = source
  const { type: tgtType, id: tgtId } = target

  if ((srcType === 'lxc' || srcType === 'vm') && VIRTUAL_HOST_TYPES.has(tgtType)) {
    return { childId: srcId, parentId: tgtId }
  }
  if (VIRTUAL_HOST_TYPES.has(srcType) && (tgtType === 'lxc' || tgtType === 'vm')) {
    return { childId: tgtId, parentId: srcId }
  }
  if (srcType === 'docker_container' && DOCKER_CONTAINER_PARENT_TYPES.has(tgtType)) {
    return { childId: srcId, parentId: tgtId }
  }
  if (tgtType === 'docker_container' && DOCKER_CONTAINER_PARENT_TYPES.has(srcType)) {
    return { childId: tgtId, parentId: srcId }
  }
  return null
}
