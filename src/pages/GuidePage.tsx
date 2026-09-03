import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Badge, Card, Empty, inputCls, ListItem } from '../components/ui'
import { GLOSSARY } from '../knowledge/glossary'
import { GUIDE_SECTIONS, GUIDE_TOPICS, topicsBySection, type GuideSection } from '../knowledge/guide'
import { searchGuide } from '../knowledge/guideSearch'

// The Guide index (step 9.2): the search box over every topic and the glossary, and below it
// the sections with their topics. Layout only; the ranking is in src/knowledge/guideSearch.ts.
export const SECTION_TITLE: Record<GuideSection, string> = Object.fromEntries(GUIDE_SECTIONS.map((s) => [s.id, s.title])) as Record<GuideSection, string>

export default function GuidePage() {
  const [query, setQuery] = useState('')
  const result = useMemo(() => searchGuide(query), [query])
  const searching = query.trim().length > 0

  return (
    <>
      <PageHeader
        title="Guide"
        subtitle={`${GUIDE_TOPICS.length} topics and ${GLOSSARY.length} glossary terms compiled from the research, each with its sources`}
      />
      <div className="mx-4 mb-4">
        <input
          type="search"
          className={inputCls}
          placeholder="Search the Guide: a product, a term, a rule, a question"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search the Guide"
        />
      </div>
      {searching ? (
        <>
          <Card title={`Topics (${result.topics.length})`}>
            {result.topics.length === 0 && <Empty>No topic matches every word of the search.</Empty>}
            {result.topics.map((h) => (
              <ListItem
                key={h.topic.id}
                to={`/guide/${h.topic.id}`}
                title={h.topic.title}
                subtitle={h.snippet}
                right={<Badge>{SECTION_TITLE[h.topic.section]}</Badge>}
              />
            ))}
          </Card>
          {result.terms.length > 0 && (
            <Card title={`Glossary (${result.terms.length})`}>
              {result.terms.map((g) => (
                <div key={g.term} className="border-b border-slate-100 py-2 last:border-0">
                  <span className="font-semibold">{g.term}</span> <span className="text-slate-600">{g.meaning}</span>{' '}
                  {g.topic && (
                    <Link to={`/guide/${g.topic}`} className="font-semibold text-brand-700">
                      Read more
                    </Link>
                  )}
                </div>
              ))}
            </Card>
          )}
        </>
      ) : (
        <>
          <Card title="Glossary" action={<Badge>{GLOSSARY.length} terms</Badge>}>
            <p className="mb-2 text-slate-600">The Tagalog and trade terms used at the counter and in this Guide, each linked to the topic that explains it.</p>
            <Link to="/guide/glossary" className="font-semibold text-brand-700">
              Open the glossary
            </Link>
          </Card>
          {GUIDE_SECTIONS.map((s) => {
            const topics = topicsBySection(s.id)
            return (
              <Card key={s.id} title={s.title} action={<Badge>{topics.length}</Badge>}>
                <p className="mb-2 text-slate-600">{s.blurb}</p>
                {topics.map((t) => (
                  <ListItem key={t.id} to={`/guide/${t.id}`} title={t.title} subtitle={t.summary} />
                ))}
              </Card>
            )
          })}
        </>
      )}
    </>
  )
}
