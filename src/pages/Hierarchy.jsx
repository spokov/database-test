import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'

const ROLE_ICON = { admin: '👑', trainer: '🧑‍🏫' }
const ROLE_LABEL_KEY = { admin: 'roleAdmin', trainer: 'roleTrainer' }

export default function Hierarchy() {
  const { t } = useLanguage()
  const [profiles, setProfiles] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: profileData, error: profileError }, { data: clientData, error: clientError }] =
      await Promise.all([
        supabase.from('profiles').select('id, role, full_name, username, created_by'),
        supabase.from('clients').select('id, full_name, owner_id, user_id'),
      ])
    if (profileError || clientError) {
      setError((profileError || clientError).message)
      setLoading(false)
      return
    }
    setProfiles(profileData || [])
    setClients(clientData || [])
    setLoading(false)
  }

  if (loading) return <p className="text-ink-soft font-mono text-sm">{t('loading')}</p>
  if (error) return <p className="text-stamp text-sm">{error}</p>

  const staff = profiles.filter((p) => p.role !== 'client')
  const staffIds = new Set(staff.map((p) => p.id))
  const profileById = new Map(profiles.map((p) => [p.id, p]))

  // Children (sub-trainers) grouped by their creator.
  const childrenOf = new Map()
  for (const p of staff) {
    if (p.created_by && staffIds.has(p.created_by)) {
      if (!childrenOf.has(p.created_by)) childrenOf.set(p.created_by, [])
      childrenOf.get(p.created_by).push(p)
    }
  }

  // Client leaves grouped by owner - skip clients whose linked account is
  // itself staff (they're already shown as a trainer/admin node instead).
  const clientsOf = new Map()
  for (const c of clients) {
    if (c.user_id && staffIds.has(c.user_id)) continue
    if (!c.owner_id) continue
    if (!clientsOf.has(c.owner_id)) clientsOf.set(c.owner_id, [])
    clientsOf.get(c.owner_id).push(c)
  }

  const roots = staff
    .filter((p) => !p.created_by || !profileById.has(p.created_by))
    .sort((a, b) => (a.role === 'admin' ? -1 : 1) - (b.role === 'admin' ? -1 : 1))

  const isEmpty = roots.length === 0

  return (
    <div>
      <p className="font-display text-xl font-semibold text-ink mt-2 mb-1">
        {t('hierarchyTitle')}
      </p>
      <p className="text-sm text-ink-soft mb-6">{t('hierarchyDescription')}</p>

      {isEmpty ? (
        <div className="text-center py-16 border border-dashed border-line rounded-card">
          <p className="font-display text-ink-soft">{t('noStructureYet')}</p>
        </div>
      ) : (
        <div className="bg-card border border-line rounded-card p-4 sm:p-6 overflow-x-auto">
          {roots.map((root) => (
            <TreeNode
              key={root.id}
              profile={root}
              childrenOf={childrenOf}
              clientsOf={clientsOf}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TreeNode({ profile, childrenOf, clientsOf, t }) {
  const children = childrenOf.get(profile.id) || []
  const clients = clientsOf.get(profile.id) || []

  return (
    <div className="mb-1">
      <div className="flex items-center gap-2 py-1.5">
        <span className="text-lg leading-none">{ROLE_ICON[profile.role] || '🧑‍🏫'}</span>
        <span className="font-display font-medium text-ink">
          {profile.full_name || profile.username}
        </span>
        <span className="font-mono text-xs text-ink-soft">@{profile.username}</span>
        <span className="font-mono text-[10px] uppercase tracking-wide text-ledger bg-ledger/10 border border-ledger/30 rounded px-1.5 py-0.5">
          {t(ROLE_LABEL_KEY[profile.role] || 'roleTrainer')}
        </span>
      </div>

      {(children.length > 0 || clients.length > 0) && (
        <div className="pl-4 sm:pl-6 border-l border-line ml-2.5">
          {children.map((child) => (
            <TreeNode
              key={child.id}
              profile={child}
              childrenOf={childrenOf}
              clientsOf={clientsOf}
              t={t}
            />
          ))}
          {clients.map((c) => (
            <Link
              key={c.id}
              to={`/client/${c.id}`}
              className="flex items-center gap-2 py-1 text-sm text-ink-soft hover:text-ledger transition-colors"
            >
              <span className="text-base leading-none">🧍</span>
              <span className="truncate">{c.full_name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
