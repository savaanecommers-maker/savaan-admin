import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Badge, Table, Button, formatPrice, formatDate } from '../components/ui/index'
import api from '../config/api'
import { CreditCard, TrendingUp, DollarSign, AlertCircle, Search, Download, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react'

const METHOD_LABELS = {
  upi:         'UPI',
  credit_card: 'Credit Card',
  debit_card:  'Debit Card',
  net_banking: 'Net Banking',
  wallet:      'Wallet',
  cod:         'Cash on Delivery',
}

const PER_PAGE = 20

export default function Payments() {
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [method, setMethod]       = useState('all')
  const [status, setStatus]       = useState('all')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [actionId, setActionId]   = useState(null) // tracks which order is being approved/rejected

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    load(1)
    return () => { mountedRef.current = false }
  }, [])

  async function load(p = page) {
    setLoading(true)
    const offset = (p - 1) * PER_PAGE
    const { data } = await api.get(`/api/orders?limit=${PER_PAGE}&offset=${offset}`)
    if (!mountedRef.current) return
    setOrders(data?.orders ?? data ?? [])
    setTotal(data?.total ?? (data?.orders ?? data ?? []).length)
    setPage(p)
    setLoading(false)
  }

  function paymentStatus(order) {
    if (order.payment_method === 'cod') return 'COD'
    const map = {
      paid:                 'Paid',
      pending_verification: 'Needs Verification',
      rejected:             'Rejected',
      success:              'Paid',
      failed:               'Failed',
      refunded:             'Refunded',
      pending:              'Pending',
    }
    return map[order.payment_status] || 'Pending'
  }

  async function verifyPayment(orderId) {
    setActionId(orderId)
    const res = await api.put(`/api/orders/${orderId}/verify-payment`)
    if (res.error) {
      alert('Verify failed: ' + (res.error.message || res.error))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, payment_status: 'success', status: 'confirmed' } : o))
    }
    setActionId(null)
  }

  async function rejectPayment(orderId) {
    if (!window.confirm('Reject this payment and cancel the order?')) return
    setActionId(orderId)
    const res = await api.put(`/api/orders/${orderId}/reject-payment`)
    if (res.error) {
      alert('Reject failed: ' + (res.error.message || res.error))
    } else {
      setOrders(prev => prev.map(o => o.id === orderId
        ? { ...o, payment_status: 'rejected', status: 'cancelled' } : o))
    }
    setActionId(null)
  }

  // Client-side filter on the current page's results for instant UX;
  // server handles pagination via limit/offset.
  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase()) ||
      o.payment_reference?.toLowerCase().includes(search.toLowerCase())
    const matchMethod = method === 'all' || o.payment_method === method
    const matchStatus = status === 'all' ||
      (status === 'paid' && (o.payment_status === 'success' || o.payment_status === 'paid')) ||
      (status === 'cod' && o.payment_method === 'cod') ||
      (status !== 'paid' && status !== 'cod' && o.payment_status === status)
    return matchSearch && matchMethod && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  const totalRevenue   = orders.filter(o => paymentStatus(o) === 'Paid').reduce((s, o) => s + parseFloat(o.total || 0), 0)
  const pendingAmount  = orders.filter(o => paymentStatus(o) === 'Pending').reduce((s, o) => s + parseFloat(o.total || 0), 0)
  const refundedAmount = orders.filter(o => paymentStatus(o) === 'Refunded').reduce((s, o) => s + parseFloat(o.total || 0), 0)
  const codAmount      = orders.filter(o => o.payment_method === 'cod').reduce((s, o) => s + parseFloat(o.total || 0), 0)

  const methodCounts = orders.reduce((acc, o) => {
    const m = o.payment_method || 'unknown'
    acc[m] = (acc[m] || 0) + 1
    return acc
  }, {})

  const cols = [
    { key: 'order_number', label: 'Order', render: v => <span className="font-mono text-xs font-bold text-slate-700">{v}</span> },
    {
      key: 'full_name', label: 'Customer',
      render: (v, row) => (
        <div>
          <p className="text-xs font-semibold text-slate-800">{v || '—'}</p>
          <p className="text-[10px] text-slate-400">{row.email}</p>
        </div>
      )
    },
    {
      key: 'payment_method', label: 'Method',
      render: v => (
        <div className="flex items-center gap-1.5">
          <CreditCard size={11} className="text-slate-400" />
          <span className="text-xs">{METHOD_LABELS[v] || v || '—'}</span>
        </div>
      )
    },
    {
      key: 'payment_reference', label: 'Transaction ID',
      render: v => v
        ? <span className="font-mono text-xs text-slate-500">{v}</span>
        : <span className="text-slate-300 text-xs">—</span>
    },
    { key: 'total', label: 'Amount', render: v => <span className="font-bold text-slate-800">{formatPrice(v)}</span> },
    { key: 'discount', label: 'Discount', render: v => v > 0 ? <span className="text-emerald-600 text-xs">-{formatPrice(v)}</span> : '—' },
    { key: 'status', label: 'Payment Status', render: (v, row) => <Badge label={paymentStatus(row)} /> },
    { key: 'created_at', label: 'Date', render: v => formatDate(v) },
  ]

  function exportCSV() {
    const rows = [
      ['Order', 'Customer', 'Method', 'Transaction ID', 'Amount', 'Discount', 'Status', 'Date'],
      ...filtered.map(o => [
        o.order_number, o.full_name || o.email,
        METHOD_LABELS[o.payment_method] || o.payment_method,
        o.payment_reference || '', o.total, o.discount, paymentStatus(o), formatDate(o.created_at)
      ])
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'payments.csv'; a.click()
  }

  const pendingVerification = orders.filter(o => o.payment_status === 'pending_verification')

  return (
    <Layout title="Payments">

      {/* ── Pending UPI Verification panel ── */}
      {pendingVerification.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">
              UPI Payments Awaiting Verification
              <span className="ml-2 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingVerification.length}
              </span>
            </h2>
            <p className="text-xs text-slate-400 ml-2">
              Check your UPI app / bank statement, then approve or reject each transaction.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            {pendingVerification.map(order => (
              <Card key={order.id} className="p-4 border-l-4 border-amber-400 bg-amber-50/40">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-700">{order.order_number}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-600">{order.full_name || order.email}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-bold text-slate-800">{formatPrice(order.total)}</span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs text-slate-500">{formatDate(order.created_at)}</span>
                    </div>
                    {/* UTR */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">
                        UTR / Transaction ID:
                      </span>
                      {order.payment_reference ? (
                        <span className="font-mono text-sm font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded select-all">
                          {order.payment_reference}
                        </span>
                      ) : (
                        <span className="text-xs text-red-400 italic">Not provided</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Open PhonePe / GPay / Paytm → search this UTR to confirm ₹{order.total} was received.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={actionId === order.id}
                      onClick={() => verifyPayment(order.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <CheckCircle2 size={14} />
                      {actionId === order.id ? 'Processing…' : 'Approve'}
                    </button>
                    <button
                      disabled={actionId === order.id}
                      onClick={() => rejectPayment(order.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Revenue', value: formatPrice(totalRevenue),   icon: TrendingUp,  color: 'bg-teal-100 text-teal-600' },
          { label: 'Pending',       value: formatPrice(pendingAmount),  icon: AlertCircle, color: 'bg-amber-100 text-amber-600' },
          { label: 'Refunded',      value: formatPrice(refundedAmount), icon: DollarSign,  color: 'bg-red-100 text-red-500' },
          { label: 'COD Orders',    value: formatPrice(codAmount),      icon: CreditCard,  color: 'bg-slate-100 text-slate-600' },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-base font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-6 gap-3 mb-6">
        {Object.entries(METHOD_LABELS).map(([key, label]) => (
          <Card key={key} className="p-3 text-center">
            <p className="text-lg font-bold text-slate-800">{methodCounts[key] || 0}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search order, customer, transaction..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <select value={method} onChange={e => setMethod(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:border-teal-500">
            <option value="all">All Methods</option>
            {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:border-teal-500">
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="cod">COD</option>
          </select>
          <div className="ml-auto">
            <Button variant="secondary" icon={Download} size="sm" onClick={exportCSV}>Export</Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading payments...</div>
        ) : (
          <>
            <Table columns={cols} data={filtered} />
            <div className="px-4 pb-4 pt-2 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Page {page} of {totalPages} · {total} total transactions
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => load(page - 1)} disabled={page === 1 || loading}
                  className="px-2 py-1 rounded-lg text-xs font-semibold hover:bg-slate-100 text-slate-600 disabled:opacity-40">
                  ← Prev
                </button>
                <span className="px-2 text-xs text-slate-500">
                  {page} / {totalPages}
                </span>
                <button onClick={() => load(page + 1)} disabled={page >= totalPages || loading}
                  className="px-2 py-1 rounded-lg text-xs font-semibold hover:bg-slate-100 text-slate-600 disabled:opacity-40">
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </Layout>
  )
}
