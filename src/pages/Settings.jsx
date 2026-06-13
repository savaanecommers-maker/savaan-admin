import { useEffect, useState, useRef } from 'react'
import Layout from '../components/layout/Layout'
import { Button, Input, Card } from '../components/ui/index'
import api from '../config/api'
import { Save, Store, Globe, Lock, Palette, Truck, CheckCircle, Loader } from 'lucide-react'

const TABS = [
  { key: 'general',  label: 'General',  icon: Store },
  { key: 'shipping', label: 'Shipping', icon: Truck },
  { key: 'theme',    label: 'Theme',    icon: Palette },
  { key: 'social',   label: 'Social',   icon: Globe },
  { key: 'security', label: 'Security', icon: Lock },
]

const DEFAULTS = {
  app_name:            'Savaan',
  tagline:             'Luxury & Trust',
  support_email:       'support@savaan.com',
  support_phone:       '+91 9999999999',
  store_address:       '',
  currency_symbol:     '₹',
  maintenance_mode:    'false',
  free_shipping_above: '999',
  shipping_charge:     '99',
  standard_days:       '3-5',
  express_days:        '1-2',
  express_charge:      '199',
  primary_color:       '#0d9488',
  accent_color:        '#10b981',
  facebook_url:        '',
  instagram_url:       '',
  twitter_url:         '',
  youtube_url:         '',
}

