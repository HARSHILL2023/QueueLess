import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const hospitalName = user?.hospitalId?.name || 'Hospital Console';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-sans)' }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: '260px',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderRight: '1px solid #1e293b',
      }}>
        <div>
          {/* Logo & Facility Header */}
          <div style={{ padding: '0 8px 24px', borderBottom: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '1.25rem' }}>⚡</span>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.5px' }}>
                QueueLess
              </h2>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hospitalName}
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <NavLink
              to="/dashboard"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              })}
            >
              <span>📊</span> Dashboard
            </NavLink>

            <NavLink
              to="/queue"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              })}
            >
              <span>📢</span> Queue Console
            </NavLink>

            <NavLink
              to="/patients"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              })}
            >
              <span>👥</span> Patients
            </NavLink>

            <NavLink
              to="/departments"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              })}
            >
              <span>🏥</span> Departments
            </NavLink>

            <NavLink
              to="/staff"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              })}
            >
              <span>🩺</span> Staff Team
            </NavLink>

            <NavLink
              to="/settings"
              style={({ isActive }) => ({
                padding: '10px 14px',
                borderRadius: '8px',
                color: isActive ? '#38bdf8' : '#cbd5e1',
                background: isActive ? '#1e293b' : 'transparent',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              })}
            >
              <span>⚙️</span> Facility Settings
            </NavLink>
          </nav>
        </div>

        {/* User Card & Logout */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '0 4px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '0.85rem' }}>
              {(user?.name || 'S').charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Staff User'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'capitalize' }}>
                {user?.staffRole || user?.role || 'Staff'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '6px',
              background: '#1e293b',
              color: '#f8fafc',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 500,
              transition: 'background 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#334155')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#1e293b')}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, backgroundColor: 'var(--color-slate-50)', padding: '32px', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
