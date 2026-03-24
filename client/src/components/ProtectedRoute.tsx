import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-400 text-sm">Loading…</span>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
