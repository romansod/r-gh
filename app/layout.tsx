import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'r-gh — GitHub CLI Visual Planner',
  description: 'Visual planning for GitHub issues, sub-issues, PRs, and projects. Generates gh CLI commands.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, height: '100vh', overflow: 'hidden', background: 'var(--br-bg)' }}>
        {children}
      </body>
    </html>
  )
}
