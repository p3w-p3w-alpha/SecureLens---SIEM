import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'ADMIN') return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
      <p className="text-gray-500">You need ADMIN privileges to access this page.</p>
    </div>
  );

  return children;
}
