import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Card } from '../components/ui'
import { GLOSSARY } from '../knowledge/glossary'
import { topicById } from '../knowledge/guide'

// The glossary (step 9.2, decision 6): the Tagalog and trade terms in alphabetical order,
// each with the topic that explains the thing. Layout only.
export default function GlossaryPage() {
  const entries = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }))
  return (
    <>
      <PageHeader title="Glossary" subtitle={`${GLOSSARY.length} Tagalog and trade terms used at the counter and in the Guide`} />
      <div className="mx-4 mb-3 text-sm">
        <Link to="/guide" className="font-semibold text-brand-700">
          All topics
        </Link>
      </div>
      <Card>
        {entries.map((g) => {
          const topic = g.topic ? topicById(g.topic) : undefined
          return (
            <div key={g.term} className="border-b border-slate-100 py-2 last:border-0">
              <span className="font-semibold">{g.term}</span> <span className="text-slate-600">{g.meaning}</span>
              {topic && (
                <div className="mt-0.5 text-xs">
                  <Link to={`/guide/${topic.id}`} className="font-semibold text-brand-700">
                    {topic.title}
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </>
  )
}
