import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThreatGlobeGL from '../components/ThreatGlobeGL';
import HudFrame from '../components/HudFrame';
import { LOGIN_ARCS, LOGIN_POINTS } from '../utils/geoData';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ═══ LEFT: Globe ═══ */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative bg-void overflow-hidden">
        <ThreatGlobeGL fullscreen interactive={false} autoRotateSpeed={0.2} arcsData={LOGIN_ARCS} pointsData={LOGIN_POINTS} />
        <div className="absolute bottom-8 left-0 right-0 text-center z-10">
          <p className="font-display text-[10px] text-mist tracking-[0.3em]">GLOBAL THREAT MONITORING</p>
        </div>
      </div>

      {/* ═══ RIGHT: HUD Auth Panel ═══ */}
      <div className="flex-1 lg:max-w-[520px] flex items-center justify-center bg-void-surface border-l border-ghost relative">
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm mx-8"
        >
          <HudFrame pulse scan>
            <div className="p-8 lg:p-10">
              {/* Shield icon with entrance rotation */}
              <motion.div
                initial={{ rotate: -180, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                className="mb-6"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-8 h-8 text-ice" strokeWidth={1.5} />
                  <div>
                    <h1 className="font-display text-2xl font-bold text-frost tracking-[0.12em]">SECURELENS</h1>
                    <div className="h-px bg-ice/20 mt-1" />
                  </div>
                </div>
                <p className="text-mist text-sm mt-3 flex items-center gap-2">
                  <span className="inline-block w-4 h-px bg-ice/30" />
                  Security Operations Platform
                  <span className="inline-block w-4 h-px bg-ice/30" />
                </p>
              </motion.div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 bg-sev-critical/5 border border-sev-critical/20 text-sev-critical text-xs px-3 py-2.5 rounded-lg font-mono">
                    <div className="hex-dot bg-sev-critical shrink-0" /> {error}
                  </motion.div>
                )}

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <label className="font-display text-[11px] text-mist tracking-[0.15em] block mb-2">EMAIL</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost" strokeWidth={1.5} />
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                      placeholder="analyst@securelens.io" className="void-input w-full pl-10 pr-3 py-3" />
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
                  <label className="font-display text-[11px] text-mist tracking-[0.15em] block mb-2">PASSWORD</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ghost" strokeWidth={1.5} />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                      placeholder="Enter credentials" className="void-input w-full pl-10 pr-3 py-3" />
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit" disabled={submitting}
                    className="reactor-btn w-full font-display text-sm font-semibold tracking-[0.15em] py-3.5 rounded-lg disabled:opacity-40"
                  >
                    {submitting ? 'AUTHENTICATING...' : (
                      <span className="flex items-center justify-center gap-2">
                        <span className="hex-dot bg-ice" />
                        AUTHENTICATE
                        <span className="hex-dot bg-ice" />
                      </span>
                    )}
                  </motion.button>
                </motion.div>
              </form>

              <div className="mt-8 pt-5 border-t border-ghost">
                <p className="text-mist text-xs">No account? <Link to="/register" className="text-ice hover:text-frost transition-colors">Request access</Link></p>
              </div>

              <div className="mt-8">
                <p className="font-mono text-[10px] text-ghost">v2.0.0 // SECURELENS SIEM</p>
              </div>
            </div>
          </HudFrame>
        </motion.div>
      </div>
    </div>
  );
}
