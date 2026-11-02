import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.75rem', color: '#0f172a' }}>Dashboard</h1>
        <p style={{ margin: 0, color: '#64748b' }}>Welcome back, {user?.name || 'Staff'}. Overview of your department and queues.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Active Tokens in Queue</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0284c7', marginTop: '8px' }}>--</div>
        </div>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Currently Serving</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a', marginTop: '8px' }}>--</div>
        </div>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Completed Today</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#475569', marginTop: '8px' }}>--</div>
        </div>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Estimated Wait Time</span>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#d97706', marginTop: '8px' }}>-- mins</div>
        </div>
      </div>
    </div>
  )
}
