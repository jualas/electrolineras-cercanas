import { useEffect, useState } from 'react'
import { Preferences } from '@capacitor/preferences'

import {
  fetchAuthConfig,
  fetchAuthSession,
  loginWithTotp,
  logoutSession,
} from '../api/auth'
import { getPrivateToken, setPrivateToken, setUnauthorizedHandler } from '../api/client'

const TOKEN_KEY = 'electrolineras_private_token'

type AuthState = {
  ready: boolean
  authenticated: boolean
  username: string | null
  loginEnabled: boolean
  privateStack: boolean
  error: string | null
}

type LoginFormProps = {
  loginEnabled: boolean
  error: string | null
  onLogin: (username: string, code: string) => Promise<void>
  onToken: (token: string) => Promise<void>
}

function LoginForm({ loginEnabled, error, onLogin, onToken }: LoginFormProps) {
  const [username, setUsername] = useState('')
  const [code, setCode] = useState('')
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  return (
    <div className="login-gate">
      <div className="login-gate__card">
        <p className="brand">Electrolineras</p>
        <h1>Cercanas</h1>
        <p className="login-gate__lead">
          Encuentra el cargador más cercano según potencia. Sin planificador de rutas.
        </p>

        {loginEnabled && (
          <form
            className="login-gate__form"
            onSubmit={(event) => {
              event.preventDefault()
              setBusy(true)
              setLocalError(null)
              void onLogin(username.trim(), code.trim())
                .catch((err) => setLocalError(err instanceof Error ? err.message : 'Login fallido'))
                .finally(() => setBusy(false))
            }}
          >
            <label>
              Usuario
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </label>
            <label>
              Código TOTP
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={busy}>
              Entrar
            </button>
          </form>
        )}

        <details className="login-gate__token">
          <summary>Usar token privado</summary>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setBusy(true)
              setLocalError(null)
              void onToken(token.trim())
                .catch((err) => setLocalError(err instanceof Error ? err.message : 'Token inválido'))
                .finally(() => setBusy(false))
            }}
          >
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="PRIVATE_API_TOKEN"
              autoComplete="off"
              required
            />
            <button type="submit" className="btn btn--secondary" disabled={busy}>
              Guardar token
            </button>
          </form>
        </details>

        {(error || localError) && <p className="login-gate__error">{localError ?? error}</p>}
      </div>
    </div>
  )
}

export function useAuthGate() {
  const [state, setState] = useState<AuthState>({
    ready: false,
    authenticated: false,
    username: null,
    loginEnabled: false,
    privateStack: true,
    error: null,
  })

  const refresh = async () => {
    try {
      const stored = await Preferences.get({ key: TOKEN_KEY })
      if (stored.value) setPrivateToken(stored.value)

      const config = await fetchAuthConfig()
      if (!config.private_stack_enabled) {
        setState({
          ready: true,
          authenticated: true,
          username: null,
          loginEnabled: false,
          privateStack: false,
          error: null,
        })
        return
      }

      if (getPrivateToken()) {
        setState({
          ready: true,
          authenticated: true,
          username: 'token',
          loginEnabled: config.login_enabled,
          privateStack: true,
          error: null,
        })
        return
      }

      const session = await fetchAuthSession()
      setState({
        ready: true,
        authenticated: session.authenticated,
        username: session.username ?? null,
        loginEnabled: config.login_enabled,
        privateStack: true,
        error: null,
      })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        ready: true,
        authenticated: Boolean(getPrivateToken()),
        error: err instanceof Error ? err.message : 'No se pudo comprobar sesión',
      }))
    }
  }

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setPrivateToken(null)
      void Preferences.remove({ key: TOKEN_KEY })
      setState((prev) => ({ ...prev, authenticated: false, username: null }))
    })
    void refresh()
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = async (username: string, code: string) => {
    await loginWithTotp(username, code)
    await refresh()
  }

  const saveToken = async (token: string) => {
    setPrivateToken(token)
    await Preferences.set({ key: TOKEN_KEY, value: token })
    await refresh()
  }

  const logout = async () => {
    setPrivateToken(null)
    await Preferences.remove({ key: TOKEN_KEY })
    try {
      await logoutSession()
    } catch {
      // ignore
    }
    setState((prev) => ({ ...prev, authenticated: false, username: null }))
  }

  return { ...state, login, saveToken, logout, LoginForm }
}
