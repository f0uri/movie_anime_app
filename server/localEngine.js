/**
 * المحرك المحلي — يعمل بلا أي مفتاح API.
 * ليس نموذجًا لغويًا؛ إنه محرك تحليل حقيقي للملفات والنصوص:
 * إحصاءات، استخلاص، بحث، تلخيص استخراجي، فحص شيفرة، وتحليل بيانات جدولية.
 */

const AR_STOP = new Set('من في على إلى عن هذا هذه ذلك تلك التي الذي وهو وهي ثم قد كان كانت مع أن إن لا ما هل كل بعض بين بعد قبل عند حتى أو أم لكن حيث كما إذا لم لن هو هي هم نحن أنا أنت به له لها فيه فيها هناك يكون تكون'.split(/\s+/))
const EN_STOP = new Set('the a an and or but if of to in on at for with from by as is are was were be been being this that these those it its they them we you i he she his her not no do does did done have has had will would can could should may might there here what which who whom whose how when where why than then so such'.split(/\s+/))

const norm = (s) => s.replace(/[\u064B-\u0652\u0640]/g, '').replace(/[إأآا]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')

export function tokenize(text) {
  return norm(text.toLowerCase())
    .split(/[^\p{L}\p{N}_]+/u)
    .filter((w) => w.length > 2 && !AR_STOP.has(w) && !EN_STOP.has(w))
}

export function keywords(text, n = 12) {
  const freq = new Map()
  for (const w of tokenize(text)) freq.set(w, (freq.get(w) || 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
}

function sentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?؟。]|\n)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30)
}

/** TextRank-lite extractive summary */
export function summarize(text, max = 5) {
  const sents = sentences(text)
  if (sents.length <= max) return sents
  const freq = new Map()
  for (const w of tokenize(text)) freq.set(w, (freq.get(w) || 0) + 1)
  const peak = Math.max(1, ...freq.values())
  const scored = sents.map((s, i) => {
    const toks = tokenize(s)
    if (!toks.length) return { s, i, score: 0 }
    let score = toks.reduce((a, w) => a + (freq.get(w) || 0) / peak, 0) / Math.sqrt(toks.length)
    if (i < 3) score *= 1.25
    return { s, i, score }
  })
  return scored.sort((a, b) => b.score - a.score).slice(0, max).sort((a, b) => a.i - b.i).map((x) => x.s)
}

export function textStats(text) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines = text.split('\n')
  const chars = text.length
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length
  const latin = (text.match(/[A-Za-z]/g) || []).length
  return {
    chars,
    words: words.length,
    lines: lines.length,
    paragraphs: text.split(/\n\s*\n/).filter((p) => p.trim()).length,
    sentences: sentences(text).length,
    readMinutes: Math.max(1, Math.round(words.length / 200)),
    lang: arabic > latin ? 'العربية' : latin > 0 ? 'الإنجليزية/لاتينية' : 'غير محدد',
  }
}

