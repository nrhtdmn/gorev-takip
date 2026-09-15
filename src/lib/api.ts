import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { getDb } from './firebase'
import type {
  Group,
  Profile,
  Task,
  TaskCategory,
  TaskStatus,
  TaskUpdate,
} from '../types'
import { DEFAULT_PROFILES } from '../types'

const SESSION_KEY = 'gorevtakip_session'
const UNLOCK_KEY = 'gorevtakip_family_unlocked'

export interface Session {
  memberId: string
  memberName: string
  memberColor: string
  unlocked: boolean
  groupId?: string
  groupName?: string
}

export function isFamilyUnlocked(): boolean {
  return localStorage.getItem(UNLOCK_KEY) === '1'
}

export function setFamilyUnlocked(value: boolean) {
  if (value) localStorage.setItem(UNLOCK_KEY, '1')
  else localStorage.removeItem(UNLOCK_KEY)
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as Session
    if (!session.unlocked || !session.memberId) return null
    return session
  } catch {
    return null
  }
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  setFamilyUnlocked(true)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function clearProfileOnly() {
  localStorage.removeItem(SESSION_KEY)
}

/** Tam çıkış: profil + aile kilidi */
export function fullLogout() {
  localStorage.removeItem(SESSION_KEY)
  setFamilyUnlocked(false)
}

export function createLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function profilesCol() {
  return collection(getDb(), 'profiles')
}

function groupsCol() {
  return collection(getDb(), 'groups')
}

function groupDoc(groupId: string) {
  return doc(getDb(), 'groups', groupId)
}

function tasksCol(groupId: string) {
  return collection(getDb(), 'groups', groupId, 'tasks')
}

function taskDoc(groupId: string, taskId: string) {
  return doc(getDb(), 'groups', groupId, 'tasks', taskId)
}

function updatesCol(groupId: string, taskId: string) {
  return collection(getDb(), 'groups', groupId, 'tasks', taskId, 'updates')
}

export async function ensureDefaultProfiles() {
  const snap = await getDocs(profilesCol())
  if (!snap.empty) return
  const now = Date.now()
  await Promise.all(
    DEFAULT_PROFILES.map((p) =>
      setDoc(doc(getDb(), 'profiles', p.id), {
        name: p.name,
        color: p.color,
        createdAt: now,
      }),
    ),
  )
}

export function subscribeProfiles(
  onData: (profiles: Profile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(profilesCol(), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Profile, 'id'>),
        })),
      )
    },
    (error) => onError?.(error),
  )
}

export async function createProfile(input: {
  name: string
  color: string
}): Promise<Profile> {
  const id = createLocalId()
  const profile: Profile = {
    id,
    name: input.name.trim(),
    color: input.color,
    createdAt: Date.now(),
  }
  await setDoc(doc(getDb(), 'profiles', id), {
    name: profile.name,
    color: profile.color,
    createdAt: profile.createdAt,
  })
  return profile
}

export async function deleteProfile(profileId: string) {
  await deleteDoc(doc(getDb(), 'profiles', profileId))
  // Gruplardan çıkar
  const groupsSnap = await getDocs(groupsCol())
  await Promise.all(
    groupsSnap.docs.map(async (g) => {
      const data = g.data() as Omit<Group, 'id'>
      if (!data.memberIds?.includes(profileId)) return
      await updateDoc(g.ref, {
        memberIds: data.memberIds.filter((id) => id !== profileId),
      })
    }),
  )
}

export function subscribeGroups(
  onData: (groups: Group[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(groupsCol(), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Group, 'id'>),
          memberIds: (d.data().memberIds as string[]) || [],
        })),
      )
    },
    (error) => onError?.(error),
  )
}

