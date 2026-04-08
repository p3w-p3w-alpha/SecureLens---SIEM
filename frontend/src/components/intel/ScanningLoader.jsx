import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PROVIDERS = ['VirusTotal', 'AbuseIPDB', 'Shodan', 'AlienVault OTX', 'NVD'];

export default function ScanningLoader() {
  const [currentProvider, setCurrentProvider] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProvider(p => (p + 1) % PROVIDERS.length);
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Sonar pulse + text */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-32 h-32">
          {/* Sonar rings */}
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-ice/20"
              style={{
                animation: `sonar 2.5s ease-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-ice animate-pulse shadow-ice-glow" />
          </div>
        </div>

        {/* Cycling provider text */}
        <div className="h-5 relative">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentProvider}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="text-sm text-gray-500 font-mono"
            >
              Querying <span className="text-ice">{PROVIDERS[currentProvider]}</span>...
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-0.5 bg-void-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-ice/0 via-ice to-ice/0 w-1/3"
            style={{ animation: 'progress-indeterminate 1.5s ease-in-out infinite' }}
          />
        </div>
      </div>

      {/* Skeleton provider cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="relative bg-void-surface border border-ghost rounded-xl overflow-hidden">
            {/* Scan line */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div
                className="absolute left-0 right-0 h-12 bg-gradient-to-b from-transparent via-ice/[0.04] to-transparent"
                style={{ animation: `scan-vertical 2s linear infinite`, animationDelay: `${i * 0.3}s` }}
              />
            </div>
            <div className="h-1 bg-void-surface" />
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-void-surface rounded animate-pulse" />
                <div className="h-10 w-10 rounded-full bg-void-surface animate-pulse" />
              </div>
              <div className="h-3 w-full bg-void-surface rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-void-surface rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
