import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import ReactMarkdown from "react-markdown";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import { Download, ExternalLink, Activity, Bell, RefreshCw, Palette, Users, Zap, Cpu } from "lucide-react";

const GITHUB_API = "https://api.github.com/repos/R-7wX/RoRejoinX/releases";

function useLatestRelease() {
  const [state, setState] = useState({ loading: true, version: null, body: null, exeUrl: null, releaseUrl: "https://github.com/R-7wX/RoRejoinX/releases", error: null });
  useEffect(() => {
    fetch(GITHUB_API, { headers: { Accept: "application/vnd.github+json" } })
      .then(r => r.json())
      .then(releases => {
        const rel = releases.find(r => !r.draft);
        if (!rel) throw new Error("No releases");
        let foundExeUrl = null;
        for (const r of releases) {
            if (r.draft) continue;
            const exeAsset = r.assets?.find(a => a.name.toLowerCase().includes("updater") && a.name.endsWith(".exe"));
            if (exeAsset) {
                foundExeUrl = exeAsset.browser_download_url;
                break;
            }
        }
        setState({ loading: false, version: rel.tag_name?.replace(/^v/, ""), body: rel.body || "", exeUrl: foundExeUrl || rel.html_url, releaseUrl: rel.html_url, error: null });
      })
      .catch(e => setState(s => ({ ...s, loading: false, error: e.message })));
  }, []);
  return state;
}

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    // --- Scene & Fog ---
    const scene = new THREE.Scene();
    // Cyber void fog - blends smoothly into deep cyber dark blue / black
    scene.fog = new THREE.FogExp2(0x020617, 0.042);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 120);
    camera.position.set(0, 1.8, 5.5);
    camera.lookAt(0, 0, -2);

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // --- Dynamic Interactive Ground Cyber Grid ---
    const gridCols = 55;
    const gridRows = 55;
    const gridWidth = 72;
    const gridLength = 72;
    const groundGeo = new THREE.PlaneGeometry(gridWidth, gridLength, gridCols, gridRows);
    groundGeo.rotateX(-Math.PI / 2);

    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = -2.2;
    scene.add(groundMesh);

    // Glowing Neon Points at Grid Intersections
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', groundGeo.attributes.position);
    const pointsMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.15,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
    });
    const groundPoints = new THREE.Points(pointsGeo, pointsMat);
    groundPoints.position.y = groundMesh.position.y;
    scene.add(groundPoints);

    // --- Upper Cyber Ceiling Grid ---
    const ceilingGeo = new THREE.PlaneGeometry(72, 72, 36, 36);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceilingMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.y = 8.5;
    scene.add(ceilingMesh);

    // --- Floating Holographic Cyber Crystals / Polyhedrons ---
    const crystals = [];
    const crystalGeos = [
      new THREE.IcosahedronGeometry(0.55, 0),
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.TetrahedronGeometry(0.5, 0),
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
    ];
    const crystalColors = [0x00f0ff, 0x00a8ff, 0x818cf8, 0x38bdf8];

    for (let i = 0; i < 18; i++) {
      const geo = crystalGeos[i % crystalGeos.length];
      const color = crystalColors[i % crystalColors.length];

      const mat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: true,
        transparent: true,
        opacity: 0.35 + Math.random() * 0.25,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);

      const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 3.5 + Math.random() * 7;
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.y = -0.5 + Math.random() * 4.5;
      mesh.position.z = -2 + (Math.random() - 0.5) * 10;

      mesh.userData = {
        rotX: (Math.random() - 0.5) * 0.015,
        rotY: (Math.random() - 0.5) * 0.02,
        rotZ: (Math.random() - 0.5) * 0.01,
        initialY: mesh.position.y,
        floatSpeed: 0.8 + Math.random() * 1.2,
        floatOffset: Math.random() * Math.PI * 2,
      };

      scene.add(mesh);
      crystals.push(mesh);
    }

    // --- Cyber Floating Particle Field (Data Packets) ---
    const particleCount = 450;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3 + 0] = (Math.random() - 0.5) * 45;
      particlePositions[i * 3 + 1] = -2 + Math.random() * 9;
      particlePositions[i * 3 + 2] = -20 + Math.random() * 30;

      particleVelocities.push({
        x: (Math.random() - 0.5) * 0.006,
        y: 0.004 + Math.random() * 0.008,
        z: 0.01 + Math.random() * 0.02,
      });
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x00e5ff,
      size: 0.11,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // --- Dynamic Interactive 3D Lighting ---
    const cursorLight = new THREE.PointLight(0x00f0ff, 4.5, 18);
    cursorLight.position.set(0, 0, 3);
    scene.add(cursorLight);

    const ambientLight = new THREE.AmbientLight(0x020617, 1.5);
    scene.add(ambientLight);

    const horizonLight = new THREE.PointLight(0x3b82f6, 3, 40);
    horizonLight.position.set(0, 0, -25);
    scene.add(horizonLight);

    // --- Mouse & Touch Interaction ---
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;
    let clickShockwave = { active: false, x: 0, z: 0, radius: 0, strength: 0 };

    const onMouseMove = (e) => {
      const nx = (e.clientX / w) * 2 - 1;
      const ny = -(e.clientY / h) * 2 + 1;
      targetMouseX = nx;
      targetMouseY = ny;
    };

    const onClick = (e) => {
      const nx = (e.clientX / w) * 2 - 1;
      clickShockwave.active = true;
      clickShockwave.x = nx * 10;
      clickShockwave.z = 0;
      clickShockwave.radius = 0;
      clickShockwave.strength = 1.6;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("click", onClick, { passive: true });

    // --- Animation Loop ---
    let clock = new THREE.Clock();
    let animId = null;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Smooth mouse lerp
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      // Camera Parallax
      camera.position.x = mouseX * 1.2;
      camera.position.y = 1.8 + mouseY * 0.7;
      camera.lookAt(mouseX * 0.4, -0.2 + mouseY * 0.3, -3);

      // Update Cursor 3D Point Light
      cursorLight.position.x = mouseX * 8;
      cursorLight.position.y = -0.5 + mouseY * 4;
      cursorLight.position.z = 2.5;

      // Pulsing horizon glow
      horizonLight.intensity = 2.5 + Math.sin(time * 2) * 0.8;

      // Animate Ground Cyber Waves & Interactive Ripples
      const positions = groundGeo.attributes.position.array;
      const waveSpeed = time * 2.2;

      if (clickShockwave.active) {
        clickShockwave.radius += delta * 18;
        clickShockwave.strength *= 0.96;
        if (clickShockwave.strength < 0.02 || clickShockwave.radius > 50) {
          clickShockwave.active = false;
        }
      }

      const count = groundGeo.attributes.position.count;
      for (let i = 0; i < count; i++) {
        const vx = positions[i * 3 + 0];
        const vz = positions[i * 3 + 2];

        // Rolling cyber wave
        let vy = Math.sin(vx * 0.18 + waveSpeed) * 0.45 
               + Math.cos(vz * 0.14 + waveSpeed * 0.8) * 0.45;

        // Interactive mouse proximity wave
        const dx = vx - (mouseX * 12);
        const dz = vz - (-2 - mouseY * 6);
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 14) {
          const factor = Math.cos((dist / 14) * Math.PI * 0.5);
          vy += factor * 0.9 * Math.sin(dist * 0.8 - time * 4);
        }

        // Click shockwave expansion
        if (clickShockwave.active) {
          const sDist = Math.hypot(vx - clickShockwave.x, vz - clickShockwave.z);
          const diff = Math.abs(sDist - clickShockwave.radius);
          if (diff < 3.5) {
            vy += Math.sin((1 - diff / 3.5) * Math.PI) * clickShockwave.strength;
          }
        }

        positions[i * 3 + 1] = vy;
      }
      groundGeo.attributes.position.needsUpdate = true;
      groundPoints.geometry.attributes.position.needsUpdate = true;

      // Forward motion on ceiling grid
      ceilingMesh.position.z = (time * 2) % 2;

      // Animate Floating Cyber Crystals
      crystals.forEach((mesh) => {
        mesh.rotation.x += mesh.userData.rotX;
        mesh.rotation.y += mesh.userData.rotY;
        mesh.rotation.z += mesh.userData.rotZ;
        mesh.position.y = mesh.userData.initialY + Math.sin(time * mesh.userData.floatSpeed + mesh.userData.floatOffset) * 0.35;
        mesh.position.x += ((mesh.position.x + mouseX * 0.3) - mesh.position.x) * 0.02;
      });

      // Animate Particles (Cyber Data Stream)
      const pArr = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3;
        const vel = particleVelocities[i];

        pArr[idx + 1] += vel.y;
        pArr[idx + 2] += vel.z;

        if (pArr[idx + 2] > 6) {
          pArr[idx + 2] = -22;
          pArr[idx + 1] = -2 + Math.random() * 4;
        }
        if (pArr[idx + 1] > 8) {
          pArr[idx + 1] = -2;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // --- Window Resize Handling ---
    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", handleResize);

      if (container && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      groundGeo.dispose();
      groundMat.dispose();
      pointsGeo.dispose();
      pointsMat.dispose();
      ceilingGeo.dispose();
      ceilingMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      crystalGeos.forEach(g => g.dispose());
      crystals.forEach(c => c.material.dispose());
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 z-[-1] pointer-events-none bg-gradient-to-b from-[#020617] via-[#01030a] to-[#000000]"
    >
      {/* Cyber Ambient Glows & Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_15%,rgba(0,180,216,0.14),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_85%,rgba(99,102,241,0.10),transparent_65%)] pointer-events-none" />
      {/* Subtle Cyber scanline overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,38,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] pointer-events-none opacity-40" />
    </div>
  );
}

const FEATURES = [
  { icon: Users, title: "Multi-Account Support", desc: "Run and monitor multiple Roblox accounts simultaneously from a single lightweight dashboard." },
  { icon: Zap, title: "Auto Rejoin", desc: "Detects crashes and connection drops instantly, relaunching your accounts right back into the game." },
  { icon: Cpu, title: "Memory Limiter", desc: "Set exact RAM limits. Safely flushes unused memory or restarts if the limit is exceeded." },
  { icon: Bell, title: "Discord Webhooks", desc: "Get rich embed notifications to your Discord channel with real-time crash screenshots." },
  { icon: Palette, title: "Deep Customization", desc: "Custom themes, compact mini-widget mode, and complete control over the watchdog behavior." },
  { icon: RefreshCw, title: "Auto-Updates", desc: "One-click updates via the built-in updater. Always stay current with the latest patches." },
];


function SystemStatus() {
  const [hover, setHover] = useState(false);
  return (
    <div 
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 cursor-pointer backdrop-blur-md hover:bg-white/10 transition-colors"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="w-2 h-2 rounded-full bg-[#00a8ff] animate-pulse shadow-[0_0_10px_#00a8ff]" />
      <span className="text-xs font-semibold text-neutral-300">Systems Online</span>
      <AnimatePresence>
        {hover && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 w-48 p-3 rounded-xl bg-[#020617]/90 border border-[#00a8ff]/30 backdrop-blur-xl shadow-2xl z-50"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-neutral-400">API Status</span>
              <span className="text-xs text-[#00a8ff]">Connected</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-neutral-400">Latency</span>
              <span className="text-xs text-[#00a8ff]">12ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-neutral-400">Watchdog</span>
              <span className="text-xs text-[#00a8ff]">Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function MagneticButton({ children, href, primary }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15, mass: 0.5 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15, mass: 0.5 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    x.set(mouseX * 0.3);
    y.set(mouseY * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      href={href}
      target={primary ? "_self" : "_blank"}
      rel={primary ? "" : "noreferrer"}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: mouseXSpring, y: mouseYSpring }}
      className={`group relative flex items-center gap-3 px-8 py-4 font-bold rounded-xl overflow-hidden transition-transform shadow-2xl ${primary ? 'bg-[#00a8ff] text-[#050907] shadow-[0_0_40px_-10px_rgba(0,168,255,0.4)]' : 'text-white border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10'}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {primary && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />}
      {children}
    </motion.a>
  );
}

function FeatureCard({ icon: Icon, title, desc, delay }) {
  const [ref, visible] = useScrollReveal();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 600, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 600, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div 
      ref={ref} 
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative p-6 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-md hover:bg-white/[0.06] hover:border-[#00a8ff]/50 hover:shadow-[0_0_40px_-10px_rgba(0,168,255,0.3)] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`} 
    >
      <div style={{ transform: "translateZ(30px)" }} className="relative z-10 w-12 h-12 rounded-xl bg-[#00a8ff]/10 flex items-center justify-center mb-6 shadow-lg shadow-[#00a8ff]/5 transition-colors">
        <Icon size={24} className="text-[#00a8ff]" />
      </div>
      <h3 style={{ transform: "translateZ(20px)" }} className="relative z-10 text-white font-bold text-lg mb-3">{title}</h3>
      <p style={{ transform: "translateZ(10px)" }} className="relative z-10 text-neutral-400 text-sm leading-relaxed">{desc}</p>
      
      {/* 3D Glow Effect */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00a8ff]/0 to-[#00a8ff]/0 group-hover:from-[#00a8ff]/5 group-hover:to-transparent pointer-events-none transition-all duration-500" />
    </motion.div>
  );
}


function InteractiveMockup() {
  const [index, setIndex] = useState(0);
  const images = ["/new_mockup_home.png", "/new_mockup_accounts.png", "/new_mockup_activity.png", "/new_mockup_stats.png", "/new_mockup_info.png", "/new_mockup_settings.png"];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div 
      className="relative w-full aspect-video flex items-center justify-center cursor-pointer perspective-[2000px]"
      onClick={() => setIndex((i) => (i + 1) % images.length)}
    >
      <AnimatePresence>
       {images.map((img, i) => {
          const relIndex = (i - index + images.length) % images.length;
          const isActive = relIndex === 0;
          const isVisible = relIndex < 3;
          
          if (!isVisible) return null;

          return (
            <motion.img
              key={img}
              src={img}
              initial={{ opacity: 0, y: 100, rotateX: 20, scale: 0.8 }}
              animate={{ 
                 z: isActive ? 0 : -relIndex * 60,
                 y: isActive ? 0 : relIndex * 30,
                 scale: isActive ? 1 : 1 - relIndex * 0.08,
                 opacity: isActive ? 1 : 1 - relIndex * 0.4,
                 rotateX: isActive ? 0 : 5,
                 rotateY: isActive ? 0 : 0
              }}
              exit={{ opacity: 0, y: -100, rotateX: -20, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
              className={`absolute w-[95%] lg:w-[110%] shadow-[0_30px_60px_-15px_rgba(0,168,255,0.3)] object-contain h-auto`}
              style={{ zIndex: 10 - relIndex }}
              whileHover={isActive ? { scale: 1.02, rotateY: -3, rotateX: 3 } : {}}
            />
          );
       })}
      </AnimatePresence>
      <div className="absolute -bottom-8 flex gap-2">
        {images.map((_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-8 bg-[#00a8ff]' : 'w-2 bg-white/20'}`} />
        ))}
      </div>
    </div>
  )
}


function ReleaseNotes3D({ release, versionLabel }) {
  const [ref, visible] = useScrollReveal();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 25 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <section className="relative z-10 max-w-4xl mx-auto w-full px-8 mb-32 perspective-[2000px]">
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        className={`w-full relative rounded-3xl border border-[#00a8ff]/20 bg-[#020617]/80 backdrop-blur-xl shadow-[0_30px_60px_-15px_rgba(0,168,255,0.2)] transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#00a8ff]/10 to-transparent rounded-3xl pointer-events-none" />
        
        <div className="p-8 sm:p-12 relative" style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-white/10 pb-6 gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <RefreshCw className="text-[#00a8ff]" size={24} /> Latest Update
            </h2>
            <span className="font-mono text-sm font-bold text-[#020617] px-4 py-1.5 bg-[#00a8ff] rounded-full shadow-[0_0_20px_rgba(0,168,255,0.6)]">
              {versionLabel}
            </span>
          </div>
          
          <div 
            className="prose prose-invert prose-neutral max-w-none break-normal whitespace-normal prose-a:text-[#00a8ff] hover:prose-a:text-[#00a8ff]/80 prose-headings:text-white prose-strong:text-white prose-li:text-neutral-300 h-[350px] overflow-y-auto custom-scrollbar pr-4 relative z-20"
            style={{ transform: "translateZ(20px)" }}
            onWheel={(e) => e.stopPropagation()}
          >
              <ReactMarkdown>{release.body}</ReactMarkdown>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function StatsDisplay3D() {
  const [ref, visible] = useScrollReveal();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 25 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / rect.width - 0.5);
    y.set(mouseY / rect.height - 0.5);
  };

  return (
    <section ref={ref} className="relative z-10 max-w-5xl mx-auto px-8 pb-32 flex justify-center">
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { x.set(0); y.set(0); }}
        className={`relative w-full max-w-3xl p-1 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-[#00a8ff]/20 cursor-pointer ${visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`}
      >
        <div className="bg-[#020617] rounded-[22px] p-8 md:p-12 overflow-hidden relative" style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }}>
          
          {/* Cyber grid overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMCwxNjgsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { label: "Uptime Monitored", value: "99.9%", delay: 0 },
              { label: "Avg Rejoin Time", value: "2.4s", delay: 100 },
              { label: "Crash Detection", value: "Instant", delay: 200 }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20, translateZ: 0 }}
                whileInView={{ opacity: 1, y: 0, translateZ: 40 + (i * 10) }}
                transition={{ duration: 0.5, delay: stat.delay / 1000 }}
                className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-[#00a8ff]/30 transition-colors shadow-2xl"
              >
                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-[#00a8ff] mb-2">{stat.value}</div>
                <div className="text-sm font-medium text-neutral-400 uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            style={{ transform: "translateZ(80px)" }} 
            className="absolute -top-10 -right-10 w-40 h-40 bg-[#00a8ff] rounded-full blur-[80px] opacity-20 pointer-events-none" 
          />
        </div>
      </motion.div>
    </section>
  );
}

export default function App() {
  const release = useLatestRelease();
  const versionLabel = release.loading ? "..." : release.version ? `v${release.version}` : "v1.1.0";
  const [featuresRef, featuresVisible] = useScrollReveal();

  return (
    <div className="min-h-screen text-white font-sans selection:bg-[#00a8ff] selection:text-black overflow-hidden relative">
      <ThreeBackground />
      
      

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="RoRejoinX Logo" className="w-8 h-8 rounded-lg shadow-[0_0_15px_rgba(0,168,255,0.4)]" />
          <span className="font-bold tracking-tight text-xl">RoRejoinX</span>
        </div>
        <div className="flex items-center gap-6">
          <a href={release.releaseUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            GitHub
          </a>
          <SystemStatus />
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <section className="fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-semibold tracking-widest text-[#00a8ff] uppercase border border-[#00a8ff]/20 rounded-full bg-[#00a8ff]/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#00a8ff] animate-pulse" />
            Roblox Crash Watchdog
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] pb-2 mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-400">
            Never lose your spot again.
          </h1>
          
          <p className="text-lg text-neutral-400 max-w-lg mb-10 leading-relaxed">
            RoRejoinX silently monitors your game in the background. The instant Roblox closes unexpectedly, you are instantly launched right back in.
          </p>

          <div className="flex flex-wrap items-center gap-4 z-20 relative">
            <MagneticButton href={release.exeUrl || release.releaseUrl} primary>
              <Download size={20} className="relative z-10" /> 
              <span className="relative z-10">Download {versionLabel}</span>
            </MagneticButton>
            <MagneticButton href={release.releaseUrl}>
              <ExternalLink size={20} />
              <span className="relative z-10">View Source</span>
            </MagneticButton>
          </div>
          
          <p className="mt-6 text-sm text-neutral-500 font-mono">
            Windows 10/11 &bull; Custom Setup Wizard
          </p>
        </section>

        {/* Interactive 3D Mockup */}
        <InteractiveMockup />
      </main>

      {/* 3D Changelog */}
      <ReleaseNotes3D release={release} versionLabel={versionLabel} />

      {/* Features Section */}
      <section ref={featuresRef} className="relative z-10 max-w-6xl mx-auto px-8 pb-32">
        <div className={`text-center mb-16 transition-all duration-700 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need, built in.
          </h2>
          <p className="text-neutral-400 max-w-xl mx-auto text-lg">
            A full-featured watchdog with stats, notifications, and deep customization.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} delay={i * 80} />
          ))}
        </div>
      </section>

      {/* Footer */}
      <StatsDisplay3D />
      <footer className="relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-neutral-500 text-sm">
            <img src="/logo.png" alt="Logo" className="w-4 h-4 rounded-sm opacity-50 grayscale" />
            <span>&copy; {new Date().getFullYear()} RoRejoinX &bull; Made by <span className="text-[#00a8ff]/70 font-medium">AXTS</span></span>
          </div>
          <a href="https://github.com/R-7wX/RoRejoinX" target="_blank" rel="noreferrer" className="text-neutral-500 text-sm hover:text-white transition-colors">
            GitHub &rarr;
          </a>
        </div>
      </footer>
    </div>
  );
}
