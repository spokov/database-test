import { useState } from 'react'
import { useLanguage } from '../lib/i18n.jsx'

export default function HistoryModal({ open, onClose, parameters, entriesByParam, onUpdateEntry, onDeleteEntry }) {
  const { t, formatDate } = useLanguage()
  if (!open) return null

  const allDates = Array.from(
    new Set(
      parameters.flatMap((p) => (entriesByParam[p.id] || []).map((e) => e.recorded_at))
    )
  ).sort()

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-card w-full sm:max-w-4xl sm:rounded-card border-t sm:border border-line max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line flex-shrink-0">
          <p className="font-display font-semibold text-ink">{t('historyTitle')}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('closeAria')}
            className="w-9 h-9 flex items-center justify-center text-ink-soft hover:text-ink rounded-card hover:bg-paper transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-auto p-4 sm:p-6">
          {allDates.length === 0 ? (
            <p className="text-sm text-ink-soft">{t('noValuesYet')}</p>
          ) : (
            <div className="overflow-x-auto border border-line rounded-card">
              <table className="text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b border-line">
                    <th className="py-2 pl-4 pr-4 font-mono text-xs uppercase tracking-wide text-ink-soft sticky left-0 bg-card whitespace-nowrap">
                      {t('colParameter')}
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
                                <span className="text-ink-soft/40" title={t('noValueForDate')}>
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
      </div>
    </div>
  )
}

function HistoryCell({ entry, onUpdate, onDelete }) {
  const { t } = useLanguage()
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
        <button type="button" onClick={save} className="text-ledger hover:text-ledger-dark" aria-label={t('saveAria')}>
          ✓
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(entry.value)
            setEditing(false)
          }}
          className="text-ink-soft hover:text-ink"
          aria-label={t('cancelAria')}
        >
          ×
        </button>
      </span>
    )
  }

  if (confirmDelete) {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        <button type="button" onClick={onDelete} className="text-xs text-stamp hover:underline">
          {t('deleteQuestion')}
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(false)}
          className="text-xs text-ink-soft hover:underline"
        >
          {t('no')}
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono text-ink">{entry.value}</span>
      <button
        type="button"
        aria-label={t('editAria')}
        onClick={() => setEditing(true)}
        className="text-ink-soft/70 hover:text-ledger"
      >
        ✎
      </button>
      <button
        type="button"
        aria-label={t('deleteAria')}
        onClick={() => setConfirmDelete(true)}
        className="text-ink-soft/70 hover:text-stamp"
      >
        ×
      </button>
    </span>
  )
}
