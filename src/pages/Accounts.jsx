import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/auth.jsx'
import { useLanguage } from '../lib/i18n.jsx'

const ROLE_LABELS_KEY = {
  admin: 'roleAdmin',
  trainer: 'roleTrainer',
  client: 'roleClient',
}

export default function Accounts() {
  const { profile } = useAuth()
  const { t } = useLanguage()

  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setAccounts((data || []).filter((a) => a.id !== profile.id))
    setLoading(false)
  }

  async function callFunction(body) {
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData.session?.access_token
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(body),
      }
    )
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Request failed')
    return json
  }

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await callFunction({ action: 'delete', user_id: id })
      setAccounts((a) => a.filter((x) => x.id !== id))
      setConfirmDeleteId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="font-display text-xl font-semibold text-ink mt-2">
          {t('accountsTitle')}
        </p>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors whitespace-nowrap"
        >
          {t('newAccount')}
        </button>
      </div>
      <p className="text-sm text-ink-soft mb-6">{t('accountsDescription')}</p>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink-soft font-mono text-sm">{t('loading')}</p>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-line rounded-card">
          <p className="font-display text-ink-soft">{t('noAccountsYet')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="bg-card border border-line rounded-card p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{a.full_name || a.email}</p>
                <p className="text-xs text-ink-soft truncate">{a.email}</p>
              </div>
              <span className="font-mono text-xs uppercase tracking-wide text-ledger whitespace-nowrap">
                {t(ROLE_LABELS_KEY[a.role] || a.role)}
              </span>
              <button
                onClick={() => setConfirmDeleteId(a.id)}
                aria-label={t('delete')}
                className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-ink-soft hover:text-stamp hover:bg-stamp/10 rounded-card transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {accounts.map(
        (a) =>
          confirmDeleteId === a.id && (
            <div
              key={`confirm-${a.id}`}
              className="mt-3 border border-stamp/30 bg-stamp/5 rounded-card p-3 flex items-center justify-between gap-3"
            >
              <span className="text-sm text-ink">
                {t('deleteAccountConfirm', { name: a.full_name || a.email })}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="text-sm text-ink-soft hover:text-ink"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  disabled={deletingId === a.id}
                  className="text-sm font-medium text-white bg-stamp px-3 py-1 rounded-card hover:bg-stamp/90 disabled:opacity-50"
                >
                  {deletingId === a.id ? t('saving') : t('delete')}
                </button>
              </div>
            </div>
          )
      )}

      {showCreate && (
        <CreateAccountModal
          canCreateAdmin={profile.role === 'admin'}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
          callFunction={callFunction}
        />
      )}
    </div>
  )
}

function CreateAccountModal({ canCreateAdmin, onClose, onCreated, callFunction }) {
  const { t } = useLanguage()
  const [role, setRole] = useState('client')
  const [fullName, setFullName] = useState('')
  const [clientFullName, setClientFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await callFunction({
        action: 'create',
        role,
        full_name: fullName,
        client_full_name: role === 'client' ? clientFullName || fullName : undefined,
        email,
        password,
      })
      onCreated()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-card border border-line rounded-card p-6 max-w-md w-full">
        <p className="font-display font-semibold text-ink text-lg mb-4">
          {t('newAccount')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
              {t('accountRole')}
            </span>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="client">{t('roleClient')}</option>
              <option value="trainer">{t('roleTrainer')}</option>
              {canCreateAdmin && <option value="admin">{t('roleAdmin')}</option>}
            </select>
          </label>

          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
              {t('accountFullName')}
            </span>
            <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </label>

          {role === 'client' && (
            <label className="block">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
                {t('accountClientRecordName')}
              </span>
              <input
                className="input"
                value={clientFullName}
                onChange={(e) => setClientFullName(e.target.value)}
                placeholder={fullName}
              />
            </label>
          )}

          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
              {t('fieldEmail')}
            </span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
              {t('loginPassword')}
            </span>
            <input
              className="input"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          {error && <p className="text-sm text-stamp">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors disabled:opacity-50"
            >
              {saving ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
