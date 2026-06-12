import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Badge, Button, Modal, Select, Table, formatDate } from '../components/ui/index'
import api from '../config/api'
import { useAuth } from '../context/AuthContext'
import { Users, User, Search, Mail, Phone, ShoppingBag, Shield, ShieldCheck, Edit2 } from 'lucide-react'

const ROLES = ['super_admin','product_manager','order_manager','customer_support','inventory_manager','marketing_manager']
const ROLE_LABELS = {
  super_admin:       'Super Admin',
  product_manager:   'Product Manager',
  order_manager:     'Order Manager',
  customer_support:  'Customer Support',
  inventory_manager: 'Inventory Manager',
  marketing_manager: 'Marketing Manager',
}

export default function AdminUsers() {
  const { user }                  = useAuth()
  const [tab, setTab]             = useState('customers')
  const [customers, setCustomers] = useState([])
  const [admins, setAdmins]       = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [selected, setSelected]   = useState(null)
  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [adminModal, setAdminModal]     = useState(false)
  const [editingAdmin, setEditingAdmin] = useState(null)
  const [adminForm, setAdminForm] = useState({ role: 'customer_support', is_active: true })
  const [saving, setSaving]       = useState(false)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [cr, ar, or] = await Promise.all([
      api.get('/api/users'),
      api.get('/api/admin/users'),
      api.get('/api/orders'),
    ])
    setCustomers(cr.data?.users ?? [])
    setAdmins(ar.data || [])
    setAllOrders(or.data?.orders ?? or.data ?? [])
    setLoading(false)
  }

  function openCustomer(customer) {
    setSelected(customer)
    setOrders((allOrders).filter(o => o.user_id === customer.id))
  }

  async function toggleAdminActive(admin) {
    const res = await api.put(`/api/admin/users/${admin.id}`, { is_active: !admin.is_active })
    if (res.error) { alert('Update failed: ' + (res.error?.message || res.error)); return }
    loadAll()
  }

  async function saveAdminRole() {
    if (!editingAdmin) return
    setSaving(true)
    const res = await api.put(`/api/admin/users/${editingAdmin.id}`, {
      role:      adminForm.role,
      is_active: adminForm.is_active,
    })
    setSaving(false)
    if (res.error) { alert('Save failed: ' + (res.error?.message || res.error)); return }
    setAdminModal(false); loadAll()
  }

  const filteredCustomers = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )
  const filteredAdmins = admins.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase()) ||
    a.email?.toLowerCase().includes(search.toLowerCase())
  )
  const thisMonth = customers.filter(c => new Date(c.created_at) > new Date(Date.now() - 30 * 86400000)).length

  const customerCols = [
    {
      key: 'full_name', label: 'Customer',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(v || row.email || '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">{v || '—'}</p>
            <p className="text-slate-400 text-[10px]">{row.email}</p>
          </div>
        </div>
      )
    },
    { key: 'phone', label: 'Phone', render: v => v ? <span className="text-xs text-slate-600">{v}</span> : <span className="text-slate-300 text-xs">—</span> },
    { key: 'created_at', label: 'Joined', render: v => formatDate(v) },
    { key: 'is_active', label: 'Status', render: (v) => <Badge label={v === false ? 'Inactive' : 'Active'} /> },
  ]

  const adminCols = [
    {
      key: 'name', label: 'Admin',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(v || row.email || 'A')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-xs">{v || '—'}</p>
            <p className="text-slate-400 text-[10px]">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'role', label: 'Role',
      render: v => (
        <div className="flex items-center gap-1.5">
          {v === 'super_admin' ? <ShieldCheck size={12} className="text-teal-600" /> : <Shield size={12} className="text-slate-400" />}
          <span className="text-xs font-semibold text-slate-700">{ROLE_LABELS[v] || v}</span>
        </div>
      )
    },
    { key: 'is_active', label: 'Status', render: v => <Badge label={v ? 'Active' : 'Inactive'} /> },
    { key: 'created_at', label: 'Added', render: v => formatDate(v) },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => row.email === user?.email ? (
        <span className="text-xs text-slate-300">You</span>
      ) : (
        <div className="flex items-center gap-1">
          <button onClick={() => { setEditingAdmin(row); setAdminForm({ role: row.role, is_active: row.is_active }); setAdminModal(true) }}
            className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
            <Edit2 size={13} />
          </button>
          <button onClick={() => toggleAdminActive(row)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${row.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
            {row.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )
    },
  ]

  return (
    <Layout title="Users">
      <div className="flex items-center gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { key: 'customers', label: `Customers (${customers.length})` },
          { key: 'admins',    label: `Admin Team (${admins.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch('') }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.key ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>{t.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {(tab === 'customers' ? [
          { label: 'Total Customers', value: customers.length,                         icon: Users },
          { label: 'New This Month',  value: thisMonth,                                 icon: User },
          { label: 'With Phone',      value: customers.filter(c => c.phone).length,    icon: Phone },
          { label: 'Active',          value: customers.length,                         icon: Users },
        ] : [
          { label: 'Total Admins',    value: admins.length,                                         icon: Shield },
          { label: 'Active',          value: admins.filter(a => a.is_active).length,               icon: ShieldCheck },
          { label: 'Super Admins',    value: admins.filter(a => a.role === 'super_admin').length,   icon: ShieldCheck },
          { label: 'Inactive',        value: admins.filter(a => !a.is_active).length,              icon: User },
        ]).map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <s.icon size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'customers' ? 'Search customers...' : 'Search admins...'}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500" />
          </div>
          <p className="ml-auto text-xs text-slate-400">
            {tab === 'customers' ? `${filteredCustomers.length} customers` : `${filteredAdmins.length} admins`}
          </p>
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
        ) : tab === 'customers' ? (
          <Table columns={customerCols} data={filteredCustomers} onRow={openCustomer} />
        ) : (
          <Table columns={adminCols} data={filteredAdmins} />
        )}
      </Card>

      {/* Customer detail drawer */}
      {selected && tab === 'customers' && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-96 bg-white h-full shadow-2xl overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-xl font-bold">
                  {(selected.full_name || selected.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{selected.full_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Joined {formatDate(selected.created_at)}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                {[
                  { icon: Mail,  label: 'Email', value: selected.email },
                  { icon: Phone, label: 'Phone', value: selected.phone || '—' },
                ].map(r => (
                  <div key={r.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <r.icon size={14} className="text-slate-400 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400">{r.label}</p>
                      <p className="text-xs font-semibold text-slate-700">{r.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag size={14} className="text-slate-400" />
                  <p className="text-xs font-bold text-slate-700">Order History ({orders.length})</p>
                </div>
                {orders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No orders yet</p>
                ) : (
                  <div className="space-y-2">
                    {orders.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-teal-600">{o.order_number}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(o.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-700">₹{Number(o.total).toLocaleString('en-IN')}</p>
                          <Badge label={o.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit admin role modal */}
      <Modal open={adminModal} onClose={() => setAdminModal(false)} title="Edit Admin Role" width="max-w-sm">
        {editingAdmin && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-sm font-bold text-slate-800">{editingAdmin.name || editingAdmin.email}</p>
              <p className="text-xs text-slate-400">{editingAdmin.email}</p>
            </div>
            <Select label="Role" value={adminForm.role}
              onChange={e => setAdminForm({ ...adminForm, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" checked={adminForm.is_active}
                onChange={e => setAdminForm({ ...adminForm, is_active: e.target.checked })}
                className="accent-teal-600 w-4 h-4" />
              Active (can access portal)
            </label>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setAdminModal(false)}>Cancel</Button>
          <Button onClick={saveAdminRole} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
        </div>
      </Modal>
    </Layout>
  )
}
