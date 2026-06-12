import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { StatCard, Card, formatPrice } from '../components/ui/index'
import api from '../config/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, ShoppingBag, Users, DollarSign, Download, Loader } from 'lucide-react'

const COLORS = ['#0d9488','#f59e0b','#6366f1','#ec4899','#10b981','#3b82f6']

const METHOD_LABELS = {
  upi: 'UPI', credit_card: 'Credit Card', debit_card: 'Debit Card',
  net_banking: 'Net Banking', wallet: 'Wallet', cod: 'COD',
}

export default function Reports() {
  const [orders, setOrders]         = useState([])
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [range, setRange]           = useState('month')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [or, pr, cr] = await Promise.all([
      api.get('/api/orders'),
      api.get('/api/products/all'),
      api.get('/api/categories'),
    ])
    const ordersArr = (or.data?.orders ?? or.data ?? [])
    const sorted = ordersArr.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    setOrders(sorted)
    setProducts(pr.data?.products ?? pr.data ?? [])
    setCategories(cr.data || [])
    setLoading(false)
  }

  function rangeOrders() {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 90
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days)
    return orders.filter(o => new Date(o.created_at) >= cutoff)
  }

  function prevRangeOrders() {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 90
    const end   = new Date(); end.setDate(end.getDate() - days)
    const start = new Date(end); start.setDate(end.getDate() - days)
    return orders.filter(o => { const d = new Date(o.created_at); return d >= start && d < end })
  }

  const filtered = rangeOrders()
  const prev     = prevRangeOrders()

  function revenueByPeriod() {
    const days = range === 'week' ? 7 : range === 'month' ? 30 : 90
    const step = range === 'quarter' ? 7 : 1
    const result = []
    for (let i = days - 1; i >= 0; i -= step) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      const bucket = filtered.filter(o => {
        const od = new Date(o.created_at)
        if (step === 1) return od.toDateString() === d.toDateString()
        const diff = Math.floor((d - od) / 86400000)
        return diff >= 0 && diff < 7
      })
      result.push({
        name:    label,
        revenue: bucket.reduce((s, o) => s + parseFloat(o.total || 0), 0),
        orders:  bucket.length,
      })
    }
    return result
  }

  function paymentBreakdown() {
    const methods = {}
    filtered.forEach(o => { const m = o.payment_method || 'unknown'; methods[m] = (methods[m] || 0) + 1 })
    return Object.entries(methods).map(([name, value]) => ({ name: METHOD_LABELS[name] || name.toUpperCase(), value }))
  }

  function statusBreakdown() {
    const statuses = {}
    filtered.forEach(o => { statuses[o.status] = (statuses[o.status] || 0) + 1 })
    return Object.entries(statuses).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }))
  }

  function categoryDistribution() {
    return categories.map(c => ({
      name:  c.name,
      value: products.filter(p => p.category_id === c.id).length,
    })).filter(c => c.value > 0).slice(0, 6)
  }

  function pct(curr, prev) {
    if (!prev) return null
    const d = ((curr - prev) / prev * 100).toFixed(1)
    return `${d > 0 ? '+' : ''}${d}%`
  }

  const totalRevenue  = filtered.reduce((s, o) => s + parseFloat(o.total || 0), 0)
  const prevRevenue   = prev.reduce((s, o) => s + parseFloat(o.total || 0), 0)
  const avgOrder      = filtered.length ? totalRevenue / filtered.length : 0
  const prevAvg       = prev.length ? prevRevenue / prev.length : 0
  const delivered     = filtered.filter(o => o.status === 'delivered').length
  const prevDelivered = prev.filter(o => o.status === 'delivered').length
  const totalDiscount = filtered.reduce((s, o) => s + parseFloat(o.discount || 0), 0)

  const topProducts = [...products].sort((a, b) => (b.review_count || 0) - (a.review_count || 0)).slice(0, 5)

  function exportCSV() {
    const rows = [
      ['Date', 'Revenue', 'Orders', 'Avg Order Value'],
      ...revenueByPeriod().map(r => [r.name, r.revenue.toFixed(2), r.orders, r.orders ? (r.revenue / r.orders).toFixed(2) : 0]),
    ]
    const csv  = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `savaan-report-${range}.csv`; a.click()
  }

  const rangeLabel = range === 'week' ? 'Last 7 Days' : range === 'month' ? 'Last 30 Days' : 'Last 3 Months'

  return (
    <Layout title="Reports">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {['week', 'month', 'quarter'].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                range === r ? 'bg-teal-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}>
              {r === 'week' ? 'Last 7 Days' : r === 'month' ? 'Last 30 Days' : 'Last 3 Months'}
            </button>
          ))}
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader size={24} className="animate-spin text-teal-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard title={`Revenue (${rangeLabel})`} value={formatPrice(totalRevenue)}
              change={pct(totalRevenue, prevRevenue)} positive={totalRevenue >= prevRevenue}
              icon={DollarSign} iconBg="bg-teal-600" />
            <StatCard title={`Orders (${rangeLabel})`} value={filtered.length}
              change={pct(filtered.length, prev.length)} positive={filtered.length >= prev.length}
              icon={ShoppingBag} iconBg="bg-blue-500" />
            <StatCard title="Avg Order Value" value={formatPrice(avgOrder)}
              change={pct(avgOrder, prevAvg)} positive={avgOrder >= prevAvg}
              icon={TrendingUp} iconBg="bg-violet-500" />
            <StatCard title="Delivered Orders" value={delivered}
              change={pct(delivered, prevDelivered)} positive={delivered >= prevDelivered}
              icon={Users} iconBg="bg-emerald-500" />
          </div>

          <Card className="p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">Sales Overview — {rangeLabel}</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {filtered.length} orders · {formatPrice(totalRevenue)} revenue · {formatPrice(totalDiscount)} discounted
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={revenueByPeriod()} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={v => v >= 1000 ? `₹${v/1000}k` : `₹${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(v, name) => [name === 'revenue' ? formatPrice(v) : v, name === 'revenue' ? 'Revenue' : 'Orders']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar yAxisId="left"  dataKey="revenue" fill="#0d9488" radius={[4,4,0,0]} name="revenue" />
                <Bar yAxisId="right" dataKey="orders"  fill="#e2e8f0" radius={[4,4,0,0]} name="orders" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <Card className="p-5">
              <h3 className="font-bold text-slate-800 mb-4">Payment Methods</h3>
              {paymentBreakdown().length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={paymentBreakdown()} cx="50%" cy="50%" outerRadius={75} dataKey="value" paddingAngle={3}>
                      {paymentBreakdown().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-bold text-slate-800 mb-4">Order Status</h3>
              {statusBreakdown().length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No orders yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statusBreakdown()} layout="vertical" barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} width={90} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-bold text-slate-800 mb-4">Products by Category</h3>
              {categoryDistribution().length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={categoryDistribution()} cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                      {categoryDistribution().map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-bold text-slate-800 mb-4">Top Products</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Product', 'Price', 'Rating', 'Reviews', 'Category'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => {
                  const cat = categories.find(c => c.id === p.category_id)
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-xs font-bold text-slate-400">#{i + 1}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                            {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full" />}
                          </div>
                          <span className="text-xs font-semibold text-slate-700">{p.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-bold text-slate-700">{formatPrice(p.price)}</td>
                      <td className="py-2.5 px-3 text-xs text-amber-600 font-semibold">★ {p.rating || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{p.review_count || 0}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{cat?.name || p.category_name || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </Layout>
  )
}
