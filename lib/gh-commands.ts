import type { PlannerNode, PlannerEdge, RepoConfig } from './types'

export interface GeneratedCommand {
  id: string
  comment: string
  command: string
  nodeId?: string
}

// ── Shell variable naming ─────────────────────────────────────────────────────
// e.g. "issue-1" → "ISSUE_1_NUM", "pr-3" → "PR_3_NUM"
function toVarName(id: string): string {
  return id.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase() + '_NUM'
}
function varRef(id: string): string {
  return `$${toVarName(id)}`
}

// ── Main entry ────────────────────────────────────────────────────────────────
export function generateCommands(
  nodes: PlannerNode[],
  edges: PlannerEdge[],
  config: RepoConfig
): GeneratedCommand[] {
  const { owner, repo } = config
  const repoSlug = owner && repo ? `${owner}/${repo}` : '<owner>/<repo>'
  const repoFlag = `--repo ${repoSlug}`

  const commands: GeneratedCommand[] = []

  // ── Build relationship maps from canvas edges ─────────────────────────────
  // closesTargets[prId]  → issue/subissue ids this PR closes (from edges)
  const closesTargets  = new Map<string, string[]>()
  // blockedBySources[id] → ids that block this node
  const blockedBySources = new Map<string, string[]>()
  // dependsOnTargets[id] → ids this node depends on
  const dependsOnTargets = new Map<string, string[]>()
  // projectItems[projectId] → item ids linked to this project
  const projectItems   = new Map<string, string[]>()

  const projectIds = new Set(nodes.filter((n) => n.kind === 'project').map((n) => n.id))

  for (const e of edges) {
    if (e.edgeKind === 'closes') {
      const list = closesTargets.get(e.source) ?? []
      list.push(e.target)
      closesTargets.set(e.source, list)
    }
    if (e.edgeKind === 'blocks') {
      const list = blockedBySources.get(e.target) ?? []
      list.push(e.source)
      blockedBySources.set(e.target, list)
    }
    if (e.edgeKind === 'depends-on') {
      const list = dependsOnTargets.get(e.source) ?? []
      list.push(e.target)
      dependsOnTargets.set(e.source, list)
    }
    // Project edges (either direction)
    if (projectIds.has(e.source) && !projectIds.has(e.target)) {
      const list = projectItems.get(e.source) ?? []
      list.push(e.target)
      projectItems.set(e.source, list)
    }
    if (projectIds.has(e.target) && !projectIds.has(e.source)) {
      const list = projectItems.get(e.target) ?? []
      list.push(e.source)
      projectItems.set(e.target, list)
    }
  }

  // If projects exist but NO project edges were drawn, attach all items to all projects
  for (const proj of nodes.filter((n) => n.kind === 'project')) {
    if (!projectItems.has(proj.id)) {
      const allItems = nodes.filter((n) => n.kind !== 'project').map((n) => n.id)
      if (allItems.length) projectItems.set(proj.id, allItems)
    }
  }

  // ── Determine which nodes need their number captured as a shell var ────────
  // A node needs capture when something else references its number.
  const needsCapture = new Set<string>()

  // Project nodes always capture (needed for item-add)
  for (const id of projectIds) needsCapture.add(id)

  // Any node that is added to a project needs capture (used in --url)
  for (const [, items] of projectItems) {
    for (const id of items) needsCapture.add(id)
  }

  // Sub-issue parents (only capture if parent is an issue/subissue — not a PR)
  const nodeKindById = new Map(nodes.map((n) => [n.id, n.kind]))
  for (const n of nodes) {
    if (n.kind === 'subissue' && n.parentId) {
      const pk = nodeKindById.get(n.parentId)
      if (pk === 'issue' || pk === 'subissue') needsCapture.add(n.parentId)
    }
  }

  // Sub-issues themselves (needed for the link command)
  for (const n of nodes) {
    if (n.kind === 'subissue') needsCapture.add(n.id)
  }

  // Closes targets (from edges + node properties)
  for (const [, targets] of closesTargets) {
    for (const t of targets) needsCapture.add(t)
  }
  for (const n of nodes) {
    for (const id of n.linkedIssueIds ?? []) needsCapture.add(id)
  }

  // Blocked-by and depends-on sources/targets
  for (const [, sources] of blockedBySources) {
    for (const s of sources) needsCapture.add(s)
  }
  for (const [, targets] of dependsOnTargets) {
    for (const t of targets) needsCapture.add(t)
  }

  // ── 1. Projects ───────────────────────────────────────────────────────────
  for (const p of nodes.filter((n) => n.kind === 'project')) {
    commands.push({
      id: `cmd-${p.id}-create`,
      nodeId: p.id,
      comment: `Create project: ${p.title}`,
      command: buildProjectCommand(p, owner, needsCapture.has(p.id)),
    })
  }

  // ── 2. Root issues ────────────────────────────────────────────────────────
  for (const issue of nodes.filter((n) => n.kind === 'issue')) {
    commands.push({
      id: `cmd-${issue.id}-create`,
      nodeId: issue.id,
      comment: `Create issue: ${issue.title}`,
      command: buildIssueCommand(
        issue, repoFlag,
        /* parentRef */ undefined,
        /* blockedBy */ (blockedBySources.get(issue.id) ?? []).map(varRef),
        /* dependsOn */ (dependsOnTargets.get(issue.id) ?? []).map(varRef),
        needsCapture.has(issue.id),
      ),
    })
  }

  // ── 3. Sub-issues ─────────────────────────────────────────────────────────
  for (const sub of nodes.filter((n) => n.kind === 'subissue')) {
    const parentKind = sub.parentId ? nodeKindById.get(sub.parentId) : undefined
    const parentRef = (parentKind === 'issue' || parentKind === 'subissue')
      ? varRef(sub.parentId!)
      : undefined
    commands.push({
      id: `cmd-${sub.id}-create`,
      nodeId: sub.id,
      comment: `Create sub-issue: ${sub.title}`,
      command: buildIssueCommand(
        sub, repoFlag,
        parentRef,
        (blockedBySources.get(sub.id) ?? []).map(varRef),
        (dependsOnTargets.get(sub.id) ?? []).map(varRef),
        needsCapture.has(sub.id),
      ),
    })

    // Sub-issue link: only valid when parent is an issue/subissue, not a PR.
    // parentKind is already computed above — reuse it rather than re-looking up.
    if (sub.parentId && (parentKind === 'issue' || parentKind === 'subissue')) {
      const pRef = varRef(sub.parentId)
      const cRef = varRef(sub.id)
      commands.push({
        id: `cmd-${sub.id}-link`,
        nodeId: sub.id,
        comment: `Link "${sub.title}" as sub-issue of parent`,
        command: [
          `gh api repos/${repoSlug}/issues/${pRef}/sub_issues`,
          `--method POST`,
          `--field sub_issue_id=${cRef}`,
        ].join(' \\\n  '),
      })
    }
  }

  // ── 4. Pull Requests (topologically sorted so deps are created first) ───────
  for (const pr of topologicalSortPRs(nodes.filter((n) => n.kind === 'pr'), blockedBySources, dependsOnTargets)) {
    // Merge closes from node properties + canvas edges, deduplicated
    const closesAll = [
      ...(pr.linkedIssueIds ?? []),
      ...(closesTargets.get(pr.id) ?? []),
    ]
    const uniqueCloses = [...new Set(closesAll)].map(varRef)

    commands.push({
      id: `cmd-${pr.id}-create`,
      nodeId: pr.id,
      comment: `Create PR: ${pr.title}`,
      command: buildPRCommand(
        pr, repoFlag,
        uniqueCloses,
        (blockedBySources.get(pr.id) ?? []).map(varRef),
        (dependsOnTargets.get(pr.id) ?? []).map(varRef),
        needsCapture.has(pr.id),
      ),
    })
  }

  // ── 5. Add items to projects ──────────────────────────────────────────────
  for (const [projId, itemIds] of projectItems) {
    const proj = nodes.find((n) => n.id === projId)
    if (!proj) continue
    const projRef = varRef(projId)

    for (const itemId of itemIds) {
      const item = nodes.find((n) => n.id === itemId)
      if (!item) continue
      const urlPath = item.kind === 'pr' ? 'pull' : 'issues'
      const itemRef = varRef(itemId)

      commands.push({
        id: `cmd-${projId}-add-${itemId}`,
        comment: `Add "${item.title}" to project "${proj.title}"`,
        command: [
          `gh project item-add ${projRef}`,
          `--owner ${owner || '<owner>'}`,
          `--url https://github.com/${repoSlug}/${urlPath}/${itemRef}`,
        ].join(' \\\n  '),
      })
    }
  }

  return commands
}

