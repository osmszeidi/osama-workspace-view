import type { Card, Connection } from '@shared/types'
import { colorHex } from '../lib/util'
import { connectorPath, Rect, unionRects } from '../lib/geometry'

interface Props {
  cards: Record<string, Card>
  connections: Connection[]
  selectedId?: string | null
  onSelect?: (id: string, e: React.PointerEvent) => void
  temp?: { from: Rect; to: { x: number; y: number } } | null
  interactive?: boolean
}

export default function ConnectionsLayer({ cards, connections, selectedId, onSelect, temp, interactive = true }: Props) {
  const rects: Rect[] = []
  for (const c of connections) {
    const a = cards[c.fromId],
      b = cards[c.toId]
    if (a && b) rects.push(a, b)
  }
  if (temp) rects.push(temp.from, { x: temp.to.x, y: temp.to.y, w: 1, h: 1 })
  const bb = unionRects(rects)
  if (!bb) return null
  const pad = 200
  const x0 = bb.x - pad,
    y0 = bb.y - pad,
    w = bb.w + pad * 2,
    h = bb.h + pad * 2

  return (
    <svg
      className="absolute"
      style={{ left: x0, top: y0, width: w, height: h, overflow: 'visible', pointerEvents: 'none' }}
      viewBox={`${x0} ${y0} ${w} ${h}`}
    >
      <defs>
        {connections.map((c) => {
          const col = colorHex(c.style.color) ?? 'var(--border-strong)'
          const sel = c.id === selectedId
          const fill = sel ? 'var(--sel)' : col
          return (
            <g key={c.id}>
              <marker id={`ah-e-${c.id}`} viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 0.8 L 9.5 5 L 0 9.2 z" style={{ fill }} />
              </marker>
              <marker id={`ah-s-${c.id}`} viewBox="0 0 10 10" refX="1.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 10 0.8 L 0.5 5 L 10 9.2 z" style={{ fill }} />
              </marker>
            </g>
          )
        })}
      </defs>
      {connections.map((c) => {
        const a = cards[c.fromId],
          b = cards[c.toId]
        if (!a || !b) return null
        const { d } = connectorPath(a, b)
        const sel = c.id === selectedId
        const col = sel ? 'var(--sel)' : colorHex(c.style.color) ?? 'var(--border-strong)'
        return (
          <g key={c.id} data-connection-id={c.id}>
            {interactive && (
              <path
                d={d}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  onSelect?.(c.id, e)
                }}
              />
            )}
            <path
              d={d}
              fill="none"
              style={{ stroke: col }}
              strokeWidth={sel ? 2.2 : 1.6}
              strokeDasharray={c.style.dashed ? '6 6' : undefined}
              strokeLinecap="round"
              markerEnd={c.style.arrow !== 'none' ? `url(#ah-e-${c.id})` : undefined}
              markerStart={c.style.arrow === 'both' ? `url(#ah-s-${c.id})` : undefined}
            />
          </g>
        )
      })}
      {temp && <path d={connectorPath(temp.from, temp.to).d} fill="none" style={{ stroke: 'var(--sel)' }} strokeWidth={1.8} strokeDasharray="5 5" />}
    </svg>
  )
}
