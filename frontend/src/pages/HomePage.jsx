import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

export default function HomePage() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/api/v1/health').then(r => setHealth(r.data)).catch(() => setError('Backend unavailable'));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="relative inline-block mb-6">
          <Shield className="w-16 h-16 text-ice" />
          <div className="absolute inset-0 rounded-full bg-ice/20 blur-2xl animate-pulse" />
        </div>
        <h1 className="text-3xl font-bold font-display mb-2" style={{ textShadow: '0 0 40px rgba(125,211,252,0.3)' }}>
          SECURELENS
        </h1>
        <p className="text-gray-500 font-mono text-sm mb-8">Security Operations Platform</p>

        {health && (
          <div className="bg-void-surface border border-ghost rounded-xl px-6 py-3 mb-6 inline-block">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Backend: </span>
            <span className="text-xs font-mono text-green-400">{health.status || 'UP'}</span>
          </div>
        )}
        {error && (
          <div className="bg-sev-critical/10 border border-sev-critical/30 text-sev-critical text-xs font-mono px-4 py-2 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link to="/login" className="flex items-center gap-2 bg-gradient-to-r from-ice to-ice text-void font-mono text-sm font-bold px-6 py-2.5 rounded-lg hover:shadow-ice-glow transition-all">
            Sign In <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/register" className="flex items-center gap-2 border border-ghost text-gray-400 font-mono text-sm px-6 py-2.5 rounded-lg hover:border-gray-500 hover:text-gray-300 transition-all">
            Register
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