// ── Topological sort for PRs ──────────────────────────────────────────────────
// PRs that are depended-on or blocking others must be created first so their
// shell variable ($PR_X_NUM) is assigned before it appears in another PR's body.
function topologicalSortPRs(
  prs: PlannerNode[],
  blockedBySources: Map<string, string[]>,
  dependsOnTargets: Map<string, string[]>,
): PlannerNode[] {
  if (prs.length === 0) return prs
  const prIds = new Set(prs.map((p) => p.id))
  const prById = new Map(prs.map((p) => [p.id, p]))

  // prereqs[id] = PR ids that must be created BEFORE id
  const prereqs = new Map<string, Set<string>>()
  for (const pr of prs) prereqs.set(pr.id, new Set())

  for (const pr of prs) {
    // A blocks pr  →  A must come before pr (pr's body has $A_NUM)
    for (const src of blockedBySources.get(pr.id) ?? []) {
      if (prIds.has(src)) prereqs.get(pr.id)!.add(src)
    }
    // pr depends-on tgt  →  tgt must come before pr (pr's body has $tgt_NUM)
    for (const tgt of dependsOnTargets.get(pr.id) ?? []) {
      if (prIds.has(tgt)) prereqs.get(pr.id)!.add(tgt)
    }
  }

  // Build successor list for Kahn's algorithm
  const successors = new Map<string, string[]>()
  for (const pr of prs) successors.set(pr.id, [])
  for (const pr of prs) {
    for (const pre of prereqs.get(pr.id)!) {
      successors.get(pre)!.push(pr.id)
    }
  }

  const inDegree = new Map(prs.map((p) => [p.id, prereqs.get(p.id)!.size]))
  const queue = prs.filter((p) => inDegree.get(p.id) === 0)
  const result: PlannerNode[] = []

  while (queue.length > 0) {
    const cur = queue.shift()!
    result.push(cur)
    for (const next of successors.get(cur.id)!) {
      const deg = inDegree.get(next)! - 1
      inDegree.set(next, deg)
      if (deg === 0) queue.push(prById.get(next)!)
    }
  }

  // Append any remaining nodes (only if there's a cycle — shouldn't happen in practice,
  // but a user can construct PR A blocks PR B blocks PR A on the canvas).
  // The script will still be emitted but $VAR references may be undefined at runtime.
  const resultIds = new Set(result.map((p) => p.id))
  for (const pr of prs) {
    if (!resultIds.has(pr.id)) {
      console.warn(`[topologicalSortPRs] cycle detected; appending ${pr.id} without ordering guarantee`)
      result.push(pr)
    }
  }

  return result
}

