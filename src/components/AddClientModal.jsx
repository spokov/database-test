import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useLanguage } from '../lib/i18n.jsx'
import { isValidUsername } from '../lib/username.js'
import { callManageAccount } from '../lib/manageAccount.js'

const empty = {
  full_name: '',
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
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      setError(t('nameRequired'))
      return
    }
    if (!isValidUsername(username)) {
      setError(t('usernameInvalid'))
      return
    }
    setSaving(true)
    setError('')
    try {
      // Creates the login account (client role) AND a bare client record
      // linked to it, in one step - this is what the client will use to
      // log in and see their own measurements.
      const { client_id } = await callManageAccount({
        action: 'create',
        role: 'client',
        full_name: form.full_name,
        client_full_name: form.full_name,
        username,
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
      onCreated(data)
    } catch (err) {
      setError(err.message || t('genericSaveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-card border border-line rounded-card p-6 max-w-lg w-full">
        <p className="font-display font-semibold text-ink text-lg mb-4">
          {t('newClientTitle')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label={t('fieldFullName')}>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              autoFocus
            />
          </Field>

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
                  className="input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ivan.petrov"
                  required
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
            <span className="block text-xs text-ink-soft mt-1">{t('usernameHelp')}</span>
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
