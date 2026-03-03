'use client'

import { useCallback } from 'react'
import { X, Trash2 } from 'lucide-react'
import { usePlannerStore } from '@/lib/store'
import type { PlannerNode } from '@/lib/types'

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label className="br-label">{label}</label>
      {children}
    </div>
  )
}

export function PropertiesPanel() {
  const selectedId = usePlannerStore((s) => s.selectedNodeId)
  const nodes = usePlannerStore((s) => s.nodes)
  const updateNode = usePlannerStore((s) => s.updateNode)
  const deleteNode = usePlannerStore((s) => s.deleteNode)
  const addEdge = usePlannerStore((s) => s.addEdge)
  const deleteEdge = usePlannerStore((s) => s.deleteEdge)
  const setSelected = usePlannerStore((s) => s.setSelected)

  const node = nodes.find((n) => n.id === selectedId)

  const update = useCallback(
    (patch: Partial<PlannerNode>) => {
      if (node) updateNode(node.id, patch)
    },
    [node, updateNode]
  )

  if (!node) {
    return (
      <div style={{
        width: 280,
        background: 'var(--br-surface)',
        borderLeft: '1px solid var(--br-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 8,
        color: 'var(--br-muted)',
        fontSize: 12,
        textAlign: 'center',
        padding: 24,
      }}>
        <div style={{ opacity: 0.4, fontSize: 32 }}>◈</div>
        <div>Select a node to<br />edit its properties</div>
        <div style={{ fontSize: 10, marginTop: 4 }}>
          Drag between node handles<br />to create connections
        </div>
      </div>
    )
  }

  const issues = nodes.filter((n) => n.kind === 'issue')

  return (
    <div style={{
      width: 280,
      background: 'var(--br-surface)',
      borderLeft: '1px solid var(--br-border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderBottom: '1px solid var(--br-border)',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--br-muted)' }}>
            {node.kind.toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--br-muted)', marginTop: 2 }}>
            {node.id}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="br-btn br-btn-danger"
            style={{ padding: '4px 8px', fontSize: 11 }}
            onClick={() => {
              deleteNode(node.id)
              setSelected(null)
            }}
            title="Delete node"
          >
            <Trash2 size={11} />
          </button>
          <button
            className="br-btn br-btn-ghost"
            style={{ padding: '4px 8px', fontSize: 11 }}
            onClick={() => setSelected(null)}
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px' }}>

        {/* Title */}
        <Field label="Title *">
          <input
            className="br-input"
            value={node.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Short descriptive title"
          />
        </Field>

        {/* Body / Description */}
        <Field label="Description">
          <textarea
            className="br-textarea"
            value={node.body ?? ''}
            onChange={(e) => update({ body: e.target.value })}
            placeholder="Markdown supported…"
            rows={3}
          />
        </Field>

        {/* Issue / Sub-issue specific */}
        {(node.kind === 'issue' || node.kind === 'subissue') && (
          <>
            <Field label="Labels (comma-separated)">
              <input
                className="br-input"
                value={node.labels?.join(', ') ?? ''}
                onChange={(e) =>
                  update({
                    labels: e.target.value
                      .split(',')
                      .map((l) => l.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="bug, enhancement, docs"
              />
            </Field>

            <Field label="Assignees (comma-separated)">
              <input
                className="br-input"
                value={node.assignees?.join(', ') ?? ''}
                onChange={(e) =>
                  update({
                    assignees: e.target.value
                      .split(',')
                      .map((a) => a.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="github-handle"
              />
            </Field>

            <Field label="Milestone">
              <input
                className="br-input"
                value={node.milestone ?? ''}
                onChange={(e) => update({ milestone: e.target.value || undefined })}
                placeholder="v1.0"
              />
            </Field>

            {/* Sub-issue: parent selector */}
            {node.kind === 'subissue' && (
              <Field label="Parent Issue">
                <select
                  className="br-input"
                  value={node.parentId ?? ''}
                  onChange={(e) => {
                    const newParentId = e.target.value || undefined
                    // Read live state to avoid stale closure
                    const existing = usePlannerStore.getState().edges.find(
                      (edge) => edge.target === node.id && edge.edgeKind === 'parent-child',
                    )
                    // deleteEdge / addEdge sync parentId atomically in the store
                    if (existing) deleteEdge(existing.id)
                    if (newParentId) addEdge({ source: newParentId, target: node.id, edgeKind: 'parent-child' })
                    // If clearing with no replacement, directly patch parentId
                    if (!newParentId) update({ parentId: undefined })
                  }}
                  style={{ appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">— None —</option>
                  {issues.filter((i) => i.id !== node.id).map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.title || i.id}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </>
        )}

        {/* PR specific */}
        {node.kind === 'pr' && (
          <>
            <Field label="Head Branch (your feature branch)">
              <input
                className="br-input"
                value={node.headBranch ?? ''}
                onChange={(e) => update({ headBranch: e.target.value })}
                placeholder="feature/my-feature"
              />
            </Field>

            <Field label="Base Branch (merge target)">
              <input
                className="br-input"
                value={node.baseBranch ?? 'main'}
                onChange={(e) => update({ baseBranch: e.target.value })}
                placeholder="main"
              />
            </Field>

            <Field label="Assignees (comma-separated)">
              <input
                className="br-input"
                value={node.assignees?.join(', ') ?? ''}
                onChange={(e) =>
                  update({
                    assignees: e.target.value
                      .split(',')
                      .map((a) => a.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="github-handle"
              />
            </Field>

            <Field label="Draft PR">
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                fontSize: 13,
                color: 'var(--br-text)',
              }}>
                <input
                  type="checkbox"
                  checked={node.draft ?? false}
                  onChange={(e) => update({ draft: e.target.checked })}
                  style={{
                    accentColor: 'var(--br-pink)',
                    width: 14,
                    height: 14,
                  }}
                />
                Mark as draft
              </label>
            </Field>

            <Field label="Closes Issues">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {nodes
                  .filter((n) => n.kind === 'issue' || n.kind === 'subissue')
                  .map((issue) => {
                    const checked = node.linkedIssueIds?.includes(issue.id) ?? false
                    return (
                      <label
                        key={issue.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          fontSize: 12,
                          color: checked ? 'var(--br-text)' : 'var(--br-muted)',
                          padding: '3px 0',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            // Read live state to avoid stale closure
                            const existing = usePlannerStore.getState().edges.find(
                              (edge) =>
                                edge.source === node.id &&
                                edge.target === issue.id &&
                                edge.edgeKind === 'closes',
                            )
                            // addEdge / deleteEdge sync linkedIssueIds atomically in the store
                            if (isChecked && !existing) {
                              addEdge({ source: node.id, target: issue.id, edgeKind: 'closes' })
                            } else if (!isChecked && existing) {
                              deleteEdge(existing.id)
                            } else if (!isChecked && !existing) {
                              // Fallback: stale data (e.g. old localStorage) — patch directly
                              update({ linkedIssueIds: (node.linkedIssueIds ?? []).filter((i) => i !== issue.id) })
                            }
                          }}
                          style={{ accentColor: 'var(--br-green)', width: 13, height: 13 }}
                        />
                        <span style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {issue.title || issue.id}
                        </span>
                      </label>
                    )
                  })}
                {nodes.filter((n) => n.kind === 'issue' || n.kind === 'subissue').length === 0 && (
                  <div style={{ color: 'var(--br-muted)', fontSize: 11, fontStyle: 'italic' }}>
                    No issues in plan yet
                  </div>
                )}
              </div>
            </Field>
          </>
        )}

        {/* Project specific — just title + description which are already above */}
        {node.kind === 'project' && (
          <div style={{
            background: 'rgba(0,255,157,0.05)',
            border: '1px solid rgba(0,255,157,0.15)',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 11,
            color: 'var(--br-muted)',
            lineHeight: 1.5,
          }}>
            Projects are created as GitHub Projects (v2). Issues and PRs can be added to them using{' '}
            <code style={{ color: 'var(--br-green)', fontSize: 10 }}>gh project item-add</code> after creation.
          </div>
        )}
      </div>
    </div>
  )
}
