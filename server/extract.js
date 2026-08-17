import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

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

export const KIND = { TEXT: 'text', CODE: 'code', DATA: 'data', DOC: 'doc', IMAGE: 'image', AUDIO: 'audio', VIDEO: 'video', ARCHIVE: 'archive', BINARY: 'binary' }

export function kindOf(name) {
  const ext = path.extname(name).toLowerCase()
  if (IMAGE_EXT.has(ext)) return KIND.IMAGE
  if (AUDIO_EXT.has(ext)) return KIND.AUDIO
  if (VIDEO_EXT.has(ext)) return KIND.VIDEO
  if (ext === '.pdf' || ext === '.docx' || ext === '.doc' || ext === '.rtf' || ext === '.epub' || ext === '.odt') return KIND.DOC
  if (ext === '.xlsx' || ext === '.xls' || ext === '.ods' || ext === '.csv' || ext === '.tsv' || ext === '.json') return KIND.DATA
  if (ext === '.zip' || ext === '.tar' || ext === '.gz' || ext === '.tgz' || ext === '.rar' || ext === '.7z') return KIND.ARCHIVE
  if (TEXT_EXT.has(ext)) {
    if (['.txt', '.md', '.markdown', '.log', '.rst', '.srt', '.vtt'].includes(ext)) return KIND.TEXT
    return KIND.CODE
  }
  return KIND.BINARY
}

function looksTextual(buf) {
  const sample = buf.subarray(0, 4096)
  if (!sample.length) return true
  let bad = 0
  for (const b of sample) if (b === 0 || (b < 9 && b !== 8) || (b > 13 && b < 32 && b !== 27)) bad++
  return bad / sample.length < 0.06
}

const MAX_CHARS = 220_000

function clamp(text) {
  if (text.length <= MAX_CHARS) return { text, truncated: false }
  return { text: text.slice(0, MAX_CHARS), truncated: true }
}

async function extractPdf(buf) {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js')
  const r = await pdfParse(buf)
  return { text: (r.text || '').trim(), meta: { pages: r.numpages, info: r.info || {} } }
}

async function extractDocx(buf) {
  const mammoth = (await import('mammoth')).default
  const r = await mammoth.extractRawText({ buffer: buf })
  return { text: (r.value || '').trim(), meta: {} }
}

async function extractSheet(buf, name) {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true })
  const parts = []
  const sheets = []
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' })
    sheets.push({ name: sheetName, rows: rows.length, cols: rows.reduce((m, r) => Math.max(m, r.length), 0) })
    parts.push(`### الورقة: ${sheetName}  (${rows.length} صف)`)
    parts.push(rows.slice(0, 400).map((r) => r.join(' | ')).join('\n'))
    if (rows.length > 400) parts.push(`… (+${rows.length - 400} صف إضافي)`) // truncate huge sheets
  }
  return { text: parts.join('\n\n'), meta: { sheets } }
}

async function extractZip(buf) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(buf)
  const entries = []
  const parts = []
  let budget = 120_000
  for (const [p, f] of Object.entries(zip.files)) {
    if (f.dir) continue
    entries.push({ path: p, size: f._data?.uncompressedSize ?? 0 })
  }
  parts.push(`محتويات الأرشيف (${entries.length} ملف):`)
  parts.push(entries.slice(0, 300).map((e) => `- ${e.path}`).join('\n'))
  for (const e of entries) {
    if (budget <= 0) break
    const k = kindOf(e.path)
    if (k !== KIND.CODE && k !== KIND.TEXT && k !== KIND.DATA) continue
    try {
      const content = await zip.files[e.path].async('string')
      const slice = content.slice(0, Math.min(8000, budget))
      budget -= slice.length
      parts.push(`\n\n----- ملف: ${e.path} -----\n${slice}`)
    } catch {}
  }
  return { text: parts.join('\n'), meta: { entries: entries.length, files: entries.slice(0, 300) } }
}

function analyzeCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) return {}
  const delim = (lines[0].match(/\t/g) || []).length > (lines[0].match(/,/g) || []).length ? '\t' : ','
  const headers = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ''))
  return { rows: lines.length - 1, columns: headers.length, headers: headers.slice(0, 40), delimiter: delim === '\t' ? 'tab' : 'comma' }
}

/** Extract usable content from an uploaded buffer. Never throws. */
export async function extractFile({ buffer, name, mime }) {
  const ext = path.extname(name).toLowerCase()
  const kind = kindOf(name)
  const base = { name, ext, mime: mime || '', size: buffer.length, kind }

  try {
    if (kind === KIND.IMAGE) {
      const dataUrl = `data:${mime || guessImageMime(ext)};base64,${buffer.toString('base64')}`
      if (ext === '.svg') {
        const { text } = clamp(buffer.toString('utf8'))
        return { ...base, text, dataUrl, note: 'صورة متجهية SVG — تم قراءة الشيفرة المصدرية.' }
      }
      return { ...base, text: '', dataUrl, note: 'صورة — متاحة للتحليل البصري.' }
    }

    if (ext === '.pdf') {
      const { text, meta } = await extractPdf(buffer)
      const c = clamp(text)
      return { ...base, ...c, meta, note: `PDF بـ ${meta.pages} صفحة.` }
    }

    if (ext === '.docx') {
      const { text } = await extractDocx(buffer)
      return { ...base, ...clamp(text), note: 'مستند Word.' }
    }

    if (['.xlsx', '.xls', '.ods'].includes(ext)) {
      const { text, meta } = await extractSheet(buffer, name)
      return { ...base, ...clamp(text), meta, note: `جدول بيانات (${meta.sheets.length} ورقة).` }
    }

    if (['.zip'].includes(ext)) {
      const { text, meta } = await extractZip(buffer)
      return { ...base, ...clamp(text), meta, note: `أرشيف يحتوي ${meta.entries} ملف.` }
    }

    if (ext === '.csv' || ext === '.tsv') {
      const raw = buffer.toString('utf8')
      return { ...base, ...clamp(raw), meta: analyzeCsv(raw), note: 'ملف بيانات جدولي.' }
    }

    if (ext === '.json' || ext === '.jsonl' || ext === '.ndjson') {
      const raw = buffer.toString('utf8')
      let meta = {}
      try {
        const parsed = JSON.parse(raw)
        meta = { valid: true, type: Array.isArray(parsed) ? 'array' : typeof parsed, length: Array.isArray(parsed) ? parsed.length : Object.keys(parsed || {}).length }
      } catch {
        meta = { valid: false }
      }
      return { ...base, ...clamp(raw), meta, note: 'ملف JSON.' }
    }

    if (kind === KIND.AUDIO || kind === KIND.VIDEO) {
      return { ...base, text: '', note: `ملف ${kind === KIND.AUDIO ? 'صوتي' : 'مرئي'} — تم تسجيل البيانات الوصفية (${(buffer.length / 1048576).toFixed(2)} ميغابايت).` }
    }

    if (TEXT_EXT.has(ext) || looksTextual(buffer)) {
      const raw = buffer.toString('utf8')
      const lines = raw.split('\n').length
      return { ...base, ...clamp(raw), meta: { lines }, note: kind === KIND.CODE ? `شيفرة (${lines} سطر).` : `نص (${lines} سطر).` }
    }

    return { ...base, text: '', note: 'ملف ثنائي — لم يُستخرج نص، لكن البيانات الوصفية متاحة.' }
  } catch (err) {
    return { ...base, text: '', error: String(err?.message || err), note: 'تعذّر الاستخراج الكامل؛ سيتم الاعتماد على البيانات الوصفية.' }
  }
}

function guessImageMime(ext) {
  return { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.bmp': 'image/bmp' }[ext] || 'application/octet-stream'
}
