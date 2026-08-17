import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { extractFile } from './extract.js'
import { localAnswer } from './localEngine.js'
import { PROVIDERS, buildMessages, streamCompletion } from './providers.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '80mb' }))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024, files: 25 },
})

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    engine: 'lumen',
    providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label, models: p.models, vision: p.vision })),
    time: new Date().toISOString(),
  })
})

/** رفع الملفات واستخراج محتواها */
app.post('/api/upload', upload.array('files', 25), async (req, res) => {
  try {
    const files = req.files || []
    const out = []
    for (const f of files) {
      const name = Buffer.from(f.originalname, 'latin1').toString('utf8')
      out.push(await extractFile({ buffer: f.buffer, name, mime: f.mimetype }))
    }
    res.json({ ok: true, files: out })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message || err) })
  }
})

/** الدردشة — بثّ SSE */
app.post('/api/chat', async (req, res) => {
  const { message = '', files = [], history = [], settings = {} } = req.body || {}

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  const ac = new AbortController()
  // ملاحظة: يجب الاستماع إلى إغلاق الاستجابة وليس الطلب — فـ req يُغلق فور استهلاك الجسم.
  res.on('close', () => ac.abort())

  const { provider, apiKey, model, baseUrl, temperature } = settings
  const useRemote = Boolean(apiKey && provider)

  if (useRemote) {
    try {
      const cfg = PROVIDERS[provider] || PROVIDERS.custom
      send('meta', { engine: `${cfg.label} · ${model || cfg.models[0] || 'default'}` })
      const messages = buildMessages({ history, message, files, vision: cfg.vision })
      let got = false
      await streamCompletion({
        provider, apiKey, model, baseUrl, messages, signal: ac.signal,
        temperature: typeof temperature === 'number' ? temperature : 0.7,
        onDelta: (t) => { got = true; send('delta', { t }) },
      })
      if (!got) send('delta', { t: '(لم يُرجع المزوّد أي محتوى)' })
      send('done', { ok: true })
      return res.end()
    } catch (err) {
      if (ac.signal.aborted) return res.end()
      send('warn', { message: `تعذّر الاتصال بالمزوّد: ${String(err?.message || err)} — تم التحويل إلى المحرك المحلي.` })
    }
  }

  // المحرك المحلي — بثّ تدريجي لإحساس حيّ
  try {
    send('meta', { engine: 'المحرك المحلي' })
    const text = localAnswer(message, files, history)
    const chunks = text.match(/[\s\S]{1,14}/g) || []
    for (const c of chunks) {
      if (ac.signal.aborted || res.writableEnded) break
      send('delta', { t: c })
      await new Promise((r) => setTimeout(r, 7))
    }
    send('done', { ok: true })
  } catch (err) {
    send('error', { message: String(err?.message || err) })
  }
  res.end()
})

/** اختبار مفتاح المزوّد */
app.post('/api/verify', async (req, res) => {
  const { provider, apiKey, model, baseUrl } = req.body || {}
  try {
    let out = ''
    await streamCompletion({
      provider, apiKey, model, baseUrl,
      messages: [{ role: 'user', content: 'قل: جاهز' }],
      temperature: 0,
      onDelta: (t) => { out += t },
    })
    res.json({ ok: true, sample: out.slice(0, 120) })
  } catch (err) {
    res.status(400).json({ ok: false, error: String(err?.message || err) })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✦ Lumen API → http://0.0.0.0:${PORT}`)
})
