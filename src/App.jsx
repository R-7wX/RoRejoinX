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
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.06);

    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
    camera.position.y = 1.5;
    camera.position.z = 4;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Cybertech Grid
    const gridHelper = new THREE.GridHelper(60, 60, 0x00a8ff, 0x00a8ff);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.15;
    scene.add(gridHelper);

    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e) => { mouseX = (e.clientX - w/2); mouseY = (e.clientY - h/2); };
    window.addEventListener("mousemove", handleMouseMove);

    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.005;
      
      // Move grid towards camera to simulate forward movement
      gridHelper.position.z = (time * 10) % 1;
      
      // Subtle camera sway
      const targetX = mouseX * 0.0005;
      const targetY = mouseY * 0.0005 + 1.5;
      camera.position.x += (targetX - camera.position.x) * 0.05;
      camera.position.y += (targetY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if(mountRef.current && mountRef.current.contains(renderer.domElement)) {
          mountRef.current.removeChild(renderer.domElement);
      }
      gridHelper.dispose(); renderer.dispose();
    };
  }, []);
  // Use a dark tech-blue/black gradient instead of the old dark green
  return <div ref={mountRef} className="fixed inset-0 z-[-1] pointer-events-none bg-gradient-to-b from-[#020617] via-[#000000] to-[#000000]" />;
}

const FEATURES = [
  { icon: Users, title: "Multi-Account Support", desc: "Run and monitor multiple Roblox accounts simultaneously from a single lightweight dashboard." },
  { icon: Zap, title: "Auto Rejoin", desc: "Detects crashes and connection drops instantly, relaunching your accounts right back into the game." },
  { icon: Cpu, title: "Memory Limiter", desc: "Set exact RAM limits. Safely flushes unused memory or restarts if the limit is exceeded." },
  { icon: Bell, title: "Discord Webhooks", desc: "Get rich embed notifications to your Discord channel with real-time crash screenshots." },
  { icon: Palette, title: "Deep Customization", desc: "Custom themes, compact mini-widget mode, and complete control over the watchdog behavior." },
  { icon: RefreshCw, title: "Auto-Updates", desc: "One-click updates via the built-in updater. Always stay current with the latest patches." },
];

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
  const images = ["/new_mockup_home.png", "/new_mockup_accounts.png", "/new_mockup_activity.png", "/new_mockup_stats.png", "/new_mockup_info.png"];

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
        <a href={release.releaseUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
          GitHub
        </a>
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

          <div className="flex flex-wrap items-center gap-4">
            <a 
              href={release.exeUrl || release.releaseUrl}
              className="group relative flex items-center gap-3 px-8 py-4 bg-[#00a8ff] text-[#050907] font-bold rounded-xl overflow-hidden transition-transform hover:scale-[1.02] shadow-[0_0_40px_-10px_rgba(0,168,255,0.4)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <Download size={20} className="relative z-10" /> 
              <span className="relative z-10">Download {versionLabel}</span>
            </a>
            <a 
              href={release.releaseUrl}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-8 py-4 text-white font-medium rounded-xl border border-white/10 bg-white/5 backdrop-blur-md hover:bg-white/10 transition-colors"
            >
              <ExternalLink size={20} />
              View Source
            </a>
          </div>
          
          <p className="mt-6 text-sm text-neutral-500 font-mono">
            Windows 10/11 &bull; Custom Setup Wizard
          </p>
        </section>

        {/* Interactive 3D Mockup */}
        <InteractiveMockup />
      </main>

      {/* Changelog Glass Card */}
      <section className="relative z-10 max-w-4xl mx-auto px-8 mb-32">
        {/* Changelog Glass Card */}
        <section className="fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00a8ff] to-transparent opacity-50" />
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                <h2 className="text-xl font-bold text-white">Latest Update</h2>
                <span className="font-mono text-sm text-[#00a8ff] px-3 py-1 bg-[#00a8ff]/10 border border-[#00a8ff]/20 rounded-full shadow-[0_0_15px_-5px_rgba(0,168,255,0.5)]">
                  {versionLabel}
                </span>
              </div>
              <div className="prose prose-invert prose-neutral max-w-none prose-a:text-[#00a8ff] hover:prose-a:text-[#00a8ff]/80 prose-headings:text-white prose-strong:text-white prose-li:text-neutral-300 h-[400px] overflow-y-auto custom-scrollbar pr-4">
                  <ReactMarkdown>{release.body}</ReactMarkdown>
              </div>
            </div>
          </div>
        </section>
      </section>

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