export default function Settings() {
  const [active, setActive]     = useState('general')
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [pwSaving, setPwSaving]   = useState(false)
  const [pwError, setPwError]     = useState('')
  const [pwSaved, setPwSaved]     = useState(false)

  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    loadSettings()
    return () => { mountedRef.current = false }
  }, [])

  async function loadSettings() {
    setLoading(true)
    const { data } = await api.get('/api/admin/settings')
    if (!mountedRef.current) return
    if (data && typeof data === 'object') {
      setSettings(prev => ({ ...prev, ...data }))
    }
    setLoading(false)
  }

  function set(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const res = await api.put('/api/admin/settings', settings)
    setSaving(false)
    if (res.error) {
      alert('Save failed: ' + (res.error?.message || res.error))
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function changePassword() {
    setPwError('')
    if (!passwords.current || !passwords.next || !passwords.confirm) {
      setPwError('All fields are required.'); return
    }
    if (passwords.next !== passwords.confirm) {
      setPwError('New passwords do not match.'); return
    }
    if (passwords.next.length < 8) {
      setPwError('Password must be at least 8 characters.'); return
    }
    setPwSaving(true)
    const { error } = await api.put('/api/admin/users/me', {
      current_password: passwords.current,
      new_password:     passwords.next,
    })
    setPwSaving(false)
    if (error) { setPwError(typeof error === 'string' ? error : 'Failed to update password'); return }
    setPwSaved(true)
    setPasswords({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwSaved(false), 3000)
  }

  if (loading) {
    return (
      <Layout title="Settings">
        <div className="flex items-center justify-center py-32">
          <Loader size={24} className="animate-spin text-teal-500" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Settings">
      <div className="flex items-center gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActive(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              active === t.key ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERAL ── */}
      {active === 'general' && (
        <div className="grid grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Store size={16} className="text-teal-600" />
              <h3 className="font-bold text-slate-800">Store Information</h3>
            </div>
            <div className="space-y-4">
              <Input label="App / Store Name" value={settings.app_name}
                onChange={e => set('app_name', e.target.value)} />
              <Input label="Tagline" value={settings.tagline}
                onChange={e => set('tagline', e.target.value)} placeholder="e.g. Luxury & Trust" />
              <Input label="Support Email" type="email" value={settings.support_email}
                onChange={e => set('support_email', e.target.value)} />
              <Input label="Support Phone" value={settings.support_phone}
                onChange={e => set('support_phone', e.target.value)} />
              <Input label="Currency Symbol" value={settings.currency_symbol}
                onChange={e => set('currency_symbol', e.target.value)} placeholder="₹" />
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Store Address</label>
                <textarea value={settings.store_address}
                  onChange={e => set('store_address', e.target.value)}
                  rows={3} placeholder="Enter store address..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:border-teal-500" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Store size={16} className="text-teal-600" />
              <h3 className="font-bold text-slate-800">App Configuration</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Maintenance Mode</p>
                  <p className="text-xs text-slate-400 mt-0.5">App shows a maintenance screen to users</p>
                </div>
                <button
                  onClick={() => set('maintenance_mode', settings.maintenance_mode === 'true' ? 'false' : 'true')}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings.maintenance_mode === 'true' ? 'bg-red-500' : 'bg-slate-300'
                  }`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.maintenance_mode === 'true' ? 'translate-x-5' : ''
                  }`} />
                </button>
              </div>
              {settings.maintenance_mode === 'true' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
                  ⚠️ Maintenance mode is ON — the app is currently showing a maintenance screen to all users.
                </div>
              )}
              <div className="bg-teal-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-teal-700 mb-2">Quick Summary</p>
                {[
                  ['App Name',             settings.app_name],
                  ['Currency',             settings.currency_symbol],
                  ['Free Shipping Above',  `${settings.currency_symbol}${settings.free_shipping_above}`],
                  ['Primary Color',        settings.primary_color],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-700">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── SHIPPING ── */}
      {active === 'shipping' && (
        <div className="grid grid-cols-2 gap-6 max-w-3xl">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Truck size={16} className="text-teal-600" />
              <h3 className="font-bold text-slate-800">Shipping Charges</h3>
            </div>
            <div className="space-y-4">
              <Input label="Standard Shipping Charge (₹)" type="number"
                value={settings.shipping_charge}
                onChange={e => set('shipping_charge', e.target.value)} />
              <Input label="Free Shipping Above (₹)" type="number"
                value={settings.free_shipping_above}
                onChange={e => set('free_shipping_above', e.target.value)} />
              <Input label="Express Delivery Charge (₹)" type="number"
                value={settings.express_charge}
                onChange={e => set('express_charge', e.target.value)} />
              <div className="bg-teal-50 rounded-xl p-3 text-xs text-teal-700 leading-relaxed">
                Orders above <strong>{settings.currency_symbol}{settings.free_shipping_above}</strong> qualify for free shipping.
                Others are charged <strong>{settings.currency_symbol}{settings.shipping_charge}</strong>.
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Truck size={16} className="text-teal-600" />
              <h3 className="font-bold text-slate-800">Delivery Times</h3>
            </div>
            <div className="space-y-4">
              <Input label="Standard Delivery (days)" value={settings.standard_days}
                onChange={e => set('standard_days', e.target.value)} placeholder="e.g. 3-5" />
              <Input label="Express Delivery (days)" value={settings.express_days}
                onChange={e => set('express_days', e.target.value)} placeholder="e.g. 1-2" />
              <p className="text-xs text-slate-400">These values are shown in the app to customers during checkout.</p>
            </div>
          </Card>
        </div>
      )}

      {/* ── THEME ── */}
      {active === 'theme' && (
        <div className="grid grid-cols-2 gap-6 max-w-3xl">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Palette size={16} className="text-teal-600" />
              <h3 className="font-bold text-slate-800">Brand Colors</h3>
            </div>
            <div className="space-y-5">
              {[
                { key: 'primary_color', label: 'Primary Color', hint: 'Main brand color (buttons, highlights)' },
                { key: 'accent_color',  label: 'Accent Color',  hint: 'Secondary highlights and gradients' },
              ].map(c => (
                <div key={c.key}>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">{c.label}</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={settings[c.key]}
                      onChange={e => set(c.key, e.target.value)}
                      className="w-12 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5" />
                    <input type="text" value={settings[c.key]}
                      onChange={e => set(c.key, e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:border-teal-500"
                      placeholder="#0d9488" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{c.hint}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Palette size={16} className="text-teal-600" />
              <h3 className="font-bold text-slate-800">Live Preview</h3>
            </div>
            <div className="bg-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl px-3 py-2"
                style={{ backgroundColor: settings.primary_color }}>
                <span className="text-white text-xs font-bold">{settings.app_name}</span>
                <div className="w-6 h-6 rounded-full bg-white/30" />
              </div>
              <div className="rounded-xl h-14 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.accent_color})` }}>
                {settings.tagline}
              </div>
              <div className="rounded-xl px-4 py-2 text-white text-xs font-bold text-center"
                style={{ backgroundColor: settings.primary_color }}>
                Shop Now
              </div>
              <p className="text-[10px] text-slate-400 text-center">App color preview</p>
            </div>
          </Card>
        </div>
      )}

      {/* ── SOCIAL ── */}
      {active === 'social' && (
        <Card className="p-6 max-w-lg">
          <div className="flex items-center gap-2 mb-5">
            <Globe size={16} className="text-teal-600" />
            <h3 className="font-bold text-slate-800">Social Links</h3>
          </div>
          <div className="space-y-4">
            {[
              { key: 'facebook_url',  label: '🔵 Facebook',    placeholder: 'https://facebook.com/savaan' },
              { key: 'instagram_url', label: '🟣 Instagram',   placeholder: 'https://instagram.com/savaan' },
              { key: 'twitter_url',   label: '🐦 Twitter / X', placeholder: 'https://twitter.com/savaan' },
              { key: 'youtube_url',   label: '🔴 YouTube',     placeholder: 'https://youtube.com/savaan' },
            ].map(s => (
              <Input key={s.key} label={s.label}
                value={settings[s.key] || ''}
                onChange={e => set(s.key, e.target.value)}
                placeholder={s.placeholder} />
            ))}
          </div>
        </Card>
      )}

      {/* ── SECURITY ── */}
      {active === 'security' && (
        <Card className="p-6 max-w-lg">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-teal-600" />
            <h3 className="font-bold text-slate-800">Change Admin Password</h3>
          </div>
          <div className="space-y-4">
            <Input label="Current Password" type="password"
              value={passwords.current}
              onChange={e => setPasswords({ ...passwords, current: e.target.value })}
              placeholder="••••••••" />
            <Input label="New Password" type="password"
              value={passwords.next}
              onChange={e => setPasswords({ ...passwords, next: e.target.value })}
              placeholder="••••••••" />
            <Input label="Confirm New Password" type="password"
              value={passwords.confirm}
              onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder="••••••••" />
            {pwError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl">{pwError}</div>
            )}
            {pwSaved && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                <CheckCircle size={13} /> Password changed successfully!
              </div>
            )}
            <Button onClick={changePassword} disabled={pwSaving}>
              {pwSaving ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </Card>
      )}

      {/* Save bar (not shown on Security tab) */}
      {active !== 'security' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button onClick={save} disabled={saving}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all ${
              saved   ? 'bg-emerald-500 text-white' :
              saving  ? 'bg-teal-400 text-white cursor-wait' :
                        'bg-teal-600 text-white hover:bg-teal-700'
            }`}>
            {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />}
            {saved ? 'Saved to Database!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </Layout>
  )
}
