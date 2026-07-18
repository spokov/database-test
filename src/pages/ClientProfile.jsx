import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const FIELD_LABELS = {
  full_name: 'Име и фамилия',
  address: 'Адрес',
  phone: 'Телефон',
  email: 'Имейл',
  birth_date: 'Дата на раждане',
  gender: 'Пол',
  notes: 'Бележки',
}

export default function ClientProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (clientError) {
      setError(clientError.message)
      setLoading(false)
      return
    }

    setClient(clientData)
    setForm(clientData)
    setLoading(false)
  }

  async function saveEdits() {
    const { data, error } = await supabase
      .from('clients')
      .update({
        full_name: form.full_name,
        address: form.address,
        phone: form.phone,
        email: form.email,
        birth_date: form.birth_date || null,
        gender: form.gender,
        notes: form.notes,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      setError(error.message)
      return
    }
    setClient(data)
    setEditing(false)
  }

  async function handleDelete() {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  if (loading) return <p className="text-ink-soft font-mono text-sm">Зареждане...</p>
  if (error && !client) return <p className="text-stamp text-sm">{error}</p>

  return (
    <div>
      <Link to="/" className="text-sm text-ink-soft hover:text-ledger">
        ← Обратно към картотеката
      </Link>

      <div className="card-tab bg-card border border-line rounded-card p-6 mt-4">
        <div className="flex items-start gap-5">
          {client.photo_url ? (
            <img
              src={client.photo_url}
              alt={client.full_name}
              className="w-24 h-24 rounded-card object-cover border border-line"
            />
          ) : (
            <div className="w-24 h-24 rounded-card bg-ledger/10 border border-line" />
          )}

          <div className="flex-1">
            {editing ? (
              <div className="space-y-2">
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
                      {label}
                    </span>
                    {field === 'gender' ? (
                      <select
                        className="input"
                        value={form.gender || ''}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      >
                        <option value="">—</option>
                        <option value="Мъж">Мъж</option>
                        <option value="Жена">Жена</option>
                        <option value="Друго">Друго</option>
                      </select>
                    ) : field === 'notes' ? (
                      <textarea
                        className="input"
                        rows={2}
                        value={form.notes || ''}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    ) : (
                      <input
                        className="input"
                        type={field === 'birth_date' ? 'date' : 'text'}
                        value={form[field] || ''}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      />
                    )}
                  </label>
                ))}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={saveEdits}
                    className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark"
                  >
                    Запази
                  </button>
                  <button
                    onClick={() => {
                      setForm(client)
                      setEditing(false)
                    }}
                    className="px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
                  >
                    Отказ
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold text-ink">
                  {client.full_name}
                </p>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
                  <Info label="Телефон" value={client.phone} />
                  <Info label="Имейл" value={client.email} />
                  <Info label="Адрес" value={client.address} />
                  <Info label="Дата на раждане" value={client.birth_date} />
                  <Info label="Пол" value={client.gender} />
                  <Info label="Бележки" value={client.notes} />
                </dl>
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={() => setEditing(true)}
                    className="font-mono text-xs uppercase tracking-wide text-ledger hover:underline"
                  >
                    Редактирай
                  </button>
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="font-mono text-xs uppercase tracking-wide text-stamp hover:underline"
                  >
                    Изтрий клиента
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-stamp mt-4">{error}</p>}

      <p className="font-display text-lg font-semibold text-ink mt-8 mb-3">
        Параметри
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <GroupCard
          to={`/client/${id}/tanita`}
          title="Танита измервания"
          subtitle="10 параметъра · везна Tanita"
        />
        <GroupCard
          to={`/client/${id}/body`}
          title="Мерки на тялото"
          subtitle="5 параметъра · обиколки"
        />
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Изтриване на ${client.full_name}`}
        message="Това ще изтрие клиента и цялата история от параметри. Действието е необратимо."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  )
}

function GroupCard({ to, title, subtitle }) {
  return (
    <Link
      to={to}
      className="card-tab block bg-card border border-line rounded-card p-5 hover:border-ledger hover:shadow-sm transition-all"
    >
      <p className="font-display font-semibold text-ink text-lg">{title}</p>
      <p className="text-sm text-ink-soft mt-1">{subtitle}</p>
      <p className="font-mono text-xs text-ledger mt-3">Отвори →</p>
    </Link>
  )
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-mono uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="text-ink">{value || '—'}</dd>
    </div>
  )
}
