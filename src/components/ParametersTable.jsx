import { useState } from 'react'
import HistoryModal from './HistoryModal.jsx'
import { useLanguage } from '../lib/i18n.jsx'

export default function ParametersTable({
  parameters,
  entriesByParam,
  newValues,
  onValueChange,
  onUpdateEntry,
  onDeleteEntry,
  onImportRows,
  exportFileName,
  clientName,
  clientBirthDate,
  clientHeight,
  clientGender,
  dateInHeader = false,
  readOnly = false,
}) {
  const { t, formatDate } = useLanguage()
  const [historyOpen, setHistoryOpen] = useState(false)

  const latestOverallDate = dateInHeader
    ? parameters.reduce((acc, p) => {
        const latest = (entriesByParam[p.id] || [])[0]
        if (!latest) return acc
        if (!acc || latest.recorded_at > acc) return latest.recorded_at
        return acc
      }, null)
    : null

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger whitespace-nowrap"
        >
          {t('historyButton')}
        </button>
      </div>

      <div className="overflow-x-auto border border-line rounded-card bg-card">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b border-line">
              <th className="py-2 pl-4 pr-2 font-mono text-xs uppercase tracking-wide text-ink-soft w-8">
                {t('colNum')}
              </th>
              <th className="py-2 pr-4 font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('colParameter')}
              </th>
              <th className="py-2 pr-4 font-mono text-xs uppercase tracking-wide text-ink-soft">
                {t('colLatest')}
                {dateInHeader && latestOverallDate && (
                  <span className="ml-2 normal-case font-normal text-ink-soft/70">
                    ({formatDate(latestOverallDate)})
                  </span>
                )}
              </th>
              {!readOnly && (
                <th className="py-2 pr-4 font-mono text-xs uppercase tracking-wide text-ink-soft">
                  {t('colNewValue')}
                </th>
              )}
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
                      dateInHeader ? (
                        <span className="font-mono text-ledger">{latest.value}</span>
                      ) : (
                        <>
                          <span className="font-mono text-ledger">{latest.value}</span>
                          <span className="text-xs text-ink-soft ml-2 whitespace-nowrap">
                            {formatDate(latest.recorded_at)}
                          </span>
                        </>
                      )
                    ) : (
                      <span className="text-ink-soft text-xs">—</span>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="py-2 pr-4">
                      <input
                        className="input"
                        type="number"
                        step="any"
                        placeholder={t('newValuePlaceholder')}
                        value={newValues[param.id] ?? ''}
                        onChange={(e) => onValueChange(param.id, e.target.value)}
                      />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        parameters={parameters}
        entriesByParam={entriesByParam}
        onUpdateEntry={onUpdateEntry}
        onDeleteEntry={onDeleteEntry}
        onImportRows={onImportRows}
        exportFileName={exportFileName}
        clientName={clientName}
        clientBirthDate={clientBirthDate}
        clientHeight={clientHeight}
        clientGender={clientGender}
        readOnly={readOnly}
      />
    </div>
  )
}
