import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Table, Badge, Button, Modal, Input, Select, Card, Pagination, formatPrice } from '../components/ui/index'
import api from '../config/api'
import { Plus, Search, Download, Edit2, Trash2, Package, Upload, X, Loader, Layers, ShoppingBag } from 'lucide-react'
import RichTextEditor from '../components/ui/RichTextEditor'

// ── Category intelligence: auto-suggest variant product for apparel/footwear
const VARIANT_CATEGORY_KEYWORDS = ['fashion', 'wear', 'clothing', 'footwear', 'apparel', 'shoes', 'sandals', 'sneakers', 'saree', 'kurti', 'kids']
function isFashionCategory(catName = '') {
  const lower = catName.toLowerCase()
  return VARIANT_CATEGORY_KEYWORDS.some(k => lower.includes(k))
}

// ── Preset size groups
const SIZE_PRESETS = {
  clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  footwear: ['5', '6', '7', '8', '9', '10', '11', '12'],
  kids:     ['2Y', '3Y', '4Y', '5Y', '6Y', '7Y', '8Y', '10Y', '12Y'],
  tops:     ['28', '30', '32', '34', '36', '38', '40', '42'],
}

// Category-specific attribute options (matches Flutter filter panel)
const CATEGORY_ATTRIBUTES = {
  fashion:              { Gender: ['Men','Women','Unisex','Boys','Girls'], Material: ['Cotton','Polyester','Silk','Linen','Denim','Leather','Wool'] },
  footwear:             { Gender: ['Men','Women','Unisex','Boys','Girls'], Material: ['Leather','Canvas','Synthetic','Rubber','Suede'], Closure: ['Lace-up','Slip-on','Velcro','Buckle'] },
  watches:              { Gender: ['Men','Women','Unisex'], 'Strap Material': ['Leather','Metal','Rubber','Silicone','Mesh'], 'Dial Shape': ['Round','Square','Rectangle','Oval'], Features: ['Water Resistant','Chronograph','Automatic','Smart','Quartz'] },
  perfumes:             { Gender: ['Men','Women','Unisex'], 'Fragrance Family': ['Floral','Woody','Oriental','Fresh','Citrus','Aquatic','Musky'], Volume: ['30ml','50ml','75ml','100ml','200ml'] },
  electronics:          { Storage: ['64GB','128GB','256GB','512GB'], RAM: ['4GB','6GB','8GB','12GB','16GB'], Features: ['Wireless','Bluetooth','WiFi','Fast Charging','USB-C'] },
  beauty:               { 'Skin Type': ['Oily','Dry','Combination','Sensitive','All'], Formulation: ['Cream','Serum','Gel','Oil','Powder'] },
  'home-decor':         { Style: ['Modern','Traditional','Bohemian','Minimalist','Rustic'], Room: ['Living Room','Bedroom','Kitchen','Bathroom','Office'] },
  'jewelry-accessories':{ Gender: ['Men','Women','Unisex'], 'Metal Type': ['Gold','Silver','Rose Gold','Platinum','Brass'], Stone: ['Diamond','Ruby','Emerald','Sapphire','Pearl','None'] },
  'bags-luggage':       { Gender: ['Men','Women','Unisex'], Type: ['Backpack','Handbag','Tote','Clutch','Wallet','Luggage'], Material: ['Leather','Canvas','Nylon','Polyester'] },
  'health-wellness':    { Form: ['Tablet','Capsule','Liquid','Powder','Cream'], Benefits: ['Immunity','Energy','Sleep','Weight','Skin','Hair'] },
  'mobiles-accessories':{ OS: ['Android','iOS','Other'], Features: ['5G','Wireless Charging','Fast Charging','Foldable'] },
  'seasonal-collections':{ Season: ['Summer','Winter','Monsoon','Festive'], Gender: ['Men','Women','Unisex','Kids'] },
}

