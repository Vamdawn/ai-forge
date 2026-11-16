/** Keys the Sidebar Plus client namespace serves. */
export type LocaleKey =
  | 'tab.workspaces' | 'tab.status'
  | 'groupBy.label' | 'groupBy.tree' | 'groupBy.flat' | 'groupBy.shortcuts'
  | 'viewOptions.label' | 'orderBy.label' | 'orderBy.manual' | 'orderBy.updated'
  | 'archive.label' | 'archive.default' | 'archive.show' | 'archive.only'
  | 'settings.sidebarPlus' | 'settings.first' | 'settings.second' | 'settings.none'
  | 'group.waiting' | 'group.working' | 'group.done' | 'group.idle' | 'group.pinned'
  | 'ungrouped' | 'empty' | 'emptyHint' | 'loading'
  | 'pending.approval' | 'pending.planReview' | 'pending.question'
  | 'showMore' | 'showLess' | 'unread' | 'row.menu' | 'row.newSession'
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
    'groupBy.label': '分组方式',
    'groupBy.tree': '工作区树',
    'groupBy.flat': '单列表',
    'groupBy.shortcuts': '快捷分组',
    'viewOptions.label': '视图选项',
    'orderBy.label': '排序方式',
    'orderBy.manual': '手动排序',
    'orderBy.updated': '最近更新',
    'archive.label': '筛选会话',
    'archive.default': '隐藏已归档',
    'archive.show': '全部对话（显示已归档）',
    'archive.only': '仅显示已归档',
    'settings.sidebarPlus': 'Sidebar Plus',
    'settings.first': '第一项',
    'settings.second': '第二项',
    'settings.none': '不显示',
    'group.waiting': '待输入',
    'group.working': '进行中',
    'group.done': '已完成',
    'group.idle': '空闲',
    'group.pinned': '已置顶',
    ungrouped: '未分组',
    empty: '还没有会话',
    emptyHint: '用上方的新建会话开始工作。',
    loading: '正在载入会话…',
    'pending.approval': '等待批准',
    'pending.planReview': '计划待审',
    'pending.question': '等待回答',
    showMore: '再显示 {n} 个会话',
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
    'groupBy.label': 'Group by',
    'groupBy.tree': 'Workspace Tree',
    'groupBy.flat': 'In one list',
    'groupBy.shortcuts': 'Grouping shortcuts',
    'viewOptions.label': 'View options',
    'orderBy.label': 'Order by',
    'orderBy.manual': 'Manual',
    'orderBy.updated': 'Last updated',
    'archive.label': 'Filter sessions',
    'archive.default': 'Hide archived',
    'archive.show': 'All conversations (show archived)',
    'archive.only': 'Archived only',
    'settings.sidebarPlus': 'Sidebar Plus',
    'settings.first': 'First shortcut',
    'settings.second': 'Second shortcut',
    'settings.none': 'Hide',
    'group.waiting': 'Waiting',
    'group.working': 'Working',
    'group.done': 'Done',
    'group.idle': 'Idle',
    'group.pinned': 'Pinned',
    ungrouped: 'Ungrouped',
    empty: 'No sessions yet',
    emptyHint: 'Start one with New Session above.',
    loading: 'Loading sessions…',
    'pending.approval': 'Waiting for approval',
    'pending.planReview': 'Plan awaiting review',
    'pending.question': 'Waiting for answer',
    showMore: 'Show {n} more sessions',
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
    'sidebar-plus': LocaleKey;
  }
}
