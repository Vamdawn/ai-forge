import type { RenameReason } from './protocol.js'

export type ErrorKey = `error.${RenameReason}`
export type LocaleKey = 'rename' | 'pending' | 'success' | 'error' | ErrorKey

export const dictionaries = {
  zh: {
    rename: '根据上下文重命名', pending: '正在根据会话上下文生成名称…',
    success: '会话已重命名为：{title}', error: '重命名失败：{message}',
    'error.invalid-request': '无效的会话改名请求。',
    'error.session-not-open': '请重新打开会话后再试。',
    'error.busy': '该会话正在生成名称，请稍候。',
    'error.no-model': '发送消息后再生成会话名称。',
    'error.empty-context': '会话没有可用于命名的文本。',
    'error.model-failed': '模型请求失败，请检查模型配置后重试。',
    'error.incomplete-output': '模型未完整返回标题，请重试。',
    'error.tool-output': '模型返回了工具调用，无法用作标题。',
    'error.empty-title': '模型返回了空标题，请重试。',
    'error.title-changed': '会话名称已被修改，请重新生成。',
    'error.timeout': '生成名称超时，请重试。',
    'error.cancelled': '生成名称已取消。',
    'error.failed': '无法重命名会话，请重试。',
  },
  en: {
    rename: 'Rename from context', pending: 'Generating a name from the conversation…',
    success: 'Session renamed to: {title}', error: 'Rename failed: {message}',
    'error.invalid-request': 'Invalid session rename request.',
    'error.session-not-open': 'Reopen the session and try again.',
    'error.busy': 'A name is already being generated for this session. Please wait.',
    'error.no-model': 'Send a message before generating a name.',
    'error.empty-context': 'The conversation has no text to generate a name from.',
    'error.model-failed': 'The model request failed. Check the model configuration and try again.',
    'error.incomplete-output': 'The model did not return a complete title. Please try again.',
    'error.tool-output': 'The model returned a tool call instead of a title.',
    'error.empty-title': 'The model returned an empty title. Please try again.',
    'error.title-changed': 'The session name has changed. Generate a new name again.',
    'error.timeout': 'Name generation timed out. Please try again.',
    'error.cancelled': 'Name generation was cancelled.',
    'error.failed': 'Could not rename the session. Please try again.',
  },
} satisfies Record<'zh' | 'en', Record<LocaleKey, string>>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    renameSession: LocaleKey
  }
}
