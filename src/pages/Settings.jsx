import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'

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
      .order('sort_order')
    if (error) setError(error.message)
    else setParameters(data)
    setLoading(false)
  }

  function updateLocal(id, field, value) {
    setParameters((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  async function saveOne(param) {
    setSavingId(param.id)
    const { error } = await supabase
      .from('parameters')
      .update({ name: param.name, value_type: param.value_type })
      .eq('id', param.id)
    if (error) setError(error.message)
    setSavingId(null)
  }

  return (
    <div>
      <Link to="/" className="text-sm text-ink-soft hover:text-ledger">
        ← Обратно към картотеката
      </Link>

      <p className="font-display text-xl font-semibold text-ink mt-4 mb-1">
        Настройки на параметрите
      </p>
      <p className="text-sm text-ink-soft mb-6">
        Тези 15 параметъра са общи за всички клиенти. Преименувай ги според това,
        което следиш, и избери дали стойността е число или текст. Съществуващата
        история от стойности не се променя.
      </p>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink-soft font-mono text-sm">Зареждане...</p>
      ) : (
        <div className="space-y-2">
          {parameters.map((param) => (
            <div
              key={param.id}
              className="flex items-center gap-3 bg-card border border-line rounded-card p-3"
            >
              <span className="font-mono text-xs text-ink-soft w-6">
                {param.sort_order}
              </span>
              <input
                className="input flex-1"
                value={param.name}
                onChange={(e) => updateLocal(param.id, 'name', e.target.value)}
              />
              <select
                className="input w-32"
                value={param.value_type}
                onChange={(e) => updateLocal(param.id, 'value_type', e.target.value)}
              >
                <option value="text">Текст</option>
                <option value="number">Число</option>
              </select>
              <button
                onClick={() => saveOne(param)}
                disabled={savingId === param.id}
                className="px-3 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark disabled:opacity-50 whitespace-nowrap"
              >
                {savingId === param.id ? 'Запис...' : 'Запази'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
