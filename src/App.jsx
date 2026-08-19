import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import {
  Download, Shield, ListChecks, Palette, Bell, Power, Keyboard,
  MonitorSmartphone, RefreshCw, Terminal, ExternalLink,
} from "lucide-react";

const SMALL_B64 = "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";

const REPO = "R-7wX/RoRejoinX";
const GITHUB_API_LATEST = `https://api.github.com/repos/${REPO}/releases/latest`;
const GITHUB_RELEASES_PAGE = `https://github.com/${REPO}/releases`;

const LOG_LINES = [
  { t: "03:21:27", msg: "watchdog armed -- 'Anime Expeditions'", kind: "info" },
  { t: "03:21:27", msg: "watching for RobloxPlayerBeta.exe", kind: "info" },
  { t: "03:21:35", msg: "process exited unexpectedly", kind: "bad" },
  { t: "03:21:39", msg: "relaunching into place 84515722934860...", kind: "warn" },
  { t: "03:21:43", msg: "back in -- resuming watch (pid 48512)", kind: "good" },
];

const CORE_STATES = ["Watching", "Crash detected", "Relaunching", "Back in game"];

const SECONDARY = [
  { icon: Terminal, label: "Live log" },
  { icon: ListChecks, label: "Saved games" },
  { icon: Palette, label: "Custom themes" },
  { icon: Bell, label: "Discord alerts" },
  { icon: Power, label: "Auto-start" },
  { icon: Keyboard, label: "Global hotkey" },
  { icon: MonitorSmartphone, label: "Tray controls" },
  { icon: RefreshCw, label: "Auto-updater" },
];

const STEPS = [
  { title: "Pick a game", body: "Paste a link or Place ID, or use the one already saved." },
  { title: "Start the watchdog", body: "RoRejoinX begins watching for Roblox in the background." },
  { title: "Roblox crashes", body: "The moment the process disappears, it's logged instantly." },
  { title: "Back in, automatically", body: "Relaunched straight into the same game -- no alt-tabbing." },
];

function useInView(threshold = 0.3) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/** Fetches the latest GitHub release once on mount: version tag, release
 * page URL, and the direct .exe asset URL (if one is attached). */
function useLatestRelease() {
  const [state, setState] = useState({ loading: true, version: null, exeUrl: null, releaseUrl: GITHUB_RELEASES_PAGE, error: null });

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
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, version: null, exeUrl: null, releaseUrl: GITHUB_RELEASES_PAGE, error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/** The signature element: a small 3D radar/beacon built directly in
 * three.js. It isn't decoration -- the color/state cycle it runs
 * (green "watching" -> amber "crash" -> green "relaunched") is a literal,
 * compressed re-enactment of the app's one job, and the text beside it
 * stays in sync so the same information reaches screen readers too. */
function WatchdogScene() {
  const mountRef = useRef(null);
  const [stateLabel, setStateLabel] = useState("Watching");
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const COLORS = { good: 0x4dff9e, warn: 0xffb454, bad: 0xff5c6c };

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const dome = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 1),
      new THREE.MeshBasicMaterial({ color: COLORS.good, wireframe: true, transparent: true, opacity: 0.55 })
    );
    scene.add(dome);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.22, 1),
      new THREE.MeshBasicMaterial({ color: COLORS.good })
    );
    scene.add(core);

    const ringGeo = new THREE.RingGeometry(1.85, 1.9, 64);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: COLORS.good, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    ring.rotation.x = Math.PI / 2.3;
    scene.add(ring);

    const particleCount = 90;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const r = 2.3 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x8fa89a, size: 0.03 }));
    scene.add(particles);

    let raf = null;
    let disposed = false;
    const cycle = [
      { ms: 3400, color: "good", label: "Watching" },
      { ms: 500, color: "bad", label: "Crash detected" },
      { ms: 700, color: "warn", label: "Relaunching" },
      { ms: 1400, color: "good", label: "Back in game" },
    ];
    let cycleIndex = 0;
    let cycleStart = performance.now();
    const setColor = (hex) => {
      dome.material.color.setHex(hex);
      core.material.color.setHex(hex);
      ring.material.color.setHex(hex);
    };

    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      const now = performance.now();

      if (!reducedMotion) {
        dome.rotation.y += dt * 0.18;
        dome.rotation.x += dt * 0.05;
        ring.rotation.z += dt * 0.6;
        particles.rotation.y += dt * 0.04;
        const pulse = 1 + Math.sin(now * 0.004) * 0.06;
        core.scale.setScalar(pulse);

        const step = cycle[cycleIndex];
        if (now - cycleStart > step.ms) {
          cycleIndex = (cycleIndex + 1) % cycle.length;
          cycleStart = now;
          const next = cycle[cycleIndex];
          setColor(COLORS[next.color]);
          setStateLabel(next.label);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      if (raf) cancelAnimationFrame(raf);
      dome.geometry.dispose();
      dome.material.dispose();
      core.geometry.dispose();
      core.material.dispose();
      ringGeo.dispose();
      ring.material.dispose();
      particleGeo.dispose();
      particles.material.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [reducedMotion]);

  return (
    <div className="relative w-full flex flex-col items-center">
      <div ref={mountRef} className="w-full" style={{ height: "300px" }} aria-hidden="true" />
      <div className="flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: stateLabel === "Crash detected" ? "#ff5c6c" : stateLabel === "Relaunching" ? "#ffb454" : "#4dff9e" }}
        />
        <span className="text-xs tracking-wide" style={{ color: "#8fa89a" }}>
          status: <span style={{ color: "#eef4ef" }}>{stateLabel}</span>
        </span>
      </div>
    </div>
  );
}

