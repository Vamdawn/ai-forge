/** Keys the Astrolabe client namespace serves. */
export type LocaleKey =
  | 'tab.workspaces' | 'tab.status'
  | 'group.needsInput' | 'group.working' | 'group.completed' | 'group.pinned'
  | 'ungrouped' | 'empty' | 'emptyHint' | 'loading'
  | 'pending.approval' | 'pending.planReview' | 'pending.question'
  | 'showEarlier' | 'showMore' | 'showLess' | 'unread' | 'row.menu' | 'row.newSession'
  | 'status.running' | 'status.idle'
  | 'search.open' | 'search.placeholder' | 'search.empty' | 'search.archived'
  | 'search.results' | 'search.pending' | 'search.hasMore' | 'search.unarchive'
  | 'addWorkspace' | 'addFailed' | 'dismiss'
  | 'ws.rename' | 'ws.delete' | 'ws.deleteConfirm' | 'common.cancel'
  | 'ws.menu' | 'ws.newSession' | 'ws.sessions' | 'ws.path' | 'ws.pathCopied'
  | 'card.created' | 'date.ymd'
  | 'time.now' | 'time.minute' | 'time.hour' | 'time.day';

/** Copy for the officially shipped Chinese and English locales. */
export const DICTIONARIES = {
  zh: {
    'tab.workspaces': '工作区',
    'tab.status': '状态',
    'group.needsInput': '待处理',
    'group.working': '进行中',
    'group.completed': '已完成',
    'group.pinned': '已置顶',
    ungrouped: '未分组',
    empty: '还没有会话',
    emptyHint: '用上方的新建会话开始工作。',
    loading: '正在载入会话…',
    'pending.approval': '等待批准',
    'pending.planReview': '计划待审',
    'pending.question': '等待回答',
    showEarlier: '显示更早的',
    showMore: '显示更多',
    showLess: '收起',
    unread: '未查看',
    'row.menu': '会话操作',
    'row.newSession': '新建会话',
    'status.running': '进行中',
    'status.idle': '空闲',
    'search.open': '搜索会话',
    'search.placeholder': '搜索标题、目录或对话内容',
    'search.empty': '没有匹配的会话',
    'search.archived': '已归档，恢复后才能打开',
    'search.results': '搜索结果',
    'search.pending': '正在搜索会话历史…',
    'search.hasMore': '仅显示前 {n} 条结果，请缩小搜索范围。',
    'search.unarchive': '恢复会话',
    addWorkspace: '添加工作区',
    addFailed: '添加工作区失败',
    dismiss: '关闭',
    'ws.rename': '重命名工作区',
    'ws.delete': '移除工作区',
    'ws.deleteConfirm': '移除该工作区？会话与目录都会保留。',
    'ws.menu': '工作区操作',
    'ws.newSession': '在此工作区新建会话',
    'ws.sessions': '{n} 个会话',
    'ws.path': '工作区目录',
    'ws.pathCopied': '已复制路径',
    'common.cancel': '取消',
    'card.created': '创建于 {time}',
    'date.ymd': '{y}年{m}月{d}日',
    'time.now': '刚刚',
    'time.minute': '{n} 分钟前',
    'time.hour': '{n} 小时前',
    'time.day': '{n} 天前',
  },
  en: {
    'tab.workspaces': 'Workspaces',
    'tab.status': 'Status',
    'group.needsInput': 'Needs input',
    'group.working': 'Working',
    'group.completed': 'Completed',
    'group.pinned': 'Pinned',
    ungrouped: 'Ungrouped',
    empty: 'No sessions yet',
    emptyHint: 'Start one with New Session above.',
    loading: 'Loading sessions…',
    'pending.approval': 'Waiting for approval',
    'pending.planReview': 'Plan awaiting review',
    'pending.question': 'Waiting for answer',
    showEarlier: 'Show earlier',
    showMore: 'Show more',
    showLess: 'Show less',
    unread: 'Unseen',
    'row.menu': 'Session actions',
    'row.newSession': 'New Session',
    'status.running': 'Working',
    'status.idle': 'Idle',
    'search.open': 'Search sessions',
    'search.placeholder': 'Search titles, Workspaces, or conversation content',
    'search.empty': 'No matching sessions',
    'search.archived': 'Archived — restore it to open it',
    'search.results': 'Search results',
    'search.pending': 'Searching session history…',
    'search.hasMore': 'Showing the first {n} results. Narrow your search.',
    'search.unarchive': 'Restore session',
    addWorkspace: 'Add workspace',
    addFailed: 'Could not add the workspace',
    dismiss: 'Dismiss',
    'ws.rename': 'Rename workspace',
    'ws.delete': 'Remove workspace',
    'ws.deleteConfirm': 'Remove this workspace? Its Sessions and directory stay.',
    'ws.menu': 'Workspace actions',
    'ws.newSession': 'New Session in this Workspace',
    'ws.sessions': '{n} sessions',
    'ws.path': 'Workspace directory',
    'ws.pathCopied': 'Path copied',
    'common.cancel': 'Cancel',
    'card.created': 'Created {time}',
    'date.ymd': '{y}-{m}-{d}',
    'time.now': 'just now',
    'time.minute': '{n}m ago',
    'time.hour': '{n}h ago',
    'time.day': '{n}d ago',
  },
} satisfies Record<'zh' | 'en', Record<LocaleKey, string>>;

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    astrolabe: LocaleKey;
  }
}
