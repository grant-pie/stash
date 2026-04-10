import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminRoute() {
  const { user, isAdmin, isModerator, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="text-gray-400 text-sm">Loading…</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin && !isModerator) return <Navigate to="/feed" replace />;

  return <Outlet />;
}
