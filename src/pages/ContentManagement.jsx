import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Button } from '../components/ui/index'
import api from '../config/api'
import {
  FileText, HelpCircle, Phone, Save, Plus, Trash2,
  Edit3, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  Eye, EyeOff, Loader, CheckCircle, AlertCircle, X, GripVertical
} from 'lucide-react'

const TABS = [
  { key: 'legal',   label: 'Legal Documents', icon: FileText },
  { key: 'faq',     label: 'FAQ Manager',      icon: HelpCircle },
  { key: 'contact', label: 'Contact Info',     icon: Phone },
]

const LEGAL_SLUGS = [
  { slug: 'privacy_policy',   label: 'Privacy Policy' },
  { slug: 'terms_conditions', label: 'Terms & Conditions' },
  { slug: 'disclaimer',       label: 'Disclaimer Policy' },
  { slug: 'return_refund',    label: 'Return & Refund Policy' },
  { slug: 'shipping_policy',  label: 'Shipping Policy' },
]

// ── Shared toast helper ───────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null)
  function show(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-semibold transition-all ${
      toast.type === 'success' ? 'bg-teal-600' : 'bg-red-500'
    }`}>
      {toast.type === 'success'
        ? <CheckCircle size={16} />
        : <AlertCircle size={16} />}
      {toast.msg}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  LEGAL DOCUMENTS TAB
// ══════════════════════════════════════════════════════════════
function LegalTab({ toast }) {
  const [docs,       setDocs]       = useState({})
  const [selected,   setSelected]   = useState('privacy_policy')
  const [content,    setContent]    = useState('')
  const [title,      setTitle]      = useState('')
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [preview,    setPreview]    = useState(false)
  const textRef = useRef(null)

  useEffect(() => { loadAll() }, [])
  useEffect(() => {
    const d = docs[selected]
    if (d) { setContent(d.content || ''); setTitle(d.title || '') }
  }, [selected, docs])

  async function loadAll() {
    setLoading(true)
    const { data } = await api.get('/api/content/admin/legal')
    if (Array.isArray(data)) {
      const map = {}
      data.forEach(d => { map[d.slug] = d })
      setDocs(map)
      const first = data[0]
      if (first) { setContent(first.content || ''); setTitle(first.title || '') }
    }
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const { error } = await api.put(`/api/content/admin/legal/${selected}`, { title, content })
    setSaving(false)
    if (error) { toast.show('Failed to save', 'error'); return }
    setDocs(prev => ({ ...prev, [selected]: { ...prev[selected], title, content } }))
    toast.show('Document saved successfully!')
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader size={24} className="animate-spin text-teal-500" /></div>
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Sidebar: doc list */}
      <div className="col-span-3">
        <Card className="p-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-3">Documents</p>
          {LEGAL_SLUGS.map(({ slug, label }) => (
            <button key={slug} onClick={() => setSelected(slug)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm mb-1 transition-all text-left ${
                selected === slug
                  ? 'bg-teal-600 text-white font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}>
              <FileText size={13} />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </Card>
      </div>

      {/* Editor */}
      <div className="col-span-9 space-y-4">
        {/* Title */}
        <Card className="p-4">
          <label className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wide">Document Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </Card>

        {/* Content editor / preview */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Content</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supports markdown: ## Heading, **bold**, - bullet, ### Subheading
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{wordCount} words</span>
              <button
                onClick={() => setPreview(!preview)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  preview ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {preview ? <EyeOff size={12} /> : <Eye size={12} />}
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
          </div>

          {preview ? (
            <div className="border border-slate-200 rounded-lg p-4 min-h-[400px] bg-slate-50">
              <div className="prose max-w-none text-sm text-slate-700">
                {content.split('\n').map((line, i) => {
                  if (line.startsWith('## '))  return <h2 key={i} className="text-lg font-bold text-slate-800 mt-4 mb-2">{line.slice(3)}</h2>
                  if (line.startsWith('### ')) return <h3 key={i} className="text-base font-semibold text-slate-700 mt-3 mb-1">{line.slice(4)}</h3>
                  if (line.startsWith('- ') || line.startsWith('* '))
                    return <li key={i} className="ml-4 list-disc text-slate-600 text-sm">{line.slice(2)}</li>
                  if (line.trim() === '') return <div key={i} className="h-2" />
                  const escaped = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                  return <p key={i} className="text-slate-600 text-sm leading-relaxed mb-1"
                    dangerouslySetInnerHTML={{ __html: escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                })}
              </div>
            </div>
          ) : (
            <textarea
              ref={textRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={20}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
              placeholder="Enter document content (supports markdown formatting)..."
            />
          )}
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-all">
            {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save Document'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  FAQ MANAGER TAB
// ══════════════════════════════════════════════════════════════
function FaqTab({ toast }) {
  const [categories, setCategories] = useState([])
  const [faqs,       setFaqs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const [selectedCat, setSelectedCat] = useState(null) // null = All
  const [editFaq,     setEditFaq]   = useState(null)  // null | faq obj | 'new'
  const [editCat,     setEditCat]   = useState(null)  // null | 'new'
  const [newCatName,  setNewCatName] = useState('')
  const [delConfirm,  setDelConfirm] = useState(null) // faq id

  const emptyFaq = { category_id: '', question: '', answer: '', sort_order: 0, is_active: true }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/api/content/admin/faqs')
    if (data) {
      setCategories(data.categories || [])
      setFaqs(data.faqs || [])
    }
    setLoading(false)
  }

  async function saveFaq() {
    if (!editFaq?.question || !editFaq?.answer) {
      toast.show('Question and answer are required', 'error'); return
    }
    const isNew = !editFaq.id
    const { error } = isNew
      ? await api.post('/api/content/admin/faqs', editFaq)
      : await api.put(`/api/content/admin/faqs/${editFaq.id}`, editFaq)
    if (error) { toast.show('Failed to save FAQ', 'error'); return }
    toast.show(isNew ? 'FAQ created!' : 'FAQ updated!')
    setEditFaq(null)
    load()
  }

  async function deleteFaq(id) {
    const { error } = await api.delete(`/api/content/admin/faqs/${id}`)
    if (error) { toast.show('Failed to delete', 'error'); return }
    toast.show('FAQ deleted')
    setDelConfirm(null)
    load()
  }

  async function toggleFaq(faq) {
    await api.put(`/api/content/admin/faqs/${faq.id}`, { is_active: !faq.is_active })
    load()
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const { error } = await api.post('/api/content/admin/faq-categories', { name: newCatName.trim() })
    if (error) { toast.show('Failed to add category', 'error'); return }
    toast.show('Category added!')
    setNewCatName('')
    setEditCat(null)
    load()
  }

  async function deleteCategory(id) {
    const { error } = await api.delete(`/api/content/admin/faq-categories/${id}`)
    if (error) { toast.show('Failed to delete category', 'error'); return }
    toast.show('Category deleted')
    load()
  }

  const filteredFaqs = selectedCat
    ? faqs.filter(f => f.category_id === selectedCat)
    : faqs

  if (loading) {
    return <div className="flex justify-center py-20"><Loader size={24} className="animate-spin text-teal-500" /></div>
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Categories sidebar */}
      <div className="col-span-3 space-y-3">
        <Card className="p-3">
          <div className="flex items-center justify-between px-1 mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categories</p>
            <button onClick={() => setEditCat('new')}
              className="text-teal-600 hover:text-teal-700">
              <Plus size={15} />
            </button>
          </div>

          {/* New category form */}
          {editCat === 'new' && (
            <div className="mb-3 p-2 bg-teal-50 rounded-lg">
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
                placeholder="Category name"
                className="w-full border border-teal-200 rounded px-2 py-1.5 text-xs mb-2 focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && addCategory()}
              />
              <div className="flex gap-1">
                <button onClick={addCategory}
                  className="flex-1 bg-teal-600 text-white rounded px-2 py-1 text-xs font-semibold">Add</button>
                <button onClick={() => setEditCat(null)}
                  className="flex-1 bg-slate-200 text-slate-600 rounded px-2 py-1 text-xs">Cancel</button>
              </div>
            </div>
          )}

          {/* All */}
          <button onClick={() => setSelectedCat(null)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm mb-1 transition-all ${
              !selectedCat ? 'bg-teal-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-50'
            }`}>
            <span>All FAQs</span>
            <span className="text-xs opacity-70">{faqs.length}</span>
          </button>

          {categories.map(cat => (
            <div key={cat.id} className={`flex items-center group rounded-lg mb-1 transition-all ${
              selectedCat === cat.id ? 'bg-teal-600' : 'hover:bg-slate-50'
            }`}>
              <button onClick={() => setSelectedCat(cat.id)}
                className={`flex-1 flex items-center justify-between px-3 py-2 text-sm ${
                  selectedCat === cat.id ? 'text-white font-semibold' : 'text-slate-600'
                }`}>
                <span className="truncate">{cat.name}</span>
                <span className="text-xs opacity-70">
                  {faqs.filter(f => f.category_id === cat.id).length}
                </span>
              </button>
              <button onClick={() => deleteCategory(cat.id)}
                className="opacity-0 group-hover:opacity-100 pr-2 text-red-400 hover:text-red-600 transition-opacity">
                <X size={12} />
              </button>
            </div>
          ))}
        </Card>
      </div>

      {/* FAQ list */}
      <div className="col-span-9 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {filteredFaqs.length} FAQ{filteredFaqs.length !== 1 ? 's' : ''}
            {selectedCat && ` in "${categories.find(c => c.id === selectedCat)?.name}"`}
          </p>
          <button onClick={() => setEditFaq({ ...emptyFaq, category_id: selectedCat || '' })}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-all">
            <Plus size={14} />
            Add FAQ
          </button>
        </div>

        {/* Edit/Create modal */}
        {editFaq && (
          <Card className="p-5 border-2 border-teal-200 bg-teal-50/30">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-slate-800">
                {editFaq.id ? 'Edit FAQ' : 'New FAQ'}
              </p>
              <button onClick={() => setEditFaq(null)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Category</label>
                <select value={editFaq.category_id || ''}
                  onChange={e => setEditFaq(f => ({ ...f, category_id: e.target.value || null }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400">
                  <option value="">No Category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Question *</label>
                <input value={editFaq.question}
                  onChange={e => setEditFaq(f => ({ ...f, question: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  placeholder="Enter the question..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Answer *</label>
                <textarea value={editFaq.answer}
                  onChange={e => setEditFaq(f => ({ ...f, answer: e.target.value }))}
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
                  placeholder="Enter the answer..."
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-slate-500 mb-1 block">Sort Order</label>
                  <input type="number" value={editFaq.sort_order}
                    onChange={e => setEditFaq(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="faq-active" checked={editFaq.is_active}
                    onChange={e => setEditFaq(f => ({ ...f, is_active: e.target.checked }))}
                    className="accent-teal-600"
                  />
                  <label htmlFor="faq-active" className="text-sm text-slate-700 font-medium">Active</label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditFaq(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-200">Cancel</button>
                <button onClick={saveFaq}
                  className="flex items-center gap-2 px-5 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700">
                  <Save size={13} /> Save FAQ
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* FAQ cards */}
        {filteredFaqs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-slate-400">
            <HelpCircle size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No FAQs yet. Add your first FAQ above.</p>
          </div>
        ) : (
          filteredFaqs.map(faq => (
            <Card key={faq.id} className={`p-4 transition-all ${!faq.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <GripVertical size={14} className="text-slate-300 mt-1 flex-shrink-0 cursor-grab" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{faq.question}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {faq.category_name && (
                        <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium border border-teal-100">
                          {faq.category_name}
                        </span>
                      )}
                      <button onClick={() => toggleFaq(faq)}
                        className={`p-1.5 rounded-lg transition-all ${faq.is_active ? 'text-teal-500 hover:bg-teal-50' : 'text-slate-400 hover:bg-slate-50'}`}
                        title={faq.is_active ? 'Disable' : 'Enable'}>
                        {faq.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                      <button onClick={() => setEditFaq({ ...faq })}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-all">
                        <Edit3 size={14} />
                      </button>
                      {delConfirm === faq.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteFaq(faq.id)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold">✓</button>
                          <button onClick={() => setDelConfirm(null)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-bold">✗</button>
                        </div>
                      ) : (
                        <button onClick={() => setDelConfirm(faq.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{faq.answer}</p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  CONTACT INFO TAB
// ══════════════════════════════════════════════════════════════
function ContactTab({ toast }) {
  const [info,    setInfo]    = useState({})
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  const FIELDS = [
    { key: 'email',          label: 'Support Email',      type: 'email',  icon: '📧', placeholder: 'support@savaan.in' },
    { key: 'phone',          label: 'Phone Number',       type: 'tel',    icon: '📞', placeholder: '+91 98765 43210' },
    { key: 'whatsapp',       label: 'WhatsApp Number',    type: 'tel',    icon: '💬', placeholder: '+91 98765 43210' },
    { key: 'address',        label: 'Office Address',     type: 'textarea', icon: '📍', placeholder: '123 Street, City, State PIN' },
    { key: 'business_hours', label: 'Business Hours',     type: 'text',   icon: '🕒', placeholder: 'Mon–Sat: 9 AM – 9 PM' },
    { key: 'about_mission',  label: 'Mission Statement',  type: 'textarea', icon: '🎯', placeholder: 'Our mission is...' },
    { key: 'about_vision',   label: 'Vision Statement',   type: 'textarea', icon: '👁️',  placeholder: 'Our vision is...' },
    { key: 'about_story',    label: 'Company Story',      type: 'textarea', icon: '📖', placeholder: 'SAVAAN was founded...' },
  ]

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/api/content/admin/contact')
    if (data && typeof data === 'object') setInfo(data)
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    const { error } = await api.put('/api/content/admin/contact', info)
    setSaving(false)
    if (error) { toast.show('Failed to save', 'error'); return }
    toast.show('Contact information saved!')
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader size={24} className="animate-spin text-teal-500" /></div>
  }

  const contactFields = FIELDS.filter(f => !f.key.startsWith('about_'))
  const aboutFields   = FIELDS.filter(f =>  f.key.startsWith('about_'))

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Contact Details */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Phone size={16} className="text-teal-600" />
          <h3 className="font-bold text-slate-800">Contact Details</h3>
        </div>
        <div className="space-y-4">
          {contactFields.map(field => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wide">
                {field.icon} {field.label}
              </label>
              {field.type === 'textarea' ? (
                <textarea value={info[field.key] || ''}
                  onChange={e => setInfo(p => ({ ...p, [field.key]: e.target.value }))}
                  rows={3}
                  placeholder={field.placeholder}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
                />
              ) : (
                <input type={field.type} value={info[field.key] || ''}
                  onChange={e => setInfo(p => ({ ...p, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* About Us content */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <FileText size={16} className="text-teal-600" />
          <h3 className="font-bold text-slate-800">About SAVAAN Content</h3>
        </div>
        <div className="space-y-4">
          {aboutFields.map(field => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wide">
                {field.icon} {field.label}
              </label>
              <textarea value={info[field.key] || ''}
                onChange={e => setInfo(p => ({ ...p, [field.key]: e.target.value }))}
                rows={field.key === 'about_story' ? 5 : 3}
                placeholder={field.placeholder}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Save button spanning both columns */}
      <div className="col-span-2 flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-all">
          {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function ContentManagement() {
  const [active, setActive] = useState('legal')
  const { toast, show }     = useToast()

  return (
    <Layout title="Content Management">
      <Toast toast={toast} />

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActive(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              active === t.key
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {active === 'legal'   && <LegalTab   toast={{ show }} />}
      {active === 'faq'     && <FaqTab     toast={{ show }} />}
      {active === 'contact' && <ContactTab toast={{ show }} />}
    </Layout>
  )
}
