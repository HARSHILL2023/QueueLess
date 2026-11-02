import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <aside style={{
        width: '240px',
        background: '#0f172a',
        color: '#f8fafc',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ padding: '0 8px 24px', borderBottom: '1px solid #1e293b' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>QueueLess</h2>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Staff Dashboard</span>
          </div>
          <nav style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <NavLink
              to="/dashboard"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '6px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
              })}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/queue"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '6px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
              })}
            >
              Queue Management
            </NavLink>
            <NavLink
              to="/patients"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '6px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
              })}
            >
              Patients
            </NavLink>
            <NavLink
              to="/departments"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '6px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
              })}
            >
              Departments
            </NavLink>
            <NavLink
              to="/staff"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '6px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
              })}
            >
              Staff
            </NavLink>
            <NavLink
              to="/settings"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '6px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
              })}
            >
              Settings
            </NavLink>
          </nav>
        </div>

        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>
            {user?.name || 'Staff User'}
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              background: '#334155',
              color: '#f8fafc',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Log Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, background: '#f8fafc', padding: '32px' }}>
        <Outlet />
      </main>
    </div>
  )
}
