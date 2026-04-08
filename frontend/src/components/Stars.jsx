import { useMemo } from 'react';

export default function Stars() {
  const particles = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      left: `${5 + Math.random() * 90}%`,
      top: `${5 + Math.random() * 90}%`,
      d: `${15 + Math.random() * 12}s`,
      delay: `${Math.random() * 8}s`,
    })), []);

  return (
    <div className="void-particles">
      {particles.map((p, i) => (
        <div key={i} className="void-particle" style={{ left: p.left, top: p.top, '--d': p.d, '--delay': p.delay }} />
      ))}
    </div>
  );
}
