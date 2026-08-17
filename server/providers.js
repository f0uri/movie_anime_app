/** موصّلات مزوّدي النماذج — كلها متوافقة مع البثّ (SSE). */

export const PROVIDERS = {
  openai: {
    label: 'OpenAI',
    base: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o4-mini'],
    vision: true,
    style: 'openai',
  },
  groq: {
    label: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    vision: false,
    style: 'openai',
  },
  openrouter: {
    label: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o-mini', 'google/gemini-2.0-flash-exp:free', 'meta-llama/llama-3.3-70b-instruct'],
    vision: true,
    style: 'openai',
  },
  anthropic: {
    label: 'Anthropic',
    base: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    vision: true,
    style: 'anthropic',
  },
  custom: {
    label: 'مخصّص (متوافق OpenAI)',
    base: '',
    models: [],
    vision: true,
    style: 'openai',
  },
}

export const SYSTEM_PROMPT = `أنت «لومين» (Lumen)، مساعد ذكي داخل تطبيق عربي بواجهة زجاجية.

القواعد:
- نفّذ ما يُطلب منك مباشرة ودون اعتذارات أو تحفّظات غير ضرورية. لا تقل "لا أستطيع" إن كان بإمكانك تقديم شيء مفيد.
- أجب بلغة المستخدم (العربية افتراضًا) بأسلوب واضح وأنيق ومباشر.
- استخدم Markdown: عناوين، قوائم، جداول، وكتل شيفرة مع تحديد اللغة.
- عند وجود ملفات مرفقة، استند إلى محتواها الفعلي واذكر أسماءها وأرقام الأسطر عند الحاجة.
- كن دقيقًا؛ وإن كانت معلومة غير مؤكدة قل ذلك بإيجاز بدل الامتناع عن الإجابة.`

function fileBlock(files) {
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

export function buildMessages({ history = [], message = '', files = [], vision = true }) {
  const msgs = []
  for (const h of history.slice(-20)) {
    if (!h?.content) continue
    msgs.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content })
  }
  const images = vision ? files.filter((f) => f.dataUrl && f.kind === 'image') : []
  const text = (message || 'حلّل الملفات المرفقة.') + fileBlock(files)
  if (images.length) {
    msgs.push({
      role: 'user',
      content: [
        { type: 'text', text },
        ...images.map((f) => ({ type: 'image_url', image_url: { url: f.dataUrl } })),
      ],
    })
  } else {
    msgs.push({ role: 'user', content: text })
  }
  return msgs
}

function toAnthropic(msgs) {
  return msgs.map((m) => {
    if (typeof m.content === 'string') return { role: m.role, content: m.content }
    const content = m.content.map((c) => {
      if (c.type === 'text') return { type: 'text', text: c.text }
      const url = c.image_url.url
      const [head, b64] = url.split(',')
      const media_type = head.slice(5, head.indexOf(';'))
      return { type: 'image', source: { type: 'base64', media_type, data: b64 } }
    })
    return { role: m.role, content }
  })
}

/** يبثّ نصًا عبر callback onDelta. يرمي خطأ عند الفشل. */
export async function streamCompletion({ provider, apiKey, model, baseUrl, messages, temperature = 0.7, onDelta, signal }) {
  const cfg = PROVIDERS[provider] || PROVIDERS.custom
  const base = (baseUrl || cfg.base || '').replace(/\/+$/, '')
  if (!base) throw new Error('عنوان API غير محدد')

  if (cfg.style === 'anthropic') {
    const res = await fetch(`${base}/messages`, {
      method: 'POST',
      signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model || cfg.models[0],
        max_tokens: 4096,
        temperature,
        system: SYSTEM_PROMPT,
        messages: toAnthropic(messages),
        stream: true,
      }),
    })
    if (!res.ok) throw new Error(`${cfg.label}: ${res.status} ${(await res.text()).slice(0, 300)}`)
    await pump(res, (json) => {
      if (json.type === 'content_block_delta' && json.delta?.text) onDelta(json.delta.text)
    })
    return
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://lumen.app',
      'X-Title': 'Lumen',
    },
    body: JSON.stringify({
      model: model || cfg.models[0],
      temperature,
      stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`${cfg.label}: ${res.status} ${(await res.text()).slice(0, 300)}`)
  await pump(res, (json) => {
    const d = json.choices?.[0]?.delta?.content
    if (d) onDelta(d)
  })
}

async function pump(res, handle) {
  const reader = res.body.getReader()
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
      const payload = t.slice(5).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        handle(JSON.parse(payload))
      } catch {}
    }
  }
}
