// ── CUSTOMERS ────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { Table, Badge, Card, Pagination, Modal, formatPrice, formatDate } from '../components/ui/index'
import api from '../config/api'
import { Search } from 'lucide-react'

export function Customers() {
  const [customers, setCustomers] = useState([])
  const [allOrders, setAllOrders] = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [selected, setSelected]   = useState(null)
  const [orders, setOrders]       = useState([])
  const PER_PAGE = 10

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    const [ur, or] = await Promise.all([
      api.get('/api/users'),
      api.get('/api/orders?limit=500'),
    ])
    if (ur.error) setLoadError(ur.error.message || 'Failed to load customers')
    setCustomers(ur.data?.users ?? [])
    setAllOrders(or.data?.orders ?? or.data ?? [])
    setLoading(false)
  }

  function loadOrders(userId) {
    setOrders((allOrders).filter(o => o.user_id === userId))
  }

  const filtered = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const cols = [
    {
      key: 'full_name', label: 'Customer',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center text-white text-xs font-bold">
            {v?.[0]?.toUpperCase() || row.email?.[0]?.toUpperCase() || '?'}
          </div>
          <span className="font-semibold text-xs">{v || 'Unknown'}</span>
        </div>
      )
    },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone', render: v => v || '—' },
    { key: 'created_at', label: 'Joined', render: v => formatDate(v) },
    { key: 'is_active', label: 'Status', render: (v, row) => <Badge label={row.is_active === false ? 'Inactive' : 'Active'} /> },
  ]

  return (
    <Layout title="Customers">
      <Card>
        <div className="flex items-center gap-3 p-4 border-b border-slate-200">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customers..."
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 w-56" />
          </div>
          <p className="ml-auto text-xs text-slate-400">{filtered.length} customers</p>
        </div>
        {loading
          ? <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
          : loadError
          ? <div className="py-8 text-center text-red-500 text-sm px-4">Error: {loadError}</div>
          : <>
              <Table columns={cols} data={paginated} onRow={row => { setSelected(row); loadOrders(row.id) }} />
              <div className="px-4 pb-4 flex justify-between items-center">
                <p className="text-xs text-slate-400">{filtered.length === 0 ? 'No customers found' : `Showing ${(page-1)*PER_PAGE+1}–${Math.min(page*PER_PAGE, filtered.length)} of ${filtered.length}`}</p>
                <Pagination page={page} totalPages={totalPages} onPage={setPage} />
              </div>
            </>
        }
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Customer Details" width="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center text-white text-xl font-bold">
                {selected.full_name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-bold text-slate-800">{selected.full_name || 'Unknown'}</p>
                <p className="text-sm text-slate-500">{selected.email}</p>
                <p className="text-sm text-slate-500">{selected.phone || 'No phone'}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">ORDER HISTORY</p>
              {orders.length === 0
                ? <p className="text-sm text-slate-400">No orders yet</p>
                : orders.map((o, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100">
                      <div>
                        <p className="text-xs font-semibold text-teal-600">{o.order_number}</p>
                        <p className="text-xs text-slate-400">{formatDate(o.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold">{formatPrice(o.total)}</span>
                        <Badge label={o.status} />
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  )
}
