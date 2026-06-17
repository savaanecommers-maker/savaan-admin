import { createContext, useContext, useState, useEffect } from 'react'
import api from '../config/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser]                       = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [error, setError]                     = useState('')

  useEffect(() => {
    async function init() {
      const token = api.getToken()
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const expired = payload.exp * 1000 < Date.now()
          if (!expired) {
            setUser({ id: payload.id, email: payload.email, role: payload.role })
            setIsAuthenticated(true)
          } else {
            // Access token expired — try to silently renew via httpOnly refresh cookie.
            await refreshSession()
          }
        } catch {
          api.clearTokens()
          // Even if we can't parse the access token, try cookie-based refresh.
          await refreshSession()
        }
      } else {
        // No access token at all — attempt silent renewal via cookie (returning visitor).
        await refreshSession()
      }
      setLoading(false)
    }
    init()
  }, [])

  async function refreshSession() {
    // Refresh token lives in an httpOnly cookie — no need to read it from JS.
    // `credentials: 'include'` in the fetch causes the browser to send it automatically.
    try {
      const res = await fetch(`${api.BASE_URL}/api/auth/refresh`, {
        method:      'POST',
        credentials: 'include',
        headers: {
          'Content-Type':     'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      if (res.ok) {
        const data = await res.json()
        sessionStorage.setItem('admin_access_token', data.access_token)
        const payload = JSON.parse(atob(data.access_token.split('.')[1]))
        setUser({ id: payload.id, email: payload.email, role: payload.role })
        setIsAuthenticated(true)
      } else {
        api.clearTokens()
      }
    } catch {
      api.clearTokens()
    }
  }

  async function login(email, password) {
    setError('')
    const { data, error: err } = await api.login(email, password)
    if (err) { setError(err.message); return false }
    // Refresh token is now an httpOnly cookie set by the server — don't store it here.
    api.saveTokens(data.access_token)
    setUser({ id: data.admin.id, email: data.admin.email, role: data.admin.role })
    setIsAuthenticated(true)
    return true
  }

  async function logout() {
    await api.logout()
    sessionStorage.clear()   // clear all session data, not just token keys
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated, user, loading,
      login, logout, error, setError,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
