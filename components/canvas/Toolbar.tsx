'use client'

import { GitBranch, GitPullRequest, Layers, CornerDownRight, Trash2, RotateCcw } from 'lucide-react'
import { usePlannerStore } from '@/lib/store'

const tools = [
  { kind: 'issue'    as const, label: 'Issue',     Icon: GitBranch,      cls: 'br-btn-cyan'  },
  { kind: 'subissue' as const, label: 'Sub-issue',  Icon: CornerDownRight, cls: 'br-btn-cyan'  },
  { kind: 'pr'       as const, label: 'PR',         Icon: GitPullRequest,  cls: 'br-btn-pink'  },
  { kind: 'project'  as const, label: 'Project',    Icon: Layers,          cls: 'br-btn-green' },
]

export function Toolbar() {
  const addNode = usePlannerStore((s) => s.addNode)
  const reset   = usePlannerStore((s) => s.reset)
  const nodes   = usePlannerStore((s) => s.nodes)

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 12px',
      height: '100%',
    }}>
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--br-muted)',
        marginRight: 4,
      }}>
        Add
      </span>

      {tools.map(({ kind, label, Icon, cls }) => (
        <button
          key={kind}
          className={`br-btn ${cls}`}
          style={{ fontSize: 12, padding: '5px 11px' }}
          onClick={() => addNode(kind)}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}

      <div style={{
        width: 1,
        height: 20,
        background: 'var(--br-border)',
        margin: '0 4px',
      }} />

      <button
        className="br-btn br-btn-danger"
        style={{ fontSize: 12, padding: '5px 11px' }}
        onClick={() => {
          if (nodes.length === 0 || confirm('Reset the entire plan? This cannot be undone.')) {
            reset()
          }
        }}
        title="Reset all"
      >
        <RotateCcw size={11} />
        Reset
      </button>
    </div>
  )
}
