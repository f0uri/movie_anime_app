/**
 * استخراج محتوى الملفات — يعمل بالكامل داخل المتصفح/التطبيق (بدون خادم).
 * هذه النسخة تُستخدم في بناء APK حيث لا يوجد Node.
 */
import type { Attachment } from './store'

const TEXT_EXT = new Set([
  '.txt', '.md', '.markdown', '.rst', '.log', '.csv', '.tsv', '.json', '.jsonl', '.ndjson',
  '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env', '.properties',
  '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.rb', '.php', '.java', '.kt', '.kts',
  '.c', '.h', '.cpp', '.hpp', '.cc', '.cs', '.go', '.rs', '.swift', '.m', '.mm', '.scala',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.sql', '.graphql', '.gql', '.prisma',
  '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte', '.astro',
  '.dart', '.lua', '.pl', '.r', '.jl', '.hs', '.elm', '.ex', '.exs', '.erl', '.clj',
  '.srt', '.vtt', '.ass', '.sub', '.tex', '.bib', '.diff', '.patch', '.gitignore',
  '.dockerfile', '.makefile', '.gradle', '.lock', '.editorconfig', '.http', '.rest',
])
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.avif', '.ico', '.tiff'])
const AUDIO_EXT = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac', '.opus', '.aiff'])
const VIDEO_EXT = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v', '.wmv', '.flv'])

const MAX_CHARS = 220_000
const extOf = (n: string) => {
  const i = n.lastIndexOf('.')
  return i < 0 ? '' : n.slice(i).toLowerCase()
}

export function kindOf(name: string): string {
  const ext = extOf(name)
  if (IMAGE_EXT.has(ext)) return 'image'
  if (AUDIO_EXT.has(ext)) return 'audio'
  if (VIDEO_EXT.has(ext)) return 'video'
  if (['.pdf', '.docx', '.doc', '.rtf', '.epub', '.odt'].includes(ext)) return 'doc'
  if (['.xlsx', '.xls', '.ods', '.csv', '.tsv', '.json'].includes(ext)) return 'data'
  if (['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z'].includes(ext)) return 'archive'
  if (TEXT_EXT.has(ext)) return ['.txt', '.md', '.markdown', '.log', '.rst', '.srt', '.vtt'].includes(ext) ? 'text' : 'code'
  return 'binary'
}

function clamp(text: string) {
  return text.length <= MAX_CHARS
    ? { text, truncated: false }
    : { text: text.slice(0, MAX_CHARS), truncated: true }
}

function looksTextual(buf: Uint8Array) {
  const sample = buf.subarray(0, 4096)
  if (!sample.length) return true
  let bad = 0
  for (const b of sample) if (b === 0 || (b < 9 && b !== 8) || (b > 13 && b < 32 && b !== 27)) bad++
  return bad / sample.length < 0.06
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const fr = new FileReader()
    fr.onload = () => res(String(fr.result))
    fr.onerror = () => rej(fr.error)
    fr.readAsDataURL(file)
  })

function analyzeCsv(text: string) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return {}
  const delim = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : ','
  const headers = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ''))
  return { rows: lines.length - 1, columns: headers.length, headers: headers.slice(0, 40), delimiter: delim === '\t' ? 'tab' : 'comma' }
}

async function extractPdf(buf: ArrayBuffer) {
  const pdfjs: any = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
  const out: string[] = []
  const pages = Math.min(doc.numPages, 300)
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    out.push(tc.items.map((it: any) => it.str).join(' '))
  }
  return { text: out.join('\n\n').trim(), meta: { pages: doc.numPages } }
}

async function extractDocx(buf: ArrayBuffer) {
  const mammoth: any = await import('mammoth/mammoth.browser.js')
  const r = await (mammoth.default || mammoth).extractRawText({ arrayBuffer: buf })
  return { text: String(r.value || '').trim() }
}

async function extractSheet(buf: ArrayBuffer) {
  const XLSX: any = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const parts: string[] = []
  const sheets: any[] = []
  for (const name of wb.SheetNames) {
    const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: '' })
    sheets.push({ name, rows: rows.length, cols: rows.reduce((m, r) => Math.max(m, r.length), 0) })
    parts.push(`### الورقة: ${name}  (${rows.length} صف)`)
    parts.push(rows.slice(0, 400).map((r) => r.join(' | ')).join('\n'))
    if (rows.length > 400) parts.push(`… (+${rows.length - 400} صف إضافي)`)
  }
  return { text: parts.join('\n\n'), meta: { sheets } }
}

