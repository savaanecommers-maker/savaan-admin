import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Table, Badge, Button, Modal, Input, Select, Card, Pagination, formatPrice } from '../components/ui/index'
import api from '../config/api'
import { Plus, Search, Download, Edit2, Trash2, Package, Upload, X, Loader, Layers, ShoppingBag, Copy, ToggleLeft, ToggleRight, Image } from 'lucide-react'
import RichTextEditor from '../components/ui/RichTextEditor'

// ── Category intelligence: auto-suggest variant product for apparel/footwear
const VARIANT_CATEGORY_KEYWORDS = ['fashion', 'wear', 'clothing', 'footwear', 'apparel', 'shoes', 'sandals', 'sneakers', 'saree', 'kurti', 'kids']
function isFashionCategory(catName = '') {
  const lower = catName.toLowerCase()
  return VARIANT_CATEGORY_KEYWORDS.some(k => lower.includes(k))
}

// ── Group categories by parent for the product category dropdowns.
// Products are assigned to a specific subcategory, never to a broad
// top-level grouping (every parent here has children) — so parents render
// as <optgroup> labels only, never as a selectable value themselves. A
// parent with no children at all still renders as a plain selectable
// option, so this stays correct if a childless top-level category is
// ever added later.
function groupCategoriesForSelect(categories) {
  const parents  = categories.filter(c => !c.parent_id)
  const byParent = id => categories.filter(c => c.parent_id === id)
  const groups = []
  const standalone = []
  for (const p of parents) {
    const children = byParent(p.id)
    if (children.length) groups.push({ parent: p, children })
    else standalone.push(p)
  }
  return { groups, standalone }
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
  'mobiles-accessories':{ Storage: ['32GB','64GB','128GB','256GB','512GB','1TB'], RAM: ['3GB','4GB','6GB','8GB','12GB','16GB'], OS: ['Android','iOS','Other'] },
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
  const [variantCategoryName, setVariantCategoryName] = useState('')
  const [variants, setVariants]                       = useState([])
  const EMPTY_VARIANT = { variant_name: '', color: '', size: '', stock: 0, price: '', sale_price: '', sku: '', status: 'active', images: [], attributes: {} }
  const [variantForm, setVariantForm]                 = useState(EMPTY_VARIANT)
  const [savingVariant, setSavingVariant]             = useState(false)
  // Bulk size-add defaults — quick-adding 5+ sizes used to create every
  // variant with stock=0, leaving the admin to open and edit each one
  // individually just to set a stock number. These let one stock/price
  // value apply to every size added in the same bulk action.
  const [bulkStock, setBulkStock] = useState('')
  const [bulkPrice, setBulkPrice] = useState('')
  const [editingVariantId, setEditingVariantId]       = useState(null)
  const [editVariantValues, setEditVariantValues]     = useState({})
  const [uploadingVariantImg, setUploadingVariantImg] = useState(false)

  const mountedRef = useRef(true)
  const [loadError, setLoadError] = useState(null)
  const PER_PAGE = 10

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    setLoadError(null)
    const [pr, cr] = await Promise.all([
      api.get('/api/products/all'),
      api.get('/api/categories'),
    ])
    if (!mountedRef.current) return
    if (pr.error) {
      setLoadError(pr.error?.message || 'Failed to load products')
      setLoading(false)
      return
    }
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
    // Resolve the TOP-LEVEL ancestor category (e.g. "Footwear"), not the
    // leaf subcategory name (e.g. "Women's Footwear", "Sandals" renamed to
    // something else, etc). Leaf names are admin-editable free text and
    // can drift away from any keyword match, silently hiding the
    // quick-add-sizes panel. Top-level category names are the stable,
    // structural label this detection should actually key off of.
    let cat = categories.find(c => c.id === product.category_id)
    while (cat?.parent_id) {
      cat = categories.find(c => c.id === cat.parent_id) || cat
      if (!cat?.parent_id) break
    }
    setVariantCategoryName(cat?.name || product.category_name || '')
    setVariantForm(EMPTY_VARIANT)
    setEditingVariantId(null)
    setBulkStock('')
    setBulkPrice('')
    await refreshVariants(product.id)
    setVariantModal(true)
  }

  async function refreshVariants(productId) {
    const { data } = await api.get(`/api/products/${productId || variantProductId}/variants`)
    setVariants(Array.isArray(data) ? data : [])
  }

  async function addVariant() {
    const hasAnyField = variantForm.color || variantForm.size || Object.keys(variantForm.attributes || {}).filter(k => variantForm.attributes[k]).length > 0 || variantForm.variant_name
    if (!hasAnyField) {
      alert('Please fill in at least one field: Color, Size, an attribute (Storage/RAM), or a Variant Name.')
      return
    }
    setSavingVariant(true)
    // Auto-generate variant_name if not provided
    const autoName = variantForm.variant_name || [variantForm.color, variantForm.size, ...Object.values(variantForm.attributes || {})].filter(Boolean).join(' / ')
    const res = await api.post(`/api/products/${variantProductId}/variants`, {
      variant_name: autoName || null,
      color:        variantForm.color      || null,
      size:         variantForm.size       || null,
      stock:        parseInt(variantForm.stock) || 0,
      price:        variantForm.price      ? parseFloat(variantForm.price)      : null,
      sale_price:   variantForm.sale_price ? parseFloat(variantForm.sale_price) : null,
      sku:          variantForm.sku        || null,
      status:       variantForm.status     || 'active',
      images:       variantForm.images     || [],
      attributes:   variantForm.attributes || {},
    })
    if (res.error) {
      alert('Failed to add variant: ' + (res.error?.message || res.error))
      setSavingVariant(false)
      return
    }
    setVariantForm(EMPTY_VARIANT)
    await refreshVariants()
    setSavingVariant(false)
  }

  // Quick-add a full size preset at once, using the bulk stock/price (if set)
  // for every size in the batch — saves opening and editing each variant
  // individually just to set the same stock number on all of them.
  async function addSizePreset(sizes) {
    setSavingVariant(true)
    const color = variantForm.color || null
    const stock = parseInt(bulkStock) || 0
    const price = bulkPrice ? parseFloat(bulkPrice) : null
    const toAdd = sizes.filter(sz =>
      !variants.some(v => v.size === sz && (color ? v.color === color : !v.color))
    )
    await Promise.all(toAdd.map(sz => {
      const autoName = [color, sz].filter(Boolean).join(' / ')
      return api.post(`/api/products/${variantProductId}/variants`, {
        size: sz, color, stock, price,
        variant_name: autoName || null,
        status: 'active', images: [], attributes: {},
      })
    }))
    await refreshVariants()
    setSavingVariant(false)
  }

  async function duplicateVariant(v) {
    setSavingVariant(true)
    const res = await api.post(`/api/products/${variantProductId}/variants`, {
      variant_name: v.variant_name ? v.variant_name + ' (copy)' : null,
      color:      v.color, size: v.size,
      stock:      v.stock, price: v.price,
      sale_price: v.sale_price, sku: v.sku ? v.sku + '-copy' : null,
      status:     v.status || 'active',
      images:     Array.isArray(v.images) ? v.images : [],
      attributes: v.attributes || {},
    })
    if (res.error) { alert('Duplicate failed: ' + (res.error?.message || res.error)) }
    else await refreshVariants()
    setSavingVariant(false)
  }

  async function uploadVariantImage(file) {
    setUploadingVariantImg(true)
    const form = new FormData()
    form.append('file', file)
    const res = await api.upload('/api/upload', form)
    if (res.error) { alert('Upload failed: ' + res.error?.message); setUploadingVariantImg(false); return }
    const url = res.data?.url
    if (url) setVariantForm(prev => ({ ...prev, images: [...(prev.images || []), url] }))
    setUploadingVariantImg(false)
  }

  function startEditVariant(v) {
    setEditingVariantId(v.id)
    setEditVariantValues({
      variant_name: v.variant_name || '',
      color:      v.color      || '',
      size:       v.size       || '',
      stock:      v.stock      ?? 0,
      price:      v.price      || '',
      sale_price: v.sale_price || '',
      sku:        v.sku        || '',
      status:     v.status     || 'active',
      images:     Array.isArray(v.images) ? v.images : [],
      attributes: v.attributes || {},
    })
  }

  async function saveEditVariant(variantId) {
    const autoName = editVariantValues.variant_name ||
      [editVariantValues.color, editVariantValues.size, ...Object.values(editVariantValues.attributes || {})].filter(Boolean).join(' / ')
    const res = await api.put(`/api/products/${variantProductId}/variants/${variantId}`, {
      variant_name: autoName || null,
      color:      editVariantValues.color      || null,
      size:       editVariantValues.size       || null,
      stock:      parseInt(editVariantValues.stock) || 0,
      price:      editVariantValues.price      ? parseFloat(editVariantValues.price)      : null,
      sale_price: editVariantValues.sale_price ? parseFloat(editVariantValues.sale_price) : null,
      sku:        editVariantValues.sku        || null,
      status:     editVariantValues.status     || 'active',
      images:     editVariantValues.images     || [],
      attributes: editVariantValues.attributes || {},
    })
    if (res.error) { alert('Failed to update variant: ' + (res.error?.message || res.error)); return }
    setEditingVariantId(null)
    await refreshVariants()
  }

  async function uploadEditVariantImage(file) {
    const form = new FormData()
    form.append('file', file)
    const res = await api.upload('/api/upload', form)
    if (res.error) { alert('Upload failed: ' + res.error?.message); return }
    const url = res.data?.url
    if (url) setEditVariantValues(prev => ({ ...prev, images: [...(prev.images || []), url] }))
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

  // ── Export filtered products as CSV
  function exportCSV() {
    const rows = filtered
    const headers = ['ID', 'Name', 'Category', 'Price', 'Sale Price', 'Stock', 'SKU', 'Status', 'Flash Deal', 'Staff Pick']
    const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [
      headers.join(','),
      ...rows.map(p => [
        p.id, p.name,
        p.category_name ?? '',
        p.price ?? '',
        p.sale_price ?? '',
        p.stock ?? 0,
        p.sku ?? '',
        p.is_active ? 'Active' : 'Inactive',
        p.is_flash_deal ? 'Yes' : 'No',
        p.is_staff_pick ? 'Yes' : 'No',
      ].map(escape).join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `savaan-products-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Total variant stock
  const totalVariantStock = variants.reduce((s, v) => s + (parseInt(v.stock) || 0), 0)

  const { groups: catGroups, standalone: catStandalone } = groupCategoriesForSelect(categories)

  return (
    <Layout title="Products">
      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:outline-none focus:border-teal-500">
            <option value="all">All Categories</option>
            {catGroups.map(({ parent, children }) => (
              <optgroup key={parent.id} label={parent.name}>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
            {catStandalone.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" icon={Download} size="sm" onClick={exportCSV}>Export</Button>
            <Button icon={Plus} size="sm" onClick={openAdd}>Add Product</Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading products...</div>
        ) : loadError ? (
          <div className="py-16 text-center">
            <p className="text-red-500 text-sm font-medium mb-2">Failed to load products</p>
            <p className="text-slate-400 text-xs mb-4">{loadError}</p>
            <button onClick={load} className="text-teal-600 text-sm underline">Retry</button>
          </div>
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
            {catGroups.map(({ parent, children }) => (
              <optgroup key={parent.id} label={parent.name}>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
            {catStandalone.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                        if (error) throw new Error(error.message || 'Upload failed')
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
      {variantModal && (() => {
        const catKey   = slugToAttrKey(variantCategoryName) || ''
        const isFashion   = ['fashion','footwear'].includes(catKey)
        const isFootwear  = catKey === 'footwear'
        const isPerfume   = catKey === 'perfumes'
        const isBeauty    = catKey === 'beauty'
        const isElectronics = ['electronics','mobiles-accessories'].includes(catKey)
        const isWatch     = catKey === 'watches'

        // Category-specific size options
        const sizeOptions = isFootwear
          ? ['UK 4','UK 5','UK 6','UK 7','UK 8','UK 9','UK 10','UK 11','UK 12']
          : isFashion
            ? ['XS','S','M','L','XL','XXL','3XL','4XL']
            : isPerfume || isBeauty
              ? ['15ml','20ml','30ml','50ml','75ml','100ml','150ml','200ml']
              : []

        // Category-specific extra attribute options
        const extraAttrs = isElectronics || isWatch
          ? CATEGORY_ATTRIBUTES[catKey] || {}
          : {}

        // Color presets by category
        const colorPresets = isWatch
          ? ['Black','White','Gold','Silver','Rose Gold','Blue','Brown','Green']
          : ['Black','White','Red','Blue','Green','Pink','Yellow','Grey','Brown','Beige','Maroon','Purple','Navy','Orange','Teal']

        const fldCls = "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-400"
        const lblCls = "text-[10px] font-semibold text-slate-500 mb-1 block"

        function VariantImageSection({ imgs, onAdd, onRemove, color }) {
          const hasColor = color && color !== '__custom__' && color.trim() !== ''
          return (
            <div className={`rounded-xl p-3 border transition-colors ${hasColor ? 'border-violet-200 bg-violet-50/40' : 'border-slate-200 bg-slate-50/40'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Image size={13} className={hasColor ? 'text-violet-500' : 'text-slate-400'} />
                <label className={`text-[10px] font-bold uppercase tracking-wide ${hasColor ? 'text-violet-600' : 'text-slate-500'}`}>
                  {hasColor ? `Images for "${color}" colour` : 'Variant Images'}
                  <span className="ml-1 font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                </label>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(imgs || []).map((url, i) => (
                  <div key={url + i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => onRemove(i)}
                      className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
                <label className={`w-14 h-14 rounded-lg border border-dashed flex items-center justify-center cursor-pointer transition-colors ${hasColor ? 'border-violet-300 hover:border-violet-500 bg-white hover:bg-violet-50' : 'border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50'}`}>
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={e => { if (e.target.files) Array.from(e.target.files).forEach(f => onAdd(f)) }} />
                  {uploadingVariantImg
                    ? <Loader size={14} className="animate-spin text-slate-400" />
                    : <Plus size={14} className={hasColor ? 'text-violet-400' : 'text-slate-400'} />}
                </label>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                {hasColor
                  ? `Add photos showing the ${color} colour. Storage/RAM variants sharing the same colour can reuse the main product images.`
                  : 'Add images only if this variant looks visually different (e.g. different colour). Storage, RAM, and size variants can skip this.'}
              </p>
            </div>
          )
        }

        return (
          <Modal open={variantModal} onClose={() => { setVariantModal(false); load() }}
            title={`Variants — ${variantProductName}`} width="max-w-3xl">

            {/* ── Quick-add size preset strip ── */}
            {sizeOptions.length > 0 && (
              <div className="mb-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
                <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-2">
                  Quick-add {isFootwear ? 'UK' : ''} sizes
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <select value={variantForm.color || ''}
                    onChange={e => setVariantForm(p => ({ ...p, color: e.target.value }))}
                    className="text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white text-violet-700">
                    <option value="">No color</option>
                    {colorPresets.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" min={0} placeholder="Stock for each size"
                    value={bulkStock} onChange={e => setBulkStock(e.target.value)}
                    className="text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white w-36" />
                  <input type="number" min={0} placeholder="Price (optional)"
                    value={bulkPrice} onChange={e => setBulkPrice(e.target.value)}
                    className="text-xs border border-violet-200 rounded-lg px-2 py-1.5 bg-white w-32" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {sizeOptions.map(sz => {
                    const exists = variants.some(v => v.size === sz && (!variantForm.color || v.color === variantForm.color))
                    return (
                      <button key={sz} disabled={savingVariant || exists}
                        onClick={() => addSizePreset([sz])}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          exists ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                 : 'bg-white border border-violet-200 text-violet-700 hover:bg-violet-100'
                        }`}>
                        {sz}{exists ? ' ✓' : ''}
                      </button>
                    )
                  })}
                  {sizeOptions.length > 0 && (
                    <button disabled={savingVariant}
                      onClick={() => addSizePreset(sizeOptions.filter(sz => !variants.some(v => v.size === sz && (!variantForm.color || v.color === variantForm.color))))}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
                      + Add All
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Existing variants table ── */}
            {variants.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-5 border border-dashed border-slate-200 rounded-xl mb-4">
                No variants yet — add one below.
              </p>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-hidden mb-4">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <p className="text-xs font-semibold text-slate-600">{variants.length} variants · {totalVariantStock} total units</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        {['Variant', 'Color', 'Size', 'Attributes', 'Stock', 'Price', 'Sale Price', 'SKU', 'Images', 'Status', ''].map(h => (
                          <th key={h} className="text-left py-2 px-2.5 text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map(v => {
                        const isEditing = editingVariantId === v.id
                        const varImgs = Array.isArray(v.images) ? v.images : []
                        return (
                          <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/60 group align-top">
                            {isEditing ? (
                              <>
                                <td className="py-2 px-2 min-w-[120px]">
                                  <input value={editVariantValues.variant_name || ''}
                                    onChange={e => setEditVariantValues(p => ({ ...p, variant_name: e.target.value }))}
                                    placeholder="Auto-generated" className={fldCls} />
                                </td>
                                <td className="py-2 px-2 min-w-[120px]">
                                  <select value={editVariantValues.color || ''}
                                    onChange={e => setEditVariantValues(p => ({ ...p, color: e.target.value }))}
                                    className={fldCls}>
                                    <option value="">None</option>
                                    {colorPresets.map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="__custom__">Custom…</option>
                                  </select>
                                  {editVariantValues.color === '__custom__' && (
                                    <input className={fldCls + ' mt-1'} placeholder="Enter color"
                                      onChange={e => setEditVariantValues(p => ({ ...p, color: e.target.value }))} />
                                  )}
                                </td>
                                <td className="py-2 px-2 min-w-[100px]">
                                  {sizeOptions.length > 0 ? (
                                    <select value={editVariantValues.size || ''} onChange={e => setEditVariantValues(p => ({ ...p, size: e.target.value }))} className={fldCls}>
                                      <option value="">None</option>
                                      {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  ) : (
                                    <input value={editVariantValues.size || ''} onChange={e => setEditVariantValues(p => ({ ...p, size: e.target.value }))} placeholder="e.g. M" className={fldCls} />
                                  )}
                                </td>
                                <td className="py-2 px-2 min-w-[140px]">
                                  {Object.entries(editVariantValues.attributes || {}).map(([k, val]) => (
                                    <div key={k} className="flex items-center gap-1 mb-1">
                                      <span className="text-[10px] text-slate-400 w-16 shrink-0">{k}</span>
                                      <input value={val} onChange={e => setEditVariantValues(p => ({ ...p, attributes: { ...p.attributes, [k]: e.target.value } }))}
                                        className={fldCls + ' flex-1'} />
                                    </div>
                                  ))}
                                  {(!editVariantValues.attributes || Object.keys(editVariantValues.attributes).length === 0) && (
                                    <span className="text-slate-300 text-[10px]">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-2 w-20">
                                  <input type="number" min={0} value={editVariantValues.stock}
                                    onChange={e => setEditVariantValues(p => ({ ...p, stock: e.target.value }))}
                                    className={fldCls} autoFocus />
                                </td>
                                <td className="py-2 px-2 w-24">
                                  <input type="number" min={0} value={editVariantValues.price || ''} placeholder="Base"
                                    onChange={e => setEditVariantValues(p => ({ ...p, price: e.target.value }))} className={fldCls} />
                                </td>
                                <td className="py-2 px-2 w-24">
                                  <input type="number" min={0} value={editVariantValues.sale_price || ''} placeholder="—"
                                    onChange={e => setEditVariantValues(p => ({ ...p, sale_price: e.target.value }))} className={fldCls} />
                                </td>
                                <td className="py-2 px-2 w-24">
                                  <input value={editVariantValues.sku || ''} placeholder="SKU"
                                    onChange={e => setEditVariantValues(p => ({ ...p, sku: e.target.value }))} className={fldCls} />
                                </td>
                                <td className="py-2 px-2">
                                  <VariantImageSection
                                    imgs={editVariantValues.images || []}
                                    onAdd={uploadEditVariantImage}
                                    onRemove={i => setEditVariantValues(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))}
                                    color={editVariantValues.color}
                                  />
                                </td>
                                <td className="py-2 px-2">
                                  <select value={editVariantValues.status || 'active'} onChange={e => setEditVariantValues(p => ({ ...p, status: e.target.value }))} className={fldCls}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                </td>
                                <td className="py-2 px-2">
                                  <div className="flex gap-1">
                                    <button onClick={() => saveEditVariant(v.id)}
                                      className="px-2 py-1 rounded bg-teal-600 text-white text-[10px] font-bold hover:bg-teal-700">Save</button>
                                    <button onClick={() => setEditingVariantId(null)}
                                      className="px-2 py-1 rounded bg-slate-100 text-slate-500 text-[10px] hover:bg-slate-200">×</button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-2.5">
                                  <span className="font-semibold text-slate-700">{v.variant_name || '—'}</span>
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="flex items-center gap-1.5">
                                    {v.color && <div className="w-3.5 h-3.5 rounded-full border border-slate-200 flex-shrink-0" style={{ backgroundColor: v.color.toLowerCase() }} />}
                                    <span className="text-slate-700">{v.color || <span className="text-slate-300">—</span>}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${v.size ? 'bg-slate-100 text-slate-700' : 'text-slate-300'}`}>{v.size || '—'}</span>
                                </td>
                                <td className="py-2 px-2.5">
                                  {v.attributes && Object.keys(v.attributes).length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(v.attributes).map(([k, val]) => (
                                        <span key={k} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold whitespace-nowrap">
                                          <span className="text-blue-400">{k}:</span> {val}
                                        </span>
                                      ))}
                                    </div>
                                  ) : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="py-2 px-2.5">
                                  <span className={`font-semibold ${parseInt(v.stock) === 0 ? 'text-red-500' : parseInt(v.stock) <= 5 ? 'text-amber-500' : 'text-slate-700'}`}>{v.stock}</span>
                                </td>
                                <td className="py-2 px-2.5">
                                  <span className={v.price ? 'text-teal-600 font-semibold' : 'text-slate-300'}>{v.price ? `₹${parseFloat(v.price).toLocaleString('en-IN')}` : '—'}</span>
                                </td>
                                <td className="py-2 px-2.5">
                                  {v.sale_price ? (
                                    <div>
                                      <span className="text-rose-600 font-semibold">{`₹${parseFloat(v.sale_price).toLocaleString('en-IN')}`}</span>
                                      {v.price && <span className="ml-1 text-[10px] text-green-600 font-semibold">
                                        ({Math.round((parseFloat(v.price) - parseFloat(v.sale_price)) / parseFloat(v.price) * 100)}% off)
                                      </span>}
                                    </div>
                                  ) : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="py-2 px-2.5">
                                  <span className="text-slate-500 font-mono text-[10px]">{v.sku || '—'}</span>
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="flex gap-1">
                                    {varImgs.slice(0, 3).map((url, i) => (
                                      <img key={i} src={url} alt="" className="w-7 h-7 rounded object-cover border border-slate-200" />
                                    ))}
                                    {varImgs.length > 3 && <span className="text-slate-400 text-[10px] self-center">+{varImgs.length - 3}</span>}
                                    {varImgs.length === 0 && <span className="text-slate-300">—</span>}
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${v.status === 'inactive' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                    {v.status || 'active'}
                                  </span>
                                </td>
                                <td className="py-2 px-2.5">
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => startEditVariant(v)} title="Edit"
                                      className="p-1 rounded hover:bg-violet-50 text-slate-400 hover:text-violet-600"><Edit2 size={11} /></button>
                                    <button onClick={() => duplicateVariant(v)} title="Duplicate"
                                      className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600"><Copy size={11} /></button>
                                    <button onClick={() => deleteVariant(v.id)} title="Delete"
                                      className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 size={11} /></button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Add variant form ── */}
            <div className="border border-dashed border-violet-200 rounded-xl p-4 bg-violet-50/30">
              <p className="text-xs font-bold text-violet-700 mb-3">Add Variant</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="col-span-2 sm:col-span-3">
                  <label className={lblCls}>Variant Name <span className="font-normal text-slate-400">(auto-generated if empty)</span></label>
                  <input value={variantForm.variant_name} placeholder="e.g. Black XL"
                    onChange={e => setVariantForm(p => ({ ...p, variant_name: e.target.value }))} className={fldCls} />
                </div>

                <div>
                  <label className={lblCls}>Color</label>
                  <select value={variantForm.color}
                    onChange={e => setVariantForm(p => ({ ...p, color: e.target.value === '__custom__' ? '' : e.target.value }))}
                    className={fldCls}>
                    <option value="">None</option>
                    {colorPresets.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="__custom__">Custom…</option>
                  </select>
                  {variantForm.color === '__custom__' || (!colorPresets.includes(variantForm.color) && variantForm.color) ? (
                    <input className={fldCls + ' mt-1'} value={variantForm.color === '__custom__' ? '' : variantForm.color}
                      placeholder="Enter color name" onChange={e => setVariantForm(p => ({ ...p, color: e.target.value }))} />
                  ) : null}
                </div>

                <div>
                  <label className={lblCls}>Size</label>
                  {sizeOptions.length > 0 ? (
                    <select value={variantForm.size} onChange={e => setVariantForm(p => ({ ...p, size: e.target.value }))} className={fldCls}>
                      <option value="">None</option>
                      {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input value={variantForm.size} placeholder="e.g. 500ml, Large"
                      onChange={e => setVariantForm(p => ({ ...p, size: e.target.value }))} className={fldCls} />
                  )}
                </div>

                {/* Extra attributes for electronics / watches */}
                {Object.entries(extraAttrs).slice(0, 4).map(([attr, opts]) => (
                  <div key={attr}>
                    <label className={lblCls}>{attr}</label>
                    <select value={variantForm.attributes?.[attr] || ''}
                      onChange={e => setVariantForm(p => ({ ...p, attributes: { ...(p.attributes || {}), [attr]: e.target.value } }))}
                      className={fldCls}>
                      <option value="">Select</option>
                      {opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}

                <div>
                  <label className={lblCls}>Stock *</label>
                  <input type="number" min={0} value={variantForm.stock}
                    onChange={e => setVariantForm(p => ({ ...p, stock: e.target.value }))} className={fldCls} />
                </div>

                <div>
                  <label className={lblCls}>Price (₹) <span className="font-normal text-slate-400">override</span></label>
                  <input type="number" min={0} value={variantForm.price} placeholder="Same as base"
                    onChange={e => setVariantForm(p => ({ ...p, price: e.target.value }))} className={fldCls} />
                </div>

                <div>
                  <label className={lblCls}>Sale Price (₹)</label>
                  <input type="number" min={0} value={variantForm.sale_price} placeholder="—"
                    onChange={e => setVariantForm(p => ({ ...p, sale_price: e.target.value }))} className={fldCls} />
                </div>

                <div>
                  <label className={lblCls}>SKU</label>
                  <input value={variantForm.sku} placeholder="e.g. BLK-XL-001"
                    onChange={e => setVariantForm(p => ({ ...p, sku: e.target.value }))} className={fldCls} />
                </div>

                <div>
                  <label className={lblCls}>Status</label>
                  <select value={variantForm.status} onChange={e => setVariantForm(p => ({ ...p, status: e.target.value }))} className={fldCls}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-3">
                  <VariantImageSection
                    imgs={variantForm.images}
                    onAdd={uploadVariantImage}
                    onRemove={i => setVariantForm(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))}
                    color={variantForm.color}
                  />
                </div>
              </div>

              <button onClick={addVariant}
                disabled={savingVariant || (!variantForm.color && !variantForm.size && !variantForm.variant_name && Object.keys(variantForm.attributes || {}).filter(k => variantForm.attributes[k]).length === 0)}
                className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors">
                <Plus size={13} />
                {savingVariant ? 'Saving…' : 'Add Variant'}
              </button>
            </div>

            <div className="flex justify-end mt-4 pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => { setVariantModal(false); load() }}>Done</Button>
            </div>
          </Modal>
        )
      })()}
    </Layout>
  )
}
