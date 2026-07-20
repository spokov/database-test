import { Link } from 'react-router-dom'
import { useLanguage } from '../lib/i18n.jsx'
import { calcAge } from '../lib/format.js'

function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export default function ClientCard({ client, onDelete, isTrainer }) {
  const { t, genderLabel } = useLanguage()
  const age = calcAge(client.birth_date)

  return (
    <Link
      to={`/client/${client.id}`}
      className="card-tab relative block bg-card border border-line rounded-card p-4 hover:border-ledger hover:shadow-sm transition-all"
    >
      {onDelete && (
        <button
          type="button"
          aria-label={t('deleteClientAria')}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(client)
          }}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-ink-soft hover:text-stamp hover:bg-stamp/10 rounded-full transition-colors"
        >
          ×
        </button>
      )}
      <div className="flex items-start gap-3">
        {client.photo_url ? (
          <img
            src={client.photo_url}
            alt={client.full_name}
            className="w-14 h-14 rounded-card object-cover border border-line flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-card bg-ledger/10 border border-line flex items-center justify-center flex-shrink-0">
            <span className="font-display text-ledger font-semibold">
              {initials(client.full_name) || '—'}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="font-display font-semibold text-ink truncate flex items-center gap-2">
            <span className="truncate">{client.full_name}</span>
            {isTrainer && (
              <span className="flex-shrink-0 font-mono text-[10px] uppercase tracking-wide text-ledger bg-ledger/10 border border-ledger/30 rounded px-1.5 py-0.5">
                {t('roleTrainer')}
              </span>
            )}
          </p>
          <p className="font-mono text-xs text-ink-soft mt-1">
            {[age ? `${age}${t('ageSuffix')}` : null, genderLabel(client.gender)]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
          <p className="text-sm text-ink-soft truncate mt-1">
            {client.phone || client.email || t('noContacts')}
          </p>
        </div>
      </div>
    </Link>
  )
}
