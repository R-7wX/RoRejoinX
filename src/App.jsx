import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import ReactMarkdown from "react-markdown";
import { Download, ExternalLink, ShieldCheck, Activity, BarChart3, Bell, Clock, Palette, RefreshCw } from "lucide-react";

const GITHUB_API = "https://api.github.com/repos/R-7wX/RoRejoinX/releases";

function useLatestRelease() {
  const [state, setState] = useState({ loading: true, version: null, body: null, exeUrl: null, releaseUrl: "https://github.com/R-7wX/RoRejoinX/releases", error: null });
  useEffect(() => {
    fetch(GITHUB_API, { headers: { Accept: "application/vnd.github+json" } })
      .then(r => r.json())
      .then(releases => {
        const rel = releases.find(r => !r.draft);
        if (!rel) throw new Error("No releases");
        const exe = rel.assets?.find(a => a.name.toLowerCase().includes("updater") && a.name.endsWith(".exe"));
        setState({ loading: false, version: rel.tag_name?.replace(/^v/, ""), body: rel.body || "", exeUrl: exe?.browser_download_url || rel.html_url, releaseUrl: rel.html_url, error: null });
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
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const geometry = new THREE.IcosahedronGeometry(2, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x4dff9e, wireframe: true, transparent: true, opacity: 0.12 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    const particlesGeo = new THREE.BufferGeometry();
    const particlesCount = 800;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i=0; i<particlesCount*3; i++) { posArray[i] = (Math.random() - 0.5) * 18; }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({ size: 0.025, color: 0x4dff9e, transparent: true, opacity: 0.3 });
    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e) => { mouseX = (e.clientX - w/2); mouseY = (e.clientY - h/2); };
    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);
      const targetX = mouseX * 0.001;
      const targetY = mouseY * 0.001;
      mesh.rotation.y += 0.002 + (targetX - mesh.rotation.y) * 0.05;
      mesh.rotation.x += 0.001 + (targetY - mesh.rotation.x) * 0.05;
      particlesMesh.rotation.y += 0.0003;
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
      geometry.dispose(); material.dispose(); particlesGeo.dispose(); particlesMat.dispose(); renderer.dispose();
    };
  }, []);
  return <div ref={mountRef} className="fixed inset-0 z-[-1] pointer-events-none bg-gradient-to-br from-[#020504] via-[#050d09] to-[#010302]" />;
}

const FEATURES = [
  { icon: ShieldCheck, title: "Auto-Relaunch", desc: "Detects crashes instantly and relaunches you right back into your game." },
  { icon: BarChart3, title: "Crash Stats & Streaks", desc: "Track your crash-free streaks, longest sessions, and unlock achievement badges." },
  { icon: Bell, title: "Discord Alerts", desc: "Rich embed notifications to your Discord channel with crash screenshots." },
  { icon: Clock, title: "Scheduled Watching", desc: "Set active hours so the watchdog only runs when you want it to." },
  { icon: Palette, title: "Deep Customization", desc: "Custom themes, accent colors, backgrounds, and a compact mini-widget mode." },
  { icon: RefreshCw, title: "Auto-Updates", desc: "One-click updates via the built-in setup wizard. Always stay current." },
];

function FeatureCard({ icon: Icon, title, desc, delay }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} className={`group relative p-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md transition-all duration-500 hover:bg-white/[0.06] hover:border-[#4dff9e]/30 hover:shadow-[0_0_30px_-10px_rgba(77,255,158,0.15)] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="w-10 h-10 rounded-xl bg-[#4dff9e]/10 flex items-center justify-center mb-4 group-hover:bg-[#4dff9e]/20 transition-colors">
        <Icon size={20} className="text-[#4dff9e]" />
      </div>
      <h3 className="text-white font-semibold text-base mb-2">{title}</h3>
      <p className="text-neutral-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

export default function App() {
  const release = useLatestRelease();
  const versionLabel = release.loading ? "..." : release.version ? `v${release.version}` : "v1.1.0";
  const [featuresRef, featuresVisible] = useScrollReveal();

  return (
    <div className="min-h-screen text-white font-sans selection:bg-[#4dff9e] selection:text-black overflow-hidden relative">
      <ThreeBackground />
      
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#4dff9e] rounded-full blur-[150px] opacity-10 pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-[#4dff9e]" size={24} />
          <span className="font-bold tracking-tight text-xl">RoRejoinX</span>
        </div>
        <a href={release.releaseUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
          GitHub
        </a>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <section className="fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 text-xs font-semibold tracking-widest text-[#4dff9e] uppercase border border-[#4dff9e]/20 rounded-full bg-[#4dff9e]/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-[#4dff9e] animate-pulse" />
            Roblox Crash Watchdog
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-neutral-400">
            Never lose your spot again.
          </h1>
          
          <p className="text-lg text-neutral-400 max-w-lg mb-10 leading-relaxed">
            RoRejoinX silently monitors your game in the background. The instant Roblox closes unexpectedly, you are instantly launched right back in.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <a 
              href={release.exeUrl || release.releaseUrl}
              className="group relative flex items-center gap-3 px-8 py-4 bg-[#4dff9e] text-[#050907] font-bold rounded-xl overflow-hidden transition-transform hover:scale-[1.02] shadow-[0_0_40px_-10px_rgba(77,255,158,0.4)]"
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

        {/* Changelog Glass Card */}
        <section className="fade-in" style={{ animationDelay: "0.2s" }}>
          <div className="relative rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#4dff9e] to-transparent opacity-50" />
            <div className="p-8 sm:p-10">
              <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-6">
                <h2 className="text-xl font-bold text-white">Latest Update</h2>
                <span className="font-mono text-sm text-[#4dff9e] px-3 py-1 bg-[#4dff9e]/10 border border-[#4dff9e]/20 rounded-full shadow-[0_0_15px_-5px_rgba(77,255,158,0.5)]">
                  {versionLabel}
                </span>
              </div>
              <div className="prose prose-invert prose-neutral max-w-none prose-a:text-[#4dff9e] hover:prose-a:text-[#4dff9e]/80 prose-headings:text-white prose-strong:text-white prose-li:text-neutral-300 h-[400px] overflow-y-auto custom-scrollbar pr-4">
                {release.loading ? (
                  <div className="flex flex-col gap-4 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-white/10 rounded w-1/2" />
                    <div className="h-4 bg-white/10 rounded w-5/6" />
                  </div>
                ) : release.error ? (
                  <p className="text-red-400">Failed to load release notes. View them directly on GitHub.</p>
                ) : (
                  <ReactMarkdown>{release.body}</ReactMarkdown>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

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
      <footer className="relative z-10 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-neutral-500 text-sm">
            <ShieldCheck size={16} className="text-[#4dff9e]/50" />
            <span>&copy; {new Date().getFullYear()} RoRejoinX &bull; Made by <span className="text-[#4dff9e]/70 font-medium">AXTS</span></span>
          </div>
          <a href="https://github.com/R-7wX/RoRejoinX" target="_blank" rel="noreferrer" className="text-neutral-500 text-sm hover:text-white transition-colors">
            GitHub &rarr;
          </a>
        </div>
      </footer>
    </div>
  );
}
