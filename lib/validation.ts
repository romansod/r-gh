import type { PlannerNode } from './types'

export function getValidationErrors(nodes: PlannerNode[]): string[] {
  const errors: string[] = []
  for (const n of nodes) {
    if (!n.title.trim()) errors.push(`${n.kind} ${n.id} is missing a title`)
    if (n.kind === 'pr' && !n.headBranch?.trim()) {
      errors.push(`PR "${n.title || n.id}" is missing a head branch (required for --head)`)
    }
  }
  return errors
}
