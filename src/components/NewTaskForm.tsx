import { useState, type FormEvent } from 'react'
import { useApp } from '../hooks/useApp'
import { createTask } from '../lib/api'
import { demoCreateTask } from '../lib/demoStore'
import type { TaskCategory } from '../types'
import { CATEGORY_META } from '../types'

export function NewTaskForm({ onClose }: { onClose: () => void }) {
  const { session, demoMode, refreshLocal } = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TaskCategory>('ev')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!session) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Görev başlığı gerekli')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (demoMode) {
        demoCreateTask({ title, description, category, member: session })
        refreshLocal?.()
      } else {
        await createTask({ title, description, category, member: session })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header className="drawer-head">
          <div>
            <p className="eyebrow">Yeni görev</p>
            <h2>Ne yapılacak?</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            ✕
          </button>
        </header>

        <form onSubmit={submit} className="stack">
          <label>
            Başlık
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn. Çamaşırlar katlanacak"
              autoFocus
              maxLength={80}
            />
          </label>

          <label>
            Açıklama
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detay, konum, ipucu…"
            />
          </label>

          <div className="category-row">
            {(Object.keys(CATEGORY_META) as TaskCategory[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`chip ${category === key ? 'active' : ''}`}
                onClick={() => setCategory(key)}
              >
                {CATEGORY_META[key].label}
              </button>
            ))}
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Kaydediliyor…' : 'Görevi kaydet'}
          </button>
        </form>
      </aside>
    </div>
  )
}
