import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Table, Badge, Button, Modal, Input, Select, Card, Pagination, formatDate } from '../components/ui/index'
import api from '../config/api'
import { Send, Bell, Trash2, Users, User, CheckCheck } from 'lucide-react'

const EMPTY = { title: '', body: '', type: 'promo', target: 'all', user_id: '' }

const TYPE_COLORS = {
  order:  'bg-blue-100 text-blue-700',
  promo:  'bg-amber-100 text-amber-700',
  system: 'bg-slate-100 text-slate-600',
}

export default function Notifications() {
  const [notifs, setNotifs]   = useState([])
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [form, setForm]       = useState(EMPTY)
  const [sending, setSending] = useState(false)
  const [page, setPage]       = useState(1)
  const [typeFilter, setType] = useState('all')
  const PER_PAGE = 10

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    const [nr, ur] = await Promise.all([
      api.get('/api/notifications/all'),
      api.get('/api/users'),
    ])
    if (!mountedRef.current) return
    setNotifs(nr.data?.notifications ?? nr.data?._list ?? nr.data?.items ?? (Array.isArray(nr.data) ? nr.data : []))
    setUsers(ur.data?.users ?? ur.data?._list ?? ur.data?.items ?? (Array.isArray(ur.data) ? ur.data : []))
    setLoading(false)
  }

  async function send() {
    if (!form.title || !form.body) return
    setSending(true)
    const res = await api.post('/api/notifications', {
      user_id: form.target === 'specific' ? form.user_id : null,
      title:   form.title,
      body:    form.body,
      type:    form.type,
      is_read: false,
    })
    setSending(false)
    if (res.error) { alert('Send failed: ' + (res.error?.message || res.error)); return }
    setModal(false)
    setForm(EMPTY)
    load()
  }

  async function del(id) {
    if (!confirm('Delete this notification?')) return
    const res = await api.delete(`/api/notifications/${id}`)
    if (res.error) { alert('Delete failed: ' + (res.error?.message || res.error)); return }
    load()
  }

  async function delAll() {
    if (!confirm('Delete ALL notifications? This cannot be undone.')) return
    const results = await Promise.all(notifs.map(n => api.delete(`/api/notifications/${n.id}`)))
    const failed = results.filter(r => r.error).length
    if (failed > 0) alert(`${failed} deletion(s) failed. Refreshing list.`)
    load()
  }

  const filtered   = typeFilter === 'all' ? notifs : notifs.filter(n => n.type === typeFilter)
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const unread     = notifs.filter(n => !n.is_read).length
  const broadcast  = notifs.filter(n => !n.user_id).length

  const cols = [
    {
      key: 'title', label: 'Notification',
      render: (v, row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{v}</p>
          <p className="text-slate-400 text-[10px] mt-0.5 max-w-xs truncate">{row.body}</p>
        </div>
      )
    },
    {
      key: 'type', label: 'Type',
      render: v => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${TYPE_COLORS[v] || TYPE_COLORS.system}`}>
          {v}
        </span>
      )
    },
    {
      key: 'user_id', label: 'Sent To',
      render: v => v === null ? (
        <div className="flex items-center gap-1.5">
          <Users size={11} className="text-teal-500" />
          <span className="text-xs font-semibold text-teal-600">All Users</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <User size={11} className="text-slate-400" />
          <span className="text-xs text-slate-600 font-mono">{String(v).slice(0, 8)}…</span>
        </div>
      )
    },
    { key: 'is_read', label: 'Status', render: v => <Badge label={v ? 'Read' : 'Unread'} /> },
    { key: 'created_at', label: 'Sent At', render: v => formatDate(v) },
    {
      key: 'id', label: '',
      render: v => (
        <button onClick={() => del(v)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
          <Trash2 size={13} />
        </button>
      )
    },
  ]

  return (
    <Layout title="Notifications">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Sent',  value: notifs.length, icon: Bell,       color: 'bg-teal-600' },
          { label: 'Broadcasts',  value: broadcast,     icon: Users,      color: 'bg-violet-500' },
          { label: 'Unread',      value: unread,        icon: Bell,       color: 'bg-amber-500' },
          {
            label: 'Read Rate',
            value: notifs.length ? `${Math.round((notifs.length - unread) / notifs.length * 100)}%` : '0%',
            icon: CheckCheck, color: 'bg-emerald-500'
          },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <div className="flex gap-1">
            {['all', 'promo', 'order', 'system'].map(t => (
              <button key={t} onClick={() => { setType(t); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  typeFilter === t ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}>{t}</button>
            ))}
          </div>
          <p className="text-xs text-slate-400 ml-2">{filtered.length} notifications</p>
          <div className="ml-auto flex items-center gap-2">
            {notifs.length > 0 && (
              <Button variant="secondary" size="sm" onClick={delAll}>Clear All</Button>
            )}
            <Button icon={Send} size="sm" onClick={() => { setForm(EMPTY); setModal(true) }}>
              Send Notification
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
        ) : (
          <>
            <Table columns={cols} data={paginated} />
            <div className="px-4 pb-4 flex justify-end">
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          </>
        )}
      </Card>

      {/* Send Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="Send Notification" width="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">Send To</label>
            <div className="flex gap-2">
              <button onClick={() => setForm({ ...form, target: 'all', user_id: '' })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  form.target === 'all'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                <Users size={14} /> All Users ({users.length})
              </button>
              <button onClick={() => setForm({ ...form, target: 'specific' })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  form.target === 'specific'
                    ? 'border-teal-500 bg-teal-50 text-teal-700'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                <User size={14} /> Specific User
              </button>
            </div>
          </div>

          {form.target === 'specific' && (
            <Select label="Choose User" value={form.user_id}
              onChange={e => setForm({ ...form, user_id: e.target.value })}>
              <option value="">Select a user</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </Select>
          )}

          <Select label="Type" value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="promo">🎯 Promotion</option>
            <option value="order">📦 Order Update</option>
            <option value="system">⚙️ System</option>
          </Select>

          <Input label="Title *" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Flash Sale — 50% Off Today!" />

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Message *</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
              rows={3} placeholder="Enter notification message..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-teal-500" />
          </div>

          {form.title && (
            <div className="bg-slate-800 rounded-2xl p-4">
              <p className="text-white/40 text-[10px] mb-3 uppercase tracking-wider">Push Preview</p>
              <div className="bg-white/10 rounded-xl p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center flex-shrink-0">
                  <Bell size={15} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-white text-xs font-bold">SAVAAN</p>
                    <p className="text-white/40 text-[10px]">now</p>
                  </div>
                  <p className="text-white text-xs font-semibold">{form.title}</p>
                  {form.body && <p className="text-white/60 text-[11px] mt-0.5 leading-relaxed">{form.body}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
          <Button icon={Send} onClick={send}
            disabled={sending || !form.title || !form.body || (form.target === 'specific' && !form.user_id)}>
            {sending ? 'Sending...' : form.target === 'all' ? `Send to All ${users.length} Users` : 'Send to User'}
          </Button>
        </div>
      </Modal>
    </Layout>
  )
}
