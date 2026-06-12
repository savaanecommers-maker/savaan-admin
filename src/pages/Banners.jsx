import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Button, Modal, Input, Select, Badge, Table, formatDate } from '../components/ui/index'
import api from '../config/api'
import { Plus, Edit2, Trash2, Image, Eye, EyeOff } from 'lucide-react'

const EMPTY = {
  title: '', subtitle: '', image_url: '',
  link_type: 'none', link_value: '',
  is_active: true, display_order: 1,
  start_date: '', end_date: '',
}

const LINK_TYPES = [
  { value: 'none',     label: 'No Link' },
  { value: 'product',  label: 'Product' },
  { value: 'category', label: 'Category' },
  { value: 'url',      label: 'External URL' },
]

export default function Banners() {
  const [banners, setBanners]       = useState([])
  const [categories, setCategories] = useState([])
  const [products, setProducts]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState(EMPTY)
  const [saving, setSaving]         = useState(false)
  const [preview, setPreview]       = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [br, cr, pr] = await Promise.all([
      api.get('/api/banners?all=true'),
      api.get('/api/categories'),
      api.get('/api/products/all'),
    ])
    const sorted = (br.data || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    setBanners(sorted)
    setCategories(cr.data || [])
    setProducts(pr.data?.products ?? pr.data ?? [])
    setLoading(false)
  }

  function openAdd()    { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(b)  {
    setEditing(b.id)
    // Merge with EMPTY so null DB values don't make controlled inputs uncontrolled
    setForm({ ...EMPTY, ...b,
      title:         b.title        ?? '',
      subtitle:      b.subtitle     ?? '',
      image_url:     b.image_url    ?? '',
      link_type:     b.link_type    ?? 'none',
      link_value:    b.link_value   ?? '',
      start_date:    b.start_date   ?? '',
      end_date:      b.end_date     ?? '',
      display_order: b.display_order ?? 1,
    })
    setModal(true)
  }

  async function save() {
    if (!form.image_url) return
    setSaving(true)
    const payload = {
      title: form.title, subtitle: form.subtitle,
      image_url: form.image_url, link_type: form.link_type,
      link_value: form.link_value, is_active: form.is_active,
      display_order: parseInt(form.display_order) || 1,
      start_date: form.start_date || null,
      end_date:   form.end_date   || null,
    }
    let res
    if (editing) {
      res = await api.put(`/api/banners/${editing}`, payload)
    } else {
      res = await api.post('/api/banners', payload)
    }
    setSaving(false)
    if (res.error) { alert('Save failed: ' + (res.error?.message || res.error)); return }
    setModal(false); load()
  }

  async function deleteBanner(id) {
    if (!confirm('Delete this banner?')) return
    const res = await api.delete(`/api/banners/${id}`)
    if (res.error) { alert('Delete failed: ' + (res.error?.message || res.error)); return }
    load()
  }

  async function toggleActive(banner) {
    const res = await api.put(`/api/banners/${banner.id}`, { is_active: !banner.is_active })
    if (res.error) { alert('Update failed: ' + (res.error?.message || res.error)); return }
    load()
  }

  const cols = [
    {
      key: 'image_url', label: 'Banner',
      render: (url, row) => (
        <div className="flex items-center gap-3">
          <div className="w-20 h-11 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
            {url
              ? <img src={url} alt={row.title} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><Image size={16} className="text-slate-300" /></div>
            }
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">{row.title || '—'}</p>
            <p className="text-slate-400 text-[10px]">{row.subtitle || ''}</p>
          </div>
        </div>
      )
    },
    {
      key: 'link_type', label: 'Link',
      render: (v, row) => (
        <div>
          <span className="capitalize text-xs text-slate-600 font-medium">{v}</span>
          {row.link_value && <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{row.link_value}</p>}
        </div>
      )
    },
    { key: 'display_order', label: 'Order' },
    { key: 'is_active', label: 'Status', render: v => <Badge label={v ? 'Active' : 'Inactive'} /> },
    { key: 'created_at', label: 'Created', render: v => formatDate(v) },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setPreview(row)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Preview">
            <Eye size={13} />
          </button>
          <button onClick={() => toggleActive(row)}
            className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors"
            title={row.is_active ? 'Deactivate' : 'Activate'}>
            {row.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button onClick={() => openEdit(row)}
            className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => deleteBanner(v)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      )
    },
  ]

  return (
    <Layout title="Banners">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Banners', value: banners.length,                          color: 'bg-teal-50 text-teal-700' },
          { label: 'Active',        value: banners.filter(b => b.is_active).length,  color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Inactive',      value: banners.filter(b => !b.is_active).length, color: 'bg-slate-50 text-slate-600' },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${s.color}`}>
              {s.value}
            </div>
            <p className="text-sm font-medium text-slate-600">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">All Banners</h3>
            <p className="text-xs text-slate-400 mt-0.5">Manage home screen banners shown in the app</p>
          </div>
          <Button icon={Plus} size="sm" onClick={openAdd}>Add Banner</Button>
        </div>
        {loading
          ? <div className="py-16 text-center text-slate-400 text-sm">Loading banners...</div>
          : <Table columns={cols} data={banners} />
        }
      </Card>

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)}
        title={editing ? 'Edit Banner' : 'Add Banner'} width="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Image URL *</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                placeholder="https://... or upload below"
                value={form.image_url || ''}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
              />
              <label className="cursor-pointer px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-teal-700 text-xs font-medium hover:bg-teal-100">
                Upload
                <input type="file" accept="image/*" className="hidden" onChange={async e => {
                  const file = e.target.files[0]; if (!file) return
                  const fd = new FormData(); fd.append('file', file)
                  const res = await api.upload('/api/upload?folder=banners', fd)
                  if (res.data?.url) setForm(f => ({ ...f, image_url: res.data.url }))
                  else alert('Upload failed: ' + (res.error?.message || res.error))
                }} />
              </label>
            </div>
            {form.image_url && (
              <div className="mt-2 rounded-xl overflow-hidden h-36 bg-slate-100 border border-slate-200">
                <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Title" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Sale" />
            <Input label="Subtitle" value={form.subtitle}
              onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="e.g. Up to 50% off" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select label="Link Type" value={form.link_type}
              onChange={e => setForm({ ...form, link_type: e.target.value, link_value: '' })}>
              {LINK_TYPES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </Select>
            {form.link_type === 'category' && (
              <Select label="Category" value={form.link_value}
                onChange={e => setForm({ ...form, link_value: e.target.value })}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </Select>
            )}
            {form.link_type === 'product' && (
              <Select label="Product" value={form.link_value}
                onChange={e => setForm({ ...form, link_value: e.target.value })}>
                <option value="">Select product</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            )}
            {form.link_type === 'url' && (
              <Input label="URL" value={form.link_value}
                onChange={e => setForm({ ...form, link_value: e.target.value })} placeholder="https://..." />
            )}
            {form.link_type === 'none' && <div />}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Display Order" type="number" value={form.display_order}
              onChange={e => setForm({ ...form, display_order: e.target.value })} />
            <div className="flex flex-col gap-1 justify-end">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer pb-2">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm({ ...form, is_active: e.target.checked })}
                  className="accent-teal-600 w-4 h-4" />
                Active (visible in app)
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Schedule Start <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="datetime-local" value={form.start_date || ''}
                onChange={e => setForm({ ...form, start_date: e.target.value || null })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-600">Schedule End <span className="text-slate-400 font-normal">(optional)</span></label>
              <input type="datetime-local" value={form.end_date || ''}
                onChange={e => setForm({ ...form, end_date: e.target.value || null })}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 bg-white focus:outline-none focus:border-teal-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !form.image_url}>
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Banner'}
          </Button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal open={!!preview} onClose={() => setPreview(null)} title="Banner Preview" width="max-w-lg">
        {preview && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden h-48 bg-slate-100">
              <img src={preview.image_url} alt={preview.title} className="w-full h-full object-cover" />
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Title</span>
                <span className="font-semibold text-slate-700">{preview.title || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Subtitle</span>
                <span className="font-semibold text-slate-700">{preview.subtitle || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Link</span>
                <span className="font-semibold text-slate-700">{preview.link_type} {preview.link_value ? `→ ${preview.link_value}` : ''}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Status</span>
                <Badge label={preview.is_active ? 'Active' : 'Inactive'} />
              </div>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
