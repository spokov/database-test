import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

const GROUP_LABELS = {
  tanita: 'Танита измервания (10)',
  body: 'Мерки на тялото (5)',
}

export default function Settings() {
  const [parameters, setParameters] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('parameters')
      .select('*')
      .order('category')
      .order('sort_order')
    if (error) setError(error.message)
    else setParameters(data)
    setLoading(false)
  }

  function updateLocal(paramId, field, value) {
    setParameters((ps) => ps.map((p) => (p.id === paramId ? { ...p, [field]: value } : p)))
  }

  async function saveOne(param) {
    setSavingId(param.id)
    const { error } = await supabase
      .from('parameters')
      .update({ name: param.name })
      .eq('id', param.id)
    if (error) setError(error.message)
    setSavingId(null)
  }

  const groups = ['tanita', 'body']
    .map((cat) => ({ cat, items: parameters.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length > 0)

  return (
    <div>
      <Link to="/" className="text-sm text-ink-soft hover:text-ledger">
        ← Обратно към картотеката
      </Link>

      <p className="font-display text-xl font-semibold text-ink mt-4 mb-1">
        Настройки на параметрите
      </p>
      <p className="text-sm text-ink-soft mb-6">
        Преименувай параметрите според това, което следиш. Всички стойности са
        числови. Съществуващата история от стойности не се променя.
      </p>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink-soft font-mono text-sm">Зареждане...</p>
      ) : (
        <div className="space-y-8">
          {groups.map(({ cat, items }) => (
            <div key={cat}>
              <p className="font-display font-semibold text-ink mb-3">
                {GROUP_LABELS[cat] || cat}
              </p>
              <div className="space-y-3">
                {items.map((param) => (
                  <div
                    key={param.id}
                    className="bg-card border border-line rounded-card p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-soft w-5 flex-shrink-0">
                        {param.sort_order}
                      </span>
                      <input
                        className="input text-base"
                        value={param.name}
                        onChange={(e) => updateLocal(param.id, 'name', e.target.value)}
                        placeholder="Име на параметъра"
                      />
                      <button
                        onClick={() => saveOne(param)}
                        disabled={savingId === param.id}
                        className="px-3 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark disabled:opacity-50 whitespace-nowrap"
                      >
                        {savingId === param.id ? 'Запис...' : 'Запази'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