function codeReview(text, name = '') {
  const notes = []
  const lines = text.split('\n')
  const long = lines.map((l, i) => [i + 1, l]).filter(([, l]) => l.length > 120)
  if (long.length) notes.push(`**${long.length}** سطر يتجاوز 120 حرفًا (أطولها السطر ${long[0][0]}).`)
  const todos = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /TODO|FIXME|HACK|XXX/i.test(l))
  if (todos.length) notes.push(`**${todos.length}** ملاحظة TODO/FIXME: ${todos.slice(0, 3).map(([n]) => 'س' + n).join('، ')}.`)
  const logs = lines.filter((l) => /console\.log|print\(|System\.out|var_dump|dd\(/.test(l)).length
  if (logs) notes.push(`**${logs}** استدعاء طباعة/تسجيل — يُستحسن إزالتها من الإنتاج.`)
  const secrets = lines.map((l, i) => [i + 1, l]).filter(([, l]) => /(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i.test(l))
  if (secrets.length) notes.push(`⚠️ **${secrets.length}** سر محتمل مكتوب مباشرة في الشيفرة (السطر ${secrets[0][0]}) — انقله إلى متغيرات البيئة.`)
  const fns = (text.match(/\b(function|def|func|fn)\s+\w+|=>\s*\{|class\s+\w+/g) || []).length
  if (fns) notes.push(`تقريبًا **${fns}** دالة/صنف معرّف.`)
  const anyType = (text.match(/:\s*any\b/g) || []).length
  if (anyType) notes.push(`**${anyType}** استخدام للنوع \`any\` — يمكن تضييق الأنواع.`)
  const nesting = Math.max(0, ...lines.map((l) => (l.match(/^\s*/)[0].length / 2) | 0))
  if (nesting > 6) notes.push(`أقصى عمق تداخل ≈ **${nesting}** — فكّر في تفكيك الدوال.`)
  const comments = lines.filter((l) => /^\s*(\/\/|#|\*|\/\*)/.test(l)).length
  notes.push(`نسبة التعليقات: **${((comments / lines.length) * 100).toFixed(1)}%**.`)
  return notes
}

function fileCard(f) {
  const kb = f.size < 1024 ? `${f.size} بايت` : f.size < 1048576 ? `${(f.size / 1024).toFixed(1)} كيلوبايت` : `${(f.size / 1048576).toFixed(2)} ميغابايت`
  return { kb }
}

function describeFile(f) {
  const { kb } = fileCard(f)
  const out = [`### 📄 ${f.name}`, '', `\`${f.ext || '—'}\` · ${kb} · النوع: **${f.kind}**${f.note ? ` · ${f.note}` : ''}`, '']

  if (f.kind === 'image') {
    out.push('صورة مرفوعة ومعروضة في المحادثة. المحرك المحلي يقرأ البيانات الوصفية فقط؛ للتحليل البصري العميق وصّل مزوّد نماذج من الإعدادات (⚙️).')
    return out.join('\n')
  }
  if ((f.kind === 'audio' || f.kind === 'video') && !f.text) {
    out.push('تم استلام الوسائط. مشغّل مدمج متاح في بطاقة الملف داخل المحادثة.')
    return out.join('\n')
  }
  if (f.meta?.entries !== undefined) {
    out.push(`أرشيف يحوي **${f.meta.entries}** ملفًا. أبرزها:`, '')
    out.push((f.meta.files || []).slice(0, 15).map((e) => `- \`${e.path}\``).join('\n'))
    out.push('')
  }
  if (f.meta?.sheets) {
    out.push('| الورقة | صفوف | أعمدة |', '|---|---|---|')
    out.push(f.meta.sheets.map((s) => `| ${s.name} | ${s.rows} | ${s.cols} |`).join('\n'), '')
  }
  if (f.meta?.headers) {
    out.push(`جدول: **${f.meta.rows}** صف × **${f.meta.columns}** عمود.`, '', `الأعمدة: ${f.meta.headers.map((h) => `\`${h}\``).join('، ')}`, '')
  }
  if (!f.text) return out.join('\n')

  const st = textStats(f.text)
  out.push(`**إحصاءات:** ${st.words.toLocaleString('ar-EG')} كلمة · ${st.lines.toLocaleString('ar-EG')} سطر · ${st.chars.toLocaleString('ar-EG')} حرف · لغة غالبة: ${st.lang} · زمن قراءة ≈ ${st.readMinutes} دقيقة`, '')

  if (f.kind === 'code') {
    out.push('**فحص سريع للشيفرة:**', '', ...codeReview(f.text, f.name).map((n) => `- ${n}`), '')
    out.push('**مقتطف:**', '', '```' + (f.ext || '').replace('.', ''), f.text.split('\n').slice(0, 22).join('\n'), '```')
  } else {
    const sum = summarize(f.text, 5)
    if (sum.length) out.push('**خلاصة استخراجية:**', '', ...sum.map((s) => `- ${s}`), '')
    const kw = keywords(f.text, 10)
    if (kw.length) out.push('**كلمات مفتاحية:** ' + kw.map(([w, c]) => `\`${w}\` (${c})`).join(' · '))
  }
  if (f.truncated) out.push('', '> ℹ️ الملف كبير؛ حُلِّل الجزء الأول منه.')
  return out.join('\n')
}

function searchInFiles(query, files) {
  const q = norm(query.toLowerCase())
  const hits = []
  for (const f of files) {
    if (!f.text) continue
    const lines = f.text.split('\n')
    lines.forEach((l, i) => {
      if (norm(l.toLowerCase()).includes(q)) hits.push({ file: f.name, line: i + 1, text: l.trim().slice(0, 200) })
    })
  }
  return hits
}

const HELP = `أنا **لومين**، مساعدك داخل هذا التطبيق. أعمل الآن بـ**المحرك المحلي** (بدون إنترنت أو مفتاح).

**ما أنفّذه فورًا:**
- تحليل أي ملف ترفعه: PDF، Word، Excel، CSV/JSON، ZIP، شيفرة برمجية، نصوص، صور ووسائط.
- \`لخّص\` — خلاصة استخراجية للملفات أو النص.
- \`إحصاء\` — كلمات، أسطر، أحرف، زمن القراءة، اللغة.
- \`كلمات مفتاحية\` — أهم المصطلحات وتكرارها.
- \`فحص الكود\` — أسرار مكشوفة، TODO، أسطر طويلة، تعقيد.
- \`ابحث: كلمة\` — بحث داخل كل الملفات المرفوعة مع أرقام الأسطر.
- \`جدول\` — تحليل بنية الجداول والأعمدة.

**لقدرات نموذج لغوي كامل** (توليد حر، ترجمة، برمجة، رؤية للصور): افتح ⚙️ الإعدادات وأضف مفتاح OpenAI أو Anthropic أو Groq أو OpenRouter — يُخزَّن في متصفحك فقط ويُمرَّر مباشرة للمزوّد.`

/** يولّد ردًا نصيًا (Markdown) من الرسالة والملفات. */
export function localAnswer(message, files = [], history = []) {
  const m = (message || '').trim()
  const low = norm(m.toLowerCase())
  const withText = files.filter((f) => f.text)

  if (!m && files.length) {
    return [`استلمت **${files.length}** ملف. إليك التحليل:`, '', ...files.map(describeFile)].join('\n\n')
  }
  if (!m) return HELP

  if (/^(مساعدة|help|\/help|ماذا تستطيع|شو بتعرف|قدراتك)/.test(low)) return HELP

  if (/^(مرحبا|السلام|اهلا|هلا|hi|hello|hey|صباح|مساء)/.test(low)) {
    return `أهلًا بك 👋\n\nأنا **لومين**. ارفع أي ملف — PDF، Word، Excel، ZIP، شيفرة، صورة — أو اكتب طلبك مباشرة.\n\n${files.length ? `لديك حاليًا **${files.length}** ملف مرفق وجاهز للتحليل.` : 'اكتب `مساعدة` لعرض كل الأوامر.'}`
  }

  const searchMatch = m.match(/^(?:ابحث|بحث|search|find)\s*[:：]?\s*(.+)/i)
  if (searchMatch && withText.length) {
    const q = searchMatch[1].trim()
    const hits = searchInFiles(q, withText)
    if (!hits.length) return `لا توجد نتائج لـ **${q}** في ${withText.length} ملف.`
    const shown = hits.slice(0, 40)
    return [
      `🔍 **${hits.length}** نتيجة لـ \`${q}\`:`, '',
      '| الملف | السطر | المقتطف |', '|---|---|---|',
      shown.map((h) => `| ${h.file} | ${h.line} | \`${h.text.replace(/\|/g, '\\|')}\` |`).join('\n'),
      hits.length > shown.length ? `\n> عُرضت أول ${shown.length} نتيجة من ${hits.length}.` : '',
    ].join('\n')
  }

  const corpus = withText.map((f) => f.text).join('\n\n')

  if (/(لخص|لخّص|تلخيص|ملخص|summar)/.test(low)) {
    if (!corpus) return 'ارفع ملفًا نصيًا (أو الصق نصًا) أولًا ثم اطلب التلخيص.'
    const sum = summarize(corpus, 8)
    const st = textStats(corpus)
    return [`## 📝 ملخّص ${withText.length} ملف`, '', ...sum.map((s, i) => `**${i + 1}.** ${s}`), '', '---', `**المحتوى:** ${st.words.toLocaleString('ar-EG')} كلمة · ${st.sentences} جملة · قراءة ≈ ${st.readMinutes} دقيقة`].join('\n')
  }

  if (/(احصائ|إحصائ|احصاء|إحصاء|عدد الكلمات|stats)/.test(low)) {
    if (!corpus) return 'لا يوجد نص لتحليله بعد.'
    const st = textStats(corpus)
    return ['## 📊 إحصاءات', '', '| المقياس | القيمة |', '|---|---|',
      `| الكلمات | ${st.words.toLocaleString('ar-EG')} |`,
      `| الأحرف | ${st.chars.toLocaleString('ar-EG')} |`,
      `| الأسطر | ${st.lines.toLocaleString('ar-EG')} |`,
      `| الفقرات | ${st.paragraphs.toLocaleString('ar-EG')} |`,
      `| الجمل | ${st.sentences.toLocaleString('ar-EG')} |`,
      `| اللغة الغالبة | ${st.lang} |`,
      `| زمن القراءة | ≈ ${st.readMinutes} دقيقة |`].join('\n')
  }

  if (/(كلمات مفتاح|مفاتيح|keyword|أهم المصطلحات)/.test(low)) {
    if (!corpus) return 'لا يوجد نص لاستخراج الكلمات المفتاحية منه.'
    const kw = keywords(corpus, 20)
    const peak = kw[0]?.[1] || 1
    return ['## 🔑 الكلمات المفتاحية', '', kw.map(([w, c]) => `\`${w}\` ${'▇'.repeat(Math.max(1, Math.round((c / peak) * 14)))} ${c}`).join('\n')].join('\n')
  }

  if (/(فحص|راجع|مراجعة|review|بق|أخطاء).*(كود|شيفرة|code)|code review/.test(low)) {
    const codes = files.filter((f) => f.kind === 'code' && f.text)
    if (!codes.length) return 'ارفع ملفات شيفرة برمجية لأراجعها.'
    return ['## 🧪 مراجعة الشيفرة', '', ...codes.map((f) => [`### ${f.name}`, '', ...codeReview(f.text, f.name).map((n) => `- ${n}`)].join('\n'))].join('\n\n')
  }

  if (/(حلل|تحليل|اشرح الملف|analy)/.test(low) && files.length) {
    return files.map(describeFile).join('\n\n---\n\n')
  }

  if (files.length) {
    return [
      `فهمت طلبك: «${m}»`, '',
      `أعمل حاليًا بالمحرك المحلي، لذا سأعطيك تحليلًا مباشرًا للملفات المرفقة (**${files.length}**):`, '',
      ...files.map(describeFile), '',
      '---',
      '> 💡 لتنفيذ طلبات توليدية حرة (كتابة، ترجمة، برمجة، تحليل صور) — أضف مفتاح مزوّد من ⚙️ الإعدادات وسأنفّذ أي طلب بلا قيود.',
    ].join('\n')
  }

  const st = textStats(m)
  const parts = [`### ردّ المحرك المحلي`, '', `طلبك: «${m}»`, '']
  if (st.words > 40) {
    parts.push('حلّلت نصّك مباشرة:', '', ...summarize(m, 4).map((s) => `- ${s}`), '', `**${st.words}** كلمة · **${st.sentences}** جملة · قراءة ≈ ${st.readMinutes} دقيقة`, '')
  }
  parts.push(
    'المحرك المحلي متخصص في **الملفات والنصوص** ولا يولّد لغة حرة. لديك خياران فوريان:', '',
    '1. **ارفع ملفًا** (📎 أو اسحبه للنافذة) وسأحلّله بالكامل الآن.',
    '2. **وصّل مزوّد نماذج** من ⚙️ الإعدادات (OpenAI / Anthropic / Groq / OpenRouter) لتنفيذ أي طلب توليدي.', '',
    'اكتب `مساعدة` لقائمة الأوامر الكاملة.',
  )
  return parts.join('\n')
}
