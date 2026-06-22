import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Package, Grid3X3, ShoppingBag, Users,
  Archive, Zap, Tag, Image, Star, CreditCard, Truck,
  Bell, BarChart2, UserCog, Settings, LogOut, ChevronDown, RotateCcw, LayoutGrid, Gem,
  BookOpen, UserMinus
} from 'lucide-react'
import { useState } from 'react'

const NAV = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/' },
  { label: 'Products',      icon: Package,         path: '/products' },
  { label: 'Categories',    icon: Grid3X3,         path: '/categories' },
  {
    label: 'Orders', icon: ShoppingBag, path: '/orders',
    children: [
      { label: 'All Orders',  path: '/orders' },
      { label: 'Processing',  path: '/orders?status=processing' },
      { label: 'Shipped',     path: '/orders?status=shipped' },
      { label: 'Delivered',   path: '/orders?status=delivered' },
      { label: 'Cancelled',   path: '/orders?status=cancelled' },
    ]
  },
  { label: 'Customers',     icon: Users,           path: '/customers' },
  { label: 'Inventory',     icon: Archive,         path: '/inventory' },
  { label: 'Flash Deals',   icon: Zap,             path: '/flash-deals' },
  { label: 'Coupons',       icon: Tag,             path: '/coupons' },
  { label: 'Banners',       icon: Image,           path: '/banners' },
  { label: 'Reviews',       icon: Star,            path: '/reviews' },
  { label: 'Payments',      icon: CreditCard,      path: '/payments' },
  { label: 'Shipping',      icon: Truck,           path: '/shipping' },
  { label: 'Returns',       icon: RotateCcw,       path: '/returns' },
  { label: 'Homepage',      icon: LayoutGrid,      path: '/homepage-sections' },
  { label: 'Luxury Edit',  icon: Gem,             path: '/luxury-collections' },
  { label: 'Notifications', icon: Bell,            path: '/notifications' },
  { label: 'Reports',       icon: BarChart2,       path: '/reports' },
  { label: 'Users',         icon: UserCog,         path: '/users' },
  { label: 'Content',       icon: BookOpen,        path: '/content' },
  { label: 'Acc. Deletions', icon: UserMinus,     path: '/account-deletions' },
  { label: 'Settings',      icon: Settings,        path: '/settings' },
]

export default function Sidebar() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [ordersOpen, setOrdersOpen] = useState(false)

  return (
    <aside className="w-56 bg-[#0f172a] min-h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center shadow-lg">
            <span className="text-white font-display font-bold text-sm">SV</span>
          </div>
          <div>
            <p className="text-white font-display font-bold text-base tracking-widest leading-none">SAVAAN</p>
            <p className="text-white/40 text-[9px] tracking-widest mt-0.5">ADMIN PORTAL</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((item) => {
          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() => setOrdersOpen(!ordersOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm"
                >
                  <item.icon size={16} />
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronDown size={13} className={`transition-transform ${ordersOpen ? 'rotate-180' : ''}`} />
                </button>
                {ordersOpen && (
                  <div className="ml-7 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <NavLink
                        key={child.label}
                        to={child.path}
                        className={({ isActive }) =>
                          `block px-3 py-1.5 rounded-lg text-xs transition-all ${
                            isActive ? 'text-teal-400 bg-teal-400/10' : 'text-white/40 hover:text-white/70'
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          return (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-0.5 ${
                  isActive
                    ? 'bg-teal-600/20 text-teal-400 border-r-2 border-teal-400'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => { logout(); navigate('/login') }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all text-sm"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  )
}
