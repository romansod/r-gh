'use client'

import dynamic from 'next/dynamic'
import { Header } from '@/components/layout/Header'
import { PropertiesPanel } from '@/components/panels/PropertiesPanel'

// React Flow must be client-side only (uses browser APIs)
const PlannerCanvas = dynamic(
  () => import('@/components/canvas/PlannerCanvas').then((m) => ({ default: m.PlannerCanvas })),
  { ssr: false }
)

export default function Home() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--br-bg)',
    }}>
      <Header />
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <PlannerCanvas />
        </div>
        <PropertiesPanel />
      </div>
    </div>
  )
}
