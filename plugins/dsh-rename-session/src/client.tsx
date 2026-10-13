import { createElement as h } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import type { SessionId } from '@deepseek-ai/dsh-session/types'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import type { SnapshotStore } from '@deepseek-ai/dsh-client-store'
import { IconEditOutlineRegular, MenuItemButton, Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-workspace/client'
import type {} from '@deepseek-ai/dsh-api-session-controller/client'
import { dictionaries } from './locales.js'
import type { ErrorKey } from './locales.js'
import type { RenameResult } from './protocol.js'

const NS = 'renameSession'

type NoticeContent =
  | { kind: 'pending' }
  | { kind: 'success'; title: string }
  | { kind: 'error'; code: string }
type Notice = NoticeContent & { seq: number }

interface MenuInjected {
  renameSession: (sessionId: SessionId) => Promise<void>
}

interface NoticeInjected {
  hooks: { notice: SnapshotStore<Notice | null> }
  dismiss: () => void
}

type MenuProps = PropsRuntime<'sidebar.workspaces.session.menu.item'> & PropsLocale<typeof NS> & InjectFace<MenuInjected>
type NoticeProps = PropsRuntime<'shell.overlay'> & PropsLocale<typeof NS> & InjectFace<NoticeInjected>

function MenuRow({ sessionId, useMenuOpenState, renameSession, t }: MenuProps) {
  const [, setMenuOpen] = useMenuOpenState()
  return (
    <MenuItemButton icon={<IconEditOutlineRegular />} onSelect={() => {
      setMenuOpen(false)
      void renameSession(sessionId)
    }}>
      {t('rename')}
    </MenuItemButton>
  )
}

function isErrorKey(key: string): key is ErrorKey {
  return key.startsWith('error.') && Object.hasOwn(dictionaries.en, key)
}

function Notice({ useNotice, dismiss, t }: NoticeProps) {
  const notice = useNotice(value => value)
  if (notice === null) return null
  const errorKey = notice.kind === 'error' ? notice.code.replace(/^rename-session\//, 'error.') : ''
  return (
    <Toast
      key={notice.seq}
      text={t(notice.kind, {
        title: notice.kind === 'success' ? notice.title : '',
        message: notice.kind === 'error' ? t(isErrorKey(errorKey) ? errorKey : 'error.failed') : '',
      })}
      tone={notice.kind === 'success' ? 'success' : undefined}
      holdMs={notice.kind === 'pending' ? 65000 : 6000}
      onDone={dismiss}
    />
  )
}

export const name = 'rename-session-client'
export const inject = ['slots', 'locale', 'sessions']

export function apply(ctx: Context): void {
  const notice = createSnapshotStore<Notice | null>(null)
  const lifetime = new AbortController()
  let seq = 0
  const notify = (value: NoticeContent): void => {
    notice.set({ ...value, seq: ++seq })
  }
  ctx.effect(() => () => { lifetime.abort() })
  ctx.effect(() => ctx.locale.register(NS, dictionaries))
  const renameSession = async (sessionId: SessionId): Promise<void> => {
    notify({ kind: 'pending' })
    try {
      const result = await ctx.sessions.using(sessionId, { source: 'workspaceOperation' }, async (): Promise<RenameResult> => {
        const response = await fetch('api/dsh-rename-session', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ sessionId }), signal: lifetime.signal,
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      if (!result.ok) {
        if (!lifetime.signal.aborted) notify({ kind: 'error', code: result.error.code })
        return
      }
      if (!lifetime.signal.aborted) notify({ kind: 'success', title: result.value.title })
    } catch {
      if (!lifetime.signal.aborted) notify({ kind: 'error', code: 'rename-session/failed' })
    }
  }
  ctx.slots.inject('sidebar.workspaces.session.menu.item', () => ctx.slots.register({
    name: 'sidebar.workspaces.session.menu.item', id: 'dsh-rename-session', order: 250, locale: NS,
    inject: (): MenuInjected => ({ renameSession }),
  }, MenuRow))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay', id: 'dsh-rename-session.notice', locale: NS,
    inject: (): NoticeInjected => ({ hooks: { notice }, dismiss: () => { notice.set(null) } }),
  }, Notice))
}