// Map a category slug (or parent slug) to a CATEGORY_ATTRIBUTES key
function slugToAttrKey(slug = '') {
  const s = slug.toLowerCase()
  if (s.startsWith('fashion') || s.includes('clothing') || s.includes('apparel') ||
      s.includes('kurta') || s.includes('saree') || s.includes('shirts') ||
      s.includes('dresses') || s.includes('trousers') || s.includes('tops') ||
      s.includes('jeans') || s.includes('mens-') || s.includes('womens-') ||
      s.includes('boys-') || s.includes('girls-') || s.includes('kids-fashion')) return 'fashion'
  if (s.startsWith('footwear') || s.includes('shoes') || s.includes('sneakers') ||
      s.includes('boots') || s.includes('sandals') || s.includes('slippers') ||
      s.includes('heels') || s.includes('loafers') || s.includes('flip-flops')) return 'footwear'
  if (s.startsWith('watches') || s.includes('watch')) return 'watches'
  if (s.startsWith('perfumes') || s.includes('fragrance') || s.includes('cologne') ||
      s.includes('attar') || s.includes('deodorant')) return 'perfumes'
  if (s.startsWith('jewelry') || s.includes('rings') || s.includes('necklace') ||
      s.includes('bracelet') || s.includes('earring') || s.includes('pendant') ||
      s.includes('bangles') || s.includes('chains') || s.includes('wallets') ||
      s.includes('belts')) return 'jewelry-accessories'
  if (s.startsWith('bags') || s.includes('luggage') || s.includes('handbag') ||
      s.includes('backpack') || s.includes('trolley') || s.includes('travel-bag') ||
      s.includes('laptop-bag')) return 'bags-luggage'
  if (s.startsWith('beauty') || s.includes('skincare') || s.includes('makeup') ||
      s.includes('hair-care') || s.includes('moistur') || s.includes('personal-care')) return 'beauty'
  if (s.startsWith('mobiles') || s.includes('mobile-phones') || s.includes('smartphones') ||
      s.includes('chargers') || s.includes('power-bank') || s.includes('cases-covers')) return 'mobiles-accessories'
  if (s.startsWith('electronics') || s.includes('laptops') || s.includes('headphones') ||
      s.includes('tablets') || s.includes('cameras') || s.includes('speakers') ||
      s.includes('television')) return 'electronics'
  if (s.startsWith('home-decor') || s.includes('furniture') || s.includes('decorative') ||
      s.includes('clocks') || s.includes('lighting') || s.includes('bedding')) return 'home-decor'
  if (s.startsWith('health') || s.includes('wellness') || s.includes('vitamins') ||
      s.includes('supplements') || s.includes('nutrition') || s.includes('fitness')) return 'health-wellness'
  if (s.startsWith('seasonal') || s.includes('festival') || s.includes('summer-') ||
      s.includes('winter-') || s.includes('monsoon') || s.includes('festive')) return 'seasonal-collections'
  return null
}

// Check category slug first, then parent category slug
function getCategoryAttrs(catSlug = '', parentSlug = '') {
  const key = slugToAttrKey(catSlug) || slugToAttrKey(parentSlug)
  return key ? (CATEGORY_ATTRIBUTES[key] || {}) : {}
}

const EMPTY = {
  name: '', sku: '', category_id: '', brand: '', description: '',
  price: '', original_price: '', stock: 0, is_featured: false,
  is_flash_deal: false, is_staff_pick: false, images: [], has_variants: false,
  attributes: [],
}

