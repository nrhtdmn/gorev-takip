import { useMemo, useState, type FormEvent } from 'react'
import { useApp } from '../hooks/useApp'
import { createGroup, deleteGroup, updateGroupMembers } from '../lib/api'
import {
  demoCreateGroup,
  demoDeleteGroup,
  demoUpdateGroupMembers,
} from '../lib/demoStore'

export function GroupScreen() {
  const {
    session,
    setSession,
    groups,
    profiles,
    demoMode,
    refreshLocal,
    switchProfile,
    logout,
  } = useApp()
  const [creating, setCreating] = useState(false)
  const [managingId, setManagingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const myGroups = useMemo(() => {
    if (!session) return []
    return groups.filter((g) => g.memberIds.includes(session.memberId))
  }, [groups, session])

  if (!session) return null

  const openGroup = (groupId: string, groupName: string) => {
    setSession({
      ...session,
      groupId,
      groupName,
    })
  }

  const toggleMember = (id: string) => {
    if (id === session.memberId) return
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Grup adı gerekli')
      return
    }
    setBusy(true)
    setError('')
    try {
      const group = demoMode
        ? demoCreateGroup(name, session, selectedMembers)
        : await createGroup({ name, member: session, memberIds: selectedMembers })
      refreshLocal?.()
      setCreating(false)
      setName('')
      setSelectedMembers([])
      openGroup(group.id, group.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grup oluşturulamadı')
    } finally {
      setBusy(false)
    }
  }

  const managing = groups.find((g) => g.id === managingId)

  const saveMembers = async () => {
    if (!managing) return
    setBusy(true)
    try {
      const ids = Array.from(new Set([session.memberId, ...selectedMembers]))
      if (demoMode) demoUpdateGroupMembers(managing.id, ids)
      else await updateGroupMembers(managing.id, ids)
      refreshLocal?.()
      setManagingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Güncellenemedi')
    } finally {
      setBusy(false)
    }
  }

  const removeGroup = async (groupId: string, groupName: string) => {
    if (!confirm(`“${groupName}” grubunu ve görevlerini sil?`)) return
    setBusy(true)
    try {
      if (demoMode) demoDeleteGroup(groupId)
      else await deleteGroup(groupId)
      refreshLocal?.()
      setManagingId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Silinemedi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block brand-lockup">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" className="brand-logo sm" />
          <div>
            <p className="eyebrow">Merhaba, {session.memberName}</p>
            <h1>Grupların</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" className="btn ghost compact" onClick={switchProfile}>
            Profil
          </button>
          <button type="button" className="btn ghost compact" onClick={logout}>
            Çıkış
          </button>
        </div>
      </header>

      <p className="lead soft">
        Ev, iş… Her grup ayrı. Üye olmayan kimseyi görmez.
      </p>

      <div className="group-list">
        {myGroups.map((g) => (
          <div key={g.id} className="group-card">
            <button type="button" className="group-main" onClick={() => openGroup(g.id, g.name)}>
              <strong>{g.name}</strong>
              <span>
                {g.memberIds.length} üye ·{' '}
                {g.memberIds
                  .map((id) => profiles.find((p) => p.id === id)?.name || '?')
                  .join(', ')}
              </span>
            </button>
            <button
              type="button"
              className="btn ghost compact"
              onClick={() => {
                setManagingId(g.id)
                setSelectedMembers(g.memberIds.filter((id) => id !== session.memberId))
                setError('')
              }}
            >
              Üyeler
            </button>
          </div>
        ))}
        {myGroups.length === 0 && (
          <div className="empty">
            <h3>Henüz grubun yok</h3>
            <p>Örn. “Ev” veya “İş” grubu oluştur.</p>
          </div>
        )}
      </div>

      <button type="button" className="btn primary" onClick={() => setCreating(true)}>
        + Yeni grup
      </button>

      {creating && (
        <div className="drawer-backdrop" onClick={() => setCreating(false)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog">
            <header className="drawer-head">
              <div>
                <p className="eyebrow">Yeni grup</p>
                <h2>Grup oluştur</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setCreating(false)}>
                ✕
              </button>
            </header>
            <form onSubmit={submitCreate} className="stack">
              <label>
                Grup adı
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn. İş"
                  autoFocus
                />
              </label>
              <div>
                <p className="eyebrow">Üyeler</p>
                <div className="member-check-list">
                  {profiles.map((p) => (
                    <label key={p.id} className="member-check">
                      <input
                        type="checkbox"
                        checked={
                          p.id === session.memberId || selectedMembers.includes(p.id)
                        }
                        disabled={p.id === session.memberId}
                        onChange={() => toggleMember(p.id)}
                      />
                      <span className="dot" style={{ background: p.color }} />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="error">{error}</p>}
              <button type="submit" className="btn primary" disabled={busy}>
                Oluştur
              </button>
            </form>
          </aside>
        </div>
      )}

      {managing && (
        <div className="drawer-backdrop" onClick={() => setManagingId(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog">
            <header className="drawer-head">
              <div>
                <p className="eyebrow">{managing.name}</p>
                <h2>Üyeleri düzenle</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setManagingId(null)}>
                ✕
              </button>
            </header>
            <div className="stack">
              <div className="member-check-list">
                {profiles.map((p) => (
                  <label key={p.id} className="member-check">
                    <input
                      type="checkbox"
                      checked={
                        p.id === session.memberId || selectedMembers.includes(p.id)
                      }
                      disabled={p.id === session.memberId}
                      onChange={() => toggleMember(p.id)}
                    />
                    <span className="dot" style={{ background: p.color }} />
                    {p.name}
                  </label>
                ))}
              </div>
              {error && <p className="error">{error}</p>}
              <button type="button" className="btn primary" disabled={busy} onClick={saveMembers}>
                Kaydet
              </button>
              <button
                type="button"
                className="btn danger"
                disabled={busy}
                onClick={() => removeGroup(managing.id, managing.name)}
              >
                Grubu sil
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
