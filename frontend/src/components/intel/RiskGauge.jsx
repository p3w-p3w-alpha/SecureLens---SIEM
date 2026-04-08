import { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

function riskGradient(score) {
  if (score <= 30) return ['#10b981', '#00e68a'];
  if (score <= 70) return ['#eab308', '#f59e0b'];
  return ['#ef4444', '#ff2d55'];
}

function riskColor(score) {
  if (score <= 30) return '#00e68a';
  if (score <= 70) return '#f59e0b';
  return '#ff2d55';
}

export default function RiskGauge({ score, size = 160, id = 'main' }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const [c1, c2] = riskGradient(score);
  const glowColor = riskColor(score);

  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 40, damping: 12 });
  const display = useTransform(spring, v => Math.round(v));
  const [text, setText] = useState(0);

  useEffect(() => { mv.set(score); }, [score, mv]);
  useEffect(() => display.on('change', v => setText(v)), [display]);

  const innerR = r - 12;
  const innerCirc = 2 * Math.PI * innerR;
  const orbitR = r + 14;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-20 transition-colors duration-1000"
        style={{
          background: `radial-gradient(circle, ${glowColor}40 0%, transparent 70%)`,
          animation: 'pulse-glow 3s ease-in-out infinite',
          '--glow-color': `${glowColor}30`,
        }}
      />

      {/* Orbiting dots */}
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="absolute"
          style={{
            width: 3, height: 3, borderRadius: '50%',
            background: glowColor, opacity: 0.4,
            left: '50%', top: '50%',
            marginLeft: -1.5, marginTop: -1.5,
            animation: `orbit ${8 + i * 4}s linear infinite`,
            animationDelay: `${i * -2.5}s`,
            '--orbit-r': `${orbitR}px`,
          }}
        />
      ))}

      <svg width={size} height={size} className="transform -rotate-90 relative z-10">
        <defs>
          <linearGradient id={`rg-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <filter id={`rg-glow-${id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e3a5f" strokeWidth={5} opacity={0.5} />

        {/* Inner dashed rotating ring */}
        <circle
          cx={size/2} cy={size/2} r={innerR} fill="none" stroke="#1e3a5f" strokeWidth={1}
          strokeDasharray="4 8" opacity={0.3}
          style={{ transformOrigin: 'center', animation: 'rotate-slow 20s linear infinite' }}
        />

        {/* Animated arc */}
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#rg-${id})`} strokeWidth={5}
          strokeLinecap="round" filter={`url(#rg-glow-${id})`}
          initial={{ strokeDasharray: circ, strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * score) / 100 }}
          transition={{ type: 'spring', stiffness: 40, damping: 12, duration: 2 }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
        <span className="font-mono font-bold leading-none" style={{ color: c2, fontSize: size * 0.22 }}>
          {text}
        </span>
        <span className="text-gray-500 font-mono" style={{ fontSize: size * 0.08 }}>/100</span>
      </div>
    </div>
  );
}
