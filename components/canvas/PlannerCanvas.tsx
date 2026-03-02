'use client'

import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnectEnd,
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

function plannerNodesToFlow(nodes: ReturnType<typeof usePlannerStore.getState>['nodes']): Node[] {
  return nodes.map((n, i) => ({
    id: n.id,
    type: n.kind,
    position: { x: 100 + (i % 4) * 300, y: 100 + Math.floor(i / 4) * 220 },
    data: n as unknown as Record<string, unknown>,
  }))
}

function plannerEdgesToFlow(edges: ReturnType<typeof usePlannerStore.getState>['edges']): Edge[] {
  return edges.map((e) => {
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

  const [nodes, setNodes, onNodesChange] = useNodesState(plannerNodesToFlow(storeNodes))
  const [edges, setEdges, onEdgesChange] = useEdgesState(plannerEdgesToFlow(storeEdges))
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenuState | null>(null)

  // Sync store → flow when store changes
  const prevStoreNodes = useRef(storeNodes)
  const prevStoreEdges = useRef(storeEdges)

  if (storeNodes !== prevStoreNodes.current) {
    prevStoreNodes.current = storeNodes
    setNodes((fNodes) => {
      const posMap = new Map(fNodes.map((n) => [n.id, n.position]))
      return plannerNodesToFlow(storeNodes).map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? n.position,
      }))
    })
  }

  if (storeEdges !== prevStoreEdges.current) {
    prevStoreEdges.current = storeEdges
    setEdges(plannerEdgesToFlow(storeEdges))
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      // Show edge-kind picker menu
      setEdgeMenu({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        pendingConnection: connection,
      })
    },
    []
  )

  const handleEdgeKindSelect = useCallback(
    (kind: EdgeKind) => {
      if (!edgeMenu) return
      const { pendingConnection: conn } = edgeMenu
      addStoreEdge({
        source: conn.source!,
        target: conn.target!,
        edgeKind: kind,
      })
      setEdgeMenu(null)
    },
    [edgeMenu, addStoreEdge]
  )

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) deleteStoreEdge(e.id)
    },
    [deleteStoreEdge]
  )

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      for (const n of deleted) deleteNode(n.id)
    },
    [deleteNode]
  )

  const onNodeClick = useCallback(
    (_: unknown, node: Node) => {
      setSelected(node.id)
    },
    [setSelected]
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
        onNodesChange={onNodesChange}
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
        <Controls
          showInteractive={false}
          style={{ left: 12, bottom: 12 }}
        />
        <MiniMap
          style={{ right: 12, bottom: 12, width: 140, height: 90 }}
          nodeColor={(n) => {
            const kind = (n.data as { kind: NodeKind }).kind
            if (kind === 'pr') return 'rgba(255,45,120,0.6)'
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
