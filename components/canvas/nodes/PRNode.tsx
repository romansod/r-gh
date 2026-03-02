'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { GitPullRequest, GitBranch } from 'lucide-react'
import type { PlannerNode } from '@/lib/types'
import { usePlannerStore } from '@/lib/store'

export const PRNode = memo(function PRNode({ data, selected }: NodeProps) {
  const node = data as unknown as PlannerNode
  const setSelected = usePlannerStore((s) => s.setSelected)

  return (
    <div
      onClick={() => setSelected(node.id)}
      style={{
        background: 'var(--br-surface)',
        border: `1px solid ${selected ? 'var(--br-pink)' : 'rgba(255,45,120,0.28)'}`,
        borderRadius: 8,
        minWidth: 200,
        maxWidth: 260,
        cursor: 'pointer',
        boxShadow: selected ? 'var(--br-glow-pink)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      {/* Top accent bar */}
      <div style={{
        height: 3,
        background: 'linear-gradient(90deg, var(--br-pink), var(--br-pink-dim))',
        borderRadius: '8px 8px 0 0',
      }} />

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />

      <div style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{
            background: 'rgba(255,45,120,0.12)',
            color: 'var(--br-pink)',
            border: '1px solid rgba(255,45,120,0.28)',
            borderRadius: 4,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.06em',
            padding: '1px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}>
            <GitPullRequest size={9} />
            PR
          </span>
          {node.draft && (
            <span style={{
              background: 'rgba(247,127,0,0.1)',
              color: 'var(--br-amber)',
              border: '1px solid rgba(247,127,0,0.2)',
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 600,
              padding: '1px 5px',
            }}>
              DRAFT
            </span>
          )}
        </div>

        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--br-text)',
          lineHeight: 1.35,
          marginBottom: 6,
          wordBreak: 'break-word',
        }}>
          {node.title || <span style={{ color: 'var(--br-muted)', fontStyle: 'italic' }}>Untitled PR</span>}
        </div>

        {(node.headBranch || node.baseBranch) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--br-muted)',
            fontSize: 10,
            marginTop: 4,
          }}>
            <GitBranch size={9} />
            <span style={{
              background: 'rgba(0,212,255,0.06)',
              padding: '1px 5px',
              borderRadius: 3,
              color: 'var(--br-cyan-dim)',
            }}>
              {node.headBranch || '—'}
            </span>
            <span>→</span>
            <span style={{
              background: 'rgba(0,212,255,0.06)',
              padding: '1px 5px',
              borderRadius: 3,
              color: 'var(--br-cyan-dim)',
            }}>
              {node.baseBranch || 'main'}
            </span>
          </div>
        )}

        {node.assignees && node.assignees.length > 0 && (
          <div style={{ color: 'var(--br-muted)', fontSize: 10, marginTop: 4 }}>
            {node.assignees.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
})
