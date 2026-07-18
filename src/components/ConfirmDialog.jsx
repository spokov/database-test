export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-line rounded-card p-6 max-w-sm w-full">
        <p className="font-display font-semibold text-ink text-lg">{title}</p>
        <p className="text-sm text-ink-soft mt-2">{message}</p>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink transition-colors"
          >
            Отказ
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-stamp text-white rounded-card hover:bg-stamp/90 transition-colors"
          >
            Изтрий
          </button>
        </div>
      </div>
    </div>
  )
}
