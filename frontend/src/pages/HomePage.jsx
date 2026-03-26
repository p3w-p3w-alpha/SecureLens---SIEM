import { useEffect, useState } from 'react';
import api from '../services/api';

export default function HomePage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/v1/health')
      .then((res) => setHealth(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">SecureLens SIEM</h1>
      <p className="text-gray-600 mb-6">Security Operations Platform</p>

      <div className="bg-gray-50 border border-gray-200 rounded p-4 max-w-md mx-auto">
        <h2 className="text-lg font-semibold mb-2">Backend Health Check</h2>
        {error && (
          <p className="text-red-600">Error: {error}</p>
        )}
        {health && (
          <div className="text-left">
            <p><span className="font-medium">Status:</span> {health.status}</p>
            <p><span className="font-medium">Timestamp:</span> {health.timestamp}</p>
          </div>
        )}
        {!health && !error && (
          <p className="text-gray-400">Loading...</p>
        )}
      </div>
    </div>
  );
}
