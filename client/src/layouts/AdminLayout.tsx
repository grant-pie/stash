import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const NAV_LINKS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/users', label: 'Users', end: false },
  { to: '/admin/snippets', label: 'Snippets', end: false },
  { to: '/admin/audit-logs', label: 'Audit Log', end: false },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/feed', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-800 bg-surface-1">
        {/* Brand */}
        <div className="flex items-center gap-2 border-b border-gray-800 px-4 py-4">
          <Link to="/feed" className="text-base font-bold tracking-tight text-indigo-400">
            Stash
          </Link>
          <span className="rounded bg-red-900/50 px-1.5 py-0.5 text-xs font-medium text-red-300 border border-red-800">
            Admin
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-3 text-gray-100'
                    : 'text-gray-400 hover:bg-surface-2 hover:text-gray-100'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-3 space-y-1">
          <Link
            to="/my-snippets"
            className="block rounded-md px-3 py-2 text-xs text-gray-500 hover:bg-surface-2 hover:text-gray-300 transition-colors"
          >
            Back to app
          </Link>
          <div className="flex items-center justify-between px-3 py-1">
            <span className="text-xs text-gray-500 truncate">{user?.username}</span>
            <button onClick={handleLogout} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
