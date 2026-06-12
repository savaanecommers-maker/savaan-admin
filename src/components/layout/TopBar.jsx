import { Bell, Search, ChevronDown, LogOut, Settings, X, Package, ShoppingBag, Users } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../config/api'
import { useAuth } from '../../context/AuthContext'

export default function TopBar({ title }) {
  const { logout, user }      = useAuth()
  const navigate              = useNavigate()
  const [search, setSearch]   = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showBell, setShowBell]       = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount]     = useState(0)

  // Cached data for client-side search (loaded once on first search)
  const cachedOrders = useRef(null)
  const cachedUsers  = useRef(null)

  const searchRef  = useRef(null)
  const profileRef = useRef(null)
  const bellRef    = useRef(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current  && !searchRef.current.contains(e.target))  setShowResults(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false)
      if (bellRef.current    && !bellRef.current.contains(e.target))    setShowBell(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Load recent notifications for bell
  useEffect(() => { loadNotifications() }, [])

  async function loadNotifications() {
    const { data } = await api.get('/api/notifications/all')
    const all = (data || []).slice(0, 8)
    setNotifications(all)
    setUnreadCount(all.filter(n => !n.is_read).length)
  }

  // Global search across products, orders, customers
  useEffect(() => {
    if (!search.trim()) { setResults([]); setShowResults(false); return }
    const timer = setTimeout(() => doSearch(search.trim()), 350)
    return () => clearTimeout(timer)
  }, [search])

  async function doSearch(q) {
    setSearching(true)
    const ql = q.toLowerCase()

    // Products: use backend search (public, fast)
    const pr = await api.get(`/api/products?search=${encodeURIComponent(q)}&limit=4`)

    // Orders + Users: cache on first call, filter client-side
    if (!cachedOrders.current) {
      const or = await api.get('/api/orders')
      cachedOrders.current = or.data || []
    }
    if (!cachedUsers.current) {
      const ur = await api.get('/api/users')
      cachedUsers.current = ur.data || []
    }

    const filteredOrders = (cachedOrders.current)
      .filter(o => o.order_number?.toLowerCase().includes(ql))
      .slice(0, 3)

    const filteredUsers = (cachedUsers.current)
      .filter(u => u.full_name?.toLowerCase().includes(ql) || u.email?.toLowerCase().includes(ql))
      .slice(0, 3)

    const products = (pr.data?.products || []).slice(0, 4)

    const items = [
      ...products.map(p  => ({ type: 'product',  label: p.name,         sub: `₹${p.price}`,    icon: 'Package',     path: '/products',  img: p.images?.[0] })),
      ...filteredOrders.map(o => ({ type: 'order',    label: o.order_number, sub: o.status,         icon: 'ShoppingBag', path: '/orders' })),
      ...filteredUsers.map(u  => ({ type: 'customer', label: u.full_name || u.email, sub: u.email,  icon: 'Users',       path: '/customers' })),
    ]
    setResults(items)
    setShowResults(true)
    setSearching(false)
  }

  function goTo(path) {
    setSearch(''); setShowResults(false); navigate(path)
  }

  const TYPE_COLOR = { order: 'bg-amber-100 text-amber-600', promo: 'bg-teal-100 text-teal-600', system: 'bg-slate-100 text-slate-500' }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-30">
      <h1 className="text-lg font-bold text-slate-800 min-w-[140px]">{title}</h1>

      {/* ── Global Search ── */}
      <div className="flex-1 max-w-sm relative" ref={searchRef}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search products, orders, customers..."
          className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-teal-500 transition-colors"
        />
        {search && (
          <button onClick={() => { setSearch(''); setResults([]); setShowResults(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <X size={13} />
          </button>
        )}

        {/* Results dropdown */}
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-50">
            {searching ? (
              <p className="text-xs text-slate-400 text-center py-4">Searching...</p>
            ) : results.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No results for "{search}"</p>
            ) : (
              <div>
                {results.map((r, i) => (
                  <button key={i} onClick={() => goTo(r.path)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 text-left transition-colors border-b border-slate-50 last:border-0">
                    {r.img
                      ? <img src={r.img} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
                      : <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                          {r.type === 'product'  && <Package    size={12} className="text-teal-600" />}
                          {r.type === 'order'    && <ShoppingBag size={12} className="text-amber-500" />}
                          {r.type === 'customer' && <Users      size={12} className="text-violet-500" />}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">{r.label}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{r.sub}</p>
                    </div>
                    <span className="text-[10px] text-slate-300 capitalize">{r.type}</span>
                  </button>
                ))}
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">

        {/* ── Notification Bell ── */}
        <div className="relative" ref={bellRef}>
          <button onClick={() => { setShowBell(!showBell); if (!showBell) loadNotifications() }}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell size={18} className="text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showBell && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-800">Notifications</p>
                <button onClick={() => { navigate('/notifications'); setShowBell(false) }}
                  className="text-xs text-teal-600 font-semibold hover:underline">View all</button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No notifications yet</p>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n, i) => (
                    <div key={n._id?.toString() || n.id || i}
                      className={`px-4 py-3 border-b border-slate-50 ${!n.is_read ? 'bg-teal-50/40' : ''}`}>
                      <div className="flex items-start gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded capitalize flex-shrink-0 mt-0.5 ${TYPE_COLOR[n.type] || TYPE_COLOR.system}`}>
                          {n.type}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{n.title}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
                        </div>
                        {!n.is_read && <div className="w-1.5 h-1.5 bg-teal-500 rounded-full flex-shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Profile Dropdown ── */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-slate-700 leading-none">Admin</p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[100px]">{user?.email || 'admin@savaan.com'}</p>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </button>

          {showProfile && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <button onClick={() => { navigate('/settings'); setShowProfile(false) }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors border-b border-slate-100">
                <Settings size={14} className="text-slate-400" />
                Settings
              </button>
              <button onClick={logout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
