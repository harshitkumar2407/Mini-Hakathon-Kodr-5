import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import useAuth from '../hooks/useAuth.js'

function Navbar() {
  const { user, loading, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLogoutError('')
    setLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      setLogoutError(error.message)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <header className="navbar">
      <NavLink className="brand" to="/" end>
        <span aria-hidden="true" className="brand-mark">P</span>
        <span>ProctorVision</span>
      </NavLink>
      <nav aria-label="Main navigation" className="nav-links">
        <NavLink className="nav-link" end to="/">Home</NavLink>
        {!loading && user?.role === 'student' && <NavLink className="nav-link" to="/exam">Exam</NavLink>}
        {!loading && user?.role === 'teacher' && <NavLink className="nav-link" to="/dashboard">Dashboard</NavLink>}
        {!loading && user ? (
          <>
            <span className="nav-user">{user.displayName}</span>
            <button className="nav-logout" disabled={loggingOut} onClick={handleLogout} type="button">
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </>
        ) : !loading ? (
          <Link className="nav-link" to="/login/student">Sign in</Link>
        ) : null}
      </nav>
      {logoutError && <p className="nav-error" role="alert">{logoutError}</p>}
    </header>
  )
}

export default Navbar
