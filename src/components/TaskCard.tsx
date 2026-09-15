import type { Task } from '../types'
import { CATEGORY_META, STATUS_META } from '../types'
import { formatRelative, formatWhen } from '../lib/time'

export function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const status = STATUS_META[task.status]
  const category = CATEGORY_META[task.category]

  return (
    <button type="button" className={`task-card tone-${status.tone}`} onClick={onOpen}>
      <div className="task-card-top">
        <span className="tag">{category.label}</span>
        <span className={`badge badge-${status.tone}`}>{status.short}</span>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p className="task-desc">{task.description}</p>}
      <div className="task-meta">
        <span>{task.createdByName} yazdı</span>
        <span>{formatRelative(task.updatedAt)}</span>
      </div>
      {task.assigneeName && (
        <div className="task-assignee">Üzerinde: {task.assigneeName}</div>
      )}
      {task.status === 'blocked' && task.failReason && (
        <div className="task-reason">Neden: {task.failReason}</div>
      )}
      <div className="task-times">
        <span>Kayıt: {formatWhen(task.createdAt)}</span>
        {task.completedAt && <span>Bitti: {formatWhen(task.completedAt)}</span>}
      </div>
    </button>
  )
}
