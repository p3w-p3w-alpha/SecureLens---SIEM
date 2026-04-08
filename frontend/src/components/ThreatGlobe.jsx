import { useEffect, useRef } from 'react';

const THREAT_POINTS = [
  { lat: 51.2, lng: 10.4, label: 'DE', color: '#ff2d55' },
  { lat: 40.7, lng: -74.0, label: 'US-NY', color: '#ff6b35' },
  { lat: 55.7, lng: 37.6, label: 'RU', color: '#ff2d55' },
  { lat: 35.7, lng: 139.7, label: 'JP', color: '#ffb800' },
  { lat: -33.9, lng: 151.2, label: 'AU', color: '#3b82f6' },
  { lat: 39.9, lng: 116.4, label: 'CN', color: '#ff6b35' },
];
const HOME = { lat: 37.8, lng: -122.4 };

function latLngToXY(lat, lng, w, h) {
  return { x: ((lng + 180) / 360) * w, y: ((90 - lat) / 180) * h };
}

export default function ThreatGlobe({ alertCount = 0 }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2;
    const h = canvas.height = canvas.offsetHeight * 2;
    ctx.scale(1, 1);
    let animFrame;

    const draw = () => {
      frameRef.current++;
      ctx.clearRect(0, 0, w, h);

      // Grid dots
      ctx.fillStyle = '#1e3a5f30';
      for (let x = 0; x < w; x += 20) {
        for (let y = 0; y < h; y += 20) {
          ctx.beginPath();
          ctx.arc(x, y, 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw arcs from threats to home
      const home = latLngToXY(HOME.lat, HOME.lng, w, h);
      THREAT_POINTS.forEach((pt, i) => {
        const src = latLngToXY(pt.lat, pt.lng, w, h);
        const progress = ((frameRef.current + i * 40) % 200) / 200;

        // Arc
        ctx.strokeStyle = pt.color + '40';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const cpY = Math.min(src.y, home.y) - 60 - i * 15;
        ctx.moveTo(src.x, src.y);
        ctx.quadraticCurveTo((src.x + home.x) / 2, cpY, home.x, home.y);
        ctx.stroke();

        // Traveling dot
        const t = progress;
        const dotX = (1-t)*(1-t)*src.x + 2*(1-t)*t*((src.x+home.x)/2) + t*t*home.x;
        const dotY = (1-t)*(1-t)*src.y + 2*(1-t)*t*cpY + t*t*home.y;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
        ctx.fillStyle = pt.color + '30';
        ctx.fill();

        // Source dot (pulsing)
        const pulse = Math.sin(frameRef.current * 0.05 + i) * 2 + 5;
        ctx.beginPath();
        ctx.arc(src.x, src.y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = pt.color + '50';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(src.x, src.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
      });

      // Home dot (cyan glow)
      const pulse = Math.sin(frameRef.current * 0.03) * 3 + 8;
      ctx.beginPath();
      ctx.arc(home.x, home.y, pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4ff20';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(home.x, home.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#00d4ff';
      ctx.fill();

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, []);

  return (
    <div className="relative bg-cyber-card rounded-xl border border-cyber-border overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-64"
        style={{ imageRendering: 'auto' }}
      />
      <div className="absolute bottom-3 left-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Active Threat Sources</p>
        <p className="text-lg font-bold text-cyber-cyan">{THREAT_POINTS.length} Regions</p>
      </div>
      <div className="absolute top-3 right-4">
        <span className="text-xs text-gray-500">{alertCount} alerts tracked</span>
      </div>
    </div>
  );
}
