import { useLanguage } from '../lib/i18n.jsx'

export default function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="fixed top-3 right-3 z-40 flex gap-1 bg-card/95 backdrop-blur border border-line rounded-card p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setLang('bg')}
        aria-label="Български"
        aria-pressed={lang === 'bg'}
        className={`w-9 h-9 rounded-card flex items-center justify-center text-lg transition-colors ${
          lang === 'bg' ? 'bg-ledger/10 ring-1 ring-ledger' : 'hover:bg-paper'
        }`}
      >
        🇧🇬
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-label="English"
        aria-pressed={lang === 'en'}
        className={`w-9 h-9 rounded-card flex items-center justify-center text-lg transition-colors ${
          lang === 'en' ? 'bg-ledger/10 ring-1 ring-ledger' : 'hover:bg-paper'
        }`}
      >
        🇬🇧
      </button>
    </div>
  )
}
