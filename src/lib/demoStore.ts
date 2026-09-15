import type { Member, Task, TaskCategory, TaskStatus, TaskUpdate } from '../types'
import type { Session } from './api'
import { createLocalId } from './api'

const MEMBERS_KEY = 'gorevtakip_demo_members'
const TASKS_KEY = 'gorevtakip_demo_tasks'
const UPDATES_KEY = 'gorevtakip_demo_updates'

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

export function demoGetMembers(): Member[] {
  return read<Member[]>(MEMBERS_KEY, [])
}

export function demoGetTasks(): Task[] {
  return read<Task[]>(TASKS_KEY, []).sort((a, b) => b.createdAt - a.createdAt)
}

export function demoGetUpdates(taskId: string): TaskUpdate[] {
  const all = read<TaskUpdate[]>(UPDATES_KEY, [])
  return all.filter((u) => u.taskId === taskId).sort((a, b) => a.createdAt - b.createdAt)
}

export function demoUpsertMember(member: Member) {
  const members = demoGetMembers()
  const idx = members.findIndex((m) => m.id === member.id)
  if (idx >= 0) members[idx] = member
  else members.push(member)
  write(MEMBERS_KEY, members)
}

export function demoCreateTask(input: {
  title: string
  description: string
  category: TaskCategory
  member: Session
}): string {
  const now = Date.now()
  const id = createLocalId()
  const task: Task = {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    status: 'open',
    createdById: input.member.memberId,
    createdByName: input.member.memberName,
    createdAt: now,
    updatedAt: now,
  }
  const tasks = demoGetTasks()
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

export function demoUpdateStatus(input: {
  taskId: string
  status: TaskStatus
  member: Session
  note?: string
  failReason?: string
}) {
  const now = Date.now()
  const tasks = demoGetTasks()
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

export function demoAddNote(input: { taskId: string; member: Session; message: string }) {
  const text = input.message.trim()
  if (!text) return
  const tasks = demoGetTasks()
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
