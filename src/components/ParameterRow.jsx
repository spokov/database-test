import { useState } from 'react'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ParameterRow({ parameter, entries, onAddValue }) {
  const [showHistory, setShowHistory] = useState(false)
  const [value, setValue] = useState('')
  const [date, setDate] = useState(today())
  const [saving, setSaving] = useState(false)

  const latest = entries[0]

  async function handleAdd(e) {
    e.preventDefault()
    if (value === '') return
    setSaving(true)
    await onAddValue(parameter.id, value, date)
    setValue('')
    setDate(today())
    setSaving(false)
  }

  return (
    <div className="border border-line rounded-card bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-semibold text-ink">{parameter.name}</p>
          {latest ? (
            <p className="mt-1">
              <span className="font-mono text-lg text-ledger">{latest.value}</span>
              <span className="text-xs text-ink-soft ml-2">
                към {formatDate(latest.recorded_at)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-ink-soft mt-1">Няма въведени стойности</p>
          )}
        </div>

        {entries.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger whitespace-nowrap"
          >
            {showHistory ? 'Скрий' : `История (${entries.length})`}
          </button>
        )}
      </div>

      {showHistory && (
        <ul className="ledger-divider mt-3 pt-3 space-y-1.5">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex justify-between text-sm font-mono text-ink-soft"
            >
              <span className="text-ink">{entry.value}</span>
              <span>{formatDate(entry.recorded_at)}</span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex gap-2 mt-3">
        <input
          className="input"
          type={parameter.value_type === 'number' ? 'number' : 'text'}
          step={parameter.value_type === 'number' ? 'any' : undefined}
          placeholder="Нова стойност..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <input
          className="input w-40"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <button
          type="submit"
          disabled={saving || value === ''}
          className="px-3 py-2 text-sm font-medium bg-brass text-white rounded-card hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
        >
          Добави
        </button>
      </form>
    </div>
  )
}
