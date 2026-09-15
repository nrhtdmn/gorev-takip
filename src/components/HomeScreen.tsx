import { useMemo, useState } from 'react'
import { useApp } from '../hooks/useApp'
import type { Task, TaskStatus } from '../types'
import { NewTaskForm } from './NewTaskForm'
import { StatsBar } from './StatsBar'
import { TaskCard } from './TaskCard'
import { TaskDetail } from './TaskDetail'

export function HomeScreen() {
  const {
    session,
    tasks,
    profiles,
    groups,
    loading,
    demoMode,
    switchProfile,
    leaveGroup,
    logout,
  } = useApp()
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all')
  const [selected, setSelected] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)

  const currentGroup = groups.find((g) => g.id === session?.groupId)

  const groupMembers = useMemo(() => {
    if (!currentGroup) return []
    return currentGroup.memberIds
      .map((id) => profiles.find((p) => p.id === id))
      .filter(Boolean)
  }, [currentGroup, profiles])

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks
    return tasks.filter((t) => t.status === filter)
  }, [tasks, filter])

  const liveSelected = selected
    ? tasks.find((t) => t.id === selected.id) || selected
    : null

  if (!session?.groupId) return null

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block brand-lockup">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="brand-logo sm" />
          <div>
            <button type="button" className="eyebrow linkish" onClick={leaveGroup}>
              ← Gruplar · {session.groupName || 'Grup'}
            </button>
            <h1>Merhaba, {session.memberName}</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <div
            className="avatar"
            style={{ background: session.memberColor }}
            title={session.memberName}
          >
            {session.memberName.slice(0, 1).toUpperCase()}
          </div>
          <button type="button" className="btn ghost compact" onClick={switchProfile}>
            Profil
          </button>
          <button type="button" className="btn ghost compact" onClick={logout}>
            Çıkış
          </button>
        </div>
      </header>

      {demoMode && (
        <div className="banner banner-info sticky-banner">
          Demo modu — aynı telefonda kalır. Firebase bağlayınca herkes gerçek zamanlı görür.
        </div>
      )}

      <StatsBar filter={filter} onFilter={setFilter} />

      <section className="members-row">
        <p className="eyebrow">Bu gruptakiler</p>
        <div className="member-list">
          {groupMembers.map((m) =>
            m ? (
              <div key={m.id} className="member-pill">
                <span className="dot" style={{ background: m.color }} />
                {m.name}
              </div>
            ) : null,
          )}
        </div>
      </section>

      <section className="task-list">
        <div className="section-head">
          <h2>Görevler</h2>
          <button type="button" className="btn primary compact" onClick={() => setCreating(true)}>
            + Yeni
          </button>
        </div>

        {loading && <p className="muted">Yükleniyor…</p>}
        {!loading && filtered.length === 0 && (
          <div className="empty">
            <h3>Henüz görev yok</h3>
            <p>İlk görevi ekleyin — örneğin “Çamaşırlar katlanacak”.</p>
          </div>
        )}

        <div className="cards">
          {filtered.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={() => setSelected(task)} />
          ))}
        </div>
      </section>

      <button type="button" className="fab" onClick={() => setCreating(true)} aria-label="Yeni görev">
        +
      </button>

      {creating && <NewTaskForm onClose={() => setCreating(false)} />}
      {liveSelected && (
        <TaskDetail
          task={liveSelected}
          onClose={() => setSelected(null)}
          onDeleted={() => setSelected(null)}
        />
      )}
    </div>
  )
}
