import { motion } from 'framer-motion';

function riskColor(score) {
  if (score <= 30) return '#00e68a';
  if (score <= 70) return '#f59e0b';
  return '#ff2d55';
}

export default function MiniGauge({ score, size = 44, id = 'mini' }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const color = riskColor(score);

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e3a5f" strokeWidth={3} opacity={0.5} />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeLinecap="round"
        initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - (circ * score) / 100 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
      <text
        x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.28} fontWeight="bold"
        className="rotate-90" style={{ transformOrigin: 'center' }}
      >
        {score}
      </text>
    </svg>
  );
}
