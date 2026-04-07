import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';


export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/feed', { replace: true });
  }

  return (
    <header className="border-b border-gray-800 bg-surface-1">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/feed" className="text-lg font-bold tracking-tight text-indigo-400">
            Stash
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/feed"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-surface-2 text-gray-100' : 'text-gray-400 hover:text-gray-100'
                }`
              }
            >
              Feed
            </NavLink>
            {user && (
              <NavLink
                to="/my-snippets"
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-surface-2 text-gray-100' : 'text-gray-400 hover:text-gray-100'
                  }`
                }
              >
                My Snippets
              </NavLink>
            )}
            {isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? 'bg-red-900/40 text-red-300' : 'text-red-400 hover:text-red-300'
                  }`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-gray-400">{user.username}</span>
              <button onClick={handleLogout} className="btn-ghost text-xs">
                Sign out
              </button>
              <Link to="/snippets/new" className="btn-primary text-xs">
                + New snippet
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-xs">
                Sign in
              </Link>
              <Link to="/register" className="btn-primary text-xs">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
