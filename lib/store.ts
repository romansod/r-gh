'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlannerNode, PlannerEdge, NodeKind, RepoConfig } from './types'

let _idCounter = 1
function nextId(kind: NodeKind) {
  return `${kind}-${_idCounter++}`
}

const KIND_LABEL: Record<NodeKind, string> = {
  project:  'Project',
  pr:       'PR',
  subissue: 'Sub-issue',
  issue:    'Issue',
}

interface PlannerStore {
  repoConfig: RepoConfig
  nodes: PlannerNode[]
  edges: PlannerEdge[]
  selectedNodeId: string | null

  setRepoConfig: (cfg: Partial<RepoConfig>) => void
  addNode: (kind: NodeKind, position?: { x: number; y: number }) => string
  updateNode: (id: string, patch: Partial<PlannerNode>) => void
  deleteNode: (id: string) => void
  addEdge: (edge: Omit<PlannerEdge, 'id'>) => void
  updateEdge: (id: string, patch: Partial<PlannerEdge>) => void
  deleteEdge: (id: string) => void
  setSelected: (id: string | null) => void
  reset: () => void
}

const defaultNodes: PlannerNode[] = []
const defaultEdges: PlannerEdge[] = []

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      repoConfig: { owner: '', repo: '' },
      nodes: defaultNodes,
      edges: defaultEdges,
      selectedNodeId: null,

      setRepoConfig: (cfg) =>
        set((s) => ({ repoConfig: { ...s.repoConfig, ...cfg } })),

      addNode: (kind) => {
        const id = nextId(kind)
        const defaults: Partial<PlannerNode> = kind === 'pr'
          ? { baseBranch: 'main', headBranch: '', draft: false, linkedIssueIds: [] }
          : kind === 'project'
          ? {}
          : { labels: [], assignees: [] }
        set((s) => {
          const count = s.nodes.filter((n) => n.kind === kind).length + 1
          const node: PlannerNode = {
            id,
            kind,
            title: `New ${KIND_LABEL[kind]} ${count}`,
            ...defaults,
          }
          return { nodes: [...s.nodes, node], selectedNodeId: id }
        })
        return id
      },

      updateNode: (id, patch) =>
        set((s) => ({
          nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
        })),

      deleteNode: (id) =>
        set((s) => ({
          nodes: s.nodes
            .filter((n) => n.id !== id)
            .map((n) => {
              if (n.parentId === id) return { ...n, parentId: undefined }
              if (n.linkedIssueIds?.includes(id)) {
                return { ...n, linkedIssueIds: n.linkedIssueIds.filter((i) => i !== id) }
              }
              return n
            }),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        })),

      addEdge: (edge) => {
        const id = `edge-${_idCounter++}`
        set((s) => {
          // Sync node fields atomically with the edge creation
          let nodes = s.nodes
          if (edge.edgeKind === 'parent-child') {
            // Only set parentId when source is an issue or sub-issue; PRs/projects cannot
            // be parents of sub-issues in GitHub's model
            const sourceKind = s.nodes.find((n) => n.id === edge.source)?.kind
            if (sourceKind === 'issue' || sourceKind === 'subissue') {
              nodes = nodes.map((n) =>
                n.id === edge.target ? { ...n, parentId: edge.source } : n,
              )
            }
          } else if (edge.edgeKind === 'closes') {
            nodes = nodes.map((n) => {
              if (n.id === edge.source && n.kind === 'pr') {
                const current = n.linkedIssueIds ?? []
                if (!current.includes(edge.target)) {
                  return { ...n, linkedIssueIds: [...current, edge.target] }
                }
              }
              return n
            })
          }
          return { edges: [...s.edges, { ...edge, id }], nodes }
        })
      },

      updateEdge: (id, patch) =>
        set((s) => ({
          edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteEdge: (id) =>
        set((s) => {
          const edge = s.edges.find((e) => e.id === id)
          // Sync node fields atomically with the edge deletion
          let nodes = s.nodes
          if (edge?.edgeKind === 'parent-child') {
            const sourceKind = s.nodes.find((n) => n.id === edge.source)?.kind
            if (sourceKind === 'issue' || sourceKind === 'subissue') {
              nodes = nodes.map((n) =>
                n.id === edge.target ? { ...n, parentId: undefined } : n,
              )
            }
          } else if (edge?.edgeKind === 'closes') {
            nodes = nodes.map((n) => {
              if (n.id === edge.source && n.kind === 'pr') {
                return { ...n, linkedIssueIds: (n.linkedIssueIds ?? []).filter((i) => i !== edge.target) }
              }
              return n
            })
          }
          return { edges: s.edges.filter((e) => e.id !== id), nodes }
        }),

      setSelected: (id) => set({ selectedNodeId: id }),

      reset: () => {
        _idCounter = 1
        set({ nodes: [], edges: [], selectedNodeId: null })
      },
    }),
    {
      name: 'r-gh-planner',
      // don't persist selectedNodeId
      partialize: (s) => ({
        repoConfig: s.repoConfig,
        nodes: s.nodes,
        edges: s.edges,
      }),
    }
  )
)
