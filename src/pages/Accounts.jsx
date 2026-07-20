import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/auth.jsx'
import { useLanguage } from '../lib/i18n.jsx'
import { isValidUsername } from '../lib/username.js'
import { callManageAccount } from '../lib/manageAccount.js'

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
  const [passwordTargetId, setPasswordTargetId] = useState(null)
  const [roleTargetId, setRoleTargetId] = useState(null)

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

  async function handleDelete(id) {
    setDeletingId(id)
    try {
      await callManageAccount({ action: 'delete', user_id: id })
      setAccounts((a) => a.filter((x) => x.id !== id))
      setConfirmDeleteId(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const passwordTarget = accounts.find((a) => a.id === passwordTargetId)
  const roleTarget = accounts.find((a) => a.id === roleTargetId)

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
            <div key={a.id}>
              <div className="bg-card border border-line rounded-card p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{a.full_name || a.username}</p>
                  <p className="font-mono text-xs text-ink-soft truncate">@{a.username}</p>
                </div>
                <span className="font-mono text-xs uppercase tracking-wide text-ledger whitespace-nowrap">
                  {t(ROLE_LABELS_KEY[a.role] || a.role)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {a.role !== 'admin' && (
                    <button
                      onClick={() => setRoleTargetId(a.id)}
                      aria-label={t('changeRole')}
                      title={t('changeRole')}
                      className="w-9 h-9 flex items-center justify-center text-ink-soft hover:text-ledger hover:bg-ledger/10 rounded-card transition-colors"
                    >
                      ⇄
                    </button>
                  )}
                  <button
                    onClick={() => setPasswordTargetId(a.id)}
                    aria-label={t('changePassword')}
                    title={t('changePassword')}
                    className="w-9 h-9 flex items-center justify-center text-ink-soft hover:text-ledger hover:bg-ledger/10 rounded-card transition-colors"
                  >
                    🔑
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(a.id)}
                    aria-label={t('delete')}
                    className="w-9 h-9 flex items-center justify-center text-ink-soft hover:text-stamp hover:bg-stamp/10 rounded-card transition-colors"
                  >
                    ×
                  </button>
                </div>
              </div>

              {confirmDeleteId === a.id && (
                <div className="mt-2 border border-stamp/30 bg-stamp/5 rounded-card p-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-ink">
                    {t('deleteAccountConfirm', { name: a.full_name || a.username })}
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
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAccountModal
          canCreateAdmin={profile.role === 'admin'}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            load()
          }}
        />
      )}

      {passwordTarget && (
        <ChangePasswordModal
          account={passwordTarget}
          onClose={() => setPasswordTargetId(null)}
          onDone={() => setPasswordTargetId(null)}
        />
      )}

      {roleTarget && (
        <ChangeRoleModal
          account={roleTarget}
          onClose={() => setRoleTargetId(null)}
          onDone={() => {
            setRoleTargetId(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function CreateAccountModal({ canCreateAdmin, onClose, onCreated }) {
  const { t } = useLanguage()
  const [role, setRole] = useState('client')
  const [fullName, setFullName] = useState('')
  const [clientFullName, setClientFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!isValidUsername(username)) {
      setError(t('usernameInvalid'))
      return
    }
    setSaving(true)
    setError('')
    try {
      await callManageAccount({
        action: 'create',
        role,
        full_name: fullName,
        client_full_name: role === 'client' ? clientFullName || fullName : undefined,
        username,
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
              {t('fieldUsername')}
            </span>
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ivan.petrov"
              required
            />
            <span className="block text-xs text-ink-soft mt-1">{t('usernameHelp')}</span>
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

function ChangePasswordModal({ account, onClose, onDone }) {
  const { t } = useLanguage()
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await callManageAccount({ action: 'reset_password', user_id: account.id, new_password: password })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-card border border-line rounded-card p-6 max-w-sm w-full">
        <p className="font-display font-semibold text-ink text-lg mb-1">
          {t('changePassword')}
        </p>
        <p className="text-sm text-ink-soft mb-4">@{account.username}</p>

        {done ? (
          <>
            <p className="text-sm text-ink mb-4">{t('passwordChanged')}</p>
            <button
              onClick={onDone}
              className="w-full px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors"
            >
              {t('save')}
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block">
              <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
                {t('newPassword')}
              </span>
              <input
                className="input"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                autoFocus
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
        )}
      </div>
    </div>
  )
}

function ChangeRoleModal({ account, onClose, onDone }) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const newRole = account.role === 'trainer' ? 'client' : 'trainer'

  async function handleConfirm() {
    setSaving(true)
    setError('')
    try {
      await callManageAccount({ action: 'change_role', user_id: account.id, new_role: newRole })
      onDone()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-card border border-line rounded-card p-6 max-w-sm w-full">
        <p className="font-display font-semibold text-ink text-lg mb-1">
          {t('changeRole')}
        </p>
        <p className="text-sm text-ink-soft mb-4">@{account.username}</p>

        <p className="text-sm text-ink mb-4">
          {newRole === 'client' ? t('changeRoleToClientWarning') : t('changeRoleToTrainerWarning')}
        </p>

        {error && <p className="text-sm text-stamp mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors disabled:opacity-50"
          >
            {saving ? t('saving') : t('confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
