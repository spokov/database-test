import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

export default function ClientProfile() {
  const { t, genderLabel } = useLanguage()
  const { id } = useParams()
  const navigate = useNavigate()

  const FIELD_LABELS = {
    full_name: t('fieldFullName').replace(' *', ''),
    address: t('fieldAddress'),
    phone: t('fieldPhone'),
    email: t('fieldEmail'),
    birth_date: t('fieldBirthDate'),
    gender: t('fieldGender'),
    notes: t('fieldNotes'),
  }

  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (clientError) {
      setError(clientError.message)
      setLoading(false)
      return
    }

    setClient(clientData)
    setForm(clientData)
    setLoading(false)
  }

  async function saveEdits() {
    setSaving(true)
    setError('')
    try {
      let photo_url = form.photo_url

      if (removePhoto) {
        photo_url = null
      } else if (photoFile) {
        const ext = photoFile.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('client-photos')
          .upload(path, photoFile)
        if (uploadError) throw uploadError
        const { data: publicUrl } = supabase.storage
          .from('client-photos')
          .getPublicUrl(path)
        photo_url = publicUrl.publicUrl
      }

      const { data, error } = await supabase
        .from('clients')
        .update({
          full_name: form.full_name,
          address: form.address,
          phone: form.phone,
          email: form.email,
          birth_date: form.birth_date || null,
          gender: form.gender,
          notes: form.notes,
          photo_url,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setClient(data)
      setForm(data)
      setPhotoFile(null)
      setRemovePhoto(false)
      setEditing(false)
    } catch (err) {
      setError(err.message || t('genericSaveError'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  if (loading) return <p className="text-ink-soft font-mono text-sm">{t('loading')}</p>
  if (error && !client) return <p className="text-stamp text-sm">{error}</p>

  return (
    <div>
      <div className="card-tab bg-card border border-line rounded-card p-6 mt-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <div className="flex-shrink-0">
            {photoFile ? (
              <img
                src={URL.createObjectURL(photoFile)}
                alt={form.full_name}
                className="w-24 h-24 rounded-card object-cover border border-line"
              />
            ) : !removePhoto && client.photo_url ? (
              <img
                src={client.photo_url}
                alt={client.full_name}
                className="w-24 h-24 rounded-card object-cover border border-line"
              />
            ) : (
              <div className="w-24 h-24 rounded-card bg-ledger/10 border border-line" />
            )}
            {editing && (
              <div className="mt-2 text-center space-y-1">
                <label className="block">
                  <span className="text-xs font-mono text-ledger hover:underline cursor-pointer">
                    {t('changePhoto')}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      setPhotoFile(e.target.files?.[0] || null)
                      setRemovePhoto(false)
                    }}
                  />
                </label>
                {(photoFile || (client.photo_url && !removePhoto)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null)
                      setRemovePhoto(true)
                    }}
                    className="text-xs font-mono text-stamp hover:underline"
                  >
                    {t('removePhoto')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 w-full">
            {editing ? (
              <div className="space-y-2">
                {Object.entries(FIELD_LABELS).map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
                      {label}
                    </span>
                    {field === 'gender' ? (
                      <select
                        className="input"
                        value={form.gender || ''}
                        onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      >
                        <option value="">—</option>
                        <option value="Мъж">{t('genderMale')}</option>
                        <option value="Жена">{t('genderFemale')}</option>
                        <option value="Друго">{t('genderOther')}</option>
                      </select>
                    ) : field === 'notes' ? (
                      <textarea
                        className="input"
                        rows={2}
                        value={form.notes || ''}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      />
                    ) : (
                      <input
                        className="input"
                        type={field === 'birth_date' ? 'date' : 'text'}
                        value={form[field] || ''}
                        onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                      />
                    )}
                  </label>
                ))}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={saveEdits}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark disabled:opacity-50"
                  >
                    {saving ? t('saving') : t('save')}
                  </button>
                  <button
                    onClick={() => {
                      setForm(client)
                      setPhotoFile(null)
                      setRemovePhoto(false)
                      setEditing(false)
                    }}
                    className="px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold text-ink text-center sm:text-left">
                  {client.full_name}
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
                  <Info label={t('fieldPhone')} value={client.phone} />
                  <Info label={t('fieldEmail')} value={client.email} />
                  <Info label={t('fieldAddress')} value={client.address} />
                  <Info label={t('fieldBirthDate')} value={client.birth_date} />
                  <Info label={t('fieldGender')} value={genderLabel(client.gender)} />
                  <Info label={t('fieldNotes')} value={client.notes} />
                </dl>
                <div className="flex justify-center sm:justify-start gap-4 mt-4">
                  <button
                    onClick={() => setEditing(true)}
                    className="font-mono text-xs uppercase tracking-wide text-ledger hover:underline"
                  >
                    {t('editClient')}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="font-mono text-xs uppercase tracking-wide text-stamp hover:underline"
                  >
                    {t('deleteClient')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-stamp mt-4">{error}</p>}

      <p className="font-display text-lg font-semibold text-ink mt-8 mb-3">
        {t('parametersHeading')}
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <GroupCard
          to={`/client/${id}/tanita`}
          title={t('tanitaTitle')}
          subtitle={t('tanitaSubtitleShort')}
          openLabel={t('openArrow')}
        />
        <GroupCard
          to={`/client/${id}/body`}
          title={t('bodyTitle')}
          subtitle={t('bodySubtitleShort')}
          openLabel={t('openArrow')}
        />
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={t('deleteClientTitle', { name: client.full_name })}
        message={t('deleteClientMessage')}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
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

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-mono uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd className="text-ink">{value || '—'}</dd>
    </div>
  )
}
