import { useState, useEffect } from 'react'
import { X, KeyRound, Check, Loader2, Sparkles, Moon, Sun, Zap, Type } from 'lucide-react'
import type { Settings } from '../lib/store'

interface ProviderInfo { id: string; label: string; models: string[]; vision: boolean }

export function SettingsSheet({
  settings, onChange, onClose,
}: { settings: Settings; onChange: (s: Settings) => void; onClose: () => void }) {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [local, setLocal] = useState<Settings>(settings)
  const [verify, setVerify] = useState<{ state: 'idle' | 'busy' | 'ok' | 'err'; msg?: string }>({ state: 'idle' })

  useEffect(() => {
    fetch('/api/health').then((r) => r.json()).then((d) => setProviders(d.providers || [])).catch(() => {})
  }, [])

  const set = (patch: Partial<Settings>) => {
    const next = { ...local, ...patch }
    setLocal(next)
    onChange(next)
  }

  const current = providers.find((p) => p.id === local.provider)

  async function test() {
    setVerify({ state: 'busy' })
    try {
      const r = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: local.provider, apiKey: local.apiKey, model: local.model, baseUrl: local.baseUrl }),
      })
      const d = await r.json()
      setVerify(d.ok ? { state: 'ok', msg: d.sample } : { state: 'err', msg: d.error })
    } catch (e: any) {
      setVerify({ state: 'err', msg: String(e?.message || e) })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5"
         style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(16px)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="fade-up glass w-full sm:max-w-lg rounded-t-[30px] sm:rounded-[28px] max-h-[92vh] flex flex-col overflow-hidden">
        <div className="sm:hidden pt-2.5 pb-1 grid place-items-center">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--stroke)' }}>
          <h2 className="text-[17px] font-semibold flex items-center gap-2"><Sparkles size={17} className="text-violet-300" /> الإعدادات</h2>
          <button onClick={onClose} className="press p-2 rounded-xl hover:bg-white/10"><X size={17} /></button>
        </div>

        <div className="overflow-y-auto scroll-area px-5 py-5 space-y-6">
          {/* المظهر */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>المظهر</h3>
            <div className="grid grid-cols-2 gap-2.5">
              {(['dark', 'light'] as const).map((t) => (
                <button key={t} onClick={() => set({ theme: t })}
                  className={`press flex items-center justify-center gap-2 py-3 rounded-2xl hair text-sm ${local.theme === t ? 'bg-white/15 ring-1 ring-violet-400/50' : 'hover:bg-white/8'}`}>
                  {t === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
                  {t === 'dark' ? 'داكن' : 'فاتح'}
                </button>
              ))}
            </div>
            <Row icon={<Type size={14} />} label="حجم الخط">
              <input type="range" min={0.85} max={1.25} step={0.05} value={local.fontScale}
                onChange={(e) => set({ fontScale: +e.target.value })} className="w-32 accent-violet-400" />
              <span className="tabular-nums text-xs w-9 text-end" style={{ color: 'var(--muted)' }}>{Math.round(local.fontScale * 100)}%</span>
            </Row>
            <Toggle label="تقليل الحركة" value={local.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
            <Toggle label="الإرسال بمفتاح Enter" value={local.sendOnEnter} onChange={(v) => set({ sendOnEnter: v })} />
          </section>

          {/* المزود */}
          <section className="space-y-3">
            <h3 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>محرّك الذكاء</h3>
            <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              يعمل التطبيق افتراضيًا بمحرك محلي لتحليل الملفات. أضف مفتاح مزوّد لإطلاق القدرات التوليدية الكاملة — يُحفظ المفتاح في متصفحك فقط.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => set({ provider: '', apiKey: '' })}
                className={`press py-2.5 rounded-2xl hair text-[13px] ${!local.provider ? 'bg-white/15 ring-1 ring-violet-400/50' : 'hover:bg-white/8'}`}>
                محلي (بلا مفتاح)
              </button>
              {providers.map((p) => (
                <button key={p.id} onClick={() => set({ provider: p.id, model: p.models[0] || '' })}
                  className={`press py-2.5 rounded-2xl hair text-[13px] ${local.provider === p.id ? 'bg-white/15 ring-1 ring-violet-400/50' : 'hover:bg-white/8'}`}>
                  {p.label}
                </button>
              ))}
            </div>

            {local.provider && (
              <div className="space-y-2.5 pt-1">
                <label className="block">
                  <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>مفتاح API</span>
                  <div className="mt-1 flex items-center gap-2 px-3 py-2.5 rounded-2xl hair bg-white/5">
                    <KeyRound size={14} style={{ color: 'var(--muted)' }} />
                    <input type="password" value={local.apiKey} onChange={(e) => set({ apiKey: e.target.value })}
                      placeholder="sk-..." dir="ltr"
                      className="flex-1 bg-transparent outline-none text-[13px] font-mono placeholder:opacity-40" />
                  </div>
                </label>

                {current?.models?.length ? (
                  <label className="block">
                    <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>النموذج</span>
                    <input list="models" value={local.model} onChange={(e) => set({ model: e.target.value })} dir="ltr"
                      className="mt-1 w-full px-3 py-2.5 rounded-2xl hair bg-white/5 outline-none text-[13px] font-mono" />
                    <datalist id="models">{current.models.map((m) => <option key={m} value={m} />)}</datalist>
                  </label>
                ) : (
                  <label className="block">
                    <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>النموذج</span>
                    <input value={local.model} onChange={(e) => set({ model: e.target.value })} dir="ltr" placeholder="model-name"
                      className="mt-1 w-full px-3 py-2.5 rounded-2xl hair bg-white/5 outline-none text-[13px] font-mono" />
                  </label>
                )}

                {local.provider === 'custom' && (
                  <label className="block">
                    <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>عنوان API الأساسي</span>
                    <input value={local.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} dir="ltr"
                      placeholder="https://host/v1"
                      className="mt-1 w-full px-3 py-2.5 rounded-2xl hair bg-white/5 outline-none text-[13px] font-mono" />
                  </label>
                )}

                <Row icon={<Zap size={14} />} label="الإبداع (temperature)">
                  <input type="range" min={0} max={1.5} step={0.1} value={local.temperature}
                    onChange={(e) => set({ temperature: +e.target.value })} className="w-32 accent-violet-400" />
                  <span className="tabular-nums text-xs w-8 text-end" style={{ color: 'var(--muted)' }}>{local.temperature.toFixed(1)}</span>
                </Row>

                <button onClick={test} disabled={!local.apiKey || verify.state === 'busy'}
                  className="press w-full py-3 rounded-2xl text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(100deg,#7c3aed,#0ea5e9)' }}>
                  {verify.state === 'busy' ? <Loader2 size={15} className="animate-spin" /> : verify.state === 'ok' ? <Check size={15} /> : null}
                  {verify.state === 'busy' ? 'جارٍ الاختبار…' : verify.state === 'ok' ? 'الاتصال ناجح' : 'اختبار الاتصال'}
                </button>
                {verify.state === 'err' && <p className="text-[12px] text-rose-300 leading-relaxed break-words">{verify.msg}</p>}
                {verify.state === 'ok' && verify.msg && <p className="text-[12px] text-emerald-300">الرد: {verify.msg}</p>}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: 'var(--muted)' }}>الصيغ المدعومة</h3>
            <div className="flex flex-wrap gap-1.5">
              {['PDF', 'DOCX', 'XLSX', 'CSV', 'JSON', 'ZIP', 'TXT', 'MD', 'PNG/JPG', 'SVG', 'MP3', 'MP4', 'JS/TS', 'PY', 'GO', 'RS', 'SQL', 'HTML/CSS', 'YAML', 'SRT'].map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-lg text-[11px] hair bg-white/5">{t}</span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label, children }: any) {
  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl hair bg-white/5">
      <span className="text-[13px] flex items-center gap-2">{icon}{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="press w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl hair bg-white/5">
      <span className="text-[13px]">{label}</span>
      <span className="relative w-[46px] h-[27px] rounded-full transition-colors duration-300"
        style={{ background: value ? 'linear-gradient(100deg,#7c3aed,#0ea5e9)' : 'rgba(140,140,170,.3)' }}>
        <span className="absolute top-[3px] w-[21px] h-[21px] rounded-full bg-white shadow-md transition-all duration-300"
          style={{ insetInlineStart: value ? 22 : 3 }} />
      </span>
    </button>
  )
}
