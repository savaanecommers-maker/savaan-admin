import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, Lock, Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function Login() {
  const { login, error, setError } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent]   = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const ok = await login(email, password)
    if (ok) navigate('/')
    setLoading(false)
  }

  const handleForgotPassword = (e) => {
    e.preventDefault()
    setResetSent(true)
  }

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-white flex-col items-center justify-center p-12">

        {/* Wave decorations — full width, pinned to top and bottom */}
        <img src="/topleft.png" alt="" className="absolute top-0 left-0 w-full pointer-events-none select-none" />
        <img src="/bottomright.png" alt="" className="absolute bottom-0 left-0 w-full pointer-events-none select-none" />

        {/* Logo + branding — shifted upward */}
        <div className="relative z-10 flex flex-col items-center text-center -mt-24">
          <img src="/sn-logo.png" alt="Savaan Logo" className="w-64 h-64 object-contain mb-4 drop-shadow-sm" />

          {/* Decorative divider */}
          <div className="flex items-center gap-3 my-3">
            <div className="w-10 h-px bg-slate-300" />
            <span className="text-teal-600 text-xs">✦</span>
            <div className="w-10 h-px bg-slate-300" />
          </div>

          <p className="text-slate-500 tracking-[0.25em] text-xl font-medium">
            Luxury &amp; Trust
          </p>

          <p className="text-slate-400 text-xl mt-6 leading-relaxed max-w-xs">
            Experience Luxury.<br/>Experience Trust.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center mb-3 shadow-lg">
              <span className="text-white font-display font-bold text-xl">SN</span>
            </div>
            <h1 className="font-display font-bold text-2xl tracking-widest text-slate-800">SAVAAN</h1>
          </div>

          {!forgotMode ? (
            <>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome Back</h2>
              <p className="text-slate-400 text-sm mb-8">Sign in to continue to your admin dashboard</p>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" value={email}
                      onChange={e => { setEmail(e.target.value); setError('') }}
                      placeholder="Enter your email address" required
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all bg-white" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold text-slate-600">Password</label>
                    <button type="button" onClick={() => { setForgotMode(true); setError(''); setResetEmail(email) }}
                      className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type={showPw ? 'text' : 'password'} value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Enter your password" required
                      className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all bg-white" />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold rounded-xl hover:from-teal-500 hover:to-teal-400 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-60 text-sm tracking-wide mt-1">
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button onClick={() => { setForgotMode(false); setResetSent(false); setError('') }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-6 transition-colors">
                <ArrowLeft size={13} /> Back to sign in
              </button>

              {resetSent ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-amber-500" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Contact Your Administrator</h2>
                  <p className="text-slate-400 text-sm">
                    Password reset via email is not supported.<br />
                    Ask a <strong className="text-slate-600">Super Admin</strong> to reset your password from the Users panel.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-slate-800 mb-1">Reset Password</h2>
                  <p className="text-slate-400 text-sm mb-8">Enter your email and we'll send a reset link.</p>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-5">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-5">
                    <div>
                      <label className="text-sm font-semibold text-slate-600 mb-1.5 block">Email Address</label>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="email" value={resetEmail}
                          onChange={e => { setResetEmail(e.target.value); setError('') }}
                          placeholder="Enter your email address" required
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-slate-800 text-sm placeholder:text-slate-300 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-all bg-white" />
                      </div>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold rounded-xl disabled:opacity-60 text-sm tracking-wide">
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          <p className="text-center text-slate-300 text-xs mt-10">
            © 2024 Savaan · Luxury &amp; Trust · Admin Portal
          </p>
        </div>
      </div>
    </div>
  )
}