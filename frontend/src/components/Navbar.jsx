import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [newAlertCount, setNewAlertCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCount = () => {
      api.get('/api/v1/alerts/stats')
        .then((res) => setNewAlertCount(res.data.byStatus?.NEW || 0))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-lg font-semibold">
        SecureLens
      </Link>
      <div className="flex items-center gap-4">
        <Link to="/" className="hover:text-gray-300">Home</Link>
        {isAuthenticated ? (
          <>
            <Link to="/dashboard" className="hover:text-gray-300">Dashboard</Link>
            <Link to="/logs" className="hover:text-gray-300">Logs</Link>
            <Link to="/alerts" className="hover:text-gray-300 relative">
              Alerts
              {newAlertCount > 0 && (
                <span className="absolute -top-2 -right-4 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {newAlertCount > 99 ? '99+' : newAlertCount}
                </span>
              )}
            </Link>
            <Link to="/intel" className="hover:text-gray-300">Threat Intel</Link>
            <Link to="/simulator" className="hover:text-gray-300">Simulator</Link>
            <span className="text-sm text-gray-300">{user?.username}</span>
            <span className="bg-gray-600 text-xs px-2 py-0.5 rounded">{user?.role}</span>
            <button
              onClick={handleLogout}
              className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="hover:text-gray-300">Login</Link>
            <Link to="/register" className="hover:text-gray-300">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
