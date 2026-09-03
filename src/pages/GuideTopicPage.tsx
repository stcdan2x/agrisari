import { Link, Navigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Badge, Card, ListItem } from '../components/ui'
import { SOURCE_DOCS } from '../knowledge/cite'
import { GLOSSARY } from '../knowledge/glossary'
import { relatedTopics, topicById } from '../knowledge/guide'
import { SECTION_TITLE } from './GuidePage'

// One Guide topic (step 9.2): its paragraphs, its sources in words, the glossary terms that
// point at it and the related topics. Layout only.
const LABEL = /^([A-Z][A-Za-z ,'()-]{1,40}?)\. (.+)$/s

function Paragraph({ text }: { text: string }) {
  const m = text.match(LABEL)
  if (!m) return <p className="mb-3 leading-relaxed text-slate-700">{text}</p>
  return (
    <p className="mb-3 leading-relaxed text-slate-700">
      <span className="font-semibold text-slate-900">{m[1]}.</span> {m[2]}
    </p>
  )
}

// A source in words: a parameter row, a numbered section or a quoted heading of a research document.
export function sourceLabel(source: string): string {
  const row = source.match(/^([A-Z]{2})-(\d+)$/)
  if (row) return `${source}, ${SOURCE_DOCS[row[1]]} (research/parameters.md)`
  const section = source.match(/^([A-Z]{2}):(.+)$/)
  if (!section) return source
  const doc = SOURCE_DOCS[section[1]] ?? section[1]
  return /^\d/.test(section[2]) ? `${doc}, section ${section[2]}` : `${doc}, "${section[2]}"`
}

export default function GuideTopicPage() {
  const { topic: id = '' } = useParams()
  const topic = topicById(id)
  if (!topic) return <Navigate to="/guide" replace />
  const related = relatedTopics(topic)
  const terms = GLOSSARY.filter((g) => g.topic === topic.id)

  return (
    <>
      <PageHeader title={topic.title} subtitle={topic.summary} />
      <div className="mx-4 mb-3 flex items-center gap-2 text-sm">
        <Link to="/guide" className="font-semibold text-brand-700">
          All topics
        </Link>
        <Badge>{SECTION_TITLE[topic.section]}</Badge>
      </div>
      <Card>
        {topic.paragraphs.map((p, i) => (
          <Paragraph key={i} text={p} />
        ))}
      </Card>
      <Card title="Sources">
        <ul className="list-disc space-y-1 pl-5 text-slate-600">
          {topic.sources.map((s) => (
            <li key={s}>{sourceLabel(s)}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          The research documents stay with the owner; the row ids and sections name where each figure came from and when it was observed.
        </p>
      </Card>
      {terms.length > 0 && (
        <Card title="Glossary">
          {terms.map((g) => (
            <div key={g.term} className="border-b border-slate-100 py-2 last:border-0">
              <span className="font-semibold">{g.term}</span> <span className="text-slate-600">{g.meaning}</span>
            </div>
          ))}
        </Card>
      )}
      {related.length > 0 && (
        <Card title="Related topics">
          {related.map((t) => (
            <ListItem key={t.id} to={`/guide/${t.id}`} title={t.title} subtitle={t.summary} right={<Badge>{SECTION_TITLE[t.section]}</Badge>} />
          ))}
        </Card>
      )}
    </>
  )
}
