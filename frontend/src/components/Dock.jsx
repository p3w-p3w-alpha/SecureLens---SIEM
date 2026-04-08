import { useRef, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  motion, useMotionValue, useSpring, useTransform,
} from 'framer-motion';
import {
  LayoutDashboard, Bell, FileText, Search, Crosshair,
  AlertTriangle, Play, Upload, Settings, LogOut, Shield,
} from 'lucide-react';
import api from '../services/api';

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/alerts', label: 'Alerts', icon: Bell, badge: true },
  { path: '/logs', label: 'Logs', icon: FileText },
  { path: '/intel', label: 'Intel', icon: Search },
  { path: '/hunt', label: 'Hunt', icon: Crosshair },
  { path: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { path: '/simulator', label: 'Simulator', icon: Play },
  { path: '/ingest', label: 'Ingest', icon: Upload },
  { path: '/admin', label: 'Admin', icon: Settings, adminOnly: true },
];

/* ── Individual Dock Item with magnification ── */
function DockItem({ mouseX, item, active, alertCount }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const sizeSync = useTransform(distance, [-120, 0, 120], [40, 64, 40]);
  const size = useSpring(sizeSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const iconScale = useTransform(size, [40, 64], [1, 1.4]);
  const iconSpring = useSpring(iconScale, { mass: 0.1, stiffness: 150, damping: 12 });

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link
        to={item.path}
        className={`w-full h-full rounded-xl flex items-center justify-center transition-colors duration-200 ${
          active ? 'bg-ice/10' : 'hover:bg-void-raised'
        }`}
      >
        <motion.div style={{ scale: iconSpring }} className="flex items-center justify-center">
          <Icon className={`w-[18px] h-[18px] ${active ? 'text-ice' : 'text-gray-400'}`} strokeWidth={1.8} />
        </motion.div>

        {/* Alert badge */}
        {item.badge && alertCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 leading-none">
            {alertCount > 9 ? '9+' : alertCount}
          </span>
        )}
      </Link>

      {/* Active indicator dot */}
      {active && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ice" style={{ boxShadow: '0 0 6px rgba(125,211,252,0.6)' }} />
      )}

      {/* Tooltip */}
      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full mb-2 px-2.5 py-1 bg-void border border-ghost rounded-lg whitespace-nowrap pointer-events-none z-50"
        >
          <span className="text-[10px] font-display text-frost tracking-wider">{item.label}</span>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-void border-r border-b border-ghost rotate-45 -mt-[3px]" />
        </motion.div>
      )}
    </motion.div>
  );
}

/* ── Main Dock ── */
export default function Dock() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [alertCount, setAlertCount] = useState(0);
  const mouseX = useMotionValue(Infinity);

  useEffect(() => {
    if (!isAuthenticated) return;
    const f = () => api.get('/api/v1/alerts/stats').then(r => setAlertCount(r.data.byStatus?.NEW || 0)).catch(() => {});
    f();
    const i = setInterval(f, 30000);
    return () => clearInterval(i);
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const filteredNav = NAV.filter(item => !item.adminOnly || user?.role === 'ADMIN');

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end gap-1 bg-void-surface/90 border border-ghost rounded-2xl px-3 pb-2 pt-2"
        style={{ backdropFilter: 'blur(12px)' }}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 100, damping: 15 }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center w-10 h-10 shrink-0">
          <Shield className="w-5 h-5 text-ice" strokeWidth={1.5} />
        </div>

        {/* Separator */}
        <div className="w-px h-7 bg-ghost mx-1 mb-1 shrink-0" />

        {/* Nav Items */}
        {filteredNav.map(item => {
          const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
          return (
            <DockItem
              key={item.path}
              mouseX={mouseX}
              item={item}
              active={active}
              alertCount={item.badge ? alertCount : 0}
            />
          );
        })}

        {/* Separator */}
        <div className="w-px h-7 bg-ghost mx-1 mb-1 shrink-0" />

        {/* User avatar */}
        <div className="flex items-center justify-center w-10 h-10 shrink-0 relative group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ice to-purple-500 flex items-center justify-center text-white text-xs font-bold font-mono cursor-pointer"
            onClick={() => { logout(); navigate('/'); }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          {/* Logout tooltip */}
          <div className="absolute bottom-full mb-2 px-2.5 py-1 bg-void border border-ghost rounded-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
            <span className="text-[10px] font-display text-frost tracking-wider">LOGOUT</span>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-void border-r border-b border-ghost rotate-45 -mt-[3px]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