function TerminalBlock() {
  const [ref, inView] = useInView(0.4);
  const [visibleLines, setVisibleLines] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setVisibleLines(LOG_LINES.length);
      return;
    }
    if (visibleLines >= LOG_LINES.length) return;
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 420);
    return () => clearTimeout(t);
  }, [inView, visibleLines, reducedMotion]);

  const lineColor = (kind) => {
    if (kind === "bad") return "#ff5c6c";
    if (kind === "good") return "#4dff9e";
    if (kind === "warn") return "#ffb454";
    return "#8fa89a";
  };

  return (
    <div ref={ref} className="rounded-md border overflow-hidden" style={{ borderColor: "#1f2b25", background: "#0d100e" }}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "#1f2b25", background: "#12160f" }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5c6c" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ffb454" }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#4dff9e" }} />
        <span className="ml-3 text-xs" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#5c7268" }}>
          rorejoinx_log.txt
        </span>
      </div>
      <div className="p-5 min-h-[168px]" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12.5px", lineHeight: "1.9" }}>
        {LOG_LINES.slice(0, visibleLines).map((line, i) => (
          <div key={i}>
            <span style={{ color: "#5c7268" }}>[{line.t}]</span>{" "}
            <span style={{ color: lineColor(line.kind) }}>{line.msg}</span>
            {i === visibleLines - 1 && !reducedMotion && (
              <span className="inline-block w-[7px] h-[13px] ml-1 align-middle" style={{ background: "#4dff9e", animation: "blink 1s step-end infinite" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RoRejoinXSite() {
  const release = useLatestRelease();

  const versionLabel = release.loading ? "checking..." : release.version ? `v${release.version}` : "version unknown";

  const openExternal = (url) => window.open(url, "_blank", "noopener,noreferrer");

  const handleDownload = () => {
    openExternal(release.exeUrl || release.releaseUrl);
  };

  return (
    <div style={{ background: "#0a0d0b", color: "#eef4ef", fontFamily: "'IBM Plex Sans', sans-serif", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
        html { scroll-behavior: smooth; }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes floatUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: floatUp 0.6s ease both; }
        ::selection { background: #4dff9e; color: #0a0d0b; }
        a:focus-visible, button:focus-visible { outline: 2px solid #4dff9e; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .fade-in { animation: none; }
          html { scroll-behavior: auto; }
        }
        .scanlines::before {
          content: "";
          position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 1px, transparent 1px, transparent 3px);
        }
      `}</style>

      {/* Nav -- styled like the app's own custom titlebar */}
      <nav className="sticky top-0 z-20 border-b" style={{ borderColor: "#1f2b25", background: "#0d100e" }}>
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full" style={{ background: "#2a352f" }} />
              <span className="w-2 h-2 rounded-full" style={{ background: "#2a352f" }} />
              <span className="w-2 h-2 rounded-full" style={{ background: "#2a352f" }} />
            </div>
            <img src={`data:image/png;base64,${SMALL_B64}`} alt="" className="w-5 h-5" />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: "14px" }}>RoRejoinX</span>
            <span className="text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "#2a352f", color: "#8fa89a", fontFamily: "'IBM Plex Mono', monospace" }}>
              {versionLabel}
            </span>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-semibold transition-colors rounded"
            style={{ background: "#4dff9e", color: "#0a0d0b" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#6bffb2")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#4dff9e")}
          >
            <Download size={14} /> Download
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-10 grid md:grid-cols-[1.1fr,0.9fr] gap-10 items-center">
        <div className="fade-in">
          <div className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase px-3 py-1 rounded border mb-6"
            style={{ borderColor: "#2a352f", color: "#8fa89a", fontFamily: "'IBM Plex Mono', monospace" }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4dff9e" }} />
            Roblox crash watchdog
          </div>
          <h1 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "clamp(2rem, 4.4vw, 3rem)", lineHeight: 1.15, fontWeight: 700 }}>
            Never lose your spot<br />when Roblox crashes.
          </h1>
          <p className="mt-6 text-[15px] leading-relaxed max-w-md" style={{ color: "#a8bab0" }}>
            RoRejoinX watches Roblox in the background. The second it closes unexpectedly,
            it relaunches straight back into your saved game.
          </p>

          <div className="mt-5 text-[13px] flex items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#8fa89a" }}>
            <span style={{ color: "#4dff9e" }}>&gt;</span>
            v1.0.6b -- smoother, more reliable, fully in your control.
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-3 rounded font-semibold text-sm transition-transform hover:scale-[1.02]"
              style={{ background: "#4dff9e", color: "#0a0d0b" }}
            >
              <Download size={16} /> Download{!release.loading && release.version ? ` (${versionLabel})` : ""}
            </button>
            <a href="#how" className="flex items-center gap-2 px-5 py-3 rounded font-semibold text-sm border"
              style={{ borderColor: "#2a352f", color: "#eef4ef" }}>
              See how it works
            </a>
          </div>
          <p className="mt-4 text-xs" style={{ color: "#5c7268" }}>
            {release.exeUrl ? "Windows -- ready-to-run .exe" : "Windows -- see the release page for downloads"}
            {release.error && " (couldn't reach GitHub -- try the button anyway)"}
          </p>
        </div>

        <div className="fade-in" style={{ animationDelay: "0.12s" }}>
          <WatchdogScene />
        </div>
      </section>

      {/* Core function spotlight */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="relative overflow-hidden rounded-md border p-7 scanlines" style={{ borderColor: "#1f2b25", background: "#0d100e" }}>
          <div className="relative flex items-start gap-4">
            <div className="p-2.5 rounded" style={{ background: "rgba(77,255,158,0.1)" }}>
              <Shield size={20} style={{ color: "#4dff9e" }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Automatic crash recovery</h2>
              <p className="mt-1.5 text-sm leading-relaxed max-w-xl" style={{ color: "#a8bab0" }}>
                This is the one thing RoRejoinX does: it keeps a constant eye on Roblox, and the instant
                it disappears without you closing it, it's relaunched into the same game -- no alt-tabbing,
                no re-navigating menus, no losing your queue spot.
              </p>
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px" }}>
            {CORE_STATES.map((s, i) => (
              <React.Fragment key={s}>
                <span className="px-2.5 py-1 rounded border" style={{ borderColor: "#2a352f", color: i === 0 ? "#4dff9e" : "#8fa89a" }}>
                  {s}
                </span>
                {i < CORE_STATES.length - 1 && <span style={{ color: "#3a4a41" }}>&rarr;</span>}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Secondary capabilities -- compact chips, not a wall of cards */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SECONDARY.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded border text-xs"
              style={{ borderColor: "#1f2b25", color: "#a8bab0", fontFamily: "'IBM Plex Mono', monospace" }}>
              <f.icon size={13} style={{ color: "#4dff9e" }} />
              {f.label}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-lg font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>How it works</h2>
        <div className="mt-8 grid md:grid-cols-2 gap-10">
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-1 bottom-1 w-px" style={{ background: "#1f2b25" }} aria-hidden="true" />
            <div className="space-y-7">
              {STEPS.map((s, i) => (
                <div key={i} className="relative">
                  <span
                    className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full border-2"
                    style={{ borderColor: "#4dff9e", background: "#0a0d0b" }}
                    aria-hidden="true"
                  />
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "#8fa89a" }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
          <TerminalBlock />
        </div>
      </section>

      {/* Download */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="rounded-md border p-7" style={{ borderColor: "#1f2b25", background: "#0d100e" }}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Get RoRejoinX</h2>
            <span className="text-xs px-2.5 py-1 rounded border" style={{ borderColor: "#2a352f", color: "#8fa89a", fontFamily: "'IBM Plex Mono', monospace" }}>
              latest: {versionLabel}
            </span>
          </div>
          <p className="mt-2 text-sm" style={{ color: "#8fa89a" }}>
            Always grabs whatever's currently published on GitHub -- no stale downloads.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-3 rounded font-semibold text-sm"
              style={{ background: "#4dff9e", color: "#0a0d0b" }}
            >
              <Download size={16} /> {release.exeUrl ? "RoRejoinX.exe" : "Go to Releases"}
            </button>
            <button
              onClick={() => openExternal(release.releaseUrl)}
              className="flex items-center gap-2 px-4 py-3 rounded font-semibold text-sm border"
              style={{ borderColor: "#2a352f", color: "#eef4ef", background: "transparent" }}
            >
              <ExternalLink size={15} /> View on GitHub
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "#1f2b25" }}>
        <div className="max-w-4xl mx-auto px-6 py-7 flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: "#5c7268", fontFamily: "'IBM Plex Mono', monospace" }}>
          <div className="flex items-center gap-2">
            <img src={`data:image/png;base64,${SMALL_B64}`} alt="" className="w-4 h-4" />
            RoRejoinX {versionLabel}
          </div>
          <div>Credits: AXTS</div>
        </div>
      </footer>
    </div>
  );
}
