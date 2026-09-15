import { useApp } from '../hooks/useApp'
import type { TaskStatus } from '../types'

const STATS: { key: TaskStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Toplam' },
  { key: 'open', label: 'Bekleyen' },
  { key: 'started', label: 'Başladı' },
  { key: 'in_progress', label: 'Devam' },
  { key: 'completed', label: 'Bitti' },
  { key: 'blocked', label: 'Engel' },
]

export function StatsBar({
  filter,
  onFilter,
}: {
  filter: TaskStatus | 'all'
  onFilter: (f: TaskStatus | 'all') => void
}) {
  const { tasks } = useApp()

  const counts = {
    all: tasks.length,
    open: tasks.filter((t) => t.status === 'open').length,
    started: tasks.filter((t) => t.status === 'started').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
  }

  const doneRate =
    counts.all === 0 ? 0 : Math.round((counts.completed / counts.all) * 100)

  return (
    <section className="stats">
      <div className="stats-head">
        <div>
          <p className="eyebrow">Özet</p>
          <h2>%{doneRate} tamamlandı</h2>
        </div>
        <div className="progress-ring" style={{ ['--p' as string]: `${doneRate}%` }}>
          <span>{counts.completed}/{counts.all}</span>
        </div>
      </div>
      <div className="stat-chips">
        {STATS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`stat-chip tone-${s.key} ${filter === s.key ? 'active' : ''}`}
            onClick={() => onFilter(s.key)}
          >
            <strong>{counts[s.key]}</strong>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
