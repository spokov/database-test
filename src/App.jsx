import { useEffect, useState } from 'react'
import { Link, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ClientProfile from './pages/ClientProfile.jsx'
import ParameterGroupPage from './pages/ParameterGroupPage.jsx'
import Settings from './pages/Settings.jsx'
import Accounts from './pages/Accounts.jsx'
import Hierarchy from './pages/Hierarchy.jsx'
import Login from './pages/Login.jsx'
import ClientPortal from './pages/ClientPortal.jsx'
import LanguageSwitcher from './components/LanguageSwitcher.jsx'
import { useLanguage } from './lib/i18n.jsx'
import { useAuth } from './lib/auth.jsx'

// Works out a contextual "back" destination from the current URL, so the
// menu can offer it without every page having to declare it separately.
function useBackTarget(t, isClientRole) {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments[0] === 'settings' || segments[0] === 'accounts' || segments[0] === 'hierarchy') {
    return { to: '/', label: t('backToHome') }
  }
  if (segments[0] === 'client' && segments.length === 2) {
    return { to: '/', label: t('backToHome') }
  }
  if (segments[0] === 'client' && segments.length === 3) {
    if (isClientRole) return { to: '/', label: t('backToHome') }
    return { to: `/client/${segments[1]}`, label: t('backToProfile') }
  }
  return null
}

function TopMenu() {
  const { t } = useLanguage()
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const isClientRole = profile?.role === 'client'
  const back = useBackTarget(t, isClientRole)

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
            {profile && (
              <div className="px-4 py-3 border-b border-line/60">
                <p className="text-sm font-medium text-ink truncate">
                  {profile.full_name || profile.email}
                </p>
                <p className="font-mono text-xs text-ledger uppercase tracking-wide">
                  {t(
                    profile.role === 'admin'
                      ? 'roleAdmin'
                      : profile.role === 'trainer'
                      ? 'roleTrainer'
                      : 'roleClient'
                  )}
                </p>
              </div>
            )}
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
            {!isClientRole && (
              <>
                <Link
                  to="/accounts"
                  className="block px-4 py-3 text-sm text-ink hover:bg-paper"
                >
                  {t('navAccounts')}
                </Link>
                {profile?.role === 'admin' && (
                  <>
                    <Link
                      to="/hierarchy"
                      className="block px-4 py-3 text-sm text-ink hover:bg-paper"
                    >
                      {t('navHierarchy')}
                    </Link>
                    <Link
                      to="/settings"
                      className="block px-4 py-3 text-sm text-ink hover:bg-paper"
                    >
                      {t('navSettings')}
                    </Link>
                  </>
                )}
              </>
            )}
            <button
              type="button"
              onClick={signOut}
              className="block w-full text-left px-4 py-3 text-sm text-stamp hover:bg-stamp/5 border-t border-line/60"
            >
              {t('signOut')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function Banner() {
  return (
    <Link to="/" className="block w-full max-w-[1200px] mx-auto">
      <img
        src="/banner.png"
        alt="Believe in yourself"
        className="w-full h-auto block"
      />
    </Link>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-paper">
      <LanguageSwitcher />
      <Banner />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  )
}

export default function App() {
  const { t } = useLanguage()
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <Shell>
        <p className="text-ink-soft font-mono text-sm">{t('loading')}</p>
      </Shell>
    )
  }

  if (!session) {
    return (
      <Shell>
        <Login />
      </Shell>
    )
  }

  if (!profile) {
    return (
      <Shell>
        <p className="text-stamp text-sm">{t('noProfileYet')}</p>
      </Shell>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopMenu />
      <LanguageSwitcher />
      <Banner />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {profile.role === 'client' ? (
          <Routes>
            <Route path="/" element={<ClientPortal />} />
            <Route path="/client/:id/:category" element={<ParameterGroupPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/client/:id" element={<ClientProfile />} />
            <Route path="/client/:id/:category" element={<ParameterGroupPage />} />
            <Route path="/accounts" element={<Accounts />} />
            {profile.role === 'admin' && <Route path="/hierarchy" element={<Hierarchy />} />}
            {profile.role === 'admin' && <Route path="/settings" element={<Settings />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
