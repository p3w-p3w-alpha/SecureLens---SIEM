import { useRef, useMemo, useState, useEffect, memo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, QuadraticBezierLine } from '@react-three/drei';
import * as THREE from 'three';

import { HOME_BASE } from './geoUtils';

function latLngToVec3(lat, lng, radius = 2) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

/* ── Globe wireframe sphere ──────────────────────────────────────────── */
function GlobeSphere() {
  const meshRef = useRef();
  useFrame(() => {
    if (meshRef.current) meshRef.current.rotation.y += 0.001;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 48, 48]} />
      <meshBasicMaterial wireframe color="#1e3a5f" transparent opacity={0.12} />
    </mesh>
  );
}

/* ── Latitude/longitude grid lines ───────────────────────────────────── */
function GridLines() {
  const lines = useMemo(() => {
    const result = [];
    // Latitude lines every 30 degrees
    for (let lat = -60; lat <= 60; lat += 30) {
      const points = [];
      for (let lng = 0; lng <= 360; lng += 5) {
        points.push(latLngToVec3(lat, lng - 180, 2.005));
      }
      result.push(points);
    }
    // Longitude lines every 40 degrees
    for (let lng = -180; lng < 180; lng += 40) {
      const points = [];
      for (let lat = -80; lat <= 80; lat += 5) {
        points.push(latLngToVec3(lat, lng, 2.005));
      }
      result.push(points);
    }
    return result;
  }, []);

  return (
    <group>
      {lines.map((pts, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={pts.length}
              array={new Float32Array(pts.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#1e3a5f" transparent opacity={0.06} />
        </line>
      ))}
    </group>
  );
}

/* ── Glowing point on the globe ──────────────────────────────────────── */
function GlowPoint({ position, color = '#00d4ff', size = 0.04, pulse = true }) {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame(({ clock }) => {
    if (pulse && glowRef.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 2) * 0.3;
      glowRef.current.scale.setScalar(s);
    }
  });

  return (
    <group position={position}>
      {/* Core dot */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 3, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

/* ── Animated arc between two points ─────────────────────────────────── */
function ThreatArc({ from, to, color = '#00d4ff' }) {
  const midPoint = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(3.2); // lift arc above the globe
    return mid;
  }, [from, to]);

  return (
    <QuadraticBezierLine
      start={from}
      end={to}
      mid={midPoint}
      color={color}
      lineWidth={2}
      transparent
      opacity={0.6}
    />
  );
}

/* ── Main 3D scene ───────────────────────────────────────────────────── */
function GlobeScene({ threatLocation, isScanning, mini }) {
  const controlsRef = useRef();

  const threatVec = useMemo(
    () => threatLocation ? latLngToVec3(threatLocation.lat, threatLocation.lng) : null,
    [threatLocation]
  );
  const homeVec = useMemo(() => latLngToVec3(HOME_BASE.lat, HOME_BASE.lng), []);

  const riskColor = threatLocation?.riskScore > 70 ? '#ff2d55' :
                    threatLocation?.riskScore > 30 ? '#f59e0b' : '#00e68a';

  return (
    <>
      <ambientLight intensity={0.08} />
      <pointLight position={[10, 10, 10]} intensity={0.15} color="#00d4ff" />

      <Stars radius={80} depth={40} count={800} factor={1.5} fade speed={isScanning ? 2 : 0.3} />

      <OrbitControls
        ref={controlsRef}
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={isScanning ? 2.5 : 0.4}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
      />

      <GlobeSphere />
      <GridLines />

      {/* Home base — always visible */}
      <GlowPoint position={homeVec} color="#00d4ff" size={0.035} />
      {!mini && (
        <Html position={homeVec.clone().multiplyScalar(1.08)} center>
          <div className="text-[9px] font-mono text-cyber-cyan/60 whitespace-nowrap pointer-events-none select-none">
            HQ
          </div>
        </Html>
      )}

      {/* Threat location */}
      {threatVec && (
        <>
          <GlowPoint position={threatVec} color={riskColor} size={0.045} />
          <ThreatArc from={threatVec} to={homeVec} color={riskColor} />

          {!mini && (
            <Html position={threatVec.clone().multiplyScalar(1.12)} center>
              <div className="pointer-events-none select-none text-center">
                <div className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10"
                  style={{ color: riskColor }}>
                  {threatLocation.city || threatLocation.country}
                </div>
              </div>
            </Html>
          )}

          {/* Sonar rings when scanning */}
          {isScanning && [0, 1, 2].map(i => (
            <SonarRing key={i} position={threatVec} delay={i * 0.6} color={riskColor} />
          ))}
        </>
      )}
    </>
  );
}

function SonarRing({ position, delay, color }) {
  const ringRef = useRef();
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const t = ((clock.elapsedTime - delay) % 2) / 2;
      const scale = 0.5 + t * 2;
      ringRef.current.scale.setScalar(scale);
      ringRef.current.material.opacity = Math.max(0, 0.3 - t * 0.3);
    }
  });
  return (
    <mesh ref={ringRef} position={position}>
      <ringGeometry args={[0.08, 0.1, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}

/* ── Exported component ──────────────────────────────────────────────── */
const ThreatGlobe3D = memo(function ThreatGlobe3D({ threatLocation = null, isScanning = false, mini = false }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div className={`${mini ? 'h-[200px]' : 'h-[360px] lg:h-[420px]'} bg-cyber-deepest rounded-xl flex items-center justify-center`}>
        <div className="w-3 h-3 rounded-full bg-cyber-cyan/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`${mini ? 'h-[200px]' : 'h-[360px] lg:h-[420px]'} relative rounded-xl overflow-hidden`}
      style={{ background: 'radial-gradient(ellipse at center, #0a1628 0%, #050a18 100%)' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <GlobeScene threatLocation={threatLocation} isScanning={isScanning} mini={mini} />
      </Canvas>

      {/* Corner overlay info */}
      {!mini && (
        <>
          <div className="absolute bottom-3 left-4 pointer-events-none">
            <p className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">Threat Origin Map</p>
          </div>
          <div className="absolute top-3 right-4 pointer-events-none">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyber-cyan animate-pulse" />
              <span className="text-[10px] text-gray-600 font-mono">LIVE</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default ThreatGlobe3D;
