import { useState } from 'react';
import { motion } from 'framer-motion';

export default function HudFrame({ children, className = '', pulse = false, scan = false }) {
  const [hovered, setHovered] = useState(false);

  const bracketSize = hovered ? 18 : 12;
  const bracketOpacity = hovered ? 0.6 : 0.25;
  const spring = { type: 'spring', stiffness: 300, damping: 20 };

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={pulse ? { animation: 'hud-pulse 3s ease-in-out infinite' } : undefined}
    >
      {/* Card body */}
      <div className="void-card h-full">
        {children}
      </div>

      {/* L-shaped corner brackets — all 4 corners */}
      {[
        { top: -1, left: -1, borderWidth: '1px 0 0 1px', radius: '3px 0 0 0' },
        { top: -1, right: -1, borderWidth: '1px 1px 0 0', radius: '0 3px 0 0' },
        { bottom: -1, left: -1, borderWidth: '0 0 1px 1px', radius: '0 0 0 3px' },
        { bottom: -1, right: -1, borderWidth: '0 1px 1px 0', radius: '0 0 3px 0' },
      ].map((pos, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none z-10"
          animate={{ width: bracketSize, height: bracketSize, opacity: bracketOpacity }}
          transition={spring}
          style={{
            ...pos,
            borderStyle: 'solid',
            borderColor: '#7dd3fc',
            borderWidth: pos.borderWidth,
            borderRadius: pos.radius,
          }}
        />
      ))}

      {/* Scan-line on hover */}
      {scan && hovered && (
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none z-20"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(125,211,252,0.4), transparent)' }}
          initial={{ top: '0%', opacity: 0 }}
          animate={{ top: '100%', opacity: [0, 0.8, 0.8, 0] }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          key={Date.now()}
        />
      )}
    </div>
  );
}
