'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react'
import { IssueNode } from './nodes/IssueNode'
import { SubIssueNode } from './nodes/SubIssueNode'
import { PRNode } from './nodes/PRNode'
import { ProjectNode } from './nodes/ProjectNode'
import { usePlannerStore } from '@/lib/store'
import type { NodeKind, EdgeKind } from '@/lib/types'
import { EdgeKindMenu } from './EdgeKindMenu'

const NODE_TYPES = {
  issue: IssueNode,
  subissue: SubIssueNode,
  pr: PRNode,
  project: ProjectNode,
}

const EDGE_COLORS: Record<EdgeKind, string> = {
  'parent-child': '#00d4ff',
  'blocks':       '#f77f00',
  'depends-on':   '#bf5fff',
  'closes':       '#00ff9d',
}

const EDGE_DASH: Record<EdgeKind, string | undefined> = {
  'parent-child': undefined,
  'blocks':       '5,3',
  'depends-on':   '3,3',
  'closes':       '6,2',
}

function storeNodesToFlow(
  storeNodes: ReturnType<typeof usePlannerStore.getState>['nodes'],
  posMap: Map<string, { x: number; y: number }>,
): Node[] {
  return storeNodes.map((n, i) => ({
    id: n.id,
    type: n.kind,
    position: posMap.get(n.id) ?? { x: 80 + (i % 4) * 290, y: 80 + Math.floor(i / 4) * 210 },
    data: n as unknown as Record<string, unknown>,
  }))
}

function storeEdgesToFlow(
  storeEdges: ReturnType<typeof usePlannerStore.getState>['edges'],
): Edge[] {
  return storeEdges.map((e) => {
    const color = EDGE_COLORS[e.edgeKind]
    const dash = EDGE_DASH[e.edgeKind]
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.edgeKind !== 'parent-child' ? e.edgeKind : undefined,
      type: 'smoothstep',
      style: {
        stroke: color,
        strokeDasharray: dash,
        strokeWidth: e.edgeKind === 'parent-child' ? 2 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 14,
        height: 14,
      },
      data: { edgeKind: e.edgeKind },
    }
  })
}

interface EdgeMenuState {
  x: number
  y: number
  pendingConnection: Connection
}

export function PlannerCanvas() {
  const storeNodes = usePlannerStore((s) => s.nodes)
  const storeEdges = usePlannerStore((s) => s.edges)
  const addStoreEdge = usePlannerStore((s) => s.addEdge)
  const deleteStoreEdge = usePlannerStore((s) => s.deleteEdge)
  const deleteNode = usePlannerStore((s) => s.deleteNode)
  const setSelected = usePlannerStore((s) => s.setSelected)

  // Position map is kept in a ref — React Flow owns drag positions,
  // we snapshot them here so new nodes get sensible defaults and
  // restored nodes (e.g. after undo) keep their position.
  const posRef = useRef<Map<string, { x: number; y: number }>>(new Map())

  const [nodes, setNodes, onNodesChange] = useNodesState(
    storeNodesToFlow(storeNodes, posRef.current),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    storeEdgesToFlow(storeEdges),
  )
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState | null>(null)

  // ── Sync store nodes → React Flow (in effect, not during render) ───────────
  useEffect(() => {
    setNodes((flowNodes) => {
      // Snapshot current positions so moved nodes keep their position
      for (const fn of flowNodes) posRef.current.set(fn.id, fn.position)
      return storeNodesToFlow(storeNodes, posRef.current)
    })
  }, [storeNodes, setNodes])

  // ── Sync store edges → React Flow ─────────────────────────────────────────
  useEffect(() => {
    setEdges(storeEdgesToFlow(storeEdges))
  }, [storeEdges, setEdges])

  // ── Keep posRef current as user drags nodes ────────────────────────────────
  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      onNodesChange(changes)
      // Snapshot updated positions after a drag ends
      setNodes((fns) => {
        for (const fn of fns) posRef.current.set(fn.id, fn.position)
        return fns
      })
    },
    [onNodesChange, setNodes],
  )

  const onConnect = useCallback((connection: Connection) => {
    setEdgeMenu({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      pendingConnection: connection,
    })
  }, [])

  const handleEdgeKindSelect = useCallback(
    (kind: EdgeKind) => {
      if (!edgeMenu) return
      addStoreEdge({
        source: edgeMenu.pendingConnection.source!,
        target: edgeMenu.pendingConnection.target!,
        edgeKind: kind,
      })
      setEdgeMenu(null)
    },
    [edgeMenu, addStoreEdge],
  )

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => { for (const e of deleted) deleteStoreEdge(e.id) },
    [deleteStoreEdge],
  )

  const onNodesDelete = useCallback(
    (deleted: Node[]) => { for (const n of deleted) deleteNode(n.id) },
    [deleteNode],
  )

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => setSelected(node.id),
    [setSelected],
  )

  const onPaneClick = useCallback(() => {
    setSelected(null)
    setEdgeMenu(null)
  }, [setSelected])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodesDelete={onNodesDelete}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={NODE_TYPES}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        style={{ background: 'var(--br-bg)' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1.2}
          color="rgba(0,212,255,0.1)"
        />
        <Controls showInteractive={false} style={{ left: 12, bottom: 12 }} />
        <MiniMap
          style={{ right: 12, bottom: 12, width: 140, height: 90 }}
          nodeColor={(n) => {
            const kind = (n.data as { kind: NodeKind }).kind
            if (kind === 'pr')      return 'rgba(255,45,120,0.6)'
            if (kind === 'project') return 'rgba(0,255,157,0.5)'
            if (kind === 'subissue') return 'rgba(0,212,255,0.3)'
            return 'rgba(0,212,255,0.55)'
          }}
          maskColor="rgba(4,8,18,0.75)"
        />
      </ReactFlow>

      {edgeMenu && (
        <EdgeKindMenu
          x={edgeMenu.x}
          y={edgeMenu.y}
          onSelect={handleEdgeKindSelect}
          onCancel={() => setEdgeMenu(null)}
        />
      )}
    </div>
  )
}
