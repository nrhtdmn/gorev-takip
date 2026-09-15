export type TaskStatus =
  | 'open'
  | 'started'
  | 'in_progress'
  | 'completed'
  | 'blocked'

export type TaskCategory = 'ev' | 'is' | 'diger'

export interface Profile {
  id: string
  name: string
  color: string
  createdAt: number
  /** Varsa bu profile giriş için gerekli */
  pin?: string
}

/** @deprecated Member = Profile; grup üyeliği group.memberIds ile */
export type Member = Profile

export interface Group {
  id: string
  name: string
  memberIds: string[]
  createdAt: number
  createdById: string
  createdByName: string
}

export interface TaskUpdate {
  id: string
  taskId: string
  memberId: string
  memberName: string
  type: 'created' | 'status' | 'note' | 'edit'
  status?: TaskStatus
  message: string
  createdAt: number
}

export interface Task {
  id: string
  title: string
  description: string
  category: TaskCategory
  status: TaskStatus
  createdById: string
  createdByName: string
  assigneeId?: string
  assigneeName?: string
  createdAt: number
  updatedAt: number
  startedAt?: number
  completedAt?: number
  failReason?: string
}

export const STATUS_META: Record<
  TaskStatus,
  { label: string; short: string; tone: string }
> = {
  open: { label: 'Bekliyor', short: 'Bekliyor', tone: 'open' },
  started: { label: 'İşe başladım', short: 'Başladı', tone: 'started' },
  in_progress: { label: 'Devam ediyor', short: 'Devam', tone: 'progress' },
  completed: { label: 'Tamamlandı', short: 'Bitti', tone: 'done' },
  blocked: { label: 'Tamamlayamadım', short: 'Engel', tone: 'blocked' },
}

export const CATEGORY_META: Record<TaskCategory, { label: string }> = {
  ev: { label: 'Ev' },
  is: { label: 'İş' },
  diger: { label: 'Diğer' },
}

export const PROFILE_COLORS = [
  '#1a5c4a',
  '#0f766e',
  '#b45309',
  '#9f1239',
  '#1d4ed8',
  '#6d28d9',
  '#0e7490',
  '#365314',
]

export const DEFAULT_PROFILES = [
  { id: 'gizem', name: 'Gizem', color: '#9f1239', pin: undefined as string | undefined },
  { id: 'nurhat', name: 'Nurhat', color: '#1a5c4a', pin: '2580' },
] as const

export function profileNeedsPin(profile: Profile): boolean {
  return Boolean(profile.pin && profile.pin.trim())
}
