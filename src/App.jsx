import { Link, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import ClientProfile from './pages/ClientProfile.jsx'
import ParameterGroupPage from './pages/ParameterGroupPage.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-card">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold text-ink">
              Картотека
            </span>
            <span className="font-mono text-xs text-ink-soft tracking-wide">
              клиентска база
            </span>
          </Link>
          <Link
            to="/settings"
            className="font-mono text-xs uppercase tracking-wide text-ink-soft hover:text-ledger transition-colors"
          >
            Настройки на параметрите
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
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
