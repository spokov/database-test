import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'
import { generateUsernamePreview } from '../lib/username.js'
import { callManageAccount } from '../lib/manageAccount.js'

const empty = {
  first_name: '',
  last_name: '',
  address: '',
  phone: '',
  email: '',
  birth_date: '',
  gender: '',
  notes: '',
}

export default function AddClientModal({ onClose, onCreated }) {
  const { t } = useLanguage()
  const [form, setForm] = useState(empty)
  const [password, setPassword] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdInfo, setCreatedInfo] = useState(null)

  const usernamePreview = generateUsernamePreview(form.first_name, form.last_name)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError(t('nameRequired'))
      return
    }
    setSaving(true)
    setError('')
    try {
      // Creates the login account (client role, username auto-generated
      // from the name) AND a bare client record linked to it, in one step.
      const { client_id, username } = await callManageAccount({
        action: 'create',
        role: 'client',
        first_name: form.first_name,
        last_name: form.last_name,
        password,
      })

      let photo_url = null
      if (photoFile) {
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

      // Fill in the rest of the personal info onto the record the function
      // just created.
      const { data, error: updateError } = await supabase
        .from('clients')
        .update({
          address: form.address,
          phone: form.phone,
          email: form.email,
          birth_date: form.birth_date || null,
          gender: form.gender,
          notes: form.notes,
          photo_url,
        })
        .eq('id', client_id)
        .select()
        .single()

      if (updateError) throw updateError
      setCreatedInfo({ client: data, username })
    } catch (err) {
      setError(err.message || t('genericSaveError'))
    } finally {
      setSaving(false)
    }
  }

  if (createdInfo) {
    return (
      <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
        <div className="bg-card border border-line rounded-card p-6 max-w-md w-full">
          <p className="font-display font-semibold text-ink text-lg mb-1">
            {t('clientCreatedTitle')}
          </p>
          <p className="text-sm text-ink-soft mb-4">{t('clientCreatedSubtitle')}</p>
          <div className="bg-paper border border-line rounded-card p-3 mb-4">
            <p className="text-xs font-mono uppercase tracking-wide text-ink-soft">
              {t('fieldUsername')}
            </p>
            <p className="font-mono text-ink text-lg">{createdInfo.username}</p>
          </div>
          <button
            onClick={() => onCreated(createdInfo.client)}
            className="w-full px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors"
          >
            {t('done')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-card border border-line rounded-card p-6 max-w-lg w-full">
        <p className="font-display font-semibold text-ink text-lg mb-4">
          {t('newClientTitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('fieldFirstName')}>
              <input
                className="input"
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                autoFocus
              />
            </Field>
            <Field label={t('fieldLastName')}>
              <input
                className="input"
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('fieldPhone')}>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </Field>
            <Field label={t('fieldEmail')}>
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
          </div>

          <Field label={t('fieldAddress')}>
            <input
              className="input"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('fieldBirthDate')}>
              <input
                className="input"
                type="date"
                value={form.birth_date}
                onChange={(e) => update('birth_date', e.target.value)}
              />
            </Field>
            <Field label={t('fieldGender')}>
              <select
                className="input"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              >
                <option value="">—</option>
                <option value="Мъж">{t('genderMale')}</option>
                <option value="Жена">{t('genderFemale')}</option>
                <option value="Друго">{t('genderOther')}</option>
              </select>
            </Field>
          </div>

          <Field label={t('fieldPhoto')}>
            <input
              className="text-sm"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </Field>

          <Field label={t('fieldNotes')}>
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </Field>

          <div className="border-t border-line pt-3 mt-1">
            <p className="text-xs font-mono uppercase tracking-wide text-ink-soft mb-2">
              {t('clientLoginSectionTitle')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('fieldUsername')}>
                <input
                  className="input bg-paper text-ink-soft"
                  type="text"
                  value={usernamePreview || '—'}
                  readOnly
                />
              </Field>
              <Field label={t('loginPassword')}>
                <input
                  className="input"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </Field>
            </div>
            <span className="block text-xs text-ink-soft mt-1">{t('usernameAutoHelp')}</span>
          </div>

          {error && <p className="text-sm text-stamp">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors disabled:opacity-50"
            >
              {saving ? t('saving') : t('saveClient')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-mono uppercase tracking-wide text-ink-soft mb-1">
        {label}
      </span>
      {children}
    </label>
  )
}
