import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppContext } from '../hooks/useApp'
import {
  clearProfileOnly,
  clearSession,
  ensureDefaultProfiles,
  fullLogout,
  loadSession,
  migrateLegacyAileIfNeeded,
  saveSession,
  subscribeGroups,
  subscribeProfiles,
  subscribeTasks,
  type Session,
} from '../lib/api'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  demoEnsureDefaults,
  demoGetGroups,
  demoGetProfiles,
  demoGetTasksForGroup,
} from '../lib/demoStore'
import type { Group, Profile, Task } from '../types'

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(() => loadSession())
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const demoMode = !isFirebaseConfigured

  const setSession = (next: Session | null) => {
    if (next) saveSession(next)
    else clearSession()
    setSessionState(next)
  }

  const switchProfile = () => {
    clearProfileOnly()
    setSessionState(null)
    setTasks([])
  }

  const leaveGroup = () => {
    if (!session) return
    const next = { ...session, groupId: undefined, groupName: undefined }
    saveSession(next)
    setSessionState(next)
    setTasks([])
  }

  const logout = () => {
    fullLogout()
    setSessionState(null)
    setTasks([])
  }

  const refreshLocal = () => setTick((t) => t + 1)

  useEffect(() => {
    if (demoMode) {
      demoEnsureDefaults()
      setProfiles(demoGetProfiles())
      setGroups(demoGetGroups())
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        await ensureDefaultProfiles()
        if (session?.memberId) await migrateLegacyAileIfNeeded(session.memberId)
      } catch (e) {
        console.error(e)
      }
      if (cancelled) return
    })()

    const onError = (error: Error) => {
      console.error('Firestore hatası:', error)
      setLoading(false)
    }

    const unsubProfiles = subscribeProfiles(setProfiles, onError)
    const unsubGroups = subscribeGroups(setGroups, onError)

    return () => {
      cancelled = true
      unsubProfiles()
      unsubGroups()
    }
  }, [demoMode, session?.memberId, tick])

  useEffect(() => {
    if (!session?.groupId) {
      setTasks([])
      setLoading(false)
      return
    }

    if (demoMode) {
      setTasks(demoGetTasksForGroup(session.groupId))
      setLoading(false)
      return
    }

    setLoading(true)
    return subscribeTasks(
      session.groupId,
      (list) => {
        setTasks(list)
        setLoading(false)
      },
      (error) => {
        console.error(error)
        setLoading(false)
      },
    )
  }, [session?.groupId, demoMode, tick])

  const value = useMemo(
    () => ({
      session,
      profiles,
      groups,
      tasks,
      loading,
      demoMode,
      setSession,
      switchProfile,
      leaveGroup,
      logout,
      refreshLocal,
    }),
    [session, profiles, groups, tasks, loading, demoMode],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
