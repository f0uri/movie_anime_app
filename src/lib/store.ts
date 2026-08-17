export type Role = 'user' | 'assistant'

export interface Attachment {
  name: string
  ext: string
  mime: string
  size: number
  kind: string
  text?: string
  dataUrl?: string
  note?: string
  meta?: any
  truncated?: boolean
  error?: string
}

export interface Message {
  id: string
  role: Role
  content: string
  files?: Attachment[]
  engine?: string
  at: number
  streaming?: boolean
  warn?: string
}

export interface Chat {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  pinned?: boolean
}

export interface Settings {
  provider: string
  apiKey: string
  model: string
  baseUrl: string
  temperature: number
  theme: 'dark' | 'light'
  reduceMotion: boolean
  fontScale: number
  sendOnEnter: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  provider: '',
  apiKey: '',
  model: '',
  baseUrl: '',
  temperature: 0.7,
  theme: 'dark',
  reduceMotion: false,
  fontScale: 1,
  sendOnEnter: true,
}

const CHATS_KEY = 'lumen.chats.v1'
const SETTINGS_KEY = 'lumen.settings.v1'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveChats(chats: Chat[]) {
  try {
    // لا نخزّن نصوص الملفات الضخمة أو الصور base64 لتفادي تجاوز الحصة
    const slim = chats.map((c) => ({
      ...c,
      messages: c.messages.map((m) => ({
        ...m,
        streaming: false,
        files: m.files?.map((f) => ({
          ...f,
          text: f.text && f.text.length > 4000 ? f.text.slice(0, 4000) : f.text,
          dataUrl: f.dataUrl && f.dataUrl.length > 400_000 ? undefined : f.dataUrl,
        })),
      })),
    }))
    localStorage.setItem(CHATS_KEY, JSON.stringify(slim))
  } catch {}
}

export function loadSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  } catch {}
}

export function newChat(): Chat {
  const now = Date.now()
  return { id: uid(), title: 'محادثة جديدة', messages: [], createdAt: now, updatedAt: now }
}

export function titleFrom(text: string, files?: Attachment[]) {
  const t = (text || '').trim().replace(/\s+/g, ' ')
  if (t) return t.length > 38 ? t.slice(0, 38) + '…' : t
  if (files?.length) return files[0].name.slice(0, 38)
  return 'محادثة جديدة'
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
  return `${(n / 1073741824).toFixed(2)} GB`
}

export function relTime(ts: number) {
  const d = Date.now() - ts
  const m = Math.floor(d / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `قبل ${m} د`
  const h = Math.floor(m / 60)
  if (h < 24) return `قبل ${h} س`
  const day = Math.floor(h / 24)
  if (day === 1) return 'أمس'
  if (day < 7) return `قبل ${day} أيام`
  return new Date(ts).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
}