// ── Command builders ──────────────────────────────────────────────────────────

function buildProjectCommand(
  node: PlannerNode,
  owner: string,
  capture: boolean,
): string {
  const parts = [
    `gh project create`,
    `--owner ${owner || '<owner>'}`,
    `--title ${q(node.title)}`,
  ]
  if (node.body) parts.push(`--description ${q(node.body)}`)
  if (capture) parts.push(`--format json`)

  const cmd = parts.join(' \\\n  ')
  if (capture) {
    return `${toVarName(node.id)}=$(${cmd} | jq '.number')\necho "Project #$${toVarName(node.id)}: ${node.title}"`
  }
  return cmd
}

function buildIssueCommand(
  node: PlannerNode,
  repoFlag: string,
  parentRef: string | undefined,
  blockedByRefs: string[],
  dependsOnRefs: string[],
  capture: boolean,
): string {
  const bodyLines: string[] = []
  if (node.body) bodyLines.push(node.body)
  if (blockedByRefs.length) bodyLines.push('\n**Blocked by:** ' + blockedByRefs.join(', '))
  if (dependsOnRefs.length) bodyLines.push('**Depends on:** ' + dependsOnRefs.join(', '))

  const parts = [`gh issue create`, repoFlag]
  parts.push(`--title ${q(node.title)}`)
  if (bodyLines.length) parts.push(`--body ${qWithVars(bodyLines.join('\n').trim())}`)
  if (node.labels?.length) {
    for (const l of node.labels) parts.push(`--label ${q(l.trim())}`)
  }
  if (node.assignees?.length) {
    for (const a of node.assignees) parts.push(`--assignee ${q(a.trim())}`)
  }
  if (node.milestone) parts.push(`--milestone ${q(node.milestone)}`)
  if (capture) parts.push(`--json number --jq '.number'`)

  const cmd = parts.filter(Boolean).join(' \\\n  ')

  const lines: string[] = []
  if (capture) {
    lines.push(`${toVarName(node.id)}=$(${cmd})`)
    lines.push(`echo "Issue #$${toVarName(node.id)}: ${node.title}"`)
    if (parentRef) {
      lines.push(`# Note: sub-issue will be linked to parent ${parentRef} in the next command`)
    }
  } else {
    lines.push(cmd)
  }
  return lines.join('\n')
}

