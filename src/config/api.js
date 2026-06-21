const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const REQUEST_TIMEOUT_MS = 20000

function getToken() {
  return sessionStorage.getItem('admin_access_token')
}

function getRefreshToken() {
  return sessionStorage.getItem('admin_refresh_token')
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
  // Admin login never returns a refresh_token in the JSON body — the backend
  // deliberately only sets it as an httpOnly cookie (XSS protection), so
  // sessionStorage's copy is always empty for admin sessions. Don't bail out
  // just because it's missing; the cookie alone (sent via credentials:
  // 'include') is enough for the backend to authenticate the refresh.
  const refresh_token = getRefreshToken()
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body:        JSON.stringify(refresh_token ? { refresh_token } : {}),
      credentials: 'include',
      signal:      controller.signal,
    }).finally(() => clearTimeout(timer))
    if (!res.ok) { clearTokens(); return null }
    const data = await res.json()
    sessionStorage.setItem('admin_access_token', data.access_token)
    return data.access_token
  } catch {
    clearTokens()
    return null
  }
}

async function request(method, path, body, isFormData = false) {
  let token = getToken()
  const makeRequest = async (t) => {
    const headers = {
      // CSRF guard: backend rejects mutating requests without this header.
      // Browsers never auto-set it cross-origin, so it blocks CSRF attacks.
      'X-Requested-With': 'XMLHttpRequest',
    }
    if (t) headers['Authorization'] = `Bearer ${t}`
    if (!isFormData) headers['Content-Type'] = 'application/json'
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      return await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        credentials: 'include',   // sends httpOnly refresh cookie on every request
        signal: controller.signal,
        body: isFormData ? body : body ? JSON.stringify(body) : undefined,
      })
    } finally {
      clearTimeout(timer)
    }
  }

  let res
  try {
    res = await makeRequest(token)
  } catch (e) {
    if (e.name === 'AbortError') return { data: null, error: { message: 'Request timed out. Please try again.' } }
    return { data: null, error: { message: 'Network error. Check your connection.' } }
  }

  if (res.status === 401) {
    const errJson = await res.json().catch(() => ({}))
    token = await refreshAccessToken()
    if (!token) {
      return { data: null, error: { message: errJson.error || 'Session expired. Please log in again.' } }
    }
    try {
      res = await makeRequest(token)
    } catch (e) {
      if (e.name === 'AbortError') return { data: null, error: { message: 'Request timed out.' } }
      return { data: null, error: { message: 'Network error.' } }
    }
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
  login:  (email, password) =>
    request('POST', '/api/auth/admin/login', { email, password }),
  logout: () => {
    clearTokens()
    // Cookie is cleared server-side; no need to send refresh_token in body
    return request('POST', '/api/auth/logout', {})
  },
  saveTokens,
  clearTokens,
  getToken,
  BASE_URL,
}

export default api
