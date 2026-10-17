import { useCallback, useEffect, useMemo, useState } from 'react'
import authApi from '../services/authApi.js'
import AuthContext from './authContext.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true
    authApi.getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser)
        }
      })
      .catch((error) => {
        if (active) {
          setUser(null)
          if (error.status !== 401) {
            setAuthError(error.message)
          }
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const authenticatedUser = await authApi.login(credentials)
    setAuthError('')
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const register = useCallback(async (details) => {
    const authenticatedUser = await authApi.register(details)
    setAuthError('')
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    authError,
    login,
    register,
    logout,
  }), [user, loading, authError, login, register, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
