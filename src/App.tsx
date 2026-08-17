import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUp, Paperclip, Square, Copy, Check, RotateCcw, Menu, Sparkles,
  FileUp, Cpu, Loader2, Trash2, ChevronDown,
} from 'lucide-react'
import { Markdown } from './components/Markdown'
import { FileChip } from './components/FileChip'
import { Sidebar } from './components/Sidebar'
import { SettingsSheet } from './components/Settings'
import {
  loadChats, saveChats, loadSettings, saveSettings, newChat, uid, titleFrom,
  type Chat, type Message, type Attachment, type Settings,
} from './lib/store'

const SUGGESTIONS = [
  { icon: '📄', title: 'حلّل مستندًا', text: 'حلّل الملفات المرفقة واستخرج أهم النقاط' },
  { icon: '🧪', title: 'راجع شيفرة', text: 'فحص الكود' },
  { icon: '📝', title: 'لخّص المحتوى', text: 'لخّص' },
  { icon: '🔑', title: 'كلمات مفتاحية', text: 'كلمات مفتاحية' },
]

export default function App() {
  const [initial] = useState<Chat[]>(() => {
    const c = loadChats()
    return c.length ? c : [newChat()]
  })
  const [chats, setChats] = useState<Chat[]>(initial)
  const [activeId, setActiveId] = useState(initial[0].id)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [atBottom, setAtBottom] = useState(true)

  const abortRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dragCount = useRef(0)

  const active = useMemo(() => chats.find((c) => c.id === activeId) || chats[0], [chats, activeId])

  useEffect(() => { if (!activeId && chats[0]) setActiveId(chats[0].id) }, [activeId, chats])
  // حفظ مؤجّل حتى لا نكتب على القرص مع كل حرف أثناء البثّ
  useEffect(() => {
    const t = setTimeout(() => saveChats(chats), 400)
    return () => clearTimeout(t)
  }, [chats])
  useEffect(() => { saveSettings(settings) }, [settings])

  useEffect(() => {
    const r = document.documentElement
    r.dataset.theme = settings.theme
    r.dataset.motion = settings.reduceMotion ? 'reduced' : 'full'
    r.style.fontSize = `${16 * settings.fontScale}px`
  }, [settings.theme, settings.fontScale, settings.reduceMotion])

  const scrollToEnd = useCallback((smooth = true) => {
    endRef.current?.scrollIntoView({ behavior: smooth && !settings.reduceMotion ? 'smooth' : 'auto', block: 'end' })
  }, [settings.reduceMotion])

  useEffect(() => { if (atBottom) scrollToEnd(false) }, [active?.messages.length, atBottom, scrollToEnd])

  // متابعة البثّ بالتمرير التلقائي
  const lastLen = active?.messages[active.messages.length - 1]?.content.length ?? 0
  useEffect(() => { if (atBottom && busy) scrollToEnd(false) }, [lastLen, atBottom, busy, scrollToEnd])

  // تكبير تلقائي لحقل الكتابة (احتياطي لمن لا يدعم field-sizing)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 176) + 'px'
  }, [input])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120)
  }

  const patchChat = useCallback((id: string, fn: (c: Chat) => Chat) => {
    setChats((prev) => prev.map((c) => (c.id === id ? fn(c) : c)))
  }, [])

  /* ---------------- uploads ---------------- */
  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const arr = Array.from(fileList)
    if (!arr.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      arr.forEach((f) => fd.append('files', f))
      const r = await fetch('/api/upload', { method: 'POST', body: fd })
      const d = await r.json()
      if (d.ok) setPending((p) => [...p, ...d.files])
      else alert('تعذّر رفع الملفات: ' + d.error)
    } catch (e: any) {
      alert('خطأ في الرفع: ' + e.message)
    } finally {
      setUploading(false)
    }
  }, [])

  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      dragCount.current++
      setDragging(true)
    }
    const onDragLeave = () => { dragCount.current = Math.max(0, dragCount.current - 1); if (!dragCount.current) setDragging(false) }
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault(); dragCount.current = 0; setDragging(false)
      if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files)
    }
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files || [])
      if (files.length) { e.preventDefault(); uploadFiles(files) }
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
    }
  }, [uploadFiles])

  /* ---------------- send ---------------- */
  const send = useCallback(async (overrideText?: string, resendFiles?: Attachment[]) => {
    const text = (overrideText ?? input).trim()
    const files = resendFiles ?? pending
    if ((!text && !files.length) || busy) return

    const chatId = active.id
    const userMsg: Message = { id: uid(), role: 'user', content: text, files, at: Date.now() }
    const botMsg: Message = { id: uid(), role: 'assistant', content: '', at: Date.now(), streaming: true }

    const history = active.messages.filter((m) => !m.streaming).map((m) => ({ role: m.role, content: m.content }))

    patchChat(chatId, (c) => ({
      ...c,
      title: c.messages.length === 0 ? titleFrom(text, files) : c.title,
      messages: [...c.messages, userMsg, botMsg],
      updatedAt: Date.now(),
    }))
    setInput('')
    setPending([])
    setBusy(true)
    setAtBottom(true)
    requestAnimationFrame(() => scrollToEnd(false))

    const ac = new AbortController()
    abortRef.current = ac

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          message: text,
          files,
          history,
          settings: {
            provider: settings.provider, apiKey: settings.apiKey, model: settings.model,
            baseUrl: settings.baseUrl, temperature: settings.temperature,
          },
        }),
      })
      if (!res.body) throw new Error('لا استجابة من الخادم')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let acc = ''

      const flush = () => patchChat(chatId, (c) => ({
        ...c, updatedAt: Date.now(),
        messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, content: acc } : m)),
      }))

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const frames = buf.split('\n\n')
        buf = frames.pop() || ''
        for (const frame of frames) {
          const ev = /^event: (.+)$/m.exec(frame)?.[1]
          const dataLine = /^data: (.+)$/m.exec(frame)?.[1]
          if (!dataLine) continue
          let data: any
          try { data = JSON.parse(dataLine) } catch { continue }
          if (ev === 'delta') { acc += data.t; flush() }
          else if (ev === 'meta') patchChat(chatId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, engine: data.engine } : m)) }))
          else if (ev === 'warn') patchChat(chatId, (c) => ({ ...c, messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, warn: data.message } : m)) }))
          else if (ev === 'error') { acc += `\n\n> ⚠️ ${data.message}`; flush() }
        }
      }
      patchChat(chatId, (c) => ({
        ...c, messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, content: acc, streaming: false } : m)),
      }))
    } catch (e: any) {
      const msg = e?.name === 'AbortError' ? '\n\n_تم الإيقاف._' : `\n\n> ⚠️ ${e?.message || e}`
      patchChat(chatId, (c) => ({
        ...c, messages: c.messages.map((m) => (m.id === botMsg.id ? { ...m, content: m.content + msg, streaming: false } : m)),
      }))
    } finally {
      setBusy(false)
      abortRef.current = null
      inputRef.current?.focus()
    }
  }, [input, pending, busy, active, settings, patchChat, scrollToEnd])

  const stop = () => abortRef.current?.abort()

  const regenerate = () => {
    const msgs = active.messages
    let i = msgs.length - 1
    while (i >= 0 && msgs[i].role !== 'user') i--
    if (i < 0) return
    const u = msgs[i]
    patchChat(active.id, (c) => ({ ...c, messages: c.messages.slice(0, i) }))
    setTimeout(() => send(u.content, u.files || []), 60)
  }

  const createChat = () => {
    const c = newChat()
    setChats((p) => [c, ...p])
    setActiveId(c.id)
    setPending([])
    setInput('')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const deleteChat = (id: string) => {
    setChats((p) => {
      const next = p.filter((c) => c.id !== id)
      const final = next.length ? next : [newChat()]
      if (id === activeId) setActiveId(final[0].id)
      return final
    })
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      if (settings.sendOnEnter || e.metaKey || e.ctrlKey) { e.preventDefault(); send() }
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); createChat() }
      if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); setShowSettings((v) => !v) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const empty = !active?.messages.length
  const engineLabel = settings.provider && settings.apiKey
    ? `${settings.provider} · ${settings.model || 'افتراضي'}` : 'المحرك المحلي'

  return (
    <div className="h-full flex" dir="rtl">
      <div className="aurora"><span /><span /><span /><span /></div>
      <div className="grain" />

      <Sidebar
        chats={chats} activeId={active?.id || ''} onSelect={setActiveId} onNew={createChat}
        onDelete={deleteChat}
        onPin={(id) => patchChat(id, (c) => ({ ...c, pinned: !c.pinned }))}
        onSettings={() => setShowSettings(true)}
        open={sidebarOpen} onClose={() => setSidebarOpen(false)}
      />

      <main className="relative z-10 flex-1 min-w-0 flex flex-col h-full">
        {/* Top bar */}
        <header className="shrink-0 px-3" style={{ paddingTop: 'calc(var(--safe-t) + 10px)' }}>
          <div className="glass rounded-[22px] px-3 py-2 flex items-center gap-2.5">
            <button onClick={() => setSidebarOpen(true)} className="press lg:hidden p-2 rounded-xl hover:bg-white/10">
              <Menu size={17} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="truncate text-[14px] font-medium leading-tight">{active?.title || 'محادثة'}</div>
              <div className="flex items-center gap-1.5 text-[10.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                <Cpu size={10} />
                <span className="truncate">{engineLabel}</span>
              </div>
            </div>
            {(active?.messages.length ?? 0) > 0 && (
              <button onClick={() => patchChat(active.id, (c) => ({ ...c, messages: [] }))}
                className="press p-2 rounded-xl hover:bg-white/10" title="مسح المحادثة">
                <Trash2 size={16} />
              </button>
            )}
            <button onClick={() => setShowSettings(true)} className="press p-2 rounded-xl hover:bg-white/10" title="الإعدادات">
              <Sparkles size={16} className="text-violet-300" />
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto scroll-area px-3">
          <div className="max-w-3xl mx-auto py-5">
            {empty ? (
              <Welcome onPick={(t) => { setInput(t); inputRef.current?.focus() }} onUpload={() => fileRef.current?.click()} />
            ) : (
              active.messages.map((m) => <Bubble key={m.id} m={m} onRegenerate={regenerate} />)
            )}
            <div ref={endRef} className="h-2" />
          </div>
        </div>

        {/* scroll-to-bottom */}
        {!atBottom && (
          <button onClick={() => { setAtBottom(true); scrollToEnd() }}
            className="press fixed bottom-36 left-1/2 -translate-x-1/2 z-20 glass rounded-full p-2.5 shadow-xl">
            <ChevronDown size={16} />
          </button>
        )}

        {/* Composer */}
        <div className="shrink-0 px-3 pb-3" style={{ paddingBottom: 'calc(var(--safe-b) + 12px)' }}>
          <div className="max-w-3xl mx-auto">
            {pending.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto no-scrollbar pb-0.5 fade-up">
                {pending.map((f, i) => (
                  <div key={i} className="shrink-0">
                    <FileChip file={f} compact onRemove={() => setPending((p) => p.filter((_, j) => j !== i))} />
                  </div>
                ))}
                <button onClick={() => setPending([])}
                  className="press shrink-0 px-3 rounded-2xl glass-soft text-[12px] hover:bg-white/10" style={{ color: 'var(--muted)' }}>
                  مسح الكل
                </button>
              </div>
            )}

            <div className="glass rounded-[26px] p-1.5 flex items-end gap-1.5">
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="press shrink-0 w-10 h-10 rounded-2xl grid place-items-center hover:bg-white/12 disabled:opacity-50"
                title="إرفاق ملفات">
                {uploading ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}
              </button>

              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="اكتب رسالتك أو أفلت ملفًا هنا…"
                className="flex-1 bg-transparent outline-none resize-none py-2.5 px-1 text-[15px] leading-relaxed max-h-44 scroll-area placeholder:opacity-45"
              />

              {busy ? (
                <button onClick={stop} className="press shrink-0 w-10 h-10 rounded-2xl grid place-items-center bg-white/15 hover:bg-white/25" title="إيقاف">
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button onClick={() => send()} disabled={!input.trim() && !pending.length}
                  className="press shrink-0 w-10 h-10 rounded-2xl grid place-items-center text-white disabled:opacity-30 shadow-lg"
                  style={{ background: 'linear-gradient(100deg,#7c3aed,#0ea5e9)' }} title="إرسال">
                  <ArrowUp size={18} strokeWidth={2.4} />
                </button>
              )}
            </div>

            <p className="text-center text-[10.5px] mt-2" style={{ color: 'var(--muted)' }}>
              اسحب وأفلت أو الصق أي ملف · PDF، Word، Excel، ZIP، صور، شيفرة ⌘K محادثة جديدة
            </p>
          </div>
        </div>

        <input ref={fileRef} type="file" multiple hidden
          onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = '' }} />
      </main>

      {dragging && (
        <div className="fixed inset-0 z-50 grid place-items-center pointer-events-none p-8"
             style={{ background: 'rgba(10,10,25,.55)', backdropFilter: 'blur(18px)' }}>
          <div className="glass rounded-[32px] px-14 py-12 text-center fade-up border-2 border-dashed" style={{ borderColor: 'rgba(167,139,250,.6)' }}>
            <FileUp size={44} className="mx-auto mb-4 text-violet-300" />
            <p className="text-lg font-semibold">أفلت الملفات هنا</p>
            <p className="text-[13px] mt-1.5" style={{ color: 'var(--muted)' }}>أي صيغة — سأقرؤها وأحلّلها</p>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsSheet settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

/* ---------------- Welcome ---------------- */
function Welcome({ onPick, onUpload }: { onPick: (t: string) => void; onUpload: () => void }) {
  return (
    <div className="pt-10 pb-6 fade-up">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-[22px] mx-auto mb-4 grid place-items-center shadow-2xl"
             style={{ background: 'linear-gradient(135deg,#a78bfa,#38bdf8)' }}>
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-[26px] font-bold tracking-tight grad">كيف أساعدك اليوم؟</h1>
        <p className="mt-2 text-[13.5px] max-w-md mx-auto leading-relaxed" style={{ color: 'var(--muted)' }}>
          ارفع أي ملف — PDF، Word، Excel، ZIP، صور، أو شيفرة — وسأقرؤه وأحلّله فورًا.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5 max-w-xl mx-auto">
        {SUGGESTIONS.map((s) => (
          <button key={s.title} onClick={() => onPick(s.text)}
            className="press glass-soft rounded-2xl px-4 py-3.5 text-start hover:bg-white/10">
            <div className="text-xl mb-1">{s.icon}</div>
            <div className="text-[13.5px] font-medium">{s.title}</div>
            <div className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>{s.text}</div>
          </button>
        ))}
      </div>

      <button onClick={onUpload}
        className="press mt-3 mx-auto flex items-center gap-2 px-5 py-2.5 rounded-2xl glass-soft text-[13px] hover:bg-white/10">
        <FileUp size={15} /> اختر ملفات من جهازك
      </button>
    </div>
  )
}

/* ---------------- Bubble ---------------- */
function Bubble({ m, onRegenerate }: { m: Message; onRegenerate: () => void }) {
  const [copied, setCopied] = useState(false)
  const isUser = m.role === 'user'

  const copy = () => {
    navigator.clipboard?.writeText(m.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="fade-up mb-5">
      <div className={`w-full flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
          <div className="shrink-0 w-8 h-8 rounded-2xl grid place-items-center mt-0.5 shadow-lg"
               style={{ background: 'linear-gradient(135deg,#a78bfa,#38bdf8)' }}>
            <Sparkles size={14} className="text-white" />
          </div>
        )}

        <div className={`min-w-0 ${isUser ? 'max-w-[85%] ms-auto' : 'flex-1'}`}>
          {m.files && m.files.length > 0 && (
            <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
              {m.files.map((f, i) => <FileChip key={i} file={f} compact />)}
            </div>
          )}

          {m.warn && (
            <div className="mb-2 px-3 py-2 rounded-xl text-[12px] hair bg-amber-400/10 text-amber-200">{m.warn}</div>
          )}

          {(m.content || m.streaming) && (
            <div className={isUser
              ? 'glass rounded-[22px] rounded-tr-lg px-4 py-3 inline-block'
              : 'glass rounded-[22px] rounded-tl-lg px-4 py-3.5'}>
              {m.content ? (
                isUser
                  ? <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                  : (
                    <>
                      <Markdown content={m.content} />
                      {m.streaming && <span className="caret" />}
                    </>
                  )
              ) : (
                <div className="flex items-center gap-2 py-0.5" style={{ color: 'var(--muted)' }}>
                  <span className="dot" /><span className="dot" style={{ animationDelay: '.15s' }} /><span className="dot" style={{ animationDelay: '.3s' }} />
                  <span className="text-[12.5px] shimmer ms-1.5">يفكّر…</span>
                </div>
              )}
            </div>
          )}

          {!isUser && !m.streaming && m.content && (
            <div className="flex items-center gap-1 mt-1.5 ps-1 opacity-55 hover:opacity-100 transition">
              <button onClick={copy} className="press flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-[11px]">
                {copied ? <Check size={12} /> : <Copy size={12} />}{copied ? 'نُسخ' : 'نسخ'}
              </button>
              <button onClick={onRegenerate} className="press flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 text-[11px]">
                <RotateCcw size={12} /> إعادة
              </button>
              {m.engine && <span className="text-[10.5px] ms-1" style={{ color: 'var(--muted)' }}>· {m.engine}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
