import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppContext } from '../hooks/useApp'
import {
  clearProfileOnly,
  clearSession,
  loadSession,
  saveSession,
  subscribeMembers,
  subscribeTasks,
  type Session,
} from '../lib/api'
import { isFirebaseConfigured } from '../lib/firebase'
import { demoGetMembers, demoGetTasks } from '../lib/demoStore'
import type { Member, Task } from '../types'

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => loadSession())
  const [members, setMembers] = useState<Member[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const demoMode = !isFirebaseConfigured

  const setSession = (next: Session | null) => {
    if (next) saveSession(next)
    else clearSession()
    setSessionState(next)
  }

  /** Profil değiştir (Gizem ↔ Nurhat) — aile şifresi sorulmaz */
  const switchProfile = () => {
    clearProfileOnly()
    setSessionState(null)
  }

  const refreshLocal = () => setTick((t) => t + 1)

  useEffect(() => {
    if (!session?.unlocked) {
      setLoading(false)
      return
    }

    if (demoMode) {
      setMembers(demoGetMembers())
      setTasks(demoGetTasks())
      setLoading(false)
      return
    }

    setLoading(true)
    const onError = (error: Error) => {
      console.error('Firestore hatası:', error)
      setLoading(false)
    }
    const unsubMembers = subscribeMembers(setMembers, onError)
    const unsubTasks = subscribeTasks((list) => {
      setTasks(list)
      setLoading(false)
    }, onError)

    return () => {
      unsubMembers()
      unsubTasks()
    }
  }, [session?.unlocked, session?.memberId, demoMode, tick])

  const value = useMemo(
    () => ({
      session,
      members,
      tasks,
      loading,
      demoMode,
      setSession,
      switchProfile,
      refreshLocal,
    }),
    [session, members, tasks, loading, demoMode],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
