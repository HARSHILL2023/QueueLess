import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { disconnectSocket } from '../services/socket'
import { HOSPITAL_SELECTION_KEY, isGlobalStaffUser, readHospitalId } from '../services/hospital'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedHospitalId, setSelectedHospitalId] = useState(
    () => localStorage.getItem(HOSPITAL_SELECTION_KEY) || ''
  )

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

  // A selected hospital only exists for global staff. Clear any leftover value
  // for normal accounts so their own hospital stays the only context.
  useEffect(() => {
    if (user && !isGlobalStaffUser(user) && localStorage.getItem(HOSPITAL_SELECTION_KEY)) {
      localStorage.removeItem(HOSPITAL_SELECTION_KEY)
      setSelectedHospitalId('')
    }
  }, [user])

  const selectHospital = useCallback((hospitalId) => {
    if (hospitalId) {
      localStorage.setItem(HOSPITAL_SELECTION_KEY, hospitalId)
      setSelectedHospitalId(hospitalId)
    } else {
      localStorage.removeItem(HOSPITAL_SELECTION_KEY)
      setSelectedHospitalId('')
    }
  }, [])

  const login = async (credentials) => {
    const response = await api.post('/auth/login', credentials)
    const { token, refreshToken, user: loggedInUser } = response.data.data

    localStorage.setItem('accessToken', token)
    localStorage.setItem('refreshToken', refreshToken)
    setUser(loggedInUser)

    return loggedInUser
  }

  const logout = () => {
    disconnectSocket()
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem(HOSPITAL_SELECTION_KEY)
    setSelectedHospitalId('')
    setUser(null)
  }

  const globalStaff = isGlobalStaffUser(user)
  const ownHospitalId = readHospitalId(user?.hospitalId)
  // Normal staff and admins keep their existing single-hospital behaviour.
  const activeHospitalId = globalStaff ? selectedHospitalId || ownHospitalId : ownHospitalId

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    logout,
    checkAuth,
    isGlobalStaff: globalStaff,
    selectedHospitalId,
    selectHospital,
    activeHospitalId,
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