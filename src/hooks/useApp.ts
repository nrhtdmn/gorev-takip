import { createContext, useContext } from 'react'
import type { Group, Profile, Task } from '../types'
import type { Session } from '../lib/api'

export interface AppState {
  session: Session | null
  profiles: Profile[]
  groups: Group[]
  tasks: Task[]
  loading: boolean
  demoMode: boolean
  setSession: (session: Session | null) => void
  switchProfile: () => void
  leaveGroup: () => void
  logout: () => void
  refreshLocal?: () => void
}

export const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp AppProvider içinde kullanılmalı')
  return ctx
}
