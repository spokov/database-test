import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'
import { callManageAccount } from '../lib/manageAccount.js'
import ClientCard from '../components/ClientCard.jsx'
import AddClientModal from '../components/AddClientModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function Home() {
  const { t } = useLanguage()
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [toDelete, setToDelete] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  async function loadClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setClients(data)
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) =>
      [c.full_name, c.phone, c.email, c.address]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    )
  }, [clients, query])

  async function confirmDelete() {
    const clientUserId = toDelete.user_id
    const { error } = await supabase.from('clients').delete().eq('id', toDelete.id)
    if (error) {
      setError(error.message)
      setToDelete(null)
      return
    }
    setClients((cs) => cs.filter((c) => c.id !== toDelete.id))
    if (clientUserId) {
      try {
        await callManageAccount({ action: 'delete', user_id: clientUserId })
      } catch (err) {
        setError(err.message)
      }
    }
    setToDelete(null)
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <input
          className="input flex-1"
          placeholder={t('searchPlaceholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors whitespace-nowrap"
        >
          {t('newClient')}
        </button>
      </div>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink-soft font-mono text-sm">{t('loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-line rounded-card">
          <p className="font-display text-ink-soft">
            {clients.length === 0 ? t('noClientsYet') : t('noSearchMatches')}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} onDelete={setToDelete} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddClientModal
          onClose={() => setShowAdd(false)}
          onCreated={(client) => {
            setClients((cs) => [client, ...cs])
            setShowAdd(false)
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title={t('deleteClientTitle', { name: toDelete?.full_name || '' })}
        message={t('deleteClientMessage')}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
