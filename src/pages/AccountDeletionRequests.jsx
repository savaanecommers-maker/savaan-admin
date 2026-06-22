import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Card, Badge, formatDate } from '../components/ui/index'
import api from '../config/api'
import { Trash2, UserX, XCircle, RefreshCw, ShoppingBag, User } from 'lucide-react'

const STATUS_COLORS = {
  pending:     'yellow',
  deleted:     'red',
  deactivated: 'slate',
  rejected:    'green',
}

export default function AccountDeletionRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [acting, setActing]     = useState(null) // id being actioned
  const [note, setNote]         = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/api/auth/account/deletion-requests')
      setRequests(res.data?._list ?? [])
    } catch { setRequests([]) }
    setLoading(false)
  }

  async function handleAction(id, action) {
    setActing(id)
    try {
      await api.post(`/api/auth/account/deletion-requests/${id}/action`, { action, admin_note: note })
      setSelected(null)
      setNote('')
      await load()
    } catch (err) {
      alert(err?.response?.data?.error || 'Action failed')
    }
    setActing(null)
  }

  const pending = requests.filter(r => r.status === 'pending')
  const actioned = requests.filter(r => r.status !== 'pending')

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Account Deletion Requests</h1>
            <p className="text-sm text-slate-500 mt-1">Review and action user deletion requests</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading...</div>
        ) : (
          <>
            {/* Pending */}
            <Card>
              <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <h2 className="font-semibold text-slate-700">Pending ({pending.length})</h2>
              </div>
              {pending.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No pending requests</div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {pending.map(r => (
                    <div key={r.id} className="p-4 flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <User size={18} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{r.user_name || 'Unknown'}</span>
                          <span className="text-xs text-slate-400">{r.user_email}</span>
                          <Badge color="yellow">Pending</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><ShoppingBag size={11} /> {r.order_count} orders</span>
                          <span>{formatDate(r.created_at)}</span>
                        </div>
                        {r.reason && (
                          <p className="text-xs text-slate-600 mt-2 bg-slate-50 rounded-lg p-2 italic">"{r.reason}"</p>
                        )}
                      </div>
                      <button
                        onClick={() => { setSelected(r); setNote('') }}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Actioned */}
            {actioned.length > 0 && (
              <Card>
                <div className="p-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-700">Past Requests ({actioned.length})</h2>
                </div>
                <div className="divide-y divide-slate-50">
                  {actioned.map(r => (
                    <div key={r.id} className="p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">{r.user_name || 'Unknown'}</span>
                          <span className="text-xs text-slate-400">{r.user_email}</span>
                          <Badge color={STATUS_COLORS[r.status] || 'slate'}>{r.status}</Badge>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">{formatDate(r.created_at)}</div>
                        {r.admin_note && <p className="text-xs text-slate-500 mt-1">Note: {r.admin_note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">Review Deletion Request</h2>
              <p className="text-sm text-slate-500 mt-0.5">{selected.user_name} · {selected.user_email}</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-slate-500">Orders placed</span><span className="font-semibold">{selected.order_count}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Requested on</span><span>{formatDate(selected.created_at)}</span></div>
                {selected.reason && <div className="pt-1 text-slate-600 italic">"{selected.reason}"</div>}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Admin note (optional)</label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Reason for your decision..."
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleAction(selected.id, 'delete')}
                  disabled={acting === selected.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-semibold disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Delete Account
                </button>
                <button
                  onClick={() => handleAction(selected.id, 'deactivate')}
                  disabled={acting === selected.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold disabled:opacity-50"
                >
                  <UserX size={16} />
                  Deactivate Only
                </button>
                <button
                  onClick={() => handleAction(selected.id, 'reject')}
                  disabled={acting === selected.id}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-50 hover:bg-green-100 border border-green-200 text-green-600 text-xs font-semibold disabled:opacity-50"
                >
                  <XCircle size={16} />
                  Reject Request
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
