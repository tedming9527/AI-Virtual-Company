export const DEFAULT_RETENTION_HOURS = 240

function toDate(value) {
  const parsed = value instanceof Date ? value : new Date(value)
  if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

function normalizeState(value) {
  return String(value || '').trim().toUpperCase()
}

export function isContentVisible({
  now,
  publishedAt,
  status = 'PUBLISHED',
  visibility = 'PUBLIC',
  retentionHours = DEFAULT_RETENTION_HOURS,
  retentionDays
}) {
  const nowDate = toDate(now)
  if (!nowDate) {
    return { visible: false, reason: 'INVALID_NOW' }
  }

  const publishedDate = toDate(publishedAt)
  if (!publishedDate) {
    return { visible: false, reason: 'INVALID_PUBLISHED' }
  }

  const normalizedStatus = normalizeState(status)
  if (normalizedStatus !== 'PUBLISHED') {
    return { visible: false, reason: 'NOT_PUBLISHED' }
  }

  if (normalizeState(visibility) !== 'PUBLIC') {
    return { visible: false, reason: 'NOT_PUBLIC' }
  }

  const hours = Number.isFinite(retentionDays)
    ? retentionDays * 24
    : Number(retentionHours)
  if (!Number.isFinite(hours) || hours < 0) {
    return { visible: false, reason: 'INVALID_RETENTION' }
  }

  const nowMs = nowDate.getTime()
  const publishedMs = publishedDate.getTime()
  const windowStartMs = nowMs - hours * 60 * 60 * 1000

  if (publishedMs < windowStartMs) {
    return { visible: false, reason: 'HIDE_EXPIRED', visibleFromMs: windowStartMs }
  }

  if (publishedMs > nowMs) {
    return { visible: false, reason: 'HIDE_FUTURE', visibleFromMs: windowStartMs }
  }

  return { visible: true, reason: 'SHOW', visibleFromMs: windowStartMs }
}
