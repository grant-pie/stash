import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/lib/axios';
import type { AdminUser, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const ROLES: UserRole[] = ['user', 'moderator', 'admin'];

function RoleBadge({ role }: { role: UserRole }) {
  const styles: Record<UserRole, string> = {
    admin: 'bg-red-900/40 text-red-300 border border-red-800',
    moderator: 'bg-purple-900/40 text-purple-300 border border-purple-800',
    user: 'bg-gray-800 text-gray-400 border border-gray-700',
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${styles[role] ?? styles.user}`}>
      {role}
    </span>
  );
}

export default function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentAdmin } = useAuth();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Role change
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [roleLoading, setRoleLoading] = useState(false);

  // Suspend
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendLoading, setSuspendLoading] = useState(false);

  // Delete
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<AdminUser>(`/admin/users/${id}`);
        setUser(res.data);
        setSelectedRole(res.data.role);
      } catch {
        setError('User not found.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleRoleChange() {
    if (!user || selectedRole === user.role) return;
    setRoleLoading(true);
    try {
      const res = await api.patch<AdminUser>(`/admin/users/${id}`, { role: selectedRole });
      setUser((u) => u ? { ...u, role: res.data!.role } : u);
    } finally {
      setRoleLoading(false);
    }
  }

  async function handleSuspend() {
    if (!user) return;
    setSuspendLoading(true);
    try {
      const res = await api.patch<AdminUser>(`/admin/users/${id}`, {
        isSuspended: true,
        suspendReason: suspendReason.trim() || undefined,
      });
      setUser((u) => u ? { ...u, isSuspended: true, suspendReason: res.data!.suspendReason } : u);
      setSuspendReason('');
    } finally {
      setSuspendLoading(false);
    }
  }

  async function handleUnsuspend() {
    if (!user) return;
    setSuspendLoading(true);
    try {
      await api.patch<AdminUser>(`/admin/users/${id}`, { isSuspended: false });
      setUser((u) => u ? { ...u, isSuspended: false, suspendedAt: null, suspendReason: null } : u);
    } finally {
      setSuspendLoading(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    if (!confirm(`Permanently delete "${user.username}"? This will also delete all their snippets and cannot be undone.`)) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${id}`);
      navigate('/admin/users', { replace: true });
    } finally {
      setDeleteLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-gray-500 text-sm">Loading…</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6 space-y-3">
        <p className="text-red-400 text-sm">{error || 'User not found.'}</p>
        <Link to="/admin/users" className="text-indigo-400 text-sm hover:text-indigo-300">
          Back to users
        </Link>
      </div>
    );
  }

  const isSelf = currentAdmin?.id === user.id;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/admin/users" className="hover:text-gray-300">
          Users
        </Link>
        <span>/</span>
        <span className="text-gray-300">{user.username}</span>
      </div>

      {/* Profile header */}
      <div className="card flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-900/50 text-indigo-300 text-lg font-semibold">
          {user.username[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-100">{user.username}</span>
            <RoleBadge role={user.role} />
            {user.isSuspended && (
              <span className="rounded px-1.5 py-0.5 text-xs bg-red-900/40 text-red-300 border border-red-800">
                Suspended
              </span>
            )}
            {isSelf && (
              <span className="rounded px-1.5 py-0.5 text-xs bg-yellow-900/40 text-yellow-300 border border-yellow-800">
                You
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">{user.email}</p>
          <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
            <span>{user.snippetCount} snippets</span>
            {user.createdAt && <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>}
            {user.isSuspended && user.suspendedAt && (
              <span>Suspended {new Date(user.suspendedAt).toLocaleDateString()}</span>
            )}
          </div>
          {user.isSuspended && user.suspendReason && (
            <p className="text-xs text-red-400 mt-1">Reason: {user.suspendReason}</p>
          )}
        </div>
      </div>

      {/* Change Role */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">Change Role</h2>
        <div className="flex gap-3 items-center">
          <select
            className="input w-auto"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            disabled={isSelf}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            className="btn-primary text-sm"
            onClick={handleRoleChange}
            disabled={roleLoading || selectedRole === user.role || isSelf}
          >
            {roleLoading ? 'Saving…' : 'Save'}
          </button>
        </div>
        {isSelf && (
          <p className="text-xs text-yellow-500">You cannot change your own role.</p>
        )}
      </div>

      {/* Suspend / Unsuspend */}
      <div className="card space-y-3">
        <h2 className="text-sm font-semibold text-gray-300">
          {user.isSuspended ? 'Suspension' : 'Suspend User'}
        </h2>
        {user.isSuspended ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              This user is currently suspended
              {user.suspendReason ? ` — "${user.suspendReason}"` : ''}.
            </p>
            <button
              className="btn-ghost text-sm border border-gray-700"
              onClick={handleUnsuspend}
              disabled={suspendLoading || isSelf}
            >
              {suspendLoading ? 'Lifting…' : 'Lift Suspension'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              className="input"
              placeholder="Reason (optional)"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              disabled={isSelf}
            />
            <button
              className="btn-danger text-sm"
              onClick={handleSuspend}
              disabled={suspendLoading || isSelf}
            >
              {suspendLoading ? 'Suspending…' : 'Suspend User'}
            </button>
            {isSelf && (
              <p className="text-xs text-yellow-500">You cannot suspend yourself.</p>
            )}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="card space-y-3 border-red-900/50">
        <h2 className="text-sm font-semibold text-red-400">Danger Zone</h2>
        <p className="text-xs text-gray-500">
          Permanently deletes this account and all {user.snippetCount} of their snippets.
          This action cannot be undone.
        </p>
        <button
          className="btn-danger text-sm"
          onClick={handleDelete}
          disabled={deleteLoading || isSelf}
        >
          {deleteLoading ? 'Deleting…' : 'Delete Account'}
        </button>
        {isSelf && (
          <p className="text-xs text-yellow-500">You cannot delete your own account.</p>
        )}
      </div>
    </div>
  );
}
