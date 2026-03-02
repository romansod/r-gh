'use client'

import { useState } from 'react'
import { Terminal, GitBranch, Zap } from 'lucide-react'
import { usePlannerStore } from '@/lib/store'
import { CommandModal } from '../panels/CommandModal'
import { Toolbar } from '../canvas/Toolbar'

export function Header() {
  const repoConfig = usePlannerStore((s) => s.repoConfig)
  const setRepoConfig = usePlannerStore((s) => s.setRepoConfig)
  const nodes = usePlannerStore((s) => s.nodes)
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <header style={{
        height: 52,
        background: 'var(--br-surface)',
        borderBottom: '1px solid var(--br-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        flexShrink: 0,
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '0 18px',
          borderRight: '1px solid var(--br-border)',
          height: '100%',
          flexShrink: 0,
        }}>
          <GitBranch size={16} style={{ color: 'var(--br-cyan)' }} />
          <span style={{
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--br-text)',
          }}>
            r<span style={{ color: 'var(--br-cyan)' }}>-gh</span>
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--br-muted)',
            paddingLeft: 4,
            borderLeft: '1px solid var(--br-border)',
            marginLeft: 4,
            paddingRight: 2,
          }}>
            planner
          </span>
        </div>

        {/* Repo config */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 14px',
          borderRight: '1px solid var(--br-border)',
          height: '100%',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: 'var(--br-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Repo
          </span>
          <input
            className="br-input"
            style={{ width: 120, fontSize: 12, padding: '4px 8px' }}
            value={repoConfig.owner}
            onChange={(e) => setRepoConfig({ owner: e.target.value })}
            placeholder="owner"
          />
          <span style={{ color: 'var(--br-muted)', fontSize: 13 }}>/</span>
          <input
            className="br-input"
            style={{ width: 140, fontSize: 12, padding: '4px 8px' }}
            value={repoConfig.repo}
            onChange={(e) => setRepoConfig({ repo: e.target.value })}
            placeholder="repository"
          />
        </div>

        {/* Toolbar (node type buttons) */}
        <div style={{ flex: 1, height: '100%', borderRight: '1px solid var(--br-border)' }}>
          <Toolbar />
        </div>

        {/* Node count badge */}
        <div style={{
          padding: '0 14px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRight: '1px solid var(--br-border)',
          flexShrink: 0,
        }}>
          {nodes.length > 0 && (
            <span style={{
              background: 'rgba(0,212,255,0.1)',
              color: 'var(--br-cyan)',
              border: '1px solid var(--br-border)',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
            }}>
              {nodes.length} node{nodes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Generate button */}
        <div style={{ padding: '0 14px', flexShrink: 0 }}>
          <button
            className="br-btn br-btn-amber"
            style={{ fontWeight: 700, fontSize: 13, padding: '7px 16px' }}
            onClick={() => setShowModal(true)}
            disabled={nodes.length === 0}
          >
            <Zap size={13} />
            Generate Commands
          </button>
        </div>
      </header>

      {showModal && <CommandModal onClose={() => setShowModal(false)} />}
    </>
  )
}
