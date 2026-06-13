import { useEffect, useRef, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Button, Modal, Input, Card } from '../components/ui/index'
import api from '../config/api'
import {
  Plus, Edit2, Trash2, Upload, Loader, ChevronDown,
  ChevronRight, Star, Check,
} from 'lucide-react'

// ── Compact always-visible toggle switch ─────────────────────────────────────
function ActiveToggle({ active, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); if (!disabled) onChange() }}
      disabled={disabled}
      title={active ? 'Click to disable' : 'Click to enable'}
      className="flex items-center gap-1.5 flex-shrink-0 group/tog"
    >
      {/* track */}
      <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200
        ${active ? 'bg-teal-500' : 'bg-slate-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        {/* thumb */}
        <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full
          shadow-sm transition-transform duration-200
          ${active ? 'translate-x-[14px]' : ''}`} />
      </div>
      <span className={`text-[11px] font-medium leading-none
        ${active ? 'text-teal-600' : 'text-slate-400'}`}>
        {active ? 'On' : 'Off'}
      </span>
    </button>
  )
}

const EMPTY = {
  name: '', slug: '', image_url: '', description: '',
  parent_id: null, is_featured: false, display_order: 0, is_active: true,
}

// ── Reusable searchable dropdown ─────────────────────────────────────────────
function SearchableSelect({ value, onChange, options, placeholder, loading }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function outside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    return () => document.removeEventListener('mousedown', outside)
  }, [])

  const q        = search.toLowerCase()
  const filtered  = options.filter(o => (o.label || '').toLowerCase().includes(q))
  const selected  = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { if (!loading) { setOpen(o => !o); setSearch('') } }}
        disabled={loading}
        className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 bg-white text-left disabled:bg-slate-50 disabled:text-slate-400"
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {loading ? 'Loading…' : (selected?.label || placeholder || 'Select…')}
        </span>
        {loading
          ? <Loader size={13} className="text-slate-400 animate-spin flex-shrink-0" />
          : <ChevronDown size={14} className={`text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
        }
      </button>

      {open && !loading && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0
              ? <div className="px-3 py-2.5 text-xs text-slate-400 text-center">No results</div>
              : filtered.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value || null); setOpen(false); setSearch('') }}
                  className={[
                    'w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors',
                    o.isCreate
                      ? 'text-teal-600 font-medium border-t border-slate-100 hover:bg-teal-50'
                      : 'text-slate-700 hover:bg-slate-50',
                    o.value === value ? 'bg-teal-50 text-teal-700 font-medium' : '',
                  ].join(' ')}
                >
                  <span>{o.label}</span>
                  {o.value === value && <Check size={13} className="text-teal-600 flex-shrink-0" />}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Categories() {
  const [cats, setCats]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [modal, setModal]             = useState(false)
  const [editing, setEditing]         = useState(null)      // ID when editing via Edit btn
  const [form, setForm]               = useState(EMPTY)
  const [saving, setSaving]           = useState(false)
  const [uploading, setUploading]     = useState(false)
  const [expanded, setExpanded]       = useState({})
  const [subcats, setSubcats]         = useState([])        // subs under selected parent
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [selectedSubId, setSelectedSubId] = useState(null) // null | 'CREATE_NEW' | UUID

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/api/categories?all=1')
    if (!mountedRef.current) return
    const sorted = (data || []).sort((a, b) => {
      if (a.display_order !== b.display_order) return a.display_order - b.display_order
      return a.name.localeCompare(b.name)
    })
    setCats(sorted)
    const exp = {}
    sorted.filter(c => !c.parent_id).forEach(c => { exp[c.id] = true })
    setExpanded(exp)
    setLoading(false)
  }

  // Open modal to add (optionally with a pre-selected parent)
  function openAdd(parentId = null) {
    setEditing(null)
    setSelectedSubId(null)
    setSubcats([])
    setForm({ ...EMPTY, parent_id: parentId })
    setModal(true)
    if (parentId) fetchSubcats(parentId)
  }

  async function fetchSubcats(parentId) {
    setLoadingSubs(true)
    try {
      const { data } = await api.get(`/api/categories/${parentId}/subcategories?all=1`)
      setSubcats(data || [])
    } finally {
      setLoadingSubs(false)
    }
  }

  // Open modal to edit an existing category directly
  function openEdit(c) {
    setEditing(c.id)
    setSelectedSubId(null)
    setSubcats([])
    setForm({
      name:          c.name          || '',
      slug:          c.slug          || '',
      image_url:     c.image_url     || '',
      description:   c.description   || '',
      parent_id:     c.parent_id     || null,
      is_featured:   c.is_featured   || false,
      display_order: c.display_order || 0,
      is_active:     c.is_active     !== false,
    })
    setModal(true)
  }

  function closeModal() {
    setModal(false)
    setEditing(null)
    setSelectedSubId(null)
    setSubcats([])
    setForm(EMPTY)
  }

  function autoSlug(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  function handleNameChange(name) {
    const slug = autoSlug(name)
    setForm(f => ({ ...f, name, slug: f.slug === autoSlug(f.name) ? slug : f.slug }))
  }

  // Parent selector change
  function handleParentChange(newParentId) {
    if (editing) {
      // In edit mode: just update parent, keep all other fields
      setForm(f => ({ ...f, parent_id: newParentId || null }))
      return
    }
    // In add mode: reset form (keep parent_id), reload subcategory list
    setForm({ ...EMPTY, parent_id: newParentId || null })
    setSelectedSubId(null)
    setSubcats([])
    if (newParentId) fetchSubcats(newParentId)
  }

  // Subcategory selector change (add mode only)
  function handleSubSelect(subId) {
    setSelectedSubId(subId)
    if (!subId || subId === 'CREATE_NEW') {
      // Reset form fields (keep parent_id)
      setForm(f => ({ ...EMPTY, parent_id: f.parent_id }))
    } else {
      // Existing sub selected → prefill for editing
      const sub = subcats.find(s => s.id === subId)
      if (sub) {
        setForm({
          name:          sub.name          || '',
          slug:          sub.slug          || '',
          image_url:     sub.image_url     || '',
          description:   sub.description   || '',
          parent_id:     sub.parent_id     || null,
          is_featured:   sub.is_featured   || false,
          display_order: sub.display_order || 0,
          is_active:     sub.is_active     !== false,
        })
      }
    }
  }

  async function save() {
    if (!form.name || !form.slug) return
    setSaving(true)

    // Client-side duplicate name check (backed up by server + DB constraint)
    if (form.parent_id && subcats.length > 0) {
      const saveId = editing || (selectedSubId && selectedSubId !== 'CREATE_NEW' ? selectedSubId : null)
      const dupe   = subcats.find(s =>
        s.name.toLowerCase() === form.name.toLowerCase() && s.id !== saveId
      )
      if (dupe) {
        alert(`A subcategory named "${dupe.name}" already exists under this parent.`)
        setSaving(false)
        return
      }
    }

    const payload = {
      name:          form.name,
      slug:          form.slug,
      image_url:     form.image_url   || null,
      description:   form.description || null,
      parent_id:     form.parent_id   || null,
      is_featured:   form.is_featured,
      display_order: parseInt(form.display_order) || 0,
      is_active:     form.is_active,
    }

    // Determine PUT id: explicit edit OR existing sub selected from dropdown
    const putId = editing || (selectedSubId && selectedSubId !== 'CREATE_NEW' ? selectedSubId : null)

    const res = putId
      ? await api.put(`/api/categories/${putId}`, payload)
      : await api.post('/api/categories', payload)

    setSaving(false)

    if (res.error) {
      const msg = res.error.message || 'Save failed'
      alert(msg.includes('already exists') ? msg : 'Save failed: ' + msg)
      return
    }

    closeModal()
    load()
  }

  async function del(id, hasChildren) {
    if (hasChildren) {
      alert('Cannot delete: this category has subcategories. Delete subcategories first.')
      return
    }
    if (!confirm('Delete this category?')) return
    const res = await api.delete(`/api/categories/${id}`)
    if (res.error) { alert('Delete failed: ' + (res.error?.message || res.error)); return }
    load()
  }

  async function toggleActive(id) {
    const res = await api.patch(`/api/categories/${id}/toggle-active`, {})
    if (res.error) { alert('Toggle failed: ' + (res.error?.message || res.error)); return }
    load()
  }

  function toggleExpand(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }))
  }

  // Derived data
  const parents       = cats.filter(c => !c.parent_id)
  const childrenOf    = pid => cats.filter(c => c.parent_id === pid)
  const orphans       = cats.filter(c => c.parent_id && !cats.find(p => p.id === c.parent_id))
  const totalParents  = parents.length
  const totalSubs     = cats.filter(c => c.parent_id).length
  const totalActive   = cats.filter(c => c.is_active).length

  // Dropdown option lists
  const parentOptions = [
    { value: '', label: '— None (top-level parent) —' },
    ...cats
      .filter(c => !c.parent_id && c.id !== editing)
      .map(c => ({ value: c.id, label: c.name || '(unnamed)' })),
  ]
  const subOptions = [
    ...subcats.map(s => ({ value: s.id, label: s.name || '(unnamed)' })),
    { value: 'CREATE_NEW', label: '+ Create New Subcategory', isCreate: true },
  ]

  // When to show full form fields
  const showFormFields = !!editing || !form.parent_id || selectedSubId !== null

  // Modal title
  const modalTitle = editing             ? 'Edit Category'
    : !form.parent_id                    ? 'Add Parent Category'
    : selectedSubId === 'CREATE_NEW'     ? 'Create New Subcategory'
    : selectedSubId                      ? 'Edit Subcategory'
    :                                      'Add Subcategory'

  // Save button label
  const saveLabel = saving                          ? 'Saving…'
    : editing                                       ? 'Save Changes'
    : selectedSubId === 'CREATE_NEW'                ? 'Create Subcategory'
    : selectedSubId                                 ? 'Save Changes'
    :                                                 'Add Category'

  // Item count display (prefer real-time product_count, fall back to stored item_count)
  const itemCount = c => c.product_count ?? c.item_count ?? 0

  return (
    <>
    <Layout title="Categories">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Total Categories</p>
          <p className="text-2xl font-bold text-slate-800">{cats.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Parent Categories</p>
          <p className="text-2xl font-bold text-teal-600">{totalParents}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Subcategories</p>
          <p className="text-2xl font-bold text-slate-600">{totalSubs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-emerald-600">{totalActive}</p>
        </Card>
      </div>

      {/* Category tree */}
      <Card>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <p className="text-sm text-slate-500">{cats.length} categories total</p>
          <Button icon={Plus} size="sm" onClick={() => openAdd()}>Add Parent Category</Button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {parents.map(parent => {
              const children   = childrenOf(parent.id)
              const isExpanded = expanded[parent.id]
              return (
                <div key={parent.id}>
                  {/* Parent row */}
                  <div className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 group ${!parent.is_active ? 'opacity-50' : ''}`}>
                    <button onClick={() => toggleExpand(parent.id)}
                      className="text-slate-400 hover:text-slate-600 flex-shrink-0 w-5">
                      {children.length > 0
                        ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />)
                        : <span className="w-3.5 h-3.5 block" />}
                    </button>

                    {parent.image_url
                      ? <img src={parent.image_url} alt={parent.name}
                          className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-sm flex-shrink-0">
                          {parent.name[0]}
                        </div>
                    }

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800">{parent.name}</span>
                        <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">Parent</span>
                        {parent.is_featured && (
                          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Star size={9} /> Featured
                          </span>
                        )}
                        {!parent.is_active && (
                          <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                        )}
                        {children.length > 0 && (
                          <span className="text-xs text-slate-400">{children.length} subcategories</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {parent.slug}
                        {parent.display_order > 0 && ` · Order: ${parent.display_order}`}
                      </p>
                    </div>

                    <span className="text-xs text-slate-400 w-14 text-right flex-shrink-0">
                      {itemCount(parent)} items
                    </span>

                    {/* Always-visible enable/disable toggle */}
                    <ActiveToggle
                      active={parent.is_active}
                      onChange={() => toggleActive(parent.id)}
                    />

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openAdd(parent.id)} title="Add subcategory"
                        className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
                        <Plus size={13} />
                      </button>
                      <button onClick={() => openEdit(parent)}
                        className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => del(parent.id, children.length > 0)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Subcategory rows */}
                  {isExpanded && children.map(child => (
                    <div key={child.id}
                      className={`flex items-center gap-3 px-4 py-2.5 bg-slate-50/50 hover:bg-slate-50 group ${!child.is_active ? 'opacity-50' : ''}`}>
                      <div className="w-5 flex-shrink-0" />
                      <div className="w-3 h-px bg-slate-200 flex-shrink-0 ml-1 mr-1" />
                      {child.image_url
                        ? <img src={child.image_url} alt={child.name}
                            className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                        : <div className="w-7 h-7 rounded-md bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs flex-shrink-0">
                            {child.name[0]}
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-700">{child.name}</span>
                          {child.is_featured && <Star size={10} className="text-amber-500" />}
                          {!child.is_active && (
                            <span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">Inactive</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{child.slug}</p>
                      </div>
                      <span className="text-xs text-slate-400 w-14 text-right flex-shrink-0">
                        {itemCount(child)} items
                      </span>
                      {/* Always-visible enable/disable toggle */}
                      <ActiveToggle
                        active={child.is_active}
                        onChange={() => toggleActive(child.id)}
                      />
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(child)}
                          className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => del(child.id, false)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Orphaned subcategories */}
            {orphans.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs text-amber-600 font-medium mb-2">⚠ Orphaned subcategories (parent not found)</p>
                {orphans.map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-1.5 group">
                    <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm text-slate-700">{c.name}</span>
                      <p className="text-xs text-slate-400">{c.slug}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => del(c.id, false)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cats.length === 0 && (
              <div className="py-16 text-center text-slate-400 text-sm">
                No categories yet. Add your first category.
              </div>
            )}
          </div>
        )}
      </Card>

    </Layout>

    {/* Modal rendered OUTSIDE Layout so position:fixed isn't trapped inside any CSS transform */}
    <Modal open={modal} onClose={closeModal} title={modalTitle}>
        <div className="space-y-4">

          {/* Parent Category (searchable) */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
              Parent Category{' '}
              <span className="text-slate-400 font-normal">(leave empty for top-level)</span>
            </label>
            <SearchableSelect
              value={form.parent_id || ''}
              onChange={handleParentChange}
              options={parentOptions}
              placeholder="— None (top-level parent) —"
            />
          </div>

          {/* Subcategory selector — add mode only, after parent is chosen */}
          {!editing && form.parent_id && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Subcategory
              </label>
              <SearchableSelect
                value={selectedSubId || ''}
                onChange={handleSubSelect}
                options={subOptions}
                placeholder="Select existing or create new…"
                loading={loadingSubs}
              />
              {!loadingSubs && subcats.length === 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  No subcategories yet — select "+ Create New Subcategory" to add one.
                </p>
              )}
            </div>
          )}

          {/* Full form — visible when: editing | top-level add | sub selected */}
          {showFormFields && (
            <>
              {/* Divider for "create new" context */}
              {!editing && form.parent_id && selectedSubId === 'CREATE_NEW' && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-teal-600 font-semibold whitespace-nowrap">
                    New Subcategory Details
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}

              {/* Name */}
              <Input
                label="Category Name *"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder={form.parent_id ? 'e.g. Luxury Watches' : 'e.g. Watches'}
              />

              {/* Slug */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Slug *</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="e.g. luxury-watches"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">Auto-generated from name. Must be unique.</p>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Short description shown on category page…"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              {/* Image */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Category Image</label>
                <div className="flex items-center gap-3">
                  {form.image_url
                    ? <img src={form.image_url} alt=""
                        className="w-14 h-14 rounded-xl object-cover border border-slate-200 flex-shrink-0" />
                    : <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Upload size={18} className="text-slate-300" />
                      </div>
                  }
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="url"
                      value={form.image_url}
                      onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="Paste image URL…"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-teal-500"
                    />
                    <label className={`flex items-center gap-1.5 text-xs text-teal-600 cursor-pointer hover:text-teal-700 font-medium w-fit ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
                      {uploading ? <Loader size={11} className="animate-spin" /> : <Upload size={11} />}
                      {uploading ? 'Uploading…' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploading(true)
                          try {
                            const fd = new FormData()
                            fd.append('file', file)
                            const { data, error } = await api.upload('/api/upload?folder=categories', fd)
                            if (error) throw new Error(error.message || 'Upload failed')
                            setForm(f => ({ ...f, image_url: data.url }))
                          } catch (err) {
                            alert('Upload failed: ' + err.message)
                          } finally {
                            setUploading(false)
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Display Order */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Display Order</label>
                <input
                  type="number"
                  min="0"
                  value={form.display_order}
                  onChange={e => setForm(f => ({ ...f, display_order: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">Lower = appears first</p>
              </div>

              {/* Toggle switches */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setForm(f => ({ ...f, is_featured: !f.is_featured }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.is_featured ? 'bg-amber-400' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_featured ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Featured</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.is_active ? 'bg-teal-500' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm text-slate-700 font-medium">Active</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Footer buttons — only when form fields are visible */}
        {showFormFields && (
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name || !form.slug}>
              {saveLabel}
            </Button>
          </div>
        )}
    </Modal>
    </>
  )
}
