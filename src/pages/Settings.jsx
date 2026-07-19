import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'

export default function Settings() {
  const { t } = useLanguage()
  const GROUP_LABELS = {
    tanita: t('tanitaTitle'),
    body: t('bodyTitle'),
  }

  const [parameters, setParameters] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [newNames, setNewNames] = useState({})
  const [addingCat, setAddingCat] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('parameters')
      .select('*')
      .order('category')
      .order('sort_order')
    if (error) setError(error.message)
    else setParameters(data)
    setLoading(false)
  }

  function updateLocal(paramId, field, value) {
    setParameters((ps) => ps.map((p) => (p.id === paramId ? { ...p, [field]: value } : p)))
  }

  async function saveOne(param) {
    setSavingId(param.id)
    const { error } = await supabase
      .from('parameters')
      .update({ name: param.name })
      .eq('id', param.id)
    if (error) setError(error.message)
    setSavingId(null)
  }

  async function addParameter(cat) {
    const name = (newNames[cat] || '').trim()
    if (!name) return
    const currentCount = parameters.filter((p) => p.category === cat).length
    setAddingCat(cat)
    const { data, error } = await supabase
      .from('parameters')
      .insert([{ name, value_type: 'number', category: cat, sort_order: currentCount + 1 }])
      .select()
      .single()
    setAddingCat(null)
    if (error) {
      setError(error.message)
      return
    }
    setParameters((ps) => [...ps, data])
    setNewNames((n) => ({ ...n, [cat]: '' }))
  }

  async function deleteParameter(paramId) {
    const { error } = await supabase.from('parameters').delete().eq('id', paramId)
    if (error) {
      setError(error.message)
      return
    }
    setParameters((ps) => ps.filter((p) => p.id !== paramId))
    setConfirmDeleteId(null)
  }

  const groups = ['tanita', 'body'].map((cat) => ({
    cat,
    items: parameters.filter((p) => p.category === cat),
  }))

  return (
    <div>
      <p className="font-display text-xl font-semibold text-ink mt-2 mb-1">
        {t('settingsTitle')}
      </p>
      <p className="text-sm text-ink-soft mb-6">{t('settingsDescription')}</p>

      {error && <p className="text-sm text-stamp mb-4">{error}</p>}

      {loading ? (
        <p className="text-ink-soft font-mono text-sm">{t('loading')}</p>
      ) : (
        <div className="space-y-8">
          {groups.map(({ cat, items }) => (
            <div key={cat}>
              <p className="font-display font-semibold text-ink mb-3">
                {GROUP_LABELS[cat]} ({items.length})
              </p>
              <div className="space-y-3">
                {items.map((param) => (
                  <div
                    key={param.id}
                    className="bg-card border border-line rounded-card p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-ink-soft w-5 flex-shrink-0">
                        {param.sort_order}
                      </span>
                      <input
                        className="input text-base"
                        value={param.name}
                        onChange={(e) => updateLocal(param.id, 'name', e.target.value)}
                        placeholder={t('namePlaceholder')}
                      />
                      <button
                        onClick={() => saveOne(param)}
                        disabled={savingId === param.id}
                        className="px-3 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark disabled:opacity-50 whitespace-nowrap"
                      >
                        {savingId === param.id ? t('saving') : t('save')}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(param.id)}
                        aria-label={t('deleteParamAria')}
                        className="w-9 h-9 flex-shrink-0 flex items-center justify-center text-ink-soft hover:text-stamp hover:bg-stamp/10 rounded-card transition-colors"
                      >
                        ×
                      </button>
                    </div>

                    {confirmDeleteId === param.id && (
                      <div className="mt-2 ml-7 flex items-center gap-3 border border-stamp/30 bg-stamp/5 rounded-card p-2">
                        <span className="text-sm text-ink">
                          {t('deleteParamConfirm', { name: param.name })}
                        </span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-sm text-ink-soft hover:text-ink ml-auto"
                        >
                          {t('cancel')}
                        </button>
                        <button
                          onClick={() => deleteParameter(param.id)}
                          className="text-sm font-medium text-white bg-stamp px-3 py-1 rounded-card hover:bg-stamp/90"
                        >
                          {t('delete')}
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    className="input"
                    placeholder={t('newParamPlaceholder')}
                    value={newNames[cat] || ''}
                    onChange={(e) => setNewNames((n) => ({ ...n, [cat]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addParameter(cat)}
                  />
                  <button
                    onClick={() => addParameter(cat)}
                    disabled={addingCat === cat || !(newNames[cat] || '').trim()}
                    className="px-3 py-2 text-sm font-medium bg-brass text-white rounded-card hover:opacity-90 disabled:opacity-40 whitespace-nowrap"
                  >
                    {t('addParameter')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
