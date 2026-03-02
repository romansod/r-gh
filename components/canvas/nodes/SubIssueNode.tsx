'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { CornerDownRight, Tag } from 'lucide-react'
import type { PlannerNode } from '@/lib/types'
import { usePlannerStore } from '@/lib/store'

export const SubIssueNode = memo(function SubIssueNode({ data, selected }: NodeProps) {
  const node = data as unknown as PlannerNode
  const setSelected = usePlannerStore((s) => s.setSelected)
  const allNodes = usePlannerStore((s) => s.nodes)
  const parentNode = node.parentId ? allNodes.find((n) => n.id === node.parentId) : undefined

  return (
    <div
      onClick={() => setSelected(node.id)}
      style={{
        background: 'var(--br-surface)',
        border: `1px dashed ${selected ? 'var(--br-cyan)' : 'rgba(0,212,255,0.3)'}`,
        borderRadius: 8,
        minWidth: 180,
        maxWidth: 240,
        cursor: 'pointer',
        boxShadow: selected ? 'var(--br-glow-cyan)' : 'none',
        transition: 'all 0.15s',
      }}
    >
      {/* Top accent bar (thinner/dimmer) */}
      <div style={{
        height: 2,
        background: 'linear-gradient(90deg, var(--br-cyan-dim), transparent)',
        borderRadius: '8px 8px 0 0',
      }} />

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />

      <div style={{ padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
          <span style={{
            background: 'rgba(0,212,255,0.07)',
            color: 'var(--br-cyan-dim)',
            border: '1px solid rgba(0,212,255,0.15)',
            borderRadius: 4,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.06em',
            padding: '1px 5px',
          }}>
            SUB-ISSUE
          </span>
        </div>

        {parentNode && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--br-muted)',
            fontSize: 10,
            marginBottom: 4,
          }}>
            <CornerDownRight size={9} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {parentNode.title}
            </span>
          </div>
        )}

        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--br-text)',
          lineHeight: 1.35,
          marginBottom: 5,
          wordBreak: 'break-word',
        }}>
          {node.title || <span style={{ color: 'var(--br-muted)', fontStyle: 'italic' }}>Untitled</span>}
        </div>

        {node.labels && node.labels.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {node.labels.slice(0, 2).map((l, i) => (
              <span key={i} style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                background: 'rgba(0,212,255,0.06)',
                color: 'var(--br-muted)',
                borderRadius: 3,
                fontSize: 9,
                padding: '1px 4px',
              }}>
                <Tag size={7} />
                {l}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
})
