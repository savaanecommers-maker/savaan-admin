import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Button, Modal, Input, Select, Badge, Table } from '../components/ui/index'
import api from '../config/api'
import { Package, Plus, Minus, AlertTriangle, Search, History } from 'lucide-react'

const LOW_STOCK = 10
const OUT_STOCK = 0

export default function Inventory() {
  const [products, setProducts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')
  const [modal, setModal]         = useState(false)
  const [logsModal, setLogsModal] = useState(false)
  const [logs, setLogs]           = useState([])
  const [selected, setSelected]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState({ change: '', reason: 'restock', note: '' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/api/products/all')
    const list = data?.products ?? data ?? []
    const sorted = list.sort((a, b) => (a.stock || 0) - (b.stock || 0))
    setProducts(sorted)
    setLoading(false)
  }

  function openAdjust(product) {
    setSelected(product)
    setForm({ change: '', reason: 'restock', note: '' })
    setModal(true)
  }

  async function openLogs(product) {
    setSelected(product)
    setLogs([])
    setLogsModal(true)
    const { data } = await api.get(`/api/admin/inventory/logs/${product.id}`)
    setLogs(data || [])
  }

  async function saveAdjustment() {
    if (!form.change || parseInt(form.change) === 0) return
    setSaving(true)
    const change   = parseInt(form.change)
    const newStock = Math.max(0, (selected.stock || 0) + change)
    // Use dedicated inventory adjust endpoint — writes to inventory_logs
    const res = await api.post('/api/admin/inventory/adjust', {
      product_id: selected.id,
      new_stock:  newStock,
      reason:     form.reason,
      note:       form.note || undefined,
    })
    setSaving(false)
    if (res.error) {
      alert('Stock adjustment failed: ' + (res.error?.message || res.error))
      return
    }
    // Update local state immediately
    setProducts(prev => prev.map(p => p.id === selected.id ? { ...p, stock: newStock } : p))
    setModal(false)
  }

  function stockStatus(stock) {
    if (stock <= OUT_STOCK) return 'Out of Stock'
    if (stock <= LOW_STOCK) return 'Low Stock'
    return 'In Stock'
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
                        p.brand?.toLowerCase().includes(search.toLowerCase())
    const status = stockStatus(p.stock)
    const matchFilter =
      filter === 'all' ||
      (filter === 'low'  && status === 'Low Stock') ||
      (filter === 'out'  && status === 'Out of Stock') ||
      (filter === 'ok'   && status === 'In Stock')
    return matchSearch && matchFilter
  })

  const outOfStock = products.filter(p => p.stock <= OUT_STOCK).length
  const lowStock   = products.filter(p => p.stock > OUT_STOCK && p.stock <= LOW_STOCK).length
  const inStock    = products.filter(p => p.stock > LOW_STOCK).length

  const cols = [
    {
      key: 'name', label: 'Product',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
            {row.images?.[0]
              ? <img src={row.images[0]} alt={v} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Package size={13} className="text-slate-400" /></div>
            }
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">{v}</p>
            <p className="text-slate-400 text-[10px]">{row.brand} · {row.category_name || '—'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'stock', label: 'Current Stock',
      render: v => (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${v <= OUT_STOCK ? 'text-red-500' : v <= LOW_STOCK ? 'text-amber-500' : 'text-slate-800'}`}>
            {v}
          </span>
          {v <= LOW_STOCK && <AlertTriangle size={12} className={v === 0 ? 'text-red-400' : 'text-amber-400'} />}
        </div>
      )
    },
    { key: 'stock_status', label: 'Status', render: (v, row) => <Badge label={stockStatus(row.stock)} /> },
    { key: 'category_name', label: 'Category', render: v => v || '—' },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openAdjust(row)}
            className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 text-xs font-semibold transition-colors">
            Adjust Stock
          </button>
          <button onClick={() => openLogs(row)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <History size={13} />
          </button>
        </div>
      )
    },
  ]

  return (
    <Layout title="Inventory">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'In Stock',     value: inStock,   color: 'bg-emerald-50', text: 'text-emerald-700', cursor: 'ok' },
          { label: 'Low Stock',    value: lowStock,  color: 'bg-amber-50',   text: 'text-amber-600',   cursor: 'low' },
          { label: 'Out of Stock', value: outOfStock,color: 'bg-red-50',     text: 'text-red-600',     cursor: 'out' },
        ].map(s => (
          <button key={s.label} onClick={() => setFilter(filter === s.cursor ? 'all' : s.cursor)}
            className={`p-4 rounded-xl border flex items-center gap-3 transition-all text-left ${
              filter === s.cursor ? 'border-teal-500 shadow-md' : 'border-slate-200 hover:border-slate-300'
            } bg-white`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${s.color} ${s.text}`}>
              {s.value}
            </div>
            <p className="text-sm font-medium text-slate-600">{s.label}</p>
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:border-teal-500">
            <option value="all">All Products</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
          <p className="ml-auto text-xs text-slate-400">{filtered.length} products</p>
        </div>
        {loading
          ? <div className="py-16 text-center text-slate-400 text-sm">Loading inventory...</div>
          : <Table columns={cols} data={filtered} />
        }
      </Card>

      {/* Adjust Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Adjust Stock" width="max-w-md">
        {selected && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                {selected.images?.[0] && <img src={selected.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">{selected.name}</p>
                <p className="text-xs text-slate-500">Current stock: <span className="font-bold text-teal-600">{selected.stock}</span></p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-2 block">Adjustment</label>
              <div className="flex items-center gap-2">
                <button type="button"
                  onClick={() => setForm({ ...form, change: -(Math.abs(parseInt(form.change) || 0)) || '' })}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    form.change && parseInt(form.change) < 0
                      ? 'bg-red-500 text-white border-red-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  <Minus size={14} />
                </button>
                <input type="number" value={Math.abs(parseInt(form.change) || 0) || ''}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 0
                    setForm({ ...form, change: parseInt(form.change) < 0 ? -v : v })
                  }}
                  placeholder="0"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-bold focus:outline-none focus:border-teal-500" />
                <button type="button"
                  onClick={() => setForm({ ...form, change: Math.abs(parseInt(form.change) || 0) })}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    !form.change || parseInt(form.change) > 0
                      ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  <Plus size={14} />
                </button>
              </div>
              {form.change !== '' && (
                <p className="text-xs text-slate-500 mt-1 text-center">
                  New stock will be: <span className="font-bold text-slate-700">
                    {Math.max(0, (selected.stock || 0) + parseInt(form.change))}
                  </span>
                </p>
              )}
            </div>

            <Select label="Reason" value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}>
              <option value="restock">Restock</option>
              <option value="damage">Damage / Loss</option>
              <option value="manual_adjustment">Manual Adjustment</option>
              <option value="return">Customer Return</option>
              <option value="correction">Inventory Correction</option>
            </Select>

            <Input label="Note (optional)" value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              placeholder="Add a note..." />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={saveAdjustment} disabled={saving || !form.change}>
            {saving ? 'Saving...' : 'Save Adjustment'}
          </Button>
        </div>
      </Modal>

      {/* Logs Modal */}
      <Modal open={logsModal} onClose={() => setLogsModal(false)}
        title={`Inventory Logs — ${selected?.name || ''}`} width="max-w-lg">
        {logs.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            <History size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-xs mt-1">No adjustment history yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="py-2 px-1 flex justify-between text-sm">
                <div>
                  <span className={`font-semibold ${log.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {log.change >= 0 ? '+' : ''}{log.change}
                  </span>
                  <span className="ml-2 text-slate-500">{log.reason}</span>
                  {log.note && <span className="ml-2 text-slate-400 text-xs">— {log.note}</span>}
                </div>
                <span className="text-slate-400 text-xs">{new Date(log.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </Layout>
  )
}
