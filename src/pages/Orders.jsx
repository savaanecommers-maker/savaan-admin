import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Table, Badge, Button, Modal, Card, Pagination, formatPrice, formatDate } from '../components/ui/index'
import api from '../config/api'
import { Search, Download, Eye } from 'lucide-react'

const STATUSES = ['All','pending','confirmed','processing','packed','shipped','out_for_delivery','delivered','cancelled','return_requested','returned']

export default function Orders() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus]   = useState('All')
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [selected, setSelected]   = useState(null)
  const [detailOrder, setDetail]  = useState(null)
  const [updating, setUpdating]   = useState(false)
  const mountedRef = useRef(true)
  const PER_PAGE = 10

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/api/orders?limit=500')
    if (!mountedRef.current) return
    setOrders(data?.orders ?? data ?? [])
    setLoading(false)
  }

  async function openDetail(row) {
    setSelected(row)
    const { data } = await api.get(`/api/orders/${row.id}`)
    setDetail(data || row)
  }

  const filtered = orders.filter(o => {
    const matchStatus = status === 'All' || o.status === status
    const matchSearch = !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.email?.toLowerCase().includes(search.toLowerCase()) ||
      o.phone?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const STATUS_TRANSITIONS = {
    pending:           ['confirmed', 'cancelled'],
    confirmed:         ['packed', 'cancelled'],
    processing:        ['packed', 'cancelled'],
    packed:            ['shipped'],
    shipped:           ['out_for_delivery'],
    out_for_delivery:  ['delivered'],
    delivered:         ['return_requested'],
    return_requested:  ['returned'],
    cancelled:         [],
    returned:          [],
  }

  async function updateStatus(orderId, newStatus) {
    setUpdating(true)
    const res = await api.put(`/api/orders/${orderId}/status`, { status: newStatus })
    setUpdating(false)
    if (res.error) { alert('Status update failed: ' + (res.error?.message || res.error)); return }
    setSelected(prev => prev ? { ...prev, status: newStatus } : prev)
    setDetail(prev => prev ? { ...prev, status: newStatus } : prev)
    load()
  }

  const cols = [
    {
      key: 'order_number', label: 'Order ID',
      render: v => <span className="font-semibold text-teal-600 text-xs">{v}</span>
    },
    { key: 'created_at', label: 'Date', render: v => formatDate(v) },
    { key: 'total', label: 'Amount', render: v => <span className="font-bold">{formatPrice(v)}</span> },
    { key: 'payment_method', label: 'Payment',
      render: v => <span className="capitalize text-xs">{v?.replace('_',' ') || '—'}</span> },
    { key: 'status', label: 'Order Status', render: v => <Badge label={v} /> },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <button onClick={e => { e.stopPropagation(); openDetail(row) }}
          className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
          <Eye size={13} />
        </button>
      )
    }
  ]

  return (
    <Layout title="Orders">
      <Card>
        {/* Status tabs */}
        <div className="flex items-center gap-1 px-4 pt-4 border-b border-slate-200 overflow-x-auto">
          {STATUSES.map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1) }}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-all capitalize whitespace-nowrap ${
                status === s
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {s === 'out_for_delivery' ? 'Out for Delivery' : s}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search orders..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-500 w-44" />
            </div>
            <Button variant="secondary" icon={Download} size="sm">Export</Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading orders...</div>
        ) : (
          <>
            <Table columns={cols} data={paginated} onRow={openDetail} />
            <div className="px-4 pb-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {filtered.length === 0 ? 'No orders found' : `Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE, filtered.length)} of ${filtered.length} orders`}
              </p>
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Order Detail Modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setDetail(null) }}
        title={`Order ${selected?.order_number}`} width="max-w-2xl">
        {selected && (() => {
          const o = detailOrder || selected
          return (
            <div className="space-y-5">
              {/* Status + update */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Current Status</p>
                  <Badge label={o.status} />
                </div>
                <select
                  value={o.status}
                  key={o.status}
                  onChange={e => updateStatus(o.id, e.target.value)}
                  disabled={updating || !(STATUS_TRANSITIONS[o.status]?.length > 0)}
                  className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={o.status}>{o.status.replace(/_/g,' ')}</option>
                  {(STATUS_TRANSITIONS[o.status] || []).map(s => (
                    <option key={s} value={s} className="capitalize">{s.replace(/_/g,' ')}</option>
                  ))}
                </select>
              </div>

              {/* Order meta */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-xs text-slate-400">Order ID</p><p className="font-semibold text-teal-600">{o.order_number}</p></div>
                <div><p className="text-xs text-slate-400">Date</p><p className="font-semibold">{formatDate(o.created_at)}</p></div>
                <div><p className="text-xs text-slate-400">Payment Method</p><p className="font-semibold capitalize">{o.payment_method?.replace(/_/g,' ') || '—'}</p></div>
                <div><p className="text-xs text-slate-400">Total Amount</p><p className="font-bold text-teal-600">{formatPrice(o.total)}</p></div>
                <div>
                  <p className="text-xs text-slate-400">Payment Status</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    o.payment_status === 'success'  ? 'bg-emerald-100 text-emerald-700' :
                    o.payment_status === 'failed'   ? 'bg-red-100 text-red-600' :
                    o.payment_status === 'refunded' ? 'bg-violet-100 text-violet-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{o.payment_status || 'pending'}</span>
                </div>
                <div><p className="text-xs text-slate-400">Customer</p><p className="font-semibold text-xs">{o.full_name || '—'}<br/><span className="text-slate-400 font-normal">{o.email}</span></p></div>
              </div>

              {/* Items */}
              {o.items?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">ORDER ITEMS</p>
                  <div className="space-y-2">
                    {o.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.color && <span className="text-xs text-slate-500 ml-1">Color: {item.color}</span>}
                            {item.size && <span className="text-xs text-slate-500 ml-1">Size: {item.size}</span>}
                            {item.sku && <span className="text-xs text-slate-400 ml-1">SKU: {item.sku}</span>}
                          </div>
                        </div>
                        <p className="font-bold text-sm">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {o.shipping_address && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 mb-1">SHIPPING ADDRESS</p>
                  <p className="text-sm text-slate-700">{o.shipping_address.full_name}</p>
                  <p className="text-xs text-slate-600">{o.shipping_address.line1}{o.shipping_address.line2 ? ', ' + o.shipping_address.line2 : ''}</p>
                  <p className="text-xs text-slate-600">{o.shipping_address.city}, {o.shipping_address.state} - {o.shipping_address.pincode}</p>
                  <p className="text-xs text-slate-500">{o.shipping_address.phone}</p>
                </div>
              )}

              {/* Totals */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span>{formatPrice(o.subtotal)}</span></div>
                {o.discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount {o.coupon_code ? `(${o.coupon_code})` : ''}</span>
                    <span>-{formatPrice(o.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-2">
                  <span>Total</span><span className="text-teal-600">{formatPrice(o.total)}</span>
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>
    </Layout>
  )
}
