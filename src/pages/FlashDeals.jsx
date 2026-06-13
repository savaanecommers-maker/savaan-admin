import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Button, Modal, Input, Select, Table, formatPrice } from '../components/ui/index'
import api from '../config/api'
import { Zap, Plus, Edit2, Trash2, Package, Clock, TrendingDown } from 'lucide-react'

export default function FlashDeals() {
  const [deals, setDeals]     = useState([])
  const [allProducts, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [search, setSearch]   = useState('')

  const EMPTY = { product_id: '', flash_deal_price: '', flash_deal_expiry: '' }
  const [form, setForm] = useState(EMPTY)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/api/products/all')
    if (!mountedRef.current) return
    const all = data?.products ?? data ?? []
    setDeals(all.filter(p => p.is_flash_deal))
    setAll(all.filter(p => !p.is_flash_deal))
    setLoading(false)
  }

  function openAdd() { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(d) {
    setEditing(d.id)
    const expiry = d.flash_deal_expiry
      ? new Date(d.flash_deal_expiry).toISOString().slice(0, 16)
      : ''
    setForm({ product_id: d.id, flash_deal_price: d.flash_deal_price?.toString() || '', flash_deal_expiry: expiry })
    setModal(true)
  }

  async function save() {
    if (!form.flash_deal_price) return
    setSaving(true)
    const targetId = editing || form.product_id
    if (!targetId) { setSaving(false); return }

    const product = editing
      ? deals.find(d => d.id === editing)
      : allProducts.find(p => p.id === form.product_id)

    if (product && parseFloat(form.flash_deal_price) >= parseFloat(product.price)) {
      alert(`Deal price must be less than the original price (₹${product.price})`)
      setSaving(false); return
    }

    const res = await api.put(`/api/products/${targetId}`, {
      is_flash_deal:     true,
      flash_deal_price:  parseFloat(form.flash_deal_price),
      flash_deal_expiry: form.flash_deal_expiry || null,
    })
    setSaving(false)
    if (res.error) { alert('Failed to save flash deal: ' + (res.error?.message || res.error)); return }
    setModal(false); load()
  }

  async function removeDeal(id) {
    if (!confirm('Remove this flash deal?')) return
    const res = await api.put(`/api/products/${id}`, {
      is_flash_deal:     false,
      flash_deal_price:  null,
      flash_deal_expiry: null,
    })
    if (res.error) { alert('Failed to remove deal: ' + (res.error?.message || res.error)); return }
    load()
  }

  function isExpired(expiry) {
    if (!expiry) return false
    return new Date(expiry) < new Date()
  }

  function timeLeft(expiry) {
    if (!expiry) return 'No expiry'
    const diff = new Date(expiry) - new Date()
    if (diff < 0) return 'Expired'
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}d ${h % 24}h left`
    return `${h}h left`
  }

  function discount(original, deal) {
    if (!original || !deal) return '—'
    return Math.round(((original - deal) / original) * 100) + '% off'
  }

  const filtered = deals.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.brand?.toLowerCase().includes(search.toLowerCase())
  )

  const cols = [
    {
      key: 'name', label: 'Product',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
            {row.images?.[0]
              ? <img src={row.images[0]} alt={v} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Package size={13} className="text-slate-400" /></div>
            }
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">{v}</p>
            <p className="text-slate-400 text-[10px]">{row.category_name || '—'}</p>
          </div>
        </div>
      )
    },
    { key: 'price', label: 'Original Price', render: v => formatPrice(v) },
    { key: 'flash_deal_price', label: 'Deal Price', render: v => <span className="font-bold text-teal-600">{formatPrice(v)}</span> },
    {
      key: 'flash_deal_discount', label: 'Discount',
      render: (_, row) => (
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
          {discount(row.price, row.flash_deal_price)}
        </span>
      )
    },
    {
      key: 'flash_deal_expiry', label: 'Expires',
      render: v => (
        <div className="flex items-center gap-1.5">
          <Clock size={11} className={isExpired(v) ? 'text-red-400' : 'text-amber-400'} />
          <span className={`text-xs font-medium ${isExpired(v) ? 'text-red-500' : 'text-slate-600'}`}>
            {timeLeft(v)}
          </span>
        </div>
      )
    },
    { key: 'stock', label: 'Stock' },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => removeDeal(v)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )
    },
  ]

  const totalSavings = deals.reduce((sum, d) => sum + ((d.price || 0) - (d.flash_deal_price || 0)), 0)
  const activeDeals  = deals.filter(d => !isExpired(d.flash_deal_expiry)).length
  const expiredDeals = deals.filter(d => isExpired(d.flash_deal_expiry)).length

  return (
    <Layout title="Flash Deals">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Deals',  value: deals.length,                                                   icon: Zap,         color: 'bg-amber-100 text-amber-600' },
          { label: 'Active Deals', value: activeDeals,                                                    icon: TrendingDown, color: 'bg-teal-100 text-teal-600' },
          { label: 'Expired',      value: expiredDeals,                                                   icon: Clock,       color: 'bg-red-100 text-red-500' },
          { label: 'Avg. Saving',  value: deals.length ? formatPrice(totalSavings / deals.length) : '₹0', icon: TrendingDown, color: 'bg-emerald-100 text-emerald-600' },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
              <s.icon size={18} />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search deals..."
            className="flex-1 max-w-xs px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
          <div className="ml-auto">
            <Button icon={Plus} size="sm" onClick={openAdd}>Add Flash Deal</Button>
          </div>
        </div>
        {loading
          ? <div className="py-16 text-center text-slate-400 text-sm">Loading flash deals...</div>
          : <Table columns={cols} data={filtered} />
        }
      </Card>

      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Flash Deal' : 'Add Flash Deal'} width="max-w-lg">
        <div className="space-y-4">
          {!editing && (
            <Select label="Select Product *" value={form.product_id}
              onChange={e => setForm({ ...form, product_id: e.target.value })}>
              <option value="">Choose a product</option>
              {allProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name} — {formatPrice(p.price)}</option>
              ))}
            </Select>
          )}
          <Input label="Flash Deal Price (₹) *" type="number"
            value={form.flash_deal_price}
            onChange={e => setForm({ ...form, flash_deal_price: e.target.value })}
            placeholder="0.00" />
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Deal Expiry (optional)</label>
            <input type="datetime-local" value={form.flash_deal_expiry}
              onChange={e => setForm({ ...form, flash_deal_expiry: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
          </div>
          {form.product_id && !editing && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <Zap size={12} className="inline mr-1" />
              This product will appear in the Flash Deals section of the app.
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.flash_deal_price || (!editing && !form.product_id)}>
            {saving ? 'Saving...' : editing ? 'Update Deal' : 'Add Deal'}
          </Button>
        </div>
      </Modal>
    </Layout>
  )
}
