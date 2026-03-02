'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Layers } from 'lucide-react'
import type { PlannerNode } from '@/lib/types'
import { usePlannerStore } from '@/lib/store'

export const ProjectNode = memo(function ProjectNode({ data, selected }: NodeProps) {
  const node = data as unknown as PlannerNode
  const setSelected = usePlannerStore((s) => s.setSelected)

  return (
    <div
      onClick={() => setSelected(node.id)}
      style={{
        background: 'rgba(0,255,157,0.04)',
        border: `1px solid ${selected ? 'var(--br-green)' : 'rgba(0,255,157,0.25)'}`,
        borderRadius: 10,
        minWidth: 220,
        maxWidth: 300,
        cursor: 'pointer',
        boxShadow: selected ? 'var(--br-glow-green)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, var(--br-green), var(--br-green-dim))',
        borderRadius: '10px 10px 0 0',
      }} />

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />

      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <Layers size={13} style={{ color: 'var(--br-green)' }} />
          <span style={{
            background: 'rgba(0,255,157,0.1)',
            color: 'var(--br-green)',
            border: '1px solid rgba(0,255,157,0.22)',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            padding: '1px 6px',
          }}>
            PROJECT
          </span>
        </div>

        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--br-text)',
          lineHeight: 1.3,
          marginBottom: 4,
          wordBreak: 'break-word',
        }}>
          {node.title || <span style={{ color: 'var(--br-muted)', fontStyle: 'italic' }}>Untitled Project</span>}
        </div>

        {node.body && (
          <div style={{
            color: 'var(--br-muted)',
            fontSize: 11,
            lineHeight: 1.4,
            marginTop: 4,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {node.body}
          </div>
        )}
      </div>
    </div>
  )
})
