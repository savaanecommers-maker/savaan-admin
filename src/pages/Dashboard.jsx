import { useEffect, useState } from 'react'
import Layout from '../components/layout/Layout'
import { StatCard, Card, Badge, formatPrice, formatDate } from '../components/ui/index'
import api from '../config/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import { TrendingUp, ShoppingBag, Users, Package, Clock, Loader, CheckCircle, XCircle } from 'lucide-react'

const COLORS = ['#0d9488','#f59e0b','#6366f1','#ec4899','#10b981']

function pctChange(current, previous) {
  if (!previous) return null
  const diff = ((current - previous) / previous * 100).toFixed(1)
  return `${diff > 0 ? '+' : ''}${diff}%`
}

export default function Dashboard() {
  const [stats, setStats]       = useState({ sales: 0, orders: 0, customers: 0, products: 0 })
  const [prevStats, setPrev]    = useState({ sales: 0, orders: 0, customers: 0 })
  const [orderStats, setOS]     = useState({ pending: 0, processing: 0, inTransit: 0, delivered: 0, cancelled: 0 })
  const [revenueData, setRev]   = useState([])
  const [catData, setCat]       = useState([])
  const [topProducts, setTop]   = useState([])
  const [recentOrders, setRO]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    loadAll(cancelled, () => cancelled)
    return () => { cancelled = true }
  }, [])

  async function loadAll(cancelled, isCancelled) {
    try {
      const [statsRes, ordersRes, productsRes, catsRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/orders?limit=500'),
        api.get('/api/products/all'),
        api.get('/api/categories'),
      ])

      if (isCancelled && isCancelled()) return
      const serverStats = statsRes.data || {}
      const allOrders   = ordersRes.data?.orders   || ordersRes.data   || []
      const products    = productsRes.data?.products || productsRes.data || []
      const categories  = catsRes.data?._list ?? catsRes.data?.items ?? (Array.isArray(catsRes.data) ? catsRes.data : [])

      const now     = new Date()
      const start30 = new Date(now); start30.setDate(now.getDate() - 30)
      const start60 = new Date(now); start60.setDate(now.getDate() - 60)

      const REVENUE_STATUSES = new Set(['confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered'])
      const orders30 = allOrders.filter(o => new Date(o.created_at) >= start30)
      const orders60 = allOrders.filter(o => {
        const d = new Date(o.created_at)
        return d >= start60 && d < start30
      })

      const totalSales = orders30.filter(o => REVENUE_STATUSES.has(o.status)).reduce((s, o) => s + (parseFloat(o.total) || 0), 0)
      const prevSales  = orders60.filter(o => REVENUE_STATUSES.has(o.status)).reduce((s, o) => s + (parseFloat(o.total) || 0), 0)

      setStats({
        sales:     totalSales,
        orders:    orders30.length,
        customers: serverStats.users || 0,
        products:  serverStats.products || 0,
      })

      setPrev({
        sales:     prevSales,
        orders:    orders60.length,
        customers: 0,
      })

      setOS({
        pending:    orders30.filter(o => o.status === 'pending').length,
        processing: orders30.filter(o => o.status === 'confirmed' || o.status === 'processing' || o.status === 'packed').length,
        inTransit:  orders30.filter(o => o.status === 'shipped' || o.status === 'out_for_delivery').length,
        delivered:  orders30.filter(o => o.status === 'delivered').length,
        cancelled:  orders30.filter(o => o.status === 'cancelled').length,
      })

      // Revenue chart — last 7 days
      const days = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        const dayOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === d.toDateString() && REVENUE_STATUSES.has(o.status))
        days.push({
          name: label,
          revenue: dayOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0),
        })
      }
      setRev(days)

      // Category product distribution — parent categories only for clean pie chart
      const parentCats = categories.filter(c => !c.parent_id)
      const catCounts = parentCats.map(c => ({
        name: c.name,
        value: products.filter(p => p.category_id === c.id).length,
      })).filter(c => c.value > 0)
      setCat(catCounts.slice(0, 5))

      // Top products by review_count
      const sorted = [...products].sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
      setTop(sorted.slice(0, 5))

      // Recent 5 orders — allOrders used here for display only.
      // Stats are computed client-side; use /api/admin/stats for server-side aggregation when available.
      setRO(allOrders.slice(0, 5))
    } catch {
      // dashboard will show zeros; non-critical loading failure
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <Layout title="Dashboard">
      <div className="flex items-center justify-center h-64">
        <Loader size={24} className="animate-spin text-teal-600" />
      </div>
    </Layout>
  )

  const salesChange    = pctChange(stats.sales, prevStats.sales)
  const ordersChange   = pctChange(stats.orders, prevStats.orders)
  const customerChange = pctChange(stats.customers, prevStats.customers)

  return (
    <Layout title="Dashboard">
      {/* Top stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Revenue (30d)"  value={formatPrice(stats.sales)}
          change={salesChange}    positive={!salesChange || !salesChange.startsWith('-')}
          icon={TrendingUp}  iconBg="bg-teal-600" />
        <StatCard title="Total Orders (30d)"   value={stats.orders}
          change={ordersChange}   positive={!ordersChange || !ordersChange.startsWith('-')}
          icon={ShoppingBag} iconBg="bg-blue-500" />
        <StatCard title="Total Customers"      value={stats.customers}
          change={customerChange} positive={!customerChange || !customerChange.startsWith('-')}
          icon={Users}       iconBg="bg-violet-500" />
        <StatCard title="Total Products"       value={stats.products}
          icon={Package}     iconBg="bg-amber-500" />
      </div>

      {/* Order status cards */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Pending',    val: orderStats.pending,    color: 'bg-amber-50 border-amber-200',     text: 'text-amber-700',   icon: Clock },
          { label: 'Processing', val: orderStats.processing, color: 'bg-blue-50 border-blue-200',       text: 'text-blue-700',    icon: Loader },
          { label: 'In Transit', val: orderStats.inTransit,  color: 'bg-violet-50 border-violet-200',   text: 'text-violet-700',  icon: Loader },
          { label: 'Delivered',  val: orderStats.delivered,  color: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: CheckCircle },
          { label: 'Cancelled',  val: orderStats.cancelled,  color: 'bg-red-50 border-red-200',         text: 'text-red-600',     icon: XCircle },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 border ${s.color} flex items-center gap-3`}>
            <s.icon size={20} className={s.text} />
            <div>
              <p className="text-2xl font-bold text-slate-800">{s.val}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Revenue chart */}
        <Card className="col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">Revenue — Last 7 Days</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatPrice(revenueData.reduce((s, d) => s + d.revenue, 0))} total
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#0d9488" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickFormatter={v => v >= 1000 ? `₹${v/1000}k` : `₹${v}`} />
              <Tooltip
                formatter={v => [formatPrice(v), 'Revenue']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5}
                fill="url(#tealGrad)" dot={{ fill: '#0d9488', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Category donut — real data */}
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 mb-1">Products by Category</h3>
          <p className="text-xs text-slate-400 mb-3">Distribution of {stats.products} products</p>
          {catData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  dataKey="value" paddingAngle={3}>
                  {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Top products + Recent orders */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Top Products</h3>
            <span className="text-[10px] text-slate-400">by review count</span>
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No products yet</p>
            ) : topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-300 w-4">#{i + 1}</span>
                <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Package size={13} className="text-slate-400" />
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{p.name}</p>
                  <p className="text-xs text-slate-400">{formatPrice(p.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-600">{p.review_count || 0}</p>
                  <p className="text-[10px] text-slate-400">reviews</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Recent Orders</h3>
            <span className="text-[10px] text-slate-400">Latest 5</span>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No orders yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Order ID', 'Customer', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold text-slate-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-semibold text-teal-600">{o.order_number}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">{o.full_name || o.email || '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-500">{formatDate(o.created_at)}</td>
                    <td className="py-2.5 px-3 text-xs font-bold text-slate-700">{formatPrice(o.total)}</td>
                    <td className="py-2.5 px-3"><Badge label={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </Layout>
  )
}
