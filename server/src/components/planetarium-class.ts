// @ts-nocheck
/**
 * planetarium.js — real-time WebGL solar system + zodiac dome.
 *
 * Every body is positioned from the same ephemeris that builds the kundli:
 * heliocentric ecliptic coordinates in AU, scaled logarithmically so the
 * inner and outer planets are visible together. Drag to orbit, scroll to
 * zoom, click a planet for its karakatva.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SIGNS, GRAHAS, norm360, ayanamsa } from '../lib/engine/ephemeris';
import * as Astronomy from 'astronomy-engine';
import { GRAHA_INFO } from '../lib/engine/interpret';

const BODY_STYLE = {
  Sun: { radius: 2.1, color: 0xffb020, emissive: 0xff8a00, glow: 3.2 },
  Mercury: { radius: 0.42, color: 0x9c8f7d, orbit: 0x7d7466 },
  Venus: { radius: 0.62, color: 0xe4c07a, orbit: 0xb99a5e },
  Earth: { radius: 0.66, color: 0x3f7fd0, orbit: 0x4d7fbf },
  Mars: { radius: 0.5, color: 0xc75b3c, orbit: 0xa04a31 },
  Jupiter: { radius: 1.45, color: 0xd9a86c, orbit: 0xa88250 },
  Saturn: { radius: 1.25, color: 0xe0c68f, orbit: 0xa8946a, ring: true },
};

const ORDER = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn'];

/** Log-compress AU so Mercury and Saturn share one readable frame. */
function scaleAU(au) {
  return Math.log10(1 + au * 9) * 13.5;
}

