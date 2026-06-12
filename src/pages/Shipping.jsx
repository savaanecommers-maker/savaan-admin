import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Button, Input, Badge, Table, formatPrice, formatDate } from '../components/ui/index'
import api from '../config/api'
import { Truck, Clock, Save, CheckCircle, RefreshCw } from 'lucide-react'

const STATUS_FLOW = ['processing', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']
const STATUS_LABELS = {
  processing:       'Processing',
  confirmed:        'Confirmed',
  packed:           'Packed',
  shipped:          'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered:        'Delivered',
  cancelled:        'Cancelled',
  returned:         'Returned',
}

export default function Shipping() {
  const [orders, setOrders]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState('all')
  const [settings, setSettings] = useState({
    free_shipping_above: '999',
    shipping_charge:     '99',
    standard_days:       '3-5',
    express_days:        '1-2',
    express_charge:      '199',
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [updatingId, setUpdatingId]         = useState(null)
  const [tab, setTab]                       = useState('orders')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [or, sr] = await Promise.all([
      api.get('/api/orders?limit=500'),
      api.get('/api/admin/settings'),
    ])
    const filtered = (or.data?.orders ?? or.data ?? []).filter(o => o.status !== 'cancelled')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setOrders(filtered)
    if (sr.data && typeof sr.data === 'object') {
      setSettings(prev => ({ ...prev, ...sr.data }))
    }
    setLoading(false)
  }

  async function updateStatus(orderId, newStatus) {
    setUpdatingId(orderId)
    const res = await api.put(`/api/orders/${orderId}/status`, { status: newStatus })
    setUpdatingId(null)
    if (res.error) { alert('Status update failed: ' + (res.error?.message || res.error)); return }
    load()
  }

  async function saveShippingSettings() {
    setSavingSettings(true)
    const res = await api.put('/api/admin/settings', {
      free_shipping_above: settings.free_shipping_above,
      shipping_charge:     settings.shipping_charge,
      standard_days:       settings.standard_days,
      express_days:        settings.express_days,
      express_charge:      settings.express_charge,
    })
    setSavingSettings(false)
    if (res.error) { alert('Save failed: ' + (res.error?.message || res.error)); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const filteredOrders = orders.filter(o => {
    const matchSearch =
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || o.status === filter
    return matchSearch && matchFilter
  })

  const inTransit = orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.status)).length
  const delivered = orders.filter(o => o.status === 'delivered').length
  const pending   = orders.filter(o => ['processing', 'confirmed'].includes(o.status)).length

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
    { key: 'total', label: 'Amount', render: v => formatPrice(v) },
    {
      key: 'status', label: 'Current Status',
      render: v => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
          v === 'delivered'                           ? 'bg-emerald-100 text-emerald-700' :
          v === 'shipped' || v === 'out_for_delivery' ? 'bg-blue-100 text-blue-700' :
          v === 'confirmed'                           ? 'bg-purple-100 text-purple-700' :
          'bg-amber-100 text-amber-700'
        }`}>
          {STATUS_LABELS[v] || v}
        </span>
      )
    },
    {
      key: 'status_action', label: 'Advance Status',
      render: (_, row) => {
        const v = row.status
        const currentIdx = STATUS_FLOW.indexOf(v)
        const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null
        if (!nextStatus) return <span className="text-xs text-slate-300">—</span>
        return (
          <button
            onClick={() => updateStatus(row.id, nextStatus)}
            disabled={updatingId === row.id}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 text-xs font-semibold transition-colors disabled:opacity-50">
            {updatingId === row.id ? <RefreshCw size={10} className="animate-spin" /> : <CheckCircle size={10} />}
            Mark {STATUS_LABELS[nextStatus]}
          </button>
        )
      }
    },
    { key: 'created_at', label: 'Ordered', render: v => formatDate(v) },
  ]

  return (
    <Layout title="Shipping">
      <div className="flex items-center gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {['orders', 'settings'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
              tab === t ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>{t === 'orders' ? 'Shipment Tracker' : 'Shipping Settings'}</button>
        ))}
      </div>

      {tab === 'orders' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Pending / Confirmed', value: pending,   icon: Clock,       color: 'bg-amber-100 text-amber-600' },
              { label: 'In Transit',           value: inTransit, icon: Truck,       color: 'bg-blue-100 text-blue-600' },
              { label: 'Delivered',            value: delivered, icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600' },
            ].map(s => (
              <Card key={s.label} className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.icon size={18} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <div className="flex items-center gap-3 p-4 border-b border-slate-200">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search order, customer..."
                className="w-full max-w-xs px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:border-teal-500">
                <option value="all">All Status</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <p className="ml-auto text-xs text-slate-400">{filteredOrders.length} shipments</p>
            </div>
            {loading
              ? <div className="py-16 text-center text-slate-400 text-sm">Loading shipments...</div>
              : <Table columns={cols} data={filteredOrders} />
            }
          </Card>
        </>
      )}

      {tab === 'settings' && (
        <div className="grid grid-cols-2 gap-6 max-w-3xl">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Truck size={16} className="text-teal-600" />
              <h3 className="font-bold text-slate-800">Shipping Charges</h3>
            </div>
            <div className="space-y-4">
              <Input label="Standard Shipping Charge (₹)" type="number"
                value={settings.shipping_charge}
                onChange={e => setSettings({ ...settings, shipping_charge: e.target.value })} />
              <Input label="Free Shipping Above (₹)" type="number"
                value={settings.free_shipping_above}
                onChange={e => setSettings({ ...settings, free_shipping_above: e.target.value })} />
              <div className="bg-teal-50 rounded-xl p-3 text-xs text-teal-700">
                Orders above ₹{settings.free_shipping_above} get free shipping.
                Others are charged ₹{settings.shipping_charge}.
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Clock size={16} className="text-teal-600" />
              <h3 className="font-bold text-slate-800">Delivery Time</h3>
            </div>
            <div className="space-y-4">
              <Input label="Standard Delivery (days)" value={settings.standard_days}
                onChange={e => setSettings({ ...settings, standard_days: e.target.value })}
                placeholder="e.g. 3-5" />
              <Input label="Express Delivery (days)" value={settings.express_days}
                onChange={e => setSettings({ ...settings, express_days: e.target.value })}
                placeholder="e.g. 1-2" />
              <Input label="Express Delivery Charge (₹)" type="number" value={settings.express_charge}
                onChange={e => setSettings({ ...settings, express_charge: e.target.value })} />
              <p className="text-xs text-slate-400">Delivery time settings are informational only (shown in app).</p>
            </div>
          </Card>

          <div className="col-span-2">
            <button onClick={saveShippingSettings} disabled={savingSettings}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all ${
                saved ? 'bg-emerald-500 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'
              }`}>
              <Save size={14} />
              {saved ? 'Saved!' : savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
