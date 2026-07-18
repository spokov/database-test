import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import ClientCard from '../components/ClientCard.jsx'
import AddClientModal from '../components/AddClientModal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function Home() {
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
    const { error } = await supabase.from('clients').delete().eq('id', toDelete.id)
    if (error) setError(error.message)
    else setClients((cs) => cs.filter((c) => c.id !== toDelete.id))
    setToDelete(null)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <input
          className="input flex-1"
          placeholder="Търси по име, телефон, имейл или адрес..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors whitespace-nowrap"
        >
          + Нов клиент
        </button>
      </div>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink-soft font-mono text-sm">Зареждане...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-line rounded-card">
          <p className="font-display text-ink-soft">
            {clients.length === 0
              ? 'Все още няма добавени клиенти.'
              : 'Няма съвпадения за търсенето.'}
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
        title={`Изтриване на ${toDelete?.full_name || ''}`}
        message="Това ще изтрие клиента и цялата история от параметри. Действието е необратимо."
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}
