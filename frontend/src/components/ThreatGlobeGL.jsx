import { useEffect, useRef, useState, useCallback, memo, lazy, Suspense } from 'react';

const GlobeGL = lazy(() => import('react-globe.gl'));

const EARTH_IMG = '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
const BUMP_IMG = '//unpkg.com/three-globe/example/img/earth-topology.png';
const BG_IMG = '//unpkg.com/three-globe/example/img/night-sky.png';

const ThreatGlobeGL = memo(function ThreatGlobeGL({
  height = 400,
  width: widthProp,
  interactive = true,
  arcsData = [],
  pointsData = [],
  ringsData = [],
  labelsData = [],
  autoRotateSpeed = 0.4,
  onPointClick,
  onGlobeReady,
  className = '',
  fullscreen = false,
  showBackground = true,
  initialPosition = { lat: 30, lng: 5, altitude: 2.2 },
}) {
  const globeRef = useRef();
  const containerRef = useRef();
  const [ready, setReady] = useState(false);
  const [dims, setDims] = useState({ w: 800, h: height });
  const resumeTimer = useRef(null);

  // Measure container for responsive sizing
  useEffect(() => {
    setReady(true);
    const measure = () => {
      if (fullscreen) {
        setDims({ w: window.innerWidth, h: window.innerHeight });
      } else if (containerRef.current) {
        setDims({ w: containerRef.current.offsetWidth, h: height });
      } else {
        setDims({ w: widthProp || Math.min(window.innerWidth - 80, 1200), h: height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [height, widthProp, fullscreen]);

  // Configure controls after globe mounts
  const configureControls = useCallback(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = autoRotateSpeed;
      controls.enableZoom = interactive;
      controls.enablePan = false;
      if (!interactive) controls.enableRotate = false;

      // Zoom limits
      if (interactive) {
        controls.minDistance = 200;
        controls.maxDistance = 600;
      }

      // Pause auto-rotation on interaction, resume after 3s
      if (interactive) {
        const onStart = () => {
          controls.autoRotate = false;
          if (resumeTimer.current) clearTimeout(resumeTimer.current);
        };
        const onEnd = () => {
          resumeTimer.current = setTimeout(() => {
            if (globeRef.current) {
              globeRef.current.controls().autoRotate = true;
            }
          }, 3000);
        };
        controls.addEventListener('start', onStart);
        controls.addEventListener('end', onEnd);
      }
    }

    // Set initial camera position
    if (initialPosition) {
      globeRef.current.pointOfView(initialPosition, 1000);
    }

    onGlobeReady?.(globeRef.current);
  }, [interactive, autoRotateSpeed, onGlobeReady, initialPosition]);

  useEffect(() => { if (ready) configureControls(); }, [ready, configureControls]);

  // Cleanup resume timer
  useEffect(() => {
    return () => { if (resumeTimer.current) clearTimeout(resumeTimer.current); };
  }, []);

  const containerClass = fullscreen
    ? `absolute inset-0 ${className}`
    : `relative overflow-hidden rounded-xl ${className}`;

  if (!ready) {
    return (
      <div ref={containerRef} className={`flex items-center justify-center bg-transparent ${containerClass}`} style={fullscreen ? {} : { height }}>
        <div className="w-3 h-3 rounded-full bg-ice/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className={containerClass} style={fullscreen ? {} : { height }}>
      <Suspense fallback={<div className="flex items-center justify-center w-full h-full bg-transparent"><div className="w-3 h-3 rounded-full bg-ice/30 animate-pulse" /></div>}>
        <GlobeGL
          ref={globeRef}
          width={dims.w}
          height={dims.h}
          globeImageUrl={EARTH_IMG}
          bumpImageUrl={BUMP_IMG}
          backgroundImageUrl={showBackground ? BG_IMG : undefined}
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={true}
          atmosphereColor="#00d4ff"
          atmosphereAltitude={0.18}
          animateIn={true}
          enablePointerInteraction={interactive}
          // Arcs — high quality
          arcsData={arcsData}
          arcColor={d => d.color || '#00d4ff'}
          arcAltitude={0.4}
          arcStroke={0.4}
          arcDashLength={0.4}
          arcDashGap={0.15}
          arcDashAnimateTime={1800}
          // Points — data-driven
          pointsData={pointsData}
          pointColor={d => d.color || '#00d4ff'}
          pointAltitude={d => {
            const count = d.alertCount || d.count || 1;
            return count > 10 ? 0.08 : count > 3 ? 0.05 : 0.02;
          }}
          pointRadius={d => {
            const count = d.alertCount || d.count || 1;
            return count > 10 ? 0.6 : count > 3 ? 0.4 : d.size || 0.25;
          }}
          pointsMerge={false}
          onPointClick={onPointClick}
          pointLabel={d => d.label ? `<div style="color:#7dd3fc;font-family:'JetBrains Mono',monospace;font-size:10px;background:rgba(6,6,10,0.9);padding:3px 8px;border-radius:6px;border:1px solid rgba(125,211,252,0.2);backdrop-filter:blur(8px)">${d.label}${d.count ? ` <span style="color:#ef4444;font-weight:600">(${d.count})</span>` : ''}</div>` : ''}
          // Rings
          ringsData={ringsData}
          ringColor={() => t => `rgba(0,212,255,${1 - t})`}
          ringMaxRadius={3}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1000}
          // Labels
          labelsData={labelsData}
          labelColor={() => '#7dd3fc'}
          labelSize={1.2}
          labelDotRadius={0.4}
          labelAltitude={0.01}
        />
      </Suspense>
    </div>
  );
});

export default ThreatGlobeGL;
