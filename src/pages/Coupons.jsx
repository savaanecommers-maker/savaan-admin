import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Table, Badge, Button, Modal, Input, Select, Card, Pagination, formatPrice } from '../components/ui/index'
import api from '../config/api'
import { Plus, Edit2, Trash2 } from 'lucide-react'

const EMPTY = { code: '', discount_type: 'percent', discount_value: '', min_order_value: '', max_uses: '', expires_at: '', is_active: true }

export default function Coupons() {
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY)
  const [saving, setSaving]   = useState(false)
  const PER_PAGE = 8

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await api.get('/api/coupons')
    if (!mountedRef.current) return
    if (error) {
      alert('Failed to load coupons: ' + (error.message || error))
      setLoading(false)
      return
    }
    setCoupons(data?._list ?? data?.items ?? (Array.isArray(data) ? data : []))
    setLoading(false)
  }

  function openAdd()   { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(c) { setEditing(c.id); setForm(c); setModal(true) }

  async function save() {
    if (!form.code || !form.discount_value) return
    setSaving(true)
    const payload = {
      code:            form.code.toUpperCase(),
      discount_type:   form.discount_type,
      discount_value:  parseFloat(form.discount_value) || 0,
      min_order_value: parseFloat(form.min_order_value) || 0,
      max_uses:        form.max_uses ? parseInt(form.max_uses) : null,
      max_discount:    form.max_discount ? parseFloat(form.max_discount) : null,
      expires_at:      form.expires_at || null,
      is_active:       form.is_active !== false,
    }
    let res
    if (editing) {
      res = await api.put(`/api/coupons/${editing}`, payload)
    } else {
      res = await api.post('/api/coupons', { ...payload, used_count: 0 })
    }
    setSaving(false)
    if (res.error) { alert('Save failed: ' + (res.error?.message || res.error)); return }
    setModal(false); load()
  }

  async function del(id) {
    if (!confirm('Delete this coupon?')) return
    const res = await api.delete(`/api/coupons/${id}`)
    if (res.error) { alert('Delete failed: ' + (res.error?.message || res.error)); return }
    load()
  }

  const paginated  = coupons.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const totalPages = Math.ceil(coupons.length / PER_PAGE)

  const isActive = (c) => {
    if (c.is_active === false) return false
    if (!c.expires_at) return true
    return new Date(c.expires_at) > new Date()
  }

  const cols = [
    { key: 'code', label: 'Coupon Code', render: v => <span className="font-bold text-teal-600 tracking-wider">{v}</span> },
    {
      key: 'discount_value', label: 'Discount',
      render: (v, row) => <span className="font-semibold">{row.discount_type === 'percent' ? `${v}% OFF` : formatPrice(v)}</span>
    },
    { key: 'min_order_value', label: 'Min Order', render: v => formatPrice(v) },
    { key: 'expires_at', label: 'Expiry Date', render: v => v ? new Date(v).toLocaleDateString('en-IN') : 'No expiry' },
    { key: 'used_count', label: 'Usage', render: (v, row) => <span>{v || 0} / {row.max_uses == null ? '∞' : row.max_uses}</span> },
    { key: 'is_active', label: 'Status', render: (v, row) => <Badge label={isActive(row) ? 'Active' : 'Inactive'} /> },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"><Edit2 size={13} /></button>
          <button onClick={() => del(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
        </div>
      )
    }
  ]

  return (
    <Layout title="Coupons">
      <Card>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <p className="text-sm text-slate-500">{coupons.length} coupons</p>
          <Button icon={Plus} size="sm" onClick={openAdd}>Add Coupon</Button>
        </div>
        {loading
          ? <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
          : <>
              <Table columns={cols} data={paginated} />
              <div className="px-4 pb-4 flex justify-between items-center">
                <p className="text-xs text-slate-400">{coupons.length === 0 ? 'No coupons found' : `Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE, coupons.length)} of ${coupons.length}`}</p>
                <Pagination page={page} totalPages={totalPages} onPage={setPage} />
              </div>
            </>
        }
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Coupon' : 'Add Coupon'}>
        <div className="space-y-4">
          <Input label="Coupon Code *" value={form.code}
            onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} placeholder="e.g. SAVE20" />
          <Select label="Discount Type" value={form.discount_type}
            onChange={e => setForm({...form, discount_type: e.target.value})}>
            <option value="percent">Percentage (%)</option>
            <option value="fixed">Flat Amount (₹)</option>
          </Select>
          <Input label="Discount Value *" type="number" value={form.discount_value}
            onChange={e => setForm({...form, discount_value: e.target.value})} placeholder="e.g. 10 for 10%" />
          <Input label="Min Order Value (₹)" type="number" value={form.min_order_value}
            onChange={e => setForm({...form, min_order_value: e.target.value})} placeholder="e.g. 999" />
          <Input label="Max Uses" type="number" value={form.max_uses}
            onChange={e => setForm({...form, max_uses: e.target.value})} placeholder="e.g. 100" />
          <Input label="Expiry Date" type="date" value={form.expires_at?.split('T')[0] || ''}
            min={new Date().toISOString().split('T')[0]}
            onChange={e => setForm({...form, expires_at: e.target.value})} />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Coupon'}</Button>
        </div>
      </Modal>
    </Layout>
  )
}
