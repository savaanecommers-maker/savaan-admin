import { useEffect, useState, useCallback, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Button, Modal, Input } from '../components/ui/index'
import api from '../config/api'
import {
  LayoutGrid, Eye, EyeOff, ArrowUp, ArrowDown,
  Edit2, RefreshCw, BarChart2, CheckCircle, XCircle,
  Star, Tag, Package, Search, ShoppingBag, Plus, Trash2,
  TrendingUp, DollarSign,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const SECTION_TYPE_LABELS = {
  product_carousel: 'Product Carousel',
  flash_deals:      'Flash Deals',
  banner:           'Banner',
  category_grid:    'Category Grid',
  discount_banner:  'Discount Banner',
  reviews:          'Customer Reviews',
  social_links:        'Follow Us',
  download_app:        'Download App',
  flash_deals_banner:  '⚡ Flash Deals Banner',
  luxury_edit:         'Luxury Edit',
}

const CATEGORY_SECTIONS = new Set([
  'beauty_essentials', 'premium_perfumes', 'luxury_watches',
  'mens_fashion', 'womens_fashion', 'electronics_picks',
])

const SOURCE_TYPES = [
  { value: 'auto',         label: 'Auto (algorithm)' },
  { value: 'featured',     label: 'Featured products' },
  { value: 'staff_picks',  label: 'Staff Picks' },
  { value: 'flash_deal',   label: 'Flash Deals' },
  { value: 'category',     label: 'By Category slug' },
  { value: 'subcategory',  label: 'By Sub-category slug' },
  { value: 'brand',        label: 'By Brand name' },
  { value: 'price_filter', label: 'Price filter' },
  { value: 'manual',       label: 'Manual (no fetch)' },
]

const LAYOUT_TYPES = [
  { value: 'carousel',    label: 'Horizontal Carousel' },
  { value: 'grid',        label: '2-column Grid' },
  { value: 'large_cards', label: 'Large Cards' },
  { value: 'premium',     label: 'Premium (dark)' },
]

const SORT_OPTIONS = [
  { value: 'newest',       label: 'Newest first' },
  { value: 'best_selling', label: 'Best Selling' },
  { value: 'trending',     label: 'Trending (7d)' },
  { value: 'velocity',     label: 'Velocity (3d)' },
  { value: 'top_rated',    label: 'Top Rated' },
  { value: 'expiry_asc',   label: 'Expiry Soon' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function toLocalDT(iso) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 16)
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HomepageSections() {
  const [sections, setSections]       = useState([])
  const [analytics, setAnalytics]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(null)
  const [editModal, setEditModal]     = useState(false)
  const [editForm, setEditForm]       = useState({})
  const [editKey, setEditKey]         = useState(null)
  const [tab, setTab]                 = useState('sections')

  // Staff picks
  const [allProducts, setAllProducts] = useState([])
  const [staffPicks, setStaffPicks]   = useState(new Set())
  const [spLoading, setSpLoading]     = useState(false)
  const [spSearch, setSpSearch]       = useState('')
  const [spSaving, setSpSaving]       = useState(null)

  // Brands
  const [brands, setBrands]           = useState([])
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [brandModal, setBrandModal]   = useState(false)
  const [brandEdit, setBrandEdit]     = useState(null)
  const [brandForm, setBrandForm]     = useState({})
  const [brandSaving, setBrandSaving] = useState(false)
  const [brandDeleting, setBrandDeleting] = useState(null)

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
      const [sr, ar] = await Promise.all([
        api.get('/api/homepage/sections'),
        api.get('/api/homepage/analytics/summary').catch(() => ({ data: [] })),
      ])
      if (!mountedRef.current) return
      const raw  = sr.data?._list ?? sr.data
      const data = Array.isArray(raw) ? raw : []
      setSections(data.sort((a, b) => (a.display_order || 0) - (b.display_order || 0)))
      setAnalytics(Array.isArray(ar.data) ? ar.data : [])
    } catch {
      // non-critical — sections will be empty, UI shows appropriate state
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  const loadStaffPicks = useCallback(async () => {
    setSpLoading(true)
    try {
      const { data } = await api.get('/api/products?limit=200&is_active=true')
      const list = Array.isArray(data) ? data
        : Array.isArray(data?._list) ? data._list
        : Array.isArray(data?.products) ? data.products
        : []
      setAllProducts(list)
      setStaffPicks(new Set(list.filter(p => p.is_staff_pick).map(p => p.id)))
    } catch {
      // products list stays empty; user can retry with the Refresh button
    } finally {
      setSpLoading(false)
    }
  }, [])

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true)
    try {
      const { data } = await api.get('/api/brands?all=1')
      setBrands(Array.isArray(data) ? data : [])
    } catch {
      // brands list stays empty; user can retry with the Refresh button
    } finally {
      setBrandsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'staff_picks' && allProducts.length === 0) loadStaffPicks()
  }, [tab, allProducts.length, loadStaffPicks])

  useEffect(() => {
    if (tab === 'brands' && brands.length === 0) loadBrands()
  }, [tab, brands.length, loadBrands])

  // ── Staff Picks ──────────────────────────────────────────────
  async function toggleStaffPick(product) {
    const willBePick = !staffPicks.has(product.id)
    setSpSaving(product.id)
    try {
      await api.put(`/api/products/${product.id}`, { is_staff_pick: willBePick })
      setStaffPicks(prev => {
        const next = new Set(prev)
        willBePick ? next.add(product.id) : next.delete(product.id)
        return next
      })
    } catch {
      alert('Failed to update Staff Pick status')
    } finally { setSpSaving(null) }
  }

  // ── Section actions ──────────────────────────────────────────
  async function toggle(section) {
    setSaving(section.section_key)
    const res = await api.put(`/api/homepage/sections/${section.section_key}`, { is_active: !section.is_active })
    setSaving(null)
    if (res.error) { alert('Failed to update section: ' + (res.error?.message || res.error)); return }
    setSections(prev => prev.map(s =>
      s.section_key === section.section_key ? { ...s, is_active: !s.is_active } : s
    ))
  }

  async function moveOrder(section, direction) {
    const idx = sections.findIndex(s => s.section_key === section.section_key)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sections.length) return
    const next = [...sections]
    const aOrder   = next[idx].display_order
    const bOrder   = next[swapIdx].display_order
    const swapKey  = next[swapIdx].section_key   // capture before sort mutates positions
    next[idx]     = { ...next[idx],     display_order: bOrder }
    next[swapIdx] = { ...next[swapIdx], display_order: aOrder }
    next.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    setSections(next)
    setSaving(section.section_key)
    try {
      await Promise.all([
        api.put(`/api/homepage/sections/${section.section_key}`, { display_order: bOrder }),
        api.put(`/api/homepage/sections/${swapKey}`, { display_order: aOrder }),
      ])
    } catch { await load() }
    finally { setSaving(null) }
  }

  function openEdit(section) {
    const cfg = section.config || {}
    setEditKey(section.section_key)
    setEditForm({
      title:          section.title    || '',
      subtitle:       section.subtitle || '',
      is_active:      section.is_active ?? true,
      display_order:  section.display_order || 0,
      // config fields
      max_products:   cfg.max_products  || 15,
      layout_type:    cfg.layout_type   || 'carousel',
      sort_order:     cfg.sort_order    || 'newest',
      source_type:    cfg.source_type   || 'auto',
      category_slug:  cfg.category_slug || '',
      sub_slug:       cfg.sub_slug      || '',
      brand_name:     cfg.brand_name    || '',
      max_price:      cfg.max_price     || '',
      min_price:      cfg.min_price     || '',
      coupon_code:    cfg.coupon_code   || '',
      image_url:      cfg.image_url     || '',
      cta_text:       cfg.cta_text      || 'Shop Now',
      cta_destination:cfg.cta_destination || 'categories',
      bg_from:        cfg.bg_from       || '#7C3AED',
      bg_to:          cfg.bg_to         || '#5B21B6',
      schedule_start: toLocalDT(section.schedule_start),
      schedule_end:   toLocalDT(section.schedule_end),
    })
    setEditModal(true)
  }

  function setEF(k, v) { setEditForm(f => ({ ...f, [k]: v })) }

  async function saveEdit() {
    if (!editKey) return
    setSaving(editKey)
    try {
      const isDiscountBanner = editKey === 'discount_banner'
      const configPatch = isDiscountBanner
        ? {
            image_url:       editForm.image_url,
            coupon_code:     editForm.coupon_code,
            cta_text:        editForm.cta_text,
            cta_destination: editForm.cta_destination,
            bg_from:         editForm.bg_from,
            bg_to:           editForm.bg_to,
          }
        : {
            max_products: parseInt(editForm.max_products) || 15,
            layout_type:  editForm.layout_type,
            sort_order:   editForm.sort_order,
            source_type:  editForm.source_type,
            ...(editForm.category_slug && { category_slug: editForm.category_slug }),
            ...(editForm.sub_slug      && { sub_slug:      editForm.sub_slug }),
            ...(editForm.brand_name    && { brand_name:    editForm.brand_name }),
            ...(editForm.max_price     && { max_price:     Number(editForm.max_price) }),
            ...(editForm.min_price     && { min_price:     Number(editForm.min_price) }),
          }

      await api.put(`/api/homepage/sections/${editKey}`, {
        title:          editForm.title,
        subtitle:       editForm.subtitle,
        is_active:      editForm.is_active,
        display_order:  parseInt(editForm.display_order),
        config:         configPatch,
        schedule_start: editForm.schedule_start || null,
        schedule_end:   editForm.schedule_end   || null,
      })
      await load()
      setEditModal(false)
    } catch { alert('Failed to save changes') }
    finally { setSaving(null) }
  }

  // ── Brands ───────────────────────────────────────────────────
  function openNewBrand() {
    setBrandEdit(null)
    setBrandForm({
      name: '', slug: '', logo_url: '', banner_url: '', description: '',
      website_url: '', category_slug: '', is_active: true, is_featured: false,
      display_order: 0, start_date: '', end_date: '',
    })
    setBrandModal(true)
  }

  function openEditBrand(b) {
    setBrandEdit(b)
    setBrandForm({
      name:          b.name          || '',
      slug:          b.slug          || '',
      logo_url:      b.logo_url      || '',
      banner_url:    b.banner_url    || '',
      description:   b.description   || '',
      website_url:   b.website_url   || '',
      category_slug: b.category_slug || '',
      is_active:     b.is_active     ?? true,
      is_featured:   b.is_featured   ?? false,
      display_order: b.display_order || 0,
      start_date:    b.start_date ? b.start_date.slice(0,10) : '',
      end_date:      b.end_date   ? b.end_date.slice(0,10)   : '',
    })
    setBrandModal(true)
  }

  function setBF(k, v) { setBrandForm(f => ({ ...f, [k]: v })) }

  function autoSlug(name) {
    setBF('name', name)
    if (!brandEdit) {
      setBF('slug', name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
    }
  }

  async function saveBrand() {
    setBrandSaving(true)
    const res = brandEdit
      ? await api.put(`/api/brands/${brandEdit.id}`, brandForm)
      : await api.post('/api/brands', brandForm)
    setBrandSaving(false)
    if (res.error) { alert('Save failed: ' + (res.error?.message || res.error)); return }
    setBrandModal(false)
    await loadBrands()
  }

  async function deleteBrand(b) {
    if (!window.confirm(`Delete brand "${b.name}"?`)) return
    setBrandDeleting(b.id)
    try {
      await api.delete(`/api/brands/${b.id}`)
      setBrands(prev => prev.filter(x => x.id !== b.id))
    } catch { alert('Failed to delete brand') }
    finally { setBrandDeleting(null) }
  }

  // ── Derived ──────────────────────────────────────────────────
  const activeCount   = sections.filter(s => s.is_active).length
  const inactiveCount = sections.filter(s => !s.is_active).length
  const spPickCount   = staffPicks.size
  const spFiltered    = allProducts.filter(p =>
    !spSearch || p.name?.toLowerCase().includes(spSearch.toLowerCase()) ||
    p.brand?.toLowerCase().includes(spSearch.toLowerCase())
  )

  const totalClicks  = analytics.reduce((s, r) => s + (parseInt(r.product_clicks) || 0), 0)
  const totalRevenue = analytics.reduce((s, r) => s + (parseFloat(r.attributed_revenue) || 0), 0)
  const totalOrders  = analytics.reduce((s, r) => s + (parseInt(r.attributed_orders) || 0), 0)

  // ─────────────────────────────────────────────────────────────
  return (
    <>
    <Layout title="Homepage Manager">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutGrid size={24} className="text-teal-600" />
              Homepage Manager
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Configure sections, staff picks, brands, and view performance analytics.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'sections',    icon: LayoutGrid,   label: 'Sections' },
              { key: 'staff_picks', icon: Star,         label: `Staff Picks${spPickCount > 0 ? ` (${spPickCount})` : ''}` },
              { key: 'brands',      icon: ShoppingBag,  label: 'Brands' },
              { key: 'analytics',   icon: BarChart2,    label: 'Analytics' },
            ].map(({ key, icon: Icon, label }) => (
              <Button key={key}
                variant={tab === key ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTab(key)}
                icon={Icon}
              >
                {label}
              </Button>
            ))}
            <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Sections', value: sections.length, color: 'text-slate-700' },
            { label: 'Active',         value: activeCount,     color: 'text-teal-600'  },
            { label: 'Inactive',       value: inactiveCount,   color: 'text-slate-400' },
          ].map(({ label, value, color }) => (
            <Card key={label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </Card>
          ))}
        </div>

        {/* ── Sections tab ────────────────────────────────────── */}
        {tab === 'sections' && (
          <Card className="overflow-hidden">
            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-slate-100" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-48 rounded bg-slate-100" />
                      <div className="h-3 w-72 rounded bg-slate-100" />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-16 h-8 rounded-lg bg-slate-100" />
                      <div className="w-8 h-8 rounded-lg bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : sections.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <LayoutGrid size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No homepage sections found.</p>
                <p className="text-xs mt-1">Run the database migration to seed sections.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sections.map((section, idx) => {
                  const isFirst      = idx === 0
                  const isLast       = idx === sections.length - 1
                  const isBusy       = saving === section.section_key
                  const cfg          = section.config || {}
                  const catLabel     = cfg.sub_slug || cfg.category_slug || ''
                  const now          = new Date()
                  const isScheduled  = section.schedule_start && new Date(section.schedule_start) > now
                  const isExpired    = section.schedule_end   && new Date(section.schedule_end)   < now

                  return (
                    <div key={section.section_key}
                      className={`flex items-center gap-4 p-4 transition-colors ${
                        section.is_active ? 'bg-white' : 'bg-slate-50 opacity-70'
                      }`}>

                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                        {section.display_order}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{section.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                          </span>
                          {catLabel && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600">
                              <Tag size={10} /> {catLabel}
                            </span>
                          )}
                          {cfg.max_products && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">
                              max {cfg.max_products}
                            </span>
                          )}
                          {isScheduled && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                              ⏰ Scheduled
                            </span>
                          )}
                          {isExpired && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                              Expired
                            </span>
                          )}
                          {section.is_active && !isScheduled && !isExpired ? (
                            <span className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                              <CheckCircle size={12} /> Live
                            </span>
                          ) : !section.is_active ? (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <XCircle size={12} /> Off
                            </span>
                          ) : null}
                        </div>
                        {section.subtitle && (
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{section.subtitle}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{section.section_key}</p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button onClick={() => toggle(section)} disabled={isBusy}
                          title={section.is_active ? 'Disable' : 'Enable'}
                          className={`p-2 rounded-lg text-sm transition-colors ${
                            section.is_active
                              ? 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          } disabled:opacity-50`}>
                          {section.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                        </button>

                        <button onClick={() => openEdit(section)} disabled={isBusy}
                          className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-50"
                          title="Edit section">
                          <Edit2 size={15} />
                        </button>

                        {section.section_key === 'staff_picks' && (
                          <button onClick={() => setTab('staff_picks')}
                            className="p-2 rounded-lg bg-amber-50 text-amber-500 hover:bg-amber-100 transition-colors"
                            title="Manage Staff Picks">
                            <Star size={15} />
                          </button>
                        )}

                        <button onClick={() => moveOrder(section, 'up')} disabled={isFirst || isBusy}
                          className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-30">
                          <ArrowUp size={15} />
                        </button>
                        <button onClick={() => moveOrder(section, 'down')} disabled={isLast || isBusy}
                          className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors disabled:opacity-30">
                          <ArrowDown size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}

        {/* ── Staff Picks tab ──────────────────────────────────── */}
        {tab === 'staff_picks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Staff Picks — <span className="text-teal-600">{spPickCount} selected</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Products flagged here appear in the "Staff Picks" homepage section —
                  independent from "Exclusive Collection".
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={loadStaffPicks} disabled={spLoading}>
                <RefreshCw size={14} className={spLoading ? 'animate-spin' : ''} />
              </Button>
            </div>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Search products by name or brand…"
                value={spSearch} onChange={e => setSpSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500" />
            </div>

            {spLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : spFiltered.length === 0 ? (
              <Card className="text-center py-12 text-slate-400">
                <Package size={36} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No products found.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {spFiltered.map(product => {
                  const isPick = staffPicks.has(product.id)
                  const isBusy = spSaving === product.id
                  return (
                    <div key={product.id} onClick={() => !isBusy && toggleStaffPick(product)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isPick ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white hover:border-slate-300'
                      } ${isBusy ? 'opacity-60 cursor-wait' : ''}`}>
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          onError={e => { e.target.style.display = 'none' }} />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Package size={18} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{product.name}</p>
                        <p className="text-xs text-slate-500 truncate">{product.brand || '—'} · ₹{product.price}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isPick ? 'bg-amber-400' : 'bg-slate-100'}`}>
                        <Star size={12} className={isPick ? 'text-white fill-white' : 'text-slate-400'} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Brands tab ──────────────────────────────────────── */}
        {tab === 'brands' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                Brands <span className="text-slate-400">({brands.length})</span>
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={loadBrands} disabled={brandsLoading}>
                  <RefreshCw size={14} className={brandsLoading ? 'animate-spin' : ''} />
                </Button>
                <Button variant="primary" size="sm" onClick={openNewBrand} icon={Plus}>
                  Add Brand
                </Button>
              </div>
            </div>

            {brandsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-40 rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : brands.length === 0 ? (
              <Card className="text-center py-16 text-slate-400">
                <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No brands yet.</p>
                <Button variant="primary" size="sm" className="mt-4" onClick={openNewBrand} icon={Plus}>
                  Add first brand
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {brands.map(b => (
                  <Card key={b.id} className={`p-4 flex flex-col gap-3 ${!b.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      {b.logo_url ? (
                        <img src={b.logo_url} alt={b.name} className="h-10 w-20 object-contain" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">
                          {b.name[0]}
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        {b.is_featured && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                            Featured
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          b.is_active ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {b.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm truncate">{b.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">/{b.slug}</p>
                      {b.category_slug && (
                        <p className="text-[10px] text-teal-600 mt-0.5">📂 {b.category_slug}</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Button variant="secondary" size="sm" className="flex-1"
                        onClick={() => openEditBrand(b)}>
                        <Edit2 size={12} />
                      </Button>
                      <Button variant="danger" size="sm" className="flex-1"
                        onClick={() => deleteBrand(b)} disabled={brandDeleting === b.id}>
                        {brandDeleting === b.id ? '…' : <Trash2 size={12} />}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Analytics tab ────────────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Clicks (30d)',       value: totalClicks.toLocaleString(),  icon: TrendingUp,  color: 'text-teal-600'  },
                { label: 'Attributed Revenue (30d)',  value: fmtMoney(totalRevenue),         icon: DollarSign,  color: 'text-green-600' },
                { label: 'Attributed Orders (30d)',   value: totalOrders.toLocaleString(),   icon: ShoppingBag, color: 'text-blue-600'  },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="p-4 flex items-center gap-3">
                  <Icon size={20} className={color} />
                  <div>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </Card>
              ))}
            </div>

            {analytics.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-700 text-sm">Section Performance — Last 30 Days</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">Section</th>
                        <th className="px-4 py-3 text-right">Impressions</th>
                        <th className="px-4 py-3 text-right">Clicks</th>
                        <th className="px-4 py-3 text-right">Unique Users</th>
                        <th className="px-4 py-3 text-right">Orders (attr.)</th>
                        <th className="px-4 py-3 text-right">Revenue (attr.)</th>
                        <th className="px-4 py-3 text-right">Conv. Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analytics.map((row, i) => (
                        <tr key={row.section_key || i} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">
                            {row.section_key || '(global)'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {Number(row.impressions || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {Number(row.product_clicks || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {Number(row.unique_users || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {Number(row.attributed_orders || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-green-700">
                            {fmtMoney(row.attributed_revenue)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              parseFloat(row.conversion_rate) > 2
                                ? 'bg-teal-50 text-teal-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {row.conversion_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <Card className="text-center py-16 text-slate-400">
                <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Analytics data not available yet.</p>
                <p className="text-xs mt-1">Data populates after users interact with the homepage.</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </Layout>

    {/* ── Section Edit Modal — outside Layout (fixed positioning) ── */}
    {editModal && (
      <Modal open={editModal} onClose={() => setEditModal(false)}
        title={editKey === 'discount_banner' ? 'Edit Discount Banner' : 'Edit Section'}
        width="max-w-2xl">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

          {/* Common */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title</label>
              <Input value={editForm.title} onChange={e => setEF('title', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Subtitle</label>
              <Input value={editForm.subtitle} onChange={e => setEF('subtitle', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Display Order</label>
              <Input type="number" value={editForm.display_order}
                onChange={e => setEF('display_order', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Active</label>
              <select value={String(editForm.is_active)} onChange={e => setEF('is_active', e.target.value === 'true')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          {/* ── Discount banner config ── */}
          {editKey === 'discount_banner' && (
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Banner Config</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Banner Image URL (optional)</label>
                <Input value={editForm.image_url} onChange={e => setEF('image_url', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Coupon Code</label>
                <Input value={editForm.coupon_code}
                  onChange={e => setEF('coupon_code', e.target.value.toUpperCase())} placeholder="SAVE10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CTA Text</label>
                  <Input value={editForm.cta_text} onChange={e => setEF('cta_text', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Destination</label>
                  <select value={editForm.cta_destination} onChange={e => setEF('cta_destination', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
                    <option value="categories">All Categories</option>
                    <option value="products">All Products</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Standard section config ── */}
          {editKey !== 'discount_banner' && (
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Section Config</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Max Products</label>
                  <Input type="number" min={1} max={50} value={editForm.max_products}
                    onChange={e => setEF('max_products', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Layout Type</label>
                  <select value={editForm.layout_type} onChange={e => setEF('layout_type', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
                    {LAYOUT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sort Order</label>
                  <select value={editForm.sort_order} onChange={e => setEF('sort_order', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Product Source</label>
                <select value={editForm.source_type} onChange={e => setEF('source_type', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
                  {SOURCE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {(editForm.source_type === 'category') && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Category Slug</label>
                  <Input value={editForm.category_slug}
                    onChange={e => setEF('category_slug', e.target.value)} placeholder="e.g. beauty-personal-care" />
                </div>
              )}
              {(editForm.source_type === 'subcategory') && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Sub-category Slug</label>
                  <Input value={editForm.sub_slug}
                    onChange={e => setEF('sub_slug', e.target.value)} placeholder="e.g. mens-clothing" />
                </div>
              )}
              {(editForm.source_type === 'brand') && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Brand Name</label>
                  <Input value={editForm.brand_name} onChange={e => setEF('brand_name', e.target.value)} />
                </div>
              )}
              {(editForm.source_type === 'price_filter') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Max Price (₹)</label>
                    <Input type="number" value={editForm.max_price} onChange={e => setEF('max_price', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Min Price (₹) optional</label>
                    <Input type="number" value={editForm.min_price} onChange={e => setEF('min_price', e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Schedule <span className="font-normal normal-case text-slate-400">(optional — leave blank = always active)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Activate From</label>
                <Input type="datetime-local" value={editForm.schedule_start}
                  onChange={e => setEF('schedule_start', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Deactivate After</label>
                <Input type="datetime-local" value={editForm.schedule_end}
                  onChange={e => setEF('schedule_end', e.target.value)} />
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400">Changes take effect immediately — no app update needed.</p>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving === editKey}>
              {saving === editKey ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    )}

    {/* ── Brand Modal — outside Layout ── */}
    {brandModal && (
      <Modal open={brandModal} onClose={() => setBrandModal(false)}
        title={brandEdit ? `Edit — ${brandEdit.name}` : 'Add Brand'}
        width="max-w-lg">
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Brand Name *</label>
              <Input value={brandForm.name} onChange={e => autoSlug(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Slug *</label>
              <Input value={brandForm.slug} onChange={e => setBF('slug', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Logo URL</label>
            <Input value={brandForm.logo_url} onChange={e => setBF('logo_url', e.target.value)} placeholder="https://…" />
            {brandForm.logo_url && (
              <img src={brandForm.logo_url} alt="logo"
                className="mt-2 h-10 object-contain rounded border border-slate-200"
                onError={e => { e.target.style.display = 'none' }} />
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Banner URL (optional)</label>
            <Input value={brandForm.banner_url} onChange={e => setBF('banner_url', e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea value={brandForm.description} onChange={e => setBF('description', e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Website URL</label>
              <Input value={brandForm.website_url} onChange={e => setBF('website_url', e.target.value)} placeholder="https://brand.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Linked Category Slug</label>
              <Input value={brandForm.category_slug} onChange={e => setBF('category_slug', e.target.value)} placeholder="e.g. electronics" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Order</label>
              <Input type="number" value={brandForm.display_order} onChange={e => setBF('display_order', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Active</label>
              <select value={String(brandForm.is_active)} onChange={e => setBF('is_active', e.target.value === 'true')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Featured</label>
              <select value={String(brandForm.is_featured)} onChange={e => setBF('is_featured', e.target.value === 'true')}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-teal-500">
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Schedule <span className="font-normal normal-case text-slate-400">(optional)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Visible From</label>
                <Input type="date" value={brandForm.start_date} onChange={e => setBF('start_date', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Visible Until</label>
                <Input type="date" value={brandForm.end_date} onChange={e => setBF('end_date', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setBrandModal(false)}>Cancel</Button>
            <Button onClick={saveBrand} disabled={brandSaving}>
              {brandSaving ? 'Saving…' : (brandEdit ? 'Save Changes' : 'Add Brand')}
            </Button>
          </div>
        </div>
      </Modal>
    )}
    </>
  )
}
