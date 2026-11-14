import L from 'leaflet'
import type { Echo } from './api'
import type { LatLng } from './useLocation'

/** Minimum on-screen distance between any two pins, in CSS pixels. */
export const PIN_SPACING_PX = 36
/** A crowded group may spread at most this many rings; the rest are omitted. */
export const MAX_RINGS = 2

type Pt = { id: string; echo: Echo; orig: L.Point; pos: L.Point }

export type PinLayout = {
  positions: Map<string, LatLng>
  /** Echo ids not drawn at this zoom because their group was too crowded. */
  hidden: Set<string>
  /** For a group's centre pin: how many of its members are hidden. */
  overflow: Map<string, number>
}

/** Within a crowded group, who gets a slot first. */
function priority(a: Echo, b: Echo, keep?: string): number {
  if (a.id === keep) return -1
  if (b.id === keep) return 1
  if (a.legend !== b.legend) return a.legend ? -1 : 1
  if (a.likes !== b.likes) return b.likes - a.likes
  return a.createdAt < b.createdAt ? 1 : -1
}

/** How many pins fit in the centre plus MAX_RINGS rings. */
export function groupCapacity(spacing = PIN_SPACING_PX, rings = MAX_RINGS): number {
  return ringSlots(Infinity, spacing, rings).length
}

/**
 * Lays pins out so no two are closer than PIN_SPACING_PX on screen at the
 * given zoom. Pins that would collide are grouped and arranged on concentric
 * rings around the group's true centroid, with uniform spacing. Groups keep
 * merging until nothing collides, so the result is stable and overlap-free.
 * Pins far enough apart in reality are left exactly where they are.
 */
export function layoutPins(echoes: Echo[], map: L.Map, zoom: number, keep?: string, spacing = PIN_SPACING_PX): PinLayout {
  // Deterministic order so the layout does not jitter between renders.
  const sorted = [...echoes].sort((a, b) => (a.id < b.id ? -1 : 1))
  const pts: Pt[] = sorted.map((e) => {
    const p = map.project([e.lat, e.lng], zoom)
    return { id: e.id, echo: e, orig: p, pos: p }
  })
  const capacity = groupCapacity(spacing)
  const hidden = new Set<string>()
  const overflow = new Map<string, number>()

  // Union-find over colliding pins.
  const parent = pts.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b)
  }

  for (let iter = 0; iter < 8; iter++) {
    let merged = false
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (find(i) !== find(j) && pts[i].pos.distanceTo(pts[j].pos) < spacing - 0.5) {
          union(i, j)
          merged = true
        }
      }
    }
    if (!merged) break

    const groups = new Map<number, number[]>()
    pts.forEach((_, i) => {
      const r = find(i)
      groups.set(r, [...(groups.get(r) ?? []), i])
    })
    for (const members of groups.values()) {
      if (members.length === 1) {
        pts[members[0]].pos = pts[members[0]].orig
        continue
      }
      const cx = members.reduce((s, i) => s + pts[i].orig.x, 0) / members.length
      const cy = members.reduce((s, i) => s + pts[i].orig.y, 0) / members.length
      // Too crowded for the allowed rings: keep the most relevant, omit the rest.
      const ranked = [...members].sort((a, b) => priority(pts[a].echo, pts[b].echo, keep))
      const shown = ranked.slice(0, capacity)
      const slots = ringSlots(shown.length, spacing)
      shown.forEach((i, k) => {
        pts[i].pos = L.point(cx + slots[k].x, cy + slots[k].y)
      })
      // Hidden pins sit on the centroid (zero footprint) so they do not
      // collide with anything and the union-find stays stable.
      for (const i of ranked.slice(capacity)) pts[i].pos = L.point(cx, cy)
    }
  }

  // Final pass: record who is hidden and the overflow count per group centre.
  const groups = new Map<number, number[]>()
  pts.forEach((_, i) => {
    const r = find(i)
    groups.set(r, [...(groups.get(r) ?? []), i])
  })
  for (const members of groups.values()) {
    if (members.length <= capacity) continue
    const ranked = [...members].sort((a, b) => priority(pts[a].echo, pts[b].echo, keep))
    for (const i of ranked.slice(capacity)) hidden.add(pts[i].id)
    overflow.set(pts[ranked[0]].id, members.length - capacity)
  }

  const positions = new Map<string, LatLng>()
  for (const p of pts) {
    const ll = map.unproject(p.pos, zoom)
    positions.set(p.id, { lat: ll.lat, lng: ll.lng })
  }
  return { positions, hidden, overflow }
}

/**
 * n pixel offsets: one at the centre, then rings of radius k*spacing, each
 * holding as many evenly spaced slots as fit. Alternate rings are rotated by
 * half a slot so pins interleave instead of lining up in spokes.
 */
export function ringSlots(n: number, spacing: number, maxRings = Infinity): L.Point[] {
  const out: L.Point[] = [L.point(0, 0)]
  for (let k = 1; out.length < n && k <= maxRings; k++) {
    const r = k * spacing
    const m = Math.max(1, Math.floor((2 * Math.PI * r) / spacing))
    const phase = k % 2 === 0 ? Math.PI / m : 0
    for (let i = 0; i < m && out.length < n; i++) {
      const a = phase + (2 * Math.PI * i) / m - Math.PI / 2
      out.push(L.point(r * Math.cos(a), r * Math.sin(a)))
    }
  }
  return out
}
