import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../hooks/useApp'
import {
  addTaskNote,
  deleteTask,
  subscribeUpdates,
  updateTaskStatus,
} from '../lib/api'
import {
  demoAddNote,
  demoDeleteTask,
  demoGetUpdates,
  demoUpdateStatus,
} from '../lib/demoStore'
import { formatWhen } from '../lib/time'
import type { Task, TaskStatus, TaskUpdate } from '../types'
import { CATEGORY_META, STATUS_META } from '../types'

const ACTIONS: { status: TaskStatus; label: string }[] = [
  { status: 'started', label: 'İşe başladım' },
  { status: 'in_progress', label: 'Devam ediyor' },
  { status: 'completed', label: 'Tamamladım' },
  { status: 'blocked', label: 'Tamamlayamadım' },
  { status: 'open', label: 'Beklemeye al' },
]

export function TaskDetail({
  task,
  onClose,
  onDeleted,
}: {
  task: Task
  onClose: () => void
  onDeleted?: () => void
}) {
  const { session, demoMode, refreshLocal } = useApp()
  const [updates, setUpdates] = useState<TaskUpdate[]>([])
  const [note, setNote] = useState('')
  const [failReason, setFailReason] = useState('')
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const groupId = session?.groupId

  useEffect(() => {
    if (!groupId) return
    if (demoMode) {
      setUpdates(demoGetUpdates(task.id))
      return
    }
    return subscribeUpdates(groupId, task.id, setUpdates)
  }, [task.id, demoMode, task.updatedAt, groupId])

  if (!session || !groupId) return null

  const applyStatus = async (status: TaskStatus) => {
    if (status === 'blocked' && !failReason.trim()) {
      setPendingStatus('blocked')
      setError('Tamamlayamadım için kısa bir neden yazın')
      return
    }

    setBusy(true)
    setError('')
    try {
      if (demoMode) {
        demoUpdateStatus({
          groupId,
          taskId: task.id,
          status,
          member: session,
          note: note.trim() || undefined,
          failReason: failReason.trim() || undefined,
        })
        refreshLocal?.()
        setUpdates(demoGetUpdates(task.id))
      } else {
        await updateTaskStatus({
          groupId,
          taskId: task.id,
          status,
          member: session,
          note: note.trim() || undefined,
          failReason: failReason.trim() || undefined,
        })
      }
      setNote('')
      setFailReason('')
      setPendingStatus(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  const sendNote = async (e: FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    setBusy(true)
    setError('')
    try {
      if (demoMode) {
        demoAddNote({ groupId, taskId: task.id, member: session, message: note })
        refreshLocal?.()
        setUpdates(demoGetUpdates(task.id))
      } else {
        await addTaskNote({
          groupId,
          taskId: task.id,
          member: session,
          message: note,
        })
      }
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Not eklenemedi')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm('Bu görevi silmek istiyor musun?')) return
    setBusy(true)
    setError('')
    try {
      if (demoMode) {
        demoDeleteTask(task.id)
        refreshLocal?.()
      } else {
        await deleteTask(groupId, task.id)
      }
      onDeleted?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi')
    } finally {
      setBusy(false)
    }
  }

  const status = STATUS_META[task.status]

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className={`drawer tone-${status.tone}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="drawer-head">
          <div>
            <span className="tag">{CATEGORY_META[task.category].label}</span>
            <h2>{task.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </header>

        <div className={`status-banner tone-${status.tone}`}>
          <strong>{status.label}</strong>
          {task.assigneeName && <span>· {task.assigneeName}</span>}
        </div>

        {task.description && <p className="drawer-desc">{task.description}</p>}

        <dl className="meta-grid">
          <div>
            <dt>Yazan</dt>
            <dd>{task.createdByName}</dd>
          </div>
          <div>
            <dt>Kayıt</dt>
            <dd>{formatWhen(task.createdAt)}</dd>
          </div>
          <div>
            <dt>Son güncelleme</dt>
            <dd>{formatWhen(task.updatedAt)}</dd>
          </div>
          <div>
            <dt>Başlama</dt>
            <dd>{formatWhen(task.startedAt)}</dd>
          </div>
          <div>
            <dt>Tamamlanma</dt>
            <dd>{formatWhen(task.completedAt)}</dd>
          </div>
          {task.failReason && (
            <div className="span-2">
              <dt>Neden tamamlanamadı</dt>
              <dd>{task.failReason}</dd>
            </div>
          )}
        </dl>

        <section className="drawer-section">
          <h3>Durumu güncelle</h3>
          <div className="action-grid">
            {ACTIONS.map((a) => (
              <button
                key={a.status}
                type="button"
                className={`action-btn tone-${STATUS_META[a.status].tone} ${
                  task.status === a.status ? 'current' : ''
                }`}
                disabled={busy}
                onClick={() => applyStatus(a.status)}
              >
                {a.label}
              </button>
            ))}
          </div>

          {(pendingStatus === 'blocked' || task.status === 'blocked') && (
            <label className="block-reason">
              Neden
              <input
                value={failReason}
                onChange={(e) => setFailReason(e.target.value)}
                placeholder="Örn. Çamaşır ıslak"
              />
            </label>
          )}
        </section>

        <section className="drawer-section">
          <h3>Açıklama / not</h3>
          <form onSubmit={sendNote} className="note-form">
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Herkesin göreceği bir not yaz…"
            />
            <button type="submit" className="btn primary" disabled={busy || !note.trim()}>
              Not ekle
            </button>
          </form>
          {error && <p className="error">{error}</p>}
        </section>

        <section className="drawer-section">
          <h3>Aktivite</h3>
          <ul className="timeline">
            {updates.length === 0 && <li className="muted">Henüz güncelleme yok</li>}
            {[...updates].reverse().map((u) => (
              <li key={u.id}>
                <div className="timeline-dot" />
                <div>
                  <strong>{u.memberName}</strong>
                  <p>{u.message}</p>
                  <time>{formatWhen(u.createdAt)}</time>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="drawer-section">
          <button type="button" className="btn danger" disabled={busy} onClick={remove}>
            Görevi sil
          </button>
        </section>
      </aside>
    </div>
  )
}
