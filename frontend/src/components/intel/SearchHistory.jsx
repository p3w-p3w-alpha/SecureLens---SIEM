import { motion, AnimatePresence } from 'framer-motion';

const TYPE_BADGE = {
  IP: 'bg-ice/20 text-ice border-ice/30',
  CVE: 'bg-sev-high/20 text-sev-high border-sev-high/30',
  HASH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

function riskColor(score) {
  if (score <= 30) return '#00e68a';
  if (score <= 70) return '#f59e0b';
  return '#ff2d55';
}

export default function SearchHistory({ history, onReSearch }) {
  if (!history.length) return null;

  return (
    <div className="border-t border-ghost pt-4">
      <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.15em] font-mono mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-ice/40" />
        Investigation Log
      </h3>
      <div className="space-y-0.5">
        <AnimatePresence>
          {history.map((h) => (
            <motion.div
              key={h.query + h.time}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={() => onReSearch(h.query)}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-void-surface cursor-pointer transition-colors group"
              style={{ borderLeft: `2px solid ${riskColor(h.score)}30` }}
            >
              <span className="text-[10px] font-mono text-gray-600 tabular-nums whitespace-nowrap">
                {new Date(h.time).toLocaleTimeString('en-US', { hour12: false })}
              </span>
              <span className="text-sm font-mono text-ice group-hover:text-white transition-colors">
                {h.query}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TYPE_BADGE[h.type] || ''}`}>
                {h.type}
              </span>
              <span
                className="text-xs font-mono font-medium ml-auto"
                style={{ color: riskColor(h.score) }}
              >
                {h.score}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
