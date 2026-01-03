import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

/**
 * ProtectedRoute component - Wraps routes that require authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @param {Array<string>} [props.allowedRoles] - Allowed user roles
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

