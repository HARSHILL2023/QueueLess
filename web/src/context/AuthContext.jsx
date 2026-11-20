import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { disconnectSocket } from '../services/socket'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        const response = await api.get('/auth/me')
        setUser(response.data.data.user)
      } catch (error) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        setUser(null)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    const { token, refreshToken, user } = response.data.data
    
    localStorage.setItem('accessToken', token)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(user)
    
    return user
  }

  const logout = () => {
    disconnectSocket()
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}