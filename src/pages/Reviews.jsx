import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Table, Button, Card, Pagination, formatDate } from '../components/ui/index'
import api from '../config/api'
import { Star, Trash2 } from 'lucide-react'

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('all')
  const [page, setPage]       = useState(1)
  const PER_PAGE = 10

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await api.get('/api/reviews/all')
    if (!mountedRef.current) return
    setReviews(data?.reviews ?? data ?? [])
    setLoading(false)
  }

  async function del(id) {
    if (!confirm('Delete this review?')) return
    const res = await api.delete(`/api/reviews/${id}`)
    if (res.error) { alert('Delete failed: ' + (res.error?.message || res.error)); return }
    load()
  }

  const filtered   = filter === 'all' ? reviews : reviews.filter(r => r.rating === parseInt(filter))
  const paginated  = filtered.slice((page-1)*PER_PAGE, page*PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const StarRating = ({ rating }) => (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} className={i <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
      ))}
    </div>
  )

  const cols = [
    {
      key: 'user_name', label: 'Customer',
      render: v => <span className="font-semibold text-xs">{v || '—'}</span>
    },
    {
      key: 'product_name', label: 'Product',
      render: (v, row) => (
        <span className="text-xs text-slate-700">
          {v || <span className="text-slate-400 font-mono">{row.product_id ? String(row.product_id).slice(0, 8) + '…' : '—'}</span>}
        </span>
      )
    },
    { key: 'rating', label: 'Rating', render: v => <StarRating rating={v} /> },
    {
      key: 'body', label: 'Review',
      render: v => <span className="text-xs text-slate-600 max-w-xs truncate block">{v || '—'}</span>
    },
    { key: 'created_at', label: 'Date', render: v => formatDate(v) },
    {
      key: 'id', label: 'Actions',
      render: v => (
        <button onClick={() => del(v)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 size={13} />
        </button>
      )
    }
  ]

  const breakdown = [5,4,3,2,1].map(r => ({
    star:  r,
    count: reviews.filter(rv => rv.rating === r).length,
    pct:   reviews.length ? Math.round(reviews.filter(rv => rv.rating === r).length / reviews.length * 100) : 0
  }))
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0.0'

  return (
    <Layout title="Reviews">
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="p-5 col-span-1">
          <p className="text-xs text-slate-500 mb-1">Average Rating</p>
          <p className="text-4xl font-bold text-slate-800">{avg}</p>
          <div className="flex items-center gap-1 mt-1">
            {[1,2,3,4,5].map(i => (
              <Star key={i} size={13} className={i <= Math.round(avg) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">{reviews.length} total reviews</p>
        </Card>
        <Card className="p-5 col-span-2">
          <p className="text-xs font-semibold text-slate-500 mb-3">Rating Breakdown</p>
          {breakdown.map(b => (
            <div key={b.star} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-slate-600 w-8">{b.star}★</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${b.pct}%` }} />
              </div>
              <span className="text-xs text-slate-400 w-6">{b.count}</span>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <p className="text-xs font-semibold text-slate-500 mb-3">Filter by Stars</p>
          <div className="space-y-1.5">
            {['all','5','4','3','2','1'].map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(1) }}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${filter === f ? 'bg-teal-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}>
                {f === 'all' ? 'All Reviews' : `${f} Stars`}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} reviews</p>
        </div>
        {loading
          ? <div className="py-16 text-center text-slate-400 text-sm">Loading...</div>
          : <>
              <Table columns={cols} data={paginated} />
              <div className="px-4 pb-4 flex justify-end">
                <Pagination page={page} totalPages={totalPages} onPage={setPage} />
              </div>
            </>
        }
      </Card>
    </Layout>
  )
}
