import { createContext, useContext } from 'react'
import type { Member, Task } from '../types'
import type { Session } from '../lib/api'

export interface AppState {
  session: Session | null
  members: Member[]
  tasks: Task[]
  loading: boolean
  demoMode: boolean
  setSession: (session: Session | null) => void
  switchProfile: () => void
  refreshLocal?: () => void
}

export const AppContext = createContext<AppState | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp AppProvider içinde kullanılmalı')
  return ctx
}
