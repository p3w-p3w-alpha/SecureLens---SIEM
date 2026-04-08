import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Settings, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import HudFrame from '../components/HudFrame';
import TiltCard from '../components/TiltCard';
import api from '../services/api';
import '../components/intel/intel-styles.css';

const ROLE_COLORS = { ADMIN: 'bg-purple-500/20 text-purple-400', ANALYST: 'bg-ice/20 text-ice' };

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'ANALYST' });
  const [error, setError] = useState('');

  const loadData = () => {
    api.get('/api/v1/admin/users').then(r => setUsers(r.data)).catch(() => {});
    api.get('/api/v1/admin/stats').then(r => setStats(r.data)).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const createUser = async () => {
    setError('');
    try {
      await api.post('/api/v1/admin/users', form);
      setShowCreate(false);
      setForm({ username: '', email: '', password: '', role: 'ANALYST' });
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const toggleRole = async (u) => {
    if (!confirm(`Change ${u.username}'s role to ${u.role === 'ADMIN' ? 'ANALYST' : 'ADMIN'}?`)) return;
    const newRole = u.role === 'ADMIN' ? 'ANALYST' : 'ADMIN';
    await api.patch(`/api/v1/admin/users/${u.id}/role`, { role: newRole });
    loadData();
  };

  const deleteUser = async (u) => {
    if (u.id === currentUser?.id) { alert('Cannot delete yourself'); return; }
    if (!confirm(`Delete user ${u.username}? This cannot be undone.`)) return;
    await api.delete(`/api/v1/admin/users/${u.id}`);
    loadData();
  };

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-ice/10 border border-ice/20 flex items-center justify-center">
              <Settings className="w-5 h-5 text-ice" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold tracking-wider text-white">SYSTEM ADMINISTRATION</h1>
              <p className="text-xs text-gray-500 font-mono">User management and access control</p>
            </div>
          </div>
          <button onClick={loadData} className="p-2 rounded-lg border border-ghost hover:border-ice/40 text-gray-400 hover:text-ice transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-void-surface border border-ghost rounded-xl p-4">
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Total Users</p>
              <p className="text-2xl font-mono font-bold text-white">{stats.totalUsers}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-void-surface border border-ghost rounded-xl p-4">
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Admins</p>
              <p className="text-2xl font-mono font-bold text-purple-400">{stats.adminCount}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-void-surface border border-ghost rounded-xl p-4">
              <p className="text-xs text-gray-500 font-mono uppercase tracking-wider mb-1">Analysts</p>
              <p className="text-2xl font-mono font-bold text-ice">{stats.analystCount}</p>
            </motion.div>
          </div>
        )}

        {/* Create User */}
        <div className="mb-6">
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 reactor-btn px-4 py-2 rounded-lg text-sm font-display font-semibold tracking-[0.1em]">
            <UserPlus className="w-4 h-4" />
            {showCreate ? 'Cancel' : 'Create User'}
          </button>
        </div>

        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="bg-void-surface border border-ghost rounded-xl p-5 mb-6 space-y-3 overflow-hidden">
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm font-mono">{error}</div>}
            <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              placeholder="Username"
              className="w-full bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-ice/50 font-mono" />
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="w-full bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-ice/50 font-mono" />
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Password (min 8 chars)"
              className="w-full bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-ice/50 font-mono" />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
              className="bg-void-surface border border-ghost rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-ice/50 font-mono">
              <option value="ANALYST" className="bg-void-surface text-white">ANALYST</option>
              <option value="ADMIN" className="bg-void-surface text-white">ADMIN</option>
            </select>
            <div className="flex gap-3 pt-1">
              <button onClick={createUser}
                className="flex items-center gap-2 bg-ice/20 border border-ice/40 text-ice px-4 py-2 rounded-lg text-sm font-mono hover:bg-ice/30 transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                Create
              </button>
              <button onClick={() => setShowCreate(false)} className="text-sm text-gray-500 hover:text-gray-300 font-mono transition-colors">Cancel</button>
            </div>
          </motion.div>
        )}

        {/* ═══ CREW ROSTER — Card Grid (replaces table) ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((u, idx) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05, type: 'spring', stiffness: 150 }}>
              <div className="void-card void-scan p-5 group">
                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold font-mono shrink-0 ${
                    u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-ice/20 text-ice border border-ice/30'
                  }`}>
                    {u.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-frost tracking-wide">{u.username}</p>
                    <p className="text-[10px] font-mono text-mist truncate">{u.email}</p>
                  </div>
                  <span className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleRole(u)}
                    className="reactor-btn text-[9px] font-display tracking-wider px-3 py-1 rounded flex-1">
                    CHANGE ROLE
                  </button>
                  <button onClick={() => deleteUser(u)}
                    disabled={u.id === currentUser?.id}
                    className="inline-flex items-center justify-center gap-1 text-[9px] font-mono text-red-400/60 border border-red-500/20 px-3 py-1 rounded hover:border-red-500/40 hover:text-red-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
