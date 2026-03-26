import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.username}!</h1>
      <div className="flex items-center gap-2 mb-6">
        <span className="text-gray-500">Role:</span>
        <span className="bg-gray-200 text-gray-700 text-xs font-medium px-2 py-1 rounded">
          {user?.role}
        </span>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded p-4 max-w-md">
        <p className="text-gray-600">Dashboard content coming soon.</p>
      </div>
    </div>
  );
}
