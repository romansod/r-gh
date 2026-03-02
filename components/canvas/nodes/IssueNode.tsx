'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitBranch, Tag, User } from 'lucide-react'
import type { PlannerNode } from '@/lib/types'
import { usePlannerStore } from '@/lib/store'

export const IssueNode = memo(function IssueNode({ data, selected }: NodeProps) {
  const node = data as unknown as PlannerNode
  const setSelected = usePlannerStore((s) => s.setSelected)

  return (
    <div
      onClick={() => setSelected(node.id)}
      style={{
        background: 'var(--br-surface)',
        border: `1px solid ${selected ? 'var(--br-cyan)' : 'var(--br-border)'}`,
        borderRadius: 8,
        minWidth: 200,
        maxWidth: 260,
        cursor: 'pointer',
        boxShadow: selected ? 'var(--br-glow-cyan)' : 'none',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, var(--br-cyan), var(--br-cyan-dim))',
        borderRadius: '8px 8px 0 0',
      }} />

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />

      <div style={{ padding: '10px 12px' }}>
        {/* Kind badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            background: 'rgba(0,212,255,0.12)',
            color: 'var(--br-cyan)',
            border: '1px solid rgba(0,212,255,0.25)',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            padding: '1px 6px',
          }}>
            ISSUE
          </span>
          {node.milestone && (
            <span style={{
              color: 'var(--br-amber)',
              fontSize: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              <GitBranch size={10} />
              {node.milestone}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--br-text)',
          lineHeight: 1.35,
          marginBottom: 6,
          wordBreak: 'break-word',
        }}>
          {node.title || <span style={{ color: 'var(--br-muted)', fontStyle: 'italic' }}>Untitled</span>}
        </div>

        {/* Labels */}
        {node.labels && node.labels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 4 }}>
            {node.labels.slice(0, 3).map((l, i) => (
              <span key={i} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                background: 'rgba(0,212,255,0.08)',
                color: 'var(--br-muted)',
                borderRadius: 3,
                fontSize: 10,
                padding: '1px 5px',
              }}>
                <Tag size={8} />
                {l}
              </span>
            ))}
            {node.labels.length > 3 && (
              <span style={{ color: 'var(--br-muted)', fontSize: 10 }}>+{node.labels.length - 3}</span>
            )}
          </div>
        )}

        {/* Assignees */}
        {node.assignees && node.assignees.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <User size={10} style={{ color: 'var(--br-muted)' }} />
            <span style={{ color: 'var(--br-muted)', fontSize: 10 }}>
              {node.assignees.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
})
