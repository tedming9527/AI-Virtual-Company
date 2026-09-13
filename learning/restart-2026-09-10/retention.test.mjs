import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isContentVisible } from './retention.mjs'

const NOW = new Date('2026-09-10T12:00:00.000Z')

test('窗口内条目可见', () => {
  const result = isContentVisible({
    now: NOW,
    publishedAt: '2026-09-09T12:00:00.000Z',
    status: 'PUBLISHED',
    visibility: 'PUBLIC'
  })
  assert.equal(result.visible, true)
  assert.equal(result.reason, 'SHOW')
})

test('恰好 10 天可见（闭区间）', () => {
  const result = isContentVisible({
    now: NOW,
    publishedAt: '2026-08-31T12:00:00.000Z',
    status: 'PUBLISHED',
    visibility: 'PUBLIC'
  })
  assert.equal(result.visible, true)
  assert.equal(result.reason, 'SHOW')
})

test('超 10 天 +1ms 隐藏', () => {
  const result = isContentVisible({
    now: NOW,
    publishedAt: '2026-08-31T11:59:59.999Z',
    status: 'PUBLISHED',
    visibility: 'PUBLIC'
  })
  assert.equal(result.visible, false)
  assert.equal(result.reason, 'HIDE_EXPIRED')
})

test('未来时间 +1ms 隐藏', () => {
  const future = new Date(NOW.getTime() + 1)
  const result = isContentVisible({
    now: NOW,
    publishedAt: future.toISOString(),
    status: 'PUBLISHED',
    visibility: 'PUBLIC'
  })
  assert.equal(result.visible, false)
  assert.equal(result.reason, 'HIDE_FUTURE')
})

test('非法发布时间隐藏', () => {
  const result = isContentVisible({
    now: NOW,
    publishedAt: 'not-a-date',
    status: 'PUBLISHED',
    visibility: 'PUBLIC'
  })
  assert.equal(result.visible, false)
  assert.equal(result.reason, 'INVALID_PUBLISHED')
})

test('草稿状态隐藏', () => {
  const result = isContentVisible({
    now: NOW,
    publishedAt: '2026-09-09T12:00:00.000Z',
    status: 'DRAFT',
    visibility: 'PUBLIC'
  })
  assert.equal(result.visible, false)
  assert.equal(result.reason, 'NOT_PUBLISHED')
})

test('非公开条目隐藏', () => {
  const result = isContentVisible({
    now: NOW,
    publishedAt: '2026-09-09T12:00:00.000Z',
    status: 'PUBLISHED',
    visibility: 'ARCHIVED'
  })
  assert.equal(result.visible, false)
  assert.equal(result.reason, 'NOT_PUBLIC')
})

test('7 天迁移恰好 7 天可见', () => {
  const result = isContentVisible({
    now: NOW,
    publishedAt: '2026-09-03T12:00:00.000Z',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    retentionDays: 7
  })
  assert.equal(result.visible, true)
  assert.equal(result.reason, 'SHOW')
})

test('7 天迁移超 1ms 隐藏', () => {
  const result = isContentVisible({
    now: NOW,
    publishedAt: '2026-09-03T11:59:59.999Z',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    retentionDays: 7
  })
  assert.equal(result.visible, false)
  assert.equal(result.reason, 'HIDE_EXPIRED')
})
