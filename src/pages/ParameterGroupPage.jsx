import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'
import ParametersTable from '../components/ParametersTable.jsx'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function ParameterGroupPage() {
  const { t } = useLanguage()
  const { id, category } = useParams()

  const GROUP_META = {
    tanita: { title: t('tanitaTitle'), subtitle: t('tanitaSubtitleLong') },
    body: { title: t('bodyTitle'), subtitle: t('bodySubtitleLong') },
  }
  const meta = GROUP_META[category]

  const [client, setClient] = useState(null)
  const [parameters, setParameters] = useState([])
  const [entriesByParam, setEntriesByParam] = useState({})
  const [newValues, setNewValues] = useState({})
  const [date, setDate] = useState(today())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [id, category])

  async function load() {
    setLoading(true)
    const [{ data: clientData, error: clientError }, { data: paramData, error: paramError }] =
      await Promise.all([
        supabase.from('clients').select('full_name').eq('id', id).single(),
        supabase
          .from('parameters')
          .select('*')
          .eq('category', category)
          .order('sort_order'),
      ])

    if (clientError || paramError) {
      setError((clientError || paramError).message)
      setLoading(false)
      return
    }

    const paramIds = (paramData || []).map((p) => p.id)
    const { data: entryData } = await supabase
      .from('parameter_entries')
      .select('*')
      .eq('client_id', id)
      .in('parameter_id', paramIds)
      .order('recorded_at', { ascending: false })

    const grouped = {}
    for (const p of paramData) grouped[p.id] = []
    for (const e of entryData || []) {
      grouped[e.parameter_id] = grouped[e.parameter_id] || []
      grouped[e.parameter_id].push(e)
    }

    setClient(clientData)
    setParameters(paramData || [])
    setEntriesByParam(grouped)
    setNewValues({})
    setLoading(false)
  }

  function sortEntries(list) {
    return [...list].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))
  }

  async function handleAddAll(e) {
    e.preventDefault()
    const rows = parameters
      .filter((p) => (newValues[p.id] ?? '') !== '')
      .map((p) => ({
        client_id: id,
        parameter_id: p.id,
        value: newValues[p.id],
        recorded_at: date,
      }))

    if (rows.length === 0) return

    setSaving(true)
    const { data, error } = await supabase.from('parameter_entries').insert(rows).select()
    setSaving(false)

    if (error) {
      setError(error.message)
      return
    }

    setEntriesByParam((prev) => {
      const next = { ...prev }
      for (const entry of data) {
        next[entry.parameter_id] = sortEntries([...(next[entry.parameter_id] || []), entry])
      }
      return next
    })
    setNewValues({})
    setDate(today())
  }

  async function handleUpdateEntry(parameterId, entryId, value) {
    const { data, error } = await supabase
      .from('parameter_entries')
      .update({ value })
      .eq('id', entryId)
      .select()
      .single()
    if (error) {
      setError(error.message)
      return
    }
    setEntriesByParam((prev) => ({
      ...prev,
      [parameterId]: prev[parameterId].map((e) => (e.id === entryId ? data : e)),
    }))
  }

  async function handleDeleteEntry(parameterId, entryId) {
    const { error } = await supabase.from('parameter_entries').delete().eq('id', entryId)
    if (error) {
      setError(error.message)
      return
    }
    setEntriesByParam((prev) => ({
      ...prev,
      [parameterId]: prev[parameterId].filter((e) => e.id !== entryId),
    }))
  }

  if (!meta) return <p className="text-stamp text-sm">{t('unknownGroup')}</p>
  if (loading) return <p className="text-ink-soft font-mono text-sm">{t('loading')}</p>

  const hasAnyNewValue = parameters.some((p) => (newValues[p.id] ?? '') !== '')

  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wide text-ink-soft mt-2">
        {client?.full_name}
      </p>
      <p className="font-display text-xl font-semibold text-ink mt-1">{meta.title}</p>
      <p className="text-sm text-ink-soft mb-6">{meta.subtitle}</p>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      <form onSubmit={handleAddAll}>
        <ParametersTable
          parameters={parameters}
          entriesByParam={entriesByParam}
          newValues={newValues}
          onValueChange={(paramId, v) => setNewValues((prev) => ({ ...prev, [paramId]: v }))}
          onUpdateEntry={(paramId, entryId, value) => handleUpdateEntry(paramId, entryId, value)}
          onDeleteEntry={(paramId, entryId) => handleDeleteEntry(paramId, entryId)}
        />

        <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-3 bg-card border border-line rounded-card p-3 shadow-sm">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-soft whitespace-nowrap">
            {t('measurementDate')}
          </span>
          <input
            className="input w-40"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving || !hasAnyNewValue}
            className="ml-auto px-5 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {saving ? t('saving') : t('addAll')}
          </button>
        </div>
      </form>
    </div>
  )
}
