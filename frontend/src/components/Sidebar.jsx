import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Bell, FileText, Search, Crosshair,
  AlertTriangle, Play, Upload, Settings, LogOut, Shield
} from 'lucide-react';
import api from '../services/api';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alerts', label: 'Alerts', icon: Bell, badge: true },
  { path: '/logs', label: 'Logs', icon: FileText },
  { path: '/intel', label: 'Threat Intel', icon: Search },
  { path: '/hunt', label: 'Hunt', icon: Crosshair },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/simulator', label: 'Simulator', icon: Play },
  { path: '/ingest', label: 'Ingest', icon: Upload },
  { path: '/admin', label: 'Admin', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const f = () => api.get('/api/v1/alerts/stats').then(r => setAlertCount(r.data.byStatus?.NEW || 0)).catch(() => {});
    f(); const i = setInterval(f, 30000); return () => clearInterval(i);
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <motion.aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      animate={{ width: expanded ? 200 : 64 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="fixed left-0 top-0 h-screen z-50 flex flex-col overflow-hidden bg-void-surface border-r border-ghost"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-[18px] h-16 shrink-0">
        <Shield className="w-6 h-6 text-ice shrink-0" />
        <motion.span
          animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
          className="text-sm font-bold font-mono text-ice whitespace-nowrap tracking-wider overflow-hidden"
        >
          SecureLens
        </motion.span>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-ghost" />

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {/* Section label */}
        <motion.p
          animate={{ opacity: expanded ? 1 : 0, height: expanded ? 'auto' : 0 }}
          className="px-3 pb-2 pt-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-gray-600 whitespace-nowrap overflow-hidden"
        >
          Navigation
        </motion.p>

        {NAV.map(item => {
          if (item.adminOnly && user?.role !== 'ADMIN') return null;
          const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path} className="relative block">
              <motion.div
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200
                  ${active
                    ? 'bg-void-raised text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-void-surface'
                  }`}
              >
                {/* Left active indicator */}
                {active && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r-full bg-ice"
                    style={{ boxShadow: '0 0 8px rgba(0, 212, 255, 0.4)' }}
                  />
                )}

                <div className="relative shrink-0">
                  <Icon className={`w-[18px] h-[18px] ${active ? 'text-ice' : ''}`} />
                  {item.badge && alertCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 leading-none">
                      {alertCount > 9 ? '9+' : alertCount}
                    </span>
                  )}
                </div>

                <motion.span
                  animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
                  className="whitespace-nowrap font-mono overflow-hidden"
                >
                  {item.label}
                </motion.span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="px-2 pb-3 shrink-0">
        <div className="px-2 py-2.5 rounded-lg bg-void-surface border border-ghost">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ice to-purple-500 flex items-center justify-center text-white text-xs font-bold font-mono shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            {expanded && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-200 truncate font-mono">{user?.username}</p>
                <span className="inline-block mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-ice/80 bg-ice/10 px-1.5 py-0.5 rounded">
                  {user?.role}
                </span>
              </motion.div>
            )}
            {expanded && (
              <button onClick={() => { logout(); navigate('/'); }} className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-void-surface">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
