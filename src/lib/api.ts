import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb, GROUP_ID } from './firebase'
import type { Member, Task, TaskCategory, TaskStatus, TaskUpdate } from '../types'

const SESSION_KEY = 'gorevtakip_session'

export interface Session {
  memberId: string
  memberName: string
  memberColor: string
  unlocked: boolean
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

function membersCol() {
  return collection(getDb(), 'groups', GROUP_ID, 'members')
}

function tasksCol() {
  return collection(getDb(), 'groups', GROUP_ID, 'tasks')
}

function taskDoc(taskId: string) {
  return doc(getDb(), 'groups', GROUP_ID, 'tasks', taskId)
}

function updatesCol(taskId: string) {
  return collection(getDb(), 'groups', GROUP_ID, 'tasks', taskId, 'updates')
}

export async function upsertMember(
  member: Omit<Member, 'createdAt'> & { createdAt?: number },
) {
  const ref = doc(getDb(), 'groups', GROUP_ID, 'members', member.id)
  await setDoc(
    ref,
    {
      name: member.name,
      color: member.color,
      createdAt: member.createdAt ?? Date.now(),
    },
    { merge: true },
  )
}

export function subscribeMembers(
  onData: (members: Member[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(membersCol(), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      const members = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Member, 'id'>),
      }))
      onData(members)
    },
    (error) => onError?.(error),
  )
}

export function subscribeTasks(
  onData: (tasks: Task[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(tasksCol(), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const tasks = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Task, 'id'>),
      }))
      onData(tasks)
    },
    (error) => onError?.(error),
  )
}

export function subscribeUpdates(
  taskId: string,
  onData: (updates: TaskUpdate[]) => void,
): Unsubscribe {
  const q = query(updatesCol(taskId), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => {
    const updates = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<TaskUpdate, 'id'>),
    }))
    onData(updates)
  })
}

async function addUpdate(
  taskId: string,
  data: Omit<TaskUpdate, 'id' | 'taskId' | 'createdAt'> & { createdAt?: number },
) {
  await addDoc(updatesCol(taskId), {
    taskId,
    ...data,
    createdAt: data.createdAt ?? Date.now(),
    serverCreatedAt: serverTimestamp(),
  })
}

export async function createTask(input: {
  title: string
  description: string
  category: TaskCategory
  member: Session
}) {
  const now = Date.now()
  const ref = await addDoc(tasksCol(), {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    status: 'open' satisfies TaskStatus,
    createdById: input.member.memberId,
    createdByName: input.member.memberName,
    createdAt: now,
    updatedAt: now,
  })

  await addUpdate(ref.id, {
    memberId: input.member.memberId,
    memberName: input.member.memberName,
    type: 'created',
    status: 'open',
    message: 'Görev oluşturuldu',
    createdAt: now,
  })

  return ref.id
}

export async function updateTaskStatus(input: {
  taskId: string
  status: TaskStatus
  member: Session
  note?: string
  failReason?: string
}) {
  const now = Date.now()
  const patch: Record<string, unknown> = {
    status: input.status,
    updatedAt: now,
    assigneeId: input.member.memberId,
    assigneeName: input.member.memberName,
  }

  if (input.status === 'started' || input.status === 'in_progress') {
    patch.startedAt = now
  }
  if (input.status === 'completed') {
    patch.completedAt = now
    patch.failReason = null
  }
  if (input.status === 'blocked') {
    patch.failReason = input.failReason?.trim() || 'Belirtilmedi'
  }

  await updateDoc(taskDoc(input.taskId), patch)

  const statusLabels: Record<TaskStatus, string> = {
    open: 'Bekliyor',
    started: 'İşe başladım',
    in_progress: 'Devam ediyor',
    completed: 'Tamamladım',
    blocked: 'Tamamlayamadım',
  }

  let message = `Durum: ${statusLabels[input.status]}`
  if (input.status === 'blocked' && input.failReason) {
    message += ` — ${input.failReason.trim()}`
  }
  if (input.note?.trim()) {
    message += ` · ${input.note.trim()}`
  }

  await addUpdate(input.taskId, {
    memberId: input.member.memberId,
    memberName: input.member.memberName,
    type: 'status',
    status: input.status,
    message,
    createdAt: now,
  })
}

export async function addTaskNote(input: {
  taskId: string
  member: Session
  message: string
}) {
  const text = input.message.trim()
  if (!text) return

  await updateDoc(taskDoc(input.taskId), {
    updatedAt: Date.now(),
  })

  await addUpdate(input.taskId, {
    memberId: input.member.memberId,
    memberName: input.member.memberName,
    type: 'note',
    message: text,
  })
}

export function createLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
