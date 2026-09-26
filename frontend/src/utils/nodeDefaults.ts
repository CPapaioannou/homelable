import type { NodeType, NodeProperty } from '@/types'

/**
 * The `properties` a brand-new node of a given type starts with, so a card is
 * born with the fields that type is expected to fill in rather than a blank
 * properties section.
 *
 * A `drive` seeds a `media` (SSD / HDD / NVMe) and a `serial`; every other
 * type seeds nothing. The values are starting points the user edits in the
 * node modal — `media` defaults to SSD and `serial` starts empty so the
 * property is visible and ready to type into.
 */
export function defaultNodeProperties(type: NodeType): NodeProperty[] | undefined {
  if (type !== 'drive') return undefined
  return [
    { key: 'media', value: 'SSD', icon: null, visible: true },
    { key: 'serial', value: '', icon: null, visible: true },
  ]
}
