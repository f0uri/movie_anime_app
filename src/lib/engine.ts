/**
 * محرك الدردشة في جهة العميل.
 * - في التطبيق (APK) يتصل مباشرة بالمزوّد أو يستخدم المحرك المحلي.
 * - في الويب يمكنه استخدام خادم /api عند توفره.
 */
import { localAnswer } from './localEngine'
import type { Attachment, Settings } from './store'

export const IS_NATIVE = typeof window !== 'undefined' && (
  (window as any).Capacitor?.isNativePlatform?.() === true ||
  location.protocol === 'capacitor:' ||
  location.protocol === 'file:'
)

export const PROVIDERS: Record<string, { label: string; base: string; models: string[]; vision: boolean; style: 'openai' | 'anthropic' }> = {
  openai: { label: 'OpenAI', base: 'https://api.openai.com/v1', models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'], vision: true, style: 'openai' },
  groq: { label: 'Groq', base: 'https://api.groq.com/openai/v1', models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'], vision: false, style: 'openai' },
  openrouter: { label: 'OpenRouter', base: 'https://openrouter.ai/api/v1', models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o-mini', 'google/gemini-2.0-flash-exp:free'], vision: true, style: 'openai' },
  anthropic: { label: 'Anthropic', base: 'https://api.anthropic.com/v1', models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'], vision: true, style: 'anthropic' },
  custom: { label: 'مخصّص (متوافق OpenAI)', base: '', models: [], vision: true, style: 'openai' },
}

const SYSTEM_PROMPT = `أنت «لومين» (Lumen)، مساعد ذكي داخل تطبيق عربي بواجهة زجاجية.

القواعد:
- نفّذ ما يُطلب منك مباشرة ودون اعتذارات أو تحفّظات غير ضرورية.
- أجب بلغة المستخدم (العربية افتراضًا) بأسلوب واضح وأنيق ومباشر.
- استخدم Markdown: عناوين، قوائم، جداول، وكتل شيفرة مع تحديد اللغة.
- عند وجود ملفات مرفقة، استند إلى محتواها الفعلي واذكر أسماءها وأرقام الأسطر عند الحاجة.
- كن دقيقًا؛ وإن كانت معلومة غير مؤكدة قل ذلك بإيجاز بدل الامتناع عن الإجابة.`

function fileBlock(files: Attachment[]) {
  if (!files?.length) return ''
  const parts = ['\n\n<الملفات_المرفقة>']
  for (const f of files) {
    parts.push(`\n--- ملف: ${f.name} (${f.kind}, ${f.size} بايت)${f.note ? ' — ' + f.note : ''} ---`)
    if (f.meta && Object.keys(f.meta).length) parts.push(`بيانات وصفية: ${JSON.stringify(f.meta).slice(0, 800)}`)
    if (f.text) parts.push(f.text.slice(0, 100_000))
    if (f.truncated) parts.push('[… تم اقتطاع بقية الملف]')
  }
  parts.push('\n</الملفات_المرفقة>')
  return parts.join('\n')
}

function buildMessages(history: any[], message: string, files: Attachment[], vision: boolean) {
  const msgs: any[] = []
  for (const h of history.slice(-20)) if (h?.content) msgs.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })
  const images = vision ? files.filter((f) => f.dataUrl && f.kind === 'image') : []
  const text = (message || 'حلّل الملفات المرفقة.') + fileBlock(files)
  if (images.length) {
    msgs.push({ role: 'user', content: [{ type: 'text', text }, ...images.map((f) => ({ type: 'image_url', image_url: { url: f.dataUrl } }))] })
  } else {
    msgs.push({ role: 'user', content: text })
  }
  return msgs
}

function toAnthropic(msgs: any[]) {
  return msgs.map((m) => {
    if (typeof m.content === 'string') return { role: m.role, content: m.content }
    return {
      role: m.role,
      content: m.content.map((c: any) => {
        if (c.type === 'text') return { type: 'text', text: c.text }
        const url = c.image_url.url as string
        const [head, b64] = url.split(',')
        return { type: 'image', source: { type: 'base64', media_type: head.slice(5, head.indexOf(';')), data: b64 } }
      }),
    }
  })
}

async function pump(res: Response, handle: (j: any) => void) {
  const reader = res.body!.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() || ''
    for (const line of lines) {
      const t = line.trim()
      if (!t.startsWith('data:')) continue
      const p = t.slice(5).trim()
      if (!p || p === '[DONE]') continue
      try { handle(JSON.parse(p)) } catch {}
    }
  }
}

export async function streamDirect(opts: {
  settings: Settings; messages: any[]; onDelta: (t: string) => void; signal?: AbortSignal
}) {
  const { settings, messages, onDelta, signal } = opts
  const cfg = PROVIDERS[settings.provider] || PROVIDERS.custom
  const base = (settings.baseUrl || cfg.base).replace(/\/+$/, '')
  if (!base) throw new Error('عنوان API غير محدد')

  if (cfg.style === 'anthropic') {
    const res = await fetch(`${base}/messages`, {
      method: 'POST', signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: settings.model || cfg.models[0], max_tokens: 4096,
        temperature: settings.temperature, system: SYSTEM_PROMPT,
        messages: toAnthropic(messages), stream: true,
      }),
    })
    if (!res.ok) throw new Error(`${cfg.label}: ${res.status} ${(await res.text()).slice(0, 200)}`)
    await pump(res, (j) => { if (j.type === 'content_block_delta' && j.delta?.text) onDelta(j.delta.text) })
    return
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST', signal,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model || cfg.models[0],
      temperature: settings.temperature, stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`${cfg.label}: ${res.status} ${(await res.text()).slice(0, 200)}`)
  await pump(res, (j) => { const d = j.choices?.[0]?.delta?.content; if (d) onDelta(d) })
}

/** الواجهة الموحّدة التي يستدعيها التطبيق. */
export async function runChat(opts: {
  message: string; files: Attachment[]; history: any[]; settings: Settings
  onMeta: (engine: string) => void; onWarn: (m: string) => void
  onDelta: (t: string) => void; signal: AbortSignal
}) {
  const { message, files, history, settings, onMeta, onWarn, onDelta, signal } = opts
  const cfg = PROVIDERS[settings.provider]

  if (settings.provider && settings.apiKey) {
    try {
      onMeta(`${cfg?.label || settings.provider} · ${settings.model || cfg?.models[0] || 'default'}`)
      let got = false
      await streamDirect({
        settings,
        messages: buildMessages(history, message, files, cfg?.vision ?? true),
        onDelta: (t) => { got = true; onDelta(t) },
        signal,
      })
      if (!got) onDelta('(لم يُرجع المزوّد أي محتوى)')
      return
    } catch (e: any) {
      if (signal.aborted) return
      onWarn(`تعذّر الاتصال بالمزوّد: ${e?.message || e} — تم التحويل إلى المحرك المحلي.`)
    }
  }

  onMeta('المحرك المحلي')
  const text = localAnswer(message, files, history)
  const chunks = text.match(/[\s\S]{1,14}/g) || []
  for (const c of chunks) {
    if (signal.aborted) return
    onDelta(c)
    await new Promise((r) => setTimeout(r, 7))
  }
}
