import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

export default function ResetPassword() {
  const navigate = useNavigate()

  // Redirect to login after a short delay so the message is visible
  useEffect(() => {
    const t = setTimeout(() => navigate('/login'), 5000)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="max-w-sm w-full text-center">
        <div className="flex flex-col items-center mb-8">
          <img src="/sn-logo.png" alt="Savaan" className="w-20 h-20 object-contain mb-2" />
          <h1 className="font-bold text-slate-800 text-lg tracking-widest">SAVAAN</h1>
        </div>

        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-amber-500" />
        </div>

        <h2 className="text-xl font-bold text-slate-800 mb-2">Password Reset Unavailable</h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Password reset via email link is not supported.<br />
          Please contact a <strong className="text-slate-700">Super Admin</strong> to reset
          your password from the Users panel, or change it yourself from the
          <strong className="text-slate-700"> Settings → Security</strong> tab.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition-colors">
          Back to Login
        </button>

        <p className="text-xs text-slate-300 mt-4">Redirecting in 5 seconds…</p>
      </div>
    </div>
  )
}
