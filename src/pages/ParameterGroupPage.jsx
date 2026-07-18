import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import ParameterRow from '../components/ParameterRow.jsx'

const GROUP_META = {
  tanita: { title: 'Танита измервания', subtitle: '10 параметъра от везна Tanita' },
  body: { title: 'Мерки на тялото', subtitle: '5 обиколки с шивашки метър' },
}

export default function ParameterGroupPage() {
  const { id, category } = useParams()
  const meta = GROUP_META[category]

  const [client, setClient] = useState(null)
  const [parameters, setParameters] = useState([])
  const [entriesByParam, setEntriesByParam] = useState({})
  const [loading, setLoading] = useState(true)
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
    setLoading(false)
  }

  async function handleAddValue(parameterId, value, recordedAt) {
    const { data, error } = await supabase
      .from('parameter_entries')
      .insert([{ client_id: id, parameter_id: parameterId, value, recorded_at: recordedAt }])
      .select()
      .single()
    if (error) {
      setError(error.message)
      return
    }
    setEntriesByParam((prev) => {
      const next = [data, ...(prev[parameterId] || [])].sort(
        (a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)
      )
      return { ...prev, [parameterId]: next }
    })
  }

  if (!meta) return <p className="text-stamp text-sm">Непозната група параметри.</p>
  if (loading) return <p className="text-ink-soft font-mono text-sm">Зареждане...</p>

  return (
    <div>
      <Link to={`/client/${id}`} className="text-sm text-ink-soft hover:text-ledger">
        ← Обратно към профила на {client?.full_name}
      </Link>

      <p className="font-display text-xl font-semibold text-ink mt-4">{meta.title}</p>
      <p className="text-sm text-ink-soft mb-6">{meta.subtitle}</p>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {parameters.map((param) => (
          <ParameterRow
            key={param.id}
            parameter={param}
            entries={entriesByParam[param.id] || []}
            onAddValue={handleAddValue}
          />
        ))}
      </div>
    </div>
  )
}
