// Central API client for admin portal (Supabase has been fully removed)

// SEC-11: Tokens stored in sessionStorage (cleared when browser tab closes).
// TODO: Migrate to httpOnly cookies for full XSS protection — requires backend
// Set-Cookie support and CORS credentials configuration.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function getToken() {
  return sessionStorage.getItem('admin_access_token')
}

function saveTokens(access, refresh) {
  sessionStorage.setItem('admin_access_token', access)
  if (refresh) sessionStorage.setItem('admin_refresh_token', refresh)
}

function clearTokens() {
  sessionStorage.removeItem('admin_access_token')
  sessionStorage.removeItem('admin_refresh_token')
}

async function refreshAccessToken() {
  const refresh = sessionStorage.getItem('admin_refresh_token')
  if (!refresh) return null
  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  })
  if (!res.ok) { clearTokens(); return null }
  const data = await res.json()
  sessionStorage.setItem('admin_access_token', data.access_token)
  return data.access_token
}

async function request(method, path, body, isFormData = false) {
  let token = getToken()
  const makeRequest = async (t) => {
    const headers = {}
    if (t) headers['Authorization'] = `Bearer ${t}`
    if (!isFormData) headers['Content-Type'] = 'application/json'
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    })
  }

  let res = await makeRequest(token)
  if (res.status === 401) {
    // Read the actual error body first
    const errJson = await res.json().catch(() => ({}))
    // Try refresh once
    token = await refreshAccessToken()
    if (!token) {
      // Show the real error (e.g. "Invalid email or password") not the generic message
      return { data: null, error: { message: errJson.error || 'Session expired. Please log in again.' } }
    }
    res = await makeRequest(token)
  }

  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { data: null, error: { message: json.error || res.statusText } }
  return { data: json, error: null }
}

const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  patch:  (path, body)  => request('PATCH',  path, body),
  delete: (path)        => request('DELETE', path),
  upload: (path, form)  => request('POST',   path, form, true),

  // Auth helpers
  login:     (email, password) =>
    request('POST', '/api/auth/admin/login', { email, password }),
  logout:    () => {
    const refresh = sessionStorage.getItem('admin_refresh_token')
    clearTokens()
    return request('POST', '/api/auth/logout', { refresh_token: refresh })
  },
  saveTokens,
  clearTokens,
  getToken,
  BASE_URL,
}

export default api
