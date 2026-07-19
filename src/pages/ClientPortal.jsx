import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../lib/auth.jsx'
import { useLanguage } from '../lib/i18n.jsx'

export default function ClientPortal() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('clients')
      .select('*')
      .eq('user_id', profile.id)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setClient(data)
        setLoading(false)
      })
  }, [profile.id])

  if (loading) return <p className="text-ink-soft font-mono text-sm">{t('loading')}</p>
  if (error || !client)
    return <p className="text-stamp text-sm">{error || t('noLinkedClient')}</p>

  return (
    <div>
      <p className="font-display text-2xl font-semibold text-ink text-center sm:text-left">
        {client.full_name}
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <GroupCard
          to={`/client/${client.id}/tanita`}
          title={t('tanitaTitle')}
          subtitle={t('viewOnly')}
          openLabel={t('openArrow')}
        />
        <GroupCard
          to={`/client/${client.id}/body`}
          title={t('bodyTitle')}
          subtitle={t('bodySubtitleShort')}
          openLabel={t('openArrow')}
        />
      </div>
    </div>
  )
}

function GroupCard({ to, title, subtitle, openLabel }) {
  return (
    <Link
      to={to}
      className="card-tab block bg-card border border-line rounded-card p-5 hover:border-ledger hover:shadow-sm transition-all"
    >
      <p className="font-display font-semibold text-ink text-lg">{title}</p>
      <p className="text-sm text-ink-soft mt-1">{subtitle}</p>
      <p className="font-mono text-xs text-ledger mt-3">{openLabel}</p>
    </Link>
  )
}