export default function Products() {
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [catFilter, setCatFilter]   = useState('all')
  const [page, setPage]             = useState(1)
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [uploading, setUploading]   = useState(false)
  const dragIdx = useRef(null)

  // Variant modal state
  const [variantModal, setVariantModal]               = useState(false)
  const [variantProductId, setVariantProductId]       = useState(null)
  const [variantProductName, setVariantProductName]   = useState('')
  const [variants, setVariants]                       = useState([])
  const [variantForm, setVariantForm]                 = useState({ color: '', size: '', stock: 0, price: '' })
  const [savingVariant, setSavingVariant]             = useState(false)
  const [editingVariantId, setEditingVariantId]       = useState(null)
  const [editVariantValues, setEditVariantValues]     = useState({})

  const mountedRef = useRef(true)
  const PER_PAGE = 10

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    const [pr, cr] = await Promise.all([
      api.get('/api/products/all'),
      api.get('/api/categories'),
    ])
    if (!mountedRef.current) return
    setProducts(pr.data?.products ?? pr.data ?? [])
    setCategories(cr.data?._list ?? cr.data ?? [])
    setLoading(false)
  }

  // ── Auto-suggest has_variants when category changes
  function onCategoryChange(catId) {
    const cat = categories.find(c => c.id === catId)
    const suggest = cat ? isFashionCategory(cat.name) : false
    setForm(prev => ({ ...prev, category_id: catId, has_variants: suggest }))
  }

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
                        p.brand?.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || p.category_id === catFilter
    return matchSearch && matchCat
  })

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  function openAdd() { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(p) {
    setEditing(p.id)
    setForm({
      ...p,
      price: p.price?.toString(),
      original_price: p.original_price?.toString() || '',
      images: p.images || [],
      has_variants: p.has_variants || false,
      attributes: Array.isArray(p.attributes) ? p.attributes : [],
    })
    setModal(true)
  }

  async function save() {
    if (!form.name || !form.price) return
    setSaving(true)
    const payload = {
      name: form.name, sku: form.sku, category_id: form.category_id || null,
      brand: form.brand, description: form.description,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      stock: form.has_variants ? 0 : (parseInt(form.stock) || 0),
      is_featured:   form.is_featured,
      is_flash_deal: form.is_flash_deal,
      is_staff_pick: form.is_staff_pick,
      has_variants:  form.has_variants,
      images: form.images,
      image_url: form.images?.[0] || null,
      attributes: (form.attributes || []).length > 0 ? form.attributes : null,
    }
    let res
    if (editing) {
      res = await api.put(`/api/products/${editing}`, payload)
    } else {
      res = await api.post('/api/products', payload)
    }
    setSaving(false)
    if (res.error) { alert('Save failed: ' + (res.error?.message || res.error)); return }

    // If variant product, auto-open variant modal after save
    if (form.has_variants) {
      const savedProduct = res.data
      setModal(false)
      await load()
      if (savedProduct?.id) {
        openVariants({ id: savedProduct.id, name: savedProduct.name, has_variants: true })
      }
    } else {
      setModal(false); load()
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm('Are you sure you want to delete this product? This cannot be undone.')) return
    const res = await api.delete(`/api/products/${id}`)
    if (res.error) {
      alert('Delete failed: ' + (res.error?.message || JSON.stringify(res.error)))
      return
    }
    if (res.data?.message === 'deactivated') {
      alert('This product has existing orders and cannot be fully deleted. It has been deactivated and hidden from the store instead.')
    }
    // Optimistic: remove from local state immediately, then reload for accuracy
    setProducts(prev => prev.filter(p => p.id !== id))
    load()
  }

  // ── Variant modal ────────────────────────────────────────────────────────────

  async function openVariants(product) {
    setVariantProductId(product.id)
    setVariantProductName(product.name)
    setVariantForm({ color: '', size: '', stock: 0, price: '' })
    setEditingVariantId(null)
    await refreshVariants(product.id)
    setVariantModal(true)
  }

  async function refreshVariants(productId) {
    const { data } = await api.get(`/api/products/${productId || variantProductId}/variants`)
    setVariants(Array.isArray(data) ? data : [])
  }

  async function addVariant() {
    if (!variantForm.color && !variantForm.size) return
    setSavingVariant(true)
    const res = await api.post(`/api/products/${variantProductId}/variants`, {
      color: variantForm.color || null,
      size:  variantForm.size  || null,
      stock: parseInt(variantForm.stock) || 0,
      price: variantForm.price ? parseFloat(variantForm.price) : null,
    })
    if (res.error) {
      alert('Failed to add variant: ' + (res.error?.message || res.error))
      setSavingVariant(false)
      return
    }
    setVariantForm({ color: '', size: '', stock: 0, price: '' })
    await refreshVariants()
    setSavingVariant(false)
  }

  // Quick-add a full size preset (all sizes at once with 0 stock)
  async function addSizePreset(sizes) {
    setSavingVariant(true)
    for (const sz of sizes) {
      // Skip if already exists
      const exists = variants.some(v => v.size === sz && !v.color)
      if (!exists) {
        await api.post(`/api/products/${variantProductId}/variants`, {
          size: sz, stock: 0, color: null, price: null,
        })
      }
    }
    await refreshVariants()
    setSavingVariant(false)
  }

  function startEditVariant(v) {
    setEditingVariantId(v.id)
    setEditVariantValues({ stock: v.stock, price: v.price || '' })
  }

  async function saveEditVariant(variantId) {
    const res = await api.put(`/api/products/${variantProductId}/variants/${variantId}`, {
      stock: parseInt(editVariantValues.stock) || 0,
      price: editVariantValues.price ? parseFloat(editVariantValues.price) : null,
    })
    if (res.error) { alert('Failed to update variant: ' + (res.error?.message || res.error)); return }
    setEditingVariantId(null)
    await refreshVariants()
  }

  async function deleteVariant(variantId) {
    if (!confirm('Delete this variant?')) return
    const res = await api.delete(`/api/products/${variantProductId}/variants/${variantId}`)
    if (res.error) { alert('Failed to delete variant: ' + (res.error?.message || res.error)); return }
    await refreshVariants()
  }

  // ── Table columns ────────────────────────────────────────────────────────────

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
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={`font-semibold text-xs ${row.is_active === false ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{v}</p>
              {row.is_active === false && (
                <span className="inline-flex px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[9px] font-bold">
                  INACTIVE
                </span>
              )}
              {row.has_variants && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[9px] font-bold">
                  <Layers size={8} />VARIANTS
                </span>
              )}
            </div>
            <p className="text-slate-400 text-[10px]">{row.brand}</p>
          </div>
        </div>
      )
    },
    { key: 'sku', label: 'SKU', render: v => v || '—' },
    { key: 'category_name', label: 'Category', render: v => v || '—' },
    { key: 'price', label: 'Price', render: v => formatPrice(v) },
    {
      key: 'stock', label: 'Stock',
      render: (v, row) => row.has_variants
        ? <span className="text-violet-600 text-xs font-semibold">{v} total</span>
        : <span className="text-xs">{v}</span>
    },
    {
      key: 'stock_status', label: 'Status',
      render: (v, row) => <Badge label={row.stock > 5 ? 'Active' : row.stock > 0 ? 'Low Stock' : 'Out of Stock'} />
    },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <button onClick={e => { e.stopPropagation(); openVariants(row) }}
            title="Manage Variants"
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
              row.has_variants
                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            {row.has_variants ? 'Variants' : '+ Variants'}
          </button>
          <button onClick={e => { e.stopPropagation(); openEdit(row) }}
            className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={e => { e.stopPropagation(); deleteProduct(v) }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )
    },
  ]

  // ── Total variant stock
  const totalVariantStock = variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)

  return (
    <Layout title="Products">
      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:border-teal-500">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" icon={Download} size="sm">Export</Button>
            <Button icon={Plus} size="sm" onClick={openAdd}>Add Product</Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading products...</div>
        ) : (
          <>
            <Table columns={cols} data={paginated} />
            <div className="px-4 pb-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {filtered.length === 0
                  ? 'No products found'
                  : `Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE, filtered.length)} of ${filtered.length} products`}
              </p>
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* ── Add / Edit Modal ────────────────────────────────────── */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Product' : 'Add Product'} width="max-w-3xl">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Product Name *" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})} placeholder="Enter product name" />
          <Input label="SKU" value={form.sku}
            onChange={e => setForm({...form, sku: e.target.value})} placeholder="Enter SKU" />

          <Select label="Category" value={form.category_id} onChange={e => onCategoryChange(e.target.value)}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Brand" value={form.brand}
            onChange={e => setForm({...form, brand: e.target.value})} placeholder="Enter brand" />

          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Description</label>
            <RichTextEditor
              value={form.description}
              onChange={val => setForm({...form, description: val})}
              placeholder="Enter product description — use the toolbar to format text, add headings, bullet points and more..."
            />
          </div>

          {/* Product Images */}
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Product Images</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(form.images || []).map((url, i) => (
                <div key={url + i}
                  draggable
                  onDragStart={() => { dragIdx.current = i }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => {
                    const from = dragIdx.current
                    if (from === null || from === i) return
                    const imgs = [...form.images]
                    imgs.splice(i, 0, imgs.splice(from, 1)[0])
                    setForm(prev => ({ ...prev, images: imgs }))
                    dragIdx.current = null
                  }}
                  onDragEnd={() => { dragIdx.current = null }}
                  className="relative group w-16 h-16 rounded-lg overflow-hidden border border-slate-200 cursor-grab active:cursor-grabbing">
                  {i === 0 && (
                    <span className="absolute top-0 left-0 z-10 bg-teal-500 text-white text-[8px] font-bold px-1 rounded-br">Main</span>
                  )}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button"
                    onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, idx) => idx !== i) }))}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <X size={14} className="text-white" />
                  </button>
                </div>
              ))}
              <label className={`w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-teal-400 transition-colors ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
                {uploading ? <Loader size={16} className="text-slate-400 animate-spin" /> : <Upload size={16} className="text-slate-400" />}
                <span className="text-[9px] text-slate-400 mt-1">{uploading ? 'Uploading…' : 'Upload'}</span>
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading}
                  onChange={async e => {
                    const files = Array.from(e.target.files || [])
                    if (!files.length) return
                    setUploading(true)
                    try {
                      const urls = await Promise.all(files.map(async file => {
                        const fd = new FormData()
                        fd.append('file', file)
                        const { data, error } = await api.upload('/api/upload?folder=products', fd)
                        if (error) throw new Error(error)
                        return data.url
                      }))
                      setForm(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }))
                    } catch (err) {
                      alert('Upload failed: ' + err.message)
                    } finally {
                      setUploading(false)
                      e.target.value = ''
                    }
                  }} />
              </label>
            </div>
            <input type="url" placeholder="Or paste image URL..."
              className="mt-1 w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-500"
              onKeyDown={e => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  e.preventDefault()
                  setForm(prev => ({ ...prev, images: [...(prev.images || []), e.target.value.trim()] }))
                  e.target.value = ''
                }
              }} />
          </div>

          {/* Pricing */}
          <Input label="Base Price (₹) *" type="number" value={form.price}
            onChange={e => setForm({...form, price: e.target.value})} placeholder="0.00" />
          <Input label="Original Price (₹)" type="number" value={form.original_price}
            onChange={e => setForm({...form, original_price: e.target.value})} placeholder="0.00" />

          {/* Product Type + Stock */}
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Product Type</label>
            <div className="flex gap-3">
              <button type="button"
                onClick={() => setForm(f => ({ ...f, has_variants: false }))}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  !form.has_variants
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <ShoppingBag size={16} />
                <div className="text-left">
                  <p className="text-xs font-bold">Simple Product</p>
                  <p className="text-[10px] font-normal text-current opacity-70">1 price · 1 stock qty</p>
                </div>
                {!form.has_variants && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
              <button type="button"
                onClick={() => setForm(f => ({ ...f, has_variants: true }))}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  form.has_variants
                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'
                }`}>
                <Layers size={16} />
                <div className="text-left">
                  <p className="text-xs font-bold">Variant Product</p>
                  <p className="text-[10px] font-normal text-current opacity-70">Sizes · Colors · per-size stock</p>
                </div>
                {form.has_variants && (
                  <div className="ml-auto w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                )}
              </button>
            </div>
            {form.has_variants && (
              <p className="text-[11px] text-violet-600 mt-2 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2">
                ✦ Stock is managed per-size. After saving, you'll be prompted to set up sizes & stock quantities.
              </p>
            )}
          </div>

          {/* Stock — only for simple products */}
          {!form.has_variants && (
            <div>
              <Input label="Stock Quantity" type="number" value={form.stock}
                onChange={e => setForm({...form, stock: e.target.value})} />
            </div>
          )}

          {/* Options checkboxes */}
          <div className={`flex flex-col gap-3 ${!form.has_variants ? '' : 'col-start-2'}`}>
            <label className="text-xs font-semibold text-slate-600">Options</label>
            {[
              { key: 'is_featured',   label: 'Featured Product' },
              { key: 'is_flash_deal', label: 'Flash Deal' },
              { key: 'is_staff_pick', label: 'Staff Pick', note: '(shows in Staff Picks section)' },
            ].map(({ key, label, note }) => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={!!form[key]}
                  onChange={e => setForm({...form, [key]: e.target.checked})}
                  className="accent-teal-600" />
                {label}
                {note && <span className="text-xs text-slate-400">{note}</span>}
              </label>
            ))}
          </div>

          {/* Product Attributes (filter tags) */}
          {(() => {
            const cat = categories.find(c => c.id === form.category_id)
            const parentCat = cat?.parent_id ? categories.find(c => c.id === cat.parent_id) : null
            const attrs = getCategoryAttrs(cat?.slug || '', parentCat?.slug || '')
            const groups = Object.entries(attrs)
            if (groups.length === 0) return null
            return (
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-600 mb-2 block">
                  Product Attributes <span className="text-slate-400 font-normal">(used by filters in the app)</span>
                </label>
                <div className="space-y-3 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {groups.map(([group, values]) => (
                    <div key={group}>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {values.map(val => {
                          const checked = (form.attributes || []).includes(val)
                          return (
                            <label key={val}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-all ${
                                checked
                                  ? 'bg-teal-50 border-teal-400 text-teal-700'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                              }`}>
                              <input type="checkbox" className="hidden" checked={checked}
                                onChange={() => {
                                  const cur = form.attributes || []
                                  setForm(f => ({
                                    ...f,
                                    attributes: checked ? cur.filter(a => a !== val) : [...cur, val],
                                  }))
                                }} />
                              {checked && <span className="text-teal-500">✓</span>}
                              {val}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : form.has_variants && !editing
              ? 'Save & Set Up Variants →'
              : editing ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </Modal>

      {/* ── Variants Modal ──────────────────────────────────────── */}
      <Modal open={variantModal} onClose={() => setVariantModal(false)}
        title={`Variants — ${variantProductName}`} width="max-w-2xl">

        {/* Preset quick-add buttons */}
        <div className="mb-4">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide mb-2">Quick-add preset sizes</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SIZE_PRESETS).map(([label, sizes]) => (
              <button key={label}
                disabled={savingVariant}
                onClick={() => addSizePreset(sizes)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-700 text-xs font-semibold transition-colors disabled:opacity-50 capitalize">
                {label} ({sizes.join(', ')})
              </button>
            ))}
          </div>
        </div>

        {/* Variants table */}
        {variants.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 border border-dashed border-slate-200 rounded-xl mb-4">
            No variants yet. Use quick-add above or add manually below.
          </p>
        ) : (
          <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600">{variants.length} variants · {totalVariantStock} total units</p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Color', 'Size', 'Stock', 'Price Override', ''].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/60 group">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        {v.color && (
                          <div className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0"
                            style={{ backgroundColor: v.color.toLowerCase() }} />
                        )}
                        <span>{v.color || <span className="text-slate-300">—</span>}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-semibold ${
                        v.size ? 'bg-slate-100 text-slate-700' : 'text-slate-300'
                      }`}>{v.size || '—'}</span>
                    </td>
                    <td className="py-2 px-3 w-24">
                      {editingVariantId === v.id ? (
                        <input type="number" min={0} value={editVariantValues.stock}
                          onChange={e => setEditVariantValues(p => ({ ...p, stock: e.target.value }))}
                          className="w-16 px-2 py-1 border border-violet-300 rounded text-xs focus:outline-none focus:border-violet-500"
                          autoFocus />
                      ) : (
                        <span className={`font-semibold ${
                          parseInt(v.stock) === 0 ? 'text-red-500' :
                          parseInt(v.stock) <= 5  ? 'text-amber-500' : 'text-slate-700'
                        }`}>{v.stock}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 w-28">
                      {editingVariantId === v.id ? (
                        <input type="number" min={0} placeholder="Base price"
                          value={editVariantValues.price}
                          onChange={e => setEditVariantValues(p => ({ ...p, price: e.target.value }))}
                          className="w-20 px-2 py-1 border border-violet-300 rounded text-xs focus:outline-none focus:border-violet-500" />
                      ) : (
                        <span className={v.price ? 'text-teal-600 font-semibold' : 'text-slate-300'}>
                          {v.price ? `₹${parseFloat(v.price).toLocaleString('en-IN')}` : '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        {editingVariantId === v.id ? (
                          <>
                            <button onClick={() => saveEditVariant(v.id)}
                              className="px-2 py-1 rounded bg-teal-600 text-white text-[10px] font-bold hover:bg-teal-700">Save</button>
                            <button onClick={() => setEditingVariantId(null)}
                              className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] hover:bg-slate-200">×</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEditVariant(v)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Edit2 size={11} />
                            </button>
                            <button onClick={() => deleteVariant(v.id)}
                              className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                              <X size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add single variant form */}
        <div className="border border-dashed border-slate-200 rounded-xl p-4">
          <p className="text-xs font-bold text-slate-600 mb-3">Add Single Variant</p>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Size</label>
              <input value={variantForm.size} placeholder="e.g. M, L, 8"
                onChange={e => setVariantForm({ ...variantForm, size: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-400" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Color (optional)</label>
              <input value={variantForm.color} placeholder="e.g. Black"
                onChange={e => setVariantForm({ ...variantForm, color: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-400" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Stock</label>
              <input type="number" min={0} value={variantForm.stock}
                onChange={e => setVariantForm({ ...variantForm, stock: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-400" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Price Override (₹)</label>
              <input type="number" min={0} value={variantForm.price} placeholder="Same as base"
                onChange={e => setVariantForm({ ...variantForm, price: e.target.value })}
                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-400" />
            </div>
          </div>
          <button onClick={addVariant} disabled={savingVariant || (!variantForm.color && !variantForm.size)}
            className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors">
            <Plus size={13} />
            {savingVariant ? 'Adding...' : 'Add Variant'}
          </button>
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setVariantModal(false)}>Done</Button>
        </div>
      </Modal>
    </Layout>
  )
}
