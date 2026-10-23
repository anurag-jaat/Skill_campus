import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * React component for ProtectedRoute.
 * @author = kruthinraj
 * @date = 2026-08-22
 */

/**
 * Client-side convenience only. The real check is `requireAuth` on the API -
 * hiding a link in the UI is not a security boundary.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="text-sm text-cw-text-3">Loading…</p>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
