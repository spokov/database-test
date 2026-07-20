import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { useLanguage } from '../lib/i18n.jsx'
import { resolveLoginEmail } from '../lib/username.js'

export default function Login() {
  const { signIn } = useAuth()
  const { t } = useLanguage()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn(resolveLoginEmail(identifier), password)
    if (error) setError(t('loginError'))
    setLoading(false)
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-card border border-line rounded-card p-6 max-w-sm w-full"
      >
        <p className="font-display text-xl font-semibold text-ink mb-1">
          {t('loginTitle')}
        </p>
        <p className="text-sm text-ink-soft mb-5">{t('loginSubtitle')}</p>

        <label className="block mb-3">
          <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
            {t('fieldUsername')}
          </span>
          <input
            className="input"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoFocus
            required
          />
        </label>

        <label className="block mb-4">
          <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
            {t('loginPassword')}
          </span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="text-sm text-stamp mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors disabled:opacity-50"
        >
          {loading ? t('saving') : t('loginButton')}
        </button>
      </form>
    </div>
  )
}
