import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Table, Badge, Button, Modal, Card, formatDate } from '../components/ui/index'
import api from '../config/api'
import { RefreshCw, Eye, ChevronDown } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: '',          label: 'All Statuses' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved',  label: 'Approved' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'refunded',  label: 'Refunded' },
  { value: 'completed', label: 'Completed' },
]

const NEXT_STATUSES = {
  requested: ['approved', 'rejected'],
  approved:  ['picked_up', 'rejected'],
  picked_up: ['refunded'],
  refunded:  ['completed'],
  rejected:  [],
  completed: [],
}

const STATUS_BADGE_MAP = {
  requested: 'pending',
  approved:  'active',
  rejected:  'cancelled',
  picked_up: 'processing',
  refunded:  'paid',
  completed: 'delivered',
}

function StatusBadge({ status }) {
  const labels = {
    requested: 'Requested',
    approved:  'Approved',
    rejected:  'Rejected',
    picked_up: 'Picked Up',
    refunded:  'Refunded',
    completed: 'Completed',
  }
  return <Badge label={labels[status] ?? status} />
}

export default function Returns() {
  const [returns, setReturns]   = useState([])
  const [counts, setCounts]     = useState({})
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [loadError, setLoadError] = useState('')

  useEffect(() => { load() }, [statusFilter])

  async function load() {
    setLoading(true)
    setLoadError('')
    const params = statusFilter ? `?status=${statusFilter}` : ''
    const res = await api.get(`/api/returns${params}`)
    if (res.error) {
      setLoadError('Failed to load return requests. Please try again.')
    } else {
      setReturns(res.data?.returns ?? [])
      setCounts(res.data?.counts ?? {})
      setTotal(res.data?.total ?? 0)
    }
    setLoading(false)
  }

  async function openDetail(row) {
    setSelected(row)
    setAdminNotes(row.admin_notes ?? '')
    setDetailOpen(true)
  }

  async function updateStatus(returnId, newStatus) {
    setUpdating(true)
    const res = await api.put(`/api/returns/${returnId}/status`, {
      status: newStatus,
      admin_notes: adminNotes || undefined,
    })
    setUpdating(false)
    if (res.error) {
      alert('Failed to update return status: ' + (res.error?.message || res.error))
      return
    }
    await load()
    if (selected?.id === returnId) {
      setSelected(prev => prev ? { ...prev, status: newStatus, admin_notes: adminNotes || prev.admin_notes } : prev)
    }
  }

  const summaryCards = [
    { label: 'Pending Review', value: (counts.requested ?? 0), color: 'text-amber-600' },
    { label: 'Approved',       value: (counts.approved  ?? 0), color: 'text-blue-600' },
    { label: 'Refunded',       value: (counts.refunded  ?? 0), color: 'text-emerald-600' },
    { label: 'Rejected',       value: (counts.rejected  ?? 0), color: 'text-red-600' },
  ]

  const cols = [
    {
      key: 'order_number', label: 'Order',
      render: v => <span className="font-semibold text-teal-600 text-xs">{v}</span>
    },
    {
      key: 'customer_name', label: 'Customer',
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{v}</p>
          <p className="text-xs text-slate-400">{row.customer_email}</p>
        </div>
      )
    },
    {
      key: 'items', label: 'Products',
      render: v => {
        if (!v?.length) return <span className="text-xs text-slate-400">—</span>
        return (
          <div className="text-xs text-slate-600 space-y-0.5">
            {v.slice(0, 2).map((item, i) => (
              <div key={i}>{item.product_name} ×{item.quantity}</div>
            ))}
            {v.length > 2 && <div className="text-slate-400">+{v.length - 2} more</div>}
          </div>
        )
      }
    },
    {
      key: 'reason', label: 'Reason',
      render: v => <span className="text-xs text-slate-700">{v}</span>
    },
    {
      key: 'created_at', label: 'Date',
      render: v => <span className="text-xs text-slate-500">{formatDate(v)}</span>
    },
    {
      key: 'status', label: 'Status',
      render: v => <StatusBadge status={v} />
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" icon={Eye} onClick={() => openDetail(row)}>
            View
          </Button>
          {NEXT_STATUSES[row.status]?.length > 0 && (
            <select
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
              value=""
              onChange={e => e.target.value && updateStatus(row.id, e.target.value)}
            >
              <option value="">Update status</option>
              {NEXT_STATUSES[row.status].map(s => (
                <option key={s} value={s}>
                  {STATUS_OPTIONS.find(o => o.value === s)?.label ?? s}
                </option>
              ))}
            </select>
          )}
        </div>
      )
    },
  ]

  return (
    <Layout title="Returns & Refunds">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {summaryCards.map(s => (
          <Card key={s.label} className="p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
        <Button size="sm" variant="secondary" icon={RefreshCw} onClick={load}>
          Refresh
        </Button>
        <span className="ml-auto text-xs text-slate-400">{total} total</span>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-red-500 font-medium text-sm">{loadError}</p>
            <button onClick={load} className="mt-3 text-xs text-teal-600 underline">Try again</button>
          </div>
        ) : returns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <RefreshCw size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No return requests</p>
            <p className="text-slate-400 text-sm mt-1">
              {statusFilter ? `No returns with status "${statusFilter}"` : 'No return requests have been submitted yet'}
            </p>
          </div>
        ) : (
          <Table columns={cols} data={returns} />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={`Return — ${selected?.order_number ?? ''}`}
        width="max-w-2xl"
      >
        {selected && (
          <div className="px-6 pb-6 space-y-5">
            {/* Status badge */}
            <div className="flex items-center gap-3">
              <StatusBadge status={selected.status} />
              <span className="text-xs text-slate-400">
                Submitted {formatDate(selected.created_at)}
              </span>
            </div>

            {/* Customer info */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Customer</p>
              <p className="text-sm font-medium text-slate-800">{selected.customer_name}</p>
              <p className="text-xs text-slate-500">{selected.customer_email}</p>
              {selected.customer_phone && (
                <p className="text-xs text-slate-500">{selected.customer_phone}</p>
              )}
            </div>

            {/* Order items */}
            {selected.items?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Items</p>
                <div className="space-y-2">
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.product_name}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{item.product_name}</p>
                        <p className="text-xs text-slate-500">×{item.quantity} · ₹{item.price}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Return reason */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Reason</p>
              <p className="text-sm text-slate-800">{selected.reason}</p>
              {selected.comments && (
                <p className="text-xs text-slate-500 mt-1">{selected.comments}</p>
              )}
            </div>

            {/* Admin notes */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Admin Notes</p>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Add internal notes (optional)..."
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>

            {/* Action buttons */}
            {NEXT_STATUSES[selected.status]?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {NEXT_STATUSES[selected.status].map(s => (
                    <Button
                      key={s}
                      variant={s === 'rejected' ? 'danger' : 'primary'}
                      size="sm"
                      disabled={updating}
                      onClick={() => updateStatus(selected.id, s)}
                    >
                      {STATUS_OPTIONS.find(o => o.value === s)?.label ?? s}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  )
}
