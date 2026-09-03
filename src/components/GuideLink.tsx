import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

// The one way a screen links into the Guide (P9 design decision 3): a topic id, from
// src/knowledge/guideLinks.ts or a literal that guideLinks.test.ts checks. Renders as a
// small brand-coloured link so it reads as help beside the figure it explains.
export default function GuideLink({ topic, children = 'Guide', className = '' }: { topic: string; children?: ReactNode; className?: string }) {
  return (
    <Link to={`/guide/${topic}`} className={`whitespace-nowrap text-xs font-semibold text-brand-700 ${className}`}>
      {children}
    </Link>
  )
}
