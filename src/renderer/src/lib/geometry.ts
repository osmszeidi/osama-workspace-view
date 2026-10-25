export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export const rectsIntersect = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export const containsPoint = (r: Rect, px: number, py: number): boolean => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h

export const unionRects = (rs: Rect[]): Rect | null => {
  if (!rs.length) return null
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity
  for (const r of rs) {
    x0 = Math.min(x0, r.x)
    y0 = Math.min(y0, r.y)
    x1 = Math.max(x1, r.x + r.w)
    y1 = Math.max(y1, r.y + r.h)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

type Side = 'l' | 'r' | 't' | 'b'

function anchor(r: Rect, side: Side): { x: number; y: number } {
  switch (side) {
    case 'l':
      return { x: r.x, y: r.y + r.h / 2 }
    case 'r':
      return { x: r.x + r.w, y: r.y + r.h / 2 }
    case 't':
      return { x: r.x + r.w / 2, y: r.y }
    case 'b':
      return { x: r.x + r.w / 2, y: r.y + r.h }
  }
}

const dir: Record<Side, [number, number]> = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] }

/** Smooth cubic connector between two rectangles (or a rectangle and a point). */
export function connectorPath(a: Rect, b: Rect | { x: number; y: number }): { d: string; mid: { x: number; y: number } } {
  const bRect: Rect = 'w' in b ? b : { x: b.x, y: b.y, w: 0, h: 0 }
  const acx = a.x + a.w / 2,
    acy = a.y + a.h / 2
  const bcx = bRect.x + bRect.w / 2,
    bcy = bRect.y + bRect.h / 2
  const dx = bcx - acx,
    dy = bcy - acy
  // Gap between rectangles on each axis decides the dominant direction.
  const gapX = Math.max(bRect.x - (a.x + a.w), a.x - (bRect.x + bRect.w))
  const gapY = Math.max(bRect.y - (a.y + a.h), a.y - (bRect.y + bRect.h))
  let sa: Side, sb: Side
  if (gapX >= gapY) {
    sa = dx >= 0 ? 'r' : 'l'
    sb = dx >= 0 ? 'l' : 'r'
  } else {
    sa = dy >= 0 ? 'b' : 't'
    sb = dy >= 0 ? 't' : 'b'
  }
  const p1 = anchor(a, sa)
  const p2 = 'w' in b ? anchor(bRect, sb) : { x: b.x, y: b.y }
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
  const k = Math.min(140, Math.max(30, dist * 0.42))
  const c1 = { x: p1.x + dir[sa][0] * k, y: p1.y + dir[sa][1] * k }
  const c2 = 'w' in b ? { x: p2.x + dir[sb][0] * k, y: p2.y + dir[sb][1] * k } : { x: p2.x, y: p2.y }
  const mid = {
    x: 0.125 * p1.x + 0.375 * c1.x + 0.375 * c2.x + 0.125 * p2.x,
    y: 0.125 * p1.y + 0.375 * c1.y + 0.375 * c2.y + 0.125 * p2.y
  }
  return { d: `M ${p1.x} ${p1.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`, mid }
}

/**
 * Choose page break positions along one axis that avoid cutting cards whenever possible.
 */
export function smartBreaks(start: number, end: number, span: number, intervals: [number, number][]): number[] {
  const out = [start]
  let pos = start
  let guard = 0
  while (pos + span < end - 1 && guard++ < 500) {
    let next = pos + span
    for (let i = 0; i < 30; i++) {
      const straddlers = intervals.filter(([a, b]) => a < next - 0.5 && b > next + 0.5 && b - a <= span)
      if (!straddlers.length) break
      const cand = Math.min(...straddlers.map(([a]) => a)) - 8
      if (cand <= pos + span * 0.3) break
      next = cand
    }
    out.push(next)
    pos = next
  }
  out.push(end)
  return out
}
