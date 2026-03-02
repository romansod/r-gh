'use client'

import type { EdgeKind } from '@/lib/types'

interface Props {
  x: number
  y: number
  onSelect: (kind: EdgeKind) => void
  onCancel: () => void
}

const options: { kind: EdgeKind; label: string; color: string; desc: string }[] = [
  { kind: 'parent-child', label: 'Parent → Child',  color: '#00d4ff', desc: 'Issue contains sub-issue' },
  { kind: 'blocks',       label: 'Blocks',          color: '#f77f00', desc: 'Source blocks target' },
  { kind: 'depends-on',   label: 'Depends On',      color: '#bf5fff', desc: 'Source depends on target' },
  { kind: 'closes',       label: 'Closes',          color: '#00ff9d', desc: 'PR closes issue' },
]

export function EdgeKindMenu({ x, y, onSelect, onCancel }: Props) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
        }}
      />
      {/* Menu */}
      <div
        style={{
          position: 'fixed',
          left: Math.min(x, window.innerWidth - 230),
          top: Math.min(y, window.innerHeight - 250),
          zIndex: 50,
          background: 'var(--br-surface)',
          border: '1px solid var(--br-border)',
          borderRadius: 10,
          padding: 8,
          width: 220,
          boxShadow: 'var(--br-glow-cyan), 0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--br-muted)',
          padding: '4px 8px 8px',
        }}>
          Connection Type
        </div>
        {options.map((opt) => (
          <button
            key={opt.kind}
            onClick={() => onSelect(opt.kind)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--br-surface-hi)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: opt.color,
              marginTop: 3,
              flexShrink: 0,
              boxShadow: `0 0 6px ${opt.color}`,
            }} />
            <div>
              <div style={{ color: opt.color, fontSize: 12, fontWeight: 600 }}>{opt.label}</div>
              <div style={{ color: 'var(--br-muted)', fontSize: 10, marginTop: 1 }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}
