import { useState } from 'react'
import {
  FileText, FileCode2, FileSpreadsheet, FileImage, FileAudio, FileVideo,
  FileArchive, File as FileIcon, X, Eye, AlertTriangle,
} from 'lucide-react'
import type { Attachment } from '../lib/store'
import { formatBytes } from '../lib/store'

const ICONS: Record<string, any> = {
  text: FileText, code: FileCode2, data: FileSpreadsheet, doc: FileText,
  image: FileImage, audio: FileAudio, video: FileVideo, archive: FileArchive, binary: FileIcon,
}
const TINT: Record<string, string> = {
  text: 'from-sky-400/30 to-cyan-400/10',
  code: 'from-violet-400/30 to-fuchsia-400/10',
  data: 'from-emerald-400/30 to-teal-400/10',
  doc: 'from-rose-400/30 to-orange-400/10',
  image: 'from-pink-400/30 to-purple-400/10',
  audio: 'from-amber-400/30 to-yellow-400/10',
  video: 'from-indigo-400/30 to-blue-400/10',
  archive: 'from-lime-400/30 to-green-400/10',
  binary: 'from-slate-400/25 to-slate-300/5',
}

export function FileChip({ file, onRemove, compact }: { file: Attachment; onRemove?: () => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const Icon = ICONS[file.kind] || FileIcon
  const tint = TINT[file.kind] || TINT.binary
  const previewable = Boolean(file.text) || file.kind === 'image' || file.kind === 'audio' || file.kind === 'video'

  return (
    <>
      <div
        className={`group relative flex items-center gap-2.5 rounded-2xl glass-soft press overflow-hidden ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}
        style={{ maxWidth: 260 }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${tint} opacity-60 pointer-events-none`} />
        {file.kind === 'image' && file.dataUrl ? (
          <img src={file.dataUrl} alt="" className="relative w-9 h-9 rounded-xl object-cover shrink-0 hair" />
        ) : (
          <div className="relative w-9 h-9 rounded-xl grid place-items-center shrink-0 bg-white/10 hair">
            <Icon size={17} strokeWidth={1.7} />
          </div>
        )}
        <div className="relative min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-medium leading-tight">{file.name}</div>
          <div className="text-[10.5px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--muted)' }}>
            <span>{formatBytes(file.size)}</span>
            {file.error && <AlertTriangle size={10} className="text-amber-400" />}
            {file.truncated && <span className="opacity-70">· مقتطع</span>}
          </div>
        </div>
        <div className="relative flex items-center gap-0.5 shrink-0">
          {previewable && (
            <button onClick={() => setOpen(true)} className="press p-1.5 rounded-lg hover:bg-white/15 opacity-0 group-hover:opacity-100 transition" title="معاينة">
              <Eye size={14} />
            </button>
          )}
          {onRemove && (
            <button onClick={onRemove} className="press p-1.5 rounded-lg hover:bg-white/15" title="إزالة">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 fade-up" onClick={() => setOpen(false)}
             style={{ background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(14px)' }}>
          <div className="glass rounded-[26px] w-full max-w-3xl max-h-[86vh] flex flex-col overflow-hidden"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--stroke)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={16} />
                <span className="truncate font-medium text-sm">{file.name}</span>
                <span className="text-[11px] shrink-0" style={{ color: 'var(--muted)' }}>{formatBytes(file.size)}</span>
              </div>
              <button onClick={() => setOpen(false)} className="press p-2 rounded-xl hover:bg-white/10"><X size={16} /></button>
            </div>
            <div className="overflow-auto scroll-area p-5">
              {file.kind === 'image' && file.dataUrl && <img src={file.dataUrl} className="max-w-full rounded-2xl mx-auto" />}
              {file.kind === 'audio' && file.dataUrl && <audio src={file.dataUrl} controls className="w-full" />}
              {file.kind === 'video' && file.dataUrl && <video src={file.dataUrl} controls className="w-full rounded-2xl" />}
              {file.text && (
                <pre className="text-[12.5px] leading-relaxed whitespace-pre-wrap font-mono" dir="ltr"
                     style={{ color: 'var(--text)' }}>{file.text.slice(0, 60000)}</pre>
              )}
              {!file.text && file.kind !== 'image' && file.kind !== 'audio' && file.kind !== 'video' && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>{file.note || 'لا توجد معاينة نصية.'}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
