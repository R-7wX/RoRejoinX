import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import ReactMarkdown from "react-markdown";
import { Download, ExternalLink, ShieldCheck } from "lucide-react";

const REPO = "R-7wX/RoRejoinX";
const GITHUB_API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;
const GITHUB_RELEASES_PAGE = `https://github.com/${REPO}/releases`;

function useLatestRelease() {
  const [state, setState] = useState({ loading: true, version: null, exeUrl: null, releaseUrl: GITHUB_RELEASES_PAGE, body: null, error: null });

  useEffect(() => {
    let cancelled = false;
    fetch(GITHUB_API_LATEST, { headers: { Accept: "application/vnd.github+json" } })
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const version = (data.tag_name || "").replace(/^v/i, "");
        const exeAsset = (data.assets || []).find((a) => a.name?.toLowerCase().endsWith(".exe"));
        setState({
          loading: false,
          version: version || null,
          exeUrl: exeAsset ? exeAsset.browser_download_url : null,
          releaseUrl: data.html_url || GITHUB_RELEASES_PAGE,
          body: data.body || "*No release notes provided.*",
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((s) => ({ ...s, loading: false, error: err.message }));
      });
    return () => { cancelled = true; };
  }, []);

  return state;
}

function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Glowing core
    const geometry = new THREE.IcosahedronGeometry(2, 1);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x4dff9e, 
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    
    // Floating particles
    const particlesGeo = new THREE.BufferGeometry();
    const particlesCount = 800;
    const posArray = new Float32Array(particlesCount * 3);
    for(let i=0; i<particlesCount*3; i++) {
        posArray[i] = (Math.random() - 0.5) * 18;
    }
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particlesMat = new THREE.PointsMaterial({
        size: 0.025,
        color: 0x4dff9e,
        transparent: true,
        opacity: 0.3
    });
    const particlesMesh = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particlesMesh);

    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e) => {
      mouseX = (e.clientX - w/2);
      mouseY = (e.clientY - h/2);
    };
    window.addEventListener("mousemove", handleMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);
      
      targetX = mouseX * 0.001;
      targetY = mouseY * 0.001;

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
      geometry.dispose();
      material.dispose();
      particlesGeo.dispose();
      particlesMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-[-1] pointer-events-none bg-gradient-to-br from-[#020504] via-[#050d09] to-[#010302]" />;
}

export default function App() {
  const release = useLatestRelease();
  const versionLabel = release.loading ? "..." : release.version ? `v${release.version}` : "v1.1.0";

  return (
    <div className="min-h-screen text-white font-sans selection:bg-[#4dff9e] selection:text-black overflow-hidden relative">
      <ThreeBackground />
      
      {/* Decorative gradient orb */}
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

      <main className="relative z-10 max-w-6xl mx-auto px-8 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Hero Section */}
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
            Windows 10/11 • Custom Setup Wizard
          </p>
        </section>

        {/* Dynamic Changelog Glass Card */}
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
    </div>
  );
}
