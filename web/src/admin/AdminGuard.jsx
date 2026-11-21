import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Client-side route protection for /admin/*.
 *
 * The backend independently rejects every platform admin API call unless
 * req.user.role === 'admin', so this guard is only a navigation convenience:
 * it must never be the sole protection for admin data.
 */
export default function AdminGuard({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="admin-boot">Loading administration console…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
