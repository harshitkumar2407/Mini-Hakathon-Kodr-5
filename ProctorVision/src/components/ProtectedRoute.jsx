import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

function ProtectedRoute({ role, children }) {
  const { user, loading, authError } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="auth-loading" role="status">Checking your session…</div>
  }

  if (authError) {
    return (
      <div className="auth-loading" role="alert">
        <p>{authError}</p>
        <button className="button secondary" onClick={() => window.location.reload()} type="button">
          Retry
        </button>
      </div>
    )
  }

  if (!user) {
    return <Navigate replace state={{ from: location.pathname }} to={`/login/${role}`} />
  }

  if (user.role !== role) {
    return <Navigate replace to={user.role === 'teacher' ? '/dashboard' : '/exam'} />
  }

  return children
}

export default ProtectedRoute
