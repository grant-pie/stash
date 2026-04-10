import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminStats, AuditLog, PaginatedResponse } from '@/types';
import ErrorState from '@/components/ErrorState';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ACTION_COLORS: Record<string, string> = {
  USER_SUSPENDED: 'bg-red-900/40 text-red-300',
  USER_UNSUSPENDED: 'bg-green-900/40 text-green-300',
  USER_DELETED: 'bg-red-900/40 text-red-300',
  USER_ROLE_CHANGED: 'bg-indigo-900/40 text-indigo-300',
  SNIPPET_DELETED: 'bg-amber-900/40 text-amber-300',
  SNIPPET_VISIBILITY_CHANGED: 'bg-yellow-900/40 text-yellow-300',
};

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}

function StatCard({ label, value, sub, accent = 'text-gray-100' }: StatCardProps) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      <span className={`text-3xl font-bold tabular-nums ${accent}`}>{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setError('');
      try {
        const requests: Promise<any>[] = [api.get<AdminStats>('/admin/stats')];
        if (isAdmin) {
          requests.push(api.get<PaginatedResponse<AuditLog>>('/admin/audit-logs?limit=8'));
        }
        const [statsRes, logsRes] = await Promise.all(requests);
        setStats(statsRes.data);
        if (logsRes) setRecentLogs(logsRes.data.data ?? []);
      } catch (err: any) {
        setError(
          err?.response
            ? (err.response.data?.message ?? 'Failed to load dashboard.')
            : 'Could not reach the server. Check your connection and try again.',
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-gray-500 text-sm">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of your Stash instance</p>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {isAdmin && <StatCard label="Total Users" value={stats.totalUsers} />}
          <StatCard label="Total Snippets" value={stats.totalSnippets} />
          {isAdmin && (
            <StatCard label="New This Week" value={stats.newUsersThisWeek} sub="registered users" accent="text-indigo-400" />
          )}
          <StatCard label="Public Snippets" value={stats.publicSnippets} />
          {isAdmin && (
            <StatCard
              label="Suspended"
              value={stats.suspendedUsers}
              accent={stats.suspendedUsers > 0 ? 'text-red-400' : 'text-gray-100'}
            />
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Languages */}
        {stats && stats.topLanguages.length > 0 && (
          <div className="card space-y-3">
            <h2 className="text-sm font-semibold text-gray-300">Top Languages</h2>
            <ul className="space-y-2">
              {stats.topLanguages.map(({ language, count }) => {
                const max = stats.topLanguages[0].count;
                const pct = Math.round((count / max) * 100);
                return (
                  <li key={language} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-medium">{language || 'Unknown'}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-surface-3">
                      <div
                        className="h-1.5 rounded-full bg-indigo-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Recent Audit Activity — admin only */}
        {isAdmin && (
          <div className="card space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">Recent Activity</h2>
              <Link to="/admin/audit-logs" className="text-xs text-indigo-400 hover:text-indigo-300">
                View all
              </Link>
            </div>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-600 italic">No activity yet</p>
            ) : (
              <ul className="space-y-2">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-xs ${
                          ACTION_COLORS[log.action] ?? 'bg-gray-800 text-gray-400'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-gray-500 truncate">
                        by {log.admin?.username ?? 'deleted admin'}
                      </span>
                    </div>
                    <span className="shrink-0 text-gray-600">{timeAgo(log.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex gap-3">
        {isAdmin && (
          <Link to="/admin/users" className="btn-ghost text-sm">
            Manage Users
          </Link>
        )}
        <Link to="/admin/snippets" className="btn-ghost text-sm">
          Moderate Snippets
        </Link>
      </div>
    </div>
  );
}
