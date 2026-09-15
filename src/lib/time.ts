import { format, formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

export function formatWhen(ts?: number) {
  if (!ts) return '—'
  return format(ts, 'd MMM yyyy · HH:mm', { locale: tr })
}

export function formatRelative(ts?: number) {
  if (!ts) return '—'
  return formatDistanceToNow(ts, { addSuffix: true, locale: tr })
}