async function extractZip(buf: ArrayBuffer) {
  const JSZip: any = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buf)
  const entries: any[] = []
  for (const [p, f] of Object.entries<any>(zip.files)) if (!f.dir) entries.push({ path: p })
  const parts = [`محتويات الأرشيف (${entries.length} ملف):`, entries.slice(0, 300).map((e) => `- ${e.path}`).join('\n')]
  let budget = 120_000
  for (const e of entries) {
    if (budget <= 0) break
    const k = kindOf(e.path)
    if (k !== 'code' && k !== 'text' && k !== 'data') continue
    try {
      const content: string = await zip.files[e.path].async('string')
      const slice = content.slice(0, Math.min(8000, budget))
      budget -= slice.length
      parts.push(`\n\n----- ملف: ${e.path} -----\n${slice}`)
    } catch {}
  }
  return { text: parts.join('\n'), meta: { entries: entries.length, files: entries.slice(0, 300) } }
}

/** يستخرج المحتوى من ملف واحد. لا يرمي استثناءً أبدًا. */
export async function extractFileClient(file: File): Promise<Attachment> {
  const name = file.name
  const ext = extOf(name)
  const kind = kindOf(name)
  const base: Attachment = { name, ext, mime: file.type || '', size: file.size, kind }

  try {
    if (kind === 'image') {
      const dataUrl = await readAsDataUrl(file)
      if (ext === '.svg') {
        const { text, truncated } = clamp(await file.text())
        return { ...base, text, truncated, dataUrl, note: 'صورة متجهية SVG — تم قراءة الشيفرة المصدرية.' }
      }
      return { ...base, dataUrl, note: 'صورة — متاحة للتحليل البصري.' }
    }

    if (ext === '.pdf') {
      const { text, meta } = await extractPdf(await file.arrayBuffer())
      return { ...base, ...clamp(text), meta, note: `PDF بـ ${meta.pages} صفحة.` }
    }

    if (ext === '.docx') {
      const { text } = await extractDocx(await file.arrayBuffer())
      return { ...base, ...clamp(text), note: 'مستند Word.' }
    }

    if (['.xlsx', '.xls', '.ods'].includes(ext)) {
      const { text, meta } = await extractSheet(await file.arrayBuffer())
      return { ...base, ...clamp(text), meta, note: `جدول بيانات (${meta.sheets.length} ورقة).` }
    }

    if (ext === '.zip') {
      const { text, meta } = await extractZip(await file.arrayBuffer())
      return { ...base, ...clamp(text), meta, note: `أرشيف يحتوي ${meta.entries} ملف.` }
    }

    if (ext === '.csv' || ext === '.tsv') {
      const raw = await file.text()
      return { ...base, ...clamp(raw), meta: analyzeCsv(raw), note: 'ملف بيانات جدولي.' }
    }

    if (['.json', '.jsonl', '.ndjson'].includes(ext)) {
      const raw = await file.text()
      let meta: any = {}
      try {
        const p = JSON.parse(raw)
        meta = { valid: true, type: Array.isArray(p) ? 'array' : typeof p, length: Array.isArray(p) ? p.length : Object.keys(p || {}).length }
      } catch {
        meta = { valid: false }
      }
      return { ...base, ...clamp(raw), meta, note: 'ملف JSON.' }
    }

    if (kind === 'audio' || kind === 'video') {
      const dataUrl = file.size < 40 * 1024 * 1024 ? await readAsDataUrl(file) : undefined
      return { ...base, dataUrl, note: `ملف ${kind === 'audio' ? 'صوتي' : 'مرئي'} — ${(file.size / 1048576).toFixed(2)} ميغابايت.` }
    }

    const buf = new Uint8Array(await file.slice(0, 8192).arrayBuffer())
    if (TEXT_EXT.has(ext) || looksTextual(buf)) {
      const raw = await file.text()
      const lines = raw.split('\n').length
      return { ...base, ...clamp(raw), meta: { lines }, note: kind === 'code' ? `شيفرة (${lines} سطر).` : `نص (${lines} سطر).` }
    }

    return { ...base, note: 'ملف ثنائي — لم يُستخرج نص، لكن البيانات الوصفية متاحة.' }
  } catch (err: any) {
    return { ...base, error: String(err?.message || err), note: 'تعذّر الاستخراج الكامل؛ سيتم الاعتماد على البيانات الوصفية.' }
  }
}
