import { useMemo, useState } from 'react'
import { Plus, Search, MessageSquare, Trash2, Settings2, Pin, PinOff, X, Sparkles } from 'lucide-react'
import type { Chat } from '../lib/store'
import { relTime } from '../lib/store'

export function Sidebar({
  chats, activeId, onSelect, onNew, onDelete, onPin, onSettings, open, onClose,
}: {
  chats: Chat[]; activeId: string; onSelect: (id: string) => void; onNew: () => void
  onDelete: (id: string) => void; onPin: (id: string) => void; onSettings: () => void
  open: boolean; onClose: () => void
}) {
  const [q, setQ] = useState('')

  const groups = useMemo(() => {
    const filtered = chats.filter((c) =>
      !q.trim() || c.title.toLowerCase().includes(q.toLowerCase()) ||
      c.messages.some((m) => m.content.toLowerCase().includes(q.toLowerCase())))
    const sorted = [...filtered].sort((a, b) => (+!!b.pinned - +!!a.pinned) || b.updatedAt - a.updatedAt)
    const out: { label: string; items: Chat[] }[] = []
    const push = (label: string, c: Chat) => {
      const g = out.find((x) => x.label === label)
      g ? g.items.push(c) : out.push({ label, items: [c] })
    }
    const day = 86400000
    for (const c of sorted) {
      if (c.pinned) push('مثبّتة', c)
      else {
        const d = Date.now() - c.updatedAt
        push(d < day ? 'اليوم' : d < day * 7 ? 'هذا الأسبوع' : d < day * 30 ? 'هذا الشهر' : 'أقدم', c)
      }
    }
    return out
  }, [chats, q])

  return (
    <>
      {open && <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)' }} onClick={onClose} />}
      <aside className="side-panel" data-open={open ? 'true' : 'false'}>
        <div className="h-full m-2.5 rounded-[26px] glass flex flex-col overflow-hidden">
          <div className="p-3.5 pb-2.5 flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl grid place-items-center shrink-0"
                 style={{ background: 'linear-gradient(135deg,#a78bfa,#38bdf8)' }}>
              <Sparkles size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15px] leading-tight grad">لومين</div>
              <div className="text-[10.5px] leading-tight" style={{ color: 'var(--muted)' }}>مساعد الملفات الذكي</div>
            </div>
            <button onClick={onClose} className="press lg:hidden p-2 rounded-xl hover:bg-white/10"><X size={16} /></button>
          </div>

          <div className="px-3.5 pb-2.5">
            <button onClick={onNew}
              className="press w-full py-2.5 rounded-2xl text-[13.5px] font-medium flex items-center justify-center gap-2 text-white shadow-lg"
              style={{ background: 'linear-gradient(100deg,#7c3aed,#0ea5e9)' }}>
              <Plus size={16} /> محادثة جديدة
            </button>
          </div>

          <div className="px-3.5 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl hair bg-white/5">
              <Search size={14} style={{ color: 'var(--muted)' }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث…"
                className="flex-1 bg-transparent outline-none text-[13px] placeholder:opacity-45 min-w-0" />
              {q && <button onClick={() => setQ('')} className="press p-0.5 opacity-60"><X size={13} /></button>}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scroll-area px-2.5 pb-2">
            {groups.length === 0 && (
              <p className="text-center text-[12.5px] py-10" style={{ color: 'var(--muted)' }}>
                {q ? 'لا نتائج' : 'لا محادثات بعد'}
              </p>
            )}
            {groups.map((g) => (
              <div key={g.label} className="mb-2">
                <div className="px-2.5 py-1.5 text-[10.5px] font-semibold tracking-wider" style={{ color: 'var(--muted)' }}>{g.label}</div>
                {g.items.map((c) => (
                  <div key={c.id}
                    onClick={() => { onSelect(c.id); onClose() }}
                    className={`group press cursor-pointer flex items-center gap-2 px-2.5 py-2 rounded-2xl mb-0.5 ${c.id === activeId ? 'bg-white/12 ring-1 ring-white/12' : 'hover:bg-white/7'}`}>
                    <MessageSquare size={14} className="shrink-0 opacity-55" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[13px] leading-tight">{c.title}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
                        {relTime(c.updatedAt)} · {c.messages.length} رسالة
                      </div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); onPin(c.id) }} className="press p-1.5 rounded-lg hover:bg-white/15" title="تثبيت">
                        {c.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDelete(c.id) }} className="press p-1.5 rounded-lg hover:bg-rose-500/25" title="حذف">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="p-2.5 border-t" style={{ borderColor: 'var(--stroke)' }}>
            <button onClick={onSettings} className="press w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl hover:bg-white/8 text-[13px]">
              <Settings2 size={15} /> الإعدادات
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
