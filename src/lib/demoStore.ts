import type { Group, Profile, Task, TaskCategory, TaskStatus, TaskUpdate } from '../types'
import type { Session } from './api'
import { createLocalId } from './api'
import { DEFAULT_PROFILES } from '../types'

const PROFILES_KEY = 'gorevtakip_v2_profiles'
const GROUPS_KEY = 'gorevtakip_v2_groups'
const TASKS_KEY = 'gorevtakip_v2_tasks'
const UPDATES_KEY = 'gorevtakip_v2_updates'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function demoEnsureDefaults() {
  let profiles = read<Profile[]>(PROFILES_KEY, [])
  if (profiles.length === 0) {
    const now = Date.now()
    profiles = DEFAULT_PROFILES.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      createdAt: now,
    }))
    write(PROFILES_KEY, profiles)
  }
  let groups = read<Group[]>(GROUPS_KEY, [])
  if (groups.length === 0) {
    groups = [
      {
        id: 'aile',
        name: 'Ev',
        memberIds: profiles.map((p) => p.id),
        createdAt: Date.now(),
        createdById: 'sistem',
        createdByName: 'sistem',
      },
    ]
    write(GROUPS_KEY, groups)
  }
}

export function demoGetProfiles() {
  demoEnsureDefaults()
  return read<Profile[]>(PROFILES_KEY, [])
}

export function demoGetGroups() {
  demoEnsureDefaults()
  return read<Group[]>(GROUPS_KEY, [])
}

export function demoGetTasks(groupId: string) {
  return read<Task[]>(TASKS_KEY, [])
    .filter((t) => (t as Task & { groupId?: string }).groupId === groupId || !(t as Task & { groupId?: string }).groupId && groupId === 'aile')
    .sort((a, b) => b.createdAt - a.createdAt)
}

// Store tasks with groupId field in demo
type DemoTask = Task & { groupId: string }

function allDemoTasks(): DemoTask[] {
  return read<DemoTask[]>(TASKS_KEY, [])
}

export function demoCreateProfile(name: string, color: string): Profile {
  const profile: Profile = {
    id: createLocalId(),
    name: name.trim(),
    color,
    createdAt: Date.now(),
  }
  const list = demoGetProfiles()
  list.push(profile)
  write(PROFILES_KEY, list)
  return profile
}

export function demoDeleteProfile(id: string) {
  write(
    PROFILES_KEY,
    demoGetProfiles().filter((p) => p.id !== id),
  )
  write(
    GROUPS_KEY,
    demoGetGroups().map((g) => ({
      ...g,
      memberIds: g.memberIds.filter((m) => m !== id),
    })),
  )
}

export function demoCreateGroup(
  name: string,
  member: Session,
  memberIds: string[],
): Group {
  const group: Group = {
    id: createLocalId(),
    name: name.trim(),
    memberIds: Array.from(new Set([member.memberId, ...memberIds])),
    createdAt: Date.now(),
    createdById: member.memberId,
    createdByName: member.memberName,
  }
  const list = demoGetGroups()
  list.push(group)
  write(GROUPS_KEY, list)
  return group
}

export function demoUpdateGroupMembers(groupId: string, memberIds: string[]) {
  write(
    GROUPS_KEY,
    demoGetGroups().map((g) => (g.id === groupId ? { ...g, memberIds } : g)),
  )
}

export function demoDeleteGroup(groupId: string) {
  write(
    GROUPS_KEY,
    demoGetGroups().filter((g) => g.id !== groupId),
  )
  write(
    TASKS_KEY,
    allDemoTasks().filter((t) => t.groupId !== groupId),
  )
}

export function demoCreateTask(input: {
  groupId: string
  title: string
  description: string
  category: TaskCategory
  member: Session
}) {
  const now = Date.now()
  const id = createLocalId()
  const task: DemoTask = {
    id,
    groupId: input.groupId,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    status: 'open',
    createdById: input.member.memberId,
    createdByName: input.member.memberName,
    createdAt: now,
    updatedAt: now,
  }
  const tasks = allDemoTasks()
  tasks.unshift(task)
  write(TASKS_KEY, tasks)

  const updates = read<TaskUpdate[]>(UPDATES_KEY, [])
  updates.push({
    id: createLocalId(),
    taskId: id,
    memberId: input.member.memberId,
    memberName: input.member.memberName,
    type: 'created',
    status: 'open',
    message: 'Görev oluşturuldu',
    createdAt: now,
  })
  write(UPDATES_KEY, updates)
  return id
}

export function demoGetUpdates(taskId: string) {
  return read<TaskUpdate[]>(UPDATES_KEY, [])
    .filter((u) => u.taskId === taskId)
    .sort((a, b) => a.createdAt - b.createdAt)
}

export function demoUpdateStatus(input: {
  groupId: string
  taskId: string
  status: TaskStatus
  member: Session
  note?: string
  failReason?: string
}) {
  const now = Date.now()
  const tasks = allDemoTasks()
  const task = tasks.find((t) => t.id === input.taskId)
  if (!task) return
  task.status = input.status
  task.updatedAt = now
  task.assigneeId = input.member.memberId
  task.assigneeName = input.member.memberName
  if (input.status === 'started' || input.status === 'in_progress') task.startedAt = now
  if (input.status === 'completed') {
    task.completedAt = now
    task.failReason = undefined
  }
  if (input.status === 'blocked') {
    task.failReason = input.failReason?.trim() || 'Belirtilmedi'
  }
  write(TASKS_KEY, tasks)

  const labels: Record<TaskStatus, string> = {
    open: 'Bekliyor',
    started: 'İşe başladım',
    in_progress: 'Devam ediyor',
    completed: 'Tamamladım',
    blocked: 'Tamamlayamadım',
  }
  let message = `Durum: ${labels[input.status]}`
  if (input.status === 'blocked' && input.failReason) message += ` — ${input.failReason.trim()}`
  if (input.note?.trim()) message += ` · ${input.note.trim()}`

  const updates = read<TaskUpdate[]>(UPDATES_KEY, [])
  updates.push({
    id: createLocalId(),
    taskId: input.taskId,
    memberId: input.member.memberId,
    memberName: input.member.memberName,
    type: 'status',
    status: input.status,
    message,
    createdAt: now,
  })
  write(UPDATES_KEY, updates)
}

export function demoAddNote(input: {
  taskId: string
  member: Session
  message: string
  groupId: string
}) {
  const text = input.message.trim()
  if (!text) return
  const tasks = allDemoTasks()
  const task = tasks.find((t) => t.id === input.taskId)
  if (task) {
    task.updatedAt = Date.now()
    write(TASKS_KEY, tasks)
  }
  const updates = read<TaskUpdate[]>(UPDATES_KEY, [])
  updates.push({
    id: createLocalId(),
    taskId: input.taskId,
    memberId: input.member.memberId,
    memberName: input.member.memberName,
    type: 'note',
    message: text,
    createdAt: Date.now(),
  })
  write(UPDATES_KEY, updates)
}

export function demoDeleteTask(taskId: string) {
  write(
    TASKS_KEY,
    allDemoTasks().filter((t) => t.id !== taskId),
  )
  write(
    UPDATES_KEY,
    read<TaskUpdate[]>(UPDATES_KEY, []).filter((u) => u.taskId !== taskId),
  )
}

export function demoGetTasksForGroup(groupId: string) {
  return allDemoTasks()
    .filter((t) => t.groupId === groupId)
    .sort((a, b) => b.createdAt - a.createdAt)
}
