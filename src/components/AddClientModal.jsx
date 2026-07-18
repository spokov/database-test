import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

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
  const [form, setForm] = useState(empty)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      setError('Името е задължително.')
      return
    }
    setSaving(true)
    setError('')
    try {
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

      const { data, error: insertError } = await supabase
        .from('clients')
        .insert([{ ...form, birth_date: form.birth_date || null, photo_url }])
        .select()
        .single()

      if (insertError) throw insertError
      onCreated(data)
    } catch (err) {
      setError(err.message || 'Възникна грешка при запис.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
      <div className="bg-card border border-line rounded-card p-6 max-w-lg w-full">
        <p className="font-display font-semibold text-ink text-lg mb-4">
          Нов клиент
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Име и фамилия *">
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Телефон">
              <input
                className="input"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
              />
            </Field>
            <Field label="Имейл">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Адрес">
            <input
              className="input"
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата на раждане">
              <input
                className="input"
                type="date"
                value={form.birth_date}
                onChange={(e) => update('birth_date', e.target.value)}
              />
            </Field>
            <Field label="Пол">
              <select
                className="input"
                value={form.gender}
                onChange={(e) => update('gender', e.target.value)}
              >
                <option value="">—</option>
                <option value="Мъж">Мъж</option>
                <option value="Жена">Жена</option>
                <option value="Друго">Друго</option>
              </select>
            </Field>
          </div>

          <Field label="Снимка">
            <input
              className="text-sm"
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </Field>

          <Field label="Бележки">
            <textarea
              className="input"
              rows={2}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </Field>

          {error && <p className="text-sm text-stamp">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
            >
              Отказ
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-ledger text-white rounded-card hover:bg-ledger-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Запис...' : 'Запази клиент'}
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
