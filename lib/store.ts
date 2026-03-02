'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PlannerNode, PlannerEdge, NodeKind, RepoConfig } from './types'

let _idCounter = 1
function nextId(kind: NodeKind) {
  return `${kind}-${_idCounter++}`
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
        const node: PlannerNode = {
          id,
          kind,
          title: kind === 'project' ? 'New Project' : kind === 'pr' ? 'New PR' : 'New Issue',
          ...defaults,
        }
        set((s) => ({ nodes: [...s.nodes, node], selectedNodeId: id }))
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
            .map((n) => (n.parentId === id ? { ...n, parentId: undefined } : n)),
          edges: s.edges.filter((e) => e.source !== id && e.target !== id),
          selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
        })),

      addEdge: (edge) => {
        const id = `edge-${_idCounter++}`
        set((s) => ({ edges: [...s.edges, { ...edge, id }] }))
      },

      updateEdge: (id, patch) =>
        set((s) => ({
          edges: s.edges.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),

      deleteEdge: (id) =>
        set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),

      setSelected: (id) => set({ selectedNodeId: id }),

      reset: () =>
        set({ nodes: [], edges: [], selectedNodeId: null }),
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
