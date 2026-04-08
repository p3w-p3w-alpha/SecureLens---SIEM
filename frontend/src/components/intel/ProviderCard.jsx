import { motion } from 'framer-motion';
import { Shield, AlertCircle, Search, ExternalLink, Copy, Check, WifiOff } from 'lucide-react';
import MiniGauge from './MiniGauge';

const PROVIDER_COLORS = {
  VirusTotal: '#4285f4',
  AbuseIPDB: '#ef4444',
  Shodan: '#f59e0b',
  'AlienVault OTX': '#14b8a6',
  NVD: '#8b5cf6',
};

const PROVIDER_ICONS = {
  VirusTotal: Shield,
  AbuseIPDB: AlertCircle,
  Shodan: Search,
  'AlienVault OTX': Shield,
  NVD: AlertCircle,
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export default function ProviderCard({ provider, index, onOpenDetail, onCopyRaw, copied, compact = false }) {
  const color = PROVIDER_COLORS[provider.provider] || '#64748b';
  const Icon = PROVIDER_ICONS[provider.provider] || Shield;
  const p = compact ? 'p-3' : 'p-5';

  if (!provider.available) {
    return (
      <motion.div
        variants={cardVariants}
        className={`relative bg-void-surface rounded-xl overflow-hidden border border-dashed border-ghost ${p}`}
      >
        {/* Scan-line effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-cyan-500/[0.03] to-transparent"
            style={{ animation: 'scan-vertical 2.5s linear infinite' }}
          />
        </div>
        <div className="flex items-center gap-2 mb-2 opacity-40">
          <Icon className="w-4 h-4" style={{ color: '#475569' }} />
          <span className="text-sm font-medium text-gray-500">{provider.provider}</span>
        </div>
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-gray-600" />
          <span className="text-xs text-gray-600 font-mono uppercase tracking-wider">Signal Lost</span>
        </div>
        <p className="text-xs text-gray-700 mt-2 leading-relaxed">{provider.summary}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, borderColor: color + '80' }}
      className="relative bg-void-surface rounded-xl overflow-hidden border border-ghost hover:shadow-lg transition-shadow duration-300 cursor-pointer group"
      style={{ '--glow-color': color + '20' }}
    >
      {/* Shimmer accent bar */}
      <div
        className="h-1 shimmer-bar"
        style={{ '--shimmer-color': color }}
      />

      {/* Subtle watermark */}
      {!compact && (
        <div className="absolute top-6 right-3 text-[9px] font-mono uppercase tracking-[0.2em] text-white/[0.025] rotate-0 select-none pointer-events-none">
          INTEL REPORT
        </div>
      )}

      <div className={p}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Icon className="w-4 h-4" style={{ color }} />
              <div
                className="absolute inset-0 rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity"
                style={{ background: color }}
              />
            </div>
            <span className="text-sm font-medium text-white">{provider.provider}</span>
          </div>
          <MiniGauge score={provider.riskScore} size={compact ? 36 : 44} id={`p-${index}`} />
        </div>

        <p className="text-xs text-gray-400 leading-relaxed mb-3">{provider.summary}</p>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetail?.(provider); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-ice transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" /> Expand Intel
          </button>
          {provider.rawData && (
            <button
              onClick={(e) => { e.stopPropagation(); onCopyRaw?.(provider.rawData, index); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-ice transition-colors cursor-pointer"
            >
              {copied ? (
                <motion.span initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-1 text-green-400">
                  <Check className="w-3 h-3" /> Copied
                </motion.span>
              ) : (
                <><Copy className="w-3 h-3" /> Copy Raw</>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
