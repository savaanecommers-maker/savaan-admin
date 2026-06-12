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
            // await so loading stays true until session is resolved
            await refreshSession()
          }
        } catch {
          api.clearTokens()
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  async function refreshSession() {
    const refresh = localStorage.getItem('admin_refresh_token')
    if (!refresh) return
    const res = await fetch(`${api.BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('admin_access_token', data.access_token)
      const payload = JSON.parse(atob(data.access_token.split('.')[1]))
      setUser({ id: payload.id, email: payload.email, role: payload.role })
      setIsAuthenticated(true)
    } else {
      api.clearTokens()
    }
  }

  async function login(email, password) {
    setError('')
    const { data, error: err } = await api.login(email, password)
    if (err) { setError(err.message); return false }
    api.saveTokens(data.access_token, data.refresh_token)
    setUser({ id: data.admin.id, email: data.admin.email, role: data.admin.role })
    setIsAuthenticated(true)
    return true
  }

  async function logout() {
    await api.logout()
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
