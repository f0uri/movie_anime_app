import { memo, useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check, Copy } from 'lucide-react'

function CodeBlock({ children, className }: any) {
  const [copied, setCopied] = useState(false)
  const lang = /language-(\w+)/.exec(className || '')?.[1] || 'text'
  const copy = useCallback(() => {
    navigator.clipboard?.writeText(extractText(children))
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }, [children])

  return (
    <div className="group relative my-3">
      <div className="flex items-center justify-between px-3.5 py-1.5 rounded-t-[16px] glass-soft border-b-0 text-[11px] tracking-wide"
           style={{ color: 'var(--muted)' }} dir="ltr">
        <span className="font-mono uppercase">{lang}</span>
        <button onClick={copy}
          className="press flex items-center gap-1.5 px-2 py-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/10">
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'نُسخ' : 'نسخ'}</span>
        </button>
      </div>
      <pre className="!mt-0 !rounded-t-none"><code className={className}>{children}</code></pre>
    </div>
  )
}

function extractText(node: any): string {
  if (node == null) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractText).join('')
  if (node?.props?.children) return extractText(node.props.children)
  return ''
}

export const Markdown = memo(function Markdown({ content }: { content: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre: ({ children }: any) => {
            const child = Array.isArray(children) ? children[0] : children
            const props = child?.props || {}
            return <CodeBlock className={props.className}>{props.children}</CodeBlock>
          },
          a: (props: any) => <a {...props} target="_blank" rel="noreferrer noopener" />,
          table: (props: any) => (
            <div className="overflow-x-auto scroll-area">
              <table {...props} />
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
