import { useState, useEffect, useCallback } from 'react';
import * as api from '../api';

export default function AdminDashboard({ onError }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.listUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      onError?.(api.getErrorMessage(e, 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const toggleAccess = async (userId, currentAccess) => {
    try {
      await api.setUserAccess(userId, !currentAccess);
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === userId ? { ...u, is_allowed: !currentAccess } : u
        )
      );
    } catch (e) {
      onError?.(api.getErrorMessage(e, 'Failed to update access'));
    }
  };

  return (
    <div className="admin-dashboard">
      <h2 className="admin-title">User Management (demo)</h2>
      <p className="admin-subtitle">Manage user access to the application in this non-production demo.</p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Role</th>
              <th>Access</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="admin-empty">Loading users…</td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">No users found.</td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr key={user.user_id}>
                  <td>{user.email}</td>
                  <td>{user.name || '—'}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={user.is_allowed ? 'admin-badge-allowed' : 'admin-badge-denied'}>
                      {user.is_allowed ? 'Allowed' : 'Denied'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => toggleAccess(user.user_id, user.is_allowed)}
                    >
                      {user.is_allowed ? 'Revoke' : 'Grant'}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