export class Planetarium {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.onSelect = opts.onSelect || (() => {});
    this.simDate = opts.date ? new Date(opts.date) : new Date();
    this.speed = 1;          // days per second
    this.playing = true;
    this.showOrbits = true;
    this.showLabels = true;
    this.showZodiac = true;
    this.disposed = false;
    this._init();
  }

  _init() {
    const c = this.canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas: c, antialias: true, alpha: true, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(c.clientWidth, c.clientHeight, false);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(46, c.clientWidth / c.clientHeight, 0.1, 4000);
    this.camera.position.set(0, 34, 46);

    this.controls = new OrbitControls(this.camera, c);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 260;
    this.controls.autoRotate = false;

    // Cached EQJ→ECL rotation so every body sits in the true ecliptic plane.
    this._eqjToEcl = Astronomy.Rotation_EQJ_ECL();

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    this.sunLight = new THREE.PointLight(0xfff0d0, 3.4, 0, 1.4);
    this.scene.add(this.sunLight);

    this._buildStars();
    this._buildSun();
    this._buildPlanets();
    this._buildZodiacDome();

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this._bindEvents();

    this.clock = new THREE.Clock();
    this._loop();
  }

  /* ---------------- scene construction ---------------- */

  _buildStars() {
    const N = 3600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      // Uniform on a sphere
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
      const r = 900 + Math.random() * 900;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * s * Math.sin(th);
      const t = Math.random();
      c.setHSL(t < 0.7 ? 0.58 : 0.09, 0.25 + Math.random() * 0.35, 0.6 + Math.random() * 0.35);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(g, new THREE.PointsMaterial({
      size: 1.7, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: 0.85, depthWrite: false,
    }));
    this.scene.add(this.stars);
  }

  _buildSun() {
    const s = BODY_STYLE.Sun;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(s.radius, 48, 48),
      new THREE.MeshBasicMaterial({ color: s.color })
    );
    mesh.userData = { key: 'Sun' };
    this.scene.add(mesh);
    this.sunMesh = mesh;

    // Layered additive glow
    for (const [mult, op] of [[1.45, 0.30], [2.1, 0.16], [3.4, 0.07]]) {
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(s.radius * mult, 32, 32),
        new THREE.MeshBasicMaterial({
          color: s.emissive, transparent: true, opacity: op,
          blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide,
        })
      );
      mesh.add(halo);
    }
  }

  _buildPlanets() {
    this.planets = {};
    this.orbitLines = new THREE.Group();
    this.scene.add(this.orbitLines);
    this.labelGroup = [];

    for (const key of ORDER) {
      const st = BODY_STYLE[key];
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(st.radius, 40, 40),
        new THREE.MeshStandardMaterial({
          color: st.color, roughness: 0.78, metalness: 0.12,
          emissive: new THREE.Color(st.color).multiplyScalar(0.14),
        })
      );
      mesh.userData = { key };
      this.scene.add(mesh);

      // Selection ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(st.radius * 1.5, st.radius * 1.75, 48),
        new THREE.MeshBasicMaterial({
          color: 0xb0525c, transparent: true, opacity: 0,
          side: THREE.DoubleSide, depthWrite: false,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      mesh.add(ring);

      if (st.ring) {
        const rg = new THREE.Mesh(
          new THREE.RingGeometry(st.radius * 1.45, st.radius * 2.25, 72),
          new THREE.MeshBasicMaterial({
            color: 0xd8c79a, transparent: true, opacity: 0.42,
            side: THREE.DoubleSide, depthWrite: false,
          })
        );
        rg.rotation.x = -Math.PI / 2.35;
        mesh.add(rg);
      }

      this.planets[key] = { mesh, ring, style: st, trail: [] };
      this._buildOrbit(key);
    }

    // Earth's Moon
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xcfd4de, roughness: 0.95 })
    );
    moon.userData = { key: 'Moon' };
    this.scene.add(moon);
    this.moonMesh = moon;
  }

  /** Sample one real orbital period from the ephemeris — a true orbit path. */
  _buildOrbit(key) {
    const period = Astronomy.PlanetOrbitalPeriod(key); // days
    const pts = [];
    const steps = 220;
    for (let i = 0; i <= steps; i++) {
      const t = new Date(this.simDate.getTime() + (i / steps) * period * 86400000);
      pts.push(this._toScene(this._helio(key, Astronomy.MakeTime(t))));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: BODY_STYLE[key].orbit, transparent: true, opacity: 0.34,
    }));
    this.orbitLines.add(line);
  }

  /**
   * Heliocentric position in the ECLIPTIC frame (J2000).
   * HelioVector returns EQJ (equatorial) coordinates, which are tilted ~23.4°
   * from the ecliptic — rotating here is what keeps the planets in the plane
   * of the zodiac ring instead of on a skewed circle.
   */
  _helio(key, t) {
    return Astronomy.RotateVector(this._eqjToEcl, Astronomy.HelioVector(key, t));
  }

  /** Geocentric Moon vector, likewise converted to the ecliptic frame. */
  _geoMoon(t) {
    return Astronomy.RotateVector(this._eqjToEcl, Astronomy.GeoMoon(t));
  }

  /** Ecliptic AU → scene units (y is up, ecliptic plane = xz). */
  _toScene(v) {
    const r = Math.hypot(v.x, v.y, v.z);
    if (r === 0) return new THREE.Vector3();
    const k = scaleAU(r) / r;
    return new THREE.Vector3(v.x * k, v.z * k, -v.y * k);
  }

  /** The 12 sidereal rashi sectors projected onto a dome. */
  _buildZodiacDome() {
    this.zodiac = new THREE.Group();
    const R = 132;

    // Ecliptic circle
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(R - 0.35, R + 0.35, 256),
      new THREE.MeshBasicMaterial({
        color: 0xb0525c, transparent: true, opacity: 0.24,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    this.zodiac.add(ring);

    // Sector dividers every 30°
    for (let i = 0; i < 12; i++) {
      const a = (i * 30) * Math.PI / 180;
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(a) * (R - 7), 0, -Math.sin(a) * (R - 7)),
        new THREE.Vector3(Math.cos(a) * (R + 7), 0, -Math.sin(a) * (R + 7)),
      ]);
      this.zodiac.add(new THREE.Line(g, new THREE.LineBasicMaterial({
        color: 0xb0525c, transparent: true, opacity: 0.3,
      })));

      // Sign label sprite
      const mid = ((i * 30) + 15) * Math.PI / 180;
      const sp = this._makeLabel(`${SIGNS[i].symbol} ${SIGNS[i].sa}`, '#e6b9be', 34);
      sp.position.set(Math.cos(mid) * (R + 16), 1.5, -Math.sin(mid) * (R + 16));
      sp.scale.multiplyScalar(1.35);
      this.zodiac.add(sp);
    }
    this.scene.add(this.zodiac);
    this._orientZodiac();
  }

  /**
   * Rotate the dome so sector 0 begins at sidereal Aries 0°.
   * Scene azimuth runs opposite to ecliptic longitude (we negate y when
   * mapping AU → scene), so the ayanamsa offset is applied positively here.
   */
  _orientZodiac() {
    this.zodiac.rotation.y = ayanamsa(this.simDate, this.ayanamsaKey || 'lahiri') * Math.PI / 180;
  }

  setAyanamsa(key) { this.ayanamsaKey = key; this._orientZodiac(); }

  _makeLabel(text, color = '#f4ecd8', size = 40) {
    const cv = document.createElement('canvas');
    const ctx = cv.getContext('2d');
    ctx.font = `600 ${size}px "Cormorant Garamond", Georgia, serif`;
    const w = Math.ceil(ctx.measureText(text).width) + 20;
    cv.width = w; cv.height = size * 1.6;
    const c2 = cv.getContext('2d');
    c2.font = `600 ${size}px "Cormorant Garamond", Georgia, serif`;
    c2.fillStyle = color;
    c2.textBaseline = 'middle';
    c2.shadowColor = 'rgba(0,0,0,0.85)';
    c2.shadowBlur = 8;
    c2.fillText(text, 10, cv.height / 2);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, depthTest: false,
    }));
    sp.scale.set(cv.width / 10, cv.height / 10, 1);
    return sp;
  }

  /* ---------------- interaction ---------------- */

  _bindEvents() {
    this._onResize = () => this.resize();
    addEventListener('resize', this._onResize);

    this._onPointerDown = (e) => { this._downAt = { x: e.clientX, y: e.clientY, t: Date.now() }; };
    this._onPointerUp = (e) => {
      if (!this._downAt) return;
      const moved = Math.hypot(e.clientX - this._downAt.x, e.clientY - this._downAt.y);
      const quick = Date.now() - this._downAt.t < 400;
      if (moved < 6 && quick) this._pick(e);
      this._downAt = null;
    };
    this._onPointerMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      this._hoverCheck();
    };
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointerup', this._onPointerUp);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
  }

  _targets() {
    return [this.sunMesh, this.moonMesh, ...ORDER.map((k) => this.planets[k].mesh)];
  }

  _hoverCheck() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this._targets(), false)[0];
    this.canvas.style.cursor = hit ? 'pointer' : 'grab';
  }

  _pick(e) {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this._targets(), false)[0];
    if (!hit) { this.select(null); return; }
    this.select(hit.object.userData.key);
  }

  select(key) {
    this.selected = key;
    for (const [k, p] of Object.entries(this.planets)) {
      p.ring.material.opacity = k === key ? 0.9 : 0;
    }
    this.onSelect(key ? this._info(key) : null);
  }

  /** Live info for the side panel — real sidereal position at sim time. */
  _info(key) {
    const g = GRAHAS.find((x) => x.key === key) || { key, sa: key, glyph: '●' };
    const info = GRAHA_INFO[key];
    let extra = {};
    if (key !== 'Moon') {
      try {
        const v = Astronomy.HelioVector(key === 'Sun' ? 'Earth' : key, Astronomy.MakeTime(this.simDate));
        extra.distanceAU = Math.hypot(v.x, v.y, v.z);  // frame-independent magnitude
        extra.period = Astronomy.PlanetOrbitalPeriod(key === 'Sun' ? 'Earth' : key);
      } catch { /* Sun has no helio vector */ }
    }
    return {
      key, sanskrit: g.sa, glyph: g.glyph,
      karaka: info ? info.karaka : '',
      deity: info ? info.deity : '',
      gem: info ? info.gem : '',
      mantra: info ? info.mantra : '',
      ...extra,
      date: new Date(this.simDate),
    };
  }

  /* ---------------- animation ---------------- */

  setDate(d) {
    this.simDate = new Date(d);
    this._orientZodiac();
    this._update(0);
  }
  setSpeed(v) { this.speed = v; }
  setPlaying(v) { this.playing = v; }
  setOrbits(v) { this.showOrbits = v; this.orbitLines.visible = v; }
  setZodiac(v) { this.showZodiac = v; this.zodiac.visible = v; }
  setLabels(v) {
    this.showLabels = v;
    for (const l of this.labelGroup) l.visible = v;
  }

  /** Camera presets. */
  view(kind) {
    const p = { ecliptic: [0, 34, 46], top: [0, 74, 0.01], close: [0, 9, 17], wide: [0, 60, 96] }[kind] || [0, 34, 46];
    this._camTarget = new THREE.Vector3(...p);
  }

  _update(dt) {
    if (this.playing) {
      this.simDate = new Date(this.simDate.getTime() + dt * this.speed * 86400000);
      this._orientZodiac();
    }
    const t = Astronomy.MakeTime(this.simDate);

    for (const key of ORDER) {
      const p = this._toScene(this._helio(key, t));
      this.planets[key].mesh.position.copy(p);
      this.planets[key].mesh.rotation.y += dt * 0.4;
      if (!this.planets[key].label && this.showLabels) {
        const sp = this._makeLabel(key, '#cfd6e6', 30);
        this.planets[key].mesh.add(sp);
        sp.position.set(0, BODY_STYLE[key].radius + 1.1, 0);
        this.planets[key].label = sp;
        this.labelGroup.push(sp);
      }
    }

    // Moon orbits Earth (exaggerated for visibility)
    const earth = this.planets.Earth.mesh.position;
    const gm = this._geoMoon(t);
    const dir = new THREE.Vector3(gm.x, gm.z, -gm.y).normalize();
    this.moonMesh.position.copy(earth).add(dir.multiplyScalar(1.7));

    this.sunMesh.rotation.y += dt * 0.05;
    this.stars.rotation.y += dt * 0.002;

    if (this._camTarget) {
      this.camera.position.lerp(this._camTarget, 0.08);
      if (this.camera.position.distanceTo(this._camTarget) < 0.4) this._camTarget = null;
    }
  }

  _loop() {
    if (this.disposed) return;
    this._raf = requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this._update(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.onFrame) this.onFrame(this.simDate);
  }

  resize() {
    const c = this.canvas;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this._raf);
    removeEventListener('resize', this._onResize);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const m = Array.isArray(o.material) ? o.material : [o.material];
        m.forEach((x) => { if (x.map) x.map.dispose(); x.dispose(); });
      }
    });
    this.renderer.dispose();
  }
}

/** Feature test so we can fall back gracefully on old devices. */
export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
