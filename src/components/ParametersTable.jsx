import { useState } from 'react'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function ParametersTable({
  parameters,
  entriesByParam,
  newValues,
  onValueChange,
  onUpdateEntry,
  onDeleteEntry,
}) {
  const [showHistory, setShowHistory] = useState(false)

  // All distinct dates that have at least one entry, across any parameter,
  // oldest first (left to right) so progress reads naturally over time.
  const allDates = Array.from(
    new Set(
      parameters.flatMap((p) => (entriesByParam[p.id] || []).map((e) => e.recorded_at))
    )
  ).sort()

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger whitespace-nowrap"
        >
          {showHistory ? 'Скрий история' : 'Покажи история'}
        </button>
      </div>

      <div className="overflow-x-auto border border-line rounded-card bg-card">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-line">
              <th className="py-2 pl-4 pr-2 font-mono text-xs uppercase tracking-wide text-ink-soft w-8">
                №
              </th>
              <th className="py-2 pr-4 font-mono text-xs uppercase tracking-wide text-ink-soft">
                Параметър
              </th>
              <th className="py-2 pr-4 font-mono text-xs uppercase tracking-wide text-ink-soft">
                Последна стойност
              </th>
              <th className="py-2 pr-4 font-mono text-xs uppercase tracking-wide text-ink-soft">
                Нова стойност
              </th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param) => {
              const entries = entriesByParam[param.id] || []
              const latest = entries[0]
              return (
                <tr key={param.id} className="border-b border-line/60 last:border-0">
                  <td className="py-2.5 pl-4 pr-2 font-mono text-xs text-ink-soft">
                    {param.sort_order}
                  </td>
                  <td className="py-2.5 pr-4 font-display font-medium text-ink">
                    {param.name}
                  </td>
                  <td className="py-2.5 pr-4">
                    {latest ? (
                      <>
                        <span className="font-mono text-ledger">{latest.value}</span>
                        <span className="text-xs text-ink-soft ml-2 whitespace-nowrap">
                          {formatDate(latest.recorded_at)}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink-soft text-xs">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    <input
                      className="input"
                      type="number"
                      step="any"
                      placeholder="Нова стойност..."
                      value={newValues[param.id] ?? ''}
                      onChange={(e) => onValueChange(param.id, e.target.value)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showHistory && (
        <div className="mt-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mb-2">
            История по дати
          </p>
          {allDates.length === 0 ? (
            <p className="text-sm text-ink-soft">Няма въведени стойности все още.</p>
          ) : (
            <div className="overflow-x-auto border border-line rounded-card bg-card">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="py-2 pl-4 pr-4 font-mono text-xs uppercase tracking-wide text-ink-soft sticky left-0 bg-card whitespace-nowrap">
                      Параметър
                    </th>
                    {allDates.map((date) => (
                      <th
                        key={date}
                        className="py-2 px-3 font-mono text-xs uppercase tracking-wide text-ink-soft whitespace-nowrap"
                      >
                        {formatDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parameters.map((param) => {
                    const entries = entriesByParam[param.id] || []
                    const byDate = {}
                    for (const e of entries) {
                      if (!byDate[e.recorded_at]) byDate[e.recorded_at] = e
                    }
                    return (
                      <tr key={param.id} className="border-b border-line/60 last:border-0">
                        <td className="py-2 pl-4 pr-4 font-display font-medium text-ink sticky left-0 bg-card whitespace-nowrap">
                          {param.name}
                        </td>
                        {allDates.map((date) => {
                          const entry = byDate[date]
                          return (
                            <td key={date} className="py-2 px-3 text-center">
                              {entry ? (
                                <HistoryCell
                                  entry={entry}
                                  onUpdate={(value) => onUpdateEntry(param.id, entry.id, value)}
                                  onDelete={() => onDeleteEntry(param.id, entry.id)}
                                />
                              ) : (
                                <span className="text-ink-soft/40" title="Няма стойност за тази дата">
                                  ★
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryCell({ entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(entry.value)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function save() {
    if (value === '') return
    await onUpdate(value)
    setEditing(false)
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          className="input w-16 text-center"
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          onClick={save}
          className="text-ledger hover:text-ledger-dark"
          aria-label="Запази"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(entry.value)
            setEditing(false)
          }}
          className="text-ink-soft hover:text-ink"
          aria-label="Отказ"
        >
          ×
        </button>
      </span>
    )
  }

  if (confirmDelete) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-stamp hover:underline"
        >
          Изтрий?
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          className="text-xs text-ink-soft hover:underline"
        >
          Не
        </button>
      </span>
    )
  }

  return (
    <span className="group inline-flex items-center gap-1">
      <span className="font-mono text-ink">{entry.value}</span>
      <button
        type="button"
        aria-label="Редактирай"
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-ledger transition-opacity"
      >
        ✎
      </button>
      <button
        type="button"
        aria-label="Изтрий"
        onClick={() => setConfirmDelete(true)}
        className="opacity-0 group-hover:opacity-100 text-ink-soft hover:text-stamp transition-opacity"
      >
        ×
      </button>
    </span>
  )
}
