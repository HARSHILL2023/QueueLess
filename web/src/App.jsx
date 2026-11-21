import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import QueueManagement from './pages/QueueManagement'
import Patients from './pages/Patients'
import Departments from './pages/Departments'
import Staff from './pages/Staff'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'
import AcceptInvitation from './pages/AcceptInvitation'
import ProtectedRoute from './components/ProtectedRoute'
import AdminGuard from './admin/AdminGuard'
import AdminLayout from './admin/AdminLayout'
import AdminOverview from './admin/AdminOverview'
import AdminHospitals from './admin/Hospitals'
import AdminHospitalDetail from './admin/HospitalDetail'
import AdminPatients from './admin/Patients'
import AdminStaff from './admin/Staff'
import AdminActivityLog from './admin/ActivityLog'

function AppRoutes() {
  const { isAuthenticated, user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />
          ) : (
            <Login />
          )
        }
      />
      <Route path="/invite/:token" element={<AcceptInvitation />} />

      {/* Platform-level console — separate layout, admin role only. */}
      <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/hospitals" element={<AdminHospitals />} />
        <Route path="/admin/hospitals/:id" element={<AdminHospitalDetail />} />
        <Route path="/admin/patients" element={<AdminPatients />} />
        <Route path="/admin/staff" element={<AdminStaff />} />
        <Route path="/admin/activity" element={<AdminActivityLog />} />
      </Route>
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/queue" element={<QueueManagement />} />
        <Route path="/patients" element={<Patients />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route
        path="/"
        element={<Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App