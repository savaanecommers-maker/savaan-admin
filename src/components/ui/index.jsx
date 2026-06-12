import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Stat Card ────────────────────────────────────────────────
export function StatCard({ title, value, change, icon: Icon, iconBg, positive = true }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-1 font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
              {positive ? '▲' : '▼'} {change} vs last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
            <Icon size={18} className="text-white" />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────
const BADGE_STYLES = {
  active:      'bg-emerald-100 text-emerald-700',
  inactive:    'bg-slate-100 text-slate-600',
  processing:  'bg-amber-100 text-amber-700',
  confirmed:   'bg-blue-100 text-blue-700',
  shipped:     'bg-purple-100 text-purple-700',
  delivered:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-red-100 text-red-600',
  pending:     'bg-amber-100 text-amber-700',
  paid:        'bg-emerald-100 text-emerald-700',
  failed:      'bg-red-100 text-red-600',
  blocked:     'bg-red-100 text-red-600',
  instock:     'bg-emerald-100 text-emerald-700',
  lowstock:    'bg-amber-100 text-amber-700',
  outofstock:  'bg-red-100 text-red-600',
}

export function Badge({ label }) {
  const key = label?.toLowerCase().replace(/\s/g, '') || 'inactive'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_STYLES[key] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  )
}

// ── Button ────────────────────────────────────────────────────
export function Button({ children, onClick, variant = 'primary', size = 'md', icon: Icon, disabled }) {
  const base = 'inline-flex items-center gap-2 font-semibold rounded-lg transition-all focus:outline-none'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-2.5 text-sm' }
  const variants = {
    primary:   'bg-teal-600 text-white hover:bg-teal-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger:    'bg-red-500 text-white hover:bg-red-600',
    ghost:     'text-slate-600 hover:bg-slate-100',
    outline:   'bg-transparent text-teal-600 border border-teal-300 hover:bg-teal-50',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {Icon && <Icon size={14} />}
      {children}
    </button>
  )
}

// ── Modal ─────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto fade-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-600">{label}</label>}
      <input
        {...props}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-500 transition-colors placeholder:text-slate-400"
      />
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-semibold text-slate-600">{label}</label>}
      <select
        {...props}
        className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-500 transition-colors"
      >
        {children}
      </select>
    </div>
  )
}

// ── Pagination ────────────────────────────────────────────────
export function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null
  const pages = []
  for (let i = 1; i <= Math.min(totalPages, 5); i++) pages.push(i)

  return (
    <div className="flex items-center gap-1 mt-4 justify-end">
      <button onClick={() => onPage(page - 1)} disabled={page === 1}
        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
        <ChevronLeft size={14} />
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onPage(p)}
          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
            p === page ? 'bg-teal-600 text-white' : 'hover:bg-slate-100 text-slate-600'
          }`}>
          {p}
        </button>
      ))}
      {totalPages > 5 && <span className="text-slate-400 text-xs px-1">...</span>}
      {totalPages > 5 && (
        <button onClick={() => onPage(totalPages)}
          className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
            page === totalPages ? 'bg-teal-600 text-white' : 'hover:bg-slate-100 text-slate-600'
          }`}>
          {totalPages}
        </button>
      )}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
        className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 transition-colors">
        <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────
export function Table({ columns, data, onRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map(col => (
              <th key={col.key} className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-12 text-slate-400 text-sm">
                No data found
              </td>
            </tr>
          ) : data.map((row, i) => (
            <tr key={i}
              onClick={() => onRow?.(row)}
              className={`border-b border-slate-100 transition-colors ${onRow ? 'cursor-pointer hover:bg-slate-50' : ''}`}
            >
              {columns.map(col => (
                <td key={col.key} className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

// ── Format helpers ────────────────────────────────────────────
export function formatPrice(amount) {
  if (!amount) return '₹0'
  return '₹' + Number(amount).toLocaleString('en-IN')
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}
