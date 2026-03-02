export type NodeKind = 'project' | 'issue' | 'subissue' | 'pr'

export type EdgeKind = 'parent-child' | 'blocks' | 'depends-on' | 'closes'

export interface PlannerNode {
  id: string
  kind: NodeKind
  title: string
  body?: string
  labels?: string[]
  assignees?: string[]
  milestone?: string
  // sub-issue only
  parentId?: string
  // pr only
  baseBranch?: string
  headBranch?: string
  draft?: boolean
  linkedIssueIds?: string[]
}

export interface PlannerEdge {
  id: string
  source: string
  target: string
  edgeKind: EdgeKind
}

export interface RepoConfig {
  owner: string
  repo: string
}