export async function createGroup(input: {
  name: string
  member: Session
  memberIds: string[]
}): Promise<Group> {
  const now = Date.now()
  const ids = Array.from(new Set([input.member.memberId, ...input.memberIds]))
  const ref = await addDoc(groupsCol(), {
    name: input.name.trim(),
    memberIds: ids,
    createdAt: now,
    createdById: input.member.memberId,
    createdByName: input.member.memberName,
  })
  return {
    id: ref.id,
    name: input.name.trim(),
    memberIds: ids,
    createdAt: now,
    createdById: input.member.memberId,
    createdByName: input.member.memberName,
  }
}

export async function updateGroupMembers(groupId: string, memberIds: string[]) {
  await updateDoc(groupDoc(groupId), { memberIds })
}

export async function deleteGroup(groupId: string) {
  const tasks = await getDocs(tasksCol(groupId))
  await Promise.all(tasks.docs.map((t) => deleteDoc(t.ref)))
  await deleteDoc(groupDoc(groupId))
}

export function subscribeTasks(
  groupId: string,
  onData: (tasks: Task[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(tasksCol(groupId), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Task, 'id'>),
        })),
      )
    },
    (error) => onError?.(error),
  )
}

export function subscribeUpdates(
  groupId: string,
  taskId: string,
  onData: (updates: TaskUpdate[]) => void,
): Unsubscribe {
  const q = query(updatesCol(groupId, taskId), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<TaskUpdate, 'id'>),
      })),
    )
  })
}

async function addUpdate(
  groupId: string,
  taskId: string,
  data: Omit<TaskUpdate, 'id' | 'taskId' | 'createdAt'> & { createdAt?: number },
) {
  await addDoc(updatesCol(groupId, taskId), {
    taskId,
    ...data,
    createdAt: data.createdAt ?? Date.now(),
    serverCreatedAt: serverTimestamp(),
  })
}

export async function createTask(input: {
  groupId: string
  title: string
  description: string
  category: TaskCategory
  member: Session
}) {
  const now = Date.now()
  const ref = await addDoc(tasksCol(input.groupId), {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    status: 'open' satisfies TaskStatus,
    createdById: input.member.memberId,
    createdByName: input.member.memberName,
    createdAt: now,
    updatedAt: now,
  })

  await addUpdate(input.groupId, ref.id, {
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
  groupId: string
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

  await updateDoc(taskDoc(input.groupId, input.taskId), patch)

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

  await addUpdate(input.groupId, input.taskId, {
    memberId: input.member.memberId,
    memberName: input.member.memberName,
    type: 'status',
    status: input.status,
    message,
    createdAt: now,
  })
}

export async function addTaskNote(input: {
  groupId: string
  taskId: string
  member: Session
  message: string
}) {
  const text = input.message.trim()
  if (!text) return

  await updateDoc(taskDoc(input.groupId, input.taskId), {
    updatedAt: Date.now(),
  })

  await addUpdate(input.groupId, input.taskId, {
    memberId: input.member.memberId,
    memberName: input.member.memberName,
    type: 'note',
    message: text,
  })
}

export async function deleteTask(groupId: string, taskId: string) {
  const ups = await getDocs(updatesCol(groupId, taskId))
  await Promise.all(ups.docs.map((u) => deleteDoc(u.ref)))
  await deleteDoc(taskDoc(groupId, taskId))
}

/** Eski tek-grup verisini Ev grubuna taşı (bir kez) */
export async function migrateLegacyAileIfNeeded(profileId: string) {
  const groupsSnap = await getDocs(groupsCol())
  const existing = groupsSnap.docs.find((d) => d.id === 'aile')
  if (existing?.data()?.name && Array.isArray(existing.data().memberIds)) {
    return
  }

  const memberIds = Array.from(new Set(['gizem', 'nurhat', profileId]))
  await setDoc(
    groupDoc('aile'),
    {
      name: 'Ev',
      memberIds,
      createdAt: existing?.data()?.createdAt ?? Date.now(),
      createdById: profileId,
      createdByName: 'sistem',
    },
    { merge: true },
  )
}
