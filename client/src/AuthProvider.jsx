import { useState, useEffect, useCallback } from 'react'
import { setToken, setUnauthorizedHandler } from './api'
import { AuthContext } from './AuthContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('hh_session')
    if (!saved) return null
    const { token, user } = JSON.parse(saved)
    setToken(token)
    return user
  })

  const login = useCallback((token, user) => {
    setToken(token)
    setUser(user)
    sessionStorage.setItem('hh_session', JSON.stringify({ token, user }))
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    sessionStorage.removeItem('hh_session')
  }, [])

  useEffect(() => { setUnauthorizedHandler(logout) }, [logout])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}