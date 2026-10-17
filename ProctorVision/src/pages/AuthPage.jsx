import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

function AuthPage({ mode }) {
  const { role } = useParams()
  const { user, loading, login, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (role !== 'student' && role !== 'teacher') {
    return <Navigate replace to="/" />
  }

  if (loading) {
    return <div className="auth-loading" role="status">Checking your session…</div>
  }

  if (user) {
    return <Navigate replace to={user.role === 'teacher' ? '/dashboard' : '/exam'} />
  }

  const isRegistration = mode === 'register'
  const roleLabel = role === 'teacher' ? 'Teacher' : 'Student'
  const alternateMode = isRegistration ? 'login' : 'register'
  const targetPath = location.state?.from === (role === 'teacher' ? '/dashboard' : '/exam')
    ? location.state.from
    : (role === 'teacher' ? '/dashboard' : '/exam')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const authenticatedUser = isRegistration
        ? await register({ displayName, email, password, role, inviteCode })
        : await login({ email, password, role })
      navigate(authenticatedUser.role === 'teacher' ? '/dashboard' : targetPath, { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section aria-labelledby="auth-heading" className="auth-card panel">
        <Link className="back-link" to="/"><ArrowLeft aria-hidden="true" size={16} /> Back home</Link>
        <span className="auth-icon"><ShieldCheck aria-hidden="true" size={23} /></span>
        <p className="eyebrow">{roleLabel.toUpperCase()} ACCESS</p>
        <h1 id="auth-heading">{isRegistration ? `Create your ${role.toLowerCase()} account` : `${roleLabel} sign in`}</h1>
        <p className="auth-copy">
          {isRegistration
            ? 'Create an account to continue to your ProctorVision workspace.'
            : `Sign in with your ${role.toLowerCase()} account to continue.`}
        </p>
        <form className="auth-form" onSubmit={submit}>
          {isRegistration && (
            <label>
              Full name
              <input
                autoComplete="name"
                maxLength={80}
                minLength={2}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                value={displayName}
              />
            </label>
          )}
          <label>
            Email address
            <input
              autoComplete="email"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Password
            <input
              autoComplete={isRegistration ? 'new-password' : 'current-password'}
              maxLength={128}
              minLength={isRegistration ? 10 : 1}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {isRegistration && <span className="auth-field-hint">Use at least 10 characters.</span>}
          </label>
          {isRegistration && role === 'teacher' && (
            <label>
              Teacher invitation code
              <input
                autoComplete="off"
                maxLength={256}
                onChange={(event) => setInviteCode(event.target.value)}
                required
                type="password"
                value={inviteCode}
              />
              <span className="auth-field-hint">Ask your ProctorVision administrator for an invitation code.</span>
            </label>
          )}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button auth-submit" disabled={submitting} type="submit">
            {submitting
              ? 'Please wait…'
              : isRegistration
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
        <p className="auth-switch">
          {isRegistration ? 'Already have an account?' : 'New to ProctorVision?'}
          {' '}
          <Link to={`/${alternateMode}/${role}`}>
            {isRegistration ? 'Sign in' : 'Create account'}
          </Link>
        </p>
        <p className="auth-safety-note">
          Your role is assigned by the server. Teacher registration requires an administrator invitation.
        </p>
      </section>
    </div>
  )
}

export default AuthPage
