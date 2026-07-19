import { useEffect, useState } from 'react'
import { Link, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ClientProfile from './pages/ClientProfile.jsx'
import ParameterGroupPage from './pages/ParameterGroupPage.jsx'
import Settings from './pages/Settings.jsx'
import LanguageSwitcher from './components/LanguageSwitcher.jsx'
import { useLanguage } from './lib/i18n.jsx'

// Works out a contextual "back" destination from the current URL, so the
// menu can offer it without every page having to declare it separately.
function useBackTarget(t) {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments[0] === 'settings') {
    return { to: '/', label: t('backToHome') }
  }
  if (segments[0] === 'client' && segments.length === 2) {
    return { to: '/', label: t('backToHome') }
  }
  if (segments[0] === 'client' && segments.length === 3) {
    return { to: `/client/${segments[1]}`, label: t('backToProfile') }
  }
  return null
}

function TopMenu() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const back = useBackTarget(t)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  return (
    <div className="fixed top-3 left-3 z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t('menuLabel')}
        aria-expanded={open}
        className="w-11 h-11 rounded-card bg-card/95 backdrop-blur border border-line shadow-sm flex items-center justify-center text-ink hover:border-ledger transition-colors"
      >
        <span className="text-xl leading-none">☰</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 w-60 bg-card border border-line rounded-card shadow-md overflow-hidden">
            {back && (
              <Link
                to={back.to}
                className="block px-4 py-3 text-sm text-ink hover:bg-paper border-b border-line/60"
              >
                {back.label}
              </Link>
            )}
            <Link to="/" className="block px-4 py-3 text-sm text-ink hover:bg-paper">
              {t('navHome')}
            </Link>
            <Link
              to="/settings"
              className="block px-4 py-3 text-sm text-ink hover:bg-paper"
            >
              {t('navSettings')}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <TopMenu />
      <LanguageSwitcher />

      <Link to="/" className="block w-full max-w-[1200px] mx-auto">
        <img
          src="/banner.png"
          alt="Believe in yourself"
          className="w-full h-auto block"
        />
      </Link>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/client/:id" element={<ClientProfile />} />
          <Route path="/client/:id/:category" element={<ParameterGroupPage />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
