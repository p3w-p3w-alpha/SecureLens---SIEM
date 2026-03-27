import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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
