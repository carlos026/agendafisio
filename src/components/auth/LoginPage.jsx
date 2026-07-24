import React, { useState } from 'react'
import { signIn } from '../../services/authService'
import { firebaseReady } from '../../services/firebase'

const ERROR_MESSAGES = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Esta conta está desativada.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento e tente novamente.',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Informe e-mail e senha'); return }
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-title">Sistema de Agendamento</div>
        <div className="login-title">Fisioterapia Pélvica</div>
        <div className="login-subtitle">Entre para acessar o sistema</div>

        {!firebaseReady && (
          <div className="alert-error" style={{ marginTop: '16px' }}>
            Firebase ainda não configurado. Preencha o arquivo <code>.env</code> na raiz do projeto
            (veja <code>.env.example</code>) com os dados do projeto Firebase e reinicie o servidor.
          </div>
        )}

        {error && <div className="alert-error" style={{ marginTop: '16px' }}>{error}</div>}

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">E-mail</label>
          <input
            type="email"
            className="form-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Senha</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading || !firebaseReady} style={{ marginTop: '8px' }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
