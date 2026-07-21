import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'

const ROLE_ICON = { admin: '👑', trainer: '🧑‍🏫' }
const ROLE_LABEL_KEY = { admin: 'roleAdmin', trainer: 'roleTrainer' }

// All IDs reachable below `id` by following the sub-trainer tree - used to
// stop a trainer from being moved under one of their own descendants.
function getDescendantIds(id, childrenOf) {
  const result = new Set()
  const stack = [...(childrenOf.get(id) || [])]
  while (stack.length) {
    const node = stack.pop()
    if (result.has(node.id)) continue
    result.add(node.id)
    stack.push(...(childrenOf.get(node.id) || []))
  }
  return result
}

export default function Hierarchy() {
  const { t } = useLanguage()
  const [profiles, setProfiles] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moveNode, setMoveNode] = useState(null) // { type: 'trainer'|'client', id, currentParentId }

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: profileData, error: profileError }, { data: clientData, error: clientError }] =
      await Promise.all([
        supabase.from('profiles').select('id, role, full_name, username, created_by'),
        supabase.from('clients').select('id, full_name, phone, owner_id, user_id'),
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

  async function handleMoveConfirm(newParentId) {
    if (!moveNode) return
    if (moveNode.type === 'client') {
      const { error } = await supabase
        .from('clients')
        .update({ owner_id: newParentId })
        .eq('id', moveNode.id)
      if (error) {
        setError(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('profiles')
        .update({ created_by: newParentId })
        .eq('id', moveNode.id)
      if (error) {
        setError(error.message)
        return
      }
    }
    setMoveNode(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="font-display text-xl font-semibold text-ink mt-2">
          {t('hierarchyTitle')}
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors whitespace-nowrap"
        >
          {t('printButton')}
        </button>
      </div>
      <p className="text-sm text-ink-soft mb-6">{t('hierarchyDescription')}</p>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      {isEmpty ? (
        <div className="text-center py-16 border border-dashed border-line rounded-card">
          <p className="font-display text-ink-soft">{t('noStructureYet')}</p>
        </div>
      ) : (
        <div className="printable-area print-flow bg-card border border-line rounded-card p-4 sm:p-6 overflow-x-auto">
          {roots.map((root) => (
            <TreeNode
              key={root.id}
              profile={root}
              childrenOf={childrenOf}
              clientsOf={clientsOf}
              t={t}
              onMove={setMoveNode}
            />
          ))}
        </div>
      )}

      {moveNode && (
        <MoveModal
          moveNode={moveNode}
          staff={staff}
          childrenOf={childrenOf}
          onClose={() => setMoveNode(null)}
          onConfirm={handleMoveConfirm}
          t={t}
        />
      )}
    </div>
  )
}

function TreeNode({ profile, childrenOf, clientsOf, t, onMove }) {
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
        {profile.role === 'trainer' && (
          <button
            type="button"
            onClick={() =>
              onMove({ type: 'trainer', id: profile.id, currentParentId: profile.created_by })
            }
            aria-label={t('moveNode')}
            title={t('moveNode')}
            className="no-print text-ink-soft/70 hover:text-ledger text-sm ml-1"
          >
            ⇅
          </button>
        )}
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
              onMove={onMove}
            />
          ))}
          {clients.map((c) => (
            <div key={c.id} className="flex items-center gap-2 py-1 text-sm">
              <Link
                to={`/client/${c.id}`}
                className="flex items-center gap-2 text-ink-soft hover:text-ledger transition-colors min-w-0"
              >
                <span className="text-base leading-none">🧍</span>
                <span className="truncate">{c.full_name}</span>
              </Link>
              {c.phone && (
                <span className="font-mono text-xs text-ink-soft whitespace-nowrap">
                  {c.phone}
                </span>
              )}
              <button
                type="button"
                onClick={() =>
                  onMove({ type: 'client', id: c.id, currentParentId: c.owner_id })
                }
                aria-label={t('moveNode')}
                title={t('moveNode')}
                className="no-print text-ink-soft/70 hover:text-ledger text-sm"
              >
                ⇅
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MoveModal({ moveNode, staff, childrenOf, onClose, onConfirm, t }) {
  const excluded = new Set()
  if (moveNode.type === 'trainer') {
    excluded.add(moveNode.id)
    for (const d of getDescendantIds(moveNode.id, childrenOf)) excluded.add(d)
  }

  const options = staff.filter((p) => !excluded.has(p.id))
  const [selected, setSelected] = useState(moveNode.currentParentId || '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onConfirm(selected || null)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-card border border-line rounded-card p-6 max-w-sm w-full">
        <p className="font-display font-semibold text-ink text-lg mb-1">{t('moveNode')}</p>
        <p className="text-sm text-ink-soft mb-4">
          {moveNode.type === 'trainer' ? t('moveTrainerHelp') : t('moveClientHelp')}
        </p>

        <label className="block mb-4">
          <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
            {t('moveNewParent')}
          </span>
          <select
            className="input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {moveNode.type === 'trainer' && <option value="">{t('moveTopLevel')}</option>}
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.full_name || p.username) + ` (@${p.username})`}
              </option>
            ))}
          </select>
        </label>

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
            onClick={handleSave}
            disabled={saving || (moveNode.type === 'client' && !selected)}
            className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors disabled:opacity-50"
          >
            {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}
