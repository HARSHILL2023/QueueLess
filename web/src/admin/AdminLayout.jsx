import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './admin.css';

const NAV = [
  { to: '/admin', label: 'Platform overview', icon: '📊', end: true },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="admin-shell">
      {open && (
        <div
          className="admin-sidebar-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${open ? 'open' : ''}`}>
        <div>
          <div className="admin-brand">
            <div className="admin-brand-mark">⚡</div>
            <div>
              <h1>QueueLess</h1>
              <span>Platform console</span>
            </div>
          </div>

          <nav className="admin-nav">
            <div className="admin-nav-label">Operations</div>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : '')}
              >
                <span className="admin-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <div className="admin-identity">
            <div className="admin-avatar">{(user?.name || 'A').charAt(0).toUpperCase()}</div>
            <div>
              <div className="admin-identity-name">{user?.name || 'Platform administrator'}</div>
              <div className="admin-identity-role">Super admin</div>
            </div>
          </div>
          <button type="button" className="admin-ghost-btn" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-topbar">
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <button
              type="button"
              className="admin-ghost-btn admin-menu-btn"
              onClick={() => setOpen((value) => !value)}
              aria-label="Toggle navigation"
            >
              ☰
            </button>
          </div>
          <div style={{ flex: 1 }} />
        </div>

        <Outlet />
      </main>
    </div>
  );
}
