import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#0f172a'
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 12px', color: '#0284c7' }}>404</h1>
      <h2 style={{ margin: '0 0 16px' }}>Page Not Found</h2>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>The page you are looking for does not exist or has been moved.</p>
      <Link
        to="/dashboard"
        style={{
          padding: '10px 20px',
          background: '#0284c7',
          color: '#ffffff',
          borderRadius: '6px',
          textDecoration: 'none',
          fontWeight: 600
        }}
      >
        Go to Dashboard
      </Link>
    </div>
  )
}
