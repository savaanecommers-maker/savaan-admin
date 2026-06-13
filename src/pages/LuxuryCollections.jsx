import { useEffect, useState, useRef, useCallback } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Button, Modal, Input } from '../components/ui/index'
import api from '../config/api'
import {
  Gem, Plus, Edit2, Trash2, Eye, EyeOff,
  ArrowUp, ArrowDown, RefreshCw, Upload,
  CheckCircle, XCircle, Package, BarChart2,
  DollarSign, TrendingUp, ShoppingBag, Search,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const DEST_LABELS = {
  watches:               'Watches',
  'bags-luggage':        'Bags & Luggage',
  perfumes:              'Perfumes',
  'beauty-personal-care':'Beauty & Skincare',
  'jewelry-accessories': 'Jewelry & Accessories',
  fashion:               'Fashion',
  electronics:           'Electronics',
  footwear:              'Footwear',
  'home-decor':          'Home Décor',
}

const SOURCE_TYPES = [
  { value: 'category',    label: 'By Category slug' },
  { value: 'subcategory', label: 'By Sub-category slug' },
  { value: 'brand',       label: 'By Brand name' },
  { value: 'manual',      label: 'Manual (hand-pick products)' },
  { value: 'featured',    label: 'Featured products' },
]

const TABS = ['Collections', 'Analytics']

const EMPTY_FORM = {
  title: '', subtitle: '', description: '', image_url: '',
  category_slug: '', source_type: 'category', source_value: '',
  cta_text: 'Explore', display_order: 0,
  start_date: '', end_date: '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function toLocalDate(iso) { return iso ? iso.slice(0, 10) : '' }

// ── Product Picker Modal ──────────────────────────────────────────────────────
function ProductPicker({ collectionId, collectionTitle, onClose }) {
  const [linked,   setLinked]   = useState([])
  const [products, setProducts] = useState([])
  const [search,   setSearch]   = useState('')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    async function init() {
      setLoading(true)
      try {
        const [linRes, allRes] = await Promise.all([
          api.get(`/api/luxury-collections/${collectionId}/products`),
          api.get('/api/products?limit=200&is_active=true'),
        ])
        setLinked(Array.isArray(linRes.data) ? linRes.data : [])
        const allList = Array.isArray(allRes.data) ? allRes.data
          : Array.isArray(allRes.data?._list) ? allRes.data._list
          : Array.isArray(allRes.data?.products) ? allRes.data.products
          : []
        setProducts(allList)
      } finally { setLoading(false) }
    }
    init()
  }, [collectionId])

  const linkedIds = new Set(linked.map(p => p.id))

  function toggle(p) {
    if (linkedIds.has(p.id)) {
      setLinked(prev => prev.filter(x => x.id !== p.id))
    } else {
      setLinked(prev => [...prev, p])
    }
  }

  async function save() {
    setSaving(true)
    const res = await api.put(`/api/luxury-collections/${collectionId}/products`, {
      product_ids: linked.map(p => p.id),
    })
    setSaving(false)
    if (res.error) { alert('Save failed: ' + (res.error?.message || res.error)); return }
    onClose()
  }

  const filtered = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Modal open onClose={onClose}
      title={`Products — ${collectionTitle}`}
      width="max-w-2xl">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-xs text-slate-500">
          {linked.length} product{linked.length !== 1 ? 's' : ''} selected for this collection.
        </p>

        {/* Selected */}
        {linked.length > 0 && (
          <div className="border border-teal-200 rounded-xl p-3 bg-teal-50 space-y-1">
            <p className="text-xs font-semibold text-teal-700 mb-2">✅ Selected</p>
            <div className="flex flex-wrap gap-2">
              {linked.map(p => (
                <span key={p.id}
                  className="flex items-center gap-1 text-xs bg-white border border-teal-200 rounded-full px-2 py-1 text-teal-700">
                  {p.name}
                  <button onClick={() => toggle(p)} className="text-teal-400 hover:text-red-500">✕</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search products…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500" />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(p => {
              const isLinked = linkedIds.has(p.id)
              return (
                <div key={p.id} onClick={() => toggle(p)}
                  className={`flex items-center gap-2 p-2 rounded-xl border-2 cursor-pointer transition-all ${
                    isLinked ? 'border-teal-400 bg-teal-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      onError={e => { e.target.style.display = 'none' }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Package size={14} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">₹{p.price}</p>
                  </div>
                  {isLinked && <CheckCircle size={14} className="text-teal-500 flex-shrink-0" />}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 sticky bottom-0 bg-white">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : `Save ${linked.length} Products`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Analytics Modal ───────────────────────────────────────────────────────────
function CollectionAnalytics({ collection, onClose }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/luxury-collections/${collection.id}/analytics`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [collection.id])

  return (
    <Modal open onClose={onClose} title={`Analytics — ${collection.title}`} width="max-w-md">
      {loading ? (
        <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
      ) : !data ? (
        <div className="py-8 text-center text-slate-400 text-sm">Failed to load analytics</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 py-2">
          {[
            { label: 'Impressions',   value: data.impressions.toLocaleString(),    icon: Eye,         color: 'text-blue-600'  },
            { label: 'Product Clicks',value: data.product_clicks.toLocaleString(), icon: TrendingUp,  color: 'text-teal-600'  },
            { label: 'Unique Users',  value: data.unique_users.toLocaleString(),   icon: ShoppingBag, color: 'text-purple-600'},
            { label: 'Orders (attr.)',value: data.orders.toLocaleString(),          icon: ShoppingBag, color: 'text-orange-600'},
            { label: 'Revenue (attr.)',value: fmtMoney(data.revenue),              icon: DollarSign,  color: 'text-green-600' },
            {
              label: 'Conv. Rate',
              value: data.product_clicks > 0
                ? ((data.orders / data.product_clicks) * 100).toFixed(1) + '%'
                : '0.0%',
              icon: BarChart2, color: 'text-slate-700',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="p-3 flex items-center gap-3">
              <Icon size={18} className={color} />
              <div>
                <p className={`font-bold text-base ${color}`}>{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </Card>
          ))}
          <p className="col-span-2 text-xs text-slate-400 text-center">Last 30 days · Attribution: 24h click window</p>
        </div>
      )}
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LuxuryCollections() {
  const [collections,   setCollections]   = useState([])
  const [loading,       setLoading]       = useState(true)
  const [saving,        setSaving]        = useState(null)
  const [modal,         setModal]         = useState(false)
  const [editId,        setEditId]        = useState(null)
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [uploading,     setUploading]     = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [productPicker, setProductPicker] = useState(null) // collection object
  const [analyticsModal,setAnalyticsModal]= useState(null) // collection object
  const [tab,           setTab]           = useState('Collections')
  // Analytics summary
  const [analytics,     setAnalytics]     = useState([])
  const [analyticsLoad, setAnalyticsLoad] = useState(false)

  const fileRef = useRef()
  const mountedRef = useRef(true)

  // ── loaders ─────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/api/luxury-collections/all')
      if (!mountedRef.current) return
      setCollections(Array.isArray(res.data) ? res.data : [])
    } catch {
      // collections list stays empty; UI shows appropriate state
    } finally { if (mountedRef.current) setLoading(false) }
  }

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoad(true)
    try {
      // Per-collection analytics in parallel
      const cols = collections.filter(c => c.id)
      const results = await Promise.all(
        cols.map(c =>
          api.get(`/api/luxury-collections/${c.id}/analytics`)
            .then(r => ({ ...r.data, id: c.id, title: c.title }))
            .catch(() => ({ id: c.id, title: c.title, impressions: 0, product_clicks: 0, revenue: 0, orders: 0 }))
        )
      )
      setAnalytics(results)
    } finally { setAnalyticsLoad(false) }
  }, [collections])

  useEffect(() => {
    if (tab === 'Analytics' && analytics.length === 0 && collections.length > 0) loadAnalytics()
  }, [tab, analytics.length, collections.length, loadAnalytics])

  // ── Helpers ──────────────────────────────────────────────────
  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function openCreate() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(col) {
    setEditId(col.id)
    setForm({
      title:         col.title         || '',
      subtitle:      col.subtitle      || '',
      description:   col.description   || '',
      image_url:     col.image_url     || '',
      category_slug: col.category_slug || '',
      source_type:   col.source_type   || 'category',
      source_value:  col.source_value  || '',
      cta_text:      col.cta_text      || 'Explore',
      display_order: col.display_order ?? 0,
      start_date:    toLocalDate(col.start_date),
      end_date:      toLocalDate(col.end_date),
    })
    setModal(true)
  }

  async function save() {
    if (!form.title.trim()) { alert('Title is required'); return }
    setSaving('form')
    try {
      if (editId) {
        const res = await api.put(`/api/luxury-collections/${editId}`, form)
        if (res.error) throw new Error(res.error?.message || res.error)
        setCollections(prev => prev.map(c => c.id === editId ? res.data : c))
      } else {
        const res = await api.post('/api/luxury-collections', form)
        if (res.error) throw new Error(res.error?.message || res.error)
        setCollections(prev => [...prev, res.data].sort((a, b) => a.display_order - b.display_order))
      }
      setModal(false)
    } catch (e) {
      alert(e.message || 'Failed to save')
    } finally { setSaving(null) }
  }

  async function toggle(col) {
    setSaving(col.id)
    const res = await api.patch(`/api/luxury-collections/${col.id}/toggle`)
    setSaving(null)
    if (res.error) { alert('Failed to toggle status: ' + (res.error?.message || res.error)); return }
    setCollections(prev => prev.map(c => c.id === col.id ? res.data : c))
  }

  async function moveOrder(col, direction) {
    const idx = collections.findIndex(c => c.id === col.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= collections.length) return
    const next = [...collections]
    const aOrder = next[idx].display_order
    const bOrder = next[swapIdx].display_order
    next[idx]     = { ...next[idx],     display_order: bOrder }
    next[swapIdx] = { ...next[swapIdx], display_order: aOrder }
    next.sort((a, b) => a.display_order - b.display_order)
    setCollections(next)
    setSaving(col.id)
    try {
      await Promise.all([
        api.put(`/api/luxury-collections/${col.id}`, { display_order: bOrder }),
        api.put(`/api/luxury-collections/${next[swapIdx < idx ? idx : swapIdx].id}`, { display_order: aOrder }),
      ])
    } catch { load() }
    finally { setSaving(null) }
  }

  async function deleteCol(id) {
    setSaving(id)
    const res = await api.delete(`/api/luxury-collections/${id}`)
    setSaving(null)
    setDeleteConfirm(null)
    if (res.error) { alert('Failed to delete: ' + (res.error?.message || res.error)); return }
    setCollections(prev => prev.filter(c => c.id !== id))
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data, error } = await api.upload('/api/upload?folder=collections', fd)
      if (error) throw new Error(error.message || 'Upload failed')
      setF('image_url', data?.url || '')
    } catch { alert('Image upload failed') }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const activeCount   = collections.filter(c => c.is_active).length
  const inactiveCount = collections.filter(c => !c.is_active).length
  const totalRevenue  = analytics.reduce((s, r) => s + (r.revenue || 0), 0)

  // ─────────────────────────────────────────────────────────────
  return (
    <>
    <Layout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Gem size={22} className="text-teal-600" />
              Luxury Collections Manager
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Curated editorial cards for the app homepage — with scheduling, product linking, and analytics.
            </p>
          </div>
          <div className="flex gap-2">
            {TABS.map(t => (
              <Button key={t}
                variant={tab === t ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTab(t)}
                icon={t === 'Analytics' ? BarChart2 : Gem}>
                {t}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
            {tab === 'Collections' && (
              <Button size="sm" onClick={openCreate}>
                <Plus size={15} className="mr-1" /> Add Collection
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',              value: collections.length, color: 'text-slate-700' },
            { label: 'Active',             value: activeCount,        color: 'text-teal-600'  },
            { label: analytics.length > 0 ? `Revenue (30d)` : 'Inactive',
              value: analytics.length > 0 ? fmtMoney(totalRevenue) : inactiveCount,
              color: analytics.length > 0 ? 'text-green-600' : 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* ── Collections tab ──────────────────────────────────── */}
        {tab === 'Collections' && (
          <Card className="overflow-hidden">
            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-40 rounded bg-slate-100" />
                      <div className="h-3 w-64 rounded bg-slate-100" />
                    </div>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(n => <div key={n} className="w-8 h-8 rounded-lg bg-slate-100" />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : collections.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Gem size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No luxury collections yet.</p>
                <Button variant="primary" size="sm" className="mt-4" onClick={openCreate}>
                  <Plus size={14} className="mr-1" /> Add first collection
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {collections.map((col, idx) => {
                  const isFirst   = idx === 0
                  const isLast    = idx === collections.length - 1
                  const isBusy    = saving === col.id
                  const now       = new Date()
                  const scheduled = col.start_date && new Date(col.start_date) > now
                  const expired   = col.end_date   && new Date(col.end_date)   < now

                  return (
                    <div key={col.id}
                      className={`flex items-center gap-4 p-4 transition-colors ${
                        col.is_active ? 'bg-white' : 'bg-slate-50 opacity-70'
                      }`}>

                      {/* Image */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                        {col.image_url ? (
                          <img src={col.image_url} alt={col.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gem size={18} className="text-slate-300" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{col.title}</span>
                          {col.subtitle && (
                            <span className="text-xs text-slate-500 italic">{col.subtitle}</span>
                          )}
                          {col.source_type && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                              {col.source_type}
                            </span>
                          )}
                          {col.category_slug && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                              {DEST_LABELS[col.category_slug] || col.category_slug}
                            </span>
                          )}
                          {scheduled && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">⏰ Scheduled</span>}
                          {expired   && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">Expired</span>}
                          {col.is_active && !scheduled && !expired ? (
                            <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                              <CheckCircle size={11} /> Live
                            </span>
                          ) : !col.is_active ? (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <XCircle size={11} /> Off
                            </span>
                          ) : null}
                        </div>
                        {col.description && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{col.description}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          CTA: <span className="font-mono">{col.cta_text}</span>
                          {' · '}Order: {col.display_order}
                          {col.source_type === 'manual' && ' · ✋ Manual products'}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => toggle(col)} disabled={isBusy}
                          title={col.is_active ? 'Disable' : 'Enable'}
                          className={`p-2 rounded-lg text-sm transition-colors ${
                            col.is_active
                              ? 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          } disabled:opacity-50`}>
                          {col.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>

                        <button onClick={() => openEdit(col)} disabled={isBusy}
                          className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                          title="Edit">
                          <Edit2 size={15} />
                        </button>

                        {/* Product picker */}
                        <button onClick={() => setProductPicker(col)} disabled={isBusy}
                          className="p-2 rounded-lg bg-purple-50 text-purple-500 hover:bg-purple-100 transition-colors"
                          title="Select products">
                          <Package size={15} />
                        </button>

                        {/* Analytics */}
                        <button onClick={() => setAnalyticsModal(col)} disabled={isBusy}
                          className="p-2 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors"
                          title="View analytics">
                          <BarChart2 size={15} />
                        </button>

                        <button onClick={() => moveOrder(col, 'up')} disabled={isFirst || isBusy}
                          className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-30">
                          <ArrowUp size={15} />
                        </button>
                        <button onClick={() => moveOrder(col, 'down')} disabled={isLast || isBusy}
                          className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-30">
                          <ArrowDown size={15} />
                        </button>

                        <button onClick={() => setDeleteConfirm(col.id)} disabled={isBusy}
                          className="p-2 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition-colors disabled:opacity-50">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {/* ── Analytics tab ─────────────────────────────────────── */}
        {tab === 'Analytics' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={loadAnalytics} disabled={analyticsLoad}>
                <RefreshCw size={14} className={analyticsLoad ? 'animate-spin' : ''} />
              </Button>
            </div>

            {analyticsLoad ? (
              <Card className="text-center py-10 text-slate-400 text-sm">Loading analytics…</Card>
            ) : analytics.length === 0 ? (
              <Card className="text-center py-16 text-slate-400">
                <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No analytics data yet.</p>
              </Card>
            ) : (
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-700 text-sm">Collection Performance — Last 30 Days</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Collection</th>
                        <th className="px-4 py-3 text-right">Impressions</th>
                        <th className="px-4 py-3 text-right">Clicks</th>
                        <th className="px-4 py-3 text-right">Unique Users</th>
                        <th className="px-4 py-3 text-right">Orders</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700 text-xs">{r.title}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{Number(r.impressions || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">{Number(r.product_clicks || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{Number(r.unique_users || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{Number(r.orders || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700">{fmtMoney(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>

    {/* ── Create / Edit Modal ── */}
    {modal && (
      <Modal open={modal} onClose={() => setModal(false)}
        title={editId ? 'Edit Collection' : 'Add Luxury Collection'}
        width="max-w-lg">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

          {/* Image */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Collection Image</label>
            <div className="flex gap-2 items-start">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                {form.image_url ? (
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <Gem size={22} className="text-slate-300" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input value={form.image_url} onChange={e => setF('image_url', e.target.value)}
                  placeholder="Paste image URL or upload" />
                <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload size={13} className="mr-1" />
                  {uploading ? 'Uploading…' : 'Upload Image'}
                </Button>
              </div>
            </div>
          </div>

          {/* Title + Subtitle */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <Input value={form.title} onChange={e => setF('title', e.target.value)}
              placeholder="e.g. Timeless Watches" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Subtitle <span className="text-slate-400">(optional, shown below title)</span>
            </label>
            <Input value={form.subtitle} onChange={e => setF('subtitle', e.target.value)}
              placeholder="e.g. Icons of precision" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Short Description</label>
            <Input value={form.description} onChange={e => setF('description', e.target.value)}
              placeholder="e.g. Precision crafted for the discerning collector" />
          </div>

          {/* Source */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Product Source</label>
            <select value={form.source_type} onChange={e => setF('source_type', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
              {SOURCE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {(form.source_type !== 'manual' && form.source_type !== 'featured') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Category (for Flutter filter)</label>
                <select value={form.category_slug} onChange={e => setF('category_slug', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
                  <option value="">— None —</option>
                  {Object.entries(DEST_LABELS).map(([slug, label]) => (
                    <option key={slug} value={slug}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {form.source_type === 'brand' ? 'Brand Name' : 'Slug Override'}
                  <span className="text-slate-400 ml-1">(optional)</span>
                </label>
                <Input value={form.source_value} onChange={e => setF('source_value', e.target.value)}
                  placeholder={form.source_type === 'brand' ? 'e.g. Rolex' : 'e.g. mens-watches'} />
              </div>
            </div>
          )}

          {form.source_type === 'manual' && (
            <div className="border border-blue-100 rounded-xl p-3 bg-blue-50 text-xs text-blue-700">
              ℹ️ After saving, use the <strong>📦 Products</strong> button on the collection card to hand-pick products.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Button Text</label>
              <Input value={form.cta_text} onChange={e => setF('cta_text', e.target.value)} placeholder="Explore" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Display Order</label>
              <Input type="number" value={form.display_order}
                onChange={e => setF('display_order', parseInt(e.target.value) || 0)} />
            </div>
          </div>

          {/* Schedule */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Schedule <span className="font-normal normal-case text-slate-400">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Visible From</label>
                <Input type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Visible Until</label>
                <Input type="date" value={form.end_date} onChange={e => setF('end_date', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving === 'form'}>
              {saving === 'form' ? 'Saving…' : editId ? 'Save Changes' : 'Add Collection'}
            </Button>
          </div>
        </div>
      </Modal>
    )}

    {/* ── Delete Confirm Modal ── */}
    {deleteConfirm && (
      <Modal title="Delete Collection" onClose={() => setDeleteConfirm(null)}>
        <p className="text-sm text-slate-600 mb-6">
          This will permanently delete the collection and all its product links.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={() => deleteCol(deleteConfirm)} disabled={saving === deleteConfirm}
            className="bg-red-500 hover:bg-red-600 text-white">
            {saving === deleteConfirm ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>
    )}

    {/* ── Product Picker ── */}
    {productPicker && (
      <ProductPicker
        collectionId={productPicker.id}
        collectionTitle={productPicker.title}
        onClose={() => setProductPicker(null)}
      />
    )}

    {/* ── Per-collection Analytics Modal ── */}
    {analyticsModal && (
      <CollectionAnalytics
        collection={analyticsModal}
        onClose={() => setAnalyticsModal(null)}
      />
    )}
    </>
  )
}
