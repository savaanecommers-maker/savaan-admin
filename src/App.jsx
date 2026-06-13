import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

import Login        from './pages/Login'
import Dashboard    from './pages/Dashboard'
import Products     from './pages/Products'
import Categories   from './pages/Categories'
import Orders       from './pages/Orders'
import { Customers }from './pages/Customers'
import Coupons      from './pages/Coupons'
import Reviews      from './pages/Reviews'
import Notifications from './pages/Notifications'
import Reports      from './pages/Reports'
import Settings     from './pages/Settings'
import Inventory   from './pages/Inventory'
import FlashDeals  from './pages/FlashDeals'
import Banners     from './pages/Banners'
import Payments    from './pages/Payments'
import Shipping    from './pages/Shipping'
import AdminUsers    from './pages/AdminUsers'
import ResetPassword from './pages/ResetPassword'
import Returns          from './pages/Returns'
import HomepageSections  from './pages/HomepageSections'
import LuxuryCollections    from './pages/LuxuryCollections'
import ContentManagement    from './pages/ContentManagement'

function Guard({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route path="/login"          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Guard><Dashboard /></Guard>} />
      <Route path="/products" element={<Guard><Products /></Guard>} />
      <Route path="/categories" element={<Guard><Categories /></Guard>} />
      <Route path="/orders" element={<Guard><Orders /></Guard>} />
      <Route path="/customers" element={<Guard><Customers /></Guard>} />
      <Route path="/inventory" element={<Guard><Inventory /></Guard>} />
      <Route path="/flash-deals" element={<Guard><FlashDeals /></Guard>} />
      <Route path="/coupons" element={<Guard><Coupons /></Guard>} />
      <Route path="/banners" element={<Guard><Banners /></Guard>} />
      <Route path="/reviews" element={<Guard><Reviews /></Guard>} />
      <Route path="/payments" element={<Guard><Payments /></Guard>} />
      <Route path="/shipping" element={<Guard><Shipping /></Guard>} />
      <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
      <Route path="/reports" element={<Guard><Reports /></Guard>} />
      <Route path="/users" element={<Guard><AdminUsers /></Guard>} />
      <Route path="/settings" element={<Guard><Settings /></Guard>} />
      <Route path="/returns"         element={<Guard><Returns /></Guard>} />
      <Route path="/homepage-sections"   element={<Guard><HomepageSections /></Guard>} />
      <Route path="/luxury-collections"  element={<Guard><LuxuryCollections /></Guard>} />
      <Route path="/content"  element={<Guard><ContentManagement /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