function buildPRCommand(
  node: PlannerNode,
  repoFlag: string,
  closesRefs: string[],
  blockedByRefs: string[],
  dependsOnRefs: string[],
  capture: boolean,
): string {
  const bodyLines: string[] = []
  if (node.body) bodyLines.push(node.body)
  if (closesRefs.length) {
    bodyLines.push('\n' + closesRefs.map((r) => `Closes #${r}`).join('\n'))
  }
  if (blockedByRefs.length) bodyLines.push('\n**Blocked by:** ' + blockedByRefs.join(', '))
  if (dependsOnRefs.length) bodyLines.push('**Depends on:** ' + dependsOnRefs.join(', '))

  const parts = [`gh pr create`, repoFlag]
  parts.push(`--title ${q(node.title)}`)
  if (bodyLines.length) parts.push(`--body ${qWithVars(bodyLines.join('\n').trim())}`)
  parts.push(`--base ${node.baseBranch || 'main'}`)
  if (node.headBranch) parts.push(`--head ${node.headBranch}`)
  if (node.draft) parts.push('--draft')
  if (node.assignees?.length) {
    for (const a of node.assignees) parts.push(`--assignee ${q(a.trim())}`)
  }
  if (capture) parts.push(`--json number --jq '.number'`)

  const cmd = parts.filter(Boolean).join(' \\\n  ')

  if (capture) {
    return [
      `${toVarName(node.id)}=$(${cmd})`,
      `echo "PR #$${toVarName(node.id)}: ${node.title}"`,
    ].join('\n')
  }
  return cmd
}

/** Shell-safe single-quote wrapping (for strings with no variable references) */
function q(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`
}

/**
 * Shell-safe quoting that preserves $VARNAME expansion.
 * Uses adjacent-string technique: 'literal '$VAR' more'
 * so variable references expand while literal text is safely quoted.
 */
function qWithVars(s: string): string {
  // Split on shell variable patterns ($UPPER_SNAKE_CASE)
  const parts = s.split(/(\$[A-Z][A-Z0-9_]*)/g)
  if (parts.length === 1) return q(s)
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part // variable reference — leave bare
      if (!part) return ''
      return `'${part.replace(/'/g, "'\\''")}'` // literal — single-quote it
    })
    .filter(Boolean)
    .join('')
}
