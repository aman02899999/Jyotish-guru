"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

/**
 * The hero's signature 3D moment: the Navagraha (9 grahas) orbiting Surya,
 * the same system the app's birth-chart feature places every user's planets
 * into - not a generic rotating object. Camera pulls back as the visitor
 * scrolls through the hero, then settles (it does not loop or scroll-jack
 * the rest of the page). Planets keep a slow ambient orbit throughout,
 * since a frozen "orbital system" wouldn't read as one.
 */

interface GrahaDef {
  name: string;
  radius: number;
  size: number;
  speed: number;
  color: string;
  tilt: number;
}

const GRAHAS: GrahaDef[] = [
  { name: "Chandra", radius: 1.5, size: 0.09, speed: 0.55, color: "#fed7aa", tilt: 0.05 },
  { name: "Budh", radius: 2.1, size: 0.1, speed: 0.42, color: "#ea580c", tilt: -0.08 },
  { name: "Shukra", radius: 2.7, size: 0.14, speed: 0.34, color: "#fdba74", tilt: 0.1 },
  { name: "Mangal", radius: 3.3, size: 0.12, speed: 0.27, color: "#b45309", tilt: -0.05 },
  { name: "Rahu", radius: 3.9, size: 0.07, speed: 0.22, color: "#2a1b12", tilt: 0.15 },
  { name: "Guru", radius: 4.6, size: 0.26, speed: 0.17, color: "#c2600d", tilt: -0.12 },
  { name: "Shani", radius: 5.4, size: 0.21, speed: 0.13, color: "#9a3412", tilt: 0.08 },
  { name: "Ketu", radius: 6.1, size: 0.07, speed: 0.1, color: "#5c3a24", tilt: -0.1 },
];

function Sun() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial emissive="#ea580c" emissiveIntensity={2.2} color="#fdba74" toneMapped={false} />
      </mesh>
      {/* Cheap glow: additive transparent shells instead of a bloom post-process pass. */}
      <mesh>
        <sphereGeometry args={[0.75, 24, 24]} />
        <meshBasicMaterial color="#ea580c" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.05, 24, 24]} />
        <meshBasicMaterial color="#fdba74" transparent opacity={0.08} depthWrite={false} />
      </mesh>
      <pointLight color="#fed7aa" intensity={3} distance={20} decay={1.5} />
    </group>
  );
}

function OrbitRing({ radius, tilt }: { radius: number; tilt: number }) {
  const points = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
    }
    return pts;
  }, [radius]);

  return <Line points={points} color="#9a3412" transparent opacity={0.22} rotation={[tilt, 0, 0]} />;
}

function Graha({ def }: { def: GrahaDef }) {
  const ref = useRef<THREE.Mesh>(null);
  const [initialAngle] = useState(() => Math.random() * Math.PI * 2);
  const angleRef = useRef(initialAngle);

  useFrame((_, delta) => {
    angleRef.current += delta * def.speed;
    if (ref.current) {
      const x = Math.cos(angleRef.current) * def.radius;
      const z = Math.sin(angleRef.current) * def.radius;
      const y = Math.sin(angleRef.current) * def.radius * Math.sin(def.tilt);
      ref.current.position.set(x, y, z);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[def.size, 20, 20]} />
      <meshStandardMaterial color={def.color} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

function CameraRig({ scrollProgressRef }: { scrollProgressRef: React.RefObject<number> }) {
  useFrame(({ camera }, delta) => {
    const progress = Math.min(1, Math.max(0, scrollProgressRef.current));
    // Eased dolly-back-and-up: starts close and centered, settles wide and slightly elevated.
    const eased = 1 - Math.pow(1 - progress, 3);
    const targetZ = 8 + eased * 5.5;
    const targetY = 2.5 + eased * 3.5;
    camera.position.z += (targetZ - camera.position.z) * Math.min(1, delta * 3);
    camera.position.y += (targetY - camera.position.y) * Math.min(1, delta * 3);
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Scene({ scrollProgressRef }: { scrollProgressRef: React.RefObject<number> }) {
  return (
    <>
      <ambientLight intensity={0.35} color="#fbf1e1" />
      <Sun />
      {GRAHAS.map((g) => (
        <group key={g.name}>
          <OrbitRing radius={g.radius} tilt={g.tilt} />
          <Graha def={g} />
        </group>
      ))}
      <CameraRig scrollProgressRef={scrollProgressRef} />
    </>
  );
}

/** Static, no-WebGL fallback: prefers-reduced-motion, small viewports, or a WebGL init failure. */
function StaticFallback() {
  return (
    <div
      className="h-full w-full rounded-full"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, #fdba74 0%, #ea580c 22%, transparent 45%), radial-gradient(circle at 50% 50%, transparent 40%, rgba(154,52,18,0.15) 55%, transparent 70%)",
      }}
    />
  );
}

/**
 * Wraps the hero's HTML content with the 3D scene pinned behind it as a
 * full-bleed background layer. Manages its own scroll-progress measurement
 * internally (against its own container) so the server-rendered landing
 * page doesn't need to create refs itself.
 */
function subscribeToViewportChanges(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  window.addEventListener("resize", callback);
  return () => {
    mediaQuery.removeEventListener("change", callback);
    window.removeEventListener("resize", callback);
  };
}

function getCanRender3DSnapshot(): boolean {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isNarrow = window.innerWidth < 640;
  return !prefersReducedMotion && !isNarrow;
}

function getServerSnapshot(): boolean {
  return false;
}

export function NavagrahaHero({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canRender3D = useSyncExternalStore(subscribeToViewportChanges, getCanRender3DSnapshot, getServerSnapshot);
  const [hasError, setHasError] = useState(false);
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    if (!canRender3D) return;
    function onScroll() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height;
      const scrolled = Math.min(total, Math.max(0, -rect.top));
      scrollProgressRef.current = total > 0 ? scrolled / total : 0;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [canRender3D]);

  return (
    <div ref={containerRef} className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] opacity-80">
        {!canRender3D || hasError ? (
          <StaticFallback />
        ) : (
          <Canvas
            dpr={[1, 1.5]}
            camera={{ position: [0, 2.5, 8], fov: 45 }}
            onError={() => setHasError(true)}
            gl={{ antialias: true, alpha: true }}
          >
            <Scene scrollProgressRef={scrollProgressRef} />
          </Canvas>
        )}
      </div>
      {children}
    </div>
  );
}
