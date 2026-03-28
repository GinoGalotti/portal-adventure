import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import { Eyebrow, Heading, StatusDot, Icon, Button } from '../components/ui'

export default function LoginScreen() {
  const { t } = useTranslation()
  const login = useAuthStore((s) => s.login)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, userId } = await api.login(username.trim().toLowerCase(), password)
      login(userId, token)
    } catch (err) {
      const msg = (err as Error).message
      setError(msg === 'Invalid credentials' ? t('login.error.invalid') : t('login.error.network'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080c0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8 anim-fade-up">
          <Eyebrow>// PORTAL FIELD OPERATIONS · SECURE ACCESS</Eyebrow>
          <Heading className="text-[clamp(1.6rem,6vw,2.4rem)] text-[#c8ddd0] leading-[0.95] mt-3">
            P.O.R.T.A.L<br />
            <span className="text-[#2ecc71]">FIELD OPS</span>
          </Heading>
          <div className="flex items-center justify-center gap-2 mt-4">
            <StatusDot />
            <span
              className="text-[0.8rem] tracking-[0.2em] text-[#5a7a62] font-mono-system"
            >
              {t('login.subtitle')}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#1e3428] mb-6 anim-fade-up-1" />

        <form onSubmit={handleSubmit} className="space-y-5 anim-fade-up-2">
          <div>
            <label
              className="block text-[0.8rem] tracking-[0.2em] text-[#1a7a43] mb-1 font-mono-system"
            >
              <Icon name="ui/lock" size={12} className="text-[#1a7a43] mr-1 relative top-[1px]" />
              {t('login.operativeId')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              spellCheck={false}
              className="w-full bg-[#111a14] border border-[#1e3428] text-[#c8ddd0] px-3 py-2 text-base focus:border-[#1a7a43] transition-colors font-mono-system normal-case"
            />
          </div>

          <div>
            <label
              className="block text-[0.8rem] tracking-[0.2em] text-[#1a7a43] mb-1 font-mono-system"
            >
              {t('login.clearanceCode')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-[#111a14] border border-[#1e3428] text-[#c8ddd0] px-3 py-2 text-base focus:border-[#1a7a43] transition-colors font-mono-system normal-case"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-[#e05050] text-[0.82rem] tracking-[0.12em] border border-[#5c2020] bg-[rgba(224,80,80,0.04)] px-3 py-2 font-mono-system"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={loading || !username || !password}
          >
            {loading ? t('common.loading') : t('login.submit')}
          </Button>
        </form>

        <div className="border-t border-[#1e3428] mt-8 anim-fade-up-3" />
        <div
          className="text-center mt-3 text-[0.65rem] tracking-[0.2em] text-[#1e3428] font-mono-system"
        >
          v{__APP_VERSION__}
        </div>
      </div>
    </div>
  )
}
