import { useRef, useEffect, useCallback } from 'react'

// Toolbar button
function ToolBtn({ title, active, onMouseDown, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      className={`px-2 py-1 rounded text-sm font-medium transition-colors select-none
        ${active
          ? 'bg-teal-500 text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <span className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
}

export default function RichTextEditor({ value, onChange, placeholder = 'Enter description...' }) {
  const editorRef = useRef(null)
  const isInternalUpdate = useRef(false)

  // Sync external value → editor (only when not typing)
  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    if (isInternalUpdate.current) return
    // Avoid resetting cursor if content is same
    if (el.innerHTML !== (value || '')) {
      el.innerHTML = value || ''
    }
  }, [value])

  const exec = useCallback((command, val = null) => {
    editorRef.current?.focus()
    document.execCommand(command, false, val)
    // Sync back to parent
    isInternalUpdate.current = true
    onChange(editorRef.current?.innerHTML || '')
    setTimeout(() => { isInternalUpdate.current = false }, 0)
  }, [onChange])

  const handleInput = useCallback(() => {
    isInternalUpdate.current = true
    onChange(editorRef.current?.innerHTML || '')
    setTimeout(() => { isInternalUpdate.current = false }, 0)
  }, [onChange])

  const handleKeyDown = useCallback((e) => {
    // Tab → indent
    if (e.key === 'Tab') {
      e.preventDefault()
      exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;')
    }
  }, [exec])

  const btnDown = (command, val = null) => (e) => {
    e.preventDefault()
    exec(command, val)
  }

  const isEmpty = !value || value === '<br>' || value === ''

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden focus-within:border-teal-500 transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">

        {/* Text style */}
        <ToolBtn title="Bold (Ctrl+B)" onMouseDown={btnDown('bold')}><b>B</b></ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" onMouseDown={btnDown('italic')}><i>I</i></ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" onMouseDown={btnDown('underline')}><u>U</u></ToolBtn>
        <ToolBtn title="Strikethrough" onMouseDown={btnDown('strikeThrough')}><s>S</s></ToolBtn>

        <Divider />

        {/* Headings */}
        <ToolBtn title="Heading 2" onMouseDown={btnDown('formatBlock', 'h2')}>
          <span className="text-xs font-bold">H2</span>
        </ToolBtn>
        <ToolBtn title="Heading 3" onMouseDown={btnDown('formatBlock', 'h3')}>
          <span className="text-xs font-bold">H3</span>
        </ToolBtn>
        <ToolBtn title="Normal text" onMouseDown={btnDown('formatBlock', 'p')}>
          <span className="text-xs">P</span>
        </ToolBtn>

        <Divider />

        {/* Lists */}
        <ToolBtn title="Bullet list" onMouseDown={btnDown('insertUnorderedList')}>
          <span className="text-base leading-none">≡</span>
        </ToolBtn>
        <ToolBtn title="Numbered list" onMouseDown={btnDown('insertOrderedList')}>
          <span className="text-xs">1.</span>
        </ToolBtn>

        <Divider />

        {/* Alignment */}
        <ToolBtn title="Align left" onMouseDown={btnDown('justifyLeft')}>
          <span className="text-xs">⬅</span>
        </ToolBtn>
        <ToolBtn title="Align center" onMouseDown={btnDown('justifyCenter')}>
          <span className="text-xs">⬛</span>
        </ToolBtn>
        <ToolBtn title="Align right" onMouseDown={btnDown('justifyRight')}>
          <span className="text-xs">➡</span>
        </ToolBtn>

        <Divider />

        {/* Indent */}
        <ToolBtn title="Indent" onMouseDown={btnDown('indent')}>
          <span className="text-xs">→</span>
        </ToolBtn>
        <ToolBtn title="Outdent" onMouseDown={btnDown('outdent')}>
          <span className="text-xs">←</span>
        </ToolBtn>

        <Divider />

        {/* Clear */}
        <ToolBtn title="Clear formatting" onMouseDown={btnDown('removeFormat')}>
          <span className="text-xs text-red-400">✕</span>
        </ToolBtn>
      </div>

      {/* Editable area */}
      <div className="relative">
        {isEmpty && (
          <span className="absolute top-3 left-3 text-sm text-slate-400 pointer-events-none select-none">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="
            min-h-[140px] max-h-[320px] overflow-y-auto
            px-3 py-3 text-sm text-slate-800 outline-none
            prose prose-sm max-w-none
            [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1
            [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
            [&_li]:my-0.5
            [&_p]:my-1
            [&_b]:font-bold [&_strong]:font-bold
            [&_i]:italic [&_em]:italic
            [&_u]:underline
            [&_s]:line-through
          "
        />
      </div>

      {/* Word count */}
      <div className="px-3 py-1 bg-slate-50 border-t border-slate-100 flex justify-end">
        <span className="text-xs text-slate-400">
          {(value || '').replace(/<[^>]*>/g, '').length} chars
        </span>
      </div>
    </div>
  )
}
