import { useRef, useState } from 'react'
import { useLanguage } from '../lib/i18n.jsx'
import { toCSV, parseCSV } from '../lib/csv.js'
import { calcAge } from '../lib/format.js'

export default function HistoryModal({
  open,
  onClose,
  parameters,
  entriesByParam,
  onUpdateEntry,
  onDeleteEntry,
  onImportRows,
  exportFileName,
  clientName,
  clientBirthDate,
  clientHeight,
  readOnly = false,
}) {
  const { t, formatDate } = useLanguage()
  const [importMessage, setImportMessage] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef(null)

  if (!open) return null

  const allDates = Array.from(
    new Set(parameters.flatMap((p) => (entriesByParam[p.id] || []).map((e) => e.recorded_at)))
  ).sort()

  function handleExport() {
    const header = [t('colParameter'), ...allDates]
    const rows = parameters.map((param) => {
      const entries = entriesByParam[param.id] || []
      const byDate = {}
      for (const e of entries) if (!byDate[e.recorded_at]) byDate[e.recorded_at] = e
      return [param.name, ...allDates.map((d) => byDate[d]?.value ?? '')]
    })
    const csv = toCSV([header, ...rows])
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportFileName || 'history'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    setImportMessage(null)
    fileInputRef.current?.click()
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const rows = parseCSV(String(reader.result))
        if (rows.length < 2) {
          setImportMessage({ type: 'error', text: t('importParseError') })
          return
        }
        const [header, ...dataRows] = rows
        const dateColumns = header.slice(1)
        const nameToParam = new Map(parameters.map((p) => [p.name.trim().toLowerCase(), p]))

        const entries = []
        const unmatched = new Set()
        for (const r of dataRows) {
          const [rawName, ...values] = r
          const param = nameToParam.get((rawName || '').trim().toLowerCase())
          if (!param) {
            if ((rawName || '').trim()) unmatched.add(rawName.trim())
            continue
          }
          values.forEach((val, idx) => {
            const v = (val ?? '').trim()
            const recorded_at = dateColumns[idx]
            if (v === '' || !recorded_at) return
            entries.push({ parameter_id: param.id, recorded_at, value: v })
          })
        }

        if (entries.length === 0) {
          setImportMessage({ type: 'error', text: t('importNothingFound') })
          return
        }

        setImporting(true)
        const result = await onImportRows(entries)
        setImporting(false)

        if (result?.error) {
          setImportMessage({ type: 'error', text: result.error })
        } else {
          setImportMessage({
            type: 'success',
            text: t('importSuccess', { count: result.imported }),
            unmatched: unmatched.size > 0 ? Array.from(unmatched).join(', ') : null,
          })
        }
      } catch (err) {
        setImporting(false)
        setImportMessage({ type: 'error', text: t('importParseError') })
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-end sm:items-center justify-center z-50 sm:p-4 print-flow">
      <div className="bg-card w-full sm:max-w-4xl sm:rounded-card border-t sm:border border-line max-h-[90vh] sm:max-h-[85vh] flex flex-col print-flow">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line flex-shrink-0 gap-2 no-print">
          <p className="font-display font-semibold text-ink truncate">{t('historyTitle')}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger px-2 py-1.5 rounded-card hover:bg-paper transition-colors whitespace-nowrap"
            >
              {t('printButton')}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger px-2 py-1.5 rounded-card hover:bg-paper transition-colors whitespace-nowrap"
            >
              {t('exportButton')}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleImportClick}
                disabled={importing}
                className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger px-2 py-1.5 rounded-card hover:bg-paper transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {importing ? t('saving') : t('importButton')}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileSelected}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label={t('closeAria')}
              className="w-9 h-9 flex items-center justify-center text-ink-soft hover:text-ink rounded-card hover:bg-paper transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {importMessage && (
          <div
            className={`no-print px-4 sm:px-6 py-2 text-sm border-b border-line flex-shrink-0 ${
              importMessage.type === 'error' ? 'text-stamp' : 'text-ledger'
            }`}
          >
            <p>{importMessage.text}</p>
            {importMessage.unmatched && (
              <p className="text-xs text-ink-soft mt-1">
                {t('importUnmatched')}: {importMessage.unmatched}
              </p>
            )}
          </div>
        )}

        <div className="printable-area overflow-auto p-4 sm:p-6">
          {(clientName || clientHeight) && (
            <div className="mb-4">
              <p className="font-display font-semibold text-ink text-lg">{clientName}</p>
              {clientHeight && (
                <p className="font-mono text-xs text-ink-soft">
                  {clientHeight} {t('cmSuffix')}
                </p>
              )}
            </div>
          )}

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
                  {clientBirthDate && (
                    <tr className="text-left border-b border-line bg-paper/60">
                      <th className="py-1.5 pl-4 pr-4 font-mono text-xs text-ink-soft sticky left-0 bg-paper whitespace-nowrap font-normal">
                        {t('ageAtDate')}
                      </th>
                      {allDates.map((date) => (
                        <th
                          key={date}
                          className="py-1.5 px-3 font-mono text-xs text-ink-soft whitespace-nowrap font-normal"
                        >
                          {calcAge(clientBirthDate, date)}
                          {t('ageSuffix')}
                        </th>
                      ))}
                    </tr>
                  )}
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
                                  readOnly={readOnly}
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

function HistoryCell({ entry, onUpdate, onDelete, readOnly }) {
  const { t } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(entry.value)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (readOnly) {
    return <span className="font-mono text-ink">{entry.value}</span>
  }

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
        className="no-print text-ink-soft/70 hover:text-ledger"
      >
        ✎
      </button>
      <button
        type="button"
        aria-label={t('deleteAria')}
        onClick={() => setConfirmDelete(true)}
        className="no-print text-ink-soft/70 hover:text-stamp"
      >
        ×
      </button>
    </span>
  )
}
