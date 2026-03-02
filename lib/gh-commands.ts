import type { PlannerNode, PlannerEdge, RepoConfig } from './types'

export interface GeneratedCommand {
  id: string
  comment: string
  command: string
  nodeId?: string
}

export function generateCommands(
  nodes: PlannerNode[],
  _edges: PlannerEdge[],
  config: RepoConfig
): GeneratedCommand[] {
  const { owner, repo } = config
  const repoFlag = owner && repo ? `--repo ${owner}/${repo}` : ''

  const commands: GeneratedCommand[] = []

  // ── 1. Projects ──────────────────────────────────────────
  const projects = nodes.filter((n) => n.kind === 'project')
  for (const p of projects) {
    commands.push({
      id: `cmd-${p.id}-create`,
      nodeId: p.id,
      comment: `Create project: ${p.title}`,
      command: [
        `gh project create`,
        `--owner ${owner || '<owner>'}`,
        `--title ${q(p.title)}`,
        p.body ? `--description ${q(p.body)}` : '',
      ].filter(Boolean).join(' \\\n  '),
    })
  }

  // ── 2. Root issues (no parent) ───────────────────────────
  const rootIssues = nodes.filter((n) => n.kind === 'issue')
  for (const issue of rootIssues) {
    commands.push({
      id: `cmd-${issue.id}-create`,
      nodeId: issue.id,
      comment: `Create issue: ${issue.title}`,
      command: buildIssueCommand(issue, repoFlag),
    })
  }

  // ── 3. Sub-issues ────────────────────────────────────────
  const subIssues = nodes.filter((n) => n.kind === 'subissue')
  for (const sub of subIssues) {
    const parentTitle = sub.parentId
      ? nodes.find((n) => n.id === sub.parentId)?.title
      : undefined
    commands.push({
      id: `cmd-${sub.id}-create`,
      nodeId: sub.id,
      comment: `Create sub-issue: ${sub.title}${parentTitle ? ` (under "${parentTitle}")` : ''}`,
      command: buildIssueCommand(sub, repoFlag, parentTitle),
    })
  }

  // ── 4. PRs ───────────────────────────────────────────────
  const prs = nodes.filter((n) => n.kind === 'pr')
  for (const pr of prs) {
    commands.push({
      id: `cmd-${pr.id}-create`,
      nodeId: pr.id,
      comment: `Create PR: ${pr.title}`,
      command: buildPRCommand(pr, repoFlag),
    })
  }

  // ── 5. Notes ─────────────────────────────────────────────
  const hasSubIssues = subIssues.length > 0
  const hasPRlinks = prs.some((p) => p.linkedIssueIds && p.linkedIssueIds.length > 0)

  if (hasSubIssues || hasPRlinks) {
    commands.push({
      id: 'cmd-note-sequential',
      comment:
        'NOTE: Sub-issue --parent flags and PR --body "Closes #N" references require\n' +
        '      real issue numbers assigned by GitHub. Run root issues first, note\n' +
        '      the returned issue numbers, then substitute them in the commands below.',
      command: '',
    })
  }

  return commands
}

function buildIssueCommand(
  node: PlannerNode,
  repoFlag: string,
  parentTitle?: string
): string {
  const parts = ['gh issue create', repoFlag]
  parts.push(`--title ${q(node.title)}`)
  if (node.body) parts.push(`--body ${q(node.body)}`)
  if (node.labels?.length) {
    for (const l of node.labels) parts.push(`--label ${q(l.trim())}`)
  }
  if (node.assignees?.length) {
    for (const a of node.assignees) parts.push(`--assignee ${q(a.trim())}`)
  }
  if (node.milestone) parts.push(`--milestone ${q(node.milestone)}`)
  if (node.kind === 'subissue') {
    parts.push(`--parent <issue-number>${parentTitle ? ` # parent: "${parentTitle}"` : ''}`)
  }
  return parts.filter(Boolean).join(' \\\n  ')
}

function buildPRCommand(node: PlannerNode, repoFlag: string): string {
  const parts = ['gh pr create', repoFlag]
  parts.push(`--title ${q(node.title)}`)
  const bodyLines: string[] = []
  if (node.body) bodyLines.push(node.body)
  if (node.linkedIssueIds?.length) {
    bodyLines.push('')
    bodyLines.push('Closes: ' + node.linkedIssueIds.map((id) => `#<issue-number: ${id}>`).join(', '))
  }
  if (bodyLines.length) parts.push(`--body ${q(bodyLines.join('\n'))}`)
  parts.push(`--base ${node.baseBranch || 'main'}`)
  if (node.headBranch) parts.push(`--head ${node.headBranch}`)
  if (node.draft) parts.push('--draft')
  return parts.filter(Boolean).join(' \\\n  ')
}

/** Shell-safe quoting: wrap in single quotes, escape internal single quotes */
function q(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`
}
